const Drawer = ({ open, title, children, onClose, width = 480 }) => {
  return (
    <>
      <div
        className={`fixed inset-0 z-[105] bg-black/50 transition-opacity duration-300 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={onClose}
      />
      <aside
        className="fixed right-0 top-10 z-[110] h-[calc(100vh-64px)] overflow-y-auto border-l border-white/10 bg-[#1E1E1E] p-4 transition-transform duration-300 ease-out"
        style={{ width, transform: open ? "translateX(0)" : "translateX(100%)" }}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-lg text-white/95">{title}</h3>
          <button type="button" className="rounded-full border border-white/20 px-3 py-1 text-xs text-white/80 hover:bg-white/10" onClick={onClose}>
            Close
          </button>
        </div>
        {children}
      </aside>
    </>
  );
};

export default Drawer;

