import { Minus, Plus } from "lucide-react";
import { useMemo } from "react";
import { useUI } from "../../context/UIContext";
import { SERVICE_HEALTH_DEFAULT } from "../../utils/constants";
import { formatDateTime } from "../../utils/format";

const StatusBar = ({ services = [], lastSync, onReset }) => {
  const { canvasScale, setCanvasScale } = useUI();

  const mergedServices = useMemo(() => {
    if (!services.length) return SERVICE_HEALTH_DEFAULT;
    return services;
  }, [services]);

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-40 flex h-7 items-center justify-between border-t border-white/5 bg-[#1C1C1C]/92 px-2 text-[10px] text-white/60 backdrop-blur-xl sm:px-3">
      <div className="flex items-center gap-2">
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400">
          <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-emerald-400/60" />
        </span>
        <span className="text-emerald-200">Live</span>
        <span className="hidden text-white/35 sm:inline">Last sync: {formatDateTime(lastSync)}</span>
      </div>
      <div className="mx-2 hidden items-center gap-2 overflow-x-auto whitespace-nowrap md:flex">
        {mergedServices.map((service) => (
          <span key={service.name} className="inline-flex items-center gap-1 rounded-md border border-white/10 px-1.5 py-0.5">
            <span className={`h-1.5 w-1.5 rounded-full ${service.ok === false ? "bg-rose-400" : "bg-emerald-400"}`} />
            {service.name}
          </span>
        ))}
      </div>
      <div className="flex items-center gap-1">
        <button type="button" className="zoom-btn" onClick={() => setCanvasScale((s) => Math.max(0.3, s - 0.2))}>
          <Minus size={12} />
        </button>
        <span className="w-14 text-center">{Math.round(canvasScale * 100)}%</span>
        <button type="button" className="zoom-btn" onClick={() => setCanvasScale((s) => Math.min(4, s + 0.2))}>
          <Plus size={12} />
        </button>
        <button type="button" className="action-btn" onClick={onReset}>Reset</button>
      </div>
    </footer>
  );
};

export default StatusBar;

