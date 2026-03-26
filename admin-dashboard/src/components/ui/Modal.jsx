const Modal = ({ open, title, children, onClose, footer = null, wide = false }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className={`w-full ${wide ? "max-w-4xl" : "max-w-lg"} rounded-2xl border border-white/10 bg-[#1E1E1E] p-4 shadow-2xl`}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-xl text-white/95">{title}</h3>
          <button type="button" className="rounded-full border border-white/20 px-3 py-1 text-xs text-white/80 hover:bg-white/10" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto pr-1">{children}</div>
        {footer ? <div className="mt-4">{footer}</div> : null}
      </div>
    </div>
  );
};

export default Modal;

