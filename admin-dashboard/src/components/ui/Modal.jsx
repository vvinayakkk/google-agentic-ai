const Modal = ({ open, title, children, onClose, footer = null, wide = false }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70">
      <div className={`w-full ${wide ? "max-w-4xl" : "max-w-lg"} panel`} style={{ borderRadius: 8, padding: 0 }}>
        <div style={{ height: 44, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', padding: '0 12px' }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{title}</div>
          <button type="button" className="icon-btn" onClick={onClose}>✕</button>
        </div>
        <div style={{ maxHeight: '70vh', overflowY: 'auto', padding: 16 }}>{children}</div>
        {footer ? <div style={{ marginTop: 12, padding: 12 }}>{footer}</div> : null}
      </div>
    </div>
  );
};

export default Modal;

