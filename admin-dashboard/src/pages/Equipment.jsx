import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  RefreshCw,
  Search,
  TrendingUp,
  TrendingDown,
  Tractor,
  MapPin,
  Layers,
  BarChart3,
} from "lucide-react";
import { apiTry, withQuery } from "../api/client";

const STYLE_ID = "equipment-market-v1-style";
if (!document.getElementById(STYLE_ID)) {
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .eqm-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(320px, 1fr)); gap:12px; }
    .eqm-card { border:1px solid var(--soft-strong); border-radius:12px; background:var(--app-shell-gradient); padding:14px; }
    .eqm-title { font-size:10px; color:var(--muted); text-transform:uppercase; letter-spacing:.08em; }
    .eqm-value { font-size:24px; font-weight:700; color:var(--text); line-height:1.05; }
    .eqm-hover { min-height:36px; margin-top:8px; font-size:11px; color:var(--muted); line-height:1.35; }
    .eqm-table-wrap { overflow:auto; border:1px solid var(--soft); border-radius:10px; }
    .eqm-table { width:100%; border-collapse:collapse; min-width:900px; }
    .eqm-table th { font-size:10px; letter-spacing:.07em; text-transform:uppercase; color:var(--muted); text-align:left; padding:10px 12px; border-bottom:1px solid var(--soft); background:var(--soft-subtle); }
    .eqm-table td { padding:10px 12px; border-bottom:1px solid var(--soft); font-size:12px; color:var(--text); }
    .eqm-table tr:hover { background:var(--soft-subtle); }
    .eqm-full { grid-column:1 / -1; }
    .eqm-toolbar { display:flex; flex-wrap:wrap; gap:8px; align-items:center; }
    .eqm-input, .eqm-select { height:32px; border:1px solid var(--soft-strong); border-radius:8px; background:var(--surface); color:var(--text); font-size:12px; }
    .eqm-input { padding:0 10px 0 30px; width:220px; }
    .eqm-select { padding:0 10px; }
    .eqm-badge { font-size:10px; color:var(--muted); border:1px solid var(--soft); border-radius:999px; padding:3px 8px; }
    .eqm-instrument-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(170px, 1fr)); gap:8px; }
    .eqm-instrument-btn { border:1px solid var(--soft); background:var(--surface); border-radius:10px; padding:8px; text-align:left; cursor:pointer; color:var(--text); }
    .eqm-instrument-btn:hover { border-color:var(--soft-strong); background:var(--soft-subtle); }
    .eqm-instrument-btn.active { border-color:#16a34a; box-shadow:inset 0 0 0 1px rgba(22,163,74,0.3); }
    .eqm-tooltip { position:fixed; z-index:70; pointer-events:none; max-width:280px; background:rgba(15,23,42,0.95); color:#e2e8f0; border:1px solid rgba(148,163,184,0.4); border-radius:10px; padding:8px 10px; font-size:11px; line-height:1.35; box-shadow:0 10px 30px rgba(2,6,23,0.32); }
    @media (max-width: 920px) {
      .eqm-input { width:100%; flex:1 1 200px; }
    }
  `;
  document.head.appendChild(style);
}

const COLORS = ["#16a34a", "#0ea5e9", "#f59e0b", "#8b5cf6", "#ef4444", "#14b8a6"];

const fmt = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return "-";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
};

const money = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? `Rs ${fmt(n)}` : "-";
};

const keyify = (name) => String(name || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const parsePeriod = (p) => {
  const s = String(p || "").trim();
  if (/^\d{4}-\d{2}$/.test(s)) return new Date(`${s}-01T00:00:00Z`).getTime();
  const t = Date.parse(s);
  return Number.isNaN(t) ? 0 : t;
};

const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

const extractRows = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.history)) return payload.history;
  return [];
};

const numOrZero = (...vals) => {
  let fallback = 0;
  for (const v of vals) {
    if (v === null || v === undefined || v === "") continue;
    const n = Number(v);
    if (!Number.isFinite(n)) continue;
    fallback = n;
    if (n > 0) return n;
  }
  return fallback;
};

const strOrEmpty = (...vals) => {
  for (const v of vals) {
    const s = String(v || "").trim();
    if (s) return s;
  }
  return "";
};

const normalizeProvider = (row) => ({
  id: strOrEmpty(row?.id, row?.rental_id),
  name: strOrEmpty(row?.name, row?.equipment_name, row?.equipment, row?.equipment_type, row?.title),
  category: strOrEmpty(row?.category, row?.equipment_category, row?.type),
  state: strOrEmpty(row?.state, row?.location?.state),
  district: strOrEmpty(row?.district, row?.city, row?.location?.district, row?.location?.city),
  provider_name: strOrEmpty(row?.provider_name, row?.provider?.name),
  rate_daily: numOrZero(row?.rate_daily, row?.rates?.daily, row?.price_per_day, row?.daily_rate, row?.rental_rate, row?.rate),
  rate_hourly: numOrZero(row?.rate_hourly, row?.rates?.hourly, row?.price_per_hour, row?.hourly_rate),
  updated_at: strOrEmpty(row?.updated_at, row?.created_at, row?._ingested_at),
});

const normalizeHistory = (row) => ({
  equipment_name: strOrEmpty(row?.equipment_name, row?.name, row?.equipment),
  period: strOrEmpty(row?.period, row?.month, row?.date),
  state: strOrEmpty(row?.state),
  category: strOrEmpty(row?.category),
  rate_daily: numOrZero(row?.rate_daily, row?.rates?.daily),
  rate_hourly: numOrZero(row?.rate_hourly, row?.rates?.hourly),
  sample_size: numOrZero(row?.sample_size, row?.count, row?.samples),
});

const LineIndexChart = ({ data = [], onHover, onLeave, metricLabel = "Daily" }) => {
  const W = 1400;
  const H = 340;
  const PAD = { l: 56, r: 24, t: 20, b: 54 };
  const iw = W - PAD.l - PAD.r;
  const ih = H - PAD.t - PAD.b;

  const vals = data.map((d) => Number(d.value || 0));
  const max = Math.max(...vals, 1);
  const min = Math.min(...vals, 0);
  const range = max - min || 1;

  const point = (v, i) => ({
    x: PAD.l + (i / Math.max(1, data.length - 1)) * iw,
    y: PAD.t + ih - ((v - min) / range) * ih,
  });

  const path = vals
    .map((v, i) => {
      const p = point(v, i);
      return `${i === 0 ? "M" : "L"}${p.x},${p.y}`;
    })
    .join(" ");

  const areaPath = `${path} L${PAD.l + iw},${PAD.t + ih} L${PAD.l},${PAD.t + ih} Z`;
  const markStep = Math.max(1, Math.ceil(data.length / 48));

  const ticks = data.length <= 1
    ? [0]
    : [0, Math.floor((data.length - 1) / 3), Math.floor(((data.length - 1) * 2) / 3), data.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 340 }} onMouseLeave={onLeave}>
      {Array.from({ length: 4 }).map((_, i) => {
        const y = PAD.t + (i / 3) * ih;
        const label = max - (i / 3) * range;
        return (
          <g key={i}>
            <line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y} stroke="var(--soft-strong)" strokeWidth="1.2" />
            <text x={PAD.l - 8} y={y + 4} textAnchor="end" fill="var(--text)" fontSize="11">{money(label)}</text>
          </g>
        );
      })}

      <path d={areaPath} fill="rgba(22,163,74,0.16)" />
      <path d={path} fill="none" stroke="#16a34a" strokeWidth="2.8" strokeLinecap="round" />
      {vals.map((v, i) => {
        if (i % markStep !== 0 && i !== vals.length - 1) return null;
        const p = point(v, i);
        const label = data[i]?.label || "-";
        const sample = Number(data[i]?.sample || 0);
        return (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="4"
            fill="#16a34a"
            onMouseMove={(e) => onHover?.(e, [`${label}`, `${metricLabel}: ${money(v)}`, `Samples: ${fmt(sample)}`])}
          />
        );
      })}

      {ticks.filter((v, i, arr) => arr.indexOf(v) === i).map((idx) => {
        const x = point(vals[idx] || 0, idx).x;
        return (
          <text key={idx} x={x} y={H - 18} textAnchor="middle" fill="var(--text)" fontSize="11">
            {String(data[idx]?.label || "").slice(2)}
          </text>
        );
      })}
    </svg>
  );
};

const CandlestickChart = ({ data = [], onHover, onLeave, metricLabel = "Daily" }) => {
  const W = 1400;
  const H = 360;
  const PAD = { l: 64, r: 26, t: 20, b: 58 };
  const iw = W - PAD.l - PAD.r;
  const ih = H - PAD.t - PAD.b;

  const highs = data.map((d) => Number(d.high || 0));
  const lows = data.map((d) => Number(d.low || 0));
  const max = Math.max(...highs, 1);
  const min = Math.min(...lows, 0);
  const range = max - min || 1;

  const yOf = (v) => PAD.t + ih - ((v - min) / range) * ih;
  const slot = iw / Math.max(1, data.length);
  const candleW = Math.max(6, Math.min(16, slot * 0.42));
  const ticks = data.length <= 1
    ? [0]
    : [0, Math.floor((data.length - 1) / 2), data.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 360 }} onMouseLeave={onLeave}>
      {Array.from({ length: 4 }).map((_, i) => {
        const y = PAD.t + (i / 3) * ih;
        const label = max - (i / 3) * range;
        return (
          <g key={i}>
            <line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y} stroke="var(--soft-strong)" strokeWidth="1.2" />
            <text x={PAD.l - 8} y={y + 4} textAnchor="end" fill="var(--text)" fontSize="11">{money(label)}</text>
          </g>
        );
      })}

      {data.map((d, i) => {
        const x = PAD.l + (i + 0.5) * slot;
        const open = Number(d.open || 0);
        const high = Number(d.high || 0);
        const low = Number(d.low || 0);
        const close = Number(d.close || 0);
        const up = close >= open;
        const color = up ? "#16a34a" : "#ef4444";
        const bodyTop = yOf(Math.max(open, close));
        const bodyBottom = yOf(Math.min(open, close));
        const bodyH = Math.max(3, bodyBottom - bodyTop);

        return (
          <g
            key={`${d.label}-${i}`}
            onMouseMove={(e) => onHover?.(e, [
              `${d.label}`,
              `O ${money(open)} | H ${money(high)} | L ${money(low)} | C ${money(close)}`,
              `${metricLabel} change: ${open > 0 ? `${(((close - open) / open) * 100).toFixed(2)}%` : "0.00%"}`,
            ])}
          >
            <line x1={x} y1={yOf(high)} x2={x} y2={yOf(low)} stroke={color} strokeWidth="2" />
            <rect
              x={x - candleW / 2}
              y={bodyTop}
              width={candleW}
              height={bodyH}
              rx="1.2"
              fill={up ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}
              stroke={color}
              strokeWidth="1.6"
            />
          </g>
        );
      })}

      {ticks.filter((v, i, arr) => arr.indexOf(v) === i).map((idx) => {
        const x = PAD.l + (idx + 0.5) * slot;
        return (
          <text key={idx} x={x} y={H - 18} textAnchor="middle" fill="var(--text)" fontSize="11">
            {String(data[idx]?.label || "").slice(2)}
          </text>
        );
      })}
    </svg>
  );
};

const Bars = ({ data = [], onHover, onLeave }) => {
  const max = Math.max(...data.map((d) => Number(d.value || 0)), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {data.map((d, i) => {
        const val = Number(d.value || 0);
        return (
          <div
            key={`${d.label}-${i}`}
            onMouseMove={(e) => onHover?.(e, [`${d.label}`, `Value: ${fmt(val)}`, `${Math.round((val / max) * 100)}% of top`])}
            onMouseLeave={onLeave}
            style={{ display: "grid", gridTemplateColumns: "minmax(100px, 36%) 1fr 84px", gap: 10, alignItems: "center" }}
          >
            <span style={{ fontSize: 12, color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.label}</span>
            <div style={{ height: 9, borderRadius: 999, background: "var(--soft)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.max(2, (val / max) * 100)}%`, borderRadius: 999, background: d.color || COLORS[i % COLORS.length] }} />
            </div>
            <span style={{ fontSize: 12, textAlign: "right", fontWeight: 700 }}>{fmt(val)}</span>
          </div>
        );
      })}
    </div>
  );
};

const MiniSpark = ({ values = [] }) => {
  if (!values.length) return <span style={{ color: "var(--faint)" }}>-</span>;
  const max = Math.max(...values, 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 22, width: 84 }}>
      {values.slice(-12).map((v, i) => (
        <div key={i} style={{ width: 5, borderRadius: 2, height: `${Math.max(10, (v / max) * 100)}%`, background: i === values.slice(-12).length - 1 ? "#16a34a" : "rgba(34,197,94,0.45)" }} />
      ))}
    </div>
  );
};

const Equipment = ({ refreshToken = 0 }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [providers, setProviders] = useState([]);
  const [histories, setHistories] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loadMeta, setLoadMeta] = useState({ providersRaw: 0, providersNorm: 0, historiesRaw: 0, bookingsRaw: 0 });
  const [tooltip, setTooltip] = useState({ show: false, x: 0, y: 0, lines: [] });
  const [historyCache, setHistoryCache] = useState({});
  const [historyLoading, setHistoryLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [metric, setMetric] = useState("rate_daily");
  const [selectedEquipment, setSelectedEquipment] = useState("");

  const showTooltip = useCallback((e, lines) => {
    const x = Number(e?.clientX || 0);
    const y = Number(e?.clientY || 0);
    const vw = window.innerWidth || 1400;
    const vh = window.innerHeight || 900;
    const boxW = 290;
    const boxH = Math.max(56, (Array.isArray(lines) ? lines.length : 1) * 18 + 16);
    const nx = Math.min(vw - boxW - 12, x + 14);
    const ny = y + boxH + 20 > vh ? Math.max(12, y - boxH - 12) : y + 14;
    setTooltip({ show: true, x: nx, y: ny, lines: Array.isArray(lines) ? lines : [String(lines || "")] });
  }, []);

  const hideTooltip = useCallback(() => {
    setTooltip((t) => (t.show ? { ...t, show: false } : t));
  }, []);

  const fetchAllCollection = useCallback(async (collection, maxPages = 20, perPage = 200, search = "", forceRefresh = false) => {
    let page = 1;
    let totalPages = 1;
    const all = [];
    while (page <= totalPages && page <= maxPages) {
      try {
        const payload = await apiTry([
          withQuery(`/api/v1/admin/data/collection/${collection}`, {
            page,
            per_page: perPage,
            search,
            refresh: forceRefresh ? 1 : undefined,
          }),
        ], {}, { forceRefresh });
        const rows = payload?.items || [];
        all.push(...rows);
        totalPages = Number(payload?.total_pages || 1);
        if (!rows.length) break;
        page += 1;
      } catch {
        // Keep already-fetched pages instead of failing the whole dashboard load.
        break;
      }
    }
    return all;
  }, []);

  const load = useCallback(async (forceRefresh = false, allowRetry = true) => {
    setLoading(true);
    setError(null);
    try {
      let providerPayload = null;
      try {
        providerPayload = await apiTry([
          withQuery("/api/v1/admin/data/equipment-providers", { refresh: forceRefresh ? 1 : undefined }),
        ], {}, { forceRefresh });
      } catch {
        providerPayload = null;
      }

      const safeFetchCollection = async (collection, pages = 20, pageSize = 200) => {
        try {
          return await fetchAllCollection(collection, pages, pageSize, "", forceRefresh);
        } catch {
          return [];
        }
      };

      const providerRowsDirect = extractRows(providerPayload);
      const needProviderFallback = !providerRowsDirect.length;

      const [providerRowsPaged, providerRowsOperational, equipmentRows, historyRowsRaw, bookingRowsRaw] = await Promise.all([
        needProviderFallback ? safeFetchCollection("ref_equipment_providers", 4, 200) : Promise.resolve([]),
        safeFetchCollection("equipment_rental_rates", 2, 200),
        safeFetchCollection("equipment", 2, 200),
        safeFetchCollection("ref_equipment_rate_history", 6, 200),
        safeFetchCollection("equipment_bookings", 2, 200),
      ]);

      const mergedProviderRows = [
        ...providerRowsDirect,
        ...providerRowsPaged,
        ...providerRowsOperational,
        ...equipmentRows,
      ];
      const normalizedProviders = mergedProviderRows
        .map(normalizeProvider)
        .filter((r) => r.name && (r.rate_daily > 0 || r.rate_hourly > 0));

      let normalizedHistories = historyRowsRaw
        .map(normalizeHistory)
        .filter((r) => r.equipment_name && r.period && (r.rate_daily > 0 || r.rate_hourly > 0));

      if (!normalizedHistories.length && normalizedProviders.length) {
        normalizedHistories = normalizedProviders
          .map((p) => {
            const t = Date.parse(p.updated_at || "") || Date.now();
            const period = new Date(t).toISOString().slice(0, 7);
            return {
              equipment_name: p.name,
              period,
              state: p.state,
              category: p.category,
              rate_daily: p.rate_daily,
              rate_hourly: p.rate_hourly,
              sample_size: 1,
            };
          })
          .filter((r) => r.equipment_name && (r.rate_daily > 0 || r.rate_hourly > 0));
      }

      setProviders(normalizedProviders);
      setHistories(normalizedHistories);
      setBookings(bookingRowsRaw);
      setLoadMeta({
        providersRaw: mergedProviderRows.length,
        providersNorm: normalizedProviders.length,
        historiesRaw: normalizedHistories.length,
        bookingsRaw: bookingRowsRaw.length,
      });

      if (!normalizedProviders.length && !normalizedHistories.length) {
        if (!forceRefresh && allowRetry) {
          await load(true, false);
          return;
        }
        setError("Equipment data source reachable but no mappable rows found");
      }
    } catch (e) {
      setError(e.message || "Unable to load equipment market data");
      setProviders([]);
      setHistories([]);
      setBookings([]);
      setLoadMeta({ providersRaw: 0, providersNorm: 0, historiesRaw: 0, bookingsRaw: 0 });
    } finally {
      setLoading(false);
    }
  }, [fetchAllCollection]);

  useEffect(() => { load(refreshToken > 0); }, [load, refreshToken]);

  useEffect(() => {
    if (!selectedEquipment) return;
    if (historyCache[selectedEquipment]) return;

    let cancelled = false;
    const selectedLabel = strOrEmpty(
      histories.find((h) => keyify(h.equipment_name || h.name) === selectedEquipment)?.equipment_name,
      providers.find((p) => keyify(p.name || p.equipment_name) === selectedEquipment)?.name,
    );
    if (!selectedLabel) return;

    const loadSelectedHistory = async () => {
      setHistoryLoading(true);
      let rows = [];

      try {
        const payload = await apiTry([
          withQuery("/api/v1/equipment/rental-rates/rate-history", { equipment_name: selectedLabel }),
        ]);
        rows = extractRows(payload);
      } catch {
        rows = [];
      }

      if (!rows.length) {
        rows = await fetchAllCollection("ref_equipment_rate_history", 12, 200, selectedLabel);
      }

      const normalized = rows
        .map(normalizeHistory)
        .filter((r) => keyify(r.equipment_name) === selectedEquipment && r.period && (r.rate_daily > 0 || r.rate_hourly > 0));

      if (!cancelled) {
        setHistoryCache((prev) => ({ ...prev, [selectedEquipment]: normalized }));
        setHistoryLoading(false);
      }
    };

    loadSelectedHistory();

    return () => {
      cancelled = true;
    };
  }, [selectedEquipment, historyCache, histories, providers, fetchAllCollection]);

  const allStates = useMemo(() => ["All", ...Array.from(new Set(providers.map((p) => String(p.state || "").trim()).filter(Boolean))).sort()], [providers]);
  const allCategories = useMemo(() => ["All", ...Array.from(new Set(providers.map((p) => String(p.category || "").trim()).filter(Boolean))).sort()], [providers]);

  const filteredProviders = useMemo(() => {
    return providers.filter((p) => {
      if (stateFilter !== "All" && String(p.state || "") !== stateFilter) return false;
      if (categoryFilter !== "All" && String(p.category || "") !== categoryFilter) return false;
      if (search && !JSON.stringify(p).toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [providers, search, stateFilter, categoryFilter]);

  const historyByEquipment = useMemo(() => {
    const map = new Map();
    histories.forEach((h) => {
      const name = String(h.equipment_name || h.name || "").trim();
      if (!name) return;
      const key = keyify(name);
      if (!map.has(key)) map.set(key, { label: name, rows: [] });
      map.get(key).rows.push(h);
    });

    map.forEach((entry) => {
      entry.rows.sort((a, b) => parsePeriod(a.period) - parsePeriod(b.period));
    });
    return map;
  }, [histories]);

  const providersByEquipment = useMemo(() => {
    const map = new Map();
    filteredProviders.forEach((p) => {
      const name = String(p.name || p.equipment_name || "").trim();
      if (!name) return;
      const k = keyify(name);
      if (!map.has(k)) map.set(k, { label: name, rows: [] });
      map.get(k).rows.push(p);
    });
    return map;
  }, [filteredProviders]);

  const equipmentUniverse = useMemo(() => {
    const keys = new Set([...historyByEquipment.keys(), ...providersByEquipment.keys()]);
    const out = [];
    keys.forEach((k) => {
      const h = historyByEquipment.get(k)?.rows || [];
      const p = providersByEquipment.get(k)?.rows || [];
      const label = historyByEquipment.get(k)?.label || providersByEquipment.get(k)?.label || k;

      const metricVals = h.map((x) => Number(x[metric] || 0)).filter((v) => v > 0);
      const pDaily = p.map((x) => Number(x.rate_daily || 0)).filter((v) => v > 0);
      const pHourly = p.map((x) => Number(x.rate_hourly || 0)).filter((v) => v > 0);

      const series = metricVals.length ? metricVals : metric === "rate_hourly" ? pHourly : pDaily;
      const last = series.length ? series[series.length - 1] : 0;
      const prev = series.length > 1 ? series[series.length - 2] : 0;
      const deltaPct = prev > 0 ? ((last - prev) / prev) * 100 : 0;

      out.push({
        key: k,
        label,
        listings: p.length,
        last,
        prev,
        deltaPct,
        spark: series,
      });
    });

    out.sort((a, b) => b.last - a.last);
    return out;
  }, [historyByEquipment, providersByEquipment, metric]);

  useEffect(() => {
    if (!selectedEquipment && equipmentUniverse.length) setSelectedEquipment(equipmentUniverse[0].key);
    if (selectedEquipment && !equipmentUniverse.find((e) => e.key === selectedEquipment) && equipmentUniverse.length) {
      setSelectedEquipment(equipmentUniverse[0].key);
    }
  }, [equipmentUniverse, selectedEquipment]);

  const selectedTrend = useMemo(() => {
    if (!selectedEquipment) return [];
    const hRows = historyCache[selectedEquipment]?.length
      ? historyCache[selectedEquipment]
      : historyByEquipment.get(selectedEquipment)?.rows || [];
    const byPeriod = new Map();
    hRows.forEach((r) => {
      const period = String(r.period || "").trim();
      const value = Number(r[metric] || 0);
      if (!period || !Number.isFinite(value) || value <= 0) return;
      if (!byPeriod.has(period)) byPeriod.set(period, []);
      byPeriod.get(period).push(value);
    });

    const trend = [...byPeriod.entries()]
      .sort((a, b) => parsePeriod(a[0]) - parsePeriod(b[0]))
      .map(([label, vals]) => ({ label, value: avg(vals), sample: vals.length }))
      .filter((r) => r.value > 0);

    if (trend.length) return trend;

    const pRows = providersByEquipment.get(selectedEquipment)?.rows || [];
    const vals = pRows
      .map((r) => Number(metric === "rate_hourly" ? r.rate_hourly : r.rate_daily))
      .filter((v) => Number.isFinite(v) && v > 0);
    return vals.length ? [{ label: "Current", value: avg(vals), sample: vals.length }] : [];
  }, [selectedEquipment, historyCache, historyByEquipment, providersByEquipment, metric]);

  const selectedOhlc = useMemo(() => {
    if (!selectedEquipment) return [];
    const hRows = historyCache[selectedEquipment]?.length
      ? historyCache[selectedEquipment]
      : historyByEquipment.get(selectedEquipment)?.rows || [];
    if (!hRows.length) return [];

    const buckets = new Map();
    hRows.forEach((r) => {
      const rawPeriod = String(r.period || "").trim();
      const t = parsePeriod(rawPeriod);
      if (!t) return;

      const monthKey = new Date(t).toISOString().slice(0, 7);
      const value = Number(r[metric] || 0);
      if (!Number.isFinite(value) || value <= 0) return;

      if (!buckets.has(monthKey)) buckets.set(monthKey, []);
      buckets.get(monthKey).push({ t, value });
    });

    return [...buckets.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([label, rows]) => {
        const sorted = [...rows].sort((a, b) => a.t - b.t);
        const vals = sorted.map((x) => x.value);
        return {
          label,
          open: vals[0] || 0,
          high: Math.max(...vals, 0),
          low: Math.min(...vals, 0),
          close: vals[vals.length - 1] || 0,
          count: vals.length,
        };
      })
      .filter((x) => x.high > 0)
      .slice(-18);
  }, [selectedEquipment, historyCache, historyByEquipment, metric]);

  const topMovers = useMemo(() => {
    return [...equipmentUniverse]
      .filter((e) => Number.isFinite(e.deltaPct) && e.spark.length > 1)
      .sort((a, b) => Math.abs(b.deltaPct) - Math.abs(a.deltaPct))
      .slice(0, 12)
      .map((e, i) => ({
        label: e.label,
        value: Math.abs(e.deltaPct),
        color: e.deltaPct >= 0 ? "#16a34a" : "#ef4444",
        signed: e.deltaPct,
        rank: i + 1,
      }));
  }, [equipmentUniverse]);

  const stateLiquidity = useMemo(() => {
    const stateMap = new Map();
    filteredProviders.forEach((p) => {
      const state = String(p.state || "Unknown").trim() || "Unknown";
      const daily = Number(p.rate_daily || 0);
      const hourly = Number(p.rate_hourly || 0);
      if (!stateMap.has(state)) stateMap.set(state, { daily: [], hourly: [], count: 0 });
      const row = stateMap.get(state);
      if (daily > 0) row.daily.push(daily);
      if (hourly > 0) row.hourly.push(hourly);
      row.count += 1;
    });

    return [...stateMap.entries()]
      .map(([label, v], i) => ({
        label,
        value: metric === "rate_hourly" ? avg(v.hourly) : avg(v.daily),
        listings: v.count,
        color: COLORS[i % COLORS.length],
      }))
      .filter((x) => x.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filteredProviders, metric]);

  const categoryMomentum = useMemo(() => {
    const catMap = new Map();
    filteredProviders.forEach((p) => {
      const cat = String(p.category || "Other").trim() || "Other";
      const val = Number(metric === "rate_hourly" ? p.rate_hourly : p.rate_daily);
      if (!catMap.has(cat)) catMap.set(cat, []);
      if (val > 0) catMap.get(cat).push(val);
    });

    return [...catMap.entries()]
      .map(([label, vals], i) => ({ label, value: avg(vals), color: COLORS[i % COLORS.length] }))
      .filter((x) => x.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filteredProviders, metric]);

  const bookingPulse = useMemo(() => {
    const map = new Map();
    bookings.forEach((b) => {
      const raw = b.created_at || b.updated_at || b.start_date || b.booking_date;
      const t = Date.parse(raw || "");
      if (Number.isNaN(t)) return;
      const key = new Date(t).toISOString().slice(0, 10);
      map.set(key, (map.get(key) || 0) + 1);
    });
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-30)
      .map(([label, value]) => ({ label, value }));
  }, [bookings]);

  const totalListings = filteredProviders.length;
  const trackedEquipment = equipmentUniverse.length;
  const avgDaily = avg(filteredProviders.map((p) => Number(p.rate_daily || 0)).filter((v) => v > 0));
  const avgHourly = avg(filteredProviders.map((p) => Number(p.rate_hourly || 0)).filter((v) => v > 0));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, color: "var(--text)", fontWeight: 700 }}>Equipment Market Intelligence</h2>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3 }}>Stock-market view for equipment rates, liquidity, momentum, and booking pulse.</div>
        </div>
        <button type="button" className="btn-ghost" onClick={() => load(true)} disabled={loading} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <RefreshCw size={13} className={loading ? "mkt-spin" : ""} />
          {loading ? "Refreshing..." : "Refresh Feed"}
        </button>
      </div>

      {error && <div className="eqm-card" style={{ borderColor: "var(--danger)", color: "var(--danger)", fontSize: 13 }}>Failed to load equipment market data: {error}</div>}

      <div className="eqm-toolbar eqm-card">
        <div style={{ position: "relative" }}>
          <Search size={13} color="var(--muted)" style={{ position: "absolute", left: 10, top: 10 }} />
          <input className="eqm-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search equipment/provider/state..." />
        </div>
        <select className="eqm-select" value={stateFilter} onChange={(e) => setStateFilter(e.target.value)}>
          {allStates.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="eqm-select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          {allCategories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="eqm-select" value={metric} onChange={(e) => setMetric(e.target.value)}>
          <option value="rate_daily">Daily Rate</option>
          <option value="rate_hourly">Hourly Rate</option>
        </select>
        <span className="eqm-badge">Listings {fmt(totalListings)}</span>
        <span className="eqm-badge">Equipment {fmt(trackedEquipment)}</span>
        <span className="eqm-badge">Bookings {fmt(bookings.length)}</span>
        <span className="eqm-badge">Providers Raw {fmt(loadMeta.providersRaw)}</span>
        <span className="eqm-badge">Providers Mapped {fmt(loadMeta.providersNorm)}</span>
        <span className="eqm-badge">History Points {fmt(loadMeta.historiesRaw)}</span>
      </div>

      <div className="eqm-grid">
        <div className="eqm-card eqm-full">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span className="eqm-title" style={{ color: "var(--text)" }}>Equipment Cards</span>
            <span className="eqm-badge">Tap card to focus charts</span>
          </div>
          <div className="eqm-instrument-grid">
            {equipmentUniverse.map((e) => (
              <button
                key={e.key}
                type="button"
                className={`eqm-instrument-btn ${selectedEquipment === e.key ? "active" : ""}`}
                onClick={() => setSelectedEquipment(e.key)}
                onMouseMove={(evt) => showTooltip(evt, [e.label, `Last: ${money(e.last)}`, `Change: ${e.deltaPct >= 0 ? "+" : ""}${e.deltaPct.toFixed(2)}%`, `Listings: ${fmt(e.listings)}`])}
                onMouseLeave={hideTooltip}
              >
                <div style={{ fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.label}</div>
                <div style={{ fontSize: 11, marginTop: 5 }}>{money(e.last)}</div>
                <div style={{ fontSize: 11, marginTop: 3, color: e.deltaPct >= 0 ? "#16a34a" : "#ef4444", fontWeight: 700 }}>
                  {e.deltaPct >= 0 ? "+" : ""}{e.deltaPct.toFixed(2)}%
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="eqm-card">
          <div className="eqm-title">Avg Daily</div>
          <div className="eqm-value">{money(avgDaily)}</div>
        </div>
        <div className="eqm-card">
          <div className="eqm-title">Avg Hourly</div>
          <div className="eqm-value">{money(avgHourly)}</div>
        </div>
        <div className="eqm-card">
          <div className="eqm-title">Active States</div>
          <div className="eqm-value">{fmt(allStates.length - 1)}</div>
        </div>
        <div className="eqm-card">
          <div className="eqm-title">History Rows</div>
          <div className="eqm-value">{fmt(histories.length)}</div>
        </div>

        <div className="eqm-card eqm-full">
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, gap: 8, flexWrap: "wrap" }}>
            <span className="eqm-title" style={{ color: "var(--text)" }}>Equipment Index</span>
            <select className="eqm-select" value={selectedEquipment} onChange={(e) => setSelectedEquipment(e.target.value)}>
              {equipmentUniverse.map((e) => <option key={e.key} value={e.key}>{e.label}</option>)}
            </select>
          </div>
          {selectedTrend.length ? (
            <div style={{ overflowX: "auto" }}>
              <div style={{ minWidth: 1260 }}>
                <LineIndexChart
                  data={selectedTrend}
                  metricLabel={metric === "rate_hourly" ? "Hourly" : "Daily"}
                  onHover={showTooltip}
                  onLeave={hideTooltip}
                />
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: "var(--muted)", padding: "18px 0" }}>
              {historyLoading ? "Loading equipment timeline..." : "No trend points found for selected equipment."}
            </div>
          )}
          <div className="eqm-hover">{`Periods: ${fmt(selectedTrend.length)} · Equipment-specific backend timeline`}</div>
        </div>

        <div className="eqm-card eqm-full">
          <div className="eqm-title" style={{ color: "var(--text)", marginBottom: 10 }}>Monthly OHLC</div>
          {selectedOhlc.length ? (
            <div style={{ overflowX: "auto" }}>
              <div style={{ minWidth: 1260 }}>
                <CandlestickChart
                  data={selectedOhlc}
                  metricLabel={metric === "rate_hourly" ? "Hourly" : "Daily"}
                  onHover={showTooltip}
                  onLeave={hideTooltip}
                />
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: "var(--muted)", padding: "16px 0" }}>
              {historyLoading ? "Building OHLC candles from backend history..." : "No monthly OHLC candles available for selected equipment and metric."}
            </div>
          )}
          <div className="eqm-hover">Monthly open-high-low-close distribution by selected equipment.</div>
        </div>

        <div className="eqm-card">
          <div className="eqm-title" style={{ marginBottom: 10 }}>Top Movers</div>
          <Bars
            data={topMovers.map((m) => ({ label: `${m.rank}. ${m.label}`, value: m.value, color: m.color }))}
            onHover={(evt, lines) => {
              const idx = Number(String(lines?.[0] || "").split(".")[0]) - 1;
              const m = topMovers[idx];
              if (m) showTooltip(evt, [m.label, `Trend: ${m.signed >= 0 ? "+" : ""}${m.signed.toFixed(2)}%`, `Rank: ${m.rank}`]);
            }}
            onLeave={hideTooltip}
          />
          <div className="eqm-hover">Biggest movers by signed rate trend.</div>
        </div>

        <div className="eqm-card">
          <div className="eqm-title" style={{ marginBottom: 10 }}>State Liquidity</div>
          <Bars
            data={stateLiquidity.map((s) => ({ label: `${s.label} (${s.listings})`, value: s.value, color: s.color }))}
            onHover={(evt, lines) => showTooltip(evt, [...lines, `Metric: avg ${metric === "rate_hourly" ? "hourly" : "daily"} rate`])}
            onLeave={hideTooltip}
          />
          <div className="eqm-hover">State-level average pricing and listing depth.</div>
        </div>

        <div className="eqm-card">
          <div className="eqm-title" style={{ marginBottom: 10 }}>Category Momentum</div>
          <Bars
            data={categoryMomentum}
            onHover={(evt, lines) => showTooltip(evt, [...lines, "Category average from filtered listings"])}
            onLeave={hideTooltip}
          />
          <div className="eqm-hover">Category momentum based on average equipment rates.</div>
        </div>

        <div className="eqm-card">
          <div className="eqm-title" style={{ marginBottom: 10 }}>Booking Pulse (30d)</div>
          {bookingPulse.length ? (
            <Bars
              data={bookingPulse.map((b, i) => ({ label: b.label.slice(5), value: b.value, color: i === bookingPulse.length - 1 ? "#16a34a" : "rgba(34,197,94,0.55)" }))}
              onHover={(evt, lines) => showTooltip(evt, [lines?.[0] || "", `${lines?.[1] || ""} bookings`])}
              onLeave={hideTooltip}
            />
          ) : (
            <div style={{ fontSize: 12, color: "var(--muted)", padding: "16px 0" }}>No booking pulse data available.</div>
          )}
          <div className="eqm-hover">Recent booking demand curve (last 30 days).</div>
        </div>

        <div className="eqm-card eqm-full">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span className="eqm-title" style={{ color: "var(--text)" }}>All Equipment Tickers</span>
            <span className="eqm-badge">Showing {fmt(equipmentUniverse.length)} instruments</span>
          </div>
          <div className="eqm-table-wrap">
            <table className="eqm-table">
              <thead>
                <tr>
                  <th>Equipment</th>
                  <th>Listings</th>
                  <th>Last Rate</th>
                  <th>Prev Rate</th>
                  <th>Change %</th>
                  <th>Spark</th>
                </tr>
              </thead>
              <tbody>
                {equipmentUniverse.map((e) => (
                  <tr
                    key={e.key}
                    onMouseMove={(evt) => showTooltip(evt, [e.label, `Last ${money(e.last)} | Prev ${money(e.prev)}`, `Change ${e.deltaPct >= 0 ? "+" : ""}${e.deltaPct.toFixed(2)}%`])}
                    onMouseLeave={hideTooltip}
                  >
                    <td>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <Tractor size={13} color="#16a34a" />
                        <span>{e.label}</span>
                      </div>
                    </td>
                    <td>{fmt(e.listings)}</td>
                    <td>{money(e.last)}</td>
                    <td>{money(e.prev)}</td>
                    <td>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: e.deltaPct >= 0 ? "#16a34a" : "#ef4444", fontWeight: 700 }}>
                        {e.deltaPct >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {e.deltaPct >= 0 ? "+" : ""}{Number.isFinite(e.deltaPct) ? e.deltaPct.toFixed(2) : "0.00"}%
                      </span>
                    </td>
                    <td><MiniSpark values={e.spark} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="eqm-hover">All instruments with last/prev rate and spark trend.</div>
        </div>
      </div>

      {tooltip.show && (
        <div className="eqm-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
          {tooltip.lines.map((line, idx) => (
            <div key={`${line}-${idx}`} style={{ fontWeight: idx === 0 ? 700 : 500 }}>{line}</div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Equipment;
