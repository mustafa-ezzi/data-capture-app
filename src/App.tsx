import { useState, useEffect } from "react";
import ProductForm from "./pages/ProductForm";
import ProductTable from "./pages/ProductTable";

type Page = "form" | "table";

const NAV_ITEMS: { id: Page; label: string; icon: string; description: string }[] = [
  { id: "form",  label: "Add Product",  icon: "✦", description: "Create new listing" },
  { id: "table", label: "All Products", icon: "▦", description: "Browse & export"    },
];

export default function App() {
  const [page, setPage]           = useState<Page>("form");
  const [sidebarOpen, setSidebar] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const handler = (e: MediaQueryListEvent) => { if (e.matches) setSidebar(false); };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const navigate = (p: Page) => { setPage(p); setSidebar(false); };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-white/10 shrink-0 ${collapsed ? "justify-center" : ""}`}>
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white font-black text-base shadow-lg shadow-blue-900/40 shrink-0">
          DC
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-sm font-black text-white tracking-tight leading-none">DataCapture</p>
            <p className="text-[10px] text-slate-400 mt-0.5 font-mono">Product Portal</p>
          </div>
        )}
      </div>

      {/* Nav label */}
      {!collapsed && (
        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500 px-5 pt-5 pb-2">Navigation</p>
      )}

      {/* Nav items */}
      <nav className="flex flex-col gap-1 px-2 mt-2 flex-1">
        {NAV_ITEMS.map(item => {
          const active = page === item.id;
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              title={collapsed ? item.label : undefined}
              className={`group relative flex items-center gap-3 rounded-xl transition-all duration-200 text-left
                ${collapsed ? "justify-center px-3 py-3" : "px-3 py-3"}
                ${active ? "bg-white/10 text-white" : "text-slate-400 hover:text-white hover:bg-white/5"}`}
            >
              {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-sky-400 rounded-r-full" />}
              <span className={`text-base shrink-0 ${active ? "text-sky-400" : "text-slate-500 group-hover:text-slate-300"}`}>
                {item.icon}
              </span>
              {!collapsed && (
                <div className="min-w-0">
                  <p className={`text-xs font-semibold leading-tight truncate ${active ? "text-white" : ""}`}>{item.label}</p>
                  <p className="text-[10px] text-slate-500 group-hover:text-slate-400 mt-0.5">{item.description}</p>
                </div>
              )}
              {collapsed && (
                <span className="pointer-events-none absolute left-full ml-3 px-2.5 py-1.5 bg-slate-800 text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-xl border border-white/10">
                  {item.label}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="mx-4 border-t border-white/10 my-3" />

      {/* Quick stats */}
      {!collapsed && (
        <div className="mx-3 mb-3 rounded-xl bg-white/5 border border-white/10 p-3">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">Quick Stats</p>
          <div className="flex justify-between">
            {[["Phase", "1 & 2"], ["Status", "Active"]].map(([k, v]) => (
              <div key={k}>
                <p className="text-[10px] text-slate-500">{k}</p>
                <p className="text-xs font-bold text-white">{v}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="hidden md:flex items-center justify-center mx-3 mb-4 py-2.5 rounded-xl border border-white/10 text-slate-500 hover:text-white hover:bg-white/5 transition-all text-xs gap-2"
      >
        <span className={`transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`}>◂</span>
        {!collapsed && <span className="text-[11px] font-medium">Collapse</span>}
      </button>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* Desktop Sidebar */}
      <aside className={`hidden md:flex flex-col shrink-0 bg-[#0F1829] border-r border-white/[0.07] sticky top-0 h-screen transition-all duration-300 ease-in-out
        ${collapsed ? "w-[64px]" : "w-[220px]"}`}>
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden" onClick={() => setSidebar(false)} />
      )}

      {/* Mobile drawer */}
      <aside className={`fixed top-0 left-0 z-50 h-full w-[240px] bg-[#0F1829] border-r border-white/[0.07] flex flex-col md:hidden transition-transform duration-300 ease-in-out
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white font-black text-xs shadow-lg">DC</div>
            <p className="text-sm font-black text-white">DataCapture</p>
          </div>
          <button onClick={() => setSidebar(false)} className="w-7 h-7 rounded-lg bg-white/5 text-slate-400 hover:text-white flex items-center justify-center text-base">×</button>
        </div>
        <SidebarContent />
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50">

        {/* Mobile topbar */}
        <header className="md:hidden flex items-center justify-between px-4 h-14 bg-[#0F1829] border-b border-white/[0.07] sticky top-0 z-30 shrink-0">
          <button
            onClick={() => setSidebar(true)}
            className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition-all"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <rect y="2" width="16" height="1.5" rx="0.75"/>
              <rect y="7.25" width="16" height="1.5" rx="0.75"/>
              <rect y="12.5" width="10" height="1.5" rx="0.75"/>
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white font-black text-[9px]">DC</div>
            <span className="text-sm font-black text-white">DataCapture</span>
          </div>
          <span className="text-[10px] font-semibold text-sky-400 bg-sky-400/10 border border-sky-400/20 px-2.5 py-1 rounded-full">
            {NAV_ITEMS.find(n => n.id === page)?.label}
          </span>
        </header>

        {/* Page content — full width, no wrapper bg mismatch */}
        <main className="flex-1 overflow-auto">
          {page === "form"  && <ProductForm />}
          {page === "table" && <ProductTable />}
        </main>
      </div>
    </div>
  );
}