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
    <footer className="fixed bottom-0 left-0 right-0 z-40 flex h-7 items-center justify-between px-2 text-[10px] backdrop-blur-xl sm:px-3" style={{ borderTop: "1px solid var(--border)", background: "color-mix(in srgb, var(--surface) 92%, transparent)", color: "var(--muted)" }}>
      <div className="flex items-center gap-2">
        <span className="hidden sm:inline" style={{ color: "var(--faint)" }}>Last sync: {formatDateTime(lastSync)}</span>
      </div>
      <div className="mx-2 hidden items-center gap-2 overflow-x-auto whitespace-nowrap md:flex">
        {mergedServices.map((service) => (
          <span key={service.name} className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5" style={{ border: "1px solid var(--soft)" }}>
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

