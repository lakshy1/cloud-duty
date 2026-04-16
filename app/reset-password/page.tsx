"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../lib/supabase/client";

export default function ResetPasswordPage() {
  const supabase = getSupabaseBrowserClient();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const loadSession = async () => {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) { setError(sessionError.message); return; }
      if (!data.session) { setError("Open the reset link from your email or verify your phone first."); return; }
      setReady(true);
    };
    loadSession();
  }, [supabase]);

  const handleReset = async () => {
    if (!password || !confirm) { setError("Please enter and confirm your new password."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setLoading(true); setError(null); setMessage(null);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) { setError(updateError.message); return; }
    setMessage("Password updated. Redirecting…");
    setTimeout(() => { window.location.href = "/"; }, 1500);
  };

  return (
    <div className="auth-page av2-page">
      <div className="av2-card">
        <div className="av2-logo">
          <Image src="/logo.png" alt="Cloudduty" width={36} height={36} style={{ background: "transparent" }} />
          <span className="av2-logo-name">Cloudduty</span>
        </div>

        <h1 className="av2-title">Set a new password</h1>

        <form
          className="auth-form av2-form"
          onSubmit={(e) => { e.preventDefault(); if (ready) handleReset(); }}
        >
          <label className="auth-label">
            New password
            <div className="auth-input-wrap">
              <input
                className="auth-input"
                type={showPw ? "text" : "password"}
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={!ready}
              />
              <button
                type="button"
                className={`auth-eye${showPw ? " active" : ""}`}
                aria-label={showPw ? "Hide password" : "Show password"}
                onClick={() => setShowPw((p) => !p)}
                disabled={!ready}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  {showPw ? (
                    <>
                      <path d="M1.5 12S5.3 5.5 12 5.5 22.5 12 22.5 12 18.7 18.5 12 18.5 1.5 12 1.5 12Z" />
                      <circle cx="12" cy="12" r="3.25" />
                    </>
                  ) : (
                    <>
                      <path d="M3 3l18 18" />
                      <path d="M10.7 6.2A9.8 9.8 0 0 1 12 6.1c6.6 0 10.5 5.9 10.5 5.9a18.4 18.4 0 0 1-4 4.5" />
                      <path d="M6.2 7.3A18.1 18.1 0 0 0 1.5 12s3.8 6.5 10.5 6.5c1.2 0 2.3-.2 3.3-.5" />
                      <path d="M9.9 10A3.2 3.2 0 0 0 14 14.1" />
                    </>
                  )}
                </svg>
              </button>
            </div>
          </label>

          <label className="auth-label">
            Confirm new password
            <input
              className="auth-input"
              type="password"
              placeholder="Re-enter password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              disabled={!ready}
            />
          </label>

          {message && <p className="auth-message">{message}</p>}
          {error && <p className="auth-error">{error}</p>}

          <button className="auth-primary" type="submit" disabled={loading || !ready}>
            {loading ? "Saving…" : "Update password"}
          </button>

          <p className="av2-switch">
            <a className="auth-hint-link" href="/auth?mode=login">Back to log in</a>
          </p>
        </form>
      </div>
    </div>
  );
}
