"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { Icon } from "./Icon";

type LoginPromptModalProps = {
  open: boolean;
  onClose: () => void;
};

export function LoginPromptModal({ open, onClose }: LoginPromptModalProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="login-prompt-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Login required">
      <div
        className="login-prompt-panel"
        ref={panelRef}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="login-prompt-close" type="button" aria-label="Close" onClick={onClose}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>

        <div className="login-prompt-icon">
          <Image src="/logo.png" alt="Cloudduty logo" width={48} height={48} placeholder="empty" style={{ background: "transparent" }} />
        </div>

        <h2 className="login-prompt-title">Login required</h2>
        <p className="login-prompt-body">
          Log in to access all features including Search, Inbox, Create, My Posts, and Notifications.
        </p>

        <a className="login-prompt-btn" href="/auth?mode=login">
          Log In
        </a>
        <a className="login-prompt-link" href="/auth?mode=signup">
          Don&apos;t have an account? Sign up
        </a>
      </div>
    </div>
  );
}
