import React from "react";

export default function ToastStack({ toasts, onDismiss }) {
  return (
    <div className="toast-stack" role="region" aria-live="polite" aria-label="Уведомления">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast--${toast.type}`}>
          <div className="toast-body">
            {toast.title && <strong>{toast.title}</strong>}
            {toast.message && <span>{toast.message}</span>}
          </div>
          <button
            className="toast-close"
            type="button"
            aria-label="Закрыть уведомление"
            onClick={() => onDismiss(toast.id)}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
