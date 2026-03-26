import { useMemo, useState } from "react";
import Modal from "./Modal";
import { downloadFile, toCSV } from "../../utils/format";
import { useUI } from "../../context/UIContext";

const ExportModal = ({ title = "Export Data", rows = [] }) => {
  const { isExportOpen, setExportOpen } = useUI();
  const [format, setFormat] = useState("csv");
  const [selected, setSelected] = useState([]);
  const [scope, setScope] = useState("filtered");

  const captured = useMemo(() => {
    const mem = globalThis.__adminDashboardExportData;
    if (mem) return mem;
    try {
      const raw = sessionStorage.getItem("admin-dashboard-export");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const allRows = useMemo(() => (rows.length ? rows : captured?.allRows || []), [rows, captured]);
  const filteredRows = useMemo(() => (captured?.filteredRows || allRows), [captured, allRows]);
  const exportRows = scope === "all" ? allRows : filteredRows;

  const fields = useMemo(() => {
    const source = exportRows.length ? exportRows : allRows;
    if (!source.length) return [];
    return Object.keys(source[0]);
  }, [allRows, exportRows]);

  const effectiveFields = selected.length ? selected : fields;

  const toggleField = (field) => {
    setSelected((prev) => (prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]));
  };

  const onDownload = () => {
    const now = new Date().toISOString().split("T")[0];
    const projected = exportRows.map((row) => {
      if (!effectiveFields.length) return row;
      return effectiveFields.reduce((acc, key) => {
        acc[key] = row?.[key];
        return acc;
      }, {});
    });

    if (format === "json") {
      downloadFile(JSON.stringify(projected, null, 2), `export-${now}.json`, "application/json");
    } else if (format === "csv") {
      downloadFile(toCSV(projected, effectiveFields), `export-${now}.csv`, "text/csv");
    } else {
      const markdown = [
        "# Admin Dashboard Export",
        "",
        `Rows: ${projected.length}`,
        `Columns: ${effectiveFields.length || fields.length}`,
        "",
        "## Preview",
        "",
        "```json",
        JSON.stringify(projected.slice(0, 5), null, 2),
        "```",
      ].join("\n");
      downloadFile(markdown, `export-${now}.md`, "text/markdown");
    }
    setExportOpen(false);
  };

  return (
    <Modal
      open={isExportOpen}
      title={title}
      onClose={() => setExportOpen(false)}
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" className="action-btn" onClick={() => setExportOpen(false)}>
            Cancel
          </button>
          <button type="button" className="pill-btn border-white/30 bg-white/10" onClick={onDownload}>
            Download
          </button>
        </div>
      }
    >
      <div className="space-y-3 text-xs">
        <div className="grid grid-cols-1 gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-3 sm:grid-cols-3">
          <div>
            <p className="text-white/45">Available exports</p>
            <p className="text-white/85">Current table data</p>
          </div>
          <div>
            <p className="text-white/45">All rows</p>
            <p className="text-white/85">{allRows.length}</p>
          </div>
          <div>
            <p className="text-white/45">Filtered rows</p>
            <p className="text-white/85">{filteredRows.length}</p>
          </div>
        </div>

        <div>
          <p className="mb-1 text-white/55">Scope</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setScope("filtered")}
              className={`pill-btn ${scope === "filtered" ? "border-white/30 bg-white/10" : ""}`}
            >
              Filtered ({filteredRows.length})
            </button>
            <button
              type="button"
              onClick={() => setScope("all")}
              className={`pill-btn ${scope === "all" ? "border-white/30 bg-white/10" : ""}`}
            >
              All ({allRows.length})
            </button>
          </div>
        </div>

        <div>
          <p className="mb-1 text-white/55">Format</p>
          <div className="flex gap-2">
            {["csv", "json", "md"].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setFormat(item)}
                className={`pill-btn ${format === item ? "border-white/30 bg-white/10" : ""}`}
              >
                {item.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1 text-white/55">Fields</p>
          <div className="max-h-52 grid grid-cols-2 gap-1 overflow-y-auto pr-1">
            {fields.map((field) => (
              <label key={field} className="flex items-center gap-2 rounded-lg border border-white/10 px-2 py-1 text-white/75">
                <input type="checkbox" checked={effectiveFields.includes(field)} onChange={() => toggleField(field)} />
                <span>{field}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ExportModal;

