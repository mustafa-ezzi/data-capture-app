import { useEffect, useState } from "react";
import { getProducts } from "../services/productService";

interface Measurement {
  label: string;
  value: string;
  unit: string;
}

interface Product {
  id: string;
  name: string;
  category: string;
  brand?: string | null;
  price?: number | null;
  unit_of_measure: string;
  description: string;
  image_urls: string[];
  variants?: { color?: string[]; size?: string[] };
  status: string;
  language: string;
  created_at?: { seconds: number } | null;
  measurements?: Measurement[];
}

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600 border-slate-200",
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  paused: "bg-amber-50 text-amber-700 border-amber-200",
  archived: "bg-red-50 text-red-700 border-red-200",
};
const STATUS_DOT: Record<string, string> = {
  draft: "bg-slate-400", active: "bg-emerald-500", paused: "bg-amber-500", archived: "bg-red-500",
};

function formatDate(ts?: { seconds: number } | null) {
  if (!ts?.seconds) return "—";
  return new Date(ts.seconds * 1000).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function exportCSV(products: Product[]) {
  const headers = [
    "name", "category", "brand", "price", "unit_of_measure",
    "description", "image_urls", "variants_color", "variants_size",
    "status", "language", "created_at",
  ];
  const rows = products.map(p => [
    p.name,
    p.category,
    p.brand ?? "",
    p.price ?? "",
    p.unit_of_measure,
    `"${(p.description ?? "").replace(/"/g, '""')}"`,
    (p.image_urls ?? []).join("|"),
    (p.variants?.color ?? []).join("|"),
    (p.variants?.size ?? []).join("|"),
    p.status,
    p.language,
    formatDate(p.created_at),
  ]);
  const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `products_export_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Image thumbnail with lightbox ────────────────────────────────────────────

function Thumbnail({ urls }: { urls: string[] }) {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);

  if (!urls?.length || !urls[0]) {
    return (
      <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-300 text-lg shrink-0">
        📷
      </div>
    );
  }

  return (
    <>
      {/* Thumbnail stack */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => { setActiveIdx(0); setOpen(true); }}
          className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 shrink-0 hover:border-indigo-400 hover:shadow-md transition-all duration-150 group relative"
        >
          <img
            src={urls[0]}
            alt=""
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
          />
        </button>
        {urls.length > 1 && (
          <button
            onClick={() => { setActiveIdx(1); setOpen(true); }}
            className="w-6 h-6 rounded-md overflow-hidden border border-slate-200 shrink-0 hover:border-indigo-400 transition-all"
          >
            <img src={urls[1]} alt="" className="w-full h-full object-cover" />
          </button>
        )}
        {urls.length > 2 && (
          <button
            onClick={() => { setActiveIdx(0); setOpen(true); }}
            className="w-6 h-6 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500 hover:bg-indigo-50 hover:border-indigo-300 transition-all"
          >
            +{urls.length - 2}
          </button>
        )}
      </div>

      {/* Lightbox */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-2xl overflow-hidden shadow-2xl max-w-lg w-full"
            onClick={e => e.stopPropagation()}
          >
            {/* Main image */}
            <div className="relative bg-slate-100 aspect-square">
              <img
                src={urls[activeIdx]}
                alt=""
                className="w-full h-full object-contain"
              />
              <button
                onClick={() => setOpen(false)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors text-sm font-bold"
              >
                ×
              </button>
              {/* Counter */}
              <span className="absolute bottom-3 left-3 bg-black/50 text-white text-xs font-medium px-2.5 py-1 rounded-full">
                {activeIdx + 1} / {urls.length}
              </span>
            </div>

            {/* Thumbnail strip */}
            {urls.length > 1 && (
              <div className="flex gap-2 p-3 overflow-x-auto bg-slate-50 border-t border-slate-200">
                {urls.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveIdx(i)}
                    className={`w-14 h-14 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${i === activeIdx ? "border-indigo-500" : "border-transparent hover:border-slate-300"
                      }`}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ── Columns ──────────────────────────────────────────────────────────────────

const COLS = ["", "Product", "Category", "Measurements", "Price", "Status","Created At"];
// ── Main Component ────────────────────────────────────────────────────────────

export default function ProductTable() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getProducts();
      setProducts(data as Product[]);
    } catch {
      setError("Failed to load products. Check your connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = products.filter(p => {
    const matchSearch =
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.category?.toLowerCase().includes(search.toLowerCase()) ||
      (p.brand ?? "")?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || p.status?.toLowerCase() === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="min-h-screen bg-slate-100 font-['DM_Sans',sans-serif]">

      {/* Page Header */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex items-start justify-between gap-3 flex-wrap">
          <div>
            
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">All Products</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {loading ? "Loading…" : `${filtered.length} of ${products.length} product${products.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <button
              onClick={load}
              className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-1.5"
            >
              ↻ Refresh
            </button>
            <button
              disabled={filtered.length === 0}
              onClick={() => exportCSV(filtered)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-200 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
            >
              ↓ Export to CSV
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, category, brand…"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
            />
          </div>
          <div className="relative">
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 outline-none focus:border-indigo-400 cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="archived">Archived</option>
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">▾</span>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-8 h-8 border-2 border-slate-200 border-t-indigo-500 rounded-full animate-spin" />
            <p className="text-sm text-slate-400">Loading products…</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
            <div className="text-3xl">⚠️</div>
            <p className="text-sm font-medium text-slate-700">{error}</p>
            <button onClick={load} className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg">Retry</button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && products.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
            <div className="text-4xl">📦</div>
            <p className="text-base font-semibold text-slate-600">No products yet</p>
            <p className="text-sm text-slate-400">Use the Product Form to add your first entry.</p>
          </div>
        )}

        {/* No results */}
        {!loading && !error && products.length > 0 && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
            <p className="text-sm font-medium text-slate-600">No results match your search</p>
            <button
              onClick={() => { setSearch(""); setFilterStatus("all"); }}
              className="text-xs text-indigo-500 hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}

        {/* Table */}
        {!loading && !error && filtered.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[800px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    {COLS.map(col => (
                      <th
                        key={col}
                        className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((p) => {
                    const statusKey = (p.status ?? "draft").toLowerCase();
                    const badgeClass = STATUS_BADGE[statusKey] ?? STATUS_BADGE.draft;
                    const dotClass = STATUS_DOT[statusKey] ?? STATUS_DOT.draft;
                    return (
                      <tr
                        key={p.id}
                        className="hover:bg-indigo-50/30 transition-colors"
                      >
                        {/* Image thumbnails */}
                        <td className="px-4 py-3">
                          <Thumbnail urls={p.image_urls ?? []} />
                        </td>

                        {/* Name */}
                        <td className="px-4 py-3 max-w-[180px]">
                          <p className="font-semibold text-slate-800 truncate">{p.name}</p>
                          {p.description && (
                            <p className="text-[11px] text-slate-400 truncate mt-0.5 max-w-[160px]">
                              {p.description}
                            </p>
                          )}
                        </td>

                        {/* Category */}
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap text-xs">{p.category}</td>

                        <td className="px-4 py-3 min-w-[150px]">
                          <div className="flex flex-wrap gap-1.5">
                            {p.measurements && p.measurements.length > 0 ? (
                              p.measurements.map((m, idx) => (
                                <div
                                  key={idx}
                                  className="flex flex-col bg-slate-50 border border-slate-200 rounded px-2 py-1 min-w-[60px]"
                                >
                                  <span className="text-[9px] uppercase font-bold text-slate-400 leading-none mb-1">
                                    {m.label}
                                  </span>
                                  <span className="text-xs font-mono text-indigo-700 leading-none">
                                    {m.value} <span className="text-[10px] text-slate-500">{m.unit}</span>
                                  </span>
                                </div>
                              ))
                            ) : (
                              <span className="text-slate-300 text-xs">—</span>
                            )}
                          </div>
                        </td>

                        {/* Price */}
                        <td className="px-4 py-3 text-slate-700 font-mono text-xs whitespace-nowrap">
                          {p.price != null
                            ? `PKR ${Number(p.price).toLocaleString()}`
                            : <span className="text-slate-300">—</span>}
                        </td>

                       

                        {/* Status */}
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${badgeClass}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
                            {p.status ? p.status.charAt(0).toUpperCase() + p.status.slice(1) : "—"}
                          </span>
                        </td>

                       
                        {/* Created At */}
                        <td className="px-4 py-3 text-xs text-slate-400 font-mono whitespace-nowrap">
                          {formatDate(p.created_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between flex-wrap gap-2">
              <p className="text-xs text-slate-400">
                Showing <span className="font-semibold text-slate-600">{filtered.length}</span> product{filtered.length !== 1 ? "s" : ""}
              </p>
              <button
                disabled={filtered.length === 0}
                onClick={() => exportCSV(filtered)}
                className="px-3 py-1.5 bg-white border border-slate-200 text-xs font-medium text-slate-600 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition-colors flex items-center gap-1"
              >
                ↓ Export CSV
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}