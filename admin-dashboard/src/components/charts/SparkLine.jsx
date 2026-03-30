const SparkLine = ({ data = [], color = "var(--accent)", height = 48, strokeWidth = 1.5 }) => {
  const width = 160;
  const safeData = data.length ? data : [0, 0, 0, 0, 0, 0, 0];
  const min = Math.min(...safeData);
  const max = Math.max(...safeData);
  const range = max - min || 1;

  const points = safeData
    .map((v, i) => {
      const x = (i / (safeData.length - 1 || 1)) * width;
      const y = height - ((v - min) / range) * (height - 6) - 3;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible" style={{ height }}>
      <polyline fill="none" stroke={color} strokeWidth={strokeWidth} points={points} />
    </svg>
  );
};

export default SparkLine;

