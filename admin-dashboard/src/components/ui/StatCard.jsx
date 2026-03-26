import SparkLine from "../charts/SparkLine";

const StatCard = ({ label, value, delta = 0, trend = [] }) => {
  const positive = Number(delta || 0) >= 0;

  return (
    <div className="panel p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[11px] text-white/55">{label}</p>
        <span className={`text-[10px] ${positive ? "text-emerald-300" : "text-rose-300"}`}>
          {positive ? "+" : ""}
          {delta}%
        </span>
      </div>
      <div className="font-display text-3xl leading-none text-white/95">{value}</div>
      <div className="mt-2">
        <SparkLine data={trend} color={positive ? "#4ADE80" : "#F87171"} />
      </div>
    </div>
  );
};

export default StatCard;

