import { useEffect, useMemo, useState } from "react";
import StatCard from "../components/ui/StatCard";
import NodeGraph from "../components/canvas/NodeGraph";
import { apiTry } from "../api/client";
import { formatNumber } from "../utils/format";

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

const Overview = ({ onStatsChange, onActivityChange }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

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
      { label: "Total Farmers", value: formatNumber(payload.total_farmers || 0), delta: 6.1, trend: trends[0] },
      { label: "Active Farmers", value: formatNumber(payload.dau || 0), delta: 3.2, trend: trends[1] },
      { label: "Total Crops Tracked", value: formatNumber(payload.total_crops || 0), delta: 8.6, trend: trends[2] },
      { label: "Market Price Records", value: formatNumber(payload.total_market_records || 0), delta: 4.9, trend: trends[3] },
      { label: "Schemes Available", value: formatNumber(payload.total_schemes || 0), delta: 1.4, trend: trends[4] },
      { label: "Equipment Listings", value: formatNumber(payload.total_equipment || 0), delta: 2.1, trend: trends[5] },
      { label: "Pending Rentals", value: formatNumber(payload.pending_rentals || 0), delta: -1.2, trend: trends[6] },
      { label: "Notifications Today", value: formatNumber(payload.notifications_sent || 0), delta: 5.7, trend: trends[7] },
    ];
  }, [stats]);

  const feed = useMemo(() => buildFeed(stats), [stats]);

  useEffect(() => {
    onActivityChange?.(feed);
  }, [feed, onActivityChange]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((item) => (
          <StatCard key={item.label} {...item} />
        ))}
      </div>
      <div className="rounded-2xl border border-white/10 p-2 sm:p-3">
        <NodeGraph activeNodes={["orchestrator", "market", "schemes", "response", "text", "tts"]} />
      </div>
      {loading ? (
        <div className="text-[11px] text-white/40">Live activity is syncing...</div>
      ) : null}
    </div>
  );
};

export default Overview;

