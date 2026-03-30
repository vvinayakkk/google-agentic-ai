import SparkLine from "../charts/SparkLine";

const StatCard = ({ label, value, delta = 0, trend = [] }) => {
  const positive = Number(delta || 0) >= 0;

  return (
    <div className="panel card-pad no-shadow">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="uppercase-xs" style={{ color: 'var(--muted)' }}>{label}</div>
          <div className="stat-value mt-2" style={{ fontFamily: 'Geist, Inter, system-ui' }}>{value ?? 0}</div>
        </div>

        <div style={{ width: 110, height: 40 }}>
          <SparkLine data={trend} color={positive ? 'var(--accent)' : 'var(--danger)'} height={40} strokeWidth={1.5} />
        </div>
      </div>

      <div style={{ marginTop: 10 }}>
        <span className={positive ? 'badge-green' : 'badge-red'}>
          {positive ? '+' : ''}{Number(delta || 0)}%
        </span>
      </div>
    </div>
  );
};

export default StatCard;

