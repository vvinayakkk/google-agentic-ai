import { createContext, useCallback, useContext, useMemo, useState } from "react";

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const push = useCallback((message, tone = "info") => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, tone }].slice(-3));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-8 right-16 z-[130] space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="min-w-72 rounded-xl p-3 text-xs"
            style={{
              border: "1px solid var(--soft)",
              color: "var(--text)",
              borderLeft: `3px solid ${toast.tone === "error" ? "#F87171" : toast.tone === "success" ? "#4ADE80" : "#60A5FA"}`,
              backgroundColor:
                toast.tone === "error"
                  ? "rgba(248,113,113,0.08)"
                  : toast.tone === "success"
                    ? "rgba(74,222,128,0.08)"
                    : "rgba(96,165,250,0.08)",
            }}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
};

