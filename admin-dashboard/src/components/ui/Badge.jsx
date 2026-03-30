const Badge = ({ children, tone = "muted", className = "" }) => {
  const styles = {
    green: { background: 'var(--accent-dim)', color: 'var(--accent)' },
    red: { background: 'rgba(239,68,68,0.12)', color: 'var(--danger)' },
    orange: { background: 'rgba(251,146,60,0.12)', color: '#F59E0B' },
    muted: { background: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)', padding: '2px 6px', borderRadius: '4px' },
  };

  const style = styles[tone] || styles.muted;
  return (
    <span className={`badge ${className}`} style={style}>
      {children}
    </span>
  );
};

export default Badge;

