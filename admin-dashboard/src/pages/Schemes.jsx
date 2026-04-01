import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Upload,
  RefreshCw,
  Download,
  FileText,
  FileSpreadsheet,
  File,
  ExternalLink,
  Globe,
  Search,
  X,
  CheckCircle2,
  XCircle,
  MoreHorizontal,
  Trash2,
  Pencil,
  BookOpen,
  Link2,
} from "lucide-react";
import Modal from "../components/ui/Modal";
import { apiTry, withQuery } from "../api/client";

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
const fileIcon = (name = "") => {
  const ext = String(name).split(".").pop().toLowerCase();
  if (ext === "pdf") return { Icon: FileText, color: "#EF4444", bg: "rgba(239,68,68,0.12)", label: "PDF" };
  if (["xls", "xlsx", "csv"].includes(ext)) return { Icon: FileSpreadsheet, color: "#22C55E", bg: "rgba(34,197,94,0.12)", label: ext.toUpperCase() };
  return { Icon: File, color: "#60A5FA", bg: "rgba(96,165,250,0.12)", label: ext.toUpperCase() || "FILE" };
};

const fmtBytes = (n) => {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
};

const toTextList = (value) => {
  if (Array.isArray(value)) {
    return value.flatMap((item) => toTextList(item));
  }
  if (value == null) return [];
  return String(value)
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
};

const uniqueTextList = (values) => [...new Set(values.flat().map((value) => String(value).trim()).filter(Boolean))];

const getSchemeStates = (row) => {
  const beneficiaryStates = toTextList(row?.beneficiary_state);
  if (beneficiaryStates.length > 0) {
    return uniqueTextList(beneficiaryStates);
  }

  const states = toTextList(row?.state);
  return uniqueTextList(states.length > 0 ? states : []);
};

const getEligibilityItems = (value) => toTextList(value);

const getStateLabel = (row) => {
  const states = getSchemeStates(row);
  if (states.length === 0) return "Central";
  if (states.length === 1) return states[0];
  return `${states.slice(0, 3).join(", ")}${states.length > 3 ? ` +${states.length - 3}` : ""}`;
};

const initialForm = {
  name: "", description: "", category: "", state: "", is_active: true,
  eligibility: "", how_to_apply: "", required_documents: [], official_links: [],
  document_links: [], contact_numbers: [], contact_emails: [], tags: [],
  ministry: "", beneficiary_state: "",
};

/* ─────────────────────────────────────────────
   Tag pill
───────────────────────────────────────────── */
const TagPill = ({ label, variant = "default" }) => {
  const styles = {
    default: { bg: "rgba(255,255,255,0.06)", color: "#a0a0a0", border: "rgba(255,255,255,0.1)" },
    green: { bg: "rgba(34,197,94,0.12)", color: "#22C55E", border: "rgba(34,197,94,0.2)" },
    blue: { bg: "rgba(96,165,250,0.12)", color: "#60A5FA", border: "rgba(96,165,250,0.2)" },
    amber: { bg: "rgba(245,158,11,0.12)", color: "#F59E0B", border: "rgba(245,158,11,0.2)" },
    purple: { bg: "rgba(167,139,250,0.12)", color: "#A78BFA", border: "rgba(167,139,250,0.2)" },
  };
  const s = styles[variant] || styles.default;
  return (
    <span style={{
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      borderRadius: 4, fontSize: 10, fontWeight: 600, padding: "2px 7px",
      textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap",
    }}>{label}</span>
  );
};

const categoryVariant = (cat = "") => {
  const c = cat.toLowerCase();
  if (c.includes("benefit") || c.includes("income")) return "green";
  if (c.includes("solar") || c.includes("subsidy")) return "amber";
  if (c.includes("insur") || c.includes("health") || c.includes("diagno")) return "blue";
  if (c.includes("credit") || c.includes("loan")) return "purple";
  return "default";
};

/* ─────────────────────────────────────────────
   Expanded detail panel
───────────────────────────────────────────── */
const ExpandedDetail = ({ row }) => {
  const eligibilityList = useMemo(() => {
    return getEligibilityItems(row.eligibility);
  }, [row.eligibility]);

  const officialLinks = useMemo(() => {
    const links = row.official_links || [];
    if (!links.length && row.how_to_apply) {
      const urls = String(row.how_to_apply).match(/https?:\/\/[^\s]+/g) || [];
      return urls.map((u) => ({ url: u, label: "Portal Link" }));
    }
    return links;
  }, [row.official_links, row.how_to_apply]);

  const docLinks = useMemo(() => {
    const links = row.document_links || [];
    return links;
  }, [row.document_links]);

  return (
    <tr style={{ background: "rgba(255,255,255,0.02)" }}>
      <td colSpan={8} style={{ padding: 0 }}>
        <div style={{
          margin: "0 0 2px 0",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          padding: "20px 24px 20px 56px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 24,
        }}>
          {/* Left: Description + How to Apply */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "#555", marginBottom: 8, fontWeight: 600 }}>Description</div>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", lineHeight: 1.7, margin: 0 }}>
                {row.description || row.summary || "No description available for this scheme."}
              </p>
            </div>
            {row.how_to_apply && (
              <div>
                <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "#555", marginBottom: 8, fontWeight: 600 }}>How to Apply</div>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.7, margin: 0 }}>
                  {row.how_to_apply}
                </p>
              </div>
            )}
          </div>

          {/* Right: Eligibility + Links */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {eligibilityList.length > 0 && (
              <div>
                <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "#555", marginBottom: 8, fontWeight: 600 }}>Eligibility</div>
                <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
                  {eligibilityList.map((item, i) => (
                    <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12, color: "rgba(255,255,255,0.65)" }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#22C55E", marginTop: 5, flexShrink: 0 }} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {(officialLinks.length > 0 || docLinks.length > 0 || row.contact_numbers?.length > 0) && (
              <div>
                <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "#555", marginBottom: 8, fontWeight: 600 }}>Official Links</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {officialLinks.slice(0, 3).map((link, i) => {
                    const url = typeof link === "string" ? link : link.url;
                    const label = typeof link === "object" && link.label ? link.label : (i === 0 ? "Portal Home" : `Link ${i + 1}`);
                    return (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer" style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)",
                        color: "#22C55E", borderRadius: 5, fontSize: 11, padding: "4px 10px",
                        textDecoration: "none", fontWeight: 500,
                      }}>
                        <Globe size={11} /> {label}
                      </a>
                    );
                  })}
                  {docLinks.slice(0, 2).map((link, i) => {
                    const url = typeof link === "string" ? link : link.url;
                    const label = typeof link === "object" && link.label ? link.label : "Guidelines PDF";
                    return (
                      <a key={`doc-${i}`} href={url} target="_blank" rel="noopener noreferrer" style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.2)",
                        color: "#60A5FA", borderRadius: 5, fontSize: 11, padding: "4px 10px",
                        textDecoration: "none", fontWeight: 500,
                      }}>
                        <FileText size={11} /> {label}
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            {row.required_documents?.length > 0 && (
              <div>
                <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "#555", marginBottom: 6, fontWeight: 600 }}>Required Documents</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {(Array.isArray(row.required_documents) ? row.required_documents : [row.required_documents]).slice(0, 5).map((d, i) => (
                    <span key={i} style={{ fontSize: 10, color: "#777", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 4, padding: "2px 7px" }}>
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
};

/* ─────────────────────────────────────────────
   Document card
───────────────────────────────────────────── */
const DocCard = ({ doc }) => {
  const name = doc.filename || doc.file || doc.scheme_name || doc.slug || "Document";
  const { Icon, color, bg, label } = fileIcon(name);
  const size = fmtBytes(doc.size || doc.file_size);
  const date = doc.updated_at || doc.created_at || doc.date;

  return (
    <div style={{
      background: "#141414", border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 8, padding: "12px 14px",
      display: "flex", alignItems: "center", gap: 12, cursor: "pointer",
      transition: "border-color 0.15s",
    }}
      onMouseEnter={(e) => e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)"}
      onMouseLeave={(e) => e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"}
    >
      <div style={{ width: 36, height: 36, borderRadius: 8, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={16} color={color} />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
        <div style={{ fontSize: 10, color: "#555", marginTop: 2 }}>
          {label}{size ? ` · ${size}` : ""}{date ? ` · ${new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}` : ""}
        </div>
      </div>
      <button style={{ background: "none", border: "none", color: "#555", cursor: "pointer", padding: 4 }}>
        <MoreHorizontal size={14} />
      </button>
    </div>
  );
};

/* ─────────────────────────────────────────────
   Main component
───────────────────────────────────────────── */
const Schemes = () => {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [docs, setDocs] = useState([]);
  const [allStates, setAllStates] = useState([]);
  const [allCategories, setAllCategories] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [schemes, documents] = await Promise.all([
        apiTry([
          withQuery("/api/v1/admin/data/schemes", { page: 1, per_page: 100 }),
          withQuery("/api/v1/schemes/", { page: 1, per_page: 100 }),
        ]),
        apiTry(["/api/v1/market/document-builder/scheme-docs"]).catch(() => ({ items: [] })),
      ]);

      const items = schemes.items || schemes.schemes || (Array.isArray(schemes) ? schemes : []);
      setRows(items);
      setTotal(schemes.total || items.length);
      setDocs(documents.items || documents.schemes || []);

      // derive filter options from data
      const states = [...new Set(items.flatMap((r) => getSchemeStates(r)))].sort();
      const cats = [...new Set(items.map((r) => r.category || (Array.isArray(r.categories) && r.categories[0])).filter(Boolean))].sort();
      setAllStates(states);
      setAllCategories(cats);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const upsert = useCallback(async () => {
    const body = {
      ...form,
      required_documents: Array.isArray(form.required_documents) ? form.required_documents : String(form.required_documents).split(",").map((s) => s.trim()).filter(Boolean),
      tags: Array.isArray(form.tags) ? form.tags : String(form.tags).split(",").map((s) => s.trim()).filter(Boolean),
    };
    await apiTry([
      "/api/v1/admin/data/schemes",
    ], { method: "POST", body: JSON.stringify(body) });
    setShowModal(false);
    setForm(initialForm);
    load();
  }, [form, load]);

  const remove = useCallback(async (id) => {
    if (!window.confirm("Delete this scheme?")) return;
    await apiTry([
      `/api/v1/admin/data/schemes/${id}`,
    ], { method: "DELETE" });
    load();
  }, [load]);

  const bulkImport = useCallback(async (file) => {
    const text = await file.text();
    const payload = JSON.parse(text);
    await apiTry([
      "/api/v1/admin/data/import/schemes",
    ], {
      method: "POST",
      body: JSON.stringify({ input_file: payload.input_file || "scripts/reports/scheme.json", reembed: Boolean(payload.reembed) }),
    });
    load();
  }, [load]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const q = search.trim().toLowerCase();
      if (q && !JSON.stringify(row).toLowerCase().includes(q)) return false;
      const rowStates = getSchemeStates(row).map((state) => state.toLowerCase());
      if (stateFilter && !rowStates.some((state) => state.includes(stateFilter.toLowerCase()))) return false;
      const rowCat = String(row.category || (Array.isArray(row.categories) && row.categories.join(" ")) || "").toLowerCase();
      if (categoryFilter && !rowCat.includes(categoryFilter.toLowerCase())) return false;
      if (activeFilter === "active" && row.is_active === false) return false;
      if (activeFilter === "inactive" && row.is_active !== false) return false;
      return true;
    });
  }, [rows, search, stateFilter, categoryFilter, activeFilter]);

  const toggleExpand = useCallback((row) => {
    const id = row.id || row.scheme_id;
    setExpanded((x) => (x === id ? null : id));
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0, minHeight: "100vh" }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#f0f0f0" }}>Schemes</h2>
          {total > 0 && (
            <span style={{
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 20, fontSize: 11, color: "#888", padding: "2px 10px", fontWeight: 500,
            }}>{total} Total</span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={load} style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "transparent", border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 8, color: "#888", fontSize: 12, padding: "7px 14px", cursor: "pointer",
          }}>
            <RefreshCw size={12} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} /> Refresh
          </button>
          <button style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "transparent", border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 8, color: "#888", fontSize: 12, padding: "7px 14px", cursor: "pointer",
          }}>
            <Download size={12} /> Export
          </button>
          <button onClick={() => { setForm(initialForm); setShowModal(true); }} style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "#22C55E", border: "none", borderRadius: 8,
            color: "#000", fontSize: 12, fontWeight: 700, padding: "7px 16px", cursor: "pointer",
          }}>
            <Plus size={13} /> Add Scheme
          </button>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div style={{
        background: "#141414", border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 10, padding: "10px 14px",
        display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap",
      }}>
        {/* Search */}
        <div style={{ position: "relative", flex: "1 1 240px", minWidth: 200 }}>
          <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#555" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by scheme name or ID..."
            style={{
              width: "100%", boxSizing: "border-box",
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 7, height: 34, paddingLeft: 32, paddingRight: search ? 32 : 12,
              fontSize: 12, color: "#e0e0e0", outline: "none", fontFamily: "inherit",
            }}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#555", cursor: "pointer", padding: 0 }}>
              <X size={12} />
            </button>
          )}
        </div>

        {/* State dropdown */}
        <div style={{ position: "relative" }}>
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            style={{
              appearance: "none", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 7, height: 34, padding: "0 32px 0 12px",
              fontSize: 12, color: stateFilter ? "#e0e0e0" : "#666", outline: "none",
              cursor: "pointer", fontFamily: "inherit", minWidth: 120,
            }}
          >
            <option value="">All States</option>
            {allStates.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <ChevronDown size={12} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#555", pointerEvents: "none" }} />
        </div>

        {/* Category dropdown */}
        <div style={{ position: "relative" }}>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{
              appearance: "none", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 7, height: 34, padding: "0 32px 0 12px",
              fontSize: 12, color: categoryFilter ? "#e0e0e0" : "#666", outline: "none",
              cursor: "pointer", fontFamily: "inherit", minWidth: 120,
            }}
          >
            <option value="">Category</option>
            {allCategories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <ChevronDown size={12} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#555", pointerEvents: "none" }} />
        </div>

        {/* Active filter pills */}
        <div style={{ display: "flex", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 7, overflow: "hidden", marginLeft: "auto" }}>
          {["all", "active", "inactive"].map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              style={{
                background: activeFilter === f ? "rgba(255,255,255,0.1)" : "transparent",
                border: "none", color: activeFilter === f ? "#e0e0e0" : "#666",
                fontSize: 11, fontWeight: activeFilter === f ? 600 : 400,
                padding: "6px 14px", cursor: "pointer", fontFamily: "inherit",
                textTransform: "capitalize",
              }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Bulk Import */}
        <label style={{
          display: "flex", alignItems: "center", gap: 6,
          background: "transparent", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 7, color: "#888", fontSize: 11, padding: "6px 12px", cursor: "pointer",
        }}>
          <Upload size={12} /> Bulk Import
          <input type="file" accept="application/json" style={{ display: "none" }} onChange={(e) => e.target.files?.[0] && bulkImport(e.target.files[0])} />
        </label>
      </div>

      {/* ── Error ── */}
      {error && (
        <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "10px 16px", fontSize: 12, color: "#f87171", marginBottom: 12 }}>
          {error}
        </div>
      )}

      {/* ── Table ── */}
      <div style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, overflow: "hidden", marginBottom: 24 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <th style={{ width: 40, padding: "10px 0 10px 16px" }} />
              <th style={{ textAlign: "left", padding: "10px 16px 10px 0", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#555" }}>Title / Ministry</th>
              <th style={{ textAlign: "left", padding: "10px 16px", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#555", width: 140 }}>State</th>
              <th style={{ textAlign: "left", padding: "10px 16px", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#555", width: 150 }}>Categories</th>
              <th style={{ textAlign: "left", padding: "10px 16px", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#555", width: 160 }}>Tags</th>
              <th style={{ textAlign: "left", padding: "10px 16px", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#555", width: 100 }}>Status</th>
              <th style={{ textAlign: "right", padding: "10px 24px 10px 16px", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#555", width: 120 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 && (
              [...Array(5)].map((_, i) => (
                <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <td colSpan={7} style={{ padding: "14px 16px" }}>
                    <div style={{ height: 14, background: "rgba(255,255,255,0.04)", borderRadius: 4, animation: "pulse 1.2s infinite" }} />
                  </td>
                </tr>
              ))
            )}

            {!loading && filteredRows.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: "48px 24px", textAlign: "center" }}>
                  <BookOpen size={32} style={{ color: "#333", marginBottom: 10 }} />
                  <div style={{ color: "#555", fontSize: 13 }}>No schemes found</div>
                  <div style={{ color: "#444", fontSize: 11, marginTop: 4 }}>Try adjusting your filters</div>
                </td>
              </tr>
            )}

            {filteredRows.map((row) => {
              const id = row.id || row.scheme_id;
              const isExpanded = expanded === id;
              const isActive = row.is_active !== false;
              const tags = Array.isArray(row.tags) ? row.tags : [];
              const category = row.category || (Array.isArray(row.categories) && row.categories[0]) || "";

              return (
                <>
                  <tr
                    key={id}
                    onClick={() => toggleExpand(row)}
                    style={{
                      borderBottom: isExpanded ? "none" : "1px solid rgba(255,255,255,0.04)",
                      background: isExpanded ? "rgba(255,255,255,0.03)" : "transparent",
                      cursor: "pointer",
                      transition: "background 0.12s",
                    }}
                    onMouseEnter={(e) => { if (!isExpanded) e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
                    onMouseLeave={(e) => { if (!isExpanded) e.currentTarget.style.background = "transparent"; }}
                  >
                    {/* Chevron */}
                    <td style={{ padding: "14px 0 14px 16px", width: 40 }}>
                      <div style={{
                        width: 22, height: 22, borderRadius: 5,
                        background: isExpanded ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.04)",
                        border: `1px solid ${isExpanded ? "rgba(34,197,94,0.25)" : "rgba(255,255,255,0.08)"}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "all 0.15s",
                      }}>
                        <ChevronDown size={12} style={{ color: isExpanded ? "#22C55E" : "#666", transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                      </div>
                    </td>

                    {/* Title / Ministry */}
                    <td style={{ padding: "14px 16px 14px 0" }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#e8e8e8" }}>{row.name || row.title || "-"}</div>
                      {row.ministry && (
                        <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>{row.ministry}</div>
                      )}
                    </td>

                    {/* State */}
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{ fontSize: 12, color: "#aaa" }}>{getStateLabel(row)}</span>
                    </td>

                    {/* Category */}
                    <td style={{ padding: "14px 16px" }}>
                      {category && <TagPill label={category} variant={categoryVariant(category)} />}
                    </td>

                    {/* Tags */}
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {tags.slice(0, 3).map((tag, i) => (
                          <TagPill key={i} label={tag} variant="default" />
                        ))}
                      </div>
                    </td>

                    {/* Status */}
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <span style={{
                          width: 6, height: 6, borderRadius: "50%",
                          background: isActive ? "#22C55E" : "#555",
                          boxShadow: isActive ? "0 0 6px rgba(34,197,94,0.6)" : "none",
                          flexShrink: 0,
                        }} />
                        <span style={{ fontSize: 11, fontWeight: 600, color: isActive ? "#22C55E" : "#555", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          {isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: "14px 24px 14px 16px", textAlign: "right" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }} onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => { setForm(row); setShowModal(true); }}
                          style={{
                            background: "transparent", border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: 5, color: "#aaa", fontSize: 11, fontWeight: 500,
                            padding: "4px 10px", cursor: "pointer", fontFamily: "inherit",
                            transition: "all 0.12s",
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = "#e0e0e0"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = "#aaa"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
                        >Edit</button>
                        <button
                          onClick={() => remove(id)}
                          style={{
                            background: "transparent", border: "1px solid rgba(239,68,68,0.18)",
                            borderRadius: 5, color: "#f87171", fontSize: 11, fontWeight: 500,
                            padding: "4px 10px", cursor: "pointer", fontFamily: "inherit",
                            transition: "all 0.12s",
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                        >Delete</button>
                      </div>
                    </td>
                  </tr>

                  {/* Expanded detail row */}
                  {isExpanded && <ExpandedDetail key={`exp-${id}`} row={row} />}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Scheme Documents ── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "#555" }}>Scheme Documents</div>
          <label style={{
            display: "flex", alignItems: "center", gap: 5,
            background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)",
            borderRadius: 6, color: "#22C55E", fontSize: 11, fontWeight: 600,
            padding: "5px 12px", cursor: "pointer",
          }}>
            <Upload size={11} /> Bulk Upload
            <input type="file" multiple style={{ display: "none" }} />
          </label>
        </div>
        {docs.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
            {docs.map((doc, i) => <DocCard key={i} doc={doc} />)}
          </div>
        ) : (
          <div style={{
            background: "#141414", border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 10, padding: "28px 24px", textAlign: "center",
          }}>
            <FileText size={24} style={{ color: "#333", marginBottom: 8 }} />
            <div style={{ fontSize: 12, color: "#555" }}>No documents found</div>
            <div style={{ fontSize: 11, color: "#444", marginTop: 4 }}>Upload scheme guidelines, forms, and reference documents</div>
          </div>
        )}
      </div>

      {/* ── Add/Edit Modal ── */}
      <Modal
        open={showModal}
        wide
        title={form.id || form.scheme_id ? "Edit Scheme" : "Add Scheme"}
        onClose={() => { setShowModal(false); setForm(initialForm); }}
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button onClick={() => { setShowModal(false); setForm(initialForm); }} style={{
              background: "transparent", border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 7, color: "#888", fontSize: 12, padding: "7px 16px", cursor: "pointer", fontFamily: "inherit",
            }}>Cancel</button>
            <button onClick={upsert} style={{
              background: "#22C55E", border: "none", borderRadius: 7,
              color: "#000", fontSize: 12, fontWeight: 700, padding: "7px 20px", cursor: "pointer", fontFamily: "inherit",
            }}>Save Scheme</button>
          </div>
        }
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {Object.keys(initialForm).map((key) => (
            <label key={key} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.07em", color: "#666", fontWeight: 600 }}>{key.replace(/_/g, " ")}</span>
              {key === "is_active" ? (
                <select
                  value={String(form[key])}
                  onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value === "true" }))}
                  style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, height: 32, padding: "0 10px", fontSize: 12, color: "#e0e0e0", fontFamily: "inherit", outline: "none" }}
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              ) : (
                <input
                  className="field"
                  value={Array.isArray(form[key]) ? form[key].join(", ") : String(form[key] ?? "")}
                  onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                  placeholder={key.includes("links") || key.includes("emails") || key.includes("numbers") ? "comma-separated" : ""}
                />
              )}
            </label>
          ))}
        </div>
      </Modal>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
      `}</style>
    </div>
  );
};

export default Schemes;