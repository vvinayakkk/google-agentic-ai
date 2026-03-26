import { useCallback, useEffect, useMemo, useState } from "react";
import DataTable from "../components/ui/DataTable";
import { apiTry, withQuery } from "../api/client";

const GeoExplorer = () => {
  const [pincode, setPincode] = useState("");
  const [pinResult, setPinResult] = useState(null);
  const [village, setVillage] = useState("");
  const [appliedVillage, setAppliedVillage] = useState("");
  const [villages, setVillages] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [searchNote, setSearchNote] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(100);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [states, setStates] = useState([]);
  const [state, setState] = useState("");
  const [districts, setDistricts] = useState([]);
  const [selectedDistrict, setSelectedDistrict] = useState("");

  useEffect(() => {
    apiTry(["/api/v1/geo/states"]).then((data) => setStates(data.states || data.items || [])).catch(() => setStates([]));
  }, []);

  useEffect(() => {
    if (!state) return;
    apiTry([`/api/v1/geo/district/${state}`]).then((data) => setDistricts(data.districts || data.items || [])).catch(() => setDistricts([]));
  }, [state]);

  const lookupPin = async () => {
    if (!pincode) return;
    const data = await apiTry([`/api/v1/geo/pin/${pincode}`]);
    setPinResult(data);
  };

  const loadVillageRows = useCallback(async () => {
    setSearching(true);
    setSearchError(null);
    setSearchNote("");

    try {
      const queryText = [appliedVillage, state, selectedDistrict].filter(Boolean).join(" ").trim();
      const data = await apiTry([
        withQuery("/api/v1/admin/data/collection/ref_pin_master", {
          page,
          per_page: perPage,
          search: queryText || undefined,
        }),
      ]);

      const items = (data.items || []).map((item) => ({
        village: item.village_name || item.village || item.office_name || "-",
        subdistrict: item.subdistrict_name || item.taluk || item.subdistrict || "-",
        district: item.district_name || item.district || "-",
        state: item.state_name || item.state || "-",
        pincode: item.pincode || item.pin || "-",
      }));

      setVillages(items);
      setTotal(Number(data.total ?? items.length));
      setTotalPages(Number(data.total_pages ?? 1));
      if (!items.length) {
        setSearchNote("No records match the current geo filters.");
      }
    } catch (err) {
      setSearchError(err.message || "Village search failed");
      setVillages([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setSearching(false);
    }
  }, [appliedVillage, page, perPage, selectedDistrict, state]);

  const searchVillage = () => {
    setAppliedVillage(village.trim());
    setPage(1);
  };

  useEffect(() => {
    loadVillageRows();
  }, [loadVillageRows]);

  const mapStates = useMemo(() => {
    return states.slice(0, 28).map((s, idx) => ({
      name: typeof s === "string" ? s : s.state,
      count: (idx * 7) % 100,
    }));
  }, [states]);

  return (
    <div className="space-y-3">
      <div className="panel grid grid-cols-4 gap-2 p-3 text-xs">
        <label className="space-y-1">
          <span className="text-white/50">Pincode lookup</span>
          <div className="flex gap-2"><input className="field" value={pincode} onChange={(e) => setPincode(e.target.value)} /><button type="button" className="action-btn" onClick={lookupPin}>Lookup</button></div>
        </label>
        <label className="space-y-1">
          <span className="text-white/50">Village search</span>
          <div className="flex gap-2"><input className="field" value={village} onChange={(e) => setVillage(e.target.value)} /><button type="button" className="action-btn" onClick={searchVillage}>Search</button></div>
        </label>
        <label className="space-y-1">
          <span className="text-white/50">State</span>
          <select
            className="field"
            value={state}
            onChange={(e) => {
              setState(e.target.value);
              setSelectedDistrict("");
              setPage(1);
            }}
          >
            <option value="">Select state</option>
            {states.map((s) => {
              const value = typeof s === "string" ? s : s.state;
              return <option key={value} value={value}>{value}</option>;
            })}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-white/50">Districts</span>
          <select
            className="field"
            value={selectedDistrict}
            onChange={(e) => {
              setSelectedDistrict(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Select district</option>
            {districts.map((d) => {
              const value = typeof d === "string" ? d : d.district;
              return <option key={value} value={value}>{value}</option>;
            })}
          </select>
        </label>
      </div>

      {pinResult ? (
        <div className="panel p-3 text-xs">
          <h3 className="mb-2 font-display text-lg text-white/95">Pincode Result</h3>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(pinResult).map(([k, v]) => (
              <div key={k} className="rounded-lg border border-white/10 bg-white/[0.02] p-2">
                <p className="text-[10px] uppercase tracking-wide text-white/45">{k}</p>
                <p className="mt-1 text-white/85">{String(v ?? "-")}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <DataTable
        loading={searching}
        error={searchError}
        onRetry={loadVillageRows}
        columns={[
          { key: "village", label: "Village", render: (r) => r.village || r.village_name || "-" },
          { key: "subdistrict", label: "Subdistrict", render: (r) => r.subdistrict || r.subdistrict_name || "-" },
          { key: "district", label: "District", render: (r) => r.district || r.district_name || "-" },
          { key: "state", label: "State", render: (r) => r.state || r.state_name || "-" },
          { key: "pincode", label: "Pincode", render: (r) => r.pincode || r.pin || "-" },
        ]}
        rows={villages}
        emptyTitle="No village results"
        emptySubtitle="Adjust state, district, or search text and try again."
        showFilters={false}
      />

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
          <button type="button" className="action-btn" disabled={page <= 1 || searching} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
          <button type="button" className="action-btn" disabled={page >= totalPages || searching} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
        </div>
      </div>

      {searchNote ? <div className="panel p-2 text-xs text-white/65">{searchNote}</div> : null}

      <div className="panel p-3">
        <h3 className="mb-2 font-display text-lg text-white/95">Coverage Map</h3>
        <div className="grid grid-cols-7 gap-2 text-[10px]">
          {mapStates.map((item) => (
            <div key={item.name} className="rounded-md border border-white/15 p-2" style={{ background: `rgba(255,255,255,${Math.min(0.06 + item.count / 420, 0.22)})` }}>
              <p className="text-white/80">{item.name}</p>
              <p className="text-white/50">{item.count} farmers</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GeoExplorer;

