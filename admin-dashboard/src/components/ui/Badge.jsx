const toneMap = {
  green: "border-emerald-400/35 bg-emerald-400/15 text-emerald-200",
  red: "border-rose-400/35 bg-rose-400/15 text-rose-200",
  blue: "border-blue-400/35 bg-blue-400/15 text-blue-200",
  orange: "border-orange-400/35 bg-orange-400/15 text-orange-200",
  purple: "border-violet-400/35 bg-violet-400/15 text-violet-200",
  gold: "border-white/30 bg-white/10 text-white",
  muted: "border-white/20 bg-white/10 text-white/70",
};

const Badge = ({ children, tone = "muted", className = "" }) => {
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium ${toneMap[tone] || toneMap.muted} ${className}`}>
      {children}
    </span>
  );
};

export default Badge;

