import { createContext, useContext, useMemo, useState } from "react";
import { PAGE_KEYS } from "../utils/constants";

const UIContext = createContext(null);

export const UIProvider = ({ children }) => {
  const [activePage, setActivePage] = useState(PAGE_KEYS.DATABASE);
  const [isCommandOpen, setCommandOpen] = useState(false);
  const [isExportOpen, setExportOpen] = useState(false);
  const [canvasPan, setCanvasPan] = useState({ x: 0, y: 0 });
  const [canvasScale, setCanvasScale] = useState(1);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [liveActivity, setLiveActivity] = useState([]);

  const value = useMemo(
    () => ({
      activePage,
      setActivePage,
      isCommandOpen,
      setCommandOpen,
      isExportOpen,
      setExportOpen,
      canvasPan,
      setCanvasPan,
      canvasScale,
      setCanvasScale,
      mouse,
      setMouse,
      liveActivity,
      setLiveActivity,
    }),
    [activePage, isCommandOpen, isExportOpen, canvasPan, canvasScale, mouse, liveActivity]
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
};

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) throw new Error("useUI must be used inside UIProvider");
  return context;
};

