import { useCallback, useEffect, useRef, useState } from "react";
import { WandSparkles, RefreshCw, TrendingUp, TrendingDown } from "lucide-react";
import { apiTry, withQuery } from "../api/client";
import SparkLine from "../components/charts/SparkLine";

const STYLE_ID = "analytics-v3-style";
if (!document.getElementById(STYLE_ID)) {
  const el = document.createElement("style");
  el.id = STYLE_ID;
  el.textContent = `
    @keyframes an-fade { from { opacity:0; transform:translateY(10px);} to { opacity:1; transform:none;} }
    .an-fade { animation: an-fade 0.35s ease both; }
    .an-card:hover { border-color: var(--faint) !important; }
    .an-insight { min-height: 34px; font-size: 11px; color: var(--muted); line-height: 1.35; margin-top: 8px; }
    .an-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 12px; }
    @media (max-width: 900px) {
      .an-grid { grid-template-columns: 1fr; }
    }
  `;
  document.head.appendChild(el);
}

const PALETTE = ["#16a34a", "#0284c7", "#f59e0b", "#8b5cf6", "#ef4444", "#14b8a6"];

const fmt = (n) => {
  const v = Number(n);
  if (Number.isNaN(v)) return String(n || "-");
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toLocaleString();
};

const delta = (v) => {
  const n = Number(v);
  if (!n) return null;
  const up = n > 0;
  return (
    <span style={{ fontSize: 10, fontWeight: 600, color: up ? "#16a34a" : "#ef4444", display: "inline-flex", alignItems: "center", gap: 2 }}>
      {up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
      {up ? "+" : ""}{n}%
    </span>
  );
};

const hasSignal = (arr = []) => arr.some((v) => Number(v || 0) > 0);

const IconDropdown = ({ value, options = [], onChange }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const active = options.find((opt) => opt.id === value) || options[0];

  useEffect(() => {
    const onDocClick = (event) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <button type="button" className="btn-ghost" onClick={() => setOpen((s) => !s)} title={active?.label || "Graph style"} style={{ width: 34, height: 28, padding: 0, fontSize: 10 }}>
        {active?.icon || "CH"}
      </button>
      {open && (
        <div style={{ position: "absolute", right: 0, top: 32, zIndex: 60, display: "grid", gridTemplateColumns: "repeat(3, 32px)", gap: 6, padding: 8, borderRadius: 8, border: "1px solid var(--soft)", background: "var(--surface)", boxShadow: "var(--shadow-lg)" }}>
          {options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              title={opt.label}
              onClick={() => { onChange(opt.id); setOpen(false); }}
              style={{
                width: 32,
                height: 24,
                borderRadius: 6,
                border: opt.id === value ? "1px solid var(--accent)" : "1px solid var(--soft)",
                background: opt.id === value ? "var(--soft-subtle)" : "transparent",
                color: "var(--text)",
                cursor: "pointer",
                fontSize: 10,
              }}
            >
              {opt.icon}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const StatCard = ({ title, value, sub, trend, spark = [], color = "#16a34a" }) => (
  <div className="panel an-card" style={{ padding: "14px 16px", transition: "border-color 0.2s" }}>
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
      <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--muted)" }}>{title}</span>
      {trend !== undefined ? delta(trend) : null}
    </div>
    <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1 }}>{fmt(value)}</div>
    {sub && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>{sub}</div>}
    {spark.length > 0 && <div style={{ marginTop: 10, opacity: 0.85 }}><SparkLine data={spark} color={color} height={36} strokeWidth={1.7} /></div>}
  </div>
);

const Ticker = ({ items = [] }) => {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (!items.length) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % items.length), 3000);
    return () => clearInterval(t);
  }, [items.length]);

  if (!items.length) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--muted)", padding: "7px 14px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 7 }}>
      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#16a34a" }} />
      <span style={{ color: "#16a34a", fontWeight: 700 }}>AI REC</span>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{items[idx]}</span>
    </div>
  );
};

const WideLineChart = ({ labels = [], series = [], onHover, width = 1400, height = 320 }) => {
  const W = width;
  const H = height;
  const PAD = { t: 18, r: 24, b: 56, l: 58 };
  const iW = W - PAD.l - PAD.r;
  const iH = H - PAD.t - PAD.b;
  const all = series.flatMap((s) => s.values || []);
  const min = Math.min(...(all.length ? all : [0]));
  const max = Math.max(...(all.length ? all : [1]));
  const range = max - min || 1;

  const pt = (value, idx, len) => ({
    x: PAD.l + (idx / (len - 1 || 1)) * iW,
    y: PAD.t + iH - ((value - min) / range) * iH,
  });

  const path = (vals) => vals.map((v, i) => {
    const p = pt(v, i, vals.length);
    return `${i === 0 ? "M" : "L"}${p.x},${p.y}`;
  }).join(" ");

  const ticks = labels.length <= 1 ? [0] : [0, Math.floor((labels.length - 1) / 3), Math.floor(((labels.length - 1) * 2) / 3), labels.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: H }}>
      {Array.from({ length: 4 }).map((_, i) => {
        const y = PAD.t + (i / 3) * iH;
        const val = max - (i / 3) * range;
        return (
          <g key={i}>
            <line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y} stroke="var(--soft-strong)" strokeWidth="1.2" />
            <text x={PAD.l - 6} y={y + 4} textAnchor="end" fill="var(--text)" fontSize="11" opacity="0.9">{fmt(Math.round(val))}</text>
          </g>
        );
      })}

      {series.map((s, si) => {
        const vals = s.values || [];
        if (!vals.length) return null;
        return (
          <g key={s.name}>
            <path d={path(vals)} fill="none" stroke={s.color || PALETTE[si % PALETTE.length]} strokeWidth="2.6" strokeLinecap="round" />
            {vals.map((v, i) => {
              const p = pt(v, i, vals.length);
              return (
                <circle
                  key={`${s.name}-${i}`}
                  cx={p.x}
                  cy={p.y}
                  r="4"
                  fill={s.color || PALETTE[si % PALETTE.length]}
                  onMouseEnter={() => onHover?.(`${s.name} on ${String(labels[i] || "").slice(5)}: ${fmt(v)}`)}
                />
              );
            })}
          </g>
        );
      })}

      {ticks.filter((v, i, arr) => arr.indexOf(v) === i).map((idx) => {
        const x = pt(0, idx, labels.length).x;
        return <text key={idx} x={x} y={H - 16} textAnchor="middle" fill="var(--text)" fontSize="11" opacity="0.9">{String(labels[idx] || "").slice(5)}</text>;
      })}
    </svg>
  );
};

const HBarInteractive = ({ data = [], onHover }) => {
  const max = Math.max(...data.map((d) => Number(d.value || 0)), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {data.map((d, i) => (
        <div
          key={d.label}
          onMouseEnter={() => onHover?.(`${d.label}: ${fmt(d.value)} | share ${Math.round((Number(d.value || 0) / max) * 100)}% of top`)}
          style={{ display: "grid", gridTemplateColumns: "minmax(88px, 34%) 1fr 66px", gap: 10, alignItems: "center" }}
        >
          <span style={{ fontSize: 12, color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.label}</span>
          <div style={{ height: 9, borderRadius: 999, background: "var(--soft)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${Math.max(2, (Number(d.value || 0) / max) * 100)}%`, borderRadius: 999, background: d.color || PALETTE[i % PALETTE.length] }} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, textAlign: "right" }}>{fmt(d.value)}</span>
        </div>
      ))}
    </div>
  );
};

const DonutBreakdown = ({ segments = [], onHover }) => {
  const rawTotal = segments.reduce((a, b) => a + Number(b.value || 0), 0);
  const total = Math.max(1, rawTotal);
  const size = 170;
  const stroke = 18;
  const r = (size - stroke) / 2 - 2;
  const C = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(145px, 180px) 1fr", gap: 10, alignItems: "center" }}>
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--soft)" strokeWidth={stroke} />
          {segments.map((s, i) => {
            const val = Number(s.value || 0);
            const dash = (val / total) * C;
            const el = (
              <circle
                key={s.label}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={s.color || PALETTE[i % PALETTE.length]}
                strokeWidth={stroke}
                strokeDasharray={`${dash} ${C - dash}`}
                strokeDashoffset={-offset}
                strokeLinecap="round"
                onMouseEnter={() => onHover?.(`${s.label}: ${fmt(val)} (${Math.round((val / total) * 100)}%)`)}
              />
            );
            offset += dash;
            return el;
          })}
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center" }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{fmt(rawTotal)}</div>
            <div style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase" }}>Total</div>
          </div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {segments.map((s, i) => (
          <div key={s.label} onMouseEnter={() => onHover?.(`${s.label}: ${fmt(s.value)} (${Math.round((Number(s.value || 0) / total) * 100)}%)`)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7, color: "var(--muted)" }}>
              <span style={{ width: 9, height: 9, borderRadius: 999, background: s.color || PALETTE[i % PALETTE.length] }} />
              {s.label}
            </span>
            <span style={{ fontWeight: 700 }}>{fmt(s.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const HeatGrid = ({ rows = [], cols = [], values = [], onHover }) => {
  const max = Math.max(...values.flat().map((v) => Number(v || 0)), 1);
  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ display: "grid", gridTemplateColumns: `70px repeat(${cols.length}, minmax(30px, 1fr))`, gap: 4, minWidth: 520 }}>
        <div />
        {cols.map((c) => <div key={c} style={{ fontSize: 10, color: "var(--faint)", textAlign: "center" }}>{c}</div>)}
        {rows.map((r, ri) => (
          <>
            <div key={`${r}-label`} style={{ fontSize: 11, color: "var(--muted)", alignSelf: "center" }}>{r}</div>
            {cols.map((c, ci) => {
              const v = Number(values?.[ri]?.[ci] || 0);
              const ratio = v / max;
              return (
                <div
                  key={`${r}-${c}`}
                  onMouseEnter={() => onHover?.(`${r} ${c}: ${fmt(v)} interactions`) }
                  style={{ height: 20, borderRadius: 5, background: `rgba(22,163,74,${0.12 + ratio * 0.78})`, border: "1px solid rgba(34,197,94,0.18)" }}
                />
              );
            })}
          </>
        ))}
      </div>
    </div>
  );
};

const InsightsText = ({ text, fallback }) => <div className="an-insight">{text || fallback}</div>;

const normalizeTextArray = (value) => {
  if (Array.isArray(value)) {
    return value.flatMap((item) => normalizeTextArray(item));
  }
  if (value == null) return [];
  return String(value)
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
};

const getSchemeStates = (row) => {
  const fromBeneficiary = normalizeTextArray(row?.beneficiary_state);
  if (fromBeneficiary.length > 0) return fromBeneficiary;
  const fromState = normalizeTextArray(row?.state);
  if (fromState.length > 0) return fromState;
  return ["Central"];
};

const Analytics = ({ refreshToken = 0 }) => {
  const [windowDays, setWindowDays] = useState(30);
  const [overview, setOverview] = useState(null);
  const [schemeRows, setSchemeRows] = useState([]);
  const [schemeDocs, setSchemeDocs] = useState([]);
  const [sourceStatus, setSourceStatus] = useState({ overview: "loading", schemes: "loading" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [farmerId, setFarmerId] = useState("");
  const [farmerSummary, setFarmerSummary] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [farmerLoading, setFarmerLoading] = useState(false);
  const [mode, setMode] = useState({ trend: "line", states: "bars", opp: "bars", engagement: "donut", activity: "heat" });
  const [hoverText, setHoverText] = useState({});
  const lastRefreshTokenRef = useRef(refreshToken);
  const loadSeqRef = useRef(0);

  const fetchSchemes = useCallback(async (forceRefresh = false) => {
    const perPage = 100;
    let page = 1;
    let totalPages = 1;
    const all = [];

    while (page <= totalPages && page <= 6) {
      const payload = await apiTry([
        withQuery("/api/v1/admin/data/schemes", { page, per_page: perPage, refresh: forceRefresh ? 1 : undefined }),
        withQuery("/api/v1/schemes/", { page, per_page: perPage }),
      ], {}, { forceRefresh });
      const items = payload?.items || payload?.schemes || (Array.isArray(payload) ? payload : []);
      all.push(...items);
      totalPages = Number(payload?.total_pages || 1);
      if (!items.length) break;
      page += 1;
    }

    return all;
  }, []);

  const loadOverview = useCallback(async (forceRefresh = false) => {
    const loadSeq = loadSeqRef.current + 1;
    loadSeqRef.current = loadSeq;
    setLoading(true);
    setError(null);
    setSourceStatus({ overview: "loading", schemes: "loading" });
    try {
      const overviewPayload = await apiTry([
        withQuery("/api/v1/analytics/overview", { days: windowDays, refresh: forceRefresh ? 1 : undefined }),
      ], {}, { forceRefresh });

      if (loadSeqRef.current !== loadSeq) return;

      setOverview(overviewPayload);
      setSourceStatus((prev) => ({ ...prev, overview: "ready" }));
      setLoading(false);

      // Load scheme catalog in background so heavy scheme pages do not block analytics render.
      fetchSchemes(forceRefresh)
        .then((schemesPayload) => {
          if (loadSeqRef.current !== loadSeq) return;
          setSchemeRows(Array.isArray(schemesPayload) ? schemesPayload : []);
          setSchemeDocs([]);
          setSourceStatus((prev) => ({ ...prev, schemes: "ready" }));
        })
        .catch(() => {
          if (loadSeqRef.current !== loadSeq) return;
          setSchemeRows([]);
          setSchemeDocs([]);
          setSourceStatus((prev) => ({ ...prev, schemes: "unavailable" }));
        });
    } catch (err) {
      if (loadSeqRef.current !== loadSeq) return;
      setError(err.message || "Failed to load analytics overview");
      setOverview(null);
      setSchemeRows([]);
      setSchemeDocs([]);
      setSourceStatus({ overview: "unavailable", schemes: "unavailable" });
      setLoading(false);
    }
  }, [fetchSchemes, windowDays]);

  useEffect(() => { loadOverview(false); }, [loadOverview]);

  useEffect(() => {
    if (lastRefreshTokenRef.current === refreshToken) return;
    lastRefreshTokenRef.current = refreshToken;
    loadOverview(true);
  }, [refreshToken, loadOverview]);

  const generateSnapshot = useCallback(async () => {
    setGenerating(true);
    try {
      await apiTry([`/api/v1/analytics/snapshots/generate?days=${windowDays}`], { method: "POST", body: JSON.stringify({}) });
      await loadOverview(true);
    } finally {
      setGenerating(false);
    }
  }, [loadOverview, windowDays]);

  const loadFarmerSummary = useCallback(async () => {
    if (!farmerId.trim()) return;
    setFarmerLoading(true);
    try {
      const data = await apiTry([`/api/v1/analytics/farmer/${farmerId}/summary?days=30`, `/api/v1/analytics/farmer/${farmerId}/summary`]);
      setFarmerSummary(data);
    } catch {
      setFarmerSummary(null);
    } finally {
      setFarmerLoading(false);
    }
  }, [farmerId]);

  const scoreCards = overview?.scorecard || [];
  const growth = overview?.growth_trends || {};
  const engagement = overview?.engagement || {};
  const operational = overview?.operational_health || {};
  const opportunities = overview?.opportunities || {};
  const marketIntelligence = overview?.market_intelligence || {};
  const recommendations = overview?.recommendations || [];

  const growthLabels = (growth.farmers || []).map((p) => p.date || p.label || "");
  const farmerVals = (growth.farmers || []).map((p) => Number(p.value || 0));
  const convoVals = (growth.conversations || []).map((p) => Number(p.value || 0));
  const bookingVals = (growth.bookings || []).map((p) => Number(p.value || 0));
  const cropVals = (growth.crops || []).map((p) => Number(p.value || 0));

  const totalFarmerCard = scoreCards.find((x) => String(x.title || "").toLowerCase().includes("total farmers"));
  const totalFarmers = Number(totalFarmerCard?.value || 0);
  const activeFarmers = Number(engagement.active_farmers || 0);
  const riskFarmers = Math.max(0, totalFarmers - activeFarmers);
  const voiceSessions = Number(engagement.voice_sessions_window || 0);

  const topStates = (operational.top_states || []).map((s, i) => ({ label: s.state || "-", value: Number(s.farmers || 0), color: PALETTE[i % PALETTE.length] }));
  const topCommodities = (marketIntelligence.top_commodities || []).slice(0, 8).map((c, i) => ({
    label: c.commodity || "-",
    value: Number(c.mentions || 0),
    momentum: Number(c.momentum_pct || 0),
    price: Number(c.avg_price || 0),
    color: PALETTE[i % PALETTE.length],
  }));
  const oppRows = [
    { label: "Without Crops", value: Number(opportunities.farmers_without_crops || 0), color: "#f59e0b" },
    { label: "Inactive 30d+", value: Number(opportunities.inactive_farmers || 0), color: "#ef4444" },
    { label: "District Gaps", value: Number(opportunities.district_coverage_gaps || 0), color: "#0284c7" },
  ];

  const engagementRows = [
    { label: "Active Farmers", value: activeFarmers, color: "#16a34a" },
    { label: "At Risk Farmers", value: riskFarmers, color: "#ef4444" },
    { label: "Voice Sessions", value: voiceSessions, color: "#0ea5e9" },
  ];

  const trendSeries = [
    { name: "Farmers", values: farmerVals, color: "#16a34a" },
    { name: "Conversations", values: convoVals, color: "#0ea5e9" },
    { name: "Bookings", values: bookingVals, color: "#f59e0b" },
    { name: "Crops", values: cropVals, color: "#8b5cf6" },
  ].filter((s) => hasSignal(s.values));

  const fallbackOps = [
    { label: "Total Farmers", value: totalFarmers, color: "#16a34a" },
    { label: "Active Farmers", value: activeFarmers, color: "#0ea5e9" },
    { label: "District Gaps", value: Number(opportunities.district_coverage_gaps || 0), color: "#f59e0b" },
    { label: "Voice Sessions", value: voiceSessions, color: "#8b5cf6" },
  ];

  const recentTrendDates = growthLabels.slice(-10);
  const asMap = (labels, vals) => labels.reduce((acc, d, i) => {
    acc[d] = Number(vals[i] || 0);
    return acc;
  }, {});
  const farmerMap = asMap(growthLabels, farmerVals);
  const convoMap = asMap(growthLabels, convoVals);
  const bookingMap = asMap(growthLabels, bookingVals);
  const heatRows = ["Farmers", "Conversations", "Bookings"];
  const heatCols = recentTrendDates.map((d) => String(d || "").slice(5));
  const heatValues = [
    recentTrendDates.map((d) => Number(farmerMap[d] || 0)),
    recentTrendDates.map((d) => Number(convoMap[d] || 0)),
    recentTrendDates.map((d) => Number(bookingMap[d] || 0)),
  ];

  const schemesByCategory = Object.entries(
    schemeRows.reduce((acc, row) => {
      const key = String(row?.category || (Array.isArray(row?.categories) ? row.categories[0] : null) || row?.ministry || "Other").trim() || "Other";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {})
  )
    .map(([label, value], i) => ({ label, value, color: PALETTE[i % PALETTE.length] }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const schemesByState = Object.entries(
    schemeRows.reduce((acc, row) => {
      getSchemeStates(row).forEach((state) => {
        const key = String(state || "Central").trim() || "Central";
        acc[key] = (acc[key] || 0) + 1;
      });
      return acc;
    }, {})
  )
    .map(([label, value], i) => ({ label, value, color: PALETTE[i % PALETTE.length] }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const schemesByMinistry = Object.entries(
    schemeRows.reduce((acc, row) => {
      const key = String(row?.ministry || row?.department || "Unknown Ministry").trim() || "Unknown Ministry";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {})
  )
    .map(([label, value], i) => ({ label, value, color: PALETTE[i % PALETTE.length] }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const eligibilityCount = (row) => {
    const list = normalizeTextArray(row?.eligibility);
    if (list.length > 0) return list.length;
    return row?.eligibility ? 1 : 0;
  };

  const requiredDocsCount = (row) => {
    const list = normalizeTextArray(row?.required_documents);
    if (list.length > 0) return list.length;
    return row?.required_documents ? 1 : 0;
  };

  const schemesEligibilityDepth = [
    { label: "Low (0-1)", value: schemeRows.filter((r) => eligibilityCount(r) <= 1).length, color: "#16a34a" },
    { label: "Medium (2-3)", value: schemeRows.filter((r) => eligibilityCount(r) >= 2 && eligibilityCount(r) <= 3).length, color: "#f59e0b" },
    { label: "High (4+)", value: schemeRows.filter((r) => eligibilityCount(r) >= 4).length, color: "#ef4444" },
  ];

  const schemesDocComplexity = [
    { label: "0-1 Docs", value: schemeRows.filter((r) => requiredDocsCount(r) <= 1).length, color: "#16a34a" },
    { label: "2-4 Docs", value: schemeRows.filter((r) => requiredDocsCount(r) >= 2 && requiredDocsCount(r) <= 4).length, color: "#f59e0b" },
    { label: "5+ Docs", value: schemeRows.filter((r) => requiredDocsCount(r) >= 5).length, color: "#ef4444" },
  ];

  const hasSchemeData = schemeRows.length > 0;
  const hasCommodityData = topCommodities.length > 0;

  const categoryPanelData = hasSchemeData
    ? schemesByCategory
    : [
        { label: "Without Crops", value: Number(opportunities.farmers_without_crops || 0), color: "#f59e0b" },
        { label: "Inactive 30d+", value: Number(opportunities.inactive_farmers || 0), color: "#ef4444" },
        { label: "District Gaps", value: Number(opportunities.district_coverage_gaps || 0), color: "#0284c7" },
      ];

  const coveragePanelData = hasSchemeData
    ? schemesByState
    : topStates.slice(0, 8);

  const schemeActiveRows = hasSchemeData
    ? [
        { label: "Active", value: schemeRows.filter((s) => s?.is_active !== false).length, color: "#16a34a" },
        { label: "Inactive", value: schemeRows.filter((s) => s?.is_active === false).length, color: "#ef4444" },
        { label: "Multi-state", value: schemeRows.filter((s) => getSchemeStates(s).length > 1).length, color: "#0284c7" },
      ]
    : [
        { label: "Active Farmers", value: activeFarmers, color: "#16a34a" },
        { label: "At Risk", value: riskFarmers, color: "#ef4444" },
        { label: "Voice Sessions", value: voiceSessions, color: "#0284c7" },
      ];

  const systemHealthRows = [
    { label: "Activation %", value: Number(engagement.activation_rate_pct || 0), color: "#16a34a" },
    { label: "Profile Complete %", value: Number(operational.profile_completeness_pct || 0), color: "#0ea5e9" },
    { label: "Health Score", value: Number(operational.system_health_score || 0), color: "#8b5cf6" },
    { label: "Freshness Lag (days)", value: Number(operational.avg_data_freshness_lag_days || 0), color: "#f59e0b" },
  ];

  const trendOptions = [
    { id: "line", icon: "LN", label: "Line" },
    { id: "bars", icon: "BR", label: "Bars" },
  ];
  const stateOptions = [
    { id: "bars", icon: "HB", label: "Bars" },
    { id: "rank", icon: "RK", label: "Rank" },
  ];
  const oppOptions = [
    { id: "bars", icon: "BR", label: "Bars" },
    { id: "mix", icon: "MX", label: "Mix" },
  ];
  const engageOptions = [
    { id: "donut", icon: "DN", label: "Donut" },
    { id: "bars", icon: "BR", label: "Bars" },
  ];
  const activityOptions = [{ id: "heat", icon: "HT", label: "Heat" }];

  const farmerSpark = farmerVals.slice(-12);
  const convoSpark = convoVals.slice(-12);
  const dataQualityRows = [
    { label: "Trend Points", value: growthLabels.length, color: "#16a34a" },
    { label: "Non-zero Trend Days", value: trendSeries[0]?.values?.filter((v) => Number(v || 0) > 0).length || 0, color: "#0284c7" },
    { label: "Scheme Records", value: schemeRows.length, color: "#f59e0b" },
    { label: "Schemes with Docs", value: schemeRows.filter((r) => requiredDocsCount(r) > 0).length, color: "#8b5cf6" },
    { label: "Commodity Records", value: Number(marketIntelligence.records_window || 0), color: "#ef4444" },
  ];

  return (
    <div className="space-y-3 an-fade">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Analytics</h2>
          {overview && <span style={{ fontSize: 10, color: "var(--muted)", borderLeft: "1px solid var(--border)", paddingLeft: 10 }}>{overview.window_days || windowDays}d window</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          {[7, 30, 90].map((d) => (
            <button key={d} type="button" className={`btn-ghost ${windowDays === d ? "btn-primary" : ""}`} onClick={() => setWindowDays(d)} style={windowDays === d ? { background: "var(--accent)", color: "#000", borderColor: "var(--accent)" } : {}}>{d}d</button>
          ))}
          <button type="button" className="btn-ghost" onClick={generateSnapshot} disabled={generating} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {generating ? <RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} /> : <WandSparkles size={13} />}
            {generating ? "Generating..." : "Generate Snapshot"}
          </button>
        </div>
      </div>

      {recommendations.length > 0 && <Ticker items={recommendations} />}
      {loading && <div className="panel card-pad muted" style={{ fontSize: 13 }}>Loading analytics...</div>}
      {error && <div className="panel card-pad" style={{ borderColor: "var(--danger)", background: "rgba(239,68,68,0.06)", fontSize: 13, color: "var(--danger)" }}>{error}</div>}
      {!loading && !error && (
        <div className="panel card-pad" style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center", fontSize: 11 }}>
          <span style={{ color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Data Sources</span>
          <span style={{ color: sourceStatus.overview === "ready" ? "#16a34a" : "#f59e0b" }}>Overview: {sourceStatus.overview}</span>
          <span style={{ color: sourceStatus.schemes === "ready" ? "#16a34a" : "#f59e0b" }}>Schemes: {sourceStatus.schemes}</span>
          <span style={{ color: "var(--muted)" }}>| window {windowDays}d</span>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 }}>
        {scoreCards.length > 0 ? scoreCards.map((card, i) => (
          <StatCard key={card.title} title={card.title} value={card.value} sub={card.context} trend={card.delta} spark={i % 2 ? convoSpark : farmerSpark} color={PALETTE[i % PALETTE.length]} />
        )) : Array.from({ length: 4 }).map((_, i) => <div key={i} className="panel skeleton-row" style={{ height: 100 }} />)}
      </div>

      <div className="an-grid">
        <div className="panel card-pad an-card" style={{ gridColumn: "1 / -1" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span className="uppercase-xs">Admin Trend Signal</span>
            <IconDropdown value={mode.trend} options={trendOptions} onChange={(v) => setMode((p) => ({ ...p, trend: v }))} />
          </div>
          {(trendSeries.length > 0 && mode.trend === "line") ? (
            <div style={{ overflowX: "auto", paddingBottom: 4 }}>
              <div style={{ minWidth: 1280 }}>
                <WideLineChart labels={growthLabels} series={trendSeries.slice(0, 3)} width={1320} height={340} onHover={(t) => setHoverText((p) => ({ ...p, trend: t }))} />
              </div>
            </div>
          ) : (
            <HBarInteractive data={fallbackOps} onHover={(t) => setHoverText((p) => ({ ...p, trend: t }))} />
          )}
          <InsightsText text={hoverText.trend} fallback={trendSeries.length > 0 ? "Hover a point to see exact date-wise operational movement." : "Time-series is sparse. Showing non-zero admin KPI distribution instead."} />
        </div>

        <div className="panel card-pad an-card">
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span className="uppercase-xs">State Performance</span>
            <IconDropdown value={mode.states} options={stateOptions} onChange={(v) => setMode((p) => ({ ...p, states: v }))} />
          </div>
          <HBarInteractive data={topStates.slice(0, 10)} onHover={(t) => setHoverText((p) => ({ ...p, states: `${t}. Admin action: prioritize campaign budget for this state.` }))} />
          <InsightsText text={hoverText.states} fallback="Hover a state row to view operational concentration and admin action hint." />
        </div>

        <div className="panel card-pad an-card">
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span className="uppercase-xs">Engagement Risk Split</span>
            <IconDropdown value={mode.engagement} options={engageOptions} onChange={(v) => setMode((p) => ({ ...p, engagement: v }))} />
          </div>
          {mode.engagement === "donut" ? (
            <DonutBreakdown segments={engagementRows} onHover={(t) => setHoverText((p) => ({ ...p, engage: `${t}. This impacts retention and support workload.` }))} />
          ) : (
            <HBarInteractive data={engagementRows} onHover={(t) => setHoverText((p) => ({ ...p, engage: t }))} />
          )}
          <InsightsText text={hoverText.engage} fallback="Hover each segment to read actionable engagement interpretation." />
        </div>

        <div className="panel card-pad an-card">
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span className="uppercase-xs">Opportunity Backlog</span>
            <IconDropdown value={mode.opp} options={oppOptions} onChange={(v) => setMode((p) => ({ ...p, opp: v }))} />
          </div>
          <HBarInteractive data={oppRows} onHover={(t) => setHoverText((p) => ({ ...p, opp: `${t}. High values indicate immediate intervention candidates.` }))} />
          <InsightsText text={hoverText.opp} fallback="Hover backlog items to get triage context for admin decisions." />
        </div>

        <div className="panel card-pad an-card">
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span className="uppercase-xs">Activity Density</span>
            <IconDropdown value={mode.activity} options={activityOptions} onChange={(v) => setMode((p) => ({ ...p, activity: v }))} />
          </div>
          <HeatGrid rows={heatRows} cols={heatCols} values={heatValues} onHover={(t) => setHoverText((p) => ({ ...p, activity: `${t}. Derived from real daily trend series.` }))} />
          <InsightsText text={hoverText.activity} fallback="Hover cells to inspect real day-wise counts across farmers, conversations, and bookings." />
        </div>

        <div className="panel card-pad an-card">
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span className="uppercase-xs">Data Quality Check</span>
            <span style={{ fontSize: 10, color: "var(--muted)" }}>Verification</span>
          </div>
          <HBarInteractive
            data={dataQualityRows}
            onHover={(t) => setHoverText((p) => ({ ...p, quality: `${t}. Use this to validate whether panels have enough source signal.` }))}
          />
          <InsightsText text={hoverText.quality} fallback="This panel verifies whether data is actually coming before trusting chart interpretation." />
        </div>

        <div className="panel card-pad an-card">
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span className="uppercase-xs">{hasCommodityData ? "Commodity Momentum" : "Market Signal Fallback"}</span>
            <span style={{ fontSize: 10, color: "var(--muted)" }}>{hasCommodityData ? "Market intelligence" : "Core analytics"}</span>
          </div>
          <HBarInteractive
            data={hasCommodityData ? topCommodities.map((c) => ({ label: c.label, value: c.value, color: c.color })) : fallbackOps}
            onHover={(t) => setHoverText((p) => ({ ...p, commodity: hasCommodityData ? `${t}. Tracks mention volume in mandi records.` : `${t}. Market feed unavailable, so this panel uses core operational KPIs.` }))}
          />
          <InsightsText
            text={hoverText.commodity}
            fallback={hasCommodityData ? "Hover a commodity to inspect mention concentration." : "Market feed has low signal in this window; showing reliable operational fallback metrics."}
          />
        </div>

        <div className="panel card-pad an-card">
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span className="uppercase-xs">System Health Mix</span>
            <span style={{ fontSize: 10, color: "var(--muted)" }}>Operational</span>
          </div>
          <HBarInteractive
            data={systemHealthRows}
            onHover={(t) => setHoverText((p) => ({ ...p, health: `${t}. Use this to prioritize platform quality actions.` }))}
          />
          <InsightsText text={hoverText.health} fallback="Hover each metric to read health interpretation for admin planning." />
        </div>

        <div className="panel card-pad an-card">
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span className="uppercase-xs">{hasSchemeData ? "Schemes by Category" : "Opportunity Categories"}</span>
            <span style={{ fontSize: 10, color: "var(--muted)" }}>{hasSchemeData ? `${fmt(Math.max(schemeRows.length, categoryPanelData.length))} entries` : "Derived from core signals"}</span>
          </div>
          <HBarInteractive
            data={categoryPanelData}
            onHover={(t) => setHoverText((p) => ({ ...p, schemeCategory: hasSchemeData ? `${t}. Schemes graph is built from scheme information records.` : `${t}. Scheme catalog feed unavailable, showing opportunity categories.` }))}
          />
          <InsightsText
            text={hoverText.schemeCategory}
            fallback={hasSchemeData ? "Hover to inspect where your scheme catalog is concentrated." : "Scheme catalog feed unavailable, so this panel auto-switches to opportunity categories."}
          />
        </div>

        <div className="panel card-pad an-card">
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span className="uppercase-xs">{hasSchemeData ? "Schemes by State" : "State Coverage"}</span>
            <span style={{ fontSize: 10, color: "var(--muted)" }}>{hasSchemeData ? "Coverage" : "Operational"}</span>
          </div>
          <HBarInteractive
            data={coveragePanelData}
            onHover={(t) => setHoverText((p) => ({ ...p, schemeState: hasSchemeData ? `${t}. Full value shown here is from schemes information records.` : `${t}. Scheme state feed unavailable, showing top operational states.` }))}
          />
          <InsightsText
            text={hoverText.schemeState}
            fallback={hasSchemeData ? "Hover a state to check scheme coverage concentration." : "Scheme state feed unavailable, so this panel shows top operational states."}
          />
        </div>

        <div className="panel card-pad an-card">
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span className="uppercase-xs">Schemes by Ministry</span>
            <span style={{ fontSize: 10, color: "var(--muted)" }}>Governance</span>
          </div>
          <HBarInteractive
            data={hasSchemeData ? schemesByMinistry : topStates.slice(0, 8)}
            onHover={(t) => setHoverText((p) => ({ ...p, schemeMinistry: hasSchemeData ? `${t}. Distribution across ministries from scheme information records.` : `${t}. Fallback panel while schemes feed is unavailable.` }))}
          />
          <InsightsText text={hoverText.schemeMinistry} fallback={hasSchemeData ? "Hover a ministry to see its scheme share." : "Schemes feed unavailable; showing fallback data."} />
        </div>

        <div className="panel card-pad an-card">
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span className="uppercase-xs">Eligibility Depth</span>
            <span style={{ fontSize: 10, color: "var(--muted)" }}>Complexity</span>
          </div>
          <HBarInteractive
            data={hasSchemeData ? schemesEligibilityDepth : oppRows}
            onHover={(t) => setHoverText((p) => ({ ...p, eligibilityDepth: hasSchemeData ? `${t}. Shows complexity of scheme eligibility criteria.` : `${t}. Fallback complexity panel.` }))}
          />
          <InsightsText text={hoverText.eligibilityDepth} fallback={hasSchemeData ? "Hover to inspect low/medium/high eligibility complexity bands." : "Schemes feed unavailable; showing fallback metrics."} />
        </div>

        <div className="panel card-pad an-card">
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span className="uppercase-xs">Required Docs Complexity</span>
            <span style={{ fontSize: 10, color: "var(--muted)" }}>Documents</span>
          </div>
          <HBarInteractive
            data={hasSchemeData ? schemesDocComplexity : oppRows}
            onHover={(t) => setHoverText((p) => ({ ...p, docComplexity: hasSchemeData ? `${t}. Indicates application burden by document requirements.` : `${t}. Fallback complexity panel.` }))}
          />
          <InsightsText text={hoverText.docComplexity} fallback={hasSchemeData ? "Hover to see how many schemes demand heavier document bundles." : "Schemes feed unavailable; showing fallback metrics."} />
        </div>

        <div className="panel card-pad an-card">
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span className="uppercase-xs">{hasSchemeData ? "Scheme Availability Split" : "Engagement Availability Split"}</span>
            <span style={{ fontSize: 10, color: "var(--muted)" }}>Status</span>
          </div>
          <DonutBreakdown
            segments={schemeActiveRows}
            onHover={(t) => setHoverText((p) => ({ ...p, schemeStatus: hasSchemeData ? `${t}. Indicates maintainability and document readiness.` : `${t}. Scheme feed unavailable, showing engagement availability distribution.` }))}
          />
          <InsightsText text={hoverText.schemeStatus} fallback={hasSchemeData ? "Hover segments to read scheme status and document-readiness context." : "Showing engagement split while scheme availability feed is unavailable."} />
        </div>
      </div>

      {recommendations.length > 0 && (
        <div className="panel card-pad">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <WandSparkles size={13} color="#16a34a" />
            <span className="uppercase-xs">AI Recommendations</span>
          </div>
          <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
            {recommendations.map((r, idx) => (
              <li key={idx} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 12 }}>
                <span style={{ width: 20, height: 20, borderRadius: "50%", background: "var(--soft-subtle)", border: "1px solid var(--soft-strong)", color: "#16a34a", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{idx + 1}</span>
                <span style={{ color: "var(--muted)", lineHeight: 1.5 }}>{r}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="panel card-pad">
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}><span className="uppercase-xs">Farmer Lookup</span></div>
        <div style={{ display: "flex", gap: 8 }}>
          <input className="field" value={farmerId} onChange={(e) => setFarmerId(e.target.value)} onKeyDown={(e) => e.key === "Enter" && loadFarmerSummary()} placeholder="Farmer ID, name, or phone..." style={{ flex: 1 }} />
          <button type="button" className="btn-primary" onClick={loadFarmerSummary} disabled={farmerLoading}>{farmerLoading ? "..." : "Lookup"}</button>
        </div>
        {farmerSummary ? (
          <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {Object.entries(farmerSummary?.totals || {}).map(([k, v]) => (
              <div key={k} className="panel" style={{ padding: "10px 12px" }}>
                <div className="uppercase-xs">{k.replace(/_/g, " ")}</div>
                <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>{fmt(v)}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="muted" style={{ fontSize: 12, marginTop: 10 }}>Enter a farmer ID to load individual analytics summary.</div>
        )}
      </div>
    </div>
  );
};

export default Analytics;
