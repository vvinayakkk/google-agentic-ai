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
      <div className="panel flex items-center gap-2 p-3">
        {[7, 14, 30, 90].map((d) => (
          <button key={d} type="button" className={`pill-btn ${windowDays === d ? "border-white/30 bg-white/10" : ""}`} onClick={() => setWindowDays(d)}>
            {d} days
          </button>
        ))}
        <button type="button" className="pill-btn border-white/30 bg-white/10" onClick={generateSnapshot}>
          <WandSparkles size={13} /> Generate Snapshot
        </button>
        <p className="ml-auto text-[11px] text-white/45">Last generated: {overview?.generated_at || "-"}</p>
      </div>

      {loading ? <div className="panel p-4 text-sm text-white/60">Loading analytics overview...</div> : null}
      {error ? <div className="panel border border-rose-300/25 bg-rose-300/10 p-4 text-sm text-rose-100">{error}</div> : null}

      <div className="grid grid-cols-5 gap-3">
        {scoreCards.length ? scoreCards.map((card) => (
          <div key={card.title} className="panel p-3">
            <p className="text-[10px] uppercase tracking-wide text-white/45">{card.title}</p>
            <p className="font-display text-4xl text-white/95">{card.value}</p>
            <p className={`text-[11px] ${Number(card.delta || 0) >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{card.delta || 0}%</p>
            <p className="mt-1 text-[10px] text-white/40">{card.context || ""}</p>
          </div>
        )) : (
          <div className="panel col-span-5 p-4 text-sm text-white/45">No scorecards found.</div>
        )}
      </div>

      <LineChart
        series={[
          { name: "Farmers", color: "#E5E7EB", values: (growth.farmers || []).map((p) => Number(p.value || 0)) },
          { name: "Conversations", color: "#60A5FA", values: (growth.conversations || []).map((p) => Number(p.value || 0)) },
          { name: "Bookings", color: "#4ADE80", values: (growth.bookings || []).map((p) => Number(p.value || 0)) },
        ]}
        labels={labels}
      />

      <div className="grid grid-cols-3 gap-3">
        <div className="panel p-3">
          <div className="mb-2 flex items-center gap-2">
            <h3 className="font-display text-lg text-white/95">Top States</h3>
            <select className="field max-w-[150px]" value={stateFocus} onChange={(e) => setStateFocus(e.target.value)}>
              <option value="all">All states</option>
              {topStates.map((s) => (
                <option key={s.state} value={s.state}>{s.state}</option>
              ))}
            </select>
          </div>
          <BarChart data={stateBars} />
        </div>
        <div className="panel p-3">
          <h3 className="mb-2 font-display text-lg text-white/95">Opportunity Signals</h3>
          <BarChart data={opportunityBars} color="#A78BFA" />
        </div>
        <div className="panel p-3">
          <h3 className="mb-2 font-display text-lg text-white/95">Engagement Mix</h3>
          <DonutChart data={engagementDonut} />
        </div>
      </div>

      <div className="panel p-3">
        <h3 className="mb-2 font-display text-lg text-white/95">Market Intelligence</h3>
        {commodityBars.length ? <BarChart data={commodityBars} horizontal color="#FB923C" /> : <p className="text-xs text-white/55">No commodity intensity yet for the selected window. Try generating a fresh snapshot.</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="panel p-3">
          <h3 className="mb-2 font-display text-lg text-white/95">Operational Health</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg border border-white/10 p-2">
              <p className="text-white/45">System Score</p>
              <p className="text-white/90">{Number(operational.system_health_score || 0).toFixed(2)}</p>
            </div>
            <div className="rounded-lg border border-white/10 p-2">
              <p className="text-white/45">Profile Completeness</p>
              <p className="text-white/90">{Number(operational.profile_completeness_pct || 0).toFixed(2)}%</p>
            </div>
            <div className="rounded-lg border border-white/10 p-2">
              <p className="text-white/45">Unread Notifications</p>
              <p className="text-white/90">{Number(operational.unread_notifications || 0)}</p>
            </div>
            <div className="rounded-lg border border-white/10 p-2">
              <p className="text-white/45">Freshness Lag (days)</p>
              <p className="text-white/90">{Number(operational.avg_data_freshness_lag_days || 0).toFixed(2)}</p>
            </div>
          </div>
        </div>
        <div className="panel p-3">
          <h3 className="mb-2 font-display text-lg text-white/95">Opportunities</h3>
          <ul className="space-y-2 text-xs text-white/75">
            <li>Farmers without crops: {opportunities.farmers_without_crops || 0}</li>
            <li>Inactive farmers: {opportunities.inactive_farmers || 0}</li>
            <li>District coverage gaps: {opportunities.district_coverage_gaps || 0}</li>
            <li>Activation rate: {Number(engagement.activation_rate_pct || 0).toFixed(2)}%</li>
          </ul>
        </div>
      </div>

      <div className="panel p-3">
        <h3 className="mb-2 font-display text-lg text-white/95">Recommendations</h3>
        <div className="space-y-2">
          {(recommendations || []).map((rec, idx) => (
            <div key={`${idx}-${rec}`} className="rounded-lg border border-white/15 bg-white/[0.04] p-2 text-xs text-white/80">
              {rec}
            </div>
          ))}
        </div>
      </div>

      <div className="panel p-3">
        <h3 className="mb-2 font-display text-lg text-white/95">Farmer Insight Summary</h3>
        <div className="mb-2 flex gap-2">
          <input className="field" value={farmerId} onChange={(e) => setFarmerId(e.target.value)} placeholder="Farmer ID" />
          <button type="button" className="pill-btn" onClick={loadFarmerSummary}>Load</button>
        </div>
        {farmerSummary ? (
          <div className="grid grid-cols-3 gap-2 text-xs text-white/80">
            <div className="panel p-2">Crops: {farmerSummary?.totals?.crops || 0}</div>
            <div className="panel p-2">Bookings: {farmerSummary?.totals?.bookings || 0}</div>
            <div className="panel p-2">Conversations: {farmerSummary?.totals?.conversations || 0}</div>
            <div className="panel p-2">Messages: {farmerSummary?.totals?.messages || 0}</div>
            <div className="panel p-2">Unread Notifications: {farmerSummary?.totals?.unread_notifications || 0}</div>
            <div className="panel p-2">Engagement Band: {farmerSummary?.benchmarks?.engagement_band || "-"}</div>
          </div>
        ) : (
          <p className="text-xs text-white/45">Search by farmer ID to load summary and benchmarks.</p>
        )}
      </div>
    </div>
  );
};

export default Analytics;

