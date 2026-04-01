"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useUIState } from "../state/ui-state";

const AUTO_CLOSE_MS = 3000;
const EXIT_MS = 420;

export function Toasts() {
  const { toasts, removeToast } = useUIState();
  const [closing, setClosing] = useState<Set<string>>(new Set());
  const exitTimers = useRef<Map<string, number>>(new Map());

  const startClose = useCallback(
    (id: string) => {
      if (closing.has(id)) return;
      setClosing((prev) => new Set(prev).add(id));
      const timer = window.setTimeout(() => {
        removeToast(id);
        setClosing((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        exitTimers.current.delete(id);
      }, EXIT_MS);
      exitTimers.current.set(id, timer);
    },
    [closing, removeToast]
  );

  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map((toast) => window.setTimeout(() => startClose(toast.id), AUTO_CLOSE_MS));
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [startClose, toasts]);

  useEffect(() => {
    return () => {
      exitTimers.current.forEach((timer) => window.clearTimeout(timer));
      exitTimers.current.clear();
    };
  }, []);

  return (
    <div className="toast-stack" aria-live="polite">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast toast-${toast.tone ?? "info"}${closing.has(toast.id) ? " closing" : ""}`}
        >
          <span>{toast.message}</span>
          <button
            className="toast-close"
            type="button"
            aria-label="Dismiss"
            onClick={() => startClose(toast.id)}
          >
            x
          </button>
        </div>
      ))}
    </div>
  );
}
