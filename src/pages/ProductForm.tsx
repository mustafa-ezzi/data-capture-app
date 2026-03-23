import { useState } from "react";
import { addProduct } from "../services/productService";
import { serverTimestamp } from "firebase/firestore";
import { uploadImage } from "../services/uploadImage.js";

const CATEGORIES = [
  "Metals > Brass", "Metals > Steel", "Metals > Aluminum", "Metals > Copper",
  "Plastics > PVC", "Plastics > Polyethylene", "Plastics > Polypropylene",
  "Textiles > Cotton", "Textiles > Polyester", "Textiles > Wool",
  "Electronics > Components", "Electronics > Cables", "Electronics > Sensors",
  "Chemicals > Industrial", "Chemicals > Agricultural",
  "Construction > Cement", "Construction > Timber", "Construction > Glass",
  "Packaging > Boxes", "Packaging > Bags", "Packaging > Films",
  "Other",
];

const UNITS = ["kg", "g", "ton", "pcs", "m", "cm", "mm", "m²", "m³", "L", "ml", "box", "roll", "pair", "set"];

const LANGUAGES = [
  { code: "en", label: "English",  flag: "🇬🇧" },
  { code: "ar", label: "Arabic",   flag: "🇸🇦" },
  { code: "ur", label: "Urdu",     flag: "🇵🇰" },
  { code: "zh", label: "Chinese",  flag: "🇨🇳" },
  { code: "fr", label: "French",   flag: "🇫🇷" },
  { code: "de", label: "German",   flag: "🇩🇪" },
];

const STATUSES = ["Draft", "Active", "Paused", "Archived"] as const;
type Status = typeof STATUSES[number];

const STATUS_CONFIG: Record<Status, {
  color: string; bg: string; border: string; dot: string; activePill: string;
}> = {
  Draft:    { color: "text-slate-500",   bg: "bg-slate-100",  border: "border-slate-200",   dot: "bg-slate-400",   activePill: "bg-slate-100 border-slate-300 text-slate-700"     },
  Active:   { color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", dot: "bg-emerald-500", activePill: "bg-emerald-50 border-emerald-300 text-emerald-700" },
  Paused:   { color: "text-amber-600",   bg: "bg-amber-50",   border: "border-amber-200",   dot: "bg-amber-500",   activePill: "bg-amber-50 border-amber-300 text-amber-700"       },
  Archived: { color: "text-rose-600",    bg: "bg-rose-50",    border: "border-rose-200",    dot: "bg-rose-500",    activePill: "bg-rose-50 border-rose-300 text-rose-700"           },
};

interface FormState {
  name: string; category: string; brand: string; price: string;
  unit_of_measure: string; description: string; image_urls: string[];
  variants_color: string[]; variants_size: string[];
  status: Status; language: string;
}

const EMPTY: FormState = {
  name: "", category: "", brand: "", price: "", unit_of_measure: "",
  description: "", image_urls: [""], variants_color: [], variants_size: [],
  status: "Draft", language: "en",
};

const inp =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 " +
  "placeholder-slate-400 outline-none transition-all duration-200 " +
  "focus:border-sky-400 focus:ring-4 focus:ring-sky-50 hover:border-slate-300";
const inpErr = "!border-rose-400 focus:!border-rose-500 !ring-rose-50 bg-rose-50/30";
const lbl = "block text-[10px] font-black uppercase tracking-[0.12em] text-slate-400 mb-1.5";

function Err({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p className="mt-1.5 text-xs text-rose-500 flex items-center gap-1.5 font-semibold">
      <span className="w-3.5 h-3.5 rounded-full bg-rose-100 text-rose-500 text-[9px] flex items-center justify-center shrink-0 font-black">!</span>
      {msg}
    </p>
  );
}

function StyledSelect({ children, err, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { err?: boolean }) {
  return (
    <div className="relative">
      <select {...props} className={`${inp} appearance-none pr-9 ${err ? inpErr : ""} ${props.className ?? ""}`}>
        {children}
      </select>
      <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-300 text-[10px]">▾</span>
    </div>
  );
}

function Section({ step, title, subtitle, icon, children }: {
  step: number; title: string; subtitle: string; icon: string; children: React.ReactNode;
}) {
  return (
    <div className="relative flex gap-4 mb-7">
      <div className="flex flex-col items-center shrink-0 pt-0.5">
        <div className="w-8 h-8 rounded-full bg-[#0F1829] border-2 border-sky-500/40 flex items-center justify-center text-sky-400 text-[11px] font-black shadow-md shadow-sky-900/20 shrink-0">
          {step}
        </div>
        <div className="w-px flex-1 bg-gradient-to-b from-sky-500/20 to-transparent mt-2" />
      </div>
      <div className="flex-1 min-w-0 pb-1">
        <div className="flex items-center gap-2.5 mb-3.5">
          <span className="text-base leading-none">{icon}</span>
          <div>
            <h2 className="text-sm font-black text-slate-800 leading-tight tracking-tight">{title}</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
          <div className="h-[2px] bg-gradient-to-r from-sky-400/60 via-blue-400/30 to-transparent" />
          <div className="p-5 flex flex-col gap-5">{children}</div>
        </div>
      </div>
    </div>
  );
}

export default function ProductForm() {
  const [form, setForm]           = useState<FormState>(EMPTY);
  const [errors, setErrors]       = useState<Partial<Record<string, string>>>({});
  const [saving, setSaving]       = useState(false);
  const [toast, setToast]         = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [colorInput, setCI]       = useState("");
  const [sizeInput,  setSI]       = useState("");
  const [files,      setFiles]    = useState<File[]>([]);
  const [previews,   setPreviews] = useState<string[]>([]);

  const setField =
    (f: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [f]: e.target.value }));

  const addTag = (field: "variants_color" | "variants_size", val: string) =>
    setForm(p => ({ ...p, [field]: [...p[field], val] }));
  const removeTag = (field: "variants_color" | "variants_size", i: number) =>
    setForm(p => ({ ...p, [field]: p[field].filter((_, idx) => idx !== i) }));

  const handleFiles = (list: FileList | null) => {
    if (!list) return;
    const arr = Array.from(list);
    setFiles(arr);
    setPreviews(arr.map(f => URL.createObjectURL(f)));
  };

  const removeFile = (i: number) => {
    setFiles(f => f.filter((_, idx) => idx !== i));
    setPreviews(p => p.filter((_, idx) => idx !== i));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim())        e.name        = "Product name is required";
    if (!form.category)           e.category    = "Category is required";
    if (!form.unit_of_measure)    e.uom         = "Unit of measure is required";
    if (!form.description.trim()) e.description = "Description is required";
    if (form.price && (isNaN(Number(form.price)) || Number(form.price) < 0))
      e.price = "Must be a positive number";
    if (files.length === 0) e.images = "At least one image is required";
    return e;
  };

  const handleSubmit = async (overrideStatus?: Status) => {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    setToast(null);
    try {
      const urls = await Promise.all(files.map(f => uploadImage(f)));
      await addProduct({
        ...form,
        status: (overrideStatus ?? form.status).toLowerCase(),
        image_urls: urls,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
      setToast({ type: "success", msg: "Product published successfully!" });
      setForm(EMPTY); setFiles([]); setPreviews([]);
    } catch {
      setToast({ type: "error", msg: "Something went wrong. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  const sc = STATUS_CONFIG[form.status];
  const errorCount = Object.keys(errors).length;
  const progress = Math.round(
    [form.name, form.category, form.unit_of_measure, form.description].filter(Boolean).length / 4 * 100
  );

  return (
    // Full width — fills whatever space the sidebar leaves
    <div className="min-h-screen w-full bg-slate-50" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* ── Sticky page header — full width ── */}
      <div className="sticky top-0 z-20 w-full bg-white border-b border-slate-200/80 shadow-sm">
        <div className="w-full px-6 py-4 flex items-center justify-between gap-4">

          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Add Product</p>
            </div>
            <h1 className="text-base font-black text-slate-900 tracking-tight">New Listing</h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Progress bar */}
            <div className="hidden sm:flex flex-col items-end gap-1">
              <div className="flex items-center gap-2">
                <div className="w-32 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${progress}%`,
                      background: progress === 100
                        ? "linear-gradient(90deg,#10b981,#059669)"
                        : "linear-gradient(90deg,#38bdf8,#0ea5e9)",
                    }}
                  />
                </div>
                <span className="text-[11px] font-black text-slate-400 tabular-nums w-8 text-right">{progress}%</span>
              </div>
              <p className="text-[10px] text-slate-300">Required fields</p>
            </div>

            {/* Status badge */}
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black border ${sc.bg} ${sc.border} ${sc.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
              {form.status}
            </span>
          </div>
        </div>
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div className="w-full px-6 pt-4">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold border shadow-sm
            ${toast.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0
              ${toast.type === "success" ? "bg-emerald-200 text-emerald-700" : "bg-rose-200 text-rose-700"}`}>
              {toast.type === "success" ? "✓" : "✕"}
            </span>
            {toast.msg}
            <button onClick={() => setToast(null)} className="ml-auto opacity-40 hover:opacity-70 text-xl leading-none">×</button>
          </div>
        </div>
      )}

      {/* ── Form — full width with generous padding ── */}
      <main className="w-full px-6 pt-8 pb-24">

        {/* 1 — Core Information */}
        <Section step={1} title="Core Information" subtitle="Name, category, brand & description" icon="📦">
          <div>
            <label className={lbl}>Product Name <span className="text-rose-400 normal-case font-semibold">*</span></label>
            <input value={form.name} onChange={setField("name")} placeholder="e.g. Brass Sheet 2mm"
              className={`${inp} ${errors.name ? inpErr : ""}`} />
            <Err msg={errors.name} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-1">
              <label className={lbl}>Category <span className="text-rose-400 normal-case font-semibold">*</span></label>
              <StyledSelect err={!!errors.category} value={form.category} onChange={setField("category")}>
                <option value="">Select…</option>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </StyledSelect>
              <Err msg={errors.category} />
            </div>
            <div className="lg:col-span-1">
              <label className={lbl}>Brand</label>
              <input value={form.brand} onChange={setField("brand")} placeholder="e.g. Acme Industries" className={inp} />
            </div>
          </div>

          <div>
            <label className={lbl}>Description <span className="text-rose-400 normal-case font-semibold">*</span></label>
            <textarea
              value={form.description} onChange={setField("description")}
              placeholder="Material grade, specifications, typical use cases…"
              rows={4}
              className={`${inp} resize-y min-h-[96px] leading-relaxed ${errors.description ? inpErr : ""}`}
            />
            <div className="flex items-start justify-between mt-1.5">
              <Err msg={errors.description} />
              <span className="text-[11px] text-slate-300 tabular-nums ml-auto font-mono">{form.description.length}</span>
            </div>
          </div>
        </Section>

        {/* 2 — Pricing & Unit */}
        <Section step={2} title="Pricing & Unit" subtitle="Optional price, required unit of measure" icon="💰">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className={lbl}>Price</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[11px] font-black text-slate-300 pointer-events-none select-none tracking-wide">PKR</span>
                <input type="number" value={form.price} onChange={setField("price")} placeholder="0.00" min="0" step="0.01"
                  className={`${inp} pl-14 ${errors.price ? inpErr : ""}`} />
              </div>
              <Err msg={errors.price} />
            </div>
            <div>
              <label className={lbl}>Unit of Measure <span className="text-rose-400 normal-case font-semibold">*</span></label>
              <StyledSelect err={!!errors.uom} value={form.unit_of_measure} onChange={setField("unit_of_measure")}>
                <option value="">Select…</option>
                {UNITS.map(u => <option key={u}>{u}</option>)}
              </StyledSelect>
              <Err msg={errors.uom} />
            </div>
          </div>
        </Section>

        {/* 3 — Images */}
        <Section step={3} title="Product Images" subtitle="Upload one or more product photos" icon="🖼️">
          <label
            className={`group flex flex-col items-center justify-center gap-4 w-full rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-200 py-10 px-6 text-center
              ${errors.images ? "border-rose-300 bg-rose-50/40" : "border-slate-200 bg-slate-50/60 hover:border-sky-300 hover:bg-sky-50/40"}`}
          >
            <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center text-2xl shadow-sm transition-all duration-200
              ${errors.images ? "bg-rose-50 border-rose-200" : "bg-white border-slate-200 group-hover:border-sky-200 group-hover:bg-sky-50"}`}>
              📁
            </div>
            <div>
              <p className="text-sm font-bold text-slate-700">
                Drop files here or <span className={`underline underline-offset-2 ${errors.images ? "text-rose-500" : "text-sky-500"}`}>browse</span>
              </p>
              <p className="text-xs text-slate-400 mt-1">PNG, JPG, WEBP — max 800 KB each</p>
            </div>
            <input type="file" accept="image/*" multiple className="sr-only" onChange={e => handleFiles(e.target.files)} />
          </label>
          <Err msg={errors.images} />

          {previews.length > 0 && (
            <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2.5">
              {previews.map((src, i) => (
                <div key={i} className="group relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shadow-sm">
                  <img src={src} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all duration-200 flex items-center justify-center">
                    <button onClick={() => removeFile(i)}
                      className="opacity-0 group-hover:opacity-100 w-8 h-8 rounded-full bg-white text-slate-700 text-base font-black hover:bg-rose-100 hover:text-rose-600 transition-all flex items-center justify-center shadow-md">
                      ×
                    </button>
                  </div>
                  {i === 0 && (
                    <span className="absolute top-1.5 left-1.5 bg-sky-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md shadow tracking-wide uppercase">Main</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* 4 — Variants */}
        <Section step={4} title="Variants" subtitle="Optional color and size options — press Enter to add" icon="🎨">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className={lbl}>Colors</label>
              {form.variants_color.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {form.variants_color.map((t, i) => (
                    <span key={i} className="inline-flex items-center gap-1 bg-orange-50 border border-orange-200 text-orange-700 text-[11px] font-semibold rounded-lg px-2.5 py-1">
                      {t}
                      <button onClick={() => removeTag("variants_color", i)} className="text-orange-300 hover:text-orange-600 text-sm leading-none ml-0.5">×</button>
                    </span>
                  ))}
                </div>
              )}
              <input value={colorInput} onChange={e => setCI(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && colorInput.trim()) { e.preventDefault(); addTag("variants_color", colorInput.trim()); setCI(""); } }}
                placeholder="Gold, Silver… ↵" className={inp} />
            </div>
            <div>
              <label className={lbl}>Sizes</label>
              {form.variants_size.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {form.variants_size.map((t, i) => (
                    <span key={i} className="inline-flex items-center gap-1 bg-violet-50 border border-violet-200 text-violet-700 text-[11px] font-semibold rounded-lg px-2.5 py-1">
                      {t}
                      <button onClick={() => removeTag("variants_size", i)} className="text-violet-300 hover:text-violet-600 text-sm leading-none ml-0.5">×</button>
                    </span>
                  ))}
                </div>
              )}
              <input value={sizeInput} onChange={e => setSI(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && sizeInput.trim()) { e.preventDefault(); addTag("variants_size", sizeInput.trim()); setSI(""); } }}
                placeholder="1mm, 2mm, Large… ↵" className={inp} />
            </div>
          </div>
          <p className="text-[11px] text-slate-400">
            Press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono text-[10px]">Enter</kbd> after each value to add it as a tag
          </p>
        </Section>

        {/* 5 — Publishing */}
        <Section step={5} title="Publishing" subtitle="Visibility status and content language" icon="🌐">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className={lbl}>Status</label>
              <StyledSelect value={form.status} onChange={setField("status")}>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </StyledSelect>
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {STATUSES.map(s => {
                  const c = STATUS_CONFIG[s];
                  const active = s === form.status;
                  return (
                    <button key={s}
                      onClick={() => setForm(p => ({ ...p, status: s }))}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-black border transition-all duration-150
                        ${active ? c.activePill : "bg-white border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600"}`}>
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className={lbl}>Language</label>
              <StyledSelect value={form.language} onChange={setField("language")}>
                {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.flag} {l.label} ({l.code})</option>)}
              </StyledSelect>
            </div>
          </div>

          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-300 text-base shrink-0">🕒</span>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              <span className="font-bold text-slate-500">Created At</span> and{" "}
              <span className="font-bold text-slate-500">Updated At</span> are auto-generated on submit.
            </p>
          </div>
        </Section>

        {/* ── Actions ── */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
          <button
            onClick={() => { setForm(EMPTY); setErrors({}); setCI(""); setSI(""); setFiles([]); setPreviews([]); setToast(null); }}
            className="px-5 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-700 transition-all duration-150"
          >
            Reset Form
          </button>

          <div className="flex gap-2.5 flex-col-reverse sm:flex-row">
            <button
              disabled={saving}
              onClick={() => handleSubmit("Draft")}
              className="px-5 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-all duration-150"
            >
              Save as Draft
            </button>
            <button
              disabled={saving}
              onClick={() => handleSubmit()}
              className="relative px-7 py-3 rounded-xl text-sm font-black text-white flex items-center justify-center gap-2.5 transition-all duration-150 disabled:opacity-50 overflow-hidden"
              style={{ background: "linear-gradient(135deg,#0ea5e9 0%,#2563eb 100%)", boxShadow: "0 4px 16px rgba(14,165,233,0.35)" }}
            >
              <span className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
              {saving
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving…</>
                : <>Publish Product <span className="opacity-60 text-base">→</span></>}
            </button>
          </div>
        </div>

        {errorCount > 0 && (
          <div className="mt-4 flex items-center gap-3 px-4 py-3.5 bg-rose-50 border border-rose-200 rounded-xl">
            <span className="w-6 h-6 rounded-full bg-rose-200 text-rose-700 text-xs font-black flex items-center justify-center shrink-0">{errorCount}</span>
            <p className="text-sm text-rose-700 font-semibold">Fix {errorCount} error{errorCount > 1 ? "s" : ""} before submitting</p>
          </div>
        )}
      </main>
    </div>
  );
}