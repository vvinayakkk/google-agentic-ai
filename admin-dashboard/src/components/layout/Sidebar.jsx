import React from "react";
import * as Icons from "lucide-react";
import { NAV_ITEMS } from "../../utils/constants";
import { useUI } from "../../context/UIContext";

const Sidebar = () => {
  const { activePage, setActivePage } = useUI();

  return (
    <aside className="app-sidebar">
      <div className="sidebar-inner">
        <div className="flex items-center justify-center p-3">
          <div style={{ width: 28, height: 28, borderRadius: 6, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#000", fontWeight: 700, fontSize: 12 }}>K</span>
          </div>
        </div>

        <nav className="flex-1 px-1 py-2 overflow-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = Icons[item.icon] || Icons.Square;
            const isActive = item.key === activePage;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setActivePage(item.key)}
                className={`flex w-full items-center gap-3 rounded-sm px-2 py-2 my-1 transition-colors ${
                  isActive ? "bg-transparent border-l-2 border-l-[var(--accent)] text-[var(--text)]" : "text-[var(--muted)]"
                }`}
                style={{ alignItems: "center" }}
                title={item.label}
              >
                <Icon size={18} className={isActive ? "text-[var(--accent)]" : "text-[var(--muted)]"} />
                <span className="hidden app-sidebar-hover:block truncate text-sm" style={{ fontSize: 14 }}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        <div className="p-3">
          <button type="button" className="btn-ghost w-full">Settings</button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
