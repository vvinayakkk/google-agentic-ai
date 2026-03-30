import { useEffect, useMemo, useState } from "react";
import StatCard from "../components/ui/StatCard";
import { apiTry, healthChecks } from "../api/client";
import { formatNumber } from "../utils/format";
import LineChart from "../components/charts/LineChart";

const trends = [
  [32, 35, 31, 36, 42, 44, 48],
  [20, 24, 28, 27, 33, 31, 30],
  [8, 12, 10, 15, 18, 21, 24],
  [60, 56, 62, 65, 66, 63, 69],
  [17, 16, 20, 24, 22, 26, 30],
  [9, 10, 8, 11, 12, 13, 14],
  [4, 8, 7, 8, 10, 12, 11],
  [40, 41, 45, 52, 57, 60, 58],
];

const buildFeed = (stats) => {
  const base = [
    { type: "registration", text: "New farmer registered from Nashik", at: new Date().toISOString() },
    { type: "session", text: "Agent session started for farmer #A12", at: new Date(Date.now() - 5 * 60000).toISOString() },
    { type: "voice", text: "Voice command processed with STT+TTS pipeline", at: new Date(Date.now() - 11 * 60000).toISOString() },
    { type: "scheme", text: "Scheme eligibility query completed", at: new Date(Date.now() - 16 * 60000).toISOString() },
    { type: "market", text: "Market prices refreshed for 3 states", at: new Date(Date.now() - 22 * 60000).toISOString() },
  ];

  if (!stats) return base;

  return [
    { type: "registration", text: `${stats.new_farmers_today || 0} farmers joined today`, at: new Date().toISOString() },
    { type: "session", text: `${stats.agent_queries_today || 0} agent queries served`, at: new Date(Date.now() - 8 * 60000).toISOString() },
    ...base,
  ];
};

const Overview = ({ onStatsChange, onActivityChange, onRefresh }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [serviceHealth, setServiceHealth] = useState([]);

  useEffect(() => {
    let timer;
    let mounted = true;

    const load = async () => {
      try {
        const data = await apiTry([
          "/api/v1/admin/stats",
          "/api/v1/admin/analytics/overview",
        ]);
        if (!mounted) return;
        setStats(data);
        onStatsChange?.(data);
        // fetch service health
        try {
          const checks = await healthChecks();
          setServiceHealth(checks || []);
        } catch {
          setServiceHealth([]);
        }
      } catch {
        if (mounted) {
          setStats(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    timer = setInterval(load, 30000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [onStatsChange]);

  const cards = useMemo(() => {
    const payload = stats || {};
    return [
      { label: "Total Farmers", value: formatNumber(payload.total_farmers ?? 0), delta: 0, trend: trends[0] },
      { label: "Active Today", value: formatNumber(payload.dau ?? 0), delta: 0, trend: trends[1] },
      { label: "Crops Tracked", value: formatNumber(payload.total_crops ?? 0), delta: 0, trend: trends[2] },
      { label: "Market Records", value: formatNumber(payload.total_market_records ?? 0), delta: 0, trend: trends[3] },
      { label: "Agent Queries Today", value: formatNumber(payload.agent_queries_today ?? 0), delta: 0, trend: trends[4] },
      { label: "Notifications Sent", value: formatNumber(payload.notifications_sent ?? 0), delta: 0, trend: trends[5] },
      { label: "Pending Rentals", value: formatNumber(payload.pending_rentals ?? 0), delta: 0, trend: trends[6] },
      { label: "Schemes Available", value: formatNumber(payload.total_schemes ?? 0), delta: 0, trend: trends[7] },
    ];
  }, [stats]);

  const feed = useMemo(() => buildFeed(stats), [stats]);

  useEffect(() => {
    onActivityChange?.(feed);
  }, [feed, onActivityChange]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 style={{ fontSize: 15, fontWeight: 600 }}>Overview</h2>
        <div>
          <button type="button" className="btn-ghost" onClick={onRefresh}>Refresh</button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((item) => (
          <StatCard key={item.label} {...item} />
        ))}
      </div>

      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-7 panel card-pad">
          <div className="uppercase-xs">GROWTH TREND</div>
          <div className="mt-2">
            <LineChart series={[{ name: 'Farmers', color: 'var(--accent)', values: (stats?.growth_trends?.farmers || []).map(p => Number(p.value || 0)) }]} labels={(stats?.growth_trends?.farmers || []).map(p => p.date || p.label || '')} />
          </div>
        </div>

        <div className="col-span-5 panel card-pad">
          <div className="flex items-center justify-between">
            <div className="uppercase-xs">LIVE ACTIVITY</div>
            <div className="muted" style={{ fontSize: 12 }}>auto-refreshes every 30s</div>
          </div>
          <div className="mt-3 space-y-2">
            {(buildFeed(stats) || []).slice(0, 8).map((item, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <div style={{ width: 8, height: 8, background: 'var(--accent)', borderRadius: 8, marginTop: 6 }} />
                <div>
                  <div style={{ fontSize: 13 }}>{item.text}</div>
                  <div className="muted" style={{ fontSize: 11 }}>{new Date(item.at).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        {(serviceHealth || []).map((s) => (
          <div key={s.name} className="badge" style={{ background: s.ok ? 'var(--accent-dim)' : 'rgba(239,68,68,0.12)', color: s.ok ? 'var(--accent)' : 'var(--danger)' }}>{s.name}</div>
        ))}
      </div>
    </div>
  );
};

export default Overview;

