import SparkLine from "../charts/SparkLine";

const StatCard = ({ label, value, delta = 0, trend = [] }) => {
  const positive = Number(delta || 0) >= 0;

  return (
    <div className="panel card-pad no-shadow">
      <div className="flex items-start justify-between">
        <div>
          <div className="uppercase-xs">{label}</div>
          <div className="stat-value mt-2">{value ?? 0}</div>
        </div>

        <div style={{ width: 96, height: 48 }}>
          <SparkLine data={trend} color={positive ? "var(--accent)" : "var(--danger)"} height={48} strokeWidth={1.5} />
        </div>
      </div>

      <div className="mt-3">
        <span className={`badge`} style={{ background: positive ? "var(--accent-dim)" : "rgba(239,68,68,0.12)", color: positive ? "var(--accent)" : "#ef4444" }}>
          {positive ? "+" : ""}{delta}%
        </span>
      </div>
    </div>
  );
};

export default StatCard;

