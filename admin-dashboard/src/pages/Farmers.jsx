import { useCallback, useEffect, useMemo, useState } from "react";
import { Edit2, Eye, Trash2 } from "lucide-react";
import DataTable from "../components/ui/DataTable";
import Drawer from "../components/ui/Drawer";
import Badge from "../components/ui/Badge";
import { apiTry, withQuery, apiClient } from "../api/client";
import { formatDateTime } from "../utils/format";
import BarChart from "../components/charts/BarChart";

const Farmers = () => {
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiTry([
        withQuery("/api/v1/admin/farmers", { page, per_page: 20, search, state: stateFilter }),
        withQuery("/api/v1/farmers/admin", { page, per_page: 20 }),
      ]);
      setRows(data.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, search, stateFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const loadDetail = useCallback(async (farmer) => {
    setSelected(farmer);
    try {
      const [profile, conversations, insight] = await Promise.all([
        apiTry([
          `/api/v1/admin/farmers/${farmer.id}`,
          `/api/v1/farmers/admin/${farmer.id}`,
        ]),
        apiTry([
          `/api/v1/admin/farmers/${farmer.id}/conversations`,
          `/api/v1/agent/conversations/${farmer.id}`,
        ]).catch(() => ({ conversations: [] })),
        apiTry([
          `/api/v1/analytics/farmer/${farmer.id}/summary?days=30`,
          `/api/v1/analytics/farmer/${farmer.id}/summary`,
        ]).catch(() => ({})),
      ]);

      setDetail({ profile, conversations, insight });
    } catch {
      setDetail(null);
    }
  }, []);

  const updateStatus = useCallback(async (farmer, isActive) => {
    await apiClient(`/api/v1/admin/farmers/${farmer.id}/status`, {
      method: "PUT",
      body: JSON.stringify({ is_active: isActive }),
    });
    load();
  }, [load]);

  const columns = useMemo(
    () => [
      { key: "idx", label: "#", render: (row) => rows.findIndex((x) => x.id === row.id) + 1 },
      { key: "name", label: "Name" },
      { key: "phone", label: "Phone" },
      { key: "village", label: "Village", render: (r) => r.village || r.profile?.village || "-" },
      { key: "district", label: "District", render: (r) => r.district || r.profile?.district || "-" },
      { key: "state", label: "State", render: (r) => r.state || r.profile?.state || "-" },
      { key: "land_holding_acres", label: "Land (acres)", render: (r) => r.land_holding_acres || r.profile?.land_holding_acres || "-" },
      { key: "soil_type", label: "Soil", render: (r) => r.soil_type || r.profile?.soil_type || "-" },
      { key: "irrigation_type", label: "Irrigation", render: (r) => r.irrigation_type || r.profile?.irrigation_type || "-" },
      { key: "language", label: "Language", render: (r) => r.language || r.profile?.language || "-" },
      {
        key: "status",
        label: "Status",
        render: (r) => <Badge tone={r.is_active === false ? "red" : "green"}>{r.is_active === false ? "Inactive" : "Active"}</Badge>,
      },
      { key: "created_at", label: "Joined", render: (r) => formatDateTime(r.created_at) },
      {
        key: "actions",
        label: "Actions",
        render: (r) => (
          <div className="flex items-center gap-1">
            <button type="button" className="icon-btn" onClick={(e) => { e.stopPropagation(); loadDetail(r); }}><Eye size={13} /></button>
            <button type="button" className="icon-btn" onClick={(e) => { e.stopPropagation(); updateStatus(r, !(r.is_active !== false)); }}><Edit2 size={13} /></button>
            <button type="button" className="icon-btn" onClick={(e) => { e.stopPropagation(); updateStatus(r, false); }}><Trash2 size={13} /></button>
          </div>
        ),
      },
    ],
    [loadDetail, rows, updateStatus]
  );

  return (
    <div className="space-y-3">
      <div className="panel flex items-center gap-2 p-3">
        <input value={search} onChange={(e) => setSearch(e.target.value)} className="field" placeholder="Search by name, phone, village, district" />
        <input value={stateFilter} onChange={(e) => setStateFilter(e.target.value)} className="field w-40" placeholder="State" />
        <button type="button" className="pill-btn" onClick={() => setPage(1)}>Apply</button>
        <button type="button" className="pill-btn border-white/30 bg-white/10">+ Add Farmer</button>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        error={error}
        onRetry={load}
        onRowClick={loadDetail}
        emptyTitle="No farmers found"
        emptySubtitle="Try broadening your search or changing filters."
      />

      <div className="flex items-center justify-end gap-2 text-xs text-white/60">
        <button type="button" className="action-btn" onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
        <span>Page {page}</span>
        <button type="button" className="action-btn" onClick={() => setPage((p) => p + 1)}>Next</button>
      </div>

      <Drawer open={Boolean(selected)} onClose={() => setSelected(null)} title={selected?.name || "Farmer Detail"}>
        {detail ? (
          <div className="space-y-4 text-xs text-white/75">
            <div>
              <h4 className="mb-2 font-display text-lg text-white/95">Profile</h4>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(detail.profile || {}).slice(0, 16).map(([key, value]) => (
                  <div key={key} className="rounded-lg border border-white/10 bg-white/[0.02] p-2">
                    <p className="text-[10px] uppercase tracking-wide text-white/45">{key}</p>
                    <p className="mt-1 break-all text-white/85">{String(value)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="mb-2 font-display text-lg text-white/95">Agent Sessions</h4>
              <div className="space-y-2">
                {(detail.conversations?.conversations || []).slice(0, 20).map((item) => (
                  <div key={item.id} className="rounded-lg border border-white/10 p-2">
                    <p className="text-white/80">{item.session_id || item.id}</p>
                    <p className="text-[10px] text-white/45">{formatDateTime(item.last_message_at || item.updated_at)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="mb-2 font-display text-lg text-white/95">Analytics</h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="panel p-2">
                  <p className="text-[10px] text-white/50">Total Crops</p>
                  <p className="font-display text-2xl text-white/95">{detail.insight?.totals?.crops || detail.insight?.total_crops || 0}</p>
                </div>
                <div className="panel p-2">
                  <p className="text-[10px] text-white/50">Sessions</p>
                  <p className="font-display text-2xl text-white/95">{detail.insight?.totals?.sessions || detail.insight?.total_sessions || 0}</p>
                </div>
              </div>
              <div className="mt-2 panel p-3">
                <BarChart
                  data={Object.entries(detail.insight?.benchmarks || {}).slice(0, 5).map(([label, value]) => ({ label, value: Number(value) || 0 }))}
                  horizontal
                />
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-white/45">Loading farmer details...</p>
        )}
      </Drawer>
    </div>
  );
};

export default Farmers;

