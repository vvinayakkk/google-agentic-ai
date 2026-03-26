import { useCallback, useEffect, useState } from "react";
import { Play } from "lucide-react";
import { SYSTEM_TABS } from "../utils/constants";
import { apiTry, apiClient } from "../api/client";
import DataTable from "../components/ui/DataTable";

const SystemConfig = () => {
  const [tab, setTab] = useState(SYSTEM_TABS[0]);
  const [config, setConfig] = useState({});
  const [flags, setFlags] = useState({});
  const [ingestion, setIngestion] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [audit, setAudit] = useState([]);

  const load = useCallback(async () => {
    if (tab === "App Config") {
      const data = await apiTry(["/api/v1/admin/config"]);
      setConfig(data || {});
      setFlags(data?.feature_flags || {});
    } else if (tab === "Ingestion") {
      const data = await apiTry(["/api/v1/admin/ingestion/logs", "/api/v1/admin/freshness"]);
      setIngestion(data.items || []);
    } else if (tab === "Admin Users") {
      const data = await apiTry(["/api/v1/admin/admins"]);
      setAdmins(data.items || []);
    } else if (tab === "Audit Log") {
      const data = await apiTry(["/api/v1/admin/ingestion/logs"]);
      setAudit(data.items || []);
    }
  }, [tab]);

  useEffect(() => {
    load().catch(() => {
      setIngestion([]);
      setAdmins([]);
      setAudit([]);
    });
  }, [load]);

  const saveConfig = useCallback(async () => {
    await apiClient("/api/v1/admin/config", {
      method: "PUT",
      body: JSON.stringify(config),
    });
    load();
  }, [config, load]);

  const saveFlags = useCallback(async () => {
    await apiClient("/api/v1/admin/config/feature-flags", {
      method: "PUT",
      body: JSON.stringify({ flags }),
    });
    load();
  }, [flags, load]);

  const trigger = useCallback(async (script) => {
    await apiClient(`/api/v1/admin/ingestion/trigger/${script}`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    load();
  }, [load]);

  const createAdmin = useCallback(async () => {
    await apiClient("/api/v1/admin/admins", {
      method: "POST",
      body: JSON.stringify({
        name: "New Admin",
        email: `admin${Date.now()}@kisankiawaz.in`,
        password: "Admin@123",
        role: "admin",
      }),
    });
    load();
  }, [load]);

  return (
    <div className="space-y-3">
      <div className="panel flex items-center gap-2 p-3">
        {SYSTEM_TABS.map((item) => (
          <button key={item} type="button" className={`pill-btn ${tab === item ? "border-white/30 bg-white/10" : ""}`} onClick={() => setTab(item)}>
            {item}
          </button>
        ))}
      </div>

      {tab === "App Config" ? (
        <div className="panel p-3 text-xs">
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(config).map(([key, value]) => (
              <label key={key} className="space-y-1">
                <span className="text-white/50">{key}</span>
                <input className="field" value={typeof value === "object" ? JSON.stringify(value) : String(value ?? "")} onChange={(e) => setConfig((p) => ({ ...p, [key]: e.target.value }))} />
              </label>
            ))}
          </div>
          <button type="button" className="pill-btn mt-3 border-white/30 bg-white/10" onClick={saveConfig}>Save Config</button>
        </div>
      ) : null}

      {tab === "Feature Flags" ? (
        <div className="panel p-3 text-xs">
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(flags).map(([key, value]) => (
              <label key={key} className="flex items-center justify-between rounded-lg border border-white/10 p-2">
                <span>{key}</span>
                <input type="checkbox" checked={Boolean(value)} onChange={(e) => setFlags((p) => ({ ...p, [key]: e.target.checked }))} />
              </label>
            ))}
          </div>
          <button type="button" className="pill-btn mt-3 border-white/30 bg-white/10" onClick={saveFlags}>Save Flags</button>
        </div>
      ) : null}

      {tab === "Ingestion" ? (
        <div className="space-y-3">
          <div className="panel flex flex-wrap items-center gap-2 p-3 text-xs">
            {["seed_reference_data", "generate_qdrant_indexes", "generate_analytics_snapshots", "upsert_schemes_from_file", "upsert_equipment_from_file"].map((task) => (
              <button key={task} type="button" className="action-btn" onClick={() => trigger(task)}>
                <Play size={12} /> {task}
              </button>
            ))}
          </div>
          <DataTable
            columns={[
              { key: "dataset", label: "Dataset", render: (r) => r.dataset || r.collection || r.id || "-" },
              { key: "status", label: "Status", render: (r) => r.status || "-" },
              { key: "row_count", label: "Rows", render: (r) => r.row_count || 0 },
              { key: "last_run_at", label: "Last Run", render: (r) => r.last_run_at || "-" },
            ]}
            rows={ingestion}
          />
        </div>
      ) : null}

      {tab === "Admin Users" ? (
        <div className="space-y-2">
          <button type="button" className="pill-btn border-white/30 bg-white/10" onClick={createAdmin}>Create Admin User</button>
          <DataTable
            columns={[
              { key: "id", label: "ID", render: (r) => r.id || r.admin_id || "-" },
              { key: "name", label: "Name" },
              { key: "email", label: "Email" },
              { key: "role", label: "Role" },
              { key: "is_active", label: "Status", render: (r) => (r.is_active ? "Active" : "Inactive") },
              { key: "last_login_at", label: "Last Login" },
            ]}
            rows={admins}
          />
        </div>
      ) : null}

      {tab === "Audit Log" ? (
        <DataTable
          columns={[
            { key: "timestamp", label: "Timestamp", render: (r) => r.timestamp || r.last_run_at || "-" },
            { key: "admin_id", label: "Admin" },
            { key: "action", label: "Action", render: (r) => r.action || r.dataset || "-" },
            { key: "target_doc_id", label: "Target ID", render: (r) => r.target_doc_id || "-" },
            { key: "payload_summary", label: "Details", render: (r) => r.payload_summary || r.status || "-" },
          ]}
          rows={audit}
        />
      ) : null}
    </div>
  );
};

export default SystemConfig;

