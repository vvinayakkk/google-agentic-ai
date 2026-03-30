import React from "react";
import * as Icons from "lucide-react";
import { NAV_ITEMS, PAGE_KEYS } from "../../utils/constants";
import { useUI } from "../../context/UIContext";
import { useAuth } from "../../context/AuthContext";

const Sidebar = () => {
  const { activePage, setActivePage } = useUI();
  const { profile, logout } = useAuth();

  return (
    <aside className="app-sidebar">
      <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: 6, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ color: "#000", fontWeight: 700, fontSize: 12 }}>K</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", lineHeight: 1 }}>{"KisanKiAwaaz"}</div>
          <div style={{ marginTop: 4 }}><span className="badge-green" style={{ fontSize: 10, padding: "2px 6px" }}>Admin</span></div>
        </div>
      </div>

      <nav style={{ flex: 1, overflow: "auto", padding: "6px 0" }}>
        {(() => {
          // Remove Overview from the nav and ensure Analytics is shown first,
          // followed by Database Explorer, then the remaining items.
          const filtered = NAV_ITEMS.filter((i) => i.key !== PAGE_KEYS.OVERVIEW);
          const desiredOrder = [PAGE_KEYS.ANALYTICS, PAGE_KEYS.DATABASE];
          const ordered = [];
          desiredOrder.forEach((k) => {
            const it = filtered.find((n) => n.key === k);
            if (it) ordered.push(it);
          });
          filtered.forEach((n) => {
            if (!desiredOrder.includes(n.key)) ordered.push(n);
          });

          return ordered.map((item) => {
            const Icon = Icons[item.icon] || Icons.Square;
            const isActive = item.key === activePage;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setActivePage(item.key)}
                className={`nav-btn flex items-center gap-3 w-full h-9 px-4 my-1 transition-colors ${isActive ? "active" : ""}`}
                style={{
                  alignItems: "center",
                  color: isActive ? "var(--text)" : "var(--muted)",
                  borderLeft: isActive ? "2px solid var(--accent)" : "2px solid transparent",
                  cursor: "pointer",
                }}
              >
                <Icon size={16} style={{ color: isActive ? "var(--accent)" : "var(--muted)" }} />
                <span style={{ fontFamily: "Geist, Inter, system-ui", fontSize: 14 }}>{item.label}</span>
              </button>
            );
          });
        })()}
      </nav>

      <div style={{ padding: 12, borderTop: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--accent-dim)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)", fontWeight: 700 }}>{(profile?.name || "A").charAt(0).toUpperCase()}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: "var(--text)", fontWeight: 600 }}>{profile?.name || "Admin"}</div>
            <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>{profile?.email || ""}</div>
          </div>
          <button type="button" onClick={() => logout()} className="icon-btn" style={{ color: "var(--danger)", fontSize: 12 }}>Sign out</button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
