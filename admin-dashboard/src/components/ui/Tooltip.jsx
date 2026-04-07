const Tooltip = ({ content, children }) => {
  return (
    <div className="group relative inline-flex">
      {children}
      <div className="pointer-events-none absolute right-[calc(100%+10px)] top-1/2 z-[140] w-max -translate-y-1/2 rounded-md px-2 py-1 text-[10px] opacity-0 transition group-hover:opacity-100" style={{ border: "1px solid var(--soft)", background: "var(--surface-2)", color: "var(--text)" }}>
        {content}
      </div>
    </div>
  );
};

export default Tooltip;

