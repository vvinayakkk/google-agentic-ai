import { AlertTriangle, DatabaseZap, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const SkeletonRows = ({ columns = 5, rows = 5 }) => (
  <tbody>
    {Array.from({ length: rows }).map((_, idx) => (
      <tr key={`s-${idx}`} className="border-b border-white/5">
        {Array.from({ length: columns }).map((__, col) => (
          <td key={`s-${idx}-${col}`} className="px-3 py-2">
            <div className="h-3 w-full animate-pulse rounded bg-white/10" />
          </td>
        ))}
      </tr>
    ))}
  </tbody>
);

const DataTable = ({
  columns = [],
  rows = [],
  loading = false,
  error = null,
  emptyTitle = "No data available",
  emptySubtitle = "No records match the current filters.",
  onRetry,
  onRowClick,
  showFilters = true,
}) => {
  const [query, setQuery] = useState("");
  const [field, setField] = useState("__all");
  const [fieldQuery, setFieldQuery] = useState("");

  const fieldOptions = useMemo(() => {
    return columns
      .map((col) => col.key)
      .filter((key) => key && key !== "actions" && key !== "expand");
  }, [columns]);

  const normalizedRows = useMemo(() => {
    if (!rows.length) return [];
    return rows.filter((row) => {
      const globalHit = !query.trim() || JSON.stringify(row).toLowerCase().includes(query.trim().toLowerCase());
      if (!globalHit) return false;
      if (!fieldQuery.trim()) return true;
      if (field === "__all") {
        return JSON.stringify(row).toLowerCase().includes(fieldQuery.trim().toLowerCase());
      }
      return String(row?.[field] ?? "").toLowerCase().includes(fieldQuery.trim().toLowerCase());
    });
  }, [rows, query, field, fieldQuery]);

  useEffect(() => {
    if (!rows?.length) return;
    const payload = {
      capturedAt: new Date().toISOString(),
      columns: fieldOptions,
      allRows: rows,
      filteredRows: normalizedRows,
    };
    globalThis.__adminDashboardExportData = payload;
    try {
      sessionStorage.setItem("admin-dashboard-export", JSON.stringify(payload));
    } catch {
      // ignore storage overflow and rely on in-memory payload
    }
  }, [rows, normalizedRows, fieldOptions]);

  const renderCellText = (value) => {
    if (value === null || value === undefined) return "-";
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  };

  return (
    <div className="overflow-hidden panel">
      {showFilters ? (
        <div className="flex items-center justify-between border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="p-3" style={{ minWidth: 240 }}>
            <select className="field" value={field} onChange={(e) => setField(e.target.value)}>
              <option value="__all">All columns</option>
              {fieldOptions.map((key) => (
                <option key={key} value={key}>{key}</option>
              ))}
            </select>
          </div>
          <div className="p-3" style={{ width: 360 }}>
            <input className="field" placeholder="Search all fields" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
        </div>
      ) : null}
      <table className="w-full table-fixed border-collapse text-left" style={{ color: 'var(--text)' }}>
        <thead className="table-header">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="px-3 py-2 text-[11px] font-medium" style={{ color: 'var(--muted)' }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        {loading ? (
          <SkeletonRows columns={columns.length} />
        ) : error ? (
          <tbody>
            <tr>
              <td colSpan={columns.length} className="px-4 py-10">
                <div className="mx-auto max-w-md rounded-xl border border-rose-300/30 bg-rose-300/10 p-4 text-center">
                  <AlertTriangle className="mx-auto mb-2 h-6 w-6 text-rose-200" />
                  <p className="text-sm text-rose-100">{error}</p>
                  <button type="button" className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1 text-[11px]" onClick={onRetry}>
                    <RefreshCw className="h-3 w-3" /> Retry
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        ) : normalizedRows.length === 0 ? (
          <tbody>
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center muted">
                <div>{emptyTitle}</div>
                <div className="muted" style={{ marginTop: 6 }}>{emptySubtitle}</div>
              </td>
            </tr>
          </tbody>
        ) : (
          <tbody>
            {normalizedRows.map((row, idx) => (
              <tr
                key={row.id || idx}
                className={`table-row ${idx % 2 === 0 ? "" : ""} ${onRowClick ? "row-hover cursor-pointer" : ""}`}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col) => (
                  <td
                    key={`${row.id || idx}-${col.key}`}
                    className="truncate px-3 py-2 align-top"
                    title={renderCellText(row?.[col.key])}
                  >
                    {col.render ? col.render(row) : row[col.key] ?? "0"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        )}
      </table>
    </div>
  );
};

export default DataTable;

