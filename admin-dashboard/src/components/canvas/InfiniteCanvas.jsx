import { useEffect, useRef } from "react";
import { useUI } from "../../context/UIContext";

const MIN_SCALE = 0.3;
const MAX_SCALE = 4;

const InfiniteCanvas = () => {
  const ref = useRef(null);
  const { canvasPan, setCanvasPan, canvasScale, setCanvasScale, mouse, setMouse } = useUI();

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    const handleWheel = (e) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const delta = -e.deltaY * 0.004;
        const nextScale = Math.min(Math.max(MIN_SCALE, canvasScale + delta), MAX_SCALE);
        const rect = node.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const ratio = nextScale / canvasScale;
        setCanvasPan((prev) => ({
          x: mx - (mx - prev.x) * ratio,
          y: my - (my - prev.y) * ratio,
        }));
        setCanvasScale(nextScale);
      } else {
        setCanvasPan((prev) => ({ x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
      }
    };

    const updateMouseFromEvent = (e) => {
      const rect = node.getBoundingClientRect();
      setMouse({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };

    node.addEventListener("wheel", handleWheel, { passive: false });
    node.addEventListener("mousemove", updateMouseFromEvent);
    window.addEventListener("mousemove", updateMouseFromEvent);

    return () => {
      node.removeEventListener("wheel", handleWheel);
      node.removeEventListener("mousemove", updateMouseFromEvent);
      window.removeEventListener("mousemove", updateMouseFromEvent);
    };
  }, [canvasScale, setCanvasPan, setCanvasScale, setMouse]);

  return (
    <div ref={ref} className="pointer-events-auto fixed inset-0 z-0 overflow-hidden" style={{ background: "var(--bg)" }}>
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(var(--soft-strong) 1px, transparent 1px)",
          backgroundSize: `${10 * canvasScale}px ${10 * canvasScale}px`,
          backgroundPosition: `${canvasPan.x}px ${canvasPan.y}px`,
        }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(var(--faint) 1px, transparent 1px)",
          backgroundSize: `${50 * canvasScale}px ${50 * canvasScale}px`,
          backgroundPosition: `${canvasPan.x}px ${canvasPan.y}px`,
          opacity: 0.7,
          maskImage: `radial-gradient(circle 110px at ${mouse.x}px ${mouse.y}px, var(--text), transparent)`,
          WebkitMaskImage: `radial-gradient(circle 110px at ${mouse.x}px ${mouse.y}px, var(--text), transparent)`,
        }}
      />
    </div>
  );
};

export default InfiniteCanvas;

