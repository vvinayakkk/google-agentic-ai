import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Search, SlidersHorizontal, ArrowUpDown,
  X, RefreshCw, Download,
  Database, ChevronRight, AlertCircle, Zap,
  Info, Clock, Activity,
} from "lucide-react";
import { DB_COLLECTIONS } from "../utils/constants";
import { apiTry, withQuery } from "../api/client";
import Modal from "../components/ui/Modal";

/* ─────────────────────────────────────────────
   Constants
───────────────────────────────────────────── */
const fallbackEndpointsByCollection = {
  users:                  ["/api/v1/admin/farmers"],
  farmer_profiles:        ["/api/v1/admin/farmers"],
  ref_farmer_schemes:     ["/api/v1/admin/data/schemes"],
  ref_equipment_providers:["/api/v1/admin/data/equipment-providers"],
  ref_data_ingestion_meta:["/api/v1/admin/data-freshness"],
  admin_users:            ["/api/v1/admin/admins"],
  analytics_snapshots:    ["/api/v1/admin/analytics/overview"],
  app_config:             ["/api/v1/admin/config"],
};

const GROUPS = [
  ["OPERATIONAL", DB_COLLECTIONS.operational],
  ["REFERENCE",   DB_COLLECTIONS.reference],
  ["GOVERNANCE",  DB_COLLECTIONS.governance],
];

const DEFAULT_QUERY_INPUT = '{\n  "filter": {},\n  "limit": 50\n}';

const DBX_STYLE_ID = "dbx-theme-v2";
const DBX_STYLES = `
  .dbx-page {
    background: var(--app-shell-gradient);
  }
  .dbx-glass {
    background: var(--app-shell-gradient);
    border: 1px solid var(--soft-strong);
    backdrop-filter: blur(5px);
    -webkit-backdrop-filter: blur(5px);
  }
  .dbx-chip-card {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: var(--app-shell-gradient);
    border: 1px solid var(--soft-strong);
    border-radius: 8px;
    padding: 3px 8px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }
`;

const existingDbxStyle = document.getElementById(DBX_STYLE_ID);
if (existingDbxStyle) {
  if (existingDbxStyle.textContent !== DBX_STYLES) {
    existingDbxStyle.textContent = DBX_STYLES;
  }
} else {
  const s = document.createElement("style");
  s.id = DBX_STYLE_ID;
  s.textContent = DBX_STYLES;
  document.head.appendChild(s);
}

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
const extractRows = (data) => {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== "object") return [];
  for (const k of ["items","rows","data","conversations","locations","districts","states","admins","messages","schemes","prices","mandis","sessions"]) {
    if (Array.isArray(data[k])) return data[k];
  }
  return [data];
};

const inferType = (val) => {
  if (val === null || val === undefined) return "null";
  if (typeof val === "boolean") return "boolean";
  if (typeof val === "number") return Number.isInteger(val) ? "integer" : "float";
  if (typeof val === "object") return Array.isArray(val) ? "array" : "object";
  const s = String(val);
  if (/^\d{4}-\d{2}-\d{2}T/.test(s) || /^\d{4}-\d{2}-\d{2}/.test(s)) return "datetime";
  if (/^[0-9a-f]{24}$/i.test(s) || /^[0-9a-f-]{36}$/i.test(s)) return "id";
  if (s.length < 20 && ["active","inactive","pending","approved","rejected","completed","cancelled","open","closed"].includes(s.toLowerCase())) return "enum";
  return "string";
};

const isPlainObject = (value) => value && typeof value === "object" && !Array.isArray(value);

const toComparable = (value) => {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const asNumber = Number(trimmed);
  if (!Number.isNaN(asNumber)) return asNumber;

  const asTime = Date.parse(trimmed);
  return Number.isNaN(asTime) ? null : asTime;
};

const matchesScalar = (actual, expected) => {
  if (typeof expected === "string") {
    return String(actual ?? "").toLowerCase().includes(expected.toLowerCase());
  }
  return actual === expected;
};

const matchesOperator = (actual, operator, expected) => {
  const actualCmp = toComparable(actual);
  const expectedCmp = toComparable(expected);

  switch (operator) {
    case "$eq": return matchesScalar(actual, expected);
    case "$ne": return !matchesScalar(actual, expected);
    case "$in": {
      if (!Array.isArray(expected)) return false;
      return expected.some((item) => matchesScalar(actual, item));
    }
    case "$nin": {
      if (!Array.isArray(expected)) return false;
      return expected.every((item) => !matchesScalar(actual, item));
    }
    case "$exists": return expected ? actual !== undefined && actual !== null : actual === undefined || actual === null;
    case "$regex": {
      try {
        const re = new RegExp(String(expected), "i");
        return re.test(String(actual ?? ""));
      } catch {
        return false;
      }
    }
    case "$gt": return actualCmp !== null && expectedCmp !== null ? actualCmp > expectedCmp : String(actual ?? "") > String(expected ?? "");
    case "$gte": return actualCmp !== null && expectedCmp !== null ? actualCmp >= expectedCmp : String(actual ?? "") >= String(expected ?? "");
    case "$lt": return actualCmp !== null && expectedCmp !== null ? actualCmp < expectedCmp : String(actual ?? "") < String(expected ?? "");
    case "$lte": return actualCmp !== null && expectedCmp !== null ? actualCmp <= expectedCmp : String(actual ?? "") <= String(expected ?? "");
    default: return false;
  }
};

const matchesCondition = (actual, condition) => {
  if (Array.isArray(actual)) {
    if (Array.isArray(condition)) {
      return condition.every((item) => actual.some((entry) => matchesScalar(entry, item)));
    }
    if (isPlainObject(condition)) {
      return actual.some((entry) => matchesCondition(entry, condition));
    }
    return actual.some((entry) => matchesScalar(entry, condition));
  }

  if (!isPlainObject(condition)) {
    return matchesScalar(actual, condition);
  }

  return Object.entries(condition).every(([operator, expected]) => {
    if (!operator.startsWith("$")) {
      return false;
    }
    return matchesOperator(actual, operator, expected);
  });
};

const rowMatchesFilter = (row, filter) => {
  if (!isPlainObject(filter) || Object.keys(filter).length === 0) return true;

  return Object.entries(filter).every(([field, condition]) => {
    if (field === "$or") {
      return Array.isArray(condition) && condition.some((item) => rowMatchesFilter(row, item));
    }
    if (field === "$and") {
      return Array.isArray(condition) && condition.every((item) => rowMatchesFilter(row, item));
    }
    return matchesCondition(row?.[field], condition);
  });
};

const applyQuerySort = (inputRows, sortSpec) => {
  if (!sortSpec) return inputRows;

  let sortKey = "";
  let direction = 1;

  if (typeof sortSpec === "string") {
    sortKey = sortSpec.startsWith("-") ? sortSpec.slice(1) : sortSpec;
    direction = sortSpec.startsWith("-") ? -1 : 1;
  } else if (isPlainObject(sortSpec) && typeof sortSpec.field === "string") {
    sortKey = sortSpec.field;
    const rawDir = String(sortSpec.direction ?? sortSpec.order ?? sortSpec.dir ?? "asc").toLowerCase();
    direction = rawDir === "desc" || rawDir === "-1" ? -1 : 1;
  } else if (isPlainObject(sortSpec)) {
    const [firstKey, firstDir] = Object.entries(sortSpec)[0] || [];
    sortKey = firstKey || "";
    direction = Number(firstDir) < 0 ? -1 : 1;
  }

  if (!sortKey) return inputRows;

  return [...inputRows].sort((a, b) => {
    const av = a?.[sortKey];
    const bv = b?.[sortKey];

    const ac = toComparable(av);
    const bc = toComparable(bv);

    if (ac !== null && bc !== null) {
      if (ac === bc) return 0;
      return ac > bc ? direction : -direction;
    }

    const as = String(av ?? "").toLowerCase();
    const bs = String(bv ?? "").toLowerCase();
    if (as === bs) return 0;
    return as > bs ? direction : -direction;
  });
};

const TYPE_STYLES = {
  string:   { bg: "var(--app-shell-gradient)", color: "var(--muted)", label: "string" },
  id:       { bg: "var(--app-shell-gradient)", color: "var(--muted)", label: "string" },
  integer:  { bg: "var(--app-shell-gradient)", color: "var(--muted)", label: "integer" },
  float:    { bg: "var(--app-shell-gradient)", color: "var(--muted)", label: "float" },
  datetime: { bg: "var(--app-shell-gradient)", color: "var(--muted)", label: "datetime" },
  boolean:  { bg: "var(--app-shell-gradient)", color: "var(--muted)", label: "boolean" },
  object:   { bg: "var(--app-shell-gradient)", color: "var(--muted)", label: "object" },
  array:    { bg: "var(--app-shell-gradient)", color: "var(--muted)", label: "array" },
  enum:     { bg: "var(--app-shell-gradient)", color: "var(--muted)", label: "enum" },
  null:     { bg: "var(--app-shell-gradient)", color: "var(--muted)", label: "null" },
};

const statusCard = (label, dotColor, textColor = "var(--muted)") => (
  <span className="dbx-chip-card" style={{ color: textColor }}>
    <span style={{ width: 6, height: 6, borderRadius: "50%", background: dotColor, flexShrink: 0 }} />
    {label}
  </span>
);

const FIELD_DESCRIPTIONS = {
  id:          "Unique record identifier (UUID v4)",
  _id:         "MongoDB document identifier",
  created_at:  "ISO 8601 formatted creation time",
  updated_at:  "ISO 8601 formatted update time",
  timestamp:   "ISO 8601 formatted ingestion time",
  phone:       "E.164 formatted phone number",
  name:        "Display name (UTF-8)",
  email:       "RFC 5321 email address",
  role:        "Access control role assignment",
  state:       "Indian state name",
  district:    "District within state",
  is_active:   "Record active/inactive flag",
  status:      "Lifecycle status value",
  metadata:    "Nested JSON for extended attributes",
  crop_type:   "Classification based on taxonomy v2",
  yield_qty:   "Metric quantity (high precision)",
  modal_price: "Weighted modal price (INR/Qtl)",
  commodity:   "Crop/commodity canonical name",
  market:      "APMC mandi name",
  min_price:   "Session minimum price",
  max_price:   "Session maximum price",
  farmer_id:   "Reference to farmer profile",
  session_id:  "Conversation session UUID",
  message:     "Natural language content",
  language:    "BCP-47 language code",
  pincode:     "India postal index code",
  village:     "Village name (vernacular)",
  latitude:    "WGS84 decimal latitude",
  longitude:   "WGS84 decimal longitude",
};

const fmtCell = (val) => {
  if (val === null || val === undefined) return <span style={{ color: "var(--faint)" }}>—</span>;
  const t = inferType(val);
  if (t === "float" || t === "integer") {
    return (
      <span style={{ color: "var(--text)", fontFamily: "monospace", fontWeight: 600, fontSize: 12 }}>
        {typeof val === "number" ? val.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : val}
      </span>
    );
  }
  if (t === "datetime") {
    const d = new Date(val);
    return (
      <span style={{ color: "var(--muted)", fontSize: 11, fontFamily: "monospace" }}>
        {d.toLocaleDateString("en-IN", { year: "numeric", month: "2-digit", day: "2-digit" })}
        <br />
        <span style={{ color: "var(--muted)" }}>{d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
      </span>
    );
  }
  if (t === "object" || t === "array") {
    return <span style={{ color: "var(--muted)", fontFamily: "monospace", fontSize: 10 }}>{JSON.stringify(val).slice(0, 60)}{JSON.stringify(val).length > 60 ? "…" : ""}</span>;
  }
  if (t === "boolean") {
    return statusCard(val ? "ACTIVE" : "INACTIVE", val ? "var(--text)" : "var(--faint)", "var(--text)");
  }
  const s = String(val);
  // Status-like values
  const statusColors = {
    active: "var(--text)",
    inactive: "var(--muted)",
    pending: "var(--muted)",
    approved: "var(--text)",
    rejected: "var(--faint)",
    completed: "var(--text)",
    cancelled: "var(--faint)",
  };
  if (statusColors[s.toLowerCase()]) {
    return statusCard(s, statusColors[s.toLowerCase()], "var(--text)");
  }
  return <span style={{ color: "var(--text)", fontSize: 12 }}>{s.length > 60 ? s.slice(0, 60) + "…" : s}</span>;
};

/* ─────────────────────────────────────────────
   Schema Inspector panel
───────────────────────────────────────────── */
const SchemaInspector = ({ rows, collection, freshness, onClose, onGenerateConfig }) => {
  const schema = useMemo(() => {
    if (!rows.length) return [];
    const sample = rows.slice(0, Math.min(rows.length, 50));
    return Object.keys(rows[0]).map((key) => {
      const vals = sample.map((r) => r[key]).filter((v) => v !== null && v !== undefined);
      const type = vals.length ? inferType(vals[0]) : "null";
      return { key, type, description: FIELD_DESCRIPTIONS[key] || `Field from ${collection}` };
    });
  }, [rows, collection]);

  const freshnessItem = useMemo(() => {
    const items = freshness?.items || [];
    return items.find((i) => i.collection === collection || i.dataset?.includes(collection));
  }, [freshness, collection]);

  return (
    <div style={{
      width: 280, flexShrink: 0,
      background: "var(--app-shell-gradient)", borderLeft: "1px solid var(--soft-strong)",
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 16px", borderBottom: "1px solid var(--soft-strong)",
      }}>
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--muted)" }}>Schema Inspector</span>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", padding: 2, display: "flex" }}>
          <X size={14} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }}>
        {/* Detection note */}
        <div style={{
          background: "var(--app-shell-gradient)", border: "1px solid var(--soft-strong)",
          borderRadius: 7, padding: "10px 12px", marginBottom: 16,
        }}>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", marginBottom: 5 }}>Detection Logic</div>
          <div style={{ fontSize: 11, color: "var(--text)", fontWeight: 600, marginBottom: 4 }}>Inferred from current records</div>
          <div style={{ fontSize: 10, color: "var(--muted)", lineHeight: 1.5 }}>
            No fixed schema found. System is providing field types inferred based on the top {Math.min(rows.length, 50)} ingestions.
          </div>
          {freshnessItem?.last_run_at && (
            <div style={{ fontSize: 10, color: "var(--faint)", marginTop: 6 }}>
              Last ingestion: {new Date(freshnessItem.last_run_at).toLocaleString("en-IN")}
            </div>
          )}
        </div>

        {/* Field definitions */}
        <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", marginBottom: 10 }}>Field Definitions</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {schema.map(({ key, type, description }) => {
            const ts = TYPE_STYLES[type] || TYPE_STYLES.string;
            return (
              <div key={key} style={{
                background: "var(--soft-subtle)", border: "1px solid var(--soft)",
                borderRadius: 6, padding: "9px 11px",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontFamily: "monospace", fontSize: 12, color: "var(--text)", fontWeight: 500 }}>{key}</span>
                  <span style={{
                    background: ts.bg, color: ts.color,
                    border: "1px solid var(--soft-strong)",
                    borderRadius: 7, fontSize: 9, fontWeight: 700,
                    padding: "1px 6px", textTransform: "lowercase",
                  }}>{ts.label}</span>
                </div>
                <div style={{ fontSize: 10, color: "var(--muted)", lineHeight: 1.5 }}>{description}</div>
              </div>
            );
          })}
          {schema.length === 0 && (
            <div style={{ fontSize: 11, color: "#444", textAlign: "center", paddingTop: 16 }}>Load a collection to inspect schema</div>
          )}
        </div>
      </div>

      {/* Generate button */}
      <div style={{ padding: "12px 16px", borderTop: "1px solid var(--soft)" }}>
        <button
          onClick={onGenerateConfig}
          style={{
            width: "100%", background: "var(--app-shell-gradient)", border: "1px solid var(--soft-strong)",
            borderRadius: 7, color: "var(--muted)", fontSize: 11, fontWeight: 700,
            padding: "9px 0", cursor: "pointer", fontFamily: "inherit",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--faint)"}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--soft-strong)"}
        >Generate Schema Config</button>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   Main component
───────────────────────────────────────────── */
const DatabaseExplorer = () => {
  const [collection, setCollection] = useState("users");
  const [rows, setRows] = useState([]);
  const [viewMode, setViewMode] = useState("table"); // table | json | query
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("");
  const [sortDir, setSortDir] = useState("desc");
  const [showFilter, setShowFilter] = useState(false);
  const [fieldFilter, setFieldFilter] = useState("__all");
  const [fieldValue, setFieldValue] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(50);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [freshness, setFreshness] = useState(null);
  const [schemaOpen, setSchemaOpen] = useState(true);
  const [syncLatency, setSyncLatency] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [queryInput, setQueryInput] = useState(DEFAULT_QUERY_INPUT);
  const [queryRunning, setQueryRunning] = useState(false);
  const [queryMeta, setQueryMeta] = useState(null);
  const [queryRows, setQueryRows] = useState([]);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [generatedConfig, setGeneratedConfig] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const configTextareaRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setQueryMeta(null);
    setQueryRows([]);
    const t0 = performance.now();
    try {
      const fallbackPerPage = Math.min(perPage, 100);
      const genericEndpoints = [
        withQuery(`/api/v1/admin/data/collection/${collection}`, { page, per_page: perPage }),
      ];
      const fallbackEndpoints = (fallbackEndpointsByCollection[collection] || []).flatMap((ep) => [
        withQuery(ep, { page, per_page: fallbackPerPage }), ep,
      ]);

      const data = await apiTry([...genericEndpoints, ...fallbackEndpoints]);
      const nextRows = extractRows(data);
      setRows(nextRows);
      const nextTotal = Number(data?.total);
      const nextPages = Number(data?.total_pages);
      setTotal(Number.isFinite(nextTotal) ? nextTotal : nextRows.length);
      setTotalPages(Number.isFinite(nextPages) && nextPages > 0 ? nextPages : 1);
      setSyncLatency(Math.round(performance.now() - t0));
      setLastUpdate(new Date().toISOString());

      const fresh = await apiTry(["/api/v1/admin/data-freshness"]).catch(() => null);
      setFreshness(fresh);
    } catch (err) {
      setRows([]); setTotal(0); setTotalPages(1);
      setError(err.message || "Failed to load collection");
    } finally {
      setLoading(false);
    }
  }, [collection, page, perPage]);

  useEffect(() => { setPage(1); }, [collection, perPage]);
  useEffect(() => { load(); }, [load]);

  const fieldOptions = useMemo(() => (rows[0] ? Object.keys(rows[0]) : []), [rows]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const fq = fieldValue.trim().toLowerCase();
    return rows.filter((row) => {
      if (q && !JSON.stringify(row).toLowerCase().includes(q)) return false;
      if (!fq) return true;
      if (fieldFilter === "__all") return JSON.stringify(row).toLowerCase().includes(fq);
      return String(row?.[fieldFilter] ?? "").toLowerCase().includes(fq);
    });
  }, [rows, search, fieldFilter, fieldValue]);

  const sortedRows = useMemo(() => {
    if (!sortKey) return filteredRows;
    const mult = sortDir === "asc" ? 1 : -1;
    return [...filteredRows].sort((a, b) => {
      const av = String(a?.[sortKey] ?? "").toLowerCase();
      const bv = String(b?.[sortKey] ?? "").toLowerCase();
      return av === bv ? 0 : av > bv ? mult : -mult;
    });
  }, [filteredRows, sortKey, sortDir]);

  const columns = useMemo(() => {
    if (!sortedRows.length) return [];
    return Object.keys(sortedRows[0]).slice(0, 10);
  }, [sortedRows]);

  const pageButtons = useMemo(() => {
    const out = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, start + 4);
    for (let p = start; p <= end; p++) out.push(p);
    return out;
  }, [page, totalPages]);

  const queryColumns = useMemo(() => {
    if (!queryRows.length) return [];
    return Object.keys(queryRows[0]).slice(0, 10);
  }, [queryRows]);

  const handleSort = (col) => {
    if (sortKey === col) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortKey(col); setSortDir("asc"); }
  };

  const runQuery = useCallback(async () => {
    const t0 = performance.now();
    setQueryRunning(true);
    setError(null);

    try {
      const parsed = JSON.parse(queryInput || "{}");
      if (!isPlainObject(parsed)) {
        throw new Error("Query JSON must be an object.");
      }

      const filter = isPlainObject(parsed.filter) ? parsed.filter : {};
      const searchText = typeof parsed.search === "string" ? parsed.search.trim() : "";

      const parsedPage = Number(parsed.page ?? 1);
      const parsedPerPage = Number(parsed.per_page ?? parsed.limit ?? perPage);
      let skip = Number(parsed.skip ?? parsed.offset ?? 0);

      if ((!parsed.skip && !parsed.offset) && Number.isFinite(parsedPage) && parsedPage > 1 && Number.isFinite(parsedPerPage) && parsedPerPage > 0) {
        skip = (Math.floor(parsedPage) - 1) * Math.floor(parsedPerPage);
      }

      skip = Number.isFinite(skip) && skip > 0 ? Math.floor(skip) : 0;

      const parsedLimit = Number(parsed.limit ?? parsedPerPage ?? perPage);
      const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.floor(parsedLimit) : perPage;
      const fetchSize = Math.min(500, Math.max(100, skip + limit, perPage));

      const genericEndpoints = [
        withQuery(`/api/v1/admin/data/collection/${collection}`, {
          page: 1,
          per_page: fetchSize,
          search: searchText || undefined,
        }),
      ];

      const fallbackEndpoints = (fallbackEndpointsByCollection[collection] || []).flatMap((endpoint) => [
        withQuery(endpoint, {
          page: 1,
          per_page: fetchSize,
          search: searchText || undefined,
        }),
        endpoint,
      ]);

      const data = await apiTry([...genericEndpoints, ...fallbackEndpoints]);
      const fetchedRows = extractRows(data);
      const filtered = fetchedRows.filter((row) => rowMatchesFilter(row, filter));
      const sorted = applyQuerySort(filtered, parsed.sort || parsed.order_by || null);
      const result = sorted.slice(skip, skip + limit);

      setRows(result);
      setQueryRows(result);
      setTotal(result.length);
      setTotalPages(1);
      setPage(1);
      setSyncLatency(Math.round(performance.now() - t0));
      setLastUpdate(new Date().toISOString());
      setQueryMeta({ fetched: fetchedRows.length, matched: filtered.length, returned: result.length });
    } catch (err) {
      setQueryRows([]);
      setError(err.message || "Failed to run query");
    } finally {
      setQueryRunning(false);
    }
  }, [collection, perPage, queryInput]);

  const handleGenerateConfig = useCallback(() => {
    const sourceRows = (sortedRows.length ? sortedRows : rows).slice(0, 50);
    const keys = [...new Set(sourceRows.flatMap((row) => Object.keys(row || {})))];

    const fields = keys.reduce((acc, key) => {
      const sample = sourceRows.map((row) => row?.[key]).find((v) => v !== null && v !== undefined);
      acc[key] = {
        type: inferType(sample),
        description: FIELD_DESCRIPTIONS[key] || `Field from ${collection}`,
      };
      return acc;
    }, {});

    const config = {
      collection,
      generated_at: new Date().toISOString(),
      sample_size: sourceRows.length,
      fields,
    };

    setGeneratedConfig(JSON.stringify(config, null, 2));
    setCopyStatus("");
    setConfigModalOpen(true);
  }, [collection, rows, sortedRows]);

  const handleCopyConfig = useCallback(async () => {
    if (!generatedConfig) return;

    try {
      await navigator.clipboard.writeText(generatedConfig);
      setCopyStatus("Copied to clipboard");
      return;
    } catch {
      if (configTextareaRef.current) {
        configTextareaRef.current.focus();
        configTextareaRef.current.select();
        const copied = document.execCommand("copy");
        setCopyStatus(copied ? "Copied to clipboard" : "Press Ctrl+C to copy");
      }
    }
  }, [generatedConfig]);

  return (
    <div className="dbx-page" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 68px)", overflow: "hidden", margin: "-24px", marginTop: 0 }}>

      {/* ── Top toolbar ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "10px 20px", borderBottom: "1px solid var(--soft-strong)",
        background: "var(--app-shell-gradient)", flexShrink: 0,
      }}>
        {/* Search */}
        <div style={{ position: "relative", width: 200 }}>
          <Search size={12} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "var(--faint)" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            style={{
              width: "100%", boxSizing: "border-box",
              background: "var(--surface)", border: "1px solid var(--soft-strong)",
              borderRadius: 6, height: 30, paddingLeft: 28, paddingRight: 10,
              fontSize: 12, color: "var(--text)", outline: "none", fontFamily: "inherit",
            }}
          />
        </div>

        {/* Filter */}
        <button
          onClick={() => setShowFilter((v) => !v)}
          style={{
            display: "flex", alignItems: "center", gap: 5,
            background: "var(--app-shell-gradient)",
            border: "1px solid var(--soft-strong)",
            borderRadius: 6, color: showFilter ? "var(--text)" : "var(--muted)", fontSize: 12,
            padding: "5px 12px", cursor: "pointer", fontFamily: "inherit",
          }}
        ><SlidersHorizontal size={12} /> Filter</button>

        {/* Sort */}
        <div style={{ position: "relative" }}>
          <button
            style={{
              display: "flex", alignItems: "center", gap: 5,
              background: "var(--app-shell-gradient)",
              border: "1px solid var(--soft-strong)",
              borderRadius: 6, color: sortKey ? "var(--text)" : "var(--muted)", fontSize: 12,
              padding: "5px 12px", cursor: "pointer", fontFamily: "inherit",
            }}
          ><ArrowUpDown size={12} /> Sort{sortKey ? `: ${sortKey}` : ""}</button>
        </div>

        {/* View mode pills */}
        <div style={{ display: "flex", border: "1px solid var(--soft-strong)", borderRadius: 6, overflow: "hidden", marginLeft: 4 }}>
          {[["table", "Table View"], ["json", "JSON View"], ["query", "Query"]].map(([mode, label]) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                background: viewMode === mode ? "var(--soft-strong)" : "transparent",
                border: "none", color: viewMode === mode ? "var(--text)" : "var(--muted)",
                fontSize: 11, fontWeight: viewMode === mode ? 700 : 400,
                padding: "6px 14px", cursor: "pointer", fontFamily: "inherit",
              }}
            >{label}</button>
          ))}
        </div>

        {/* Schema toggle */}
        <button
          onClick={() => setSchemaOpen((v) => !v)}
          style={{
            marginLeft: "auto",
            display: "flex", alignItems: "center", gap: 5,
            background: "var(--app-shell-gradient)",
            border: "1px solid var(--soft-strong)",
            borderRadius: 6, color: schemaOpen ? "var(--text)" : "var(--muted)", fontSize: 11,
            padding: "5px 12px", cursor: "pointer", fontFamily: "inherit",
          }}
        ><Info size={11} /> Schema Inspector</button>

        <button onClick={load} style={{ background: "none", border: "1px solid var(--soft-strong)", borderRadius: 6, color: "var(--muted)", padding: "5px 10px", cursor: "pointer", display: "flex" }}>
          <RefreshCw size={12} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
        </button>
      </div>

      {/* ── Filter bar (expandable) ── */}
      {showFilter && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "8px 20px", background: "var(--app-shell-gradient)",
          borderBottom: "1px solid var(--soft)", flexShrink: 0,
        }}>
          <span style={{ fontSize: 10, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>Field</span>
          <select
            value={fieldFilter}
            onChange={(e) => setFieldFilter(e.target.value)}
            style={{ background: "var(--surface)", border: "1px solid var(--soft-strong)", borderRadius: 5, height: 28, padding: "0 8px", fontSize: 11, color: "var(--muted)", fontFamily: "inherit", outline: "none" }}
          >
            <option value="__all">All fields</option>
            {fieldOptions.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
          <span style={{ fontSize: 10, color: "var(--muted)" }}>contains</span>
          <input
            value={fieldValue}
            onChange={(e) => setFieldValue(e.target.value)}
            placeholder="value..."
            style={{ background: "var(--surface)", border: "1px solid var(--soft-strong)", borderRadius: 5, height: 28, padding: "0 10px", fontSize: 11, color: "var(--text)", fontFamily: "inherit", outline: "none", width: 160 }}
          />
          <span style={{ fontSize: 10, color: "var(--muted)", marginLeft: 16 }}>Sort by</span>
          <select value={sortKey} onChange={(e) => setSortKey(e.target.value)} style={{ background: "var(--surface)", border: "1px solid var(--soft-strong)", borderRadius: 5, height: 28, padding: "0 8px", fontSize: 11, color: "var(--muted)", fontFamily: "inherit", outline: "none" }}>
            <option value="">— none —</option>
            {fieldOptions.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
          <select value={sortDir} onChange={(e) => setSortDir(e.target.value)} style={{ background: "var(--surface)", border: "1px solid var(--soft-strong)", borderRadius: 5, height: 28, padding: "0 8px", fontSize: 11, color: "var(--muted)", fontFamily: "inherit", outline: "none" }}>
            <option value="desc">Desc</option>
            <option value="asc">Asc</option>
          </select>
          <select value={perPage} onChange={(e) => setPerPage(Number(e.target.value))} style={{ background: "var(--surface)", border: "1px solid var(--soft-strong)", borderRadius: 5, height: 28, padding: "0 8px", fontSize: 11, color: "var(--muted)", fontFamily: "inherit", outline: "none" }}>
            {[25, 50, 100, 200].map((n) => <option key={n} value={n}>{n} per page</option>)}
          </select>
          {(fieldValue || sortKey) && (
            <button onClick={() => { setFieldFilter("__all"); setFieldValue(""); setSortKey(""); setSortDir("desc"); }}
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 5, color: "#f87171", fontSize: 10, padding: "4px 8px", cursor: "pointer", fontFamily: "inherit" }}>
              Clear
            </button>
          )}
        </div>
      )}

      {/* ── Body ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* Left sidebar */}
        <div style={{
          width: 200, flexShrink: 0,
          background: "var(--app-shell-gradient)", borderRight: "1px solid var(--soft-strong)",
          overflowY: "auto", padding: "14px 0",
        }}>
          {GROUPS.map(([group, names]) => (
            <div key={group} style={{ marginBottom: 20 }}>
              <div style={{
                fontSize: 9, fontWeight: 700, textTransform: "uppercase",
                letterSpacing: "0.12em", color: "var(--faint)", padding: "0 14px", marginBottom: 6,
              }}>{group}</div>
              {names.map((name) => {
                const isActive = collection === name;
                return (
                  <button
                    key={name}
                    onClick={() => { setCollection(name); setPage(1); }}
                    style={{
                      display: "block", width: "100%", textAlign: "left",
                      background: isActive ? "var(--soft-subtle)" : "transparent",
                      border: "none",
                      borderLeft: `2px solid ${isActive ? "var(--soft-strong)" : "transparent"}`,
                      color: isActive ? "var(--text)" : "var(--muted)",
                      fontSize: 11, padding: "6px 14px 6px 12px",
                      cursor: "pointer", fontFamily: "inherit",
                      transition: "all 0.1s",
                    }}
                    onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.color = "var(--muted)"; e.currentTarget.style.background = "var(--soft-subtle)"; }}}
                    onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.color = "var(--muted)"; e.currentTarget.style.background = "transparent"; }}}
                  >{name}</button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Main content */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>

          {/* Error */}
          {error && (
            <div style={{ padding: "10px 16px", background: "rgba(239,68,68,0.08)", borderBottom: "1px solid rgba(239,68,68,0.15)", display: "flex", alignItems: "center", gap: 8 }}>
              <AlertCircle size={13} color="#f87171" />
              <span style={{ fontSize: 12, color: "#f87171" }}>{error}</span>
            </div>
          )}

          {/* Table view */}
          {viewMode === "table" && (
            <div style={{ flex: 1, overflowX: "auto", overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
                <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
                  <tr style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--soft)" }}>
                    {columns.map((col) => (
                      <th
                        key={col}
                        onClick={() => handleSort(col)}
                        style={{
                          textAlign: "left", padding: "9px 14px",
                          fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          color: sortKey === col ? "var(--text)" : "var(--muted)",
                          whiteSpace: "nowrap", cursor: "pointer", userSelect: "none",
                          background: sortKey === col ? "var(--soft-subtle)" : "transparent",
                        }}
                      >
                        {col}
                        {sortKey === col && <span style={{ marginLeft: 4 }}>{sortDir === "asc" ? "↑" : "↓"}</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading && sortedRows.length === 0 && (
                    [...Array(8)].map((_, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid var(--soft-subtle)" }}>
                        {[...Array(Math.max(columns.length, 5))].map((_, j) => (
                          <td key={j} style={{ padding: "12px 14px" }}>
                            <div style={{ height: 12, background: "var(--soft)", borderRadius: 3, animation: "pulse 1.2s infinite", animationDelay: `${i * 0.05}s` }} />
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                  {!loading && sortedRows.length === 0 && (
                    <tr>
                      <td colSpan={columns.length || 1} style={{ padding: "60px 24px", textAlign: "center" }}>
                        <Database size={28} style={{ color: "var(--faint)", marginBottom: 10 }} />
                        <div style={{ color: "var(--muted)", fontSize: 13 }}>No records found</div>
                      </td>
                    </tr>
                  )}
                  {sortedRows.map((row, ri) => {
                    const id = row.id || row._id || row.scheme_id || row.farmer_id || `row-${ri}`;
                    return (
                      <tr
                        key={id}
                        style={{ borderBottom: "1px solid var(--soft-subtle)", transition: "background 0.1s" }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "var(--soft-subtle)"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                      >
                        {columns.map((col) => (
                          <td key={col} style={{ padding: "10px 14px", verticalAlign: "middle", maxWidth: 200 }}>
                            {/* First col (ID-like) gets monospace styling */}
                            {(col === "id" || col === "_id" || col.endsWith("_id")) && typeof row[col] === "string" ? (
                              <span style={{ fontFamily: "monospace", fontSize: 11, color: "var(--muted)" }}>
                                {String(row[col]).slice(0, 18)}{String(row[col]).length > 18 ? "…" : ""}
                              </span>
                            ) : fmtCell(row[col])}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* JSON view */}
          {viewMode === "json" && (
            <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
              <pre style={{
                margin: 0, fontSize: 11, lineHeight: 1.7,
                color: "var(--muted)", fontFamily: "monospace",
                background: "var(--soft-subtle)", border: "1px solid var(--soft)",
                borderRadius: 8, padding: 16,
              }}>
                {JSON.stringify(sortedRows, null, 2)}
              </pre>
            </div>
          )}

          {/* Query view */}
          {viewMode === "query" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 16, gap: 12, minHeight: 0 }}>
              <div style={{ flexShrink: 0 }}>
                <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", fontWeight: 600, marginBottom: 8 }}>MongoDB Query</div>
                <textarea
                  value={queryInput}
                  onChange={(e) => setQueryInput(e.target.value)}
                  style={{
                    width: "100%", boxSizing: "border-box",
                    background: "var(--soft-subtle)", border: "1px solid var(--soft-strong)",
                    borderRadius: 8, padding: 14, fontSize: 12, color: "var(--text)",
                    fontFamily: "monospace", lineHeight: 1.7, outline: "none", resize: "vertical",
                    height: 180,
                  }}
                />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={runQuery}
                  disabled={queryRunning}
                  style={{
                  background: "var(--app-shell-gradient)", border: "1px solid var(--soft-strong)", borderRadius: 7,
                  color: "var(--muted)", fontSize: 12, fontWeight: 700, padding: "8px 20px", cursor: queryRunning ? "not-allowed" : "pointer", fontFamily: "inherit",
                  opacity: queryRunning ? 0.55 : 1,
                }}
                >{queryRunning ? "Running..." : "Run Query"}</button>
                <button onClick={() => { setQueryInput(DEFAULT_QUERY_INPUT); setQueryMeta(null); setQueryRows([]); }} style={{
                  background: "var(--app-shell-gradient)", border: "1px solid var(--soft-strong)",
                  borderRadius: 7, color: "var(--muted)", fontSize: 12, padding: "8px 16px", cursor: "pointer", fontFamily: "inherit",
                }}>Reset</button>
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>
                Query against collection: <span style={{ color: "var(--text)", fontFamily: "monospace" }}>{collection}</span> · {total} documents
              </div>
              {queryMeta && (
                <div style={{ fontSize: 11, color: "var(--muted)" }}>
                  Query result: fetched {queryMeta.fetched} · matched {queryMeta.matched} · returned {queryMeta.returned}
                </div>
              )}

              <div style={{
                marginTop: 2,
                border: "1px solid var(--soft-strong)",
                borderRadius: 8,
                background: "var(--soft-subtle)",
                flex: 1,
                minHeight: 180,
                overflow: "auto",
                maxHeight: "100%",
              }}>
                {queryRows.length > 0 ? (
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
                    <thead style={{ position: "sticky", top: 0, zIndex: 5 }}>
                      <tr style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--soft)" }}>
                        {queryColumns.map((col) => (
                          <th
                            key={`q-${col}`}
                            style={{
                              textAlign: "left", padding: "8px 12px",
                              fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                              letterSpacing: "0.08em", color: "var(--muted)", whiteSpace: "nowrap",
                            }}
                          >
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {queryRows.map((row, idx) => {
                        const id = row.id || row._id || row.scheme_id || row.farmer_id || `query-row-${idx}`;
                        return (
                          <tr key={id} style={{ borderBottom: "1px solid var(--soft-subtle)" }}>
                            {queryColumns.map((col) => (
                              <td key={`${id}-${col}`} style={{ padding: "8px 12px", verticalAlign: "middle", maxWidth: 220 }}>
                                {(col === "id" || col === "_id" || col.endsWith("_id")) && typeof row[col] === "string" ? (
                                  <span style={{ fontFamily: "monospace", fontSize: 11, color: "var(--muted)" }}>
                                    {String(row[col]).slice(0, 20)}{String(row[col]).length > 20 ? "…" : ""}
                                  </span>
                                ) : fmtCell(row[col])}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ padding: "28px 20px", textAlign: "center" }}>
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>
                      {queryMeta ? "No rows matched this query" : "Run a query to see results here"}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Pagination */}
          {viewMode === "table" && totalPages > 1 && (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "8px 16px", borderTop: "1px solid var(--soft)",
              background: "var(--app-shell-gradient)", flexShrink: 0,
            }}>
              <span style={{ fontSize: 11, color: "var(--muted)" }}>
                Page {page} of {totalPages} · <span style={{ color: "var(--faint)" }}>{total} records</span>
              </span>
              <div style={{ display: "flex", gap: 4 }}>
                <button disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))} style={pgBtnStyle(false, page <= 1)}>Prev</button>
                {pageButtons.map((p) => (
                  <button key={p} onClick={() => setPage(p)} style={pgBtnStyle(p === page, false)}>{p}</button>
                ))}
                <button disabled={page >= totalPages || loading} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} style={pgBtnStyle(false, page >= totalPages)}>Next</button>
              </div>
            </div>
          )}
        </div>

        {/* Schema Inspector */}
        {schemaOpen && (
          <SchemaInspector
            rows={sortedRows}
            collection={collection}
            freshness={freshness}
            onClose={() => setSchemaOpen(false)}
            onGenerateConfig={handleGenerateConfig}
          />
        )}
      </div>

      {/* ── Status bar ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 0,
        background: "var(--surface)", borderTop: "1px solid var(--soft)",
        padding: "5px 20px", flexShrink: 0,
      }}>
        <StatusItem icon={<span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--soft-strong)", display: "inline-block" }} />}>
          SYSTEM STATUS · ONLINE
        </StatusItem>
        <StatusDivider />
        <StatusItem icon={<Activity size={10} color="var(--muted)" />}>
          SYNC LATENCY · {syncLatency !== null ? `${syncLatency}ms` : "—"}
        </StatusItem>
        <StatusDivider />
        <StatusItem icon={<Clock size={10} color="var(--muted)" />}>
          LAST INDEX UPDATE · {lastUpdate ? new Date(lastUpdate).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Asia/Kolkata" }) + " IST" : "—"}
        </StatusItem>
        <StatusDivider />
        <StatusItem icon={<Database size={10} color="var(--muted)" />}>
          {collection} · {sortedRows.length} rows
        </StatusItem>
        <div style={{ marginLeft: "auto" }}>
          <StatusItem icon={null}>
            <span style={{ color: "var(--faint)" }}>v2.4.1</span>
          </StatusItem>
        </div>
      </div>

      <Modal
        open={configModalOpen}
        wide
        title={`Schema Config · ${collection}`}
        onClose={() => setConfigModalOpen(false)}
        footer={
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, color: copyStatus ? "var(--text)" : "var(--muted)" }}>{copyStatus || "Use Copy to place JSON in clipboard"}</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setConfigModalOpen(false)}
                style={{
                  background: "var(--soft)", border: "1px solid var(--soft-strong)",
                  borderRadius: 7, color: "var(--muted)", fontSize: 12, padding: "7px 14px", cursor: "pointer", fontFamily: "inherit",
                }}
              >Close</button>
              <button
                onClick={handleCopyConfig}
                style={{
                  background: "var(--app-shell-gradient)", border: "1px solid var(--soft-strong)",
                  borderRadius: 7, color: "var(--muted)", fontSize: 12, fontWeight: 700, padding: "7px 16px", cursor: "pointer", fontFamily: "inherit",
                }}
              >Copy Config</button>
            </div>
          </div>
        }
      >
        <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 8 }}>
          Generated from current explorer rows. Edit this JSON before using it in ingestion or validation pipelines.
        </div>
        <textarea
          ref={configTextareaRef}
          readOnly
          value={generatedConfig}
          style={{
            width: "100%", boxSizing: "border-box", height: 380,
            background: "var(--soft-subtle)", border: "1px solid var(--soft-strong)",
            borderRadius: 8, padding: 12, fontSize: 12, color: "var(--text)",
            fontFamily: "monospace", lineHeight: 1.6, outline: "none", resize: "vertical",
          }}
        />
      </Modal>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
      `}</style>
    </div>
  );
};

/* ─────────────────────────────────────────────
   Small helpers
───────────────────────────────────────────── */
const pgBtnStyle = (active, disabled) => ({
  background: active ? "var(--soft-subtle)" : "var(--soft)",
  border: `1px solid ${active ? "var(--soft-strong)" : "var(--soft-strong)"}`,
  borderRadius: 5, color: active ? "var(--text)" : disabled ? "var(--faint)" : "var(--muted)",
  fontSize: 11, padding: "4px 9px", cursor: disabled ? "not-allowed" : "pointer",
  fontFamily: "inherit", transition: "all 0.1s",
});

const StatusItem = ({ icon, children }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "0 14px" }}>
    {icon}
    <span style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--faint)" }}>{children}</span>
  </div>
);

const StatusDivider = () => (
  <div style={{ width: 1, height: 14, background: "var(--soft-strong)" }} />
);

export default DatabaseExplorer;