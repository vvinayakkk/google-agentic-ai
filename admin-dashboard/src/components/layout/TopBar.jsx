import React, { useMemo, useRef, useState } from "react";
import { RefreshCw, Download, Bell, ChevronDown, LogOut } from "lucide-react";
import { NAV_ITEMS, PAGE_KEYS } from "../../utils/constants";
import { useUI } from "../../context/UIContext";
import { useAuth } from "../../context/AuthContext";

const TopBar = ({ onRefresh }) => {
  const { activePage, setExportOpen } = useUI();
  const { profile, logout } = useAuth();
  const pageName = useMemo(() => NAV_ITEMS.find((i) => i.key === activePage)?.label || "Overview", [activePage]);
  const initial = (profile?.name || profile?.email || "A").slice(0, 1).toUpperCase();
  const [open, setOpen] = useState(false);
  const profileRef = useRef(null);

  const handleRefresh = () => {
    if (onRefresh) onRefresh();
    else window.dispatchEvent(new Event("app:refresh"));
  };

  return (
    <div className="app-topbar">
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--muted)" }}>
        <div style={{ letterSpacing: "0.08em", fontSize: 11, color: "var(--muted)" }}>KISANKIAWAAZ</div>
        <div style={{ color: "var(--muted)" }}>/</div>
        <div style={{ fontSize: 13, color: "var(--text)", fontWeight: 600 }}>{pageName}</div>
      </div>

      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
        <button
          type="button"
          className="btn-ghost"
          onClick={handleRefresh}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}
        >
          <RefreshCw size={14} />
          <span>Refresh</span>
        </button>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => setExportOpen(true)}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}
        >
          <Download size={14} />
          <span>Export</span>
        </button>
        <button type="button" className="icon-btn" style={{ position: "relative" }}> <Bell size={16} /> </button>

        <div style={{ position: "relative" }} ref={profileRef}>
          <button type="button" className="btn-ghost" onClick={() => setOpen((s) => !s)}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <span style={{ display: "inline-flex", width: 28, height: 28, alignItems: "center", justifyContent: "center", borderRadius: 8, background: "var(--surface-2)", color: "var(--text)", fontSize: 12 }}>{initial}</span>
              <ChevronDown size={14} />
            </span>
          </button>
          {open ? (
            <div style={{ position: "absolute", right: 0, top: 44, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 8, minWidth: 180 }}>
              <div style={{ padding: 8, borderBottom: "1px solid var(--border)", marginBottom: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{profile?.name || "Admin"}</div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>{profile?.email || ""}</div>
              </div>
              <button type="button" className="btn-ghost" style={{ width: "100%" }} onClick={() => logout()}>
                <LogOut size={14} /> <span style={{ marginLeft: 8 }}>Sign out</span>
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default TopBar;
