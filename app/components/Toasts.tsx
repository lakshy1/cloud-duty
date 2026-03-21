"use client";

import { useEffect } from "react";
import { useUIState } from "../state/ui-state";

const AUTO_CLOSE_MS = 3200;

export function Toasts() {
  const { toasts, removeToast } = useUIState();

  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map((toast) =>
      window.setTimeout(() => removeToast(toast.id), AUTO_CLOSE_MS)
    );
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [removeToast, toasts]);

  return (
    <div className="toast-stack" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.tone ?? "info"}`}>
          <span>{toast.message}</span>
          <button
            className="toast-close"
            type="button"
            aria-label="Dismiss"
            onClick={() => removeToast(toast.id)}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
