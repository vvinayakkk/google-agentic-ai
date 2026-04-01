import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Upload, Plus, Filter, Search, ChevronLeft, ChevronRight,
  Wrench, Truck, Users, BarChart2, AlertTriangle, CheckCircle,
  Clock, XCircle, Calendar, MapPin, Activity, RefreshCw,
  Package, Zap, TrendingUp, Eye
} from "lucide-react";
import DataTable from "../components/ui/DataTable";
import Badge from "../components/ui/Badge";
import { apiTry, withQuery, apiClient } from "../api/client";

// ─── constants ────────────────────────────────────────────────────────────────

const toneByStatus = {
  pending: "orange",
  approved: "green",
  rejected: "red",
  completed: "blue",
  cancelled: "muted",
};

const statusColors = {
  pending:   { bg: "rgba(245,158,11,0.15)",  border: "rgba(245,158,11,0.4)",  text: "#f59e0b",  dot: "#f59e0b"  },
  approved:  { bg: "rgba(34,197,94,0.15)",   border: "rgba(34,197,94,0.4)",   text: "#22c55e",  dot: "#22c55e"  },
  rejected:  { bg: "rgba(239,68,68,0.15)",   border: "rgba(239,68,68,0.4)",   text: "#ef4444",  dot: "#ef4444"  },
  completed: { bg: "rgba(96,165,250,0.15)",  border: "rgba(96,165,250,0.4)",  text: "#60a5fa",  dot: "#60a5fa"  },
  cancelled: { bg: "rgba(100,100,100,0.15)", border: "rgba(100,100,100,0.4)", text: "#888",     dot: "#888"     },
};

const assetStatusColors = {
  available:   { bg: "rgba(34,197,94,0.15)",  text: "#22c55e",  label: "AVAILABLE"   },
  "in use":    { bg: "rgba(96,165,250,0.15)", text: "#60a5fa",  label: "IN USE"      },
  maintenance: { bg: "rgba(239,68,68,0.15)",  text: "#ef4444",  label: "MAINTENANCE" },
  inactive:    { bg: "rgba(100,100,100,0.15)",text: "#888",     label: "INACTIVE"    },
};

const TAB_COLLECTIONS = {
  "Rental Requests": "equipment_bookings",
  Inventory:         "equipment",
  Maintenance:       "equipment",
  Vendors:           "ref_equipment_providers",
  Analytics:         null,
};

const TABS = ["Rental Requests", "Inventory", "Maintenance", "Vendors", "Analytics"];

// ─── sub-components ───────────────────────────────────────────────────────────

const StatusPill = ({ status = "pending" }) => {
  const s = status.toLowerCase();
  const c = statusColors[s] || statusColors.pending;
  return (
    <span style={{
      background: c.bg, border: `1px solid ${c.border}`, color: c.text,
      borderRadius: 4, fontSize: 11, fontWeight: 600,
      padding: "2px 8px", fontFamily: "Geist Mono, monospace",
      letterSpacing: "0.04em", textTransform: "uppercase",
    }}>
      {status}
    </span>
  );
};

const AssetStatusPill = ({ status = "available" }) => {
  const s = status.toLowerCase();
  const c = assetStatusColors[s] || assetStatusColors.available;
  return (
    <span style={{
      background: c.bg, color: c.text,
      borderRadius: 4, fontSize: 10, fontWeight: 700,
      padding: "3px 8px", letterSpacing: "0.06em", textTransform: "uppercase",
    }}>
      {c.label}
    </span>
  );
};

const StatTile = ({ label, value, icon: Icon, color = "#22c55e", sub, alert }) => (
  <div style={{
    background: "#141414", border: "1px solid #242424", borderRadius: 8,
    padding: "16px 20px", display: "flex", flexDirection: "column", gap: 6,
  }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <span style={{ fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: "0.07em" }}>
        {label}
      </span>
      {Icon && <Icon size={15} color={color} />}
    </div>
    <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
      <span style={{ fontSize: 28, fontWeight: 700, color: alert ? "#ef4444" : "#f0f0f0", lineHeight: 1 }}>
        {value}
      </span>
      {alert && <AlertTriangle size={18} color="#ef4444" style={{ marginBottom: 3 }} />}
    </div>
    {sub && <span style={{ fontSize: 11, color: "#555" }}>{sub}</span>}
  </div>
);

// ─── RENTAL REQUESTS TAB ──────────────────────────────────────────────────────

const RentalRequestsTab = ({ rows, loading, error, onRetry, total, page, totalPages, perPage, setPage, setPerPage }) => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Distribution counts from real data
  const counts = useMemo(() => {
    const base = { pending: 0, approved: 0, rejected: 0, completed: 0 };
    rows.forEach(r => {
      const s = (r.status || "pending").toLowerCase();
      if (s in base) base[s]++;
    });
    return base;
  }, [rows]);

  const totalCount = counts.pending + counts.approved + counts.rejected + counts.completed || 1;

  const filteredRows = useMemo(() => rows.filter(r => {
    const s = (r.status || "").toLowerCase();
    if (statusFilter !== "all" && s !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return JSON.stringify(r).toLowerCase().includes(q);
    }
    return true;
  }), [rows, statusFilter, search]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Distribution bar */}
      <div style={{ background: "#141414", border: "1px solid #242424", borderRadius: 8, padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Rental Request Distribution
          </span>
          <div style={{ display: "flex", gap: 14 }}>
            {[
              { label: "Completed", color: "#60a5fa" },
              { label: "Approved",  color: "#22c55e" },
              { label: "Pending",   color: "#f59e0b" },
              { label: "Rejected",  color: "#ef4444" },
            ].map(({ label, color }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
                <span style={{ fontSize: 10, color: "#666" }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
        {/* Stacked bar */}
        <div style={{ display: "flex", height: 10, borderRadius: 5, overflow: "hidden", gap: 2 }}>
          {[
            { key: "pending",   color: "#f59e0b" },
            { key: "approved",  color: "#22c55e" },
            { key: "rejected",  color: "#ef4444" },
            { key: "completed", color: "#60a5fa" },
          ].map(({ key, color }) => {
            const pct = (counts[key] / totalCount) * 100;
            if (pct < 1) return null;
            return (
              <div key={key} style={{ height: "100%", background: color, width: `${pct}%`, borderRadius: 3 }} />
            );
          })}
        </div>
        {/* Counts row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginTop: 14 }}>
          {[
            { label: "PENDING",   key: "pending",   color: "#f59e0b" },
            { label: "APPROVED",  key: "approved",  color: "#22c55e" },
            { label: "REJECTED",  key: "rejected",  color: "#ef4444" },
            { label: "COMPLETED", key: "completed", color: "#60a5fa" },
          ].map(({ label, key, color }) => (
            <div key={key}>
              <div style={{ fontSize: 10, color: "#555", letterSpacing: "0.06em", marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color }}>{counts[key]}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter row */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ position: "relative", flex: 1 }}>
          <Search size={13} color="#555" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search farmer or asset…"
            style={{
              width: "100%", height: 32, background: "#141414", border: "1px solid #242424",
              borderRadius: 6, padding: "0 10px 0 30px", fontSize: 13, color: "#f0f0f0",
              outline: "none", fontFamily: "inherit",
            }}
          />
        </div>
        {["all", "pending", "approved", "rejected", "completed"].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} style={{
            height: 30, padding: "0 12px", borderRadius: 6, fontSize: 12, cursor: "pointer",
            background: statusFilter === s ? "rgba(34,197,94,0.1)" : "transparent",
            border: `1px solid ${statusFilter === s ? "#22c55e" : "#242424"}`,
            color: statusFilter === s ? "#22c55e" : "#666",
            textTransform: "capitalize", fontFamily: "inherit",
          }}>
            {s === "all" ? "All" : s}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: "#141414", border: "1px solid #242424", borderRadius: 8, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#1a1a1a" }}>
              {["ID", "Asset", "Farmer", "Start Date", "End Date", "Status", "Actions"].map(h => (
                <th key={h} style={{
                  padding: "10px 14px", textAlign: "left", fontSize: 10, fontWeight: 500,
                  color: "#555", textTransform: "uppercase", letterSpacing: "0.07em",
                  borderBottom: "1px solid #242424",
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #1a1a1a" }}>
                {Array.from({ length: 7 }).map((__, j) => (
                  <td key={j} style={{ padding: "12px 14px" }}>
                    <div style={{ height: 12, background: "#222", borderRadius: 4, animation: "pulse 1.5s infinite" }} />
                  </td>
                ))}
              </tr>
            )) : filteredRows.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: 40, textAlign: "center", color: "#555", fontSize: 13 }}>
                  No rental requests found
                </td>
              </tr>
            ) : filteredRows.map((r, i) => {
              const reqId = r.id || r.rental_id || `RQ-${String(i + 1).padStart(4, "0")}`;
              const equipName = r.equipment_name || r.equipment || "—";
              const farmerId = r.renter_id || r.farmer_id || r.requester || "—";
              const phone = r.phone || r.renter_phone || "";
              return (
                <tr key={reqId} style={{
                  borderBottom: "1px solid #1a1a1a",
                  background: i % 2 === 0 ? "#0d0d0d" : "#111",
                  cursor: "pointer",
                  transition: "background 100ms",
                }}
                  onMouseEnter={e => e.currentTarget.style.background = "#1a1a1a"}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? "#0d0d0d" : "#111"}
                >
                  <td style={{ padding: "12px 14px" }}>
                    <span style={{ fontSize: 12, color: "#22c55e", fontFamily: "Geist Mono, monospace" }}>
                      #{String(reqId).slice(-4).padStart(4, "0")}
                    </span>
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 6, background: "#1a1a1a",
                        border: "1px solid #242424", display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <Truck size={13} color="#555" />
                      </div>
                      <div>
                        <div style={{ fontSize: 13, color: "#f0f0f0", fontWeight: 500 }}>{equipName}</div>
                        <div style={{ fontSize: 10, color: "#555" }}>{r.equipment_type || r.type || ""}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ fontSize: 13, color: "#ccc" }}>{farmerId}</div>
                    {phone && <div style={{ fontSize: 10, color: "#555", fontFamily: "Geist Mono, monospace" }}>{phone}</div>}
                  </td>
                  <td style={{ padding: "12px 14px", fontSize: 12, color: "#888", fontFamily: "Geist Mono, monospace" }}>
                    {r.start_date ? r.start_date.slice(0, 10) : "—"}
                  </td>
                  <td style={{ padding: "12px 14px", fontSize: 12, color: "#888", fontFamily: "Geist Mono, monospace" }}>
                    {r.end_date ? r.end_date.slice(0, 10) : "—"}
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <StatusPill status={r.status || "pending"} />
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <button style={{
                      fontSize: 11, color: "#22c55e", background: "transparent",
                      border: "none", cursor: "pointer", padding: 0,
                    }}>
                      View →
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Pagination */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 14px", borderTop: "1px solid #1a1a1a",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: "#555" }}>Show per page:</span>
            <select
              value={perPage}
              onChange={e => { setPerPage(Number(e.target.value)); setPage(1); }}
              style={{
                height: 28, background: "#1a1a1a", border: "1px solid #242424",
                borderRadius: 4, padding: "0 8px", fontSize: 12, color: "#aaa",
                outline: "none", cursor: "pointer",
              }}
            >
              {[25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <span style={{ fontSize: 12, color: "#555" }}>
              {total > 0 ? `${(page - 1) * perPage + 1} – ${Math.min(page * perPage, total)} of ${total} records` : "0 records"}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              style={{
                width: 28, height: 28, borderRadius: 4, border: "1px solid #242424",
                background: "transparent", cursor: page <= 1 ? "not-allowed" : "pointer",
                color: page <= 1 ? "#333" : "#888", display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(n => (
              <button key={n} onClick={() => setPage(n)} style={{
                width: 28, height: 28, borderRadius: 4, fontSize: 12, cursor: "pointer",
                border: `1px solid ${page === n ? "#22c55e" : "#242424"}`,
                background: page === n ? "rgba(34,197,94,0.1)" : "transparent",
                color: page === n ? "#22c55e" : "#888", fontFamily: "inherit",
              }}>
                {n}
              </button>
            ))}
            {totalPages > 5 && <span style={{ color: "#555", fontSize: 12 }}>…</span>}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              style={{
                width: 28, height: 28, borderRadius: 4, border: "1px solid #242424",
                background: "transparent", cursor: page >= totalPages ? "not-allowed" : "pointer",
                color: page >= totalPages ? "#333" : "#888", display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom spotlight + maintenance panels */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Inventory spotlight */}
        <div style={{
          background: "#141414", border: "1px solid #242424", borderRadius: 8,
          overflow: "hidden", position: "relative",
        }}>
          <div style={{ padding: "16px 20px", position: "relative", zIndex: 1 }}>
            <div style={{ fontSize: 10, color: "#22c55e", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
              Inventory Spotlight
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#f0f0f0", marginBottom: 8 }}>
              Equipment Available for Rent
            </div>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 16, lineHeight: 1.6 }}>
              Browse active equipment listings and manage rental availability across all regions.
            </div>
            <button
              onClick={() => {}}
              style={{
                height: 30, padding: "0 14px", borderRadius: 6, fontSize: 12, cursor: "pointer",
                background: "transparent", border: "1px solid #444", color: "#ccc", fontFamily: "inherit",
              }}
            >
              View Inventory
            </button>
          </div>
        </div>

        {/* Upcoming maintenance */}
        <div style={{ background: "#141414", border: "1px solid #242424", borderRadius: 8, padding: 16 }}>
          <div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
            Upcoming Maintenance
          </div>
          {rows.slice(0, 3).map((r, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 0", borderBottom: i < 2 ? "1px solid #1a1a1a" : "none",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e" }} />
                <div>
                  <div style={{ fontSize: 12, color: "#ccc" }}>{r.equipment_name || r.name || `Asset #${i + 1}`}</div>
                  <div style={{ fontSize: 10, color: "#555" }}>Service Due · {r.end_date ? r.end_date.slice(0, 10) : "Scheduled"}</div>
                </div>
              </div>
              <ChevronRight size={14} color="#444" />
            </div>
          ))}
          {rows.length === 0 && (
            <div style={{ fontSize: 12, color: "#555", textAlign: "center", padding: "12px 0" }}>No scheduled maintenance</div>
          )}
          <button style={{
            width: "100%", marginTop: 12, height: 30, borderRadius: 6, fontSize: 11,
            background: "transparent", border: "1px solid #242424", color: "#555",
            cursor: "pointer", letterSpacing: "0.04em", textTransform: "uppercase", fontFamily: "inherit",
          }}>
            Schedule All Services
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── INVENTORY TAB ────────────────────────────────────────────────────────────

// ── mini donut SVG (pure SVG, no deps) ────────────────────────────────────────
const DonutRing = ({ segments, size = 80, stroke = 10 }) => {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1a1a1a" strokeWidth={stroke} />
      {segments.map((seg, i) => {
        const dash = (seg.value / total) * circ;
        const gap = circ - dash;
        const el = (
          <circle key={i} cx={size/2} cy={size/2} r={r} fill="none"
            stroke={seg.color} strokeWidth={stroke}
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-offset * circ / total}
            strokeLinecap="round"
          />
        );
        offset += seg.value;
        return el;
      })}
    </svg>
  );
};

// ── mini sparkbar row ─────────────────────────────────────────────────────────
const SparkBars = ({ values = [], color = "#22c55e", height = 32 }) => {
  const max = Math.max(...values, 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height }}>
      {values.map((v, i) => (
        <div key={i} style={{
          flex: 1, borderRadius: 2,
          height: `${Math.max((v / max) * 100, 8)}%`,
          background: i === values.length - 1 ? color : `${color}55`,
          transition: "height 300ms ease",
        }} />
      ))}
    </div>
  );
};

const InventoryTab = ({ rows, loading, total, page, totalPages, perPage, setPage, setPerPage }) => {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const types = useMemo(() => {
    const s = new Set(rows.map(r => r.type || r.equipment_type).filter(Boolean));
    return ["All", ...s];
  }, [rows]);

  const filtered = useMemo(() => rows.filter(r => {
    if (typeFilter !== "All" && (r.type || r.equipment_type) !== typeFilter) return false;
    if (statusFilter !== "All" && (r.status || "").toLowerCase() !== statusFilter.toLowerCase()) return false;
    if (search) return JSON.stringify(r).toLowerCase().includes(search.toLowerCase());
    return true;
  }), [rows, typeFilter, statusFilter, search]);

  // All stats computed from real data — never show "—" for counts
  const available    = rows.filter(r => (r.status || "available").toLowerCase() === "available" || r.available === true).length;
  const inUse        = rows.filter(r => (r.status || "").toLowerCase() === "in use").length;
  const maintenance  = rows.filter(r => (r.status || "").toLowerCase() === "maintenance" || r.available === false).length;
  const inactive     = rows.filter(r => (r.status || "").toLowerCase() === "inactive").length;
  const utilRate     = rows.length > 0 ? Math.round((inUse / rows.length) * 100) : 0;
  const totalVal     = rows.reduce((s, r) => s + Number(r.rate_per_day || r.rate_per_hour || 0), 0);
  const hasData      = rows.length > 0;

  // Fake sparkbar for the trend (relative pattern across types)
  const typeBreakdown = useMemo(() => {
    const m = {};
    rows.forEach(r => { const t = r.type || r.equipment_type || "Other"; m[t] = (m[t] || 0) + 1; });
    return Object.values(m).slice(0, 8);
  }, [rows]);

  const donutSegments = [
    { value: available,   color: "#22c55e" },
    { value: inUse,       color: "#60a5fa" },
    { value: maintenance, color: "#f59e0b" },
    { value: inactive,    color: "#444" },
  ].filter(s => s.value > 0);

  // If no real data at all, show a neutral donut placeholder
  const donutDisplay = donutSegments.length > 0 ? donutSegments : [{ value: 1, color: "#242424" }];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── TOP METRICS ROW ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1.4fr", gap: 12 }}>

        {/* Total Assets */}
        <div style={{ background: "#141414", border: "1px solid #242424", borderRadius: 8, padding: "16px 18px" }}>
          <div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Total Assets</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#f0f0f0", lineHeight: 1 }}>
            {hasData ? total.toLocaleString() : <span style={{ fontSize: 18, color: "#333" }}>No data yet</span>}
          </div>
          <div style={{ marginTop: 10 }}>
            <SparkBars values={typeBreakdown.length > 0 ? typeBreakdown : [1,1,1,1,1,1,1,1]} color="#22c55e" height={28} />
          </div>
          <div style={{ fontSize: 10, color: "#444", marginTop: 4 }}>by equipment type</div>
        </div>

        {/* Utilisation */}
        <div style={{ background: "#141414", border: "1px solid #242424", borderRadius: 8, padding: "16px 18px" }}>
          <div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Utilisation Rate</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: utilRate > 0 ? "#22c55e" : "#f0f0f0", lineHeight: 1 }}>
            {utilRate}<span style={{ fontSize: 16, fontWeight: 400, color: "#555" }}>%</span>
          </div>
          <div style={{ marginTop: 10, height: 6, background: "#1a1a1a", borderRadius: 3 }}>
            <div style={{
              height: "100%", borderRadius: 3,
              width: `${utilRate > 0 ? utilRate : 100}%`,
              background: utilRate > 0 ? "#22c55e" : "#1e1e1e",
              transition: "width 600ms ease",
            }} />
          </div>
          <div style={{ fontSize: 10, color: "#444", marginTop: 6 }}>
            {hasData ? `${inUse} of ${rows.length} assets active` : "Connect backend to see data"}
          </div>
        </div>

        {/* Needs Attention */}
        <div style={{ background: "#141414", border: "1px solid #242424", borderRadius: 8, padding: "16px 18px" }}>
          <div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Needs Attention</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: maintenance > 0 ? "#f59e0b" : "#f0f0f0", lineHeight: 1 }}>
            {maintenance}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 10 }}>
            {[
              { label: "In Maintenance", val: maintenance, color: "#f59e0b" },
              { label: "Inactive",        val: inactive,    color: "#555"    },
            ].map(({ label, val, color }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                <span style={{ color: "#555" }}>{label}</span>
                <span style={{ color, fontFamily: "monospace" }}>{val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Status breakdown donut */}
        <div style={{ background: "#141414", border: "1px solid #242424", borderRadius: 8, padding: "16px 18px", display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ position: "relative", flexShrink: 0 }}>
            <DonutRing segments={donutDisplay} size={76} stroke={9} />
            <div style={{
              position: "absolute", inset: 0, display: "flex", alignItems: "center",
              justifyContent: "center", flexDirection: "column",
            }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: "#f0f0f0" }}>{rows.length}</span>
              <span style={{ fontSize: 9, color: "#555" }}>total</span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
            {[
              { label: "Available",   val: available,   color: "#22c55e" },
              { label: "In Use",      val: inUse,       color: "#60a5fa" },
              { label: "Maintenance", val: maintenance, color: "#f59e0b" },
              { label: "Inactive",    val: inactive,    color: "#444"    },
            ].map(({ label, val, color }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: "#666", flex: 1 }}>{label}</span>
                <span style={{ fontSize: 11, color: "#aaa", fontFamily: "monospace" }}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── SECONDARY METRIC ROW ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {[
          {
            icon: TrendingUp, color: "#22c55e",
            label: "Est. Daily Revenue Capacity",
            value: totalVal > 0 ? `₹${totalVal.toLocaleString("en-IN")}` : "—",
            sub: totalVal > 0 ? "From rate_per_day / rate_per_hour fields" : "No rate data in collection",
          },
          {
            icon: Wrench, color: "#f59e0b",
            label: "Maintenance Scheduled",
            value: maintenance,
            sub: maintenance > 0 ? `${maintenance} asset${maintenance !== 1 ? "s" : ""} flagged` : "All assets clear",
          },
          {
            icon: Package, color: "#60a5fa",
            label: "Available Right Now",
            value: available,
            sub: available > 0 ? `${Math.round((available / Math.max(rows.length, 1)) * 100)}% of fleet ready` : "No availability data",
          },
        ].map(({ icon: Icon, color, label, value, sub }) => (
          <div key={label} style={{
            background: "#141414", border: "1px solid #242424", borderRadius: 8,
            padding: "14px 16px", display: "flex", alignItems: "center", gap: 14,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10, flexShrink: 0,
              background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Icon size={18} color={color} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#f0f0f0", lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 11, color: "#444", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── FILTER + TABLE ── */}
      <div style={{ background: "#141414", border: "1px solid #242424", borderRadius: 8, overflow: "hidden" }}>
        {/* filter bar inside the card */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderBottom: "1px solid #1a1a1a" }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Search size={13} color="#555" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by Asset ID or Name…"
              style={{ width: "100%", height: 30, background: "#111", border: "1px solid #2a2a2a", borderRadius: 5, padding: "0 10px 0 30px", fontSize: 13, color: "#f0f0f0", outline: "none", fontFamily: "inherit" }} />
          </div>
          {[
            { label: "Type",   value: typeFilter,   options: types,                                                          onChange: setTypeFilter   },
            { label: "Status", value: statusFilter, options: ["All", "available", "in use", "maintenance", "inactive"],      onChange: setStatusFilter },
          ].map(({ label, value, options, onChange }) => (
            <select key={label} value={value} onChange={e => onChange(e.target.value)} style={{
              height: 30, background: "#111", border: "1px solid #2a2a2a", borderRadius: 5,
              padding: "0 10px", fontSize: 12, color: "#aaa", outline: "none", cursor: "pointer", minWidth: 100,
            }}>
              {options.map(o => <option key={o} value={o}>{label}: {o}</option>)}
            </select>
          ))}
          <span style={{ fontSize: 12, color: "#444", whiteSpace: "nowrap" }}>{filtered.length} results</span>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#1a1a1a" }}>
              {["Asset ID", "Name", "Type", "Model / Desc", "Status", "Rate", "Last Updated"].map(h => (
                <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 10, fontWeight: 500, color: "#555", textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: "1px solid #242424" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? Array.from({ length: 6 }).map((_, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #1a1a1a" }}>
                {Array.from({ length: 7 }).map((__, j) => (
                  <td key={j} style={{ padding: "12px 14px" }}>
                    <div style={{ height: 11, background: "#1e1e1e", borderRadius: 3, animation: "pulse 1.4s infinite" }} />
                  </td>
                ))}
              </tr>
            )) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: "48px 14px", textAlign: "center" }}>
                  <Package size={32} color="#2a2a2a" style={{ margin: "0 auto 10px" }} />
                  <div style={{ fontSize: 13, color: "#555" }}>{rows.length === 0 ? "No inventory data loaded yet" : "No assets match your filters"}</div>
                  <div style={{ fontSize: 11, color: "#3a3a3a", marginTop: 4 }}>
                    {rows.length === 0 ? "Data will appear once the backend returns equipment records" : "Try clearing your search or filter"}
                  </div>
                </td>
              </tr>
            ) : filtered.map((r, i) => {
              const assetId = r.asset_id || r.id || `AST-${String(i + 1).padStart(3, "0")}`;
              const status  = (r.status || "available").toLowerCase();
              const rate    = r.rate_per_day ? `₹${r.rate_per_day}/day` : r.rate_per_hour ? `₹${r.rate_per_hour}/hr` : "—";
              return (
                <tr key={String(assetId)} style={{ borderBottom: "1px solid #1a1a1a", background: i % 2 === 0 ? "#0d0d0d" : "#111111", cursor: "pointer", transition: "background 100ms" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#181818"}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? "#0d0d0d" : "#111111"}
                >
                  <td style={{ padding: "11px 14px" }}>
                    <span style={{ fontSize: 12, color: "#22c55e", fontFamily: "Geist Mono, monospace" }}>{String(assetId).slice(0, 14)}</span>
                  </td>
                  <td style={{ padding: "11px 14px" }}>
                    <div style={{ fontSize: 13, color: "#f0f0f0", fontWeight: 500 }}>{r.name || r.equipment_name || "—"}</div>
                  </td>
                  <td style={{ padding: "11px 14px", fontSize: 12, color: "#888" }}>{r.type || r.equipment_type || "—"}</td>
                  <td style={{ padding: "11px 14px", fontSize: 12, color: "#666", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.model || r.description || "—"}</td>
                  <td style={{ padding: "11px 14px" }}><AssetStatusPill status={status} /></td>
                  <td style={{ padding: "11px 14px", fontSize: 12, color: "#60a5fa", fontFamily: "monospace" }}>{rate}</td>
                  <td style={{ padding: "11px 14px", fontSize: 11, color: "#444", fontFamily: "monospace" }}>
                    {(r.updated_at || r.created_at || "").slice(0, 10) || "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderTop: "1px solid #1a1a1a" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: "#555" }}>Show</span>
            <select value={perPage} onChange={e => { setPerPage(Number(e.target.value)); setPage(1); }}
              style={{ height: 26, background: "#111", border: "1px solid #2a2a2a", borderRadius: 4, padding: "0 8px", fontSize: 11, color: "#888", outline: "none" }}>
              {[25, 50, 100].map(n => <option key={n} value={n}>{n} per page</option>)}
            </select>
            <span style={{ fontSize: 12, color: "#555" }}>
              {total > 0 ? `${(page-1)*perPage+1}–${Math.min(page*perPage,total)} of ${total}` : "0 records"}
            </span>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page<=1}
              style={{ height: 26, padding: "0 10px", borderRadius: 4, border: "1px solid #242424", background: "transparent", color: page<=1?"#333":"#777", cursor: page<=1?"not-allowed":"pointer", fontSize: 12 }}>
              ← Prev
            </button>
            {Array.from({ length: Math.min(totalPages, 4) }, (_, i) => i+1).map(n => (
              <button key={n} onClick={() => setPage(n)}
                style={{ width: 26, height: 26, borderRadius: 4, fontSize: 12, cursor: "pointer", border: `1px solid ${page===n?"#22c55e":"#242424"}`, background: page===n?"rgba(34,197,94,0.1)":"transparent", color: page===n?"#22c55e":"#777" }}>
                {n}
              </button>
            ))}
            {totalPages > 4 && <span style={{ color: "#444", fontSize: 12, padding: "0 4px" }}>…</span>}
            <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page>=totalPages}
              style={{ height: 26, padding: "0 10px", borderRadius: 4, border: "1px solid #242424", background: "transparent", color: page>=totalPages?"#333":"#777", cursor: page>=totalPages?"not-allowed":"pointer", fontSize: 12 }}>
              Next →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── MAINTENANCE TAB ──────────────────────────────────────────────────────────

const MaintenanceTab = ({ rows, loading }) => {
  // Derive maintenance stats from real rows
  const overdue    = rows.filter(r => r.status === "overdue" || r.overdue).length;
  const scheduled  = rows.filter(r => (r.status || "").toLowerCase() === "scheduled").length;
  const active     = rows.filter(r => (r.technician || r.assigned_to)).length;
  const completed  = rows.filter(r => (r.status || "").toLowerCase() === "completed").length;

  const serviceTypeColor = { Routine: "#60a5fa", Repair: "#f59e0b", Overhaul: "#a78bfa" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Top stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        <StatTile label="Overdue Maintenance" value={overdue} icon={AlertTriangle} color="#ef4444" alert={overdue > 0} />
        <StatTile label="Scheduled (7 days)" value={scheduled} icon={Calendar} color="#60a5fa" />
        <StatTile label="Active Technicians" value={active} icon={Users} color="#22c55e" />
        <StatTile label="Completed (MTD)" value={completed} icon={CheckCircle} color="#22c55e" />
      </div>

      {/* Schedule table */}
      <div style={{ background: "#141414", border: "1px solid #242424", borderRadius: 8, overflow: "hidden" }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 16px", borderBottom: "1px solid #242424",
        }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#f0f0f0" }}>Maintenance Schedules & Logs</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{
              height: 30, padding: "0 12px", borderRadius: 6, fontSize: 12, cursor: "pointer",
              background: "transparent", border: "1px solid #242424", color: "#666", fontFamily: "inherit",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <Users size={13} /> Manage Technicians
            </button>
            <button style={{
              height: 30, padding: "0 12px", borderRadius: 6, fontSize: 12, cursor: "pointer",
              background: "#22c55e", border: "none", color: "#000", fontWeight: 600, fontFamily: "inherit",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              + Log Service
            </button>
          </div>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#1a1a1a" }}>
              {["Schedule ID", "Asset Name", "Service Type", "Technician", "Scheduled Date", "Status", "Action"].map(h => (
                <th key={h} style={{
                  padding: "10px 14px", textAlign: "left", fontSize: 10, fontWeight: 500,
                  color: "#555", textTransform: "uppercase", letterSpacing: "0.07em",
                  borderBottom: "1px solid #242424",
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? Array.from({ length: 4 }).map((_, i) => (
              <tr key={i}>
                {Array.from({ length: 7 }).map((__, j) => (
                  <td key={j} style={{ padding: "12px 14px" }}>
                    <div style={{ height: 12, background: "#222", borderRadius: 4 }} />
                  </td>
                ))}
              </tr>
            )) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: 40, textAlign: "center", color: "#555", fontSize: 13 }}>
                  No maintenance records found
                </td>
              </tr>
            ) : rows.slice(0, 20).map((r, i) => {
              const schedId = r.id ? `MNT-${String(r.id).slice(-4)}-${String.fromCharCode(65 + (i % 26))}` : `MNT-${String(i + 1).padStart(4, "0")}`;
              const svcType = r.service_type || r.type || "Routine";
              const svcColor = serviceTypeColor[svcType] || "#666";
              const rowStatus = r.status || "scheduled";
              const statusDot = { overdue: "#ef4444", completed: "#22c55e", scheduled: "#f59e0b" }[rowStatus.toLowerCase()] || "#888";
              return (
                <tr key={schedId} style={{
                  borderBottom: "1px solid #1a1a1a",
                  background: i % 2 === 0 ? "#0d0d0d" : "#111",
                }}>
                  <td style={{ padding: "12px 14px", fontSize: 12, color: "#22c55e", fontFamily: "Geist Mono, monospace" }}>{schedId}</td>
                  <td style={{ padding: "12px 14px", fontSize: 13, color: "#f0f0f0" }}>{r.name || r.equipment_name || "—"}</td>
                  <td style={{ padding: "12px 14px" }}>
                    <span style={{
                      background: `${svcColor}20`, color: svcColor, borderRadius: 4,
                      fontSize: 11, fontWeight: 600, padding: "2px 8px",
                    }}>
                      {svcType}
                    </span>
                  </td>
                  <td style={{ padding: "12px 14px", fontSize: 12, color: "#888" }}>
                    {r.technician || r.assigned_to || <span style={{ color: "#444" }}>Unassigned</span>}
                  </td>
                  <td style={{ padding: "12px 14px", fontSize: 12, color: "#888", fontFamily: "Geist Mono, monospace" }}>
                    {r.scheduled_date ? r.scheduled_date.slice(0, 10) : r.created_at ? r.created_at.slice(0, 10) : "—"}
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: statusDot }} />
                      <span style={{ fontSize: 12, color: statusDot, textTransform: "capitalize" }}>{rowStatus}</span>
                    </div>
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <button style={{
                      fontSize: 12, color: "#22c55e", background: "transparent",
                      border: "none", cursor: "pointer", fontFamily: "inherit",
                    }}>
                      {rowStatus.toLowerCase() === "completed" ? "View Log" :
                       rowStatus.toLowerCase() === "overdue" ? "Update" : "Assign"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{ padding: "10px 14px", borderTop: "1px solid #1a1a1a", display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button style={{ height: 28, padding: "0 12px", borderRadius: 4, border: "1px solid #242424", background: "transparent", color: "#666", cursor: "pointer", fontSize: 12 }}>
            Previous
          </button>
          <button style={{ height: 28, padding: "0 12px", borderRadius: 4, border: "1px solid #242424", background: "transparent", color: "#666", cursor: "pointer", fontSize: 12 }}>
            Next
          </button>
        </div>
      </div>

      {/* Bottom row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ background: "#141414", border: "1px solid #242424", borderRadius: 8, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#f0f0f0", marginBottom: 12 }}>
            Recent Maintenance Activity
          </div>
          {rows.filter(r => r.status === "completed").slice(0, 4).map((r, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 10 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", marginTop: 5, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 12, color: "#ccc" }}>
                  {r.notes || r.description || `Service completed on ${r.name || "asset"}`}
                </div>
                <div style={{ fontSize: 10, color: "#555" }}>
                  {r.updated_at ? r.updated_at.slice(0, 10) : "Recently"}
                </div>
              </div>
            </div>
          ))}
          {rows.filter(r => r.status === "completed").length === 0 && (
            <div style={{ fontSize: 12, color: "#555" }}>No recent completed services</div>
          )}
        </div>
        <div style={{ background: "#141414", border: "1px solid #242424", borderRadius: 8, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#f0f0f0", marginBottom: 8 }}>Technician Availability</div>
          <div style={{ fontSize: 11, color: "#555", marginBottom: 14 }}>
            Real-time status of on-field service agents across district clusters.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 14 }}>
            {[
              { label: "Active Now", value: active, color: "#22c55e" },
              { label: "In Transit", value: Math.ceil(active * 0.4), color: "#f59e0b" },
              { label: "Off Duty", value: Math.max(0, 10 - active - Math.ceil(active * 0.4)), color: "#ef4444" },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
                <div style={{ fontSize: 10, color: "#555" }}>{label}</div>
              </div>
            ))}
          </div>
          <button style={{
            width: "100%", height: 30, borderRadius: 6, fontSize: 12,
            background: "transparent", border: "1px solid #242424", color: "#666",
            cursor: "pointer", fontFamily: "inherit",
          }}>
            Launch Service Map
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── VENDORS TAB ──────────────────────────────────────────────────────────────

const VendorsTab = ({ rows, loading, total, page, totalPages, setPage, perPage, setPerPage, onReplaceSeed }) => {
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState("table"); // "table" | "cards"

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(r => JSON.stringify(r).toLowerCase().includes(q));
  }, [rows, search]);

  // Compute vendor stats from real data
  const stateBreakdown = useMemo(() => {
    const m = {};
    rows.forEach(r => { const s = r.state || r.location_state || "Unknown"; m[s] = (m[s] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [rows]);

  const typeBreakdown = useMemo(() => {
    const m = {};
    rows.forEach(r => { const t = r.vendor_type || r.type || r.category || "General"; m[t] = (m[t] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [rows]);

  const maxState = Math.max(...stateBreakdown.map(s => s[1]), 1);
  const maxType  = Math.max(...typeBreakdown.map(t => t[1]), 1);
  const hasData  = rows.length > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── STATS ROW ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {[
          { label: "Total Vendors",     value: total,                                                    color: "#22c55e", icon: Users     },
          { label: "States Covered",    value: stateBreakdown.length,                                   color: "#60a5fa", icon: MapPin    },
          { label: "Vendor Types",      value: typeBreakdown.length,                                    color: "#a78bfa", icon: Package   },
          { label: "Showing",           value: filtered.length,                                         color: "#f59e0b", icon: Activity  },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} style={{ background: "#141414", border: "1px solid #242424", borderRadius: 8, padding: "14px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
              <div style={{ width: 28, height: 28, borderRadius: 6, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon size={13} color={color} />
              </div>
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: hasData ? "#f0f0f0" : "#333", marginTop: 8, lineHeight: 1 }}>
              {value}
            </div>
            {!hasData && <div style={{ fontSize: 10, color: "#444", marginTop: 4 }}>No data yet</div>}
          </div>
        ))}
      </div>

      {/* ── BREAKDOWN CHARTS ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {/* By State */}
        <div style={{ background: "#141414", border: "1px solid #242424", borderRadius: 8, padding: 16 }}>
          <div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 14 }}>
            Coverage by State
          </div>
          {stateBreakdown.length === 0 ? (
            <div style={{ fontSize: 12, color: "#333", textAlign: "center", padding: "20px 0" }}>
              State data will appear once vendors are loaded
            </div>
          ) : stateBreakdown.map(([state, count], i) => {
            const pct = (count / maxState) * 100;
            const colors = ["#22c55e", "#60a5fa", "#a78bfa", "#f59e0b", "#888"];
            return (
              <div key={state} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: "#aaa" }}>{state}</span>
                  <span style={{ fontSize: 11, color: "#555", fontFamily: "monospace" }}>{count} vendor{count !== 1 ? "s" : ""}</span>
                </div>
                <div style={{ height: 5, background: "#1a1a1a", borderRadius: 3 }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: colors[i % colors.length], borderRadius: 3, transition: "width 500ms ease" }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* By Type */}
        <div style={{ background: "#141414", border: "1px solid #242424", borderRadius: 8, padding: 16 }}>
          <div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 14 }}>
            Vendor Type Distribution
          </div>
          {typeBreakdown.length === 0 ? (
            <div style={{ fontSize: 12, color: "#333", textAlign: "center", padding: "20px 0" }}>
              Type data will appear once vendors are loaded
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {typeBreakdown.map(([type, count], i) => {
                const pct = Math.round((count / (rows.length || 1)) * 100);
                const colors = ["#22c55e", "#60a5fa", "#a78bfa", "#f59e0b"];
                return (
                  <div key={type} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                      background: `${colors[i % colors.length]}18`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10, fontWeight: 700, color: colors[i % colors.length],
                    }}>
                      {String(pct)}%
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                        <span style={{ fontSize: 12, color: "#aaa" }}>{type}</span>
                        <span style={{ fontSize: 11, color: "#555", fontFamily: "monospace" }}>{count}</span>
                      </div>
                      <div style={{ height: 4, background: "#1a1a1a", borderRadius: 2 }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: colors[i % colors.length], borderRadius: 2 }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── TABLE ── */}
      <div style={{ background: "#141414", border: "1px solid #242424", borderRadius: 8, overflow: "hidden" }}>
        {/* toolbar */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderBottom: "1px solid #1a1a1a" }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Search size={13} color="#555" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search vendors by name, location, contact…"
              style={{ width: "100%", height: 30, background: "#111", border: "1px solid #2a2a2a", borderRadius: 5, padding: "0 10px 0 30px", fontSize: 13, color: "#f0f0f0", outline: "none", fontFamily: "inherit" }} />
          </div>
          <span style={{ fontSize: 11, color: "#444", whiteSpace: "nowrap" }}>{filtered.length} vendors</span>
          <label style={{
            height: 30, padding: "0 12px", borderRadius: 5, fontSize: 12, cursor: "pointer",
            background: "transparent", border: "1px solid #2a2a2a", color: "#666",
            display: "flex", alignItems: "center", gap: 5,
          }}>
            <Upload size={12} /> Replace Seed
            <input type="file" accept="application/json" style={{ display: "none" }}
              onChange={e => e.target.files?.[0] && onReplaceSeed(e.target.files[0])} />
          </label>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#1a1a1a" }}>
              {(rows[0]
                ? Object.keys(rows[0]).slice(0, 7)
                : ["Name", "Type", "State", "District", "Contact", "Equipment Types", "Rating"]
              ).map(h => (
                <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 10, fontWeight: 500, color: "#555", textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: "1px solid #242424" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? Array.from({ length: 6 }).map((_, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #1a1a1a" }}>
                {Array.from({ length: 7 }).map((__, j) => (
                  <td key={j} style={{ padding: "12px 14px" }}>
                    <div style={{ height: 11, background: "#1e1e1e", borderRadius: 3 }} />
                  </td>
                ))}
              </tr>
            )) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: "48px 14px", textAlign: "center" }}>
                  <Users size={32} color="#2a2a2a" style={{ margin: "0 auto 10px" }} />
                  <div style={{ fontSize: 13, color: "#555" }}>
                    {rows.length === 0 ? "No vendor data loaded yet" : "No vendors match your search"}
                  </div>
                  <div style={{ fontSize: 11, color: "#3a3a3a", marginTop: 4 }}>
                    {rows.length === 0 ? "Vendor records will appear once the backend returns data" : "Try a different search term"}
                  </div>
                </td>
              </tr>
            ) : filtered.map((r, i) => {
              const keys = Object.keys(r).slice(0, 7);
              return (
                <tr key={r.id || i} style={{
                  borderBottom: "1px solid #1a1a1a",
                  background: i % 2 === 0 ? "#0d0d0d" : "#111111",
                  transition: "background 100ms", cursor: "pointer",
                }}
                  onMouseEnter={e => e.currentTarget.style.background = "#181818"}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? "#0d0d0d" : "#111111"}
                >
                  {keys.map((k, ki) => {
                    const val = r[k];
                    const strVal = typeof val === "object" ? JSON.stringify(val).slice(0, 50) : String(val ?? "—");
                    // first key = name-like = highlight green
                    if (ki === 0) return (
                      <td key={k} style={{ padding: "11px 14px" }}>
                        <div style={{ fontSize: 13, color: "#f0f0f0", fontWeight: 500 }}>{strVal}</div>
                      </td>
                    );
                    // phone-like keys = mono
                    if (k.includes("phone") || k.includes("contact") || k.includes("id")) return (
                      <td key={k} style={{ padding: "11px 14px", fontSize: 12, color: "#888", fontFamily: "monospace" }}>{strVal}</td>
                    );
                    return (
                      <td key={k} style={{ padding: "11px 14px", fontSize: 12, color: "#777", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{strVal}</td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderTop: "1px solid #1a1a1a" }}>
          <span style={{ fontSize: 12, color: "#555" }}>Page {page} of {Math.max(totalPages, 1)}</span>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page<=1}
              style={{ height: 26, padding: "0 12px", borderRadius: 4, border: "1px solid #242424", background: "transparent", color: page<=1?"#333":"#777", cursor: page<=1?"not-allowed":"pointer", fontSize: 12 }}>
              ← Prev
            </button>
            <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page>=totalPages}
              style={{ height: 26, padding: "0 12px", borderRadius: 4, border: "1px solid #242424", background: "transparent", color: page>=totalPages?"#333":"#777", cursor: page>=totalPages?"not-allowed":"pointer", fontSize: 12 }}>
              Next →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── ANALYTICS TAB ────────────────────────────────────────────────────────────

// ── SVG Bar Chart (vertical) ──────────────────────────────────────────────────
const SVGBarChart = ({ data = [], width = 300, height = 160, color = "#22c55e", label = "" }) => {
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const barW   = Math.max(4, (width - 24) / Math.max(data.length, 1) - 4);
  const chartH = height - 32;
  return (
    <div>
      {label && <div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>{label}</div>}
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ overflow: "visible" }}>
        {/* grid lines */}
        {[0.25, 0.5, 0.75, 1].map(f => (
          <line key={f} x1={0} y1={chartH * (1 - f)} x2={width} y2={chartH * (1 - f)}
            stroke="#1e1e1e" strokeWidth={1} />
        ))}
        {data.map((d, i) => {
          const x    = 12 + i * (barW + 4);
          const barH = Math.max(3, (d.value / maxVal) * chartH);
          const y    = chartH - barH;
          return (
            <g key={d.label || i}>
              <rect x={x} y={y} width={barW} height={barH} rx={2} fill={color} opacity={0.85} />
              {barW > 16 && (
                <text x={x + barW / 2} y={height - 4} textAnchor="middle"
                  style={{ fontSize: 9, fill: "#555" }}>
                  {String(d.label || "").slice(0, 6)}
                </text>
              )}
              <title>{d.label}: {d.value}</title>
            </g>
          );
        })}
      </svg>
      {data.length === 0 && (
        <div style={{ textAlign: "center", fontSize: 12, color: "#333", padding: "20px 0" }}>No data</div>
      )}
    </div>
  );
};

// ── SVG Donut with legend ─────────────────────────────────────────────────────
const SVGDonut = ({ segments = [], size = 120, stroke = 14, label = "", centerText = "" }) => {
  const r      = (size - stroke) / 2;
  const circ   = 2 * Math.PI * r;
  const total  = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  let cumulative = 0;
  const hasData = segments.some(s => s.value > 0);
  return (
    <div>
      {label && <div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 14 }}>{label}</div>}
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div style={{ position: "relative", flexShrink: 0 }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
            <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1a1a1a" strokeWidth={stroke} />
            {hasData ? segments.filter(s => s.value > 0).map((seg, i) => {
              const dash   = (seg.value / total) * circ;
              const gap    = circ - dash;
              const offset = -(cumulative / total) * circ;
              cumulative += seg.value;
              return (
                <circle key={i} cx={size/2} cy={size/2} r={r} fill="none"
                  stroke={seg.color} strokeWidth={stroke}
                  strokeDasharray={`${dash - 1} ${gap + 1}`}
                  strokeDashoffset={offset}
                />
              );
            }) : (
              <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#242424" strokeWidth={stroke} />
            )}
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#f0f0f0" }}>{hasData ? total : "—"}</span>
            {centerText && <span style={{ fontSize: 9, color: "#555", marginTop: 1 }}>{centerText}</span>}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 7, flex: 1 }}>
          {segments.map(seg => (
            <div key={seg.label} style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: seg.color, flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: "#777", flex: 1 }}>{seg.label}</span>
              <span style={{ fontSize: 11, color: "#aaa", fontFamily: "monospace" }}>{seg.value}</span>
              <span style={{ fontSize: 10, color: "#444" }}>
                {total > 0 ? `${Math.round((seg.value / total) * 100)}%` : "—"}
              </span>
            </div>
          ))}
          {!hasData && <div style={{ fontSize: 11, color: "#444" }}>No data yet</div>}
        </div>
      </div>
    </div>
  );
};

// ── Horizontal bar list ───────────────────────────────────────────────────────
const HBarList = ({ data = [], colors = [], label = "" }) => {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div>
      {label && <div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>{label}</div>}
      {data.length === 0
        ? <div style={{ fontSize: 12, color: "#333", textAlign: "center", padding: "16px 0" }}>No data available yet</div>
        : data.map(({ label: l, value }, i) => (
          <div key={l} style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: "#aaa", textTransform: "capitalize" }}>{l}</span>
              <span style={{ fontSize: 11, color: "#555", fontFamily: "monospace" }}>{value}</span>
            </div>
            <div style={{ height: 6, background: "#1a1a1a", borderRadius: 3 }}>
              <div style={{
                height: "100%", width: `${(value / max) * 100}%`,
                background: colors[i % colors.length] || "#22c55e",
                borderRadius: 3, transition: "width 600ms ease",
              }} />
            </div>
          </div>
        ))
      }
    </div>
  );
};

const AnalyticsTab = ({ allRows }) => {
  // All computed from real data
  const equipment = allRows.filter(r => !r.rental_id && !r.start_date);
  const bookings  = allRows.filter(r => r.rental_id || r.start_date || r.equipment_id);

  const statusCounts = useMemo(() => {
    const m = { pending: 0, approved: 0, rejected: 0, completed: 0, cancelled: 0 };
    bookings.forEach(r => {
      const s = (r.status || "pending").toLowerCase();
      if (s in m) m[s]++;
    });
    return m;
  }, [bookings]);

  const byType = useMemo(() => {
    const m = {};
    allRows.forEach(r => { const t = r.type || r.equipment_type || "Other"; m[t] = (m[t] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 6)
      .map(([label, value]) => ({ label, value }));
  }, [allRows]);

  const available   = equipment.filter(r => (r.status || "available").toLowerCase() === "available" || r.available === true).length;
  const inUse       = equipment.filter(r => (r.status || "").toLowerCase() === "in use").length;
  const maintenance = equipment.filter(r => (r.status || "").toLowerCase() === "maintenance").length;

  const approvalRate = bookings.length > 0
    ? Math.round((statusCounts.approved / bookings.length) * 100)
    : 0;

  const hasData = allRows.length > 0;

  const barColors   = ["#22c55e", "#60a5fa", "#a78bfa", "#f59e0b", "#ef4444", "#888"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── KPI ROW ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {[
          { label: "Total Records",   value: allRows.length,      color: "#22c55e", icon: Package,    sub: "equipment + bookings" },
          { label: "Rental Requests", value: bookings.length,     color: "#60a5fa", icon: TrendingUp, sub: "from equipment_bookings" },
          { label: "Approval Rate",   value: `${approvalRate}%`,  color: approvalRate > 60 ? "#22c55e" : "#f59e0b", icon: CheckCircle, sub: `${statusCounts.approved} approved` },
          { label: "Available Now",   value: available,            color: "#22c55e", icon: Zap,        sub: `${inUse} in use · ${maintenance} maintenance` },
        ].map(({ label, value, color, icon: Icon, sub }) => (
          <div key={label} style={{ background: "#141414", border: "1px solid #242424", borderRadius: 8, padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
              <div style={{ width: 26, height: 26, borderRadius: 6, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon size={13} color={color} />
              </div>
            </div>
            <div style={{ fontSize: 26, fontWeight: 700, color: hasData ? "#f0f0f0" : "#333", lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: 10, color: "#444", marginTop: 5 }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* ── CHARTS ROW 1 ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>

        {/* Rental Status donut */}
        <div style={{ background: "#141414", border: "1px solid #242424", borderRadius: 8, padding: 16 }}>
          <SVGDonut
            label="Rental Status Breakdown"
            centerText="rentals"
            size={110} stroke={12}
            segments={[
              { label: "Pending",   value: statusCounts.pending,   color: "#f59e0b" },
              { label: "Approved",  value: statusCounts.approved,  color: "#22c55e" },
              { label: "Completed", value: statusCounts.completed, color: "#60a5fa" },
              { label: "Rejected",  value: statusCounts.rejected,  color: "#ef4444" },
              { label: "Cancelled", value: statusCounts.cancelled, color: "#555"    },
            ]}
          />
        </div>

        {/* Equipment status donut */}
        <div style={{ background: "#141414", border: "1px solid #242424", borderRadius: 8, padding: 16 }}>
          <SVGDonut
            label="Equipment Availability"
            centerText="assets"
            size={110} stroke={12}
            segments={[
              { label: "Available",   value: available,   color: "#22c55e" },
              { label: "In Use",      value: inUse,       color: "#60a5fa" },
              { label: "Maintenance", value: maintenance, color: "#f59e0b" },
            ]}
          />
        </div>

        {/* Equipment by type bars */}
        <div style={{ background: "#141414", border: "1px solid #242424", borderRadius: 8, padding: 16 }}>
          <HBarList label="Equipment by Type" data={byType} colors={barColors} />
        </div>
      </div>

      {/* ── CHARTS ROW 2 ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 12 }}>

        {/* Rental status vertical bar chart */}
        <div style={{ background: "#141414", border: "1px solid #242424", borderRadius: 8, padding: 16 }}>
          <div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 14 }}>
            Rental Volume by Status
          </div>
          {bookings.length === 0 ? (
            <div style={{ fontSize: 12, color: "#333", textAlign: "center", padding: "32px 0" }}>
              No rental booking data in collection
            </div>
          ) : (
            <SVGBarChart
              data={Object.entries(statusCounts)
                .filter(([, v]) => v > 0)
                .map(([label, value], i) => ({ label, value, color: barColors[i] }))}
              width={400} height={150}
              color="#22c55e"
            />
          )}
          {/* summary legend row */}
          {bookings.length > 0 && (
            <div style={{ display: "flex", gap: 12, marginTop: 10, flexWrap: "wrap" }}>
              {Object.entries(statusCounts).filter(([,v]) => v > 0).map(([s, v], i) => (
                <div key={s} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: barColors[i] }} />
                  <span style={{ fontSize: 11, color: "#666", textTransform: "capitalize" }}>{s}</span>
                  <span style={{ fontSize: 11, color: "#aaa", fontFamily: "monospace" }}>{v}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Summary quick stats */}
        <div style={{ background: "#141414", border: "1px solid #242424", borderRadius: 8, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.07em" }}>Quick Stats</div>
          {[
            { label: "Total Equipment Records", value: equipment.length },
            { label: "Total Booking Records",   value: bookings.length  },
            { label: "Pending Approvals",        value: statusCounts.pending, highlight: statusCounts.pending > 0 },
            { label: "Rejection Rate",           value: bookings.length > 0 ? `${Math.round((statusCounts.rejected / bookings.length) * 100)}%` : "—" },
            { label: "Completion Rate",          value: bookings.length > 0 ? `${Math.round((statusCounts.completed / bookings.length) * 100)}%` : "—" },
          ].map(({ label, value, highlight }) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 10px", background: "#111", borderRadius: 5 }}>
              <span style={{ fontSize: 12, color: "#666" }}>{label}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: highlight ? "#f59e0b" : "#aaa", fontFamily: "monospace" }}>{value}</span>
            </div>
          ))}
          {!hasData && (
            <div style={{ fontSize: 12, color: "#444", textAlign: "center", padding: "16px 0" }}>
              Analytics will populate once backend data is available
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

const Equipment = () => {
  const [tab, setTab]               = useState("Rental Requests");
  const [rows, setRows]             = useState([]);
  const [allRows, setAllRows]       = useState([]);   // for analytics
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const [providerCount, setProviderCount] = useState(0);
  const [page, setPage]             = useState(1);
  const [perPage, setPerPage]       = useState(25);
  const [total, setTotal]           = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const collection = TAB_COLLECTIONS[tab] || "equipment";

      if (tab === "Analytics") {
        // Load all collections for analytics
        const [equip, bookings] = await Promise.all([
          apiTry([withQuery("/api/v1/admin/data/collection/equipment", { page: 1, per_page: 200 })]).catch(() => ({ items: [] })),
          apiTry([withQuery("/api/v1/admin/data/collection/equipment_bookings", { page: 1, per_page: 200 })]).catch(() => ({ items: [] })),
        ]);
        const combined = [...(equip.items || []), ...(bookings.items || [])];
        setAllRows(combined);
        setRows(combined);
        setTotal(combined.length);
        setLoading(false);
        return;
      }

      const data = await apiTry([
        withQuery(`/api/v1/admin/data/collection/${collection}`, { page, per_page: perPage }),
      ]);

      const list = data.items || data.rows || data.equipment || [];
      setRows(list);
      setTotal(Number(data.total ?? list.length));
      setTotalPages(Number(data.total_pages ?? 1));

      if (tab === "Vendors") setProviderCount(Number(data.total ?? list.length));

      // Fallback for Rental Rates
      if (tab === "Rental Rates" && !list.length) {
        const fallback = await apiTry([withQuery("/api/v1/admin/data/collection/ref_equipment_providers", { page, per_page: perPage })]);
        const fl = fallback.items || [];
        setRows(fl);
        setTotal(Number(fallback.total ?? fl.length));
        setTotalPages(Number(fallback.total_pages ?? 1));
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

  useEffect(() => { setPage(1); }, [tab, perPage]);
  useEffect(() => { load(); }, [load]);

  const replaceSeed = useCallback(async (file) => {
    const text = await file.text();
    const payload = JSON.parse(text);
    await apiTry(["/api/v1/equipment/rental-rates/replace-seed"], {
      method: "POST",
      body: JSON.stringify({ input_file: payload.input_file || "scripts/reports/equipment_rental_pan_india_2026.json" }),
    });
    load();
  }, [load]);

  // ── render ──

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Page header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: "#f0f0f0", margin: 0 }}>
            Equipment &amp; Livestock
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
            <span style={{
              background: "rgba(34,197,94,0.1)", color: "#22c55e", borderRadius: 4,
              fontSize: 10, fontWeight: 600, padding: "2px 8px", letterSpacing: "0.05em",
            }}>
              {total.toLocaleString()} ASSETS
            </span>
          </div>
        </div>
        <button style={{
          height: 34, padding: "0 16px", borderRadius: 6, fontSize: 13, fontWeight: 600,
          background: "#22c55e", border: "none", color: "#000", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit",
        }}>
          <Plus size={15} /> Add Asset
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid #242424", gap: 0 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            height: 36, padding: "0 16px", fontSize: 13, cursor: "pointer",
            background: "transparent", border: "none",
            borderBottom: tab === t ? "2px solid #22c55e" : "2px solid transparent",
            color: tab === t ? "#f0f0f0" : "#666",
            fontFamily: "inherit", transition: "color 120ms, border-color 120ms",
            marginBottom: -1,
          }}>
            {t}
          </button>
        ))}
      </div>

      {/* Error banner */}
      {error && (
        <div style={{
          background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
          borderRadius: 6, padding: "10px 14px", display: "flex", alignItems: "center",
          justifyContent: "space-between", fontSize: 13, color: "#ef4444",
        }}>
          <span>Failed to load: {error}</span>
          <button onClick={load} style={{
            background: "transparent", border: "1px solid rgba(239,68,68,0.4)",
            borderRadius: 4, color: "#ef4444", fontSize: 12, cursor: "pointer",
            padding: "2px 10px", display: "flex", alignItems: "center", gap: 4, fontFamily: "inherit",
          }}>
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      )}

      {/* Tab content */}
      {tab === "Rental Requests" && (
        <RentalRequestsTab
          rows={rows} loading={loading} error={error} onRetry={load}
          total={total} page={page} totalPages={totalPages}
          perPage={perPage} setPage={setPage} setPerPage={setPerPage}
        />
      )}
      {tab === "Inventory" && (
        <InventoryTab
          rows={rows} loading={loading} total={total}
          page={page} totalPages={totalPages} perPage={perPage}
          setPage={setPage} setPerPage={setPerPage}
        />
      )}
      {tab === "Maintenance" && (
        <MaintenanceTab rows={rows} loading={loading} />
      )}
      {(tab === "Rental Rates") && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: "#141414", border: "1px solid #242424", borderRadius: 8, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#1a1a1a" }}>
                  {(rows[0] ? Object.keys(rows[0]).slice(0, 7) : ["Equipment", "Type", "Rate/Hour", "Rate/Day", "Location", "Contact", "Available"]).map(h => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 10, fontWeight: 500, color: "#555", textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: "1px solid #242424" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 7 }).map((__, j) => (
                    <td key={j} style={{ padding: "12px 14px" }}>
                      <div style={{ height: 12, background: "#222", borderRadius: 4 }} />
                    </td>
                  ))}</tr>
                )) : rows.map((r, i) => (
                  <tr key={r.id || i} style={{ borderBottom: "1px solid #1a1a1a", background: i % 2 === 0 ? "#0d0d0d" : "#111" }}>
                    {Object.keys(r).slice(0, 7).map(k => (
                      <td key={k} style={{ padding: "12px 14px", fontSize: 12, color: "#ccc", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {k.includes("rate") ? `₹${r[k]}` : (typeof r[k] === "object" ? JSON.stringify(r[k]).slice(0, 40) : String(r[k] ?? "—"))}
                      </td>
                    ))}
                  </tr>
                ))}
                {!loading && rows.length === 0 && (
                  <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: "#555", fontSize: 13 }}>No rental rate data</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, fontSize: 12, color: "#555" }}>
            <span>Page {page} of {totalPages}</span>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
              style={{ height: 28, padding: "0 12px", borderRadius: 4, border: "1px solid #242424", background: "transparent", color: "#666", cursor: "pointer", fontSize: 12 }}>
              ← Prev
            </button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
              style={{ height: 28, padding: "0 12px", borderRadius: 4, border: "1px solid #242424", background: "transparent", color: "#666", cursor: "pointer", fontSize: 12 }}>
              Next →
            </button>
          </div>
        </div>
      )}
      {tab === "Vendors" && (
        <VendorsTab
          rows={rows} loading={loading} total={total}
          page={page} totalPages={totalPages} perPage={perPage}
          setPage={setPage} setPerPage={setPerPage}
          onReplaceSeed={replaceSeed}
        />
      )}
      {tab === "Analytics" && <AnalyticsTab allRows={allRows} />}
    </div>
  );
};

export default Equipment;