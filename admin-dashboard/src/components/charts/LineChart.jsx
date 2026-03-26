const buildPath = (points, width, height, min, max) => {
  const range = max - min || 1;
  return points
    .map((p, i) => {
      const x = (i / (points.length - 1 || 1)) * width;
      const y = height - ((p - min) / range) * (height - 16) - 8;
      return `${i === 0 ? "M" : "L"}${x} ${y}`;
    })
    .join(" ");
};

const LineChart = ({ series = [], labels = [] }) => {
  const width = 760;
  const height = 240;
  const allValues = series.flatMap((s) => s.values || []);
  const min = Math.min(...(allValues.length ? allValues : [0]));
  const max = Math.max(...(allValues.length ? allValues : [100]));

  return (
    <div className="rounded-2xl border border-white/10 bg-[#1E1E1E] p-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
        {[0, 1, 2, 3].map((i) => (
          <line
            key={i}
            x1="0"
            y1={(height / 4) * i}
            x2={width}
            y2={(height / 4) * i}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="1"
          />
        ))}
        {series.map((item) => (
          <path
            key={item.name}
            d={buildPath(item.values || [], width, height, min, max)}
            fill="none"
            stroke={item.color || "var(--accent-blue)"}
            strokeWidth="2"
          />
        ))}
      </svg>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-white/70">
        {series.map((item) => (
          <div key={item.name} className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: item.color || "var(--accent-blue)" }} />
            <span>{item.name}</span>
          </div>
        ))}
      </div>
      {labels.length > 0 && (
        <div className="mt-2 flex justify-between text-[10px] text-white/35">
          <span>{labels[0]}</span>
          <span>{labels[Math.floor(labels.length / 2)]}</span>
          <span>{labels[labels.length - 1]}</span>
        </div>
      )}
    </div>
  );
};

export default LineChart;

