import { useCallback, useEffect, useState, useRef } from "react";
import {
  Play, Plus, RefreshCw, Download, Shield, Settings, Database,
  Users, FileText, AlertTriangle, CheckCircle, XCircle, Clock,
  Activity, Zap, Server, Cpu, MemoryStick, Globe, ChevronRight,
  ToggleLeft, ToggleRight, Search, MoreVertical, Eye, EyeOff, Trash2,
  Edit3, UserPlus, Key, Lock, Unlock, TrendingUp, AlertCircle,
  Terminal, Upload, Power, Wifi
} from "lucide-react";
import { SYSTEM_TABS } from "../utils/constants";
import { apiTry, apiClient, healthChecks } from "../api/client";
import DataTable from "../components/ui/DataTable";

/* ─── helpers ─────────────────────────────────────────────────────── */

const ENV_COLORS = {
  PRODUCTION: { bg: "rgba(239,68,68,0.15)", border: "rgba(239,68,68,0.35)", text: "#ef4444" },
  STAGING:    { bg: "rgba(245,158,11,0.15)", border: "rgba(245,158,11,0.35)", text: "var(--muted)" },
  DEV:        { bg: "rgba(99,102,241,0.15)",  border: "rgba(99,102,241,0.35)",  text: "#818cf8" },
};

const STATUS_DOT = { SUCCESS: "var(--text)", TIMEOUT: "#ef4444", RUNNING: "var(--muted)", FAILED: "#ef4444", PENDING: "var(--muted)" };

const RolePill = ({ role }) => {
  const map = {
    super_admin: { bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.3)", text: "#f87171", label: "ROOT" },
    admin:       { bg: "var(--soft-subtle)", border: "rgba(245,158,11,0.3)", text: "var(--muted)", label: "ADMIN" },
    agent:       { bg: "rgba(99,102,241,0.12)", border: "rgba(99,102,241,0.3)", text: "#a5b4fc", label: "AGENT" },
  };
  const s = map[role] || map.admin;
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, letterSpacing: "0.08em",
      padding: "2px 6px", borderRadius: 4,
      background: s.bg, border: `1px solid ${s.border}`, color: s.text,
    }}>{s.label}</span>
  );
};

const StatBox = ({ label, value, sub, accent }) => (
  <div style={{ background: "var(--soft-subtle)", border: "1px solid var(--soft-strong)", borderRadius: 8, padding: "12px 14px" }}>
    <div style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: 22, fontWeight: 700, color: accent || "var(--text)", lineHeight: 1 }}>{value}</div>
    {sub && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>{sub}</div>}
  </div>
);

const ProgressBar = ({ label, value, max, color }) => {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: color || "var(--text)" }}>{pct}%</span>
      </div>
      <div style={{ height: 4, background: "var(--soft)", borderRadius: 99 }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color || "var(--text)", borderRadius: 99, transition: "width 0.6s ease" }} />
      </div>
    </div>
  );
};

/* ─── feature flags tab ─────────────────────────────────────────────── */

const FeatureFlagsTab = ({ flags, config, onSave, onRefresh }) => {
  const [localFlags, setLocalFlags] = useState(flags);
  const [showCreate, setShowCreate] = useState(false);
  const [newFlag, setNewFlag] = useState({ key: "", description: "", env: "PRODUCTION" });
  const [admins, setAdmins] = useState([]);
  const [health, setHealth] = useState({ cpu: 24.2, memory_used: 4.1, memory_total: 16, api_uptime: 99.998, db_latency: 12 });
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  const [saving, setSaving] = useState(null);

  useEffect(() => { setLocalFlags(flags); }, [flags]);

  useEffect(() => {
    setLoadingAdmins(true);
    apiTry(["/api/v1/admin/admins"])
      .then(d => setAdmins((d.items || []).slice(0, 3)))
      .catch(() => setAdmins([]))
      .finally(() => setLoadingAdmins(false));
    apiTry(["/api/v1/admin/stats"])
      .then(d => { if (d) setHealth(prev => ({ ...prev, ...d })); })
      .catch(() => {});
  }, []);

  const toggleFlag = async (key) => {
    const next = { ...localFlags, [key]: !localFlags[key] };
    setLocalFlags(next);
    setSaving(key);
    try {
      await apiClient("/api/v1/admin/config/feature-flags", { method: "PUT", body: JSON.stringify({ flags: next }) });
    } catch {}
    setSaving(null);
  };

  const addFlag = async () => {
    if (!newFlag.key.trim()) return;
    const next = { ...localFlags, [newFlag.key.toUpperCase()]: false };
    setLocalFlags(next);
    setShowCreate(false);
    setNewFlag({ key: "", description: "", env: "PRODUCTION" });
    try {
      await apiClient("/api/v1/admin/config/feature-flags", { method: "PUT", body: JSON.stringify({ flags: next }) });
    } catch {}
  };

  const FLAG_META = {
    BETA_AGRI_GPT_INTEGRATION: { desc: "Enables AI-driven crop advisory chatbot for specific user cohorts.", env: "PRODUCTION", id: "ff_8291_gpt" },
    HIGH_RES_SAT_LAYERS:       { desc: "Provides sub-meter satellite imagery in Geo Explorer dashboard.", env: "STAGING",    id: "ff_0042_sat" },
    DIRECT_SUBSIDY_PAYOUTS:    { desc: "Automated settlement engine for government direct benefit transfers.", env: "PRODUCTION", id: "ff_9912_dbpt", critical: true },
    MARKET_YARD_TRACKING_V2:   { desc: "Real-time occupancy tracking for localized grain market yards.", env: "PRODUCTION", id: "ff_1204_mktv2" },
  };

  const flagEntries = Object.entries(localFlags);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 16 }}>
      {/* main flags column */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {/* header row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Active Feature Flags</span>
            <span style={{ background: "var(--soft-subtle)", border: "1px solid var(--soft-strong)", color: "var(--text)", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4 }}>
              {flagEntries.filter(([, v]) => v).length} ACTIVE
            </span>
          </div>
          <button
            onClick={() => setShowCreate(!showCreate)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 6, background: "var(--app-shell-gradient)", color: "var(--text)", fontSize: 12, fontWeight: 700, border: "1px solid var(--soft-strong)", cursor: "pointer" }}>
            <Plus size={13} /> CREATE NEW FLAG
          </button>
        </div>

        {/* create new flag form */}
        {showCreate && (
          <div style={{ background: "rgba(34,197,94,0.05)", border: "1px solid var(--soft-strong)", borderRadius: 10, padding: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, alignItems: "end" }}>
              <div>
                <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 4 }}>FLAG KEY</div>
                <input className="field" placeholder="FEATURE_KEY_NAME" value={newFlag.key}
                  onChange={e => setNewFlag(p => ({ ...p, key: e.target.value.toUpperCase().replace(/\s/g, "_") }))}
                  style={{ fontFamily: "monospace", fontSize: 12 }} />
              </div>
              <div>
                <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 4 }}>ENVIRONMENT</div>
                <select className="field" value={newFlag.env} onChange={e => setNewFlag(p => ({ ...p, env: e.target.value }))}>
                  {["PRODUCTION", "STAGING", "DEV"].map(e => <option key={e}>{e}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={addFlag} style={{ padding: "8px 16px", background: "var(--app-shell-gradient)", color: "var(--text)", border: "1px solid var(--soft-strong)", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Add</button>
                <button onClick={() => setShowCreate(false)} style={{ padding: "8px 12px", background: "var(--soft-strong)", color: "var(--muted)", border: "1px solid var(--soft-strong)", borderRadius: 6, fontSize: 12, cursor: "pointer" }}>✕</button>
              </div>
            </div>
          </div>
        )}

        {/* flag cards */}
        {flagEntries.map(([key, enabled]) => {
          const meta = FLAG_META[key] || { desc: "Custom feature flag.", env: "DEV", id: `ff_${key.slice(0,8).toLowerCase()}` };
          const envStyle = ENV_COLORS[meta.env] || ENV_COLORS.DEV;
          const isSaving = saving === key;
          return (
            <div key={key} style={{
              background: "var(--soft-subtle)",
              border: `1px solid ${enabled ? "var(--soft-strong)" : "var(--soft-strong)"}`,
              borderRadius: 10, padding: "14px 16px",
              display: "flex", alignItems: "flex-start", gap: 14,
              transition: "border-color 0.2s",
            }}>
              {/* icon */}
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--soft)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                {meta.critical ? <AlertTriangle size={14} color="var(--muted)" /> : <Zap size={14} color={enabled ? "var(--text)" : "var(--muted)"} />}
              </div>
              {/* content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", fontFamily: "monospace", letterSpacing: "0.02em" }}>{key}</span>
                  {meta.critical && (
                    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", padding: "2px 6px", borderRadius: 4, background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.35)", color: "#f87171" }}>CRITICAL_SYSTEM</span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8, lineHeight: 1.5 }}>{meta.desc}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 9, fontWeight: 600, padding: "2px 7px", borderRadius: 4, background: envStyle.bg, border: `1px solid ${envStyle.border}`, color: envStyle.text }}>ENV: {meta.env}</span>
                  <span style={{ fontSize: 10, color: "var(--faint)", fontFamily: "monospace" }}>ID: {meta.id}</span>
                </div>
              </div>
              {/* toggle */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 10, color: enabled ? "var(--text)" : "var(--muted)" }}>{enabled ? "ON" : "OFF"}</span>
                  <button
                    onClick={() => toggleFlag(key)}
                    style={{ position: "relative", width: 40, height: 22, borderRadius: 99, border: "none", cursor: "pointer",
                      background: enabled ? "var(--soft)" : "var(--soft-subtle)",
                      transition: "background 0.2s" }}
                    disabled={isSaving}>
                    <div style={{
                      position: "absolute", top: 3, left: enabled ? 20 : 3,
                      width: 16, height: 16, borderRadius: "50%",
                      background: enabled ? "var(--accent)" : "var(--faint)",
                      transition: "left 0.2s, background 0.2s",
                      boxShadow: enabled ? "0 0 0 2px rgba(34,197,94,0.15)" : "none",
                    }} />
                  </button>
                </div>
                {isSaving && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--muted)", animation: "pulse 1s infinite" }} />}
              </div>
            </div>
          );
        })}

        {flagEntries.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)", fontSize: 13 }}>
            No feature flags configured
          </div>
        )}
      </div>

      {/* right sidebar */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {/* admin users widget */}
        <div style={{ background: "var(--soft-subtle)", border: "1px solid var(--soft-strong)", borderRadius: 10, overflow: "hidden" }}>
          <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--soft)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Admin Users</span>
            <Users size={13} color="var(--muted)" />
          </div>
          <div style={{ padding: "4px 0" }}>
            {loadingAdmins ? (
              <div style={{ padding: "20px 14px", textAlign: "center", color: "var(--muted)", fontSize: 12 }}>Loading...</div>
            ) : admins.length > 0 ? admins.map((u, i) => (
              <div key={u.id || i} style={{ padding: "10px 14px", borderBottom: i < admins.length - 1 ? "1px solid var(--soft)" : "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 3 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{u.name || "Admin"}</span>
                  <RolePill role={u.role} />
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>{u.email || ""}</div>
                {u.created_at && <div style={{ fontSize: 10, color: "var(--faint)", marginTop: 2 }}>CREATED: {new Date(u.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase()}</div>}
              </div>
            )) : (
              <div style={{ padding: "14px", textAlign: "center", color: "var(--muted)", fontSize: 12 }}>No admin users</div>
            )}
          </div>
          <div style={{ padding: "10px 14px", borderTop: "1px solid var(--soft)" }}>
            <button style={{ width: "100%", padding: "7px 0", background: "var(--soft)", border: "1px solid var(--soft-strong)", borderRadius: 6, color: "var(--muted)", fontSize: 11, cursor: "pointer", letterSpacing: "0.05em" }}>
              VIEW ALL USERS →
            </button>
          </div>
        </div>

        {/* system health widget */}
        <div style={{ background: "var(--soft-subtle)", border: "1px solid var(--soft-strong)", borderRadius: 10, padding: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <span style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>System Health</span>
            <Activity size={13} color="var(--text)" />
          </div>
          <ProgressBar label="CPU Load (Core-0)" value={health.cpu || 24.2} max={100} color="var(--text)" />
          <ProgressBar label="Memory Usage" value={health.memory_used || 4.1} max={health.memory_total || 16} color="#3b82f6" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 4 }}>
            <StatBox label="API Uptime" value={`${(health.api_uptime || 99.998).toFixed(3)}%`} accent="var(--text)" />
            <StatBox label="DB Latency" value={`${health.db_latency || 12}ms`} accent="var(--muted)" />
          </div>
        </div>

      </div>
    </div>
  );
};

/* ─── app config tab ─────────────────────────────────────────────────── */

const CONFIG_GROUPS = {
  "Security & Auth": {
    icon: Shield,
    color: "var(--muted)",
    accent: "var(--soft-subtle)",
    border: "rgba(245,158,11,0.2)",
    keys: ["jwt_secret","jwt_expiry","refresh_token_expiry","admin_secret","api_key","auth_secret"],
  },
  "Database": {
    icon: Database,
    color: "var(--muted)",
    accent: "rgba(96,165,250,0.1)",
    border: "rgba(96,165,250,0.2)",
    keys: ["mongo_uri","mongodb_url","redis_url","redis_host","qdrant_url","db_name","database_url"],
  },
  "AI & External APIs": {
    icon: Zap,
    color: "var(--muted)",
    accent: "rgba(167,139,250,0.1)",
    border: "rgba(167,139,250,0.2)",
    keys: ["gemini_api_key","groq_api_key","sarvam_api_key","openweather_api_key","openai_api_key","huggingface_token","data_gov_api_key"],
  },
  "Runtime & Server": {
    icon: Server,
    color: "#34d399",
    accent: "rgba(52,211,153,0.1)",
    border: "rgba(52,211,153,0.2)",
    keys: ["app_env","debug","cors_origins","port","host","log_level","workers","max_connections"],
  },
  "Celery & Workers": {
    icon: Activity,
    color: "#fb923c",
    accent: "rgba(251,146,60,0.1)",
    border: "rgba(251,146,60,0.2)",
    keys: ["celery_broker_url","celery_result_backend","celery_workers","task_timeout"],
  },
};

const SENSITIVE_KEYS = ["secret","password","token","key","uri","url"];
const isSensitive = (k) => SENSITIVE_KEYS.some(s => k.toLowerCase().includes(s));

const classifyKey = (key) => {
  const k = key.toLowerCase();
  for (const [group, def] of Object.entries(CONFIG_GROUPS)) {
    if (def.keys.some(pat => k.includes(pat.toLowerCase()))) return group;
  }
  return "Other";
};

const CopyButton = ({ value }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(String(value)).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={copy} style={{ width: 24, height: 24, borderRadius: 5, background: "var(--soft)", border: "1px solid var(--soft-strong)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: copied ? "var(--text)" : "var(--muted)", flexShrink: 0 }}>
      {copied ? <CheckCircle size={11} /> : <FileText size={10} />}
    </button>
  );
};

const RevealButton = ({ revealed, onToggle }) => (
  <button onClick={onToggle} style={{ width: 24, height: 24, borderRadius: 5, background: "var(--soft)", border: "1px solid var(--soft-strong)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", flexShrink: 0 }}>
    {revealed ? <EyeOff size={11} /> : <Eye size={11} />}
  </button>
);

const ConfigRow = ({ configKey, value, onChange, groupColor }) => {
  const [revealed, setRevealed] = useState(false);
  const sensitive = isSensitive(configKey);
  const isObj = typeof value === "object" && value !== null;
  const displayVal = isObj ? JSON.stringify(value, null, 2) : String(value ?? "");

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 0, alignItems: "center", padding: "11px 0", borderBottom: "1px solid var(--soft)" }}>
      {/* key side */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, paddingRight: 16 }}>
        {sensitive && <Lock size={10} color="var(--muted)" style={{ flexShrink: 0 }} />}
        <div>
          <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text)", fontFamily: "monospace", letterSpacing: "0.02em" }}>{configKey}</div>
          {sensitive && <div style={{ fontSize: 10, color: "rgba(245,158,11,0.6)", marginTop: 1 }}>sensitive</div>}
        </div>
      </div>
      {/* value side */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ flex: 1, position: "relative" }}>
          {isObj ? (
            <textarea
              value={displayVal}
              onChange={e => { try { onChange(configKey, JSON.parse(e.target.value)); } catch { onChange(configKey, e.target.value); } }}
              rows={2}
              style={{ width: "100%", background: "var(--soft)", border: "1px solid var(--soft-strong)", borderRadius: 6, padding: "6px 10px", color: "var(--text)", fontSize: 11, fontFamily: "monospace", resize: "none", outline: "none", boxSizing: "border-box" }}
            />
          ) : (
            <input
              type={sensitive && !revealed ? "password" : "text"}
              value={displayVal}
              onChange={e => onChange(configKey, e.target.value)}
              style={{ width: "100%", background: "var(--soft)", border: `1px solid ${sensitive ? "rgba(245,158,11,0.15)" : "var(--soft-strong)"}`, borderRadius: 6, padding: "7px 10px", color: "var(--text)", fontSize: 12, fontFamily: "monospace", outline: "none", boxSizing: "border-box" }}
            />
          )}
        </div>
        {sensitive && <RevealButton revealed={revealed} onToggle={() => setRevealed(r => !r)} />}
        <CopyButton value={displayVal} />
      </div>
    </div>
  );
};

const AppConfigTab = ({ config, onSave }) => {
  const [local, setLocal] = useState(config);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [search, setSearch] = useState("");
  const [openGroups, setOpenGroups] = useState({});
  const [dirty, setDirty] = useState({});

  useEffect(() => { setLocal(config); setDirty({}); }, [config]);

  const handleChange = (key, val) => {
    setLocal(p => ({ ...p, [key]: val }));
    setDirty(p => ({ ...p, [key]: true }));
  };

  const handleSave = async () => {
    setSaving(true);
    try { await onSave(local); setSaved(true); setDirty({}); setTimeout(() => setSaved(false), 2500); }
    catch {}
    setSaving(false);
  };

  const handleReset = () => { setLocal(config); setDirty({}); };

  const allEntries = Object.entries(local).filter(([k]) => !k.startsWith("__"));
  const filtered = search
    ? allEntries.filter(([k, v]) => k.toLowerCase().includes(search.toLowerCase()) || String(v).toLowerCase().includes(search.toLowerCase()))
    : allEntries;

  // group entries
  const grouped = {};
  filtered.forEach(([k, v]) => {
    const g = classifyKey(k);
    if (!grouped[g]) grouped[g] = [];
    grouped[g].push([k, v]);
  });
  // ensure defined groups appear first in order
  const groupOrder = [...Object.keys(CONFIG_GROUPS), "Other"];
  const sortedGroups = groupOrder.filter(g => grouped[g]?.length > 0);

  const dirtyCount = Object.keys(dirty).length;

  const toggleGroup = (g) => setOpenGroups(p => ({ ...p, [g]: !p[g] }));
  const isOpen = (g) => openGroups[g] !== false; // default open

  if (allEntries.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 0", gap: 12 }}>
        <Settings size={32} color="var(--soft-strong)" />
        <div style={{ fontSize: 14, color: "var(--muted)" }}>No configuration loaded</div>
        <div style={{ fontSize: 12, color: "var(--faint)" }}>Check that the backend is reachable at /api/v1/admin/config</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, background: "var(--soft)", border: "1px solid var(--soft-strong)", borderRadius: 8, padding: "8px 12px" }}>
          <Search size={13} color="var(--muted)" />
          <input
            placeholder="Search config keys or values…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ background: "none", border: "none", outline: "none", color: "var(--text)", fontSize: 13, flex: 1 }}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", padding: 0, fontSize: 14 }}>✕</button>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--muted)", background: "var(--soft-subtle)", border: "1px solid var(--soft-strong)", borderRadius: 7, padding: "6px 12px" }}>
          <span>{allEntries.length} keys</span>
          {dirtyCount > 0 && (
            <span style={{ background: "rgba(245,158,11,0.2)", border: "1px solid rgba(245,158,11,0.3)", color: "var(--muted)", padding: "1px 7px", borderRadius: 4, fontSize: 10, fontWeight: 700 }}>
              {dirtyCount} unsaved
            </span>
          )}
        </div>

        {dirtyCount > 0 && (
          <button onClick={handleReset} style={{ padding: "7px 14px", background: "var(--soft)", border: "1px solid var(--soft-strong)", borderRadius: 7, color: "var(--muted)", fontSize: 12, cursor: "pointer" }}>
            Discard
          </button>
        )}

        <button
          onClick={handleSave}
          disabled={saving || dirtyCount === 0}
          style={{
            display: "flex", alignItems: "center", gap: 7, padding: "7px 20px",
            background: saved ? "var(--soft-subtle)" : dirtyCount > 0 ? "var(--soft-subtle)" : "var(--soft)",
            border: `1px solid ${saved ? "var(--soft-strong)" : dirtyCount > 0 ? "rgba(34,197,94,0.35)" : "var(--soft-strong)"}`,
            borderRadius: 7, color: dirtyCount > 0 ? "var(--text)" : "var(--muted)",
            fontSize: 12, fontWeight: 700, cursor: dirtyCount > 0 ? "pointer" : "default",
            transition: "all 0.2s",
          }}>
          {saving ? <><RefreshCw size={12} style={{ animation: "spin 1s linear infinite" }} /> Saving…</> : saved ? <><CheckCircle size={12} /> Saved</> : <><Settings size={12} /> Save Config</>}
        </button>
      </div>

      {/* groups */}
      {sortedGroups.map(groupName => {
        const def = CONFIG_GROUPS[groupName] || { icon: Settings, color: "var(--muted)", accent: "var(--soft)", border: "var(--soft-strong)" };
        const GroupIcon = def.icon;
        const entries = grouped[groupName];
        const open = isOpen(groupName);
        const groupDirty = entries.filter(([k]) => dirty[k]).length;

        return (
          <div key={groupName} style={{ background: "var(--soft-subtle)", border: `1px solid var(--soft-strong)`, borderRadius: 12, overflow: "hidden" }}>
            {/* group header */}
            <button
              onClick={() => toggleGroup(groupName)}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: def.accent, border: `1px solid ${def.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <GroupIcon size={14} color={def.color} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{groupName}</div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1 }}>{entries.length} configuration {entries.length === 1 ? "key" : "keys"}</div>
              </div>
              {groupDirty > 0 && (
                <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)", color: "var(--muted)" }}>
                  {groupDirty} modified
                </span>
              )}
              <ChevronRight size={14} color="var(--muted)" style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s", flexShrink: 0 }} />
            </button>

            {/* group rows */}
            {open && (
              <div style={{ borderTop: "1px solid var(--soft)", padding: "0 16px" }}>
                {/* column headers */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 0, padding: "8px 0 4px" }}>
                  <span style={{ fontSize: 10, color: "var(--faint)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Key</span>
                  <span style={{ fontSize: 10, color: "var(--faint)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Value</span>
                </div>
                {entries.map(([k, v]) => (
                  <div key={k} style={{ position: "relative" }}>
                    {dirty[k] && (
                      <div style={{ position: "absolute", left: -16, top: "50%", transform: "translateY(-50%)", width: 3, height: 20, background: "var(--muted)", borderRadius: "0 2px 2px 0" }} />
                    )}
                    <ConfigRow configKey={k} value={v} onChange={handleChange} groupColor={def.color} />
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

/* ─── ingestion tab ───────────────────────────────────────────────────── */

const IngestionTab = ({ rows, onTrigger }) => {
  const SCRIPTS = [
    { id: "seed_reference_data",       label: "seed_reference_data",       icon: Database },
    { id: "generate_qdrant_indexes",   label: "generate_qdrant_indexes",   icon: Zap },
    { id: "generate_analytics_snapshots", label: "gen_analytics_snapshots", icon: TrendingUp },
    { id: "upsert_schemes_from_file",  label: "upsert_schemes",            icon: Upload },
    { id: "upsert_equipment_from_file", label: "upsert_equipment",         icon: Terminal },
  ];
  const [running, setRunning] = useState({});

  const run = async (id) => {
    setRunning(p => ({ ...p, [id]: true }));
    try { await onTrigger(id); } catch {}
    setTimeout(() => setRunning(p => ({ ...p, [id]: false })), 2000);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* trigger bar */}
      <div style={{ background: "var(--soft-subtle)", border: "1px solid var(--soft-strong)", borderRadius: 10, padding: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Data Ingestion Pipelines</span>
          <span style={{ fontSize: 10, color: "var(--text)", background: "var(--soft-subtle)", border: "1px solid var(--soft-strong)", padding: "3px 8px", borderRadius: 4, fontWeight: 600 }}>ALL SYSTEMS OPERATIONAL</span>
        </div>

        {/* table header */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 160px 80px", gap: 12, padding: "6px 10px", marginBottom: 4 }}>
          {["SCRIPT NAME","STATUS","LAST RUN","ACTION"].map(h => (
            <span key={h} style={{ fontSize: 10, color: "var(--faint)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{h}</span>
          ))}
        </div>

        {/* rows from API + static fallback */}
        {(rows.length > 0 ? rows : SCRIPTS.map(s => ({ dataset: s.id, status: "PENDING", last_run_at: null, _id: s.id }))).map((row, i) => {
          const id = row.dataset || row.collection || row._id || SCRIPTS[i]?.id;
          const status = (row.status || "PENDING").toUpperCase();
          const dot = STATUS_DOT[status] || "var(--muted)";
          const Icon = SCRIPTS.find(s => s.id === id)?.icon || Play;
          return (
            <div key={id || i} style={{ display: "grid", gridTemplateColumns: "1fr 100px 160px 80px", gap: 12, padding: "11px 10px", borderRadius: 7, background: i % 2 === 0 ? "var(--soft-subtle)" : "transparent", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Icon size={13} color="var(--muted)" />
                <span style={{ fontSize: 12, fontFamily: "monospace", color: "var(--text)" }}>{id || "-"}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: dot, boxShadow: status === "SUCCESS" ? `0 0 5px ${dot}` : "none" }} />
                <span style={{ fontSize: 11, color: dot, fontWeight: 600 }}>{status}</span>
              </div>
              <span style={{ fontSize: 11, color: "var(--muted)", fontFamily: "monospace" }}>
                {row.last_run_at ? new Date(row.last_run_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "medium" }) : "—"}
              </span>
              <button
                onClick={() => run(id)}
                disabled={running[id]}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 6, background: running[id] ? "rgba(245,158,11,0.15)" : "var(--soft)", border: `1px solid ${running[id] ? "rgba(245,158,11,0.3)" : "var(--soft-strong)"}`, cursor: "pointer", color: running[id] ? "var(--muted)" : "var(--muted)" }}>
                {running[id] ? <RefreshCw size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Play size={12} />}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ─── admin users tab ─────────────────────────────────────────────────── */

const AdminUsersTab = ({ admins, onCreate, onRefresh }) => {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "Admin@123", role: "admin" });
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");

  const handleCreate = async () => {
    setCreating(true);
    try { await onCreate(form); setShowForm(false); setForm({ name: "", email: "", password: "Admin@123", role: "admin" }); onRefresh(); }
    catch {}
    setCreating(false);
  };

  const filtered = admins.filter(u => !search || (u.name || "").toLowerCase().includes(search.toLowerCase()) || (u.email || "").toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, background: "var(--soft)", border: "1px solid var(--soft-strong)", borderRadius: 7, padding: "7px 12px" }}>
          <Search size={13} color="var(--muted)" />
          <input placeholder="Search admin users..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ background: "none", border: "none", outline: "none", color: "var(--text)", fontSize: 13, flex: 1 }} />
        </div>
        <button onClick={() => setShowForm(!showForm)}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 16px", background: "var(--soft)", border: "1px solid var(--soft-strong)", borderRadius: 7, color: "var(--text)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
          <UserPlus size={13} /> New Admin
        </button>
      </div>

      {showForm && (
        <div style={{ background: "var(--soft-subtle)", border: "1px solid var(--soft-strong)", borderRadius: 10, padding: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 10, alignItems: "end" }}>
            {[["Name","name","text","Full name"],["Email","email","email","admin@domain.in"],["Password","password","password",""]].map(([label, field, type, ph]) => (
              <div key={field}>
                <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</div>
                <input className="field" type={type} placeholder={ph} value={form[field]}
                  onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
                  style={{ fontSize: 12 }} />
              </div>
            ))}
            <button onClick={handleCreate} disabled={creating}
              style={{ padding: "8px 20px", background: "var(--app-shell-gradient)", color: "var(--text)", border: "1px solid var(--soft-strong)", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              {creating ? "..." : "Create"}
            </button>
          </div>
        </div>
      )}

      <div style={{ background: "var(--soft-subtle)", border: "1px solid var(--soft-strong)", borderRadius: 10, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 200px 80px 120px 80px", gap: 12, padding: "10px 16px", borderBottom: "1px solid var(--soft)" }}>
          {["NAME / EMAIL","LAST LOGIN","ROLE","STATUS",""].map(h => (
            <span key={h} style={{ fontSize: 10, color: "var(--faint)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{h}</span>
          ))}
        </div>
        {filtered.length === 0 ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
            {admins.length === 0 ? "No admin users found" : "No results for your search"}
          </div>
        ) : filtered.map((u, i) => (
          <div key={u.id || i} style={{ display: "grid", gridTemplateColumns: "1fr 200px 80px 120px 80px", gap: 12, padding: "12px 16px", borderBottom: i < filtered.length - 1 ? "1px solid var(--soft)" : "none", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 2 }}>{u.name || "Admin"}</div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>{u.email}</div>
            </div>
            <span style={{ fontSize: 11, color: "var(--muted)", fontFamily: "monospace" }}>
              {u.last_login_at ? new Date(u.last_login_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase() : "—"}
            </span>
            <RolePill role={u.role} />
            <span style={{ fontSize: 11, color: u.is_active ? "var(--text)" : "#ef4444", fontWeight: 600 }}>{u.is_active ? "● Active" : "○ Inactive"}</span>
            <div style={{ display: "flex", gap: 4 }}>
              <button style={{ width: 26, height: 26, borderRadius: 5, background: "var(--soft)", border: "1px solid var(--soft-strong)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>
                <Edit3 size={11} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ─── audit log tab ───────────────────────────────────────────────────── */

const AuditLogTab = ({ rows }) => {
  const [search, setSearch] = useState("");
  const filtered = rows.filter(r => !search || JSON.stringify(r).toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, background: "var(--soft)", border: "1px solid var(--soft-strong)", borderRadius: 7, padding: "7px 12px" }}>
          <Search size={13} color="var(--muted)" />
          <input placeholder="Filter audit events..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ background: "none", border: "none", outline: "none", color: "var(--text)", fontSize: 13, flex: 1 }} />
        </div>
        <button onClick={() => {}} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "var(--soft)", border: "1px solid var(--soft-strong)", borderRadius: 7, color: "var(--muted)", fontSize: 12, cursor: "pointer" }}>
          <Download size={13} /> Export
        </button>
      </div>

      <div style={{ background: "var(--soft-subtle)", border: "1px solid var(--soft-strong)", borderRadius: 10, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "160px 120px 1fr 140px", gap: 12, padding: "10px 16px", borderBottom: "1px solid var(--soft)" }}>
          {["TIMESTAMP","ADMIN","ACTION","TARGET"].map(h => (
            <span key={h} style={{ fontSize: 10, color: "var(--faint)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{h}</span>
          ))}
        </div>
        {filtered.length === 0 ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
            {rows.length === 0 ? "No audit logs available" : "No matching events"}
          </div>
        ) : filtered.slice(0, 50).map((r, i) => {
          const action = r.action || r.dataset || "-";
          const isWrite = ["POST","PUT","DELETE","PATCH","create","update","delete","trigger"].some(v => action.toLowerCase().includes(v));
          return (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "160px 120px 1fr 140px", gap: 12, padding: "11px 16px", borderBottom: i < filtered.length - 1 ? "1px solid var(--soft)" : "none", alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "var(--muted)", fontFamily: "monospace" }}>
                {r.timestamp || r.last_run_at ? new Date(r.timestamp || r.last_run_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—"}
              </span>
              <span style={{ fontSize: 12, color: "var(--text)" }}>{r.admin_id || "system"}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: isWrite ? "var(--muted)" : "var(--muted)", flexShrink: 0, display: "block" }} />
                <span style={{ fontSize: 12, fontFamily: "monospace", color: "var(--text)" }}>{action}</span>
              </div>
              <span style={{ fontSize: 11, color: "var(--muted)", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {r.target_doc_id || r.payload_summary || "-"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ─── main component ───────────────────────────────────────────────────── */

const SystemConfig = () => {
  const [tab, setTab] = useState("Feature Flags");
  const [config, setConfig] = useState({});
  const [flags, setFlags] = useState({});
  const [ingestion, setIngestion] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [audit, setAudit] = useState([]);
  const [serviceHealth, setServiceHealth] = useState([]);
  const [healthUpdatedAt, setHealthUpdatedAt] = useState(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  const TAB_ICONS = {
    "App Config": Settings,
    "Feature Flags": Zap,
    "Ingestion": Database,
    "Admin Users": Users,
    "Audit Log": FileText,
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === "App Config" || tab === "Feature Flags") {
        const data = await apiTry(["/api/v1/admin/config"]);
        setConfig(data || {});
        setFlags(data?.feature_flags || {});
      } else if (tab === "Ingestion") {
        const data = await apiTry(["/api/v1/admin/ingestion/logs"]);
        setIngestion(data.items || []);
      } else if (tab === "Admin Users") {
        const data = await apiTry(["/api/v1/admin/admins"]);
        setAdmins(data.items || []);
      } else if (tab === "Audit Log") {
        const data = await apiTry(["/api/v1/admin/ingestion/logs"]);
        setAudit(data.items || []);
      }
    } catch {
      setIngestion([]); setAdmins([]); setAudit([]);
    }
    setLoading(false);
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const saveConfig = useCallback(async (data) => {
    await apiClient("/api/v1/admin/config", { method: "PUT", body: JSON.stringify(data) });
    load();
  }, [load]);

  const trigger = useCallback(async (script) => {
    await apiClient(`/api/v1/admin/ingestion/trigger/${script}`, { method: "POST", body: JSON.stringify({}) });
    load();
  }, [load]);

  const createAdmin = useCallback(async (form) => {
    await apiClient("/api/v1/admin/admins", { method: "POST", body: JSON.stringify(form) });
    load();
  }, [load]);

  const loadServiceHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const checks = await healthChecks();
      setServiceHealth(Array.isArray(checks) ? checks : []);
      setHealthUpdatedAt(new Date().toISOString());
    } catch {
      setServiceHealth([]);
    } finally {
      setHealthLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const tick = async () => {
      if (!mounted) return;
      await loadServiceHealth();
    };
    tick();
    const t = setInterval(tick, 15000);
    return () => {
      mounted = false;
      clearInterval(t);
    };
  }, [loadServiceHealth]);

  return (
    <div className="system-config-page space-y-3">
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        .svc-health-card {
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 4px;
          aspect-ratio: 1 / 1;
          min-height: 92px;
          padding: 8px 9px;
          border-radius: 10px;
          background: var(--app-shell-gradient);
          border: 1px solid var(--soft-strong);
          transition: transform 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease;
          overflow: hidden;
        }
        .svc-health-card:hover {
          transform: translateY(-1px);
          border-color: var(--faint);
          box-shadow: 0 8px 18px rgba(0,0,0,0.1);
        }
        .svc-health-detail {
          max-height: 0;
          opacity: 0;
          overflow: hidden;
          transition: max-height 0.18s ease, opacity 0.18s ease;
          font-size: 9px;
          color: var(--muted);
          font-family: monospace;
          line-height: 1.35;
          white-space: nowrap;
          text-overflow: ellipsis;
        }
        .svc-health-card:hover .svc-health-detail {
          max-height: 40px;
          opacity: 1;
        }
      `}</style>

      {/* tab bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, background: "var(--soft-subtle)", border: "1px solid var(--soft-strong)", borderRadius: 10, padding: "8px 10px" }}>
        {SYSTEM_TABS.map((item) => {
          const Icon = TAB_ICONS[item] || Settings;
          const isActive = tab === item;
          return (
            <button key={item} type="button"
              onClick={() => setTab(item)}
              style={{
                display: "flex", alignItems: "center", gap: 7, padding: "7px 14px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 12, fontWeight: isActive ? 600 : 400,
                background: isActive ? "rgba(255,255,255,0.09)" : "transparent",
                color: isActive ? "var(--text)" : "var(--muted)",
                transition: "all 0.15s",
              }}>
              <Icon size={13} />
              {item}
              {item === "Feature Flags" && Object.keys(flags).length > 0 && (
                <span style={{ background: "var(--app-shell-gradient)", border: "1px solid var(--soft-strong)", color: "var(--text)", fontSize: 9, fontWeight: 800, padding: "1px 5px", borderRadius: 99, lineHeight: 1.6 }}>
                  {Object.values(flags).filter(Boolean).length}
                </span>
              )}
            </button>
          );
        })}
        <div style={{ flex: 1 }} />
        <button onClick={load} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: "var(--soft)", border: "1px solid var(--soft-strong)", borderRadius: 6, color: "var(--muted)", fontSize: 11, cursor: "pointer" }}>
          <RefreshCw size={12} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} /> Refresh
        </button>
      </div>

      <div style={{ background: "var(--soft-subtle)", border: "1px solid var(--soft-strong)", borderRadius: 10, padding: "10px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Activity size={13} color="var(--text)" />
            <span style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Microservice Health</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 10, color: "var(--faint)" }}>
              {healthUpdatedAt ? `Updated ${new Date(healthUpdatedAt).toLocaleTimeString("en-IN")}` : "Waiting for first health check"}
            </span>
            <button onClick={loadServiceHealth} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", background: "var(--soft)", border: "1px solid var(--soft-strong)", borderRadius: 6, color: "var(--muted)", fontSize: 10, cursor: "pointer" }}>
              <RefreshCw size={11} style={{ animation: healthLoading ? "spin 1s linear infinite" : "none" }} />
              Refresh
            </button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 8 }}>
          {serviceHealth.length > 0 ? serviceHealth.map((svc) => {
            const ok = svc.ok !== false;
            const detail = svc.endpoint || svc.url || svc.baseUrl || svc.path || "Health probe";
            return (
              <div key={svc.name} className="svc-health-card" title={`${svc.name} - ${detail}`}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: ok ? "var(--text)" : "#ef4444", boxShadow: ok ? "0 0 5px rgba(34,197,94,0.3)" : "none", flexShrink: 0 }} />
                  <span style={{ fontSize: 10, color: "var(--text)", fontFamily: "monospace", flexShrink: 0 }}>
                    {Number.isFinite(Number(svc.latencyMs)) ? `${svc.latencyMs}ms` : (ok ? "OK" : "DOWN")}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "var(--text)", textTransform: "capitalize", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {svc.name}
                </div>
                <div className="svc-health-detail">{detail}</div>
              </div>
            );
          }) : (
            <div style={{ fontSize: 11, color: "var(--muted)" }}>No health data available yet.</div>
          )}
        </div>
      </div>

      {/* tab content */}
      <div style={{ minHeight: 400 }}>
        {tab === "Feature Flags" && <FeatureFlagsTab flags={flags} config={config} onSave={saveConfig} onRefresh={load} />}
        {tab === "App Config"    && <AppConfigTab config={config} onSave={saveConfig} />}
        {tab === "Ingestion"     && <IngestionTab rows={ingestion} onTrigger={trigger} />}
        {tab === "Admin Users"   && <AdminUsersTab admins={admins} onCreate={createAdmin} onRefresh={load} />}
        {tab === "Audit Log"     && <AuditLogTab rows={audit} />}
      </div>
    </div>
  );
};

export default SystemConfig;