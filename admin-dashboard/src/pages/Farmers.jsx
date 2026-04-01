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
        background: active ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
        color: active ? "#22c55e" : "#ef4444",
        border: `1px solid ${active ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
      }}
    >
      <span
        style={{
          width: 6, height: 6, borderRadius: "50%",
          background: active ? "#22c55e" : "#ef4444",
          boxShadow: active ? "0 0 5px #22c55e" : "none",
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
  ["#0f2e1a", "#22c55e"],
  ["#0f1e2e", "#60a5fa"],
  ["#1e1040", "#a78bfa"],
  ["#2e1a0a", "#f59e0b"],
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
      style={{ background: "#0f0f0f", borderColor: "#1a1a1a" }}>
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: iconBg, color: iconColor }}
      >
        <Icon size={16} strokeWidth={1.8} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[18px] font-bold tracking-tight leading-tight truncate"
          style={{ color: "#f0f0f0" }}>
          {value}
        </div>
        <div className="text-[10px] font-semibold uppercase tracking-widest mt-0.5"
          style={{ color: "#404040" }}>
          {label}
        </div>
        {sub && (
          <div className="text-[11px] mt-1 flex items-center gap-0.5 font-medium"
            style={{ color: trend === "up" ? "#22c55e" : trend === "down" ? "#ef4444" : "#555" }}>
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
    { icon: Wheat, label: "Crops", val: insight?.totals?.crops ?? insight?.total_crops ?? 0, color: "#f59e0b" },
    { icon: MessageSquare, label: "Sessions", val: insight?.totals?.sessions ?? insight?.total_sessions ?? convos.length, color: "#60a5fa" },
    { icon: Activity, label: "Queries", val: insight?.totals?.queries ?? "—", color: "#22c55e" },
    { icon: BarChart2, label: "Alerts", val: insight?.totals?.alerts ?? "—", color: "#a78bfa" },
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
          width: 420, background: "#0a0a0a",
          borderLeft: "1px solid #1c1c1c",
          zIndex: 50, display: "flex", flexDirection: "column",
          transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1)",
          transform: open ? "translateX(0)" : "translateX(100%)",
          overflowY: "auto",
        }}
      >
        {/* header */}
        <div style={{ padding: "18px 20px", borderBottom: "1px solid #181818", display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#f0f0f0", letterSpacing: "-0.2px" }}>
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
                background: "#161616", border: "1px solid #222",
                color: "#555", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <X size={13} />
            </button>
          </div>
        </div>

        {loading && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: "#333" }}>
            <Loader2 size={22} className="animate-spin" style={{ color: "#22c55e" }} />
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
                    style={{ background: "#111", border: "1px solid #1a1a1a", borderRadius: 10, padding: "10px 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}
                  >
                    <Ic size={13} style={{ color }} />
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#e0e0e0" }}>{val}</div>
                    <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.8px", color: "#3a3a3a" }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* profile */}
            <div>
              <SectionLabel>Profile</SectionLabel>
              <div style={{ border: "1px solid #181818", borderRadius: 10, overflow: "hidden", marginTop: 10 }}>
                {profileRows.map(([key, val], idx) => (
                  <div
                    key={key}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "9px 14px",
                      background: idx % 2 === 0 ? "#0d0d0d" : "#0f0f0f",
                      borderBottom: idx < profileRows.length - 1 ? "1px solid #141414" : "none",
                    }}
                  >
                    <span style={{ fontSize: 11, color: "#404040", fontWeight: 500 }}>{key}</span>
                    <span style={{ fontSize: 11.5, color: "#c0c0c0", fontWeight: 500 }}>{fmt(val)}</span>
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
                      style={{ background: "#111", border: "1px solid #1a1a1a", borderRadius: 8, padding: "8px 12px", display: "flex", alignItems: "center", gap: 10 }}
                    >
                      <MessageSquare size={12} style={{ color: "#60a5fa", flexShrink: 0 }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 11.5, color: "#bbb", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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
                    background: "rgba(34,197,94,0.08)", color: "#22c55e",
                    border: "1px solid rgba(34,197,94,0.2)",
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
    <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.2px", color: "#333" }}>
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
        .fk-tr:hover td { background: #0f0f0f !important; }
        .fk-tr:hover td:first-child { border-left: 2px solid #22c55e; padding-left: 10px !important; }
        .fk-tr-sel td { background: #0a130a !important; }
        .fk-tr-sel td:first-child { border-left: 2px solid #22c55e; padding-left: 10px !important; }
        .fk-tr td { transition: background 0.1s; }
        select option { background: #111; color: #e0e0e0; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #222; border-radius: 3px; }
        .fk-icn { transition: color 0.12s, background 0.12s; }
        .fk-icn:hover { background: #1a1a1a !important; }
      `}</style>

      <div className="flex flex-col gap-4 min-h-full">

        {/* ── HEADER ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 style={{ fontSize: 17, fontWeight: 700, color: "#f0f0f0", letterSpacing: "-0.3px", margin: 0 }}>
              Farmers
            </h1>
            {!loading && totalRecords > 0 && (
              <span style={{
                padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                background: "rgba(34,197,94,0.1)", color: "#22c55e",
                border: "1px solid rgba(34,197,94,0.2)",
              }}>
                {totalRecords} total
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
              style={{ background: "transparent", border: "1px solid #222", color: "#666", cursor: "pointer" }}
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
              style={{ background: "transparent", border: "1px solid #222", color: "#666", cursor: "pointer" }}
            >
              <Download size={12} /> Export
            </button>
            <button
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12.5px] font-bold"
              style={{ background: "#22c55e", color: "#040e04", border: "none", cursor: "pointer", boxShadow: "0 4px 14px rgba(34,197,94,0.2)" }}
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
            iconBg="rgba(34,197,94,0.12)"
            iconColor="#22c55e"
          />
          <StatCard
            icon={TrendingUp}
            label="New This Month"
            value={`+${newThisMonth}`}
            iconBg="rgba(96,165,250,0.12)"
            iconColor="#60a5fa"
            trend="up"
            sub="vs last month"
          />
          <StatCard
            icon={CheckCircle2}
            label="Active Ratio"
            value={rows.length ? `${Math.round((activeCount / rows.length) * 100)}%` : "—"}
            iconBg="rgba(167,139,250,0.12)"
            iconColor="#a78bfa"
          />
          <StatCard
            icon={BarChart2}
            label="Avg Land / Farmer"
            value={rows.length ? `${averageAcres.toFixed(1)} ac` : "—"}
            sub={`${inactiveCount} suspended`}
            iconBg="rgba(245,158,11,0.12)"
            iconColor="#f59e0b"
          />
        </div>

        {/* ── ANALYTICS BLOCKS ── */}
        <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-3">
          <div style={{ background: "#0b0b0b", border: "1px solid #1a1a1a", borderRadius: 12, padding: "12px 14px" }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "#404040" }}>
                Language Distribution
              </div>
              <div style={{ fontSize: 11, color: "#666" }}>
                {languageChartData.length} languages
              </div>
            </div>
            {languageChartData.length > 0 ? (
              <BarChart data={languageChartData} horizontal color="#22c55e" maxBars={6} />
            ) : (
              <div style={{ fontSize: 12, color: "#404040" }}>No language data available</div>
            )}
          </div>

          <div style={{ background: "#0b0b0b", border: "1px solid #1a1a1a", borderRadius: 12, padding: "12px 14px" }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "#404040" }}>
                Regional Spread
              </div>
              <div style={{ fontSize: 11, color: "#666" }}>
                Top states
              </div>
            </div>
            {stateChartData.length > 0 ? (
              <BarChart data={stateChartData} horizontal color="#60a5fa" maxBars={6} />
            ) : (
              <div style={{ fontSize: 12, color: "#404040" }}>No state data available</div>
            )}
          </div>

          <div style={{ background: "#0b0b0b", border: "1px solid #1a1a1a", borderRadius: 12, padding: "12px 14px" }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "#404040" }}>
                Active Split
              </div>
              <div style={{ fontSize: 11, color: "#666" }}>
                Current page
              </div>
            </div>
            <BarChart data={activeSplitData} horizontal color="#a78bfa" maxBars={2} />
          </div>
        </div>

        {/* ── FILTERS ── */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={13} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "#333", pointerEvents: "none" }} />
            <input
              style={{
                width: "100%", background: "#0c0c0c", border: "1px solid #1c1c1c",
                borderRadius: 8, color: "#e0e0e0", fontSize: 13,
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
                style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#444", cursor: "pointer", padding: 2 }}
              >
                <X size={12} />
              </button>
            )}
          </div>

          <select
            style={{
              background: "#0c0c0c", border: "1px solid #1c1c1c", borderRadius: 8,
              color: "#e0e0e0", fontSize: 13, padding: "8px 12px",
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
              background: "#141414", color: "#e0e0e0", border: "1px solid #242424",
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
        <div style={{ background: "#080808", border: "1px solid #161616", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: "#0d0d0d", borderBottom: "1px solid #181818" }}>
                {["#", "Name", "Phone", "Village", "District", "State", "Land (ac)", "Language", "Status", "Joined", "Actions"].map((h) => (
                  <th
                    key={h}
                    style={{ textAlign: "left", padding: "10px 14px", fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", color: "#323232", whiteSpace: "nowrap" }}
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
                    <div className="flex flex-col items-center justify-center gap-2.5 py-16" style={{ color: "#2e2e2e" }}>
                      <Loader2 size={22} className="animate-spin" style={{ color: "#22c55e" }} />
                      <span style={{ fontSize: 13 }}>Loading farmers…</span>
                    </div>
                  </td>
                </tr>
              )}

              {!loading && rows.length === 0 && !error && (
                <tr>
                  <td colSpan={11}>
                    <div className="flex flex-col items-center justify-center gap-2 py-16" style={{ color: "#2a2a2a" }}>
                      <Sprout size={28} />
                      <span style={{ fontSize: 13, color: "#404040" }}>No farmers found</span>
                      <span style={{ fontSize: 11, color: "#2a2a2a" }}>Try adjusting filters or search</span>
                    </div>
                  </td>
                </tr>
              )}

              {rows.map((r, i) => (
                <tr
                  key={r.id ?? i}
                  onClick={() => loadDetail(r)}
                  className={`fk-tr fk-row ${selected?.id === r.id ? "fk-tr-sel" : ""}`}
                  style={{ cursor: "pointer", borderBottom: "1px solid #111", animationDelay: `${i * 18}ms` }}
                >
                  {/* # */}
                  <td style={{ padding: "10px 14px", fontSize: 10, fontFamily: "monospace", color: "#2a2a2a", whiteSpace: "nowrap" }}>
                    {String((page - 1) * PER_PAGE + i + 1).padStart(3, "0")}
                  </td>

                  {/* name */}
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Avatar name={r.name} />
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: "#e0e0e0", lineHeight: 1.3 }}>
                          {fmt(r.name)}
                        </div>
                        {r.email && (
                          <div style={{ fontSize: 10, color: "#383838", marginTop: 1, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {r.email}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* phone */}
                  <td style={{ padding: "10px 14px", fontFamily: "monospace", fontSize: 11, color: "#555", whiteSpace: "nowrap" }}>
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
                  <td style={{ padding: "10px 14px", color: "#aaa", fontWeight: 500 }}>
                    {fmt(r.state ?? r.profile?.state)}
                  </td>

                  {/* land */}
                  <td style={{ padding: "10px 14px", fontFamily: "monospace", fontSize: 11.5, color: "#666" }}>
                    {fmtAcres(r.land_holding_acres ?? r.profile?.land_size_acres)}
                  </td>

                  {/* language */}
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{ padding: "2px 7px", borderRadius: 5, fontSize: 10.5, fontWeight: 500, background: "#131313", color: "#666", border: "1px solid #1c1c1c" }}>
                      {langLabel(r.language ?? r.profile?.language)}
                    </span>
                  </td>

                  {/* status */}
                  <td style={{ padding: "10px 14px" }}>
                    <StatusBadge active={r.is_active !== false} />
                  </td>

                  {/* joined */}
                  <td style={{ padding: "10px 14px", fontFamily: "monospace", fontSize: 11, color: "#404040", whiteSpace: "nowrap" }}>
                    {fmtDate(r.created_at)}
                  </td>

                  {/* actions */}
                  <td style={{ padding: "10px 14px" }} onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                      {[
                        { icon: Eye, color: "#60a5fa", title: "View", action: () => loadDetail(r) },
                        { icon: Edit2, color: "#a78bfa", title: r.is_active !== false ? "Suspend" : "Activate", action: () => updateStatus(r, r.is_active === false) },
                        { icon: Trash2, color: "#ef4444", title: "Deactivate", action: () => updateStatus(r, false) },
                      ].map(({ icon: Ic, color, title, action }) => (
                        <button
                          key={title}
                          title={title}
                          onClick={action}
                          className="fk-icn"
                          style={{
                            width: 26, height: 26, borderRadius: 6,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            background: "transparent", border: "none", color: "#383838", cursor: "pointer",
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = color; e.currentTarget.style.background = color + "18"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = "#383838"; e.currentTarget.style.background = "transparent"; }}
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
          <div style={{ fontSize: 11.5, color: "#333" }}>
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
                  background: page === n ? "#22c55e" : "transparent",
                  color: page === n ? "#040e04" : "#555",
                  borderColor: page === n ? "#22c55e" : "#1e1e1e",
                  transition: "all 0.12s",
                }}
              >
                {n}
              </button>
            ))}

            {totalPages > 5 && page < totalPages - 2 && (
              <>
                <span style={{ color: "#2a2a2a", padding: "0 2px" }}>…</span>
                <button
                  onClick={() => setPage(totalPages)}
                  style={{ width: 30, height: 30, borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer", background: "transparent", color: "#555", border: "1px solid #1e1e1e" }}
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
        background: "transparent", color: disabled ? "#252525" : "#555",
        border: `1px solid ${disabled ? "#161616" : "#1e1e1e"}`,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "all 0.12s",
      }}
    >
      {children}
    </button>
  );
}

export default Farmers;