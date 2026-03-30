const Drawer = ({ open, title, children, onClose, width = 480 }) => {
  return (
    <>
      <div
        className={`fixed inset-0 z-[105] bg-black/50 transition-opacity duration-300 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={onClose}
      />
      <aside
        className="fixed right-0 top-12 z-[110] h-[calc(100vh-64px)] overflow-y-auto"
        style={{ width, borderLeft: '1px solid var(--border)', background: 'var(--surface)', transform: open ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 240ms ease' }}
      >
        <div style={{ height: 44, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{title}</div>
          <button type="button" className="btn-ghost" onClick={onClose}>✕</button>
        </div>
        <div style={{ padding: 12 }}>{children}</div>
      </aside>
    </>
  );
};

export default Drawer;

