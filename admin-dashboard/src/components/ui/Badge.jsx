const Badge = ({ children, tone = "muted", className = "" }) => {
  const cls = tone === "green" ? "badge-green" : tone === "red" ? "badge-red" : tone === "orange" ? "badge-orange" : tone === "blue" ? "badge-blue" : "badge-muted";
  return (
    <span className={`${cls} ${className}`.trim()}>
      {children}
    </span>
  );
};

export default Badge;

