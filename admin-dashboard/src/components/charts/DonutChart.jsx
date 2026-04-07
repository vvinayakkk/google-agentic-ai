const polar = (cx, cy, r, angle) => {
  const a = ((angle - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
};

const arcPath = (cx, cy, r, start, end) => {
  const s = polar(cx, cy, r, end);
  const e = polar(cx, cy, r, start);
  const large = end - start <= 180 ? 0 : 1;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 0 ${e.x} ${e.y}`;
};

const palette = ["#E5E7EB", "#60A5FA", "#4ADE80", "#FB923C", "#A78BFA", "#F87171"];

const DonutChart = ({ data = [] }) => {
  const total = data.reduce((acc, item) => acc + Number(item.value || 0), 0) || 1;
  const segments = data.reduce((acc, item, idx) => {
    const start = idx === 0 ? 0 : acc[idx - 1].end;
    const delta = (Number(item.value || 0) / total) * 360;
    acc.push({ ...item, start, end: start + delta });
    return acc;
  }, []);

  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 120 120" className="h-32 w-32">
        <circle cx="60" cy="60" r="44" fill="none" stroke="var(--soft-strong)" strokeWidth="14" />
        {segments.map((item, idx) => {
          const path = arcPath(60, 60, 44, item.start, item.end);
          return (
            <path
              key={item.label}
              d={path}
              fill="none"
              stroke={palette[idx % palette.length]}
              strokeWidth="14"
              strokeLinecap="round"
            />
          );
        })}
      </svg>
      <div className="space-y-1 text-[11px]">
        {data.map((item, idx) => (
          <div key={item.label} className="flex items-center gap-2 text-white/70">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: palette[idx % palette.length] }} />
            <span>{item.label}</span>
            <span className="text-white/40">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DonutChart;

