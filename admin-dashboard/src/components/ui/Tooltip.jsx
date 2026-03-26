const Tooltip = ({ content, children }) => {
  return (
    <div className="group relative inline-flex">
      {children}
      <div className="pointer-events-none absolute right-[calc(100%+10px)] top-1/2 z-[140] w-max -translate-y-1/2 rounded-md border border-white/15 bg-[#2A2A2A] px-2 py-1 text-[10px] text-white/85 opacity-0 transition group-hover:opacity-100">
        {content}
      </div>
    </div>
  );
};

export default Tooltip;

