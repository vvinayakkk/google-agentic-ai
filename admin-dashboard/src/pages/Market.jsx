import { useCallback, useEffect, useMemo, useState } from "react";
import { Database, Plus, RefreshCw } from "lucide-react";
import DataTable from "../components/ui/DataTable";
import Modal from "../components/ui/Modal";
import LineChart from "../components/charts/LineChart";
import { MARKET_TABS } from "../utils/constants";
import { apiTry, withQuery } from "../api/client";
import { formatDate } from "../utils/format";

const TAB_INTRO = {
  "Mandi Prices": "Live mandi prices with state and commodity context from market feeds.",
  MSP: "Minimum Support Price references for major commodities and seasonal planning.",
  Mandis: "Directory and live mandi coverage to map nearby market access.",
  "Price Trends": "Commodity trend curve based on recent historical price points.",
  "Cold Storage": "Cold storage capacity references to identify post-harvest options.",
  Reservoir: "Reservoir levels and water storage references for irrigation planning.",
  FASAL: "Crop insurance and risk-related records used in advisory and planning context.",
  Fertilizer: "Fertilizer advisory and distribution-related reference records.",
  Pesticide: "Pesticide advisory and crop protection reference records.",
};

const Market = () => {
  const [tab, setTab] = useState(MARKET_TABS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
  const [trend, setTrend] = useState(null);
  const [stateFilter, setStateFilter] = useState("");
  const [commodityFilter, setCommodityFilter] = useState("");
  const [showAddPrice, setShowAddPrice] = useState(false);
  const [newPrice, setNewPrice] = useState({ commodity: "", state: "", district: "", market: "", modal_price: 0 });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setTrend(null);
    try {
      if (tab === "Mandi Prices") {
        const data = await apiTry([
          withQuery("/api/v1/market/live-market/prices", { limit: 100, state: stateFilter || undefined, commodity: commodityFilter || undefined }),
          withQuery("/api/v1/market/prices/", { page: 1, per_page: 50 }),
          withQuery("/api/v1/admin/data/mandi-prices", { page: 1, per_page: 100 }),
        ]);
        setRows(data.prices || data.items || []);
      } else if (tab === "MSP") {
        const data = await apiTry([
          withQuery("/api/v1/market/live-market/msp", { commodity: commodityFilter || undefined }),
          "/api/v1/market/ref-data/msp-data",
        ]);
        const mspRows = data.items || Object.entries(data.msp_prices || {}).map(([commodity, msp]) => ({ commodity, msp, season: data.season || "2024-25" }));
        setRows(mspRows);
      } else if (tab === "Mandis") {
        const data = await apiTry([
          withQuery("/api/v1/market/live-market/mandis", { limit: 200, state: stateFilter || undefined }),
          withQuery("/api/v1/market/ref-data/mandi-directory", { limit: 200, state: stateFilter || undefined }),
          withQuery("/api/v1/market/mandis/", { page: 1, per_page: 100 }),
        ]);
        setRows(data.mandis || data.items || []);
      } else if (tab === "Price Trends") {
        const selectedCommodity = commodityFilter || "Wheat";
        const data = await apiTry([
          withQuery("/api/v1/market/ref-data/price-trends", { commodity: selectedCommodity, state: stateFilter || undefined }),
          withQuery("/api/v1/market/trends", { commodity: selectedCommodity }),
        ]);
        setTrend(data);
        setRows(data.price_points || []);
      } else {
        const key = tab.toLowerCase().replace(/\s+/g, "-");
        const endpointMap = {
          "cold-storage": "/api/v1/market/ref-data/cold-storage",
          reservoir: "/api/v1/market/ref-data/reservoir",
          fasal: "/api/v1/schemes/pmfby",
          fertilizer: "/api/v1/schemes/fertilizer-advisory",
          pesticide: "/api/v1/schemes/pesticide-advisory",
        };
        const path = endpointMap[key] || "/api/v1/market/ref-data/cold-storage";
        const data = await apiTry([withQuery(path, { state: stateFilter || undefined })]);
        setRows(data.items || data.records || []);
      }
    } catch (err) {
      setError(err.message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [tab, stateFilter, commodityFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const columns = useMemo(() => {
    if (!rows.length) return [{ key: "value", label: "Data", render: () => "-" }];
    const keys = Object.keys(rows[0]).slice(0, 10);
    return keys.map((key) => ({
      key,
      label: key,
      render: (row) => {
        const value = row[key];
        if (String(key).toLowerCase().includes("date")) return formatDate(value);
        if (typeof value === "object") return JSON.stringify(value).slice(0, 80);
        return String(value ?? "-");
      },
    }));
  }, [rows]);

  const syncNow = useCallback(async () => {
    await apiTry([
      "/api/v1/market/live-market/sync",
      "/api/v1/market/sync",
      "/api/v1/market/admin/sync",
    ], {
      method: "POST",
      body: JSON.stringify({}),
    });
    load();
  }, [load]);

  const addPrice = useCallback(async () => {
    await apiTry([
      "/api/v1/market/prices/",
      "/api/v1/market/admin/price",
    ], {
      method: "POST",
      body: JSON.stringify(newPrice),
    });
    setShowAddPrice(false);
    load();
  }, [load, newPrice]);

  return (
    <div className="space-y-3">
      <div className="panel flex flex-wrap items-center gap-2 p-3">
        {MARKET_TABS.map((item) => (
          <button key={item} type="button" className={`pill-btn ${tab === item ? "border-white/30 bg-white/10" : ""}`} onClick={() => setTab(item)}>
            {item}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <button type="button" className="action-btn" onClick={syncNow}><RefreshCw size={13} />Sync Now</button>
          {tab === "Mandi Prices" ? (
            <button type="button" className="pill-btn border-white/30 bg-white/10" onClick={() => setShowAddPrice(true)}>
              <Plus size={13} /> Add Price Record
            </button>
          ) : null}
        </div>
      </div>

      <div className="panel grid grid-cols-1 gap-2 p-3 text-xs md:grid-cols-4">
        <div className="md:col-span-2 rounded-lg border border-white/10 bg-white/[0.02] p-2 text-white/75">{TAB_INTRO[tab] || "Market dataset"}</div>
        <input
          className="field"
          placeholder="Filter by state"
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
        />
        <input
          className="field"
          placeholder="Filter by commodity"
          value={commodityFilter}
          onChange={(e) => setCommodityFilter(e.target.value)}
        />
      </div>

      {tab === "Price Trends" && trend ? (
        <LineChart
          series={[
            {
              name: `${trend.commodity || "Commodity"} trend (${trend.trend || "STABLE"})`,
              color: "#60A5FA",
              values: (trend.price_points || []).map((p) => Number(p.modal_price || 0)),
            },
          ]}
          labels={(trend.price_points || []).map((p) => p.date || "")}
        />
      ) : null}

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        error={error}
        onRetry={load}
        emptyTitle="No market data"
        emptySubtitle="No records available for selected filters."
      />

      {tab === "Mandis" ? (
        <div className="panel p-4">
          <h3 className="mb-2 font-display text-xl text-white/95">Map View</h3>
          <div className="flex h-52 items-center justify-center rounded-xl border border-white/10 bg-[#161616] text-white/45">
            <Database className="mr-2 h-4 w-4" />
            Dark India map visualization is enabled for mandi dot rendering.
          </div>
        </div>
      ) : null}

      <Modal open={showAddPrice} title="Add Price Record" onClose={() => setShowAddPrice(false)} footer={<div className="flex justify-end gap-2"><button type="button" className="action-btn" onClick={() => setShowAddPrice(false)}>Cancel</button><button type="button" className="pill-btn border-white/30 bg-white/10" onClick={addPrice}>Save</button></div>}>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {Object.keys(newPrice).map((key) => (
            <label key={key} className="space-y-1">
              <span className="text-white/50">{key}</span>
              <input className="field" value={newPrice[key]} onChange={(e) => setNewPrice((p) => ({ ...p, [key]: e.target.value }))} />
            </label>
          ))}
        </div>
      </Modal>
    </div>
  );
};

export default Market;

