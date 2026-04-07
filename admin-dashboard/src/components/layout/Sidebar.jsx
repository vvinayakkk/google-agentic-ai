import React, { useEffect, useMemo, useRef, useState } from "react";
import * as Icons from "lucide-react";
import { NAV_ITEMS, PAGE_KEYS } from "../../utils/constants";
import { useUI } from "../../context/UIContext";
import { useAuth } from "../../context/AuthContext";
import avatarImg from "../../assets/avatar.png";

const Sidebar = () => {
  const { activePage, setActivePage } = useUI();
  const { profile, logout } = useAuth();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);

  const avatarUrl = useMemo(() => {
    const avatarSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" role="img" aria-label="Boy avatar">
        <defs>
          <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stop-color="#111111" />
            <stop offset="100%" stop-color="#1f2937" />
          </linearGradient>
        </defs>
        <rect width="96" height="96" rx="48" fill="url(#bg)" />
        <circle cx="48" cy="53" r="22" fill="#f2c7a5" />
        <path d="M29 43c2-13 12-22 19-22s17 3 20 11c1 3 1 6 0 10-2-5-8-7-12-7-6 0-10 2-15 2-4 0-8 2-12 6z" fill="#1b120f" />
        <path d="M31 47c3-7 9-11 17-11s15 4 17 11c-2 2-4 3-7 3-5 0-7-3-10-3-3 0-5 3-10 3-3 0-5-1-7-3z" fill="#2b1d17" opacity="0.95" />
        <circle cx="39" cy="53" r="2" fill="#1a1a1a" />
        <circle cx="57" cy="53" r="2" fill="#1a1a1a" />
        <path d="M42 61c2 2 10 2 12 0" stroke="#8b5e3c" stroke-width="2.2" stroke-linecap="round" fill="none" />
        <path d="M26 76c3-8 11-12 22-12s19 4 22 12" fill="#1b120f" />
        <path d="M36 68c4 3 20 3 24 0" stroke="#f2c7a5" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.45" />
      </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(avatarSvg)}`;
  }, [profile?.email, profile?.name]);

  useEffect(() => {
    const closeIfOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", closeIfOutside);
    return () => document.removeEventListener("mousedown", closeIfOutside);
  }, []);

  return (
    <aside className="app-sidebar">
      <div style={{ padding: "10px 12px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid var(--border-soft)" }}>
        <div style={{ width: 92, height: 92, overflow: "hidden", borderRadius: 12, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "none" }}>
          <img
            src="/logo_light.png"
            alt="KisanKiAwaaz"
            style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", lineHeight: 1.15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>KisanKiAwaaz</div>
          <div style={{ marginTop: 4 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                border: "1px solid var(--soft-strong)",
                borderRadius: 999,
                padding: "2px 8px",
                fontSize: 11,
                color: "var(--accent)",
                background: "transparent",
                fontWeight: 600,
                lineHeight: 1,
              }}
            >
              Admin
            </span>
          </div>
        </div>
      </div>

      <nav style={{ flex: 1, overflow: "auto", padding: "6px 0" }}>
        {(() => {
          // Keep Overview out of sidebar, and otherwise honor NAV_ITEMS order.
          const filtered = NAV_ITEMS.filter((i) => i.key !== PAGE_KEYS.OVERVIEW);

          return filtered.map((item) => {
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

      <div style={{ padding: 10, borderTop: "1px solid var(--border)" }}>
        <div
          ref={profileMenuRef}
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            gap: 10,
            borderRadius: 16,
            border: "1px solid var(--soft)",
            background: "var(--surface-2)",
            padding: "10px 10px 10px 8px",
          }}
        >
          <img
            src={avatarImg || avatarUrl}
            alt={profile?.name || "Admin avatar"}
            style={{ width: 38, height: 38, borderRadius: 999, flexShrink: 0, objectFit: "cover", background: "var(--surface)", border: "1px solid var(--soft)" }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: "var(--text)", fontWeight: 600, lineHeight: 1.15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {profile?.name || "Admin"}
            </div>
            <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {profile?.email || ""}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setProfileMenuOpen((prev) => !prev)}
            aria-label="Open profile actions"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 28,
              height: 28,
              borderRadius: 999,
              border: "1px solid var(--soft-strong)",
              background: "var(--soft-subtle)",
              color: "var(--text)",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <Icons.ChevronDown size={14} style={{ transform: profileMenuOpen ? "rotate(180deg)" : "none", transition: "transform 120ms ease" }} />
          </button>

          {profileMenuOpen ? (
            <div
              style={{
                position: "absolute",
                left: 8,
                right: 8,
                bottom: "calc(100% + 8px)",
                borderRadius: 14,
                border: "1px solid var(--soft)",
                background: "var(--surface)",
                boxShadow: "var(--shadow-lg)",
                padding: 6,
                zIndex: 20,
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setProfileMenuOpen(false);
                  logout();
                }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  border: "1px solid var(--soft)",
                  background: "var(--soft-subtle)",
                  color: "var(--text)",
                  borderRadius: 10,
                  padding: "8px 12px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <Icons.LogOut size={14} />
                Sign out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
