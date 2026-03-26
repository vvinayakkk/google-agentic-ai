const SparkLine = ({ data = [], color = "var(--accent-blue)" }) => {
  const width = 160;
  const height = 42;
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
    <svg viewBox={`0 0 ${width} ${height}`} className="h-10 w-full overflow-visible">
      <polyline fill="none" stroke={color} strokeWidth="1.8" points={points} />
    </svg>
  );
};

export default SparkLine;

