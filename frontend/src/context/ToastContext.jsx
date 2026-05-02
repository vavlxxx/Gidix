import React from "react";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";

const ToastContext = React.createContext(null);

export function ToastProvider({ children }) {
  const [items, setItems] = React.useState([]);

  const push = React.useCallback((tone, text) => {
    const id = crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
    setItems((prev) => [...prev, { id, tone, text }]);
    window.setTimeout(() => setItems((prev) => prev.filter((item) => item.id !== id)), 5200);
  }, []);

  const value = React.useMemo(() => ({
    success: (text) => push("success", text),
    error: (text) => push("error", readableError(text)),
    info: (text) => push("info", text)
  }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {items.map((item) => (
          <div className={`toast toast--${item.tone}`} key={item.id}>
            {item.tone === "success" && <CheckCircle2 size={18} aria-hidden />}
            {item.tone === "error" && <XCircle size={18} aria-hidden />}
            {item.tone === "info" && <Info size={18} aria-hidden />}
            <span>{item.text}</span>
            <button type="button" aria-label="Закрыть уведомление" onClick={() => setItems((prev) => prev.filter((toast) => toast.id !== item.id))}>
              <X size={14} aria-hidden />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return React.useContext(ToastContext);
}

function readableError(text) {
  if (!text) return "Не удалось выполнить действие. Попробуйте ещё раз.";
  return String(text).replace(/^Error:\s*/i, "");
}
