import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { PAGE_KEYS } from "../utils/constants";

const UIContext = createContext(null);

export const UIProvider = ({ children }) => {
  const [activePage, setActivePage] = useState(PAGE_KEYS.DATABASE);
  const [theme, setTheme] = useState(() => {
    const saved = window.localStorage.getItem("admin-theme");
    return saved === "light" || saved === "dark" ? saved : "dark";
  });
  const [isCommandOpen, setCommandOpen] = useState(false);
  const [isExportOpen, setExportOpen] = useState(false);
  const [canvasPan, setCanvasPan] = useState({ x: 0, y: 0 });
  const [canvasScale, setCanvasScale] = useState(1);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [liveActivity, setLiveActivity] = useState([]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.body.setAttribute("data-theme", theme);
    window.localStorage.setItem("admin-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    document.documentElement.classList.add("theme-switching");
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        document.documentElement.classList.remove("theme-switching");
      });
    });
  };

  const value = useMemo(
    () => ({
      activePage,
      setActivePage,
      theme,
      setTheme,
      toggleTheme,
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
    [activePage, theme, isCommandOpen, isExportOpen, canvasPan, canvasScale, mouse, liveActivity]
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
};

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) throw new Error("useUI must be used inside UIProvider");
  return context;
};

