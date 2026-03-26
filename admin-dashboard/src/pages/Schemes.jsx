import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, FileText, Plus, Upload } from "lucide-react";
import DataTable from "../components/ui/DataTable";
import Modal from "../components/ui/Modal";
import Badge from "../components/ui/Badge";
import { apiTry, withQuery } from "../api/client";

const initialForm = {
  name: "",
  description: "",
  category: "",
  state: "",
  is_active: true,
  eligibility: "",
  how_to_apply: "",
  required_documents: [],
  official_links: [],
  document_links: [],
  contact_numbers: [],
  contact_emails: [],
  tags: [],
  ministry: "",
  beneficiary_state: "",
};

const Schemes = () => {
  const [rows, setRows] = useState([]);
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

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [schemes, documents] = await Promise.all([
        apiTry([
          withQuery("/api/v1/admin/data/schemes", { page: 1, per_page: 50 }),
          withQuery("/api/v1/schemes/", { page: 1, per_page: 50 }),
        ]),
        apiTry([
          "/api/v1/market/scheme-docs",
          "/api/v1/market/document-builder/scheme-docs",
        ]).catch(() => ({ items: [] })),
      ]);
      setRows(schemes.items || []);
      setDocs(documents.items || documents.schemes || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const upsert = useCallback(async () => {
    const body = {
      ...form,
      required_documents: Array.isArray(form.required_documents) ? form.required_documents : String(form.required_documents).split(","),
      tags: Array.isArray(form.tags) ? form.tags : String(form.tags).split(","),
    };
    await apiTry([
      "/api/v1/admin/data/schemes",
      "/api/v1/admin/schemes/upsert",
    ], {
      method: "POST",
      body: JSON.stringify(body),
    });
    setShowModal(false);
    setForm(initialForm);
    load();
  }, [form, load]);

  const remove = useCallback(async (id) => {
    await apiTry([
      `/api/v1/admin/data/schemes/${id}`,
      `/api/v1/admin/schemes/${id}`,
    ], { method: "DELETE" });
    load();
  }, [load]);

  const bulkImport = useCallback(async (file) => {
    const text = await file.text();
    const payload = JSON.parse(text);
    await apiTry([
      "/api/v1/admin/data/import/schemes",
      "/api/v1/admin/schemes/import",
    ], {
      method: "POST",
      body: JSON.stringify({ input_file: payload.input_file || "scripts/reports/schemes.json", reembed: Boolean(payload.reembed) }),
    });
    load();
  }, [load]);

  const columns = useMemo(
    () => [
      {
        key: "expand",
        label: "",
        render: (row) => (
          <button type="button" className="icon-btn" onClick={(e) => { e.stopPropagation(); setExpanded((x) => (x === (row.id || row.scheme_id) ? null : (row.id || row.scheme_id))); }}>
            <ChevronDown size={13} className={expanded === (row.id || row.scheme_id) ? "rotate-180" : ""} />
          </button>
        ),
      },
      { key: "name", label: "Title", render: (r) => r.name || r.title || "-" },
      { key: "ministry", label: "Ministry", render: (r) => r.ministry || "-" },
      { key: "state", label: "State", render: (r) => r.state || "All" },
      { key: "category", label: "Categories", render: (r) => r.category || "-" },
      {
        key: "tags",
        label: "Tags",
        render: (r) => (Array.isArray(r.tags) ? r.tags.slice(0, 2).join(", ") : "-"),
      },
      {
        key: "active",
        label: "Active",
        render: (r) => <Badge tone={r.is_active === false ? "red" : "green"}>{r.is_active === false ? "No" : "Yes"}</Badge>,
      },
      {
        key: "actions",
        label: "Actions",
        render: (r) => (
          <div className="flex gap-1">
            <button type="button" className="action-btn" onClick={() => { setForm(r); setShowModal(true); }}>Edit</button>
            <button type="button" className="action-btn text-rose-300" onClick={() => remove(r.id || r.scheme_id)}>Delete</button>
          </div>
        ),
      },
    ],
    [expanded, remove]
  );

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const matchSearch = !search.trim() || JSON.stringify(row).toLowerCase().includes(search.trim().toLowerCase());
      if (!matchSearch) return false;

      const rowState = String(row.state || row.beneficiary_state || "").toLowerCase();
      const rowCategory = String(row.category || "").toLowerCase();

      if (stateFilter.trim() && !rowState.includes(stateFilter.trim().toLowerCase())) return false;
      if (categoryFilter.trim() && !rowCategory.includes(categoryFilter.trim().toLowerCase())) return false;
      if (activeFilter === "active" && row.is_active === false) return false;
      if (activeFilter === "inactive" && row.is_active !== false) return false;

      return true;
    });
  }, [rows, search, stateFilter, categoryFilter, activeFilter]);

  const expandedRow = filteredRows.find((r) => (r.id || r.scheme_id) === expanded) || rows.find((r) => (r.id || r.scheme_id) === expanded);

  return (
    <div className="grid grid-cols-12 gap-3">
      <div className="col-span-9 space-y-3">
        <div className="panel flex flex-wrap items-center gap-2 p-3">
          <input className="field min-w-44 flex-1" placeholder="Search schemes" value={search} onChange={(e) => setSearch(e.target.value)} />
          <input className="field w-36" placeholder="State" value={stateFilter} onChange={(e) => setStateFilter(e.target.value)} />
          <input className="field w-36" placeholder="Category" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} />
          <select className="field w-32" value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <button type="button" className="pill-btn border-white/30 bg-white/10" onClick={() => setShowModal(true)}>
            <Plus size={13} /> Add Scheme
          </button>
          <label className="action-btn cursor-pointer">
            <Upload size={13} /> Bulk Import
            <input type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && bulkImport(e.target.files[0])} />
          </label>
        </div>

        <DataTable
          columns={columns}
          rows={filteredRows}
          loading={loading}
          error={error}
          onRetry={load}
          onRowClick={(row) => setExpanded((x) => (x === (row.id || row.scheme_id) ? null : (row.id || row.scheme_id)))}
        />

        {expandedRow ? (
          <div className="panel p-3 text-xs text-white/80">
            <h4 className="mb-2 font-display text-lg">Scheme Detail</h4>
            <p className="mb-2 rounded-lg border border-white/10 bg-white/[0.02] p-2 text-white/75">
              {expandedRow.description || expandedRow.summary || "No brief description available for this scheme."}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                ["summary", expandedRow.description || expandedRow.summary],
                ["eligibility", expandedRow.eligibility],
                ["how_to_apply", expandedRow.how_to_apply],
                ["required_documents", JSON.stringify(expandedRow.required_documents || [])],
                ["official_links", JSON.stringify(expandedRow.official_links || [])],
                ["document_links", JSON.stringify(expandedRow.document_links || [])],
                ["contact_numbers", JSON.stringify(expandedRow.contact_numbers || [])],
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg border border-white/10 bg-white/[0.02] p-2">
                  <p className="text-[10px] uppercase tracking-wide text-white/45">{k}</p>
                  <p className="mt-1 break-words">{String(v || "-")}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="col-span-3 panel p-3">
        <div className="mb-2 flex items-center gap-2 text-white/85">
          <FileText size={14} />
          <h3 className="font-display text-lg">Document Assets</h3>
        </div>
        <div className="max-h-[560px] space-y-2 overflow-y-auto text-xs">
          {docs.length === 0 ? <p className="text-white/45">No documents found.</p> : null}
          {docs.map((doc, idx) => (
            <div key={`${doc.slug || doc.scheme_name || idx}`} className="rounded-lg border border-white/10 p-2">
              <p className="text-white/80">{doc.scheme_name || doc.slug || "Scheme"}</p>
              <p className="text-[10px] text-white/40">{doc.filename || doc.file || "asset"}</p>
            </div>
          ))}
        </div>
      </div>

      <Modal
        open={showModal}
        wide
        title="Add/Edit Scheme"
        onClose={() => setShowModal(false)}
        footer={<div className="flex justify-end gap-2"><button type="button" className="action-btn" onClick={() => setShowModal(false)}>Cancel</button><button type="button" className="pill-btn border-white/30 bg-white/10" onClick={upsert}>Save Scheme</button></div>}
      >
        <div className="grid grid-cols-2 gap-2 text-xs">
          {Object.keys(initialForm).map((key) => (
            <label key={key} className="space-y-1">
              <span className="text-white/50">{key}</span>
              <input
                className="field"
                value={Array.isArray(form[key]) ? form[key].join(",") : String(form[key] ?? "")}
                onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
              />
            </label>
          ))}
        </div>
      </Modal>
    </div>
  );
};

export default Schemes;

