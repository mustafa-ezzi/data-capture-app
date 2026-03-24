import { useState } from "react";
import { addProduct, type Measurement } from "../services/productService";
import { serverTimestamp } from "firebase/firestore";
import { uploadImage } from "../services/uploadImage.js";

// ── Constants ─────────────────────────────────────────────────────────────────

const UNIT_OPTIONS = [
  "mm", "cm", "m", "km", "in", "ft",
  "g", "kg", "ton",
  "ml", "L", "m²", "m³",
  "pcs", "box", "roll", "pair", "set",
];

const QUANTITY_UNITS = ["pcs", "kg", "g", "ton", "m", "m²", "m³", "L", "box", "roll", "set"];

// Price-per units — common units things are priced by
const PRICE_UNITS = [
  "pcs", "kg", "g", "ton",
  "m", "cm", "ft", "in",
  "m²", "m³", "L", "ml",
  "box", "roll", "pair", "set",
];

const CURRENCIES = ["PKR", "USD", "AED", "SAR", "EUR", "GBP", "CNY"];

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

const STATUS_META: Record<Status, { dot: string; badge: string; pill: string }> = {
  Draft:    { dot: "bg-slate-400",   badge: "bg-slate-100 text-slate-600 border-slate-200",      pill: "bg-slate-100 border-slate-300 text-slate-700"      },
  Active:   { dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 border-emerald-200",  pill: "bg-emerald-50 border-emerald-300 text-emerald-700"  },
  Paused:   { dot: "bg-amber-500",   badge: "bg-amber-50 text-amber-700 border-amber-200",        pill: "bg-amber-50 border-amber-300 text-amber-700"        },
  Archived: { dot: "bg-rose-500",    badge: "bg-rose-50 text-rose-700 border-rose-200",           pill: "bg-rose-50 border-rose-300 text-rose-700"           },
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface FormState {
  name: string;
  category: string;
  brand: string;
  price: string;
  currency: string;
  price_unit: string;   // ← NEW: the "per X" unit
  quantity: string;
  quantity_unit: string;
  measurements: Measurement[];
  description: string;
  image_urls: string[];
  variants_color: string[];
  variants_size: string[];
  status: Status;
  language: string;
}

const EMPTY_M: Measurement = { label: "", value: "", unit: "mm" };

const EMPTY: FormState = {
  name: "", category: "", brand: "",
  price: "", currency: "PKR", price_unit: "kg",  // ← NEW default
  quantity: "", quantity_unit: "pcs",
  measurements: [{ ...EMPTY_M }],
  description: "", image_urls: [""],
  variants_color: [], variants_size: [],
  status: "Draft", language: "en",
};

// ── Style atoms ───────────────────────────────────────────────────────────────

const field =
  "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 " +
  "placeholder-slate-400 outline-none transition-all duration-150 " +
  "focus:border-blue-500 focus:ring-2 focus:ring-blue-100 hover:border-slate-300";

const fieldErr = "!border-red-400 focus:!border-red-500 !ring-red-100 bg-red-50/20";
const lbl = "block text-[11px] font-semibold uppercase tracking-widest text-slate-500 mb-1.5";
const optTag = <span className="ml-1 text-[10px] normal-case font-normal text-slate-400 tracking-normal">optional</span>;

// ── Micro components ──────────────────────────────────────────────────────────

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-red-500">
      <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-red-100 text-[9px] font-bold shrink-0">!</span>
      {msg}
    </p>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {children}
    </div>
  );
}

function CardHeader({ step, title, subtitle, icon }: {
  step: number; title: string; subtitle: string; icon: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 sm:px-5 py-3.5 border-b border-slate-100 bg-slate-50/60">
      <div className="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center text-white text-xs font-bold shrink-0">
        {step}
      </div>
      <span className="text-base leading-none shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-800 leading-tight">{title}</p>
        <p className="text-[11px] text-slate-400 mt-0.5 truncate">{subtitle}</p>
      </div>
    </div>
  );
}

// Generic split input: [number input][select dropdown]
function SplitInput({
  inputProps, selectValue, onSelectChange, options, hasError,
}: {
  inputProps: React.InputHTMLAttributes<HTMLInputElement>;
  selectValue: string;
  onSelectChange: (v: string) => void;
  options: string[];
  hasError?: boolean;
}) {
  return (
    <div className={`flex rounded-lg border overflow-hidden transition-all duration-150
      ${hasError
        ? "border-red-400 ring-2 ring-red-100"
        : "border-slate-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 hover:border-slate-300"}`}>
      <input
        {...inputProps}
        className="flex-1 min-w-0 px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none bg-white"
      />
      <div className="relative shrink-0 border-l border-slate-200 bg-slate-50">
        <select
          value={selectValue}
          onChange={e => onSelectChange(e.target.value)}
          className="h-full appearance-none bg-transparent pl-2.5 pr-6 text-xs font-bold text-slate-600 outline-none cursor-pointer hover:bg-slate-100 transition-colors"
          style={{ minWidth: "52px" }}
        >
          {options.map(o => <option key={o}>{o}</option>)}
        </select>
        <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 text-[9px]">▾</span>
      </div>
    </div>
  );
}

// Triple split: [number][currency][/ per-unit]
function PriceInput({
  price, currency, priceUnit,
  onPrice, onCurrency, onPriceUnit,
  hasError,
}: {
  price: string;
  currency: string;
  priceUnit: string;
  onPrice: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCurrency: (v: string) => void;
  onPriceUnit: (v: string) => void;
  hasError?: boolean;
}) {
  return (
    <div className={`flex rounded-lg border overflow-hidden transition-all duration-150
      ${hasError
        ? "border-red-400 ring-2 ring-red-100"
        : "border-slate-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 hover:border-slate-300"}`}>

      {/* Number input */}
      <input
        type="number"
        value={price}
        onChange={onPrice}
        placeholder="0.00"
        min="0"
        step="0.01"
        className="flex-1 min-w-0 px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none bg-white"
      />

      {/* Currency selector */}
      <div className="relative shrink-0 border-l border-slate-200 bg-slate-50">
        <select
          value={currency}
          onChange={e => onCurrency(e.target.value)}
          className="h-full appearance-none bg-transparent pl-2.5 pr-6 text-xs font-bold text-slate-600 outline-none cursor-pointer hover:bg-slate-100 transition-colors"
          style={{ minWidth: "52px" }}
        >
          {CURRENCIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 text-[9px]">▾</span>
      </div>

      {/* Divider with "per" label */}
      <div className="flex items-center border-l border-slate-200 bg-slate-50 px-2 shrink-0">
        <span className="text-[10px] font-bold text-slate-400 select-none">per</span>
      </div>

      {/* Per-unit selector */}
      <div className="relative shrink-0 border-l border-slate-200 bg-slate-50">
        <select
          value={priceUnit}
          onChange={e => onPriceUnit(e.target.value)}
          className="h-full appearance-none bg-transparent pl-2.5 pr-6 text-xs font-bold text-slate-600 outline-none cursor-pointer hover:bg-slate-100 transition-colors"
          style={{ minWidth: "52px" }}
        >
          {PRICE_UNITS.map(u => <option key={u}>{u}</option>)}
        </select>
        <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 text-[9px]">▾</span>
      </div>
    </div>
  );
}

function Tag({ label, onRemove, color }: { label: string; onRemove: () => void; color: "orange" | "violet" }) {
  const s = {
    orange: { wrap: "bg-orange-50 border-orange-200 text-orange-700", btn: "text-orange-300 hover:text-orange-600 hover:bg-orange-100" },
    violet: { wrap: "bg-violet-50 border-violet-200 text-violet-700", btn: "text-violet-300 hover:text-violet-600 hover:bg-violet-100" },
  }[color];
  return (
    <span className={`inline-flex items-center gap-1 border rounded-md px-2 py-0.5 text-[11px] font-semibold ${s.wrap}`}>
      {label}
      <button onClick={onRemove} className={`w-3.5 h-3.5 rounded flex items-center justify-center text-xs leading-none transition-colors ${s.btn}`}>×</button>
    </span>
  );
}

function MeasurementRow({
  m, idx, total, onChange, onRemove,
}: {
  m: Measurement; idx: number; total: number;
  onChange: (i: number, f: keyof Measurement, v: string) => void;
  onRemove: (i: number) => void;
}) {
  const placeholders = ["Length", "Diameter", "Wall Thickness", "Width", "Height"];
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-2.5 space-y-2 sm:space-y-0 sm:bg-transparent sm:border-0 sm:p-0 sm:flex sm:items-center sm:gap-2">
      <span className="hidden sm:block text-[10px] font-bold text-slate-300 w-5 text-right shrink-0 tabular-nums">{idx + 1}</span>
      <div className="flex items-center gap-2 sm:hidden">
        <span className="text-[10px] font-bold text-slate-300 w-4 shrink-0 tabular-nums">{idx + 1}</span>
        <input value={m.label} onChange={e => onChange(idx, "label", e.target.value)}
          placeholder={`Label — e.g. ${placeholders[idx % 5]}`}
          className={`${field} flex-1`} />
      </div>
      <input value={m.label} onChange={e => onChange(idx, "label", e.target.value)}
        placeholder={`e.g. ${placeholders[idx % 5]}`}
        className={`${field} flex-1 hidden sm:block`} />
      <div className="flex items-center gap-2 sm:contents">
        <input type="number" value={m.value} onChange={e => onChange(idx, "value", e.target.value)}
          placeholder="Value" min="0"
          className={`${field} flex-1 sm:w-28 sm:flex-none sm:shrink-0`} />
        <div className="relative w-20 sm:w-24 shrink-0">
          <select value={m.unit} onChange={e => onChange(idx, "unit", e.target.value)}
            className={`${field} appearance-none pr-6 sm:pr-7`}>
            {UNIT_OPTIONS.map(u => <option key={u}>{u}</option>)}
          </select>
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">▾</span>
        </div>
        <button onClick={() => onRemove(idx)} disabled={total <= 1}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-25 disabled:cursor-not-allowed text-lg leading-none shrink-0">
          ×
        </button>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function ProductForm() {
  const [form, setForm]           = useState<FormState>(EMPTY);
  const [errors, setErrors]       = useState<Partial<Record<string, string>>>({});
  const [saving, setSaving]       = useState(false);
  const [toast, setToast]         = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [colorInput, setCI]       = useState("");
  const [sizeInput,  setSI]       = useState("");
  const [files,      setFiles]    = useState<File[]>([]);
  const [previews,   setPreviews] = useState<string[]>([]);

  const sf = (f: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(p => ({ ...p, [f]: e.target.value }));
  const sd = (f: keyof FormState) => (v: string) => setForm(p => ({ ...p, [f]: v }));

  const addM    = () => setForm(p => ({ ...p, measurements: [...p.measurements, { ...EMPTY_M }] }));
  const removeM = (i: number) => setForm(p => ({ ...p, measurements: p.measurements.filter((_, idx) => idx !== i) }));
  const updateM = (i: number, f: keyof Measurement, v: string) =>
    setForm(p => ({ ...p, measurements: p.measurements.map((m, idx) => idx === i ? { ...m, [f]: v } : m) }));

  const addTag    = (f: "variants_color" | "variants_size", v: string) => setForm(p => ({ ...p, [f]: [...p[f], v] }));
  const removeTag = (f: "variants_color" | "variants_size", i: number) => setForm(p => ({ ...p, [f]: p[f].filter((_, idx) => idx !== i) }));

  const onFiles = (list: FileList | null) => {
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
    if (!form.description.trim()) e.description = "Description is required";
    if (form.price    && (isNaN(+form.price)    || +form.price    < 0)) e.price    = "Enter a valid positive number";
    if (form.quantity && (isNaN(+form.quantity) || +form.quantity < 0)) e.quantity = "Enter a valid positive number";
    if (form.measurements.every(m => !m.label.trim() && !m.value.trim()))
      e.measurements = "Add at least one measurement";
    if (!files.length) e.images = "At least one image is required";
    return e;
  };

  const submit = async (overrideStatus?: Status) => {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    setToast(null);
    try {
      const urls = await Promise.all(files.map(f => uploadImage(f)));
      const filled = form.measurements.filter(m => m.label.trim() || m.value.trim());
      await addProduct({
        name:            form.name,
        category:        form.category   || undefined,
        brand:           form.brand      || undefined,
        price:           form.price      || undefined,
        currency:        form.currency,
        price_unit:      form.price      ? form.price_unit : undefined, // only save if price is set
        quantity:        form.quantity   || undefined,
        quantity_unit:   form.quantity_unit,
        unit_of_measure: filled[0]?.unit ?? "",
        measurements:    filled,
        description:     form.description,
        image_urls:      urls,
        variants_color:  form.variants_color,
        variants_size:   form.variants_size,
        status:          (overrideStatus ?? form.status).toLowerCase(),
        language:        form.language,
        created_at:      serverTimestamp(),
        updated_at:      serverTimestamp(),
      });
      setToast({ type: "success", msg: "Product published successfully!" });
      setForm(EMPTY); setFiles([]); setPreviews([]);
    } catch {
      setToast({ type: "error", msg: "Upload failed. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  const sm = STATUS_META[form.status];
  const requiredFilled = [
    form.name, form.description,
    files.length > 0 ? "y" : "",
    form.measurements.some(m => m.label || m.value) ? "y" : "",
  ].filter(Boolean).length;
  const progress = Math.round(requiredFilled / 4 * 100);
  const errorCount = Object.keys(errors).length;

  // Live price preview — e.g. "PKR 1,200 / kg"
  const pricePreview = form.price
    ? `${form.currency} ${Number(form.price).toLocaleString()} / ${form.price_unit}`
    : null;

  return (
    <div className="min-h-screen w-full bg-[#F8F9FB]" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-20 w-full bg-white/95 backdrop-blur-sm border-b border-slate-200 shadow-sm">
        <div className="w-full px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-900 flex items-center justify-center shrink-0">
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <rect x="1" y="1" width="5" height="5" rx="1" fill="white" fillOpacity="0.9"/>
                <rect x="8" y="1" width="5" height="5" rx="1" fill="white" fillOpacity="0.5"/>
                <rect x="1" y="8" width="5" height="5" rx="1" fill="white" fillOpacity="0.5"/>
                <rect x="8" y="8" width="5" height="5" rx="1" fill="white" fillOpacity="0.3"/>
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest leading-none mb-0.5 hidden sm:block">Products</p>
              <p className="text-sm font-bold text-slate-900 leading-none truncate">New Listing</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <div className="hidden sm:flex flex-col items-end gap-0.5">
              <div className="flex items-center gap-1.5">
                <div className="w-24 sm:w-28 h-1 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${progress}%`,
                      background: progress === 100
                        ? "linear-gradient(90deg,#10b981,#059669)"
                        : "linear-gradient(90deg,#3b82f6,#1d4ed8)",
                    }} />
                </div>
                <span className="text-[11px] font-bold text-slate-400 tabular-nums w-7">{progress}%</span>
              </div>
              <p className="text-[10px] text-slate-300">4 required fields</p>
            </div>
            <span className="sm:hidden text-xs font-bold text-slate-400 tabular-nums">{progress}%</span>
            <span className={`inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-full border text-[11px] font-bold ${sm.badge}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${sm.dot}`} />
              {form.status}
            </span>
          </div>
        </div>
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div className="w-full px-4 sm:px-6 pt-4">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-semibold shadow-sm
            ${toast.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0
              ${toast.type === "success" ? "bg-emerald-200 text-emerald-700" : "bg-red-200 text-red-700"}`}>
              {toast.type === "success" ? "✓" : "!"}
            </span>
            {toast.msg}
            <button onClick={() => setToast(null)} className="ml-auto opacity-40 hover:opacity-70 text-lg">×</button>
          </div>
        </div>
      )}

      {/* ── Form ── */}
      <main className="w-full px-4 sm:px-6 pt-5 pb-28 space-y-4">

        {/* 1 — Core Information */}
        <Card>
          <CardHeader step={1} icon="📦" title="Core Information" subtitle="Name, category, brand & description" />
          <div className="p-4 sm:p-5 grid gap-4 sm:gap-5">
            <div>
              <label className={lbl}>Product Name <span className="text-red-400">*</span></label>
              <input value={form.name} onChange={sf("name")}
                placeholder="e.g. GI Pipe Schedule 40 · 6m · 25mm"
                className={`${field} ${errors.name ? fieldErr : ""}`} />
              <FieldError msg={errors.name} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={lbl}>Category {optTag}</label>
                <input value={form.category} onChange={sf("category")}
                  placeholder="e.g. Pipes, Metals, Electronics" className={field} />
              </div>
              <div>
                <label className={lbl}>Brand {optTag}</label>
                <input value={form.brand} onChange={sf("brand")}
                  placeholder="e.g. Ittefaq, AGS, Orient" className={field} />
              </div>
            </div>
            <div>
              <label className={lbl}>Description <span className="text-red-400">*</span></label>
              <textarea value={form.description} onChange={sf("description")}
                placeholder="Material grade, finish, intended use, packaging details…"
                rows={4}
                className={`${field} resize-y min-h-[90px] leading-relaxed ${errors.description ? fieldErr : ""}`} />
              <div className="flex justify-between mt-1">
                <FieldError msg={errors.description} />
                <span className="text-[10px] text-slate-300 tabular-nums font-mono ml-auto">{form.description.length}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* 2 — Pricing & Quantity */}
        <Card>
          <CardHeader step={2} icon="💰" title="Pricing & Quantity" subtitle="Price per unit with currency, and available stock" />
          <div className="p-4 sm:p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* ── Price field ── */}
              <div>
                <label className={lbl}>Price {optTag}</label>
                <PriceInput
                  price={form.price}
                  currency={form.currency}
                  priceUnit={form.price_unit}
                  onPrice={sf("price")}
                  onCurrency={sd("currency")}
                  onPriceUnit={sd("price_unit")}
                  hasError={!!errors.price}
                />
                <FieldError msg={errors.price} />
                {/* Live preview */}
                {pricePreview && (
                  <p className="mt-1.5 text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                    <span className="w-3.5 h-3.5 rounded-full bg-emerald-100 text-emerald-600 text-[8px] flex items-center justify-center shrink-0 font-black">✓</span>
                    {pricePreview}
                  </p>
                )}
              </div>

              {/* ── Quantity field ── */}
              <div>
                <label className={lbl}>Quantity {optTag}</label>
                <SplitInput
                  inputProps={{ type: "number", value: form.quantity, onChange: sf("quantity"), placeholder: "e.g. 500", min: "0" }}
                  selectValue={form.quantity_unit} onSelectChange={sd("quantity_unit")}
                  options={QUANTITY_UNITS} hasError={!!errors.quantity}
                />
                <FieldError msg={errors.quantity} />
              </div>

            </div>

            {/* ── Pricing hint ── */}
            <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-400 text-sm shrink-0 mt-0.5">💡</span>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                <span className="font-bold text-slate-600">Price examples:</span>{" "}
                <span className="text-slate-500">Steel sheet →</span>{" "}
                <span className="font-semibold text-slate-700">PKR 2,500 / kg</span>
                <span className="text-slate-400 mx-1.5">·</span>
                <span className="text-slate-500">PVC pipe →</span>{" "}
                <span className="font-semibold text-slate-700">PKR 180 / ft</span>
                <span className="text-slate-400 mx-1.5">·</span>
                <span className="text-slate-500">Brass rod →</span>{" "}
                <span className="font-semibold text-slate-700">USD 12 / m</span>
              </p>
            </div>
          </div>
        </Card>

        {/* 3 — Measurements */}
        <Card>
          <CardHeader step={3} icon="📐" title="Measurements" subtitle="Label, value and unit for each dimension" />
          <div className="p-4 sm:p-5 space-y-3">
            <div className="hidden sm:flex items-center gap-2 pl-7">
              <p className="flex-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Dimension Label</p>
              <p className="w-28 shrink-0 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Value</p>
              <p className="w-24 shrink-0 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Unit</p>
              <span className="w-8 shrink-0" />
            </div>
            <p className="sm:hidden text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              Dimensions ({form.measurements.length})
            </p>
            <div className="space-y-2">
              {form.measurements.map((m, idx) => (
                <MeasurementRow key={idx} m={m} idx={idx} total={form.measurements.length}
                  onChange={updateM} onRemove={removeM} />
              ))}
            </div>
            <button onClick={addM}
              className="flex items-center gap-2 text-[12px] font-semibold text-blue-600 hover:text-blue-700 transition-colors group">
              <span className="w-6 h-6 rounded-md border-2 border-dashed border-blue-300 flex items-center justify-center text-blue-400 group-hover:border-blue-500 group-hover:text-blue-600 transition-colors text-sm leading-none">+</span>
              Add measurement
            </button>
            <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-blue-50/60 border border-blue-100">
              <span className="text-blue-400 text-sm shrink-0 mt-0.5">💡</span>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                <span className="font-bold text-slate-600">Tip:</span> For a pipe add{" "}
                <span className="font-semibold text-slate-600">Length → 6 → m</span>,{" "}
                <span className="font-semibold text-slate-600">OD → 25.4 → mm</span>,{" "}
                <span className="font-semibold text-slate-600">WT → 2.5 → mm</span>
              </p>
            </div>
            <FieldError msg={errors.measurements} />
          </div>
        </Card>

        {/* 4 — Images */}
        <Card>
          <CardHeader step={4} icon="🖼️" title="Product Images" subtitle="First image shown as the main photo" />
          <div className="p-4 sm:p-5 space-y-4">
            <label className={`group relative flex flex-col items-center justify-center gap-3 w-full rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200 py-8 sm:py-10 px-4 sm:px-6 text-center
              ${errors.images ? "border-red-300 bg-red-50/30" : "border-slate-200 hover:border-blue-400 hover:bg-blue-50/30"}`}>
              <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl border-2 flex items-center justify-center transition-all
                ${errors.images ? "bg-red-50 border-red-200" : "bg-white border-slate-200 group-hover:border-blue-300 group-hover:bg-blue-50"}`}>
                <svg className={`w-5 h-5 transition-colors ${errors.images ? "text-red-400" : "text-slate-400 group-hover:text-blue-500"}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className={`text-sm font-semibold ${errors.images ? "text-red-600" : "text-slate-700 group-hover:text-blue-700"}`}>
                  Tap to browse or drag & drop
                </p>
                <p className="text-xs text-slate-400 mt-1">PNG, JPG, WEBP — max 800 KB each</p>
              </div>
              <input type="file" accept="image/*" multiple className="sr-only" onChange={e => onFiles(e.target.files)} />
            </label>
            <FieldError msg={errors.images} />
            {previews.length > 0 && (
              <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
                {previews.map((src, i) => (
                  <div key={i} className="group relative aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                    <img src={src} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all duration-150 flex items-center justify-center">
                      <button onClick={() => removeFile(i)}
                        className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-full bg-white text-slate-700 text-sm font-bold hover:bg-red-100 hover:text-red-600 transition-all flex items-center justify-center shadow">×</button>
                    </div>
                    {i === 0 && (
                      <span className="absolute top-1 left-1 bg-slate-900 text-white text-[8px] font-bold px-1.5 py-0.5 rounded tracking-wide uppercase">Main</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* 5 — Variants */}
        <Card>
          <CardHeader step={5} icon="🎨" title="Variants" subtitle="Colors / finishes and sizes / grades" />
          <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className={lbl}>Colors / Finish {optTag}</label>
              {form.variants_color.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {form.variants_color.map((t, i) => (
                    <Tag key={i} label={t} color="orange" onRemove={() => removeTag("variants_color", i)} />
                  ))}
                </div>
              )}
              <input value={colorInput} onChange={e => setCI(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && colorInput.trim()) { e.preventDefault(); addTag("variants_color", colorInput.trim()); setCI(""); } }}
                placeholder="Gold, Galvanized… press Enter" className={field} />
              <p className="text-[10px] text-slate-400">Press <kbd className="px-1 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono text-[9px]">Enter</kbd> to add</p>
            </div>
            <div className="space-y-2">
              <label className={lbl}>Sizes / Grades {optTag}</label>
              {form.variants_size.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {form.variants_size.map((t, i) => (
                    <Tag key={i} label={t} color="violet" onRemove={() => removeTag("variants_size", i)} />
                  ))}
                </div>
              )}
              <input value={sizeInput} onChange={e => setSI(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && sizeInput.trim()) { e.preventDefault(); addTag("variants_size", sizeInput.trim()); setSI(""); } }}
                placeholder="Sch 40, Grade A… press Enter" className={field} />
              <p className="text-[10px] text-slate-400">Press <kbd className="px-1 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono text-[9px]">Enter</kbd> to add</p>
            </div>
          </div>
        </Card>

        {/* 6 — Publishing */}
        <Card>
          <CardHeader step={6} icon="🌐" title="Publishing" subtitle="Visibility status and language" />
          <div className="p-4 sm:p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={lbl}>Status</label>
                <div className="relative">
                  <select value={form.status} onChange={sf("status")} className={`${field} appearance-none pr-8`}>
                    {STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">▾</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {STATUSES.map(s => {
                    const meta = STATUS_META[s];
                    const active = s === form.status;
                    return (
                      <button key={s} onClick={() => setForm(p => ({ ...p, status: s }))}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all
                          ${active ? meta.pill : "bg-white border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300"}`}>
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className={lbl}>Language</label>
                <div className="relative">
                  <select value={form.language} onChange={sf("language")} className={`${field} appearance-none pr-8`}>
                    {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.flag} {l.label} ({l.code})</option>)}
                  </select>
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">▾</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-slate-300 text-sm">🕒</span>
              <p className="text-[11px] text-slate-400">
                <span className="font-semibold text-slate-500">Created At</span> and{" "}
                <span className="font-semibold text-slate-500">Updated At</span> are auto-generated on submit.
              </p>
            </div>
          </div>
        </Card>

        {/* ── Actions ── */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
          <button
            onClick={() => { setForm(EMPTY); setErrors({}); setCI(""); setSI(""); setFiles([]); setPreviews([]); setToast(null); }}
            className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-700 transition-all">
            Reset Form
          </button>
          <div className="flex flex-col-reverse sm:flex-row gap-2.5">
            <button disabled={saving} onClick={() => submit("Draft")}
              className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-all text-center">
              Save as Draft
            </button>
            <button disabled={saving} onClick={() => submit()}
              className="relative px-7 py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50 overflow-hidden transition-all active:scale-[0.98]"
              style={{
                background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                boxShadow: "0 4px 14px rgba(37,99,235,0.35), inset 0 1px 0 rgba(255,255,255,0.15)",
              }}>
              <span className="absolute inset-0 hover:bg-white/5 transition-colors" />
              {saving
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Publishing…</>
                : <>Publish Product <span className="opacity-70">→</span></>}
            </button>
          </div>
        </div>

        {errorCount > 0 && (
          <div className="flex items-center gap-3 px-4 py-3.5 bg-red-50 border border-red-200 rounded-xl">
            <span className="w-6 h-6 rounded-full bg-red-200 text-red-700 text-xs font-bold flex items-center justify-center shrink-0">{errorCount}</span>
            <p className="text-sm text-red-700 font-semibold">
              {errorCount} issue{errorCount > 1 ? "s" : ""} need{errorCount === 1 ? "s" : ""} to be fixed
            </p>
          </div>
        )}
      </main>
    </div>
  );
}