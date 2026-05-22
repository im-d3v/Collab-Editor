import { createContext, useCallback, useContext, useState } from "react";

const ToastContext = createContext();

const ICONS = {
  success: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  ),
  error: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  info: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  warning: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
};

const STYLES = {
  success: { bg: "#052e16", border: "#16a34a", color: "#4ade80" },
  error:   { bg: "#2d0707", border: "#dc2626", color: "#f87171" },
  info:    { bg: "#0c1a2e", border: "#2563eb", color: "#60a5fa" },
  warning: { bg: "#2d1a00", border: "#d97706", color: "#fbbf24" },
};

function ToastItem({ id, message, type, onRemove }) {
  const s = STYLES[type] || STYLES.info;
  return (
    <div
      onClick={() => onRemove(id)}
      style={{
        background: s.bg,
        border: `1px solid ${s.border}`,
        color: "#f1f1f4",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "12px 16px",
        borderRadius: "10px",
        minWidth: "260px",
        maxWidth: "360px",
        fontSize: "14px",
        cursor: "pointer",
        boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
        animation: "slideIn 0.2s ease",
      }}
    >
      <span style={{ color: s.color, flexShrink: 0 }}>{ICONS[type]}</span>
      <span style={{ flex: 1 }}>{message}</span>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "info", duration = 3500) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {toasts.length > 0 && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            zIndex: 9999,
          }}
        >
          {toasts.map((t) => (
            <ToastItem key={t.id} {...t} onRemove={removeToast} />
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
