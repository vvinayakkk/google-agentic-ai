import { useCallback, useEffect, useMemo, useState } from "react";
import { Bot, SendHorizontal } from "lucide-react";
import { DB_COLLECTIONS } from "../utils/constants";
import DataTable from "../components/ui/DataTable";
import { apiTry, withQuery } from "../api/client";
import Badge from "../components/ui/Badge";

const fallbackEndpointsByCollection = {
  users: ["/api/v1/admin/farmers"],
  farmer_profiles: ["/api/v1/admin/farmers"],
  ref_farmer_schemes: ["/api/v1/admin/data/schemes"],
  ref_equipment_providers: ["/api/v1/admin/data/equipment-providers"],
  ref_data_ingestion_meta: ["/api/v1/admin/data-freshness"],
  admin_users: ["/api/v1/admin/admins"],
  analytics_snapshots: ["/api/v1/admin/analytics/overview"],
  app_config: ["/api/v1/admin/config"],
};

const groups = [
  ["Operational", DB_COLLECTIONS.operational],
  ["Reference Data", DB_COLLECTIONS.reference],
  ["Governance", DB_COLLECTIONS.governance],
];

const DatabaseExplorer = () => {
  const [collection, setCollection] = useState("users");
  const [rows, setRows] = useState([]);
  const [jsonView, setJsonView] = useState(false);
  const [search, setSearch] = useState("");
  const [fieldFilter, setFieldFilter] = useState("__all");
  const [fieldValue, setFieldValue] = useState("");
  const [sortKey, setSortKey] = useState("");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(100);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [freshness, setFreshness] = useState(null);
  const [chatInput, setChatInput] = useState("");
  const [chatLog, setChatLog] = useState([
    { role: "assistant", text: "Ask me about current collection stats or filter suggestions." },
  ]);

  const extractRows = (data) => {
    if (Array.isArray(data)) return data;
    if (!data || typeof data !== "object") return [];

    const candidates = [
      data.items,
      data.rows,
      data.data,
      data.conversations,
      data.locations,
      data.districts,
      data.states,
      data.admins,
      data.notifications,
      data.messages,
    ];

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) return candidate;
    }

    return [data];
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fallbackPerPage = Math.min(perPage, 100);
      const genericEndpoints = [
        withQuery(`/api/v1/admin/data/collection/${collection}`, { page, per_page: perPage }),
      ];
      const fallbackEndpoints = (fallbackEndpointsByCollection[collection] || []).flatMap((endpoint) => [
        withQuery(endpoint, { page, per_page: fallbackPerPage }),
        endpoint,
      ]);

      const data = await apiTry([...genericEndpoints, ...fallbackEndpoints]);
      const nextRows = extractRows(data);
      setRows(nextRows);

      const nextTotal = Number(data?.total);
      const nextTotalPages = Number(data?.total_pages);
      setTotal(Number.isFinite(nextTotal) ? nextTotal : nextRows.length);
      setTotalPages(Number.isFinite(nextTotalPages) && nextTotalPages > 0 ? nextTotalPages : 1);

      const fresh = await apiTry(["/api/v1/admin/data-freshness", "/api/v1/admin/freshness"]).catch(() => null);
      setFreshness(fresh);
    } catch (err) {
      setRows([]);
      setTotal(0);
      setTotalPages(1);
      setError(err.message || "Failed to load collection data");
    } finally {
      setLoading(false);
    }
  }, [collection, page, perPage]);

  useEffect(() => {
    setPage(1);
  }, [collection, perPage]);

  useEffect(() => {
    load();
  }, [load]);

  const fieldOptions = useMemo(() => (rows[0] ? Object.keys(rows[0]) : []), [rows]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const fq = fieldValue.trim().toLowerCase();
    return rows.filter((row) => {
      const globalMatch = !q || JSON.stringify(row).toLowerCase().includes(q);
      if (!globalMatch) return false;
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
      if (av === bv) return 0;
      return av > bv ? mult : -mult;
    });
  }, [filteredRows, sortKey, sortDir]);

  const visibleRows = useMemo(() => sortedRows, [sortedRows]);

  const pageButtons = useMemo(() => {
    const out = [];
    if (totalPages <= 0) return out;
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, start + 4);
    for (let p = start; p <= end; p += 1) out.push(p);
    return out;
  }, [page, totalPages]);

  const columns = useMemo(() => {
    if (!visibleRows.length) return [{ key: "data", label: "Data", render: () => "-" }];
    return Object.keys(visibleRows[0]).slice(0, 12).map((key) => ({
      key,
      label: key,
      render: (row) => {
        const value = row[key];
        if (typeof value === "object") return JSON.stringify(value).slice(0, 120);
        return String(value ?? "-");
      },
    }));
  }, [visibleRows]);

  const onChatSend = () => {
    const text = chatInput.trim();
    if (!text) return;
    const suggestions = [
      `Collection ${collection} has ${sortedRows.length} matching records (${visibleRows.length} currently displayed).`,
      `Try field filter on "${fieldOptions[0] || "id"}" for faster narrowing.`,
      `Current sort: ${sortKey || "none"} (${sortDir}).`,
    ];
    setChatLog((prev) => [
      ...prev,
      { role: "user", text },
      { role: "assistant", text: suggestions[prev.length % suggestions.length] },
    ]);
    setChatInput("");
  };

  return (
    <div className="grid grid-cols-12 gap-3">
      <aside className="col-span-2 panel max-h-[680px] overflow-y-auto p-3 text-xs">
        {groups.map(([group, names]) => (
          <div key={group} className="mb-3">
            <p className="mb-1 text-[10px] uppercase tracking-wide text-white/45">{group}</p>
            <div className="space-y-1">
              {names.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => {
                    setCollection(name);
                    setPage(1);
                  }}
                  className={`block w-full rounded-md border px-2 py-1 text-left ${collection === name ? "border-white/30 bg-white/10 text-white/90" : "border-white/10 text-white/65 hover:bg-white/5"}`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        ))}
      </aside>

      <div className="col-span-8 space-y-3">
        <div className="panel grid grid-cols-1 gap-2 p-3 text-xs md:grid-cols-7">
          <Badge tone="blue">{collection}</Badge>
          <span className="text-white/45">Total: {total}</span>
          <input className="field" placeholder="Search in JSON" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="field" value={fieldFilter} onChange={(e) => setFieldFilter(e.target.value)}>
            <option value="__all">All fields</option>
            {fieldOptions.map((key) => <option key={key} value={key}>{key}</option>)}
          </select>
          <input className="field" placeholder="Field contains" value={fieldValue} onChange={(e) => setFieldValue(e.target.value)} />
          <select className="field" value={sortKey} onChange={(e) => setSortKey(e.target.value)}>
            <option value="">Sort by</option>
            {fieldOptions.map((key) => <option key={key} value={key}>{key}</option>)}
          </select>
          <select className="field" value={sortDir} onChange={(e) => setSortDir(e.target.value)}>
            <option value="desc">Desc</option>
            <option value="asc">Asc</option>
          </select>
          <select className="field" value={perPage} onChange={(e) => setPerPage(Number(e.target.value))}>
            {[25, 50, 100, 200].map((n) => <option key={n} value={n}>Page size {n}</option>)}
          </select>
          <button type="button" className="action-btn" onClick={() => setJsonView((v) => !v)}>{jsonView ? "Table" : "JSON"} View</button>
        </div>

        {jsonView ? (
          <div className="panel max-h-[580px] overflow-auto p-3 text-[11px]">
            <pre>{JSON.stringify(visibleRows, null, 2)}</pre>
          </div>
        ) : (
          <DataTable
            columns={columns}
            rows={visibleRows}
            loading={loading}
            error={error}
            onRetry={load}
            emptyTitle="No collection data"
            showFilters={false}
          />
        )}

        <div className="panel flex flex-wrap items-center justify-between gap-2 p-3 text-xs">
          <div className="text-white/55">Page {page} of {Math.max(totalPages, 1)}</div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="action-btn"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </button>
            {pageButtons.map((p) => (
              <button
                key={p}
                type="button"
                className={`action-btn ${p === page ? "border-white/30 bg-white/10 text-white/90" : ""}`}
                disabled={loading}
                onClick={() => setPage(p)}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              className="action-btn"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <div className="col-span-2 panel p-3 text-xs">
        <h3 className="mb-2 font-display text-lg text-white/95">Schema Panel</h3>
        <p className="mb-2 text-white/55">Inferred from current records.</p>
        <div className="space-y-1">
          {columns.slice(0, 16).map((c) => (
            <div key={c.key} className="rounded-md border border-white/10 p-1">
              <p className="text-white/85">{c.key}</p>
              <p className="text-[10px] text-white/40">mixed</p>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-md border border-white/10 p-2">
          <p className="text-[10px] uppercase tracking-wide text-white/45">Data Freshness</p>
          <p className="text-white/75">{freshness?.items?.length || 0} datasets tracked</p>
        </div>
      </div>

      <div className="pointer-events-none fixed bottom-10 left-1/2 z-50 hidden w-[420px] -translate-x-1/2 lg:block">
        <div className="pointer-events-auto rounded-2xl border border-white/15 bg-[#181818]/96 p-3 shadow-[0_18px_45px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <div className="mb-2 flex items-center gap-2 text-xs text-white/80">
            <Bot size={14} className="text-blue-200" />
            <span>Database Assistant</span>
          </div>
          <div className="max-h-24 space-y-1 overflow-y-auto text-[11px]">
            {chatLog.slice(-3).map((m, idx) => (
              <div key={`${m.role}-${idx}`} className={`rounded-lg border px-2 py-1 ${m.role === "assistant" ? "border-white/15 bg-white/[0.04] text-white/85" : "border-white/10 bg-white/[0.02] text-white/70"}`}>
                {m.text}
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <input
              className="field"
              placeholder="Ask for filter suggestions..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onChatSend()}
            />
            <button type="button" className="pill-btn border-white/30 bg-white/10" onClick={onChatSend}>
              <SendHorizontal size={12} /> Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatabaseExplorer;

