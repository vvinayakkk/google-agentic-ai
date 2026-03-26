import { useCallback, useEffect, useMemo, useState } from "react";
import DataTable from "../components/ui/DataTable";
import { NOTIFICATION_TABS } from "../utils/constants";
import { apiTry, apiClient, withQuery } from "../api/client";
import Badge from "../components/ui/Badge";

const Notifications = () => {
  const [tab, setTab] = useState(NOTIFICATION_TABS[0]);
  const [rows, setRows] = useState([]);
  const [preferences, setPreferences] = useState(null);
  const [form, setForm] = useState({
    title: "",
    message: "",
    role: "farmer",
    notification_type: "general",
  });

  const load = useCallback(async () => {
    if (tab === "All Notifications") {
      const data = await apiTry([withQuery("/api/v1/notifications/", { page: 1, per_page: 50 })]);
      setRows(data.items || data.notifications || []);
    } else if (tab === "Preferences") {
      const data = await apiTry(["/api/v1/notifications/preferences/"]);
      setPreferences(data);
    }
  }, [tab]);

  useEffect(() => {
    load().catch(() => {
      setRows([]);
      setPreferences(null);
    });
  }, [load]);

  const markRead = useCallback(async (row) => {
    await apiClient(`/api/v1/notifications/${row.id || row.notification_id}/read`, { method: "PUT" });
    load();
  }, [load]);

  const remove = useCallback(async (row) => {
    await apiClient(`/api/v1/notifications/${row.id || row.notification_id}`, { method: "DELETE" });
    load();
  }, [load]);

  const broadcast = async () => {
    await apiClient("/api/v1/notifications/broadcast", {
      method: "POST",
      body: JSON.stringify(form),
    });
    setForm({ title: "", message: "", role: "farmer", notification_type: "general" });
  };

  const savePreferences = async () => {
    await apiClient("/api/v1/notifications/preferences/", {
      method: "PUT",
      body: JSON.stringify(preferences),
    });
    load();
  };

  const columns = useMemo(
    () => [
      { key: "id", label: "ID", render: (r) => r.id || r.notification_id || "-" },
      { key: "title", label: "Title", render: (r) => r.title || "-" },
      { key: "message", label: "Message", render: (r) => r.message || "-" },
      { key: "type", label: "Type", render: (r) => <Badge tone="blue">{r.notification_type || r.type || "general"}</Badge> },
      { key: "read", label: "Read", render: (r) => <Badge tone={r.is_read ? "green" : "orange"}>{r.is_read ? "Yes" : "No"}</Badge> },
      { key: "created", label: "Created At", render: (r) => r.created_at || "-" },
      {
        key: "actions",
        label: "Actions",
        render: (r) => (
          <div className="flex gap-1">
            <button type="button" className="action-btn" onClick={() => markRead(r)}>Mark Read</button>
            <button type="button" className="action-btn text-rose-300" onClick={() => remove(r)}>Delete</button>
          </div>
        ),
      },
    ],
    [markRead, remove]
  );

  return (
    <div className="space-y-3">
      <div className="panel flex items-center gap-2 p-3">
        {NOTIFICATION_TABS.map((item) => (
          <button key={item} type="button" className={`pill-btn ${tab === item ? "border-white/30 bg-white/10" : ""}`} onClick={() => setTab(item)}>
            {item}
          </button>
        ))}
      </div>

      {tab === "All Notifications" ? <DataTable columns={columns} rows={rows} /> : null}

      {tab === "Broadcast" ? (
        <div className="panel grid grid-cols-2 gap-3 p-3 text-xs">
          <label className="space-y-1">
            <span className="text-white/50">Title</span>
            <input className="field" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
          </label>
          <label className="space-y-1">
            <span className="text-white/50">Role target</span>
            <select className="field" value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}>
              <option value="farmer">farmer</option>
              <option value="all">all</option>
            </select>
          </label>
          <label className="col-span-2 space-y-1">
            <span className="text-white/50">Message</span>
            <textarea className="field min-h-24" value={form.message} onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))} />
          </label>
          <label className="space-y-1">
            <span className="text-white/50">Notification Type</span>
            <select className="field" value={form.notification_type} onChange={(e) => setForm((p) => ({ ...p, notification_type: e.target.value }))}>
              <option value="price_alert">price_alert</option>
              <option value="scheme_alert">scheme_alert</option>
              <option value="crop_advisory">crop_advisory</option>
              <option value="general">general</option>
            </select>
          </label>
          <div className="flex items-end">
            <button type="button" className="pill-btn border-white/30 bg-white/10" onClick={broadcast}>Send Broadcast</button>
          </div>
          <div className="col-span-2 rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <p className="mb-1 text-[10px] uppercase tracking-wide text-white/45">Preview</p>
            <p className="text-sm text-white/85">{form.title || "Notification title"}</p>
            <p className="text-xs text-white/60">{form.message || "Notification preview message."}</p>
          </div>
        </div>
      ) : null}

      {tab === "Preferences" ? (
        <div className="panel p-3 text-xs">
          {preferences ? (
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(preferences).map(([key, value]) => (
                <label key={key} className="space-y-1">
                  <span className="text-white/50">{key}</span>
                  <input
                    className="field"
                    value={typeof value === "object" ? JSON.stringify(value) : String(value)}
                    onChange={(e) => setPreferences((p) => ({ ...p, [key]: e.target.value }))}
                  />
                </label>
              ))}
              <div className="col-span-2">
                <button type="button" className="pill-btn border-white/30 bg-white/10" onClick={savePreferences}>Save Preferences</button>
              </div>
            </div>
          ) : (
            <p className="text-white/45">No preferences loaded.</p>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default Notifications;

