import { useCallback, useEffect, useMemo, useState } from "react";
import { Upload } from "lucide-react";
import DataTable from "../components/ui/DataTable";
import Badge from "../components/ui/Badge";
import { EQUIPMENT_TABS } from "../utils/constants";
import { apiTry, withQuery } from "../api/client";
import BarChart from "../components/charts/BarChart";

const toneByStatus = {
  pending: "orange",
  approved: "green",
  rejected: "red",
  completed: "blue",
  cancelled: "muted",
};

const TAB_COLLECTIONS = {
  Equipment: "equipment",
  Livestock: "livestock",
  "Rental Requests": "equipment_bookings",
  "Rental Rates": "equipment_rental_rates",
  Providers: "ref_equipment_providers",
};

const Equipment = () => {
  const [tab, setTab] = useState(EQUIPMENT_TABS[0]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [providerCount, setProviderCount] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(100);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const collection = TAB_COLLECTIONS[tab] || "equipment";
      const data = await apiTry([
        withQuery(`/api/v1/admin/data/collection/${collection}`, { page, per_page: perPage }),
        withQuery("/api/v1/admin/data/collection/ref_equipment_providers", { page, per_page: perPage }),
      ]);

      const list = data.items || data.rows || data.equipment || [];
      setRows(list);
      setTotal(Number(data.total ?? list.length));
      setTotalPages(Number(data.total_pages ?? 1));
      if (tab === "Providers") {
        setProviderCount(Number(data.total ?? list.length));
      }

      if (tab === "Rental Rates" && !list.length) {
        const fallbackRates = await apiTry([
          withQuery("/api/v1/admin/data/collection/ref_equipment_providers", { page, per_page: perPage }),
        ]);
        const fallbackList = fallbackRates.items || [];
        setRows(fallbackList);
        setTotal(Number(fallbackRates.total ?? fallbackList.length));
        setTotalPages(Number(fallbackRates.total_pages ?? 1));
      }
    } catch (err) {
      setError(err.message);
      setRows([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, perPage, tab]);

  useEffect(() => {
    setPage(1);
  }, [tab, perPage]);

  useEffect(() => {
    load();
  }, [load]);

  const columns = useMemo(() => {
    if (tab === "Rental Requests") {
      return [
        { key: "id", label: "Request ID", render: (r) => r.id || r.rental_id || "-" },
        { key: "equipment", label: "Equipment", render: (r) => r.equipment_name || r.equipment || "-" },
        { key: "requester", label: "Requester", render: (r) => r.renter_id || r.requester || "-" },
        { key: "start", label: "Start Date", render: (r) => r.start_date || "-" },
        { key: "end", label: "End Date", render: (r) => r.end_date || "-" },
        { key: "message", label: "Message", render: (r) => r.message || "-" },
        {
          key: "status",
          label: "Status",
          render: (r) => {
            const status = String(r.status || "pending");
            return <Badge tone={toneByStatus[status.toLowerCase()] || "muted"}>{status}</Badge>;
          },
        },
      ];
    }

    if (!rows.length) return [{ key: "row", label: "Data", render: () => "-" }];
    return Object.keys(rows[0]).slice(0, 10).map((key) => ({
      key,
      label: key,
      render: (r) => (typeof r[key] === "object" ? JSON.stringify(r[key]).slice(0, 80) : String(r[key] ?? "-")),
    }));
  }, [rows, tab]);

  const replaceSeed = useCallback(async (file) => {
    const text = await file.text();
    const payload = JSON.parse(text);
    await apiTry([
      "/api/v1/equipment/replace-seed",
      "/api/v1/equipment/providers/replace",
    ], {
      method: "POST",
      body: JSON.stringify({ input_file: payload.input_file || "scripts/reports/equipment_rental_pan_india_2026.json" }),
    });
    load();
  }, [load]);

  return (
    <div className="space-y-3">
      <div className="panel flex flex-wrap items-center gap-2 p-3">
        {EQUIPMENT_TABS.map((item) => (
          <button key={item} type="button" className={`pill-btn ${tab === item ? "border-white/30 bg-white/10" : ""}`} onClick={() => setTab(item)}>
            {item}
          </button>
        ))}
        {tab === "Providers" ? (
          <label className="ml-auto action-btn cursor-pointer">
            <Upload size={13} /> Replace Seed
            <input type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && replaceSeed(e.target.files[0])} />
          </label>
        ) : null}
      </div>

      {tab === "Rental Requests" ? (
        <div className="panel p-3">
          <h3 className="mb-2 font-display text-lg text-white/95">Timeline View</h3>
          <BarChart
            data={rows.slice(0, 8).map((item, idx) => ({ label: item.equipment_name || `Request ${idx + 1}`, value: idx + 2 }))}
            horizontal
            color="#FB923C"
          />
        </div>
      ) : null}

      {tab === "Providers" ? (
        <div className="panel p-3 text-xs text-white/70">Current provider count: <span className="font-display text-lg text-white/95">{providerCount}</span></div>
      ) : null}

      <DataTable columns={columns} rows={rows} loading={loading} error={error} onRetry={load} showFilters={false} />

      <div className="panel flex flex-wrap items-center justify-between gap-2 p-3 text-xs">
        <div className="text-white/55">Rows: {total} | Page {page} of {Math.max(totalPages, 1)}</div>
        <div className="flex items-center gap-2">
          <select
            className="field w-36"
            value={perPage}
            onChange={(e) => {
              setPerPage(Number(e.target.value));
              setPage(1);
            }}
          >
            {[50, 100, 200].map((n) => <option key={n} value={n}>Page size {n}</option>)}
          </select>
          <button type="button" className="action-btn" disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
          <button type="button" className="action-btn" disabled={page >= totalPages || loading} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
        </div>
      </div>
    </div>
  );
};

export default Equipment;

