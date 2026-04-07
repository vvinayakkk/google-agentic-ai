import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Eye, Edit2, Trash2, Plus, Search, ChevronLeft, ChevronRight,
  X, TrendingUp, Users, Sprout, CheckCircle2,
  RefreshCw, BarChart2, MessageSquare, ArrowUpRight,
  Loader2, AlertCircle, UserCheck, Download, Wheat, Activity,
  XCircle,
} from "lucide-react";
import { apiTry, withQuery, apiClient } from "../api/client";
import BarChart from "../components/charts/BarChart";

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
const fmt = (v) => (v == null || v === "" ? "—" : String(v));

const fmtDate = (v) => {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "2-digit",
    });
  } catch { return "—"; }
};

const fmtAcres = (v) =>
  v != null && v !== "" && !isNaN(parseFloat(v))
    ? `${parseFloat(v).toFixed(1)}`
    : "—";

const LANG_MAP = {
  en: "English", mr: "Marathi", hi: "Hindi", ta: "Tamil",
  te: "Telugu", gu: "Gujarati", kn: "Kannada", pa: "Punjabi",
  bn: "Bengali", or: "Odia",
};
const langLabel = (c) => LANG_MAP[c] || c || "—";

const STATES = [
  "All States", "Maharashtra", "Punjab", "Haryana", "Gujarat",
  "Rajasthan", "Uttar Pradesh", "Karnataka", "Tamil Nadu",
  "Andhra Pradesh", "West Bengal", "Bihar", "Madhya Pradesh",
  "Odisha", "Assam", "Jharkhand", "Chhattisgarh",
];

const PER_PAGE = 20;

/* ─────────────────────────────────────────────
   StatusBadge
───────────────────────────────────────────── */
function StatusBadge({ active }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "2px 8px",
        borderRadius: 20,
        fontSize: 10.5,
        fontWeight: 600,
        letterSpacing: "0.3px",
        background: active ? "var(--soft-subtle)" : "rgba(239,68,68,0.1)",
        color: active ? "var(--text)" : "#ef4444",
        border: `1px solid ${active ? "var(--soft-strong)" : "rgba(239,68,68,0.2)"}`,
      }}
    >
      <span
        style={{
          width: 6, height: 6, borderRadius: "50%",
          background: active ? "var(--text)" : "#ef4444",
          boxShadow: active ? "0 0 5px var(--text)" : "none",
          flexShrink: 0,
        }}
      />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

/* ─────────────────────────────────────────────
   Avatar
───────────────────────────────────────────── */
const AVATAR_COLORS = [
  ["#0f2e1a", "var(--text)"],
  ["#0f1e2e", "var(--muted)"],
  ["#1e1040", "var(--muted)"],
  ["#2e1a0a", "var(--muted)"],
  ["#2e0f1a", "#f43f5e"],
];

function Avatar({ name }) {
  const ch = (name ?? "?").charCodeAt(0);
  const [bg, fg] = AVATAR_COLORS[ch % AVATAR_COLORS.length];
  return (
    <div
      style={{
        width: 28, height: 28, borderRadius: "50%",
        background: bg, color: fg,
        border: `1px solid ${fg}30`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, fontWeight: 700, flexShrink: 0,
      }}
    >
      {(name ?? "?")[0].toUpperCase()}
    </div>
  );
}

/* ─────────────────────────────────────────────
   StatCard
───────────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, sub, trend, iconBg, iconColor }) {
  return (
    <div className="flex items-start gap-3 rounded-xl px-4 py-3 border transition-colors hover:border-[#252525]"
      style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}>
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: iconBg, color: iconColor }}
      >
        <Icon size={16} strokeWidth={1.8} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[18px] font-bold tracking-tight leading-tight truncate"
          style={{ color: "var(--text)" }}>
          {value}
        </div>
        <div className="text-[10px] font-semibold uppercase tracking-widest mt-0.5"
          style={{ color: "var(--faint)" }}>
          {label}
        </div>
        {sub && (
          <div className="text-[11px] mt-1 flex items-center gap-0.5 font-medium"
            style={{ color: trend === "up" ? "var(--text)" : trend === "down" ? "#ef4444" : "var(--muted)" }}>
            {trend === "up" && <ArrowUpRight size={11} />}
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Farmer Detail Drawer
───────────────────────────────────────────── */
function FarmerDrawer({ farmer, detail, onClose, onStatusChange }) {
  const open = Boolean(farmer);
  const p = detail?.profile ?? farmer ?? {};
  const insight = detail?.insight ?? {};
  const convos =
    detail?.conversations?.conversations ??
    (Array.isArray(detail?.conversations) ? detail.conversations : []);
  const loading = open && !detail;

  const profileRows = [
    ["Village", p.village ?? p.profile?.village],
    ["District", p.district ?? p.profile?.district],
    ["State", p.state ?? p.profile?.state],
    ["Pincode", p.pin_code ?? p.profile?.pin_code],
    ["Land Size", fmtAcres(p.land_size_acres ?? p.profile?.land_size_acres ?? p.land_holding_acres) !== "—"
      ? fmtAcres(p.land_size_acres ?? p.profile?.land_size_acres ?? p.land_holding_acres) + " acres" : "—"],
    ["Soil Type", p.soil_type ?? p.profile?.soil_type],
    ["Irrigation", p.irrigation_type ?? p.profile?.irrigation_type],
    ["Language", langLabel(p.language ?? p.profile?.language)],
    ["Email", p.email],
    ["Joined", fmtDate(p.created_at)],
  ];

  const quickStats = [
    { icon: Wheat, label: "Crops", val: insight?.totals?.crops ?? insight?.total_crops ?? 0, color: "var(--muted)" },
    { icon: MessageSquare, label: "Sessions", val: insight?.totals?.sessions ?? insight?.total_sessions ?? convos.length, color: "var(--muted)" },
    { icon: Activity, label: "Queries", val: insight?.totals?.queries ?? "—", color: "var(--text)" },
    { icon: BarChart2, label: "Alerts", val: insight?.totals?.alerts ?? "—", color: "var(--muted)" },
  ];

  return (
    <>
      {/* overlay */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
          zIndex: 40, transition: "opacity 0.2s",
          opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none",
        }}
      />

      {/* panel */}
      <div
        style={{
          position: "fixed", top: 0, right: 0, height: "100%",
          width: 420, background: "var(--surface)",
          borderLeft: "1px solid var(--border)",
          zIndex: 50, display: "flex", flexDirection: "column",
          transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1)",
          transform: open ? "translateX(0)" : "translateX(100%)",
          overflowY: "auto",
        }}
      >
        {/* header */}
        <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--border-soft)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.2px" }}>
              {fmt(farmer?.name)}
            </div>
            <div style={{ fontSize: 12, color: "#484848", marginTop: 2, fontFamily: "monospace" }}>
              {fmt(farmer?.phone)}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {farmer && <StatusBadge active={farmer.is_active !== false} />}
            <button
              onClick={onClose}
              style={{
                width: 28, height: 28, borderRadius: 7,
                background: "var(--surface-2)", border: "1px solid var(--border)",
                color: "var(--muted)", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <X size={13} />
            </button>
          </div>
        </div>

        {loading && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: "var(--faint)" }}>
            <Loader2 size={22} className="animate-spin" style={{ color: "var(--text)" }} />
            <span style={{ fontSize: 13 }}>Loading farmer details…</span>
          </div>
        )}

        {!loading && detail && (
          <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px", display: "flex", flexDirection: "column", gap: 20 }}>

            {/* quick stats */}
            <div>
              <SectionLabel>Overview</SectionLabel>
              <div className="grid grid-cols-4 gap-2 mt-2.5">
                {quickStats.map(({ icon: Ic, label, val, color }) => (
                  <div
                    key={label}
                    style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}
                  >
                    <Ic size={13} style={{ color }} />
                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>{val}</div>
                    <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.8px", color: "#3a3a3a" }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* profile */}
            <div>
              <SectionLabel>Profile</SectionLabel>
              <div style={{ border: "1px solid var(--border-soft)", borderRadius: 10, overflow: "hidden", marginTop: 10 }}>
                {profileRows.map(([key, val], idx) => (
                  <div
                    key={key}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "9px 14px",
                      background: idx % 2 === 0 ? "var(--surface)" : "var(--surface-2)",
                      borderBottom: idx < profileRows.length - 1 ? "1px solid var(--surface-2)" : "none",
                    }}
                  >
                    <span style={{ fontSize: 11, color: "var(--faint)", fontWeight: 500 }}>{key}</span>
                    <span style={{ fontSize: 11.5, color: "var(--muted)", fontWeight: 500 }}>{fmt(val)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* sessions */}
            {convos.length > 0 && (
              <div>
                <SectionLabel>Recent Sessions</SectionLabel>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
                  {convos.slice(0, 6).map((c, i) => (
                    <div
                      key={c.id ?? i}
                      style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", display: "flex", alignItems: "center", gap: 10 }}
                    >
                      <MessageSquare size={12} style={{ color: "var(--muted)", flexShrink: 0 }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 11.5, color: "var(--muted)", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {c.session_id ?? c.id ?? `Session ${i + 1}`}
                        </div>
                        <div style={{ fontSize: 10, color: "#3a3a3a", marginTop: 2 }}>
                          {fmtDate(c.last_message_at ?? c.updated_at ?? c.created_at)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* actions */}
            <div>
              <SectionLabel>Actions</SectionLabel>
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button
                  onClick={() => onStatusChange(farmer, true)}
                  style={{
                    flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    padding: "8px 0", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
                    background: "rgba(34,197,94,0.08)", color: "var(--text)",
                    border: "1px solid var(--soft-strong)",
                  }}
                >
                  <UserCheck size={13} /> Activate
                </button>
                <button
                  onClick={() => onStatusChange(farmer, false)}
                  style={{
                    flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    padding: "8px 0", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
                    background: "rgba(239,68,68,0.08)", color: "#ef4444",
                    border: "1px solid rgba(239,68,68,0.2)",
                  }}
                >
                  <XCircle size={13} /> Suspend
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.2px", color: "var(--faint)" }}>
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main Page
───────────────────────────────────────────── */
const Farmers = () => {
  const [rows, setRows]                   = useState([]);
  const [page, setPage]                   = useState(1);
  const [totalRecords, setTotalRecords]   = useState(0);
  const [searchInput, setSearchInput]     = useState("");
  const [search, setSearch]               = useState("");
  const [stateFilter, setStateFilter]     = useState("");
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState(null);
  const [selected, setSelected]           = useState(null);
  const [detail, setDetail]               = useState(null);
  const [platformStats, setPlatformStats] = useState(null);

  /* load list */
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiTry([
        withQuery("/api/v1/admin/farmers", {
          page,
          per_page: PER_PAGE,
          search: search || undefined,
          state: stateFilter || undefined,
        }),
        withQuery("/api/v1/farmers/admin/", { page, per_page: PER_PAGE }),
      ]);
      const items = data.items ?? data.farmers ?? (Array.isArray(data) ? data : []);
      setRows(Array.isArray(items) ? items : []);
      setTotalRecords(data.total ?? data.count ?? items.length);
    } catch (err) {
      setError(err.message ?? "Failed to load farmers");
    } finally {
      setLoading(false);
    }
  }, [page, search, stateFilter]);

  /* platform-level stats (for stat cards) */
  const loadStats = useCallback(async () => {
    try {
      const data = await apiTry([
        "/api/v1/analytics/overview",
        "/api/v1/admin/stats",
      ]).catch(() => null);
      if (data) setPlatformStats(data);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadStats(); }, [loadStats]);

  /* load farmer detail */
  const loadDetail = useCallback(async (farmer) => {
    setSelected(farmer);
    setDetail(null);
    try {
      const [profile, conversations, insight] = await Promise.all([
        apiTry([
          `/api/v1/admin/farmers/${farmer.id}`,
          `/api/v1/farmers/admin/${farmer.id}`,
        ]).catch(() => farmer),
        apiTry([
          `/api/v1/admin/farmers/${farmer.id}/conversations`,
          `/api/v1/agent/conversations/${farmer.id}`,
        ]).catch(() => ({ conversations: [] })),
        apiTry([
          `/api/v1/analytics/farmer/${farmer.id}/summary?days=30`,
          `/api/v1/analytics/farmer/${farmer.id}/summary`,
        ]).catch(() => ({})),
      ]);
      setDetail({ profile, conversations, insight });
    } catch {
      setDetail({ profile: farmer, conversations: [], insight: {} });
    }
  }, []);

  /* status update */
  const updateStatus = useCallback(async (farmer, isActive) => {
    try {
      await apiClient(`/api/v1/admin/farmers/${farmer.id}/status`, {
        method: "PUT",
        body: JSON.stringify({ is_active: isActive }),
      });
      load();
      if (selected?.id === farmer.id) {
        setSelected((s) => s ? { ...s, is_active: isActive } : s);
      }
    } catch { /* add toast here if you have one */ }
  }, [load, selected]);

  /* apply search */
  const applySearch = useCallback(() => {
    setSearch(searchInput);
    setPage(1);
  }, [searchInput]);

  /* derived stats from current page rows */
  const activeCount = rows.filter((r) => r.is_active !== false).length;
  const totalAcres  = rows.reduce(
    (acc, r) => acc + parseFloat(r.land_holding_acres ?? r.profile?.land_size_acres ?? 0), 0,
  );
  const inactiveCount = Math.max(rows.length - activeCount, 0);
  const averageAcres = rows.length ? (totalAcres / rows.length) : 0;
  const langDist = rows.reduce((acc, r) => {
    const l = r.language ?? r.profile?.language ?? "?";
    acc[l] = (acc[l] ?? 0) + 1;
    return acc;
  }, {});
  const stateDist = rows.reduce((acc, r) => {
    const s = r.state ?? r.profile?.state ?? "Unknown";
    acc[s] = (acc[s] ?? 0) + 1;
    return acc;
  }, {});

  const languageChartData = useMemo(
    () => Object.entries(langDist)
      .map(([language, count]) => ({ label: langLabel(language), value: count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6),
    [langDist],
  );

  const stateChartData = useMemo(
    () => Object.entries(stateDist)
      .map(([state, count]) => ({ label: state, value: count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6),
    [stateDist],
  );

  const activeSplitData = useMemo(() => {
    const active = rows.filter((r) => r.is_active !== false).length;
    const inactive = Math.max(rows.length - active, 0);
    return [
      { label: "Active", value: active },
      { label: "Inactive", value: inactive },
    ];
  }, [rows]);

  const newThisMonth = platformStats?.new_farmers_this_month ??
    rows.filter((r) => {
      try {
        const d = new Date(r.created_at);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      } catch { return false; }
    }).length;

  const totalPages = Math.max(1, Math.ceil(totalRecords / PER_PAGE));

  const pageNumbers = useMemo(() => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 3) return [1, 2, 3, 4, 5];
    if (page >= totalPages - 2) return [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [page - 2, page - 1, page, page + 1, page + 2];
  }, [page, totalPages]);

  /* ────────────────────────────────────────── */
  return (
    <>
      <style>{`
        @keyframes fkIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fk-row { animation: fkIn 0.18s ease both; }
        .fk-tr:hover td { background: var(--surface-2) !important; }
        .fk-tr:hover td:first-child { border-left: 2px solid var(--text); padding-left: 10px !important; }
        .fk-tr-sel td { background: #0a130a !important; }
        .fk-tr-sel td:first-child { border-left: 2px solid var(--text); padding-left: 10px !important; }
        .fk-tr td { transition: background 0.1s; }
        select option { background: var(--surface-2); color: var(--text); }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
        .fk-icn { transition: color 0.12s, background 0.12s; }
        .fk-icn:hover { background: var(--border) !important; }
      `}</style>

      <div className="flex flex-col gap-4 min-h-full">

        {/* ── HEADER ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.3px", margin: 0 }}>
              Farmers
            </h1>
            {!loading && totalRecords > 0 && (
              <span style={{
                padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                background: "var(--soft-subtle)", color: "var(--text)",
                border: "1px solid var(--soft-strong)",
              }}>
                {totalRecords} total
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
              style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--muted)", cursor: "pointer" }}
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
              style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--muted)", cursor: "pointer" }}
            >
              <Download size={12} /> Export
            </button>
            <button
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12.5px] font-bold"
              style={{ background: "var(--text)", color: "#040e04", border: "none", cursor: "pointer", boxShadow: "0 4px 14px var(--soft-strong)" }}
            >
              <Plus size={14} strokeWidth={2.8} /> Add Farmer
            </button>
          </div>
        </div>

        {/* ── STAT CARDS ── */}
        <div className="grid grid-cols-4 gap-2.5">
          <StatCard
            icon={Users}
            label="Total Acreage Managed"
            value={`${totalAcres.toLocaleString("en-IN", { maximumFractionDigits: 1 })} ac`}
            iconBg="var(--soft-subtle)"
            iconColor="var(--text)"
          />
          <StatCard
            icon={TrendingUp}
            label="New This Month"
            value={`+${newThisMonth}`}
            iconBg="var(--soft-subtle)"
            iconColor="var(--muted)"
            trend="up"
            sub="vs last month"
          />
          <StatCard
            icon={CheckCircle2}
            label="Active Ratio"
            value={rows.length ? `${Math.round((activeCount / rows.length) * 100)}%` : "—"}
            iconBg="var(--soft-subtle)"
            iconColor="var(--muted)"
          />
          <StatCard
            icon={BarChart2}
            label="Avg Land / Farmer"
            value={rows.length ? `${averageAcres.toFixed(1)} ac` : "—"}
            sub={`${inactiveCount} suspended`}
            iconBg="var(--soft-subtle)"
            iconColor="var(--muted)"
          />
        </div>

        {/* ── ANALYTICS BLOCKS ── */}
        <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-3">
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 14px" }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "var(--faint)" }}>
                Language Distribution
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>
                {languageChartData.length} languages
              </div>
            </div>
            {languageChartData.length > 0 ? (
              <BarChart data={languageChartData} horizontal color="var(--text)" maxBars={6} />
            ) : (
              <div style={{ fontSize: 12, color: "var(--faint)" }}>No language data available</div>
            )}
          </div>

          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 14px" }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "var(--faint)" }}>
                Regional Spread
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>
                Top states
              </div>
            </div>
            {stateChartData.length > 0 ? (
              <BarChart data={stateChartData} horizontal color="var(--muted)" maxBars={6} />
            ) : (
              <div style={{ fontSize: 12, color: "var(--faint)" }}>No state data available</div>
            )}
          </div>

          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 14px" }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "var(--faint)" }}>
                Active Split
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>
                Current page
              </div>
            </div>
            <BarChart data={activeSplitData} horizontal color="var(--muted)" maxBars={2} />
          </div>
        </div>

        {/* ── FILTERS ── */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={13} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--faint)", pointerEvents: "none" }} />
            <input
              style={{
                width: "100%", background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: 8, color: "var(--text)", fontSize: 13,
                padding: "8px 34px 8px 32px", outline: "none", boxSizing: "border-box",
              }}
              placeholder="Search name, phone, village…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applySearch()}
            />
            {searchInput && (
              <button
                onClick={() => { setSearchInput(""); setSearch(""); setPage(1); }}
                style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--faint)", cursor: "pointer", padding: 2 }}
              >
                <X size={12} />
              </button>
            )}
          </div>

          <select
            style={{
              background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8,
              color: "var(--text)", fontSize: 13, padding: "8px 12px",
              outline: "none", cursor: "pointer", minWidth: 150,
            }}
            value={stateFilter || "All States"}
            onChange={(e) => {
              setStateFilter(e.target.value === "All States" ? "" : e.target.value);
              setPage(1);
            }}
          >
            {STATES.map((s) => <option key={s}>{s}</option>)}
          </select>

          <button
            onClick={applySearch}
            style={{
              padding: "8px 16px", borderRadius: 8, fontSize: 12.5, fontWeight: 600,
              background: "var(--surface-2)", color: "var(--text)", border: "1px solid var(--border)",
              cursor: "pointer", whiteSpace: "nowrap",
            }}
          >
            Apply
          </button>
        </div>

        {/* ── ERROR ── */}
        {error && (
          <div
            className="flex items-center gap-2.5 rounded-xl text-[13px]"
            style={{ padding: "10px 16px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", color: "#ef4444" }}
          >
            <AlertCircle size={14} style={{ flexShrink: 0 }} />
            <span>{error}</span>
            <button
              onClick={load}
              style={{ marginLeft: "auto", fontSize: 11, padding: "2px 10px", borderRadius: 6, border: "1px solid rgba(239,68,68,0.3)", background: "none", color: "#ef4444", cursor: "pointer" }}
            >
              Retry
            </button>
          </div>
        )}

        {/* ── TABLE ── */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--surface-2)", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: "var(--surface)", borderBottom: "1px solid var(--border-soft)" }}>
                {["#", "Name", "Phone", "Village", "District", "State", "Land (ac)", "Language", "Status", "Joined", "Actions"].map((h) => (
                  <th
                    key={h}
                    style={{ textAlign: "left", padding: "10px 14px", fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", color: "var(--faint)", whiteSpace: "nowrap" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && rows.length === 0 && (
                <tr>
                  <td colSpan={11}>
                    <div className="flex flex-col items-center justify-center gap-2.5 py-16" style={{ color: "var(--faint)" }}>
                      <Loader2 size={22} className="animate-spin" style={{ color: "var(--text)" }} />
                      <span style={{ fontSize: 13 }}>Loading farmers…</span>
                    </div>
                  </td>
                </tr>
              )}

              {!loading && rows.length === 0 && !error && (
                <tr>
                  <td colSpan={11}>
                    <div className="flex flex-col items-center justify-center gap-2 py-16" style={{ color: "var(--faint)" }}>
                      <Sprout size={28} />
                      <span style={{ fontSize: 13, color: "var(--faint)" }}>No farmers found</span>
                      <span style={{ fontSize: 11, color: "var(--faint)" }}>Try adjusting filters or search</span>
                    </div>
                  </td>
                </tr>
              )}

              {rows.map((r, i) => (
                <tr
                  key={r.id ?? i}
                  onClick={() => loadDetail(r)}
                  className={`fk-tr fk-row ${selected?.id === r.id ? "fk-tr-sel" : ""}`}
                  style={{ cursor: "pointer", borderBottom: "1px solid var(--surface-2)", animationDelay: `${i * 18}ms` }}
                >
                  {/* # */}
                  <td style={{ padding: "10px 14px", fontSize: 10, fontFamily: "monospace", color: "var(--faint)", whiteSpace: "nowrap" }}>
                    {String((page - 1) * PER_PAGE + i + 1).padStart(3, "0")}
                  </td>

                  {/* name */}
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Avatar name={r.name} />
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text)", lineHeight: 1.3 }}>
                          {fmt(r.name)}
                        </div>
                        {r.email && (
                          <div style={{ fontSize: 10, color: "var(--faint)", marginTop: 1, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {r.email}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* phone */}
                  <td style={{ padding: "10px 14px", fontFamily: "monospace", fontSize: 11, color: "var(--muted)", whiteSpace: "nowrap" }}>
                    {fmt(r.phone)}
                  </td>

                  {/* village */}
                  <td style={{ padding: "10px 14px", color: "#777" }}>
                    {fmt(r.village ?? r.profile?.village)}
                  </td>

                  {/* district */}
                  <td style={{ padding: "10px 14px", color: "#777" }}>
                    {fmt(r.district ?? r.profile?.district)}
                  </td>

                  {/* state */}
                  <td style={{ padding: "10px 14px", color: "var(--muted)", fontWeight: 500 }}>
                    {fmt(r.state ?? r.profile?.state)}
                  </td>

                  {/* land */}
                  <td style={{ padding: "10px 14px", fontFamily: "monospace", fontSize: 11.5, color: "var(--muted)" }}>
                    {fmtAcres(r.land_holding_acres ?? r.profile?.land_size_acres)}
                  </td>

                  {/* language */}
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{ padding: "2px 7px", borderRadius: 5, fontSize: 10.5, fontWeight: 500, background: "#131313", color: "var(--muted)", border: "1px solid var(--border)" }}>
                      {langLabel(r.language ?? r.profile?.language)}
                    </span>
                  </td>

                  {/* status */}
                  <td style={{ padding: "10px 14px" }}>
                    <StatusBadge active={r.is_active !== false} />
                  </td>

                  {/* joined */}
                  <td style={{ padding: "10px 14px", fontFamily: "monospace", fontSize: 11, color: "var(--faint)", whiteSpace: "nowrap" }}>
                    {fmtDate(r.created_at)}
                  </td>

                  {/* actions */}
                  <td style={{ padding: "10px 14px" }} onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                      {[
                        { icon: Eye, color: "var(--muted)", hoverBg: "var(--soft-subtle)", title: "View", action: () => loadDetail(r) },
                        { icon: Edit2, color: "var(--muted)", hoverBg: "var(--soft-subtle)", title: r.is_active !== false ? "Suspend" : "Activate", action: () => updateStatus(r, r.is_active === false) },
                        { icon: Trash2, color: "#ef4444", hoverBg: "rgba(239,68,68,0.12)", title: "Deactivate", action: () => updateStatus(r, false) },
                      ].map(({ icon: Ic, color, hoverBg, title, action }) => (
                        <button
                          key={title}
                          title={title}
                          onClick={action}
                          className="fk-icn"
                          style={{
                            width: 26, height: 26, borderRadius: 6,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            background: "transparent", border: "none", color: "var(--faint)", cursor: "pointer",
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = color; e.currentTarget.style.background = hoverBg; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = "var(--faint)"; e.currentTarget.style.background = "transparent"; }}
                        >
                          <Ic size={12} />
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── PAGINATION ── */}
        <div className="flex items-center justify-between">
          <div style={{ fontSize: 11.5, color: "var(--faint)" }}>
            {rows.length > 0
              ? `Showing ${(page - 1) * PER_PAGE + 1}–${Math.min(page * PER_PAGE, totalRecords)} of ${totalRecords} records`
              : "No records"}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <PagBtn disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              <ChevronLeft size={13} /> Prev
            </PagBtn>

            {pageNumbers.map((n) => (
              <button
                key={n}
                onClick={() => setPage(n)}
                style={{
                  width: 30, height: 30, borderRadius: 7, fontSize: 12, fontWeight: 600,
                  cursor: "pointer", border: "1px solid",
                  background: page === n ? "var(--text)" : "transparent",
                  color: page === n ? "#040e04" : "var(--muted)",
                  borderColor: page === n ? "var(--text)" : "var(--border)",
                  transition: "all 0.12s",
                }}
              >
                {n}
              </button>
            ))}

            {totalPages > 5 && page < totalPages - 2 && (
              <>
                <span style={{ color: "var(--faint)", padding: "0 2px" }}>…</span>
                <button
                  onClick={() => setPage(totalPages)}
                  style={{ width: 30, height: 30, borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer", background: "transparent", color: "var(--muted)", border: "1px solid var(--border)" }}
                >
                  {totalPages}
                </button>
              </>
            )}

            <PagBtn disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
              Next <ChevronRight size={13} />
            </PagBtn>
          </div>
        </div>
      </div>

      {/* ── DRAWER ── */}
      <FarmerDrawer
        farmer={selected}
        detail={detail}
        onClose={() => { setSelected(null); setDetail(null); }}
        onStatusChange={updateStatus}
      />
    </>
  );
};

function PagBtn({ children, disabled, onClick }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 3,
        padding: "5px 10px", borderRadius: 7, fontSize: 12, fontWeight: 500,
        background: "transparent", color: disabled ? "#252525" : "var(--muted)",
        border: `1px solid ${disabled ? "var(--surface-2)" : "var(--border)"}`,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "all 0.12s",
      }}
    >
      {children}
    </button>
  );
}

export default Farmers;