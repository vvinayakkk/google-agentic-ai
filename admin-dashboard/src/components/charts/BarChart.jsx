const BarChart = ({ data = [], horizontal = false, color = "var(--accent-blue)", maxBars = 8 }) => {
  const rows = data.slice(0, maxBars);
  const max = Math.max(...rows.map((r) => Number(r.value || 0)), 1);

  if (horizontal) {
    return (
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="text-[11px] text-white/70">
            <div className="mb-1 flex justify-between">
              <span>{row.label}</span>
              <span>{row.value}</span>
            </div>
            <div className="h-2 rounded-full bg-white/10">
              <div
                className="h-2 rounded-full"
                style={{ width: `${(Number(row.value || 0) / max) * 100}%`, background: color }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex h-44 items-end gap-2">
      {rows.map((row) => (
        <div key={row.label} className="flex flex-1 flex-col items-center gap-2">
          <div className="text-[10px] text-white/60">{row.value}</div>
          <div
            className="w-full rounded-t-md"
            style={{
              background: color,
              height: `${Math.max((Number(row.value || 0) / max) * 100, 4)}%`,
            }}
          />
          <div className="line-clamp-1 text-[10px] text-white/50">{row.label}</div>
        </div>
      ))}
    </div>
  );
};

export default BarChart;

