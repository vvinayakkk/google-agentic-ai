import { AlertTriangle, DatabaseZap, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const SkeletonRows = ({ columns = 5, rows = 6 }) => (
  <tbody>
    {Array.from({ length: rows }).map((_, idx) => (
      <tr key={`s-${idx}`}>
        {Array.from({ length: columns }).map((__, col) => (
          <td key={`s-${idx}-${col}`} style={{ padding: "0 12px" }}>
            <div className="skeleton-row" />
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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border)" }}>
          <div style={{ padding: 12, minWidth: 240 }}>
            <select className="field" value={field} onChange={(e) => setField(e.target.value)}>
              <option value="__all">All fields</option>
              {fieldOptions.map((key) => (
                <option key={key} value={key}>{key}</option>
              ))}
            </select>
          </div>
          <div style={{ padding: 12, width: 360 }}>
            <input className="field" placeholder="Search name, phone, village, district..." value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
        </div>
      ) : null}

      <table className="w-full table-fixed modern-table text-left" style={{ color: 'var(--text)' }}>
        <thead className="table-header">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="px-3 py-2 text-[11px] font-medium" style={{ color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
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
              <td colSpan={columns.length} style={{ padding: 16 }}>
                <div style={{ borderLeft: '4px solid var(--danger)', padding: 12, background: 'rgba(239,68,68,0.04)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <AlertTriangle style={{ color: 'var(--danger)', fontSize: 18 }} />
                    <div style={{ color: 'var(--danger)', fontWeight: 600 }}>Failed: {String(error)}</div>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <button type="button" className="btn-ghost" onClick={onRetry}><RefreshCw size={14} /> Retry</button>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        ) : normalizedRows.length === 0 ? (
          <tbody>
            <tr>
              <td colSpan={columns.length} style={{ padding: 24 }}>
                <div style={{ textAlign: 'center' }}>
                  <DatabaseZap size={48} style={{ color: 'var(--faint)' }} />
                  <div style={{ marginTop: 8, color: 'var(--muted)', fontSize: 14 }}>{emptyTitle}</div>
                  <div style={{ marginTop: 6, color: 'var(--faint)', fontSize: 12 }}>{emptySubtitle}</div>
                </div>
              </td>
            </tr>
          </tbody>
        ) : (
          <tbody>
            {normalizedRows.map((row, idx) => (
              <tr
                key={row.id || idx}
                className={`${onRowClick ? "row-hover" : ""}`}
                onClick={() => onRowClick?.(row)}
                style={{
                  height: 48,
                  cursor: onRowClick ? 'pointer' : 'default',
                }}
              >
                {columns.map((col) => (
                  <td
                    key={`${row.id || idx}-${col.key}`}
                    style={{ padding: '10px 12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 300 }}
                    title={renderCellText(row?.[col.key])}
                  >
                    {col.render ? col.render(row) : (row[col.key] === null || row[col.key] === undefined ? '—' : row[col.key])}
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

