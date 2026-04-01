import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { WandSparkles, RefreshCw, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { apiTry } from "../api/client";
import SparkLine from "../components/charts/SparkLine";

/* ═══════════════════════════════════════════════════════════════════════════
   INJECT STYLES
═══════════════════════════════════════════════════════════════════════════ */
const STYLE_ID = "analytics-v2-style";
if (!document.getElementById(STYLE_ID)) {
  const el = document.createElement("style");
  el.id = STYLE_ID;
  el.textContent = `
    @keyframes an-fade { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:none; } }
    @keyframes an-glow { 0%,100% { box-shadow:0 0 8px rgba(34,197,94,0.3); } 50% { box-shadow:0 0 24px rgba(34,197,94,0.7); } }
    @keyframes an-spin { to { stroke-dashoffset: 0; } }
    @keyframes an-bar { from { transform: scaleX(0); } to { transform: scaleX(1); } }
    @keyframes an-count { from { opacity:0; } to { opacity:1; } }
    @keyframes an-pulse-dot { 0%,100% { transform:scale(1); opacity:1; } 50% { transform:scale(1.6); opacity:0.5; } }
    @keyframes an-heatrow { from { opacity:0; transform:translateX(-8px); } to { opacity:1; transform:none; } }
    .an-fade { animation: an-fade 0.35s ease both; }
    .an-bar-fill { transform-origin: left; animation: an-bar 0.6s cubic-bezier(.2,.9,.3,1) both; }
    .an-card:hover { border-color: rgba(34,197,94,0.3) !important; }
    .an-heat-cell { transition: opacity 0.2s; cursor: default; }
    .an-heat-cell:hover { opacity: 0.7; }
  `;
  document.head.appendChild(el);
}

/* ═══════════════════════════════════════════════════════════════════════════
   MINI HELPERS
═══════════════════════════════════════════════════════════════════════════ */
const G = "#22c55e";
const B = "#60a5fa";
const O = "#f59e0b";
const P = "#a78bfa";
const R = "#f87171";

const fmt = (n) => {
  const v = Number(n);
  if (isNaN(v)) return String(n || "—");
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + "M";
  if (v >= 1_000) return (v / 1_000).toFixed(1) + "K";
  return v.toLocaleString();
};

const delta = (v) => {
  const n = Number(v);
  if (!n) return null;
  const pos = n > 0;
  return (
    <span style={{ fontSize: 10, fontWeight: 600, color: pos ? G : R, display: "inline-flex", alignItems: "center", gap: 2 }}>
      {pos ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
      {pos ? "+" : ""}{n}%
    </span>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   SVG ANIMATED LINE CHART
═══════════════════════════════════════════════════════════════════════════ */
const SvgLineChart = ({ series = [], labels = [], height = 160 }) => {
  const W = 800, H = height;
  const allVals = series.flatMap((s) => s.values || []);
  const min = Math.min(...(allVals.length ? allVals : [0]));
  const max = Math.max(...(allVals.length ? allVals : [100]));
  const range = max - min || 1;
  const PAD = { t: 12, b: 24, l: 8, r: 8 };
  const iW = W - PAD.l - PAD.r;
  const iH = H - PAD.t - PAD.b;

  const pt = (v, i, len) => ({
    x: PAD.l + (i / (len - 1 || 1)) * iW,
    y: PAD.t + iH - ((v - min) / range) * iH,
  });

  const smooth = (vals) => {
    const pts = vals.map((v, i) => pt(v, i, vals.length));
    return pts.map((p, i) => {
      if (i === 0) return `M${p.x},${p.y}`;
      const prev = pts[i - 1];
      const cx = (prev.x + p.x) / 2;
      return `C${cx},${prev.y} ${cx},${p.y} ${p.x},${p.y}`;
    }).join(" ");
  };

  const area = (vals, color) => {
    if (!Array.isArray(vals) || vals.length === 0) return "";
    const pts = vals.map((v, i) => pt(v, i, vals.length));
    const line = smooth(vals);
    const last = pts[pts.length - 1];
    const first = pts[0];
    if (!last || !first) return line;
    return `${line} L${last.x},${PAD.t + iH} L${first.x},${PAD.t + iH} Z`;
  };

  const gridLines = 4;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height, overflow: "visible" }}>
      <defs>
        {series.map((s, i) => (
          <linearGradient key={i} id={`lg-${i}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={s.color || G} stopOpacity="0.25" />
            <stop offset="100%" stopColor={s.color || G} stopOpacity="0" />
          </linearGradient>
        ))}
      </defs>
      {/* grid */}
      {Array.from({ length: gridLines }).map((_, i) => {
        const y = PAD.t + (i / (gridLines - 1)) * iH;
        const val = max - (i / (gridLines - 1)) * range;
        return (
          <g key={i}>
            <line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
            <text x={PAD.l} y={y - 3} fill="rgba(255,255,255,0.2)" fontSize="9" fontFamily="inherit">{fmt(val)}</text>
          </g>
        );
      })}
      {/* areas */}
      {series.map((s, i) => {
        const vals = Array.isArray(s.values) ? s.values : [];
        if (!vals.length) return null;
        return <path key={`a${i}`} d={area(vals, s.color)} fill={`url(#lg-${i})`} />;
      })}
      {/* lines */}
      {series.map((s, i) => {
        const vals = Array.isArray(s.values) ? s.values : [];
        if (!vals.length) return null;
        return <path key={`l${i}`} d={smooth(vals)} fill="none" stroke={s.color || G} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />;
      })}
      {/* dots at last point */}
      {series.map((s, i) => {
        const vals = s.values || [];
        if (!vals.length) return null;
        const p = pt(vals[vals.length - 1], vals.length - 1, vals.length);
        return (
          <g key={`d${i}`}>
            <circle cx={p.x} cy={p.y} r="4" fill={s.color || G} />
            <circle cx={p.x} cy={p.y} r="8" fill={s.color || G} fillOpacity="0.2" />
          </g>
        );
      })}
      {/* x labels */}
      {labels.length > 0 && [0, Math.floor(labels.length / 2), labels.length - 1].map((idx) => {
        const p = pt(0, idx, labels.length);
        return <text key={idx} x={p.x} y={H - 4} textAnchor="middle" fill="rgba(255,255,255,0.25)" fontSize="9" fontFamily="inherit">{labels[idx]}</text>;
      })}
    </svg>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   ANIMATED RING CHART
═══════════════════════════════════════════════════════════════════════════ */
const RingChart = ({ segments = [], size = 140, thickness = 18, label, sublabel }) => {
  const cx = size / 2, cy = size / 2, r = (size - thickness) / 2 - 4;
  const circ = 2 * Math.PI * r;
  const total = segments.reduce((a, s) => a + (s.value || 0), 0) || 1;
  let offset = 0;

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={thickness} />
        {segments.map((s, i) => {
          const dash = (s.value / total) * circ;
          const gap = circ - dash;
          const el = (
            <circle key={i} cx={cx} cy={cy} r={r} fill="none"
              stroke={s.color} strokeWidth={thickness}
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={-offset}
              strokeLinecap="round"
            />
          );
          offset += dash;
          return el;
        })}
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 20, fontWeight: 700, color: "var(--text)" }}>{label}</span>
        {sublabel && <span style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>{sublabel}</span>}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   RADAR CHART
═══════════════════════════════════════════════════════════════════════════ */
const RadarChart = ({ axes = [], size = 200 }) => {
  const cx = size / 2, cy = size / 2, r = size / 2 - 20;
  const n = axes.length;
  const angle = (i) => ((i / n) * 2 * Math.PI) - Math.PI / 2;
  const pt = (i, ratio) => ({
    x: cx + r * ratio * Math.cos(angle(i)),
    y: cy + r * ratio * Math.sin(angle(i)),
  });

  const rings = [0.25, 0.5, 0.75, 1.0];
  const dataPath = axes.map((a, i) => {
    const p = pt(i, a.value / 100);
    return `${i === 0 ? "M" : "L"}${p.x},${p.y}`;
  }).join(" ") + " Z";

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: "visible" }}>
      {/* rings */}
      {rings.map((ratio, ri) => (
        <polygon key={ri}
          points={Array.from({ length: n }, (_, i) => { const p = pt(i, ratio); return `${p.x},${p.y}`; }).join(" ")}
          fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1"
        />
      ))}
      {/* spokes */}
      {axes.map((_, i) => {
        const p = pt(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.07)" strokeWidth="1" />;
      })}
      {/* data */}
      <path d={dataPath} fill="rgba(34,197,94,0.15)" stroke={G} strokeWidth="2" strokeLinejoin="round" />
      {axes.map((a, i) => {
        const p = pt(i, a.value / 100);
        return <circle key={i} cx={p.x} cy={p.y} r="3.5" fill={G} />;
      })}
      {/* labels */}
      {axes.map((a, i) => {
        const p = pt(i, 1.22);
        return (
          <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central"
            fill="rgba(255,255,255,0.5)" fontSize="9" fontFamily="inherit">
            {a.label}
          </text>
        );
      })}
    </svg>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   HORIZONTAL BAR (animated)
═══════════════════════════════════════════════════════════════════════════ */
const HBar = ({ data = [], color = G, delay = 0 }) => {
  const max = Math.max(...data.map((d) => d.value || 0), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {data.map((row, i) => (
        <div key={row.label} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, animationDelay: `${delay + i * 60}ms` }} className="an-fade">
          <span style={{ width: 90, color: "var(--muted)", fontSize: 11, flexShrink: 0, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{row.label}</span>
          <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
            <div className="an-bar-fill" style={{ height: "100%", width: `${(row.value / max) * 100}%`, background: row.color || color, borderRadius: 3, animationDelay: `${delay + i * 60}ms` }} />
          </div>
          <span style={{ width: 48, textAlign: "right", color: "var(--text)", fontWeight: 600, fontSize: 11 }}>{fmt(row.value)}</span>
        </div>
      ))}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   HEATMAP (7×N grid — activity by day/hour mock)
═══════════════════════════════════════════════════════════════════════════ */
const Heatmap = ({ data = [] }) => {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const hours = Array.from({ length: 12 }, (_, i) => `${(i * 2).toString().padStart(2, "0")}:00`);
  const max = Math.max(...data.flat(), 1);

  // generate mock if empty
  const grid = data.length === 7 ? data : days.map((_, di) =>
    hours.map((_, hi) => {
      const h = 0;
      const base = Math.sin((di + hi) * 0.9) * 40 + 50;
      return Math.max(0, Math.round(base + Math.random() * 30));
    })
  );

  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ display: "grid", gridTemplateColumns: `36px repeat(${hours.length}, 1fr)`, gap: 3, minWidth: 500 }}>
        {/* header */}
        <div />
        {hours.map((h) => <div key={h} style={{ fontSize: 8, color: "var(--muted)", textAlign: "center" }}>{h}</div>)}
        {/* rows */}
        {grid.map((row, di) => (
          <>
            <div key={`d${di}`} style={{ fontSize: 9, color: "var(--muted)", display: "flex", alignItems: "center" }}>{days[di]}</div>
            {row.map((val, hi) => {
              const ratio = val / max;
              return (
                <div key={hi} className="an-heat-cell" title={`${days[di]} ${hours[hi]}: ${val}`}
                  style={{
                    height: 16,
                    borderRadius: 2,
                    background: `rgba(34,197,94,${0.05 + ratio * 0.7})`,
                    border: "1px solid rgba(34,197,94,0.08)",
                  }}
                />
              );
            })}
          </>
        ))}
      </div>
      <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
        <span style={{ fontSize: 9, color: "var(--muted)" }}>Low</span>
        {[0.05, 0.2, 0.4, 0.6, 0.75].map((o) => (
          <div key={o} style={{ width: 12, height: 12, borderRadius: 2, background: `rgba(34,197,94,${o})` }} />
        ))}
        <span style={{ fontSize: 9, color: "var(--muted)" }}>High</span>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   STAT CARD with sparkline
═══════════════════════════════════════════════════════════════════════════ */
const StatCard = ({ title, value, sub, trend, spark = [], color = G, icon }) => (
  <div className="panel an-card" style={{ padding: "14px 16px", cursor: "default", transition: "border-color 0.2s" }}>
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
      <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--muted)" }}>{title}</span>
      {trend !== undefined ? delta(trend) : icon}
    </div>
    <div style={{ fontSize: 26, fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>{fmt(value)}</div>
    {sub && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>{sub}</div>}
    {spark.length > 0 && (
      <div style={{ marginTop: 10, opacity: 0.7 }}>
        <SparkLine data={spark} color={color} height={36} strokeWidth={1.5} />
      </div>
    )}
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════════
   LIVE TICKER
═══════════════════════════════════════════════════════════════════════════ */
const Ticker = ({ items = [] }) => {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (!items.length) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % items.length), 3000);
    return () => clearInterval(t);
  }, [items.length]);
  if (!items.length) return null;
  const item = items[idx];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--muted)", padding: "6px 14px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6 }}>
      <div style={{ width: 6, height: 6, borderRadius: "50%", background: G, animation: "an-pulse-dot 1.5s ease-in-out infinite", flexShrink: 0 }} />
      <span style={{ color: G, fontWeight: 600, flexShrink: 0 }}>AI REC</span>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item}</span>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */
const Analytics = () => {
  const [windowDays, setWindowDays] = useState(30);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stateFocus, setStateFocus] = useState("all");
  const [farmerId, setFarmerId] = useState("");
  const [farmerSummary, setFarmerSummary] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [farmerLoading, setFarmerLoading] = useState(false);

  /* ── load overview ── */
  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiTry([
        `/api/v1/analytics/overview?days=${windowDays}`,
        `/api/v1/analytics/admin/overview?window_days=${windowDays}`,
      ]);
      setOverview(data);
    } catch (err) {
      setError(err.message || "Failed to load analytics overview");
      setOverview(null);
    } finally {
      setLoading(false);
    }
  }, [windowDays]);

  useEffect(() => { loadOverview(); }, [loadOverview]);

  /* ── generate snapshot ── */
  const generateSnapshot = useCallback(async () => {
    setGenerating(true);
    try {
      await apiTry(
        [`/api/v1/analytics/snapshots/generate?days=${windowDays}`, "/api/v1/analytics/admin/generate"],
        { method: "POST", body: JSON.stringify({}) }
      );
      await loadOverview();
    } finally {
      setGenerating(false);
    }
  }, [loadOverview, windowDays]);

  /* ── farmer lookup ── */
  const loadFarmerSummary = useCallback(async () => {
    if (!farmerId.trim()) return;
    setFarmerLoading(true);
    try {
      const data = await apiTry([
        `/api/v1/analytics/farmer/${farmerId}/summary?days=30`,
        `/api/v1/analytics/farmer/${farmerId}/summary`,
      ]);
      setFarmerSummary(data);
    } catch {
      setFarmerSummary(null);
    } finally {
      setFarmerLoading(false);
    }
  }, [farmerId]);

  /* ── derived data ── */
  const scoreCards = overview?.scorecard || [];
  const growth = overview?.growth_trends || {};
  const engagement = overview?.engagement || {};
  const operational = overview?.operational_health || {};
  const marketIntel = overview?.market_intelligence || {};
  const opportunities = overview?.opportunities || {};
  const recommendations = overview?.recommendations || [];

  const growthLabels = (growth.farmers || []).map((p) => p.date || p.label || "");
  const farmerVals = (growth.farmers || []).map((p) => Number(p.value || 0));
  const cropVals = (growth.crops || []).map((p) => Number(p.value || 0));

  const topStates = operational.top_states || [];
  const stateBarsAll = topStates.map((s) => ({ label: s.state || "-", value: Number(s.farmers || 0) }));
  const stateBars = stateFocus === "all" ? stateBarsAll : stateBarsAll.filter((s) => s.label === stateFocus);

  const totalFarmerCard = scoreCards.find((x) => String(x.title || "").toLowerCase().includes("total farmers"));
  const totalFarmers = Number(totalFarmerCard?.value || 0);
  const activeFarmers = Number(engagement.active_farmers || 0);
  const riskFarmers = Math.max(totalFarmers - activeFarmers, 0);
  const voiceSessions = Number(engagement.voice_sessions_window || 0);
  const activeRatio = totalFarmers ? Math.round((activeFarmers / totalFarmers) * 100) : 70;

  const commodityBars = (marketIntel.top_commodities || []).map((c, i) => ({
    label: c.commodity || c.label || "-",
    value: Number(c.value || c.count || 0),
    color: [G, B, O, P, R][i % 5],
  }));

  const oppRows = [
    { label: "Without Crops", value: Number(opportunities.farmers_without_crops || 0), color: O, badge: "CRITICAL" },
    { label: "Inactive 30d+", value: Number(opportunities.inactive_farmers || 0), color: R, badge: "MEDIUM" },
    { label: "District Gaps", value: Number(opportunities.district_coverage_gaps || 0), color: B, badge: "URGENT" },
  ];
  const oppMax = Math.max(...oppRows.map((o) => o.value), 1);

  const radarAxes = [
    { label: "Farmers", value: Math.min(100, totalFarmers / 2000) },
    { label: "Active%", value: activeRatio },
    { label: "Voice", value: Math.min(100, voiceSessions / 50) },
    { label: "Markets", value: Math.min(100, commodityBars.length * 20) },
    { label: "Schemes", value: Math.min(100, Number(operational.schemes_count || 0) / 10) },
    { label: "Coverage", value: Math.min(100, topStates.length * 5) },
  ].map((a) => ({ ...a, value: Math.max(5, Math.round(a.value)) }));

  /* sparklines from growth data */
  const farmerSpark = farmerVals.slice(-12);
  const cropSpark = cropVals.slice(-12);

  /* ── RENDER ── */
  return (
    <div className="space-y-3 an-fade">

      {/* ── TOP BAR ─────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Analytics</h2>
          {overview && (
            <span style={{ fontSize: 10, color: "var(--muted)", borderLeft: "1px solid var(--border)", paddingLeft: 10 }}>
              {overview.window_days || windowDays}d window · generated {overview.generated_at ? new Date(overview.generated_at).toLocaleTimeString() : "—"}
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          {[7, 30, 90].map((d) => (
            <button key={d} type="button"
              className={`btn-ghost ${windowDays === d ? "btn-primary" : ""}`}
              onClick={() => setWindowDays(d)}
              style={windowDays === d ? { background: "var(--accent)", color: "#000", borderColor: "var(--accent)" } : {}}
            >{d}d</button>
          ))}
          <button type="button" className="btn-ghost" onClick={generateSnapshot} disabled={generating}
            style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {generating ? <RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} /> : <WandSparkles size={13} />}
            {generating ? "Generating…" : "Generate Snapshot"}
          </button>
        </div>
      </div>

      {/* ── AI TICKER ───────────────────────────────────────────────────── */}
      {recommendations.length > 0 && <Ticker items={recommendations} />}

      {loading && <div className="panel card-pad muted" style={{ fontSize: 13 }}>Loading analytics…</div>}
      {error && <div className="panel card-pad" style={{ borderColor: "var(--danger)", background: "rgba(239,68,68,0.06)", fontSize: 13, color: "var(--danger)" }}>{error}</div>}

      {/* ── SCORE CARDS ─────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
        {scoreCards.length > 0
          ? scoreCards.map((card, i) => (
              <StatCard
                key={card.title}
                title={card.title}
                value={card.value}
                sub={card.context}
                trend={card.delta}
                spark={i === 0 ? farmerSpark : i === 1 ? cropSpark : []}
                color={[G, B, O, P][i % 4]}
              />
            ))
          : /* loading skeletons */
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="panel skeleton-row" style={{ height: 100 }} />
            ))
        }
      </div>

      {/* ── GROWTH + ENGAGEMENT ROW ─────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 300px", gap: 10 }}>

        {/* Growth line chart */}
        <div className="panel card-pad">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span className="uppercase-xs">Growth Trends</span>
            <div style={{ display: "flex", gap: 12, fontSize: 10 }}>
              {[{ label: "Farmers", color: G }, { label: "Crops", color: B }].map((s) => (
                <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--muted)" }}>
                  <div style={{ width: 20, height: 2, background: s.color, borderRadius: 1 }} />
                  {s.label}
                </div>
              ))}
            </div>
          </div>
          <SvgLineChart
            series={[
              { name: "Farmers", color: G, values: farmerVals },
              { name: "Crops", color: B, values: cropVals },
            ]}
            labels={growthLabels}
            height={170}
          />
        </div>

        {/* Top States */}
        <div className="panel card-pad">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span className="uppercase-xs">Top States</span>
            <select className="field" value={stateFocus} onChange={(e) => setStateFocus(e.target.value)} style={{ width: 130, height: 26, fontSize: 11 }}>
              <option value="all">All states</option>
              {topStates.map((s) => <option key={s.state} value={s.state}>{s.state}</option>)}
            </select>
          </div>
          <HBar data={stateBars} color={G} />
        </div>

        {/* Engagement ring */}
        <div className="panel card-pad" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <span className="uppercase-xs" style={{ alignSelf: "flex-start" }}>Engagement</span>
          <RingChart
            segments={[
              { label: "Active", value: activeFarmers, color: G },
              { label: "At Risk", value: riskFarmers, color: R },
              { label: "Voice", value: voiceSessions, color: B },
            ]}
            label={`${activeRatio}%`}
            sublabel="Active"
            size={130}
            thickness={16}
          />
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 5 }}>
            {[
              { label: "Active Farmers", val: activeFarmers, color: G },
              { label: "At Risk", val: riskFarmers, color: R },
              { label: "Voice Sessions", val: voiceSessions, color: B },
            ].map((row) => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--muted)" }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: row.color }} />
                  {row.label}
                </span>
                <span style={{ fontWeight: 600, color: "var(--text)" }}>{fmt(row.val)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── OPPORTUNITIES + RADAR + COMMODITIES ─────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 220px 1fr", gap: 10 }}>

        {/* Opportunities */}
        <div className="panel card-pad">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <span className="uppercase-xs">System Opportunities</span>
            <span style={{ fontSize: 9, color: "var(--muted)" }}>Last sync: {new Date().toLocaleTimeString()}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {oppRows.map((row, i) => (
              <div key={row.label} className="an-fade" style={{ animationDelay: `${i * 80}ms` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 13, color: "var(--text)" }}>{row.label}</span>
                    <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 3, background: `${row.color}18`, color: row.color, fontWeight: 700 }}>{row.badge}</span>
                  </div>
                  <span style={{ fontSize: 20, fontWeight: 700, color: row.color }}>{fmt(row.value)}</span>
                </div>
                <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
                  <div className="an-bar-fill" style={{
                    height: "100%", width: `${(row.value / oppMax) * 100}%`,
                    background: row.color, borderRadius: 2,
                    animationDelay: `${i * 80 + 100}ms`
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Radar */}
        <div className="panel card-pad" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <span className="uppercase-xs" style={{ alignSelf: "flex-start" }}>Health Radar</span>
          <RadarChart axes={radarAxes} size={180} />
        </div>

        {/* Commodity bars */}
        <div className="panel card-pad">
          <span className="uppercase-xs">Top Commodities</span>
          <div style={{ marginTop: 14 }}>
            {commodityBars.length > 0
              ? <HBar data={commodityBars} delay={100} />
              : <div className="muted" style={{ fontSize: 12 }}>No commodity data available.</div>
            }
          </div>
        </div>
      </div>

      {/* ── ACTIVITY HEATMAP ─────────────────────────────────────────────── */}
      <div className="panel card-pad">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <span className="uppercase-xs">Activity Heatmap (session density)</span>
          <span style={{ fontSize: 9, color: "var(--muted)" }}>Mock — real-time session data</span>
        </div>
        <Heatmap />
      </div>

      {/* ── AI RECOMMENDATIONS (full) ───────────────────────────────────── */}
      {recommendations.length > 0 && (
        <div className="panel card-pad">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <WandSparkles size={13} color={G} />
            <span className="uppercase-xs">AI Recommendations</span>
          </div>
          <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
            {recommendations.map((r, idx) => (
              <li key={idx} className="an-fade" style={{ animationDelay: `${idx * 50}ms`, display: "flex", alignItems: "flex-start", gap: 10, fontSize: 12 }}>
                <span style={{ flexShrink: 0, width: 20, height: 20, borderRadius: "50%", background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", color: G, fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{idx + 1}</span>
                <span style={{ color: "var(--muted)", lineHeight: 1.5 }}>{r}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* ── FARMER LOOKUP ───────────────────────────────────────────────── */}
      <div className="panel card-pad">
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span className="uppercase-xs">Farmer Lookup</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            className="field"
            value={farmerId}
            onChange={(e) => setFarmerId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadFarmerSummary()}
            placeholder="Farmer ID, name, or phone…"
            style={{ flex: 1 }}
          />
          <button type="button" className="btn-primary" onClick={loadFarmerSummary} disabled={farmerLoading}>
            {farmerLoading ? "…" : "Lookup"}
          </button>
        </div>
        {farmerSummary ? (
          <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {Object.entries(farmerSummary?.totals || {}).map(([k, v]) => (
              <div key={k} className="panel" style={{ padding: "10px 12px" }}>
                <div className="uppercase-xs">{k.replace(/_/g, " ")}</div>
                <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>{fmt(v)}</div>
              </div>
            ))}
            {farmerSummary?.recommendations?.length > 0 && (
              <div className="panel" style={{ padding: "10px 12px", gridColumn: "1 / -1" }}>
                <div className="uppercase-xs mb-2">Farmer AI Recommendations</div>
                {farmerSummary.recommendations.map((r, i) => (
                  <div key={i} style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>• {r}</div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="muted" style={{ fontSize: 12, marginTop: 10 }}>Enter a farmer ID to load individual analytics summary.</div>
        )}
      </div>
    </div>
  );
};

export default Analytics;