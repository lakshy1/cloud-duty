"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useUIState } from "../state/ui-state";

const AUTO_CLOSE_MS = 3000;
const EXIT_MS = 420;

export function Toasts() {
  const { toasts, removeToast } = useUIState();
  const [closing, setClosing] = useState<Set<string>>(new Set());
  const exitTimers = useRef<Map<string, number>>(new Map());
  const toastRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const resolveExitTarget = useCallback((target?: string) => {
    const isMobile = window.matchMedia("(max-width: 580px)").matches;
    if (target === "inbox") {
      if (isMobile) {
        return document.querySelector(".topbar-inbox") as HTMLElement | null;
      }
      return document.querySelector('.sb-btn[aria-label="Inbox"]') as HTMLElement | null;
    }
    if (isMobile) {
      return document.querySelector(".topbar-bell") as HTMLElement | null;
    }
    return document.querySelector('.sb-btn[aria-label="Notifications"]') as HTMLElement | null;
  }, []);

  const startClose = useCallback(
    (id: string, target?: string) => {
      if (closing.has(id)) return;
      const toastEl = toastRefs.current.get(id);
      const targetEl = resolveExitTarget(target);
      if (toastEl && targetEl) {
        const toastRect = toastEl.getBoundingClientRect();
        const targetRect = targetEl.getBoundingClientRect();
        const dx = targetRect.left + targetRect.width / 2 - (toastRect.left + toastRect.width / 2);
        const dy = targetRect.top + targetRect.height / 2 - (toastRect.top + toastRect.height / 2);
        toastEl.style.setProperty("--toast-exit-x", `${dx}px`);
        toastEl.style.setProperty("--toast-exit-y", `${dy}px`);
      }
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
    [closing, removeToast, resolveExitTarget]
  );

  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map((toast) =>
      window.setTimeout(() => startClose(toast.id, toast.target), AUTO_CLOSE_MS)
    );
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
          ref={(node) => {
            if (node) toastRefs.current.set(toast.id, node);
            else toastRefs.current.delete(toast.id);
          }}
          className={`toast toast-${toast.tone ?? "info"}${toast.target ? ` toast-${toast.target}` : ""}${
            closing.has(toast.id) ? " closing" : ""
          }`}
          data-target={toast.target ?? "notifications"}
        >
          <div className="toast-text">
            {toast.title ? <div className="toast-title">{toast.title}</div> : null}
            <div className="toast-message">{toast.message}</div>
            {toast.detail ? <div className="toast-detail">{toast.detail}</div> : null}
          </div>
          <button
            className="toast-close"
            type="button"
            aria-label="Dismiss"
            onClick={() => startClose(toast.id, toast.target)}
          >
            x
          </button>
        </div>
      ))}
    </div>
  );
}

