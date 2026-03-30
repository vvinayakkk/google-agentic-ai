import { useCallback, useEffect, useMemo, useState } from "react";
import { WandSparkles } from "lucide-react";
import { apiTry } from "../api/client";
import LineChart from "../components/charts/LineChart";
import BarChart from "../components/charts/BarChart";
import DonutChart from "../components/charts/DonutChart";

const Analytics = () => {
  const [windowDays, setWindowDays] = useState(30);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stateFocus, setStateFocus] = useState("all");
  const [farmerId, setFarmerId] = useState("");
  const [farmerSummary, setFarmerSummary] = useState(null);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiTry([
        `/api/v1/analytics/overview?days=${windowDays}`,
        `/api/v1/analytics/admin/overview?window_days=${windowDays}`,
      ]);
      setOverview(data);
    } catch (err) {
      setError(err.message || "Failed to load analytics overview");
      setOverview(null);
    } finally {
      setLoading(false);
    }
  }, [windowDays]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const generateSnapshot = useCallback(async () => {
    await apiTry([
      `/api/v1/analytics/snapshots/generate?days=${windowDays}`,
      "/api/v1/analytics/admin/generate",
    ], {
      method: "POST",
      body: JSON.stringify({}),
    });
    await loadOverview();
  }, [loadOverview, windowDays]);

  const loadFarmerSummary = useCallback(async () => {
    if (!farmerId.trim()) return;
    const data = await apiTry([
      `/api/v1/analytics/farmer/${farmerId}/summary?days=30`,
      `/api/v1/analytics/farmer/${farmerId}/summary`,
    ]);
    setFarmerSummary(data);
  }, [farmerId]);

  const scoreCards = useMemo(() => overview?.scorecard || [], [overview]);
  const growth = overview?.growth_trends || {};
  const engagement = overview?.engagement || {};
  const operational = overview?.operational_health || {};
  const marketIntel = overview?.market_intelligence || {};
  const opportunities = overview?.opportunities || {};
  const recommendations = overview?.recommendations || [];

  const labels = (growth.farmers || []).map((p) => p.date || p.label || "");
  const topStates = operational.top_states || [];
  const stateBars = (stateFocus === "all" ? topStates : topStates.filter((s) => String(s.state || "").toLowerCase() === stateFocus.toLowerCase()))
    .map((s) => ({ label: s.state || "-", value: Number(s.farmers || 0) }));

  const topFarmerCard = scoreCards.find((x) => String(x.title || "").toLowerCase().includes("total farmers"));
  const totalFarmers = Number(topFarmerCard?.value || 0);
  const activeFarmers = Number(engagement.active_farmers || 0);
  const riskFarmers = Math.max(totalFarmers - activeFarmers, 0);

  const opportunityBars = [
    { label: "Without Crops", value: Number(opportunities.farmers_without_crops || 0) },
    { label: "Inactive Farmers", value: Number(opportunities.inactive_farmers || 0) },
    { label: "District Gaps", value: Number(opportunities.district_coverage_gaps || 0) },
  ];

  const commodityBars = (marketIntel.top_commodities || []).map((c) => ({ label: c.commodity || c.label || "-", value: Number(c.value || c.count || 0) }));
  const engagementDonut = [
    { label: "Active", value: activeFarmers },
    { label: "At Risk", value: riskFarmers },
    { label: "Voice Sessions", value: Number(engagement.voice_sessions_window || 0) },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 style={{ fontSize: 15, fontWeight: 600 }}>Analytics</h2>
        <div className="flex items-center gap-2">
          {[7, 30, 90].map((d) => (
            <button key={d} type="button" className={`btn-ghost ${windowDays === d ? 'btn-primary' : ''}`} onClick={() => setWindowDays(d)}>{d} days</button>
          ))}
          <button type="button" className="btn-ghost" onClick={generateSnapshot}><WandSparkles size={14} /> Generate Snapshot</button>
        </div>
      </div>

      {loading ? <div className="panel card-pad muted">Loading analytics overview...</div> : null}
      {error ? <div className="panel card-pad" style={{ borderColor: 'var(--danger)', background: 'rgba(239,68,68,0.06)' }}>{error}</div> : null}

      <div className="grid grid-cols-4 gap-3">
        {scoreCards.map((card) => (
          <div key={card.title} className="panel card-pad">
            <div className="uppercase-xs">{card.title}</div>
            <div className="stat-value mt-2">{card.value}</div>
            <div className="muted" style={{ marginTop: 6 }}>{card.context}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="panel card-pad">
          <div className="uppercase-xs">Farmer Growth</div>
          <div className="mt-3">
            <LineChart series={[{ name: 'Farmers', color: 'var(--accent)', values: (growth.farmers || []).map(p => Number(p.value || 0)) }]} labels={labels} />
          </div>
        </div>

        <div className="panel card-pad">
          <div className="flex items-center justify-between"><div className="uppercase-xs">Top States</div>
            <select className="field" value={stateFocus} onChange={(e) => setStateFocus(e.target.value)} style={{ width: 140 }}>
              <option value="all">All states</option>
              {topStates.map((s) => (
                <option key={s.state} value={s.state}>{s.state}</option>
              ))}
            </select>
          </div>
          <div className="mt-3"><BarChart data={stateBars} /></div>
        </div>

        <div className="panel card-pad">
          <div className="uppercase-xs">Engagement</div>
          <div className="mt-3"><DonutChart data={engagementDonut} /></div>
        </div>
      </div>

      <div className="panel card-pad">
        <div className="uppercase-xs">Opportunities</div>
        <div className="mt-3 grid grid-cols-3 gap-3">
          {opportunityBars.map((b) => (
            <div key={b.label}>
              <div className="muted">{b.label}</div>
              <div style={{ height: 8, background: 'var(--surface-2)', borderRadius: 4, marginTop: 6 }}>
                <div style={{ width: `${Math.min(100, (b.value || 0))}%`, height: '100%', background: 'var(--accent)' }} />
              </div>
              <div className="muted" style={{ marginTop: 6 }}>{b.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="panel card-pad">
        <div className="uppercase-xs">AI RECOMMENDATIONS</div>
        <ol className="mt-2" style={{ paddingLeft: 18 }}>
          {(recommendations || []).map((r, idx) => <li key={idx} className="muted" style={{ marginTop: 6 }}>{r}</li>)}
        </ol>
      </div>

      <div className="panel card-pad">
        <div className="uppercase-xs">Farmer Lookup</div>
        <div className="mt-2 flex gap-2">
          <input className="field" value={farmerId} onChange={(e) => setFarmerId(e.target.value)} placeholder="Farmer ID" />
          <button type="button" className="btn-primary" onClick={loadFarmerSummary}>Lookup</button>
        </div>
        {farmerSummary ? (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {Object.entries(farmerSummary?.totals || {}).map(([k, v]) => (
              <div key={k} className="panel card-pad">
                <div className="muted">{k}</div>
                <div style={{ fontWeight: 700 }}>{v}</div>
              </div>
            ))}
          </div>
        ) : <div className="muted mt-3">Search by farmer ID to load summary.</div>}
      </div>
    </div>
  );
};

export default Analytics;

