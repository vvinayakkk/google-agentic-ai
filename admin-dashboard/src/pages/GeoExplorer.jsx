import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DataTable from "../components/ui/DataTable";
import { apiTry, withQuery } from "../api/client";
import { useUI } from "../context/UIContext";

/* ─── Leaflet loader ─────────────────────────────────────────────────────── */
const loadLeaflet = () =>
  new Promise((resolve) => {
    if (window.L) return resolve(window.L);
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(css);
    const s = document.createElement("script");
    s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    s.onload = () => resolve(window.L);
    document.head.appendChild(s);
  });

/* ─── India state centroids ──────────────────────────────────────────────── */
const STATE_COORDS = {
  "Andhra Pradesh": [15.9129, 79.74],
  "Arunachal Pradesh": [28.218, 94.7278],
  Assam: [26.2006, 92.9376],
  Bihar: [25.0961, 85.3131],
  Chhattisgarh: [21.2787, 81.8661],
  Goa: [15.2993, 74.124],
  Gujarat: [22.2587, 71.1924],
  Haryana: [29.0588, 76.0856],
  "Himachal Pradesh": [31.1048, 77.1734],
  Jharkhand: [23.6102, 85.2799],
  Karnataka: [15.3173, 75.7139],
  Kerala: [10.8505, 76.2711],
  "Madhya Pradesh": [22.9734, 78.6569],
  Maharashtra: [19.7515, 75.7139],
  Manipur: [24.6637, 93.9063],
  Meghalaya: [25.467, 91.3662],
  Mizoram: [23.1645, 92.9376],
  Nagaland: [26.1584, 94.5624],
  Odisha: [20.9517, 85.0985],
  Punjab: [31.1471, 75.3412],
  Rajasthan: [27.0238, 74.2179],
  Sikkim: [27.533, 88.5122],
  "Tamil Nadu": [11.1271, 78.6569],
  Telangana: [18.1124, 79.0193],
  Tripura: [23.9408, 91.9882],
  "Uttar Pradesh": [26.8467, 80.9462],
  Uttarakhand: [30.0668, 79.0193],
  "West Bengal": [22.9868, 87.855],
  Delhi: [28.6139, 77.209],
  "Jammu and Kashmir": [33.7782, 76.5762],
  Ladakh: [34.1526, 77.5771],
  "Andaman and Nicobar Islands": [11.7401, 92.6586],
  Lakshadweep: [10.5667, 72.6417],
  Puducherry: [11.9416, 79.8083],
  Chandigarh: [30.7333, 76.7794],
};

const mockCount = (name) => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return 120 + (h % 9800);
};

const GeoExplorer = () => {
  const { theme } = useUI();
  /* ── pincode ── */
  const [pincode, setPincode] = useState("");
  const [pinResult, setPinResult] = useState(null);
  const [pinLoading, setPinLoading] = useState(false);

  /* ── village table ── */
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

  /* ── geo filters ── */
  const [states, setStates] = useState([]);
  const [state, setState] = useState("");
  const [districts, setDistricts] = useState([]);
  const [selectedDistrict, setSelectedDistrict] = useState("");

  /* ── map — default view ── */
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const pinMarkersRef = useRef([]);
  const [activeCoords, setActiveCoords] = useState({ lat: 22.5, lng: 80 });
  const [mapReady, setMapReady] = useState(false);
  const [activeView, setActiveView] = useState("map"); // MAP IS DEFAULT

  /* ── stats ── */
  const [stats] = useState({ totalVillages: "6,64,369", pincodesLinked: "19,204", lastUpdate: "14:02:55" });

  /* ─── Inject styles ──────────────────────────────────────────────────── */
  useEffect(() => {
    const geoStyles = `
      .geo-tip {
        background: var(--app-shell-gradient) !important;
        border: 1px solid var(--soft-strong) !important;
        color: var(--text) !important;
        font-size: 12px !important;
        padding: 6px 10px !important;
        border-radius: 6px !important;
        box-shadow: 0 10px 24px rgba(0,0,0,0.16) !important;
        white-space: nowrap !important;
        pointer-events: none !important;
      }
      .geo-tip::before { display:none !important; }
      .leaflet-popup-content-wrapper {
        background: var(--app-shell-gradient);
        border: 1px solid var(--soft-strong);
        color: var(--text);
        border-radius: 8px;
        box-shadow: 0 10px 24px rgba(0,0,0,0.16);
        font-size: 12px;
      }
      .leaflet-popup-content { margin: 10px 14px; line-height: 1.65; }
      .leaflet-popup-tip-container { display:none; }
      .leaflet-popup-close-button { color: var(--muted) !important; font-size:16px !important; top:6px !important; right:8px !important; }
      .leaflet-control-zoom a {
        background: var(--app-shell-gradient) !important;
        color: var(--text) !important;
        border-color: var(--soft-strong) !important;
        font-size: 15px !important;
      }
      .leaflet-control-zoom a:hover { background: var(--soft-subtle) !important; }
      .leaflet-bar { border: 1px solid var(--soft-strong) !important; box-shadow: none !important; border-radius: 6px !important; overflow:hidden; }
      .leaflet-container { background: var(--surface); }
      .geo-state-dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        cursor: pointer;
        background: rgba(21, 128, 61, 0.95) !important;
        border: 2px solid rgba(187, 247, 208, 0.95) !important;
        box-shadow: 0 0 14px rgba(34,197,94,0.65), 0 0 2px rgba(255,255,255,0.55) !important;
        transition: transform 0.15s ease, box-shadow 0.15s ease;
      }
      html[data-theme="dark"] .geo-state-dot,
      body[data-theme="dark"] .geo-state-dot,
      [data-theme="dark"] .geo-state-dot {
        background: rgba(34,197,94,1) !important;
        border-color: rgba(255,255,255,0.98) !important;
        box-shadow: 0 0 18px rgba(74,222,128,0.98), 0 0 4px rgba(255,255,255,0.9) !important;
      }
      .geo-state-dot:hover {
        transform: scale(1.15);
      }
      @keyframes geo-fade { from { opacity:0; transform:translateY(5px); } to { opacity:1; transform:none; } }
      .geo-fade { animation: geo-fade 0.2s ease both; }
    `;

    const existing = document.getElementById("geo-ex-style");
    if (existing) {
      if (existing.textContent !== geoStyles) {
        existing.textContent = geoStyles;
      }
      return;
    }

    const el = document.createElement("style");
    el.id = "geo-ex-style";
    el.textContent = geoStyles;
    document.head.appendChild(el);
  }, []);

  /* ─── Load states ─────────────────────────────────────────────────────── */
  useEffect(() => {
    apiTry(["/api/v1/geo/states"])
      .then((d) => setStates(d.states || d.items || []))
      .catch(() => setStates([]));
  }, []);

  /* ─── Load districts ─────────────────────────────────────────────────── */
  useEffect(() => {
    if (!state) { setDistricts([]); return; }
    apiTry([`/api/v1/geo/district/${state}`])
      .then((d) => setDistricts(d.districts || d.items || []))
      .catch(() => setDistricts([]));
  }, [state]);

  /* ─── Init map ───────────────────────────────────────────────────────── */
  useEffect(() => {
    let destroyed = false;
    loadLeaflet().then((L) => {
      if (destroyed || !mapRef.current || mapInstanceRef.current) return;

      const map = L.map(mapRef.current, {
        center: [22.5, 80],
        zoom: 5,
        zoomControl: false,
        attributionControl: false,
        preferCanvas: true,
      });

      const tileTheme = theme === "dark" ? "dark_all" : "light_all";
      tileLayerRef.current = L.tileLayer(`https://{s}.basemaps.cartocdn.com/${tileTheme}/{z}/{x}/{y}{r}.png`, {
        maxZoom: 19,
        subdomains: "abcd",
      }).addTo(map);

      L.control.zoom({ position: "topright" }).addTo(map);

      // State dots with hover tooltip + click to filter
      Object.entries(STATE_COORDS).forEach(([sName, coords]) => {
        const count = mockCount(sName);

        const icon = L.divIcon({
          className: "",
          html: `<div class="geo-state-dot"></div>`,
          iconSize: [12, 12],
          iconAnchor: [6, 6],
        });

        const marker = L.marker(coords, { icon }).addTo(map);

        // Hover tooltip — shows place name + farmer count
        marker.bindTooltip(
          `<b style="color:var(--text)">${sName}</b><br/>
           <span style="color:var(--muted)">${count.toLocaleString()} farmers</span><br/>
           <span style="color:var(--muted);font-size:11px">${coords[0].toFixed(2)}°N &nbsp;${coords[1].toFixed(2)}°E</span>`,
          {
            className: "geo-tip",
            direction: "top",
            offset: [0, -7],
            permanent: false,
            opacity: 1,
          }
        );

        // Click: filter + fly
        marker.on("click", () => {
          setState(sName);
          map.flyTo(coords, 7, { duration: 1.0 });
          setActiveCoords({ lat: coords[0], lng: coords[1] });
        });
      });

      mapInstanceRef.current = map;
      setMapReady(true);
    });

    return () => {
      destroyed = true;
      if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; }
    };
  }, []);

  /* ─── Update basemap when theme changes ─────────────────────────────── */
  useEffect(() => {
    const map = mapInstanceRef.current;
    const L = window.L;
    if (!map || !L) return;

    const tileTheme = theme === "dark" ? "dark_all" : "light_all";
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }
    tileLayerRef.current = L.tileLayer(`https://{s}.basemaps.cartocdn.com/${tileTheme}/{z}/{x}/{y}{r}.png`, {
      maxZoom: 19,
      subdomains: "abcd",
    }).addTo(map);
  }, [theme]);

  /* ─── Fly map on state filter change ────────────────────────────────── */
  useEffect(() => {
    if (!mapInstanceRef.current || !state) return;
    const coords = STATE_COORDS[state];
    if (coords) {
      mapInstanceRef.current.flyTo(coords, 7, { duration: 1.0 });
      setActiveCoords({ lat: coords[0], lng: coords[1] });
    }
  }, [state]);

  /* ─── Drop a pin marker ──────────────────────────────────────────────── */
  const dropPinMarker = useCallback((lat, lng, html) => {
    if (!mapInstanceRef.current || !window.L) return;
    pinMarkersRef.current.forEach((m) => m.remove());
    const icon = window.L.divIcon({
      className: "",
      html: `<div style="width:13px;height:13px;background:var(--text);border-radius:50%;border:2px solid var(--surface);box-shadow:0 0 14px rgba(0,0,0,0.2);"></div>`,
      iconSize: [13, 13],
      iconAnchor: [6, 6],
    });
    const m = window.L.marker([lat, lng], { icon })
      .addTo(mapInstanceRef.current)
      .bindPopup(html)
      .openPopup();
    pinMarkersRef.current = [m];
  }, []);

  /* ─── Pincode lookup ─────────────────────────────────────────────────── */
  const lookupPin = async () => {
    if (!pincode) return;
    setPinLoading(true);
    setPinResult(null);
    try {
      const data = await apiTry([`/api/v1/geo/pin/${pincode}`]);
      setPinResult(data);
      const lat = data.latitude || data.lat || STATE_COORDS[data.state_name]?.[0] || 20.5;
      const lng = data.longitude || data.lng || STATE_COORDS[data.state_name]?.[1] || 78.9;
      setActiveCoords({ lat, lng });
      mapInstanceRef.current?.flyTo([lat, lng], 12, { duration: 1.0 });
      dropPinMarker(lat, lng, `<b>${pincode}</b><br/>${data.village_name || ""}${data.district_name ? ", " + data.district_name : ""}`);
      setActiveView("map");
    } catch {
      setPinResult({ error: true });
    } finally {
      setPinLoading(false);
    }
  };

  /* ─── Village table load ─────────────────────────────────────────────── */
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
        lat: item.latitude || item.lat || null,
        lng: item.longitude || item.lng || null,
      }));
      setVillages(items);
      setTotal(Number(data.total ?? items.length));
      setTotalPages(Number(data.total_pages ?? 1));
      if (!items.length) setSearchNote("No records match the current geo filters.");
    } catch (err) {
      setSearchError(err.message || "Village search failed");
      setVillages([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setSearching(false);
    }
  }, [appliedVillage, page, perPage, selectedDistrict, state]);

  useEffect(() => { loadVillageRows(); }, [loadVillageRows]);

  const searchVillage = () => { setAppliedVillage(village.trim()); setPage(1); };

  /* ─── Fly to village from table ─────────────────────────────────────── */
  const flyToVillage = (row) => {
    const lat = row.lat || STATE_COORDS[row.state]?.[0];
    const lng = row.lng || STATE_COORDS[row.state]?.[1];
    if (!lat || !lng || !mapInstanceRef.current) return;
    setActiveView("map");
    mapInstanceRef.current.flyTo([lat, lng], 13, { duration: 1.0 });
    setActiveCoords({ lat, lng });
    dropPinMarker(lat, lng, `<b>${row.village}</b><br/>${row.district}, ${row.state}<br/><span style="color:var(--text)">${row.pincode}</span>`);
  };

  /* ─── State grid ─────────────────────────────────────────────────────── */
  const mapStates = useMemo(() => {
    const src = states.length ? states : Object.keys(STATE_COORDS);
    return src.slice(0, 35).map((s) => {
      const name = typeof s === "string" ? s : s.state;
      return { name, count: mockCount(name) };
    });
  }, [states]);

  /* ─── RENDER ─────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-3" style={{ background: "var(--app-shell-gradient)", border: "1px solid var(--soft-strong)", borderRadius: 12, padding: 10 }}>

      {/* ── FILTER BAR ─────────────────────────────────────────────────── */}
      <div className="panel grid grid-cols-4 gap-3 p-3 text-xs">
        <label className="space-y-1">
          <span className="muted" style={{ fontSize: 10, letterSpacing: "0.07em", textTransform: "uppercase" }}>Pincode Lookup</span>
          <div className="flex gap-2">
            <input
              className="field flex-1"
              placeholder="6-digit PIN"
              value={pincode}
              onChange={(e) => setPincode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && lookupPin()}
            />
            <button
              type="button"
              className="action-btn"
              onClick={lookupPin}
              disabled={pinLoading}
              style={{ background: "var(--app-shell-gradient)", color: "var(--text)", fontWeight: 700, border: "1px solid var(--soft-strong)" }}
            >{pinLoading ? "…" : "Search"}</button>
          </div>
        </label>

        <label className="space-y-1">
          <span className="muted" style={{ fontSize: 10, letterSpacing: "0.07em", textTransform: "uppercase" }}>Village Search</span>
          <div className="flex gap-2">
            <input
              className="field flex-1"
              placeholder="Village name…"
              value={village}
              onChange={(e) => setVillage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchVillage()}
            />
            <button type="button" className="action-btn" onClick={searchVillage}>Search</button>
          </div>
        </label>

        <label className="space-y-1">
          <span className="muted" style={{ fontSize: 10, letterSpacing: "0.07em", textTransform: "uppercase" }}>State</span>
          <select
            className="field"
            value={state}
            onChange={(e) => { setState(e.target.value); setSelectedDistrict(""); setPage(1); }}
          >
            <option value="">All States</option>
            {states.map((s) => { const v = typeof s === "string" ? s : s.state; return <option key={v} value={v}>{v}</option>; })}
          </select>
        </label>

        <label className="space-y-1">
          <span className="muted" style={{ fontSize: 10, letterSpacing: "0.07em", textTransform: "uppercase" }}>District</span>
          <select
            className="field"
            value={selectedDistrict}
            disabled={!state}
            onChange={(e) => { setSelectedDistrict(e.target.value); setPage(1); }}
          >
            <option value="">All Districts</option>
            {districts.map((d) => { const v = typeof d === "string" ? d : d.district; return <option key={v} value={v}>{v}</option>; })}
          </select>
        </label>
      </div>

      {/* ── PIN RESULT ─────────────────────────────────────────────────── */}
      {pinResult && !pinResult.error && (
        <div className="geo-fade panel p-3 text-xs">
          <h3 className="mb-2 font-display text-lg" style={{ color: "var(--text)" }}>Pincode Result</h3>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(pinResult).filter(([, v]) => v !== null && v !== undefined).map(([k, v]) => (
              <div key={k} className="rounded-lg border border-white/10 bg-white/[0.02] p-2">
                <p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--muted)" }}>{k.replace(/_/g, " ")}</p>
                <p className="mt-1" style={{ color: "var(--text)" }}>{String(v)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      {pinResult?.error && (
        <div className="panel p-2 text-xs" style={{ color: "var(--danger)" }}>Pincode not found in reference data.</div>
      )}

      {/* ── VIEW TOGGLE ────────────────────────────────────────────────── */}
      <div className="panel flex items-center gap-2 p-2 text-xs">
        {[{ id: "map", label: "Map View" }, { id: "table", label: "Table View" }].map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveView(id)}
            className={`action-btn ${activeView === id ? "active" : ""}`}
            style={activeView === id ? { borderColor: "var(--soft-strong)", color: "var(--text)", fontWeight: 600 } : {}}
          >{label}</button>
        ))}
        <span className="muted ml-1">
          {activeView === "map"
            ? "Hover dots to see state info · click to filter"
            : `${total.toLocaleString()} records · page ${page} of ${Math.max(totalPages, 1)}`}
        </span>
      </div>

      {/* ── MAP — always mounted, hidden via CSS when not active ────────── */}
      <div style={{ display: activeView === "map" ? "block" : "none", position: "relative", borderRadius: 8, overflow: "hidden", border: "1px solid var(--b)" }}>
        <div ref={mapRef} style={{ height: 460, width: "100%" }} />

        {/* coords chip */}
        <div style={{
          position: "absolute", bottom: 12, left: 12, zIndex: 1000, pointerEvents: "none",
          background: "var(--app-shell-gradient)", backdropFilter: "blur(6px)",
          border: "1px solid var(--soft-strong)", borderRadius: 5,
          padding: "4px 10px", fontSize: 11, color: "var(--text)",
          fontFamily: "'JetBrains Mono','Fira Code',monospace", letterSpacing: "0.04em",
        }}>
          {activeCoords.lat.toFixed(4)}° N &nbsp;&nbsp; {activeCoords.lng.toFixed(4)}° E
        </div>

        {/* active state badge + clear */}
        {state && (
          <div style={{
            position: "absolute", top: 12, left: 12, zIndex: 1000,
            background: "var(--app-shell-gradient)", backdropFilter: "blur(6px)",
            border: "1px solid var(--soft-strong)", borderRadius: 5,
            padding: "4px 10px", fontSize: 11, color: "var(--text)",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <span style={{ fontWeight: 600 }}>{state}</span>
            <button
              type="button"
              onClick={() => { setState(""); mapInstanceRef.current?.flyTo([22.5, 80], 5, { duration: 0.8 }); }}
              style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 13, padding: 0, lineHeight: 1 }}
              title="Clear state filter"
            >✕</button>
          </div>
        )}

        {!mapReady && (
          <div style={{
            position: "absolute", inset: 0, zIndex: 999,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "var(--surface)", color: "var(--muted)",
            fontSize: 11, letterSpacing: "0.1em",
          }}>
            Loading map…
          </div>
        )}
      </div>

      {/* ── TABLE ──────────────────────────────────────────────────────── */}
      {activeView === "table" && (
        <div className="geo-fade space-y-2">
          <DataTable
            loading={searching}
            error={searchError}
            onRetry={loadVillageRows}
            columns={[
              { key: "village",     label: "Village",     render: (r) => r.village },
              { key: "subdistrict", label: "Subdistrict", render: (r) => r.subdistrict },
              { key: "district",    label: "District",    render: (r) => r.district },
              { key: "state",       label: "State",       render: (r) => r.state },
              {
                key: "pincode", label: "Pincode",
                render: (r) => <span style={{ color: "var(--text)", fontFamily: "monospace", fontWeight: 600 }}>{r.pincode}</span>,
              },
              {
                key: "actions", label: "",
                render: (r) => (
                  <button
                    type="button"
                    className="icon-btn"
                    title="Show on map"
                    onClick={() => flyToVillage(r)}
                  >⌖</button>
                ),
              },
            ]}
            rows={villages}
            emptyTitle="No village results"
            emptySubtitle="Adjust state, district, or search text and try again."
            showFilters={false}
          />

          <div className="panel flex flex-wrap items-center justify-between gap-2 p-3 text-xs">
            <span className="muted">Rows: {total.toLocaleString()} · Page {page} of {Math.max(totalPages, 1)}</span>
            <div className="flex items-center gap-2">
              <select
                className="field w-36"
                value={perPage}
                onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
              >
                {[50, 100, 200].map((n) => <option key={n} value={n}>Page size {n}</option>)}
              </select>
              <button type="button" className="action-btn" disabled={page <= 1 || searching} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
              <button type="button" className="action-btn" disabled={page >= totalPages || searching} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
            </div>
          </div>

          {searchNote && <div className="panel p-2 text-xs muted">{searchNote}</div>}
        </div>
      )}

      {/* ── STATS BAR ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Villages",    value: stats.totalVillages,  color: "var(--text)" },
          { label: "Pincodes Linked",   value: stats.pincodesLinked, color: "var(--text)" },
          { label: "Last Index Update", value: stats.lastUpdate,     color: "var(--text)" },
        ].map((s) => (
          <div key={s.label} className="panel card-pad">
            <p className="muted mb-1" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.07em" }}>{s.label}</p>
            <p style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── STATE COVERAGE GRID ────────────────────────────────────────── */}
      <div className="panel p-3">
        <p className="muted mb-3" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.07em" }}>State Coverage</p>
        <div className="grid grid-cols-7 gap-2 text-[10px]">
          {mapStates.map((item) => {
            const intensity = Math.min(item.count / 10000, 1);
            const isActive = state === item.name;
            return (
              <div
                key={item.name}
                title={`${item.name}: ${item.count.toLocaleString()} farmers`}
                onClick={() => { setState(isActive ? "" : item.name); setActiveView("map"); }}
                className="rounded-md border p-2"
                style={{
                  borderColor: isActive ? "var(--soft-strong)" : "var(--b)",
                  background: isActive
                    ? "var(--soft-subtle)"
                    : `rgba(255,255,255,${0.02 + intensity * 0.05})`,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                <p style={{ color: "var(--text)", fontWeight: isActive ? 600 : 400, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</p>
                <p className="muted mt-0.5">{item.count.toLocaleString()}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default GeoExplorer;