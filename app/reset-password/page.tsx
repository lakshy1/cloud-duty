"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../lib/supabase/client";
import { useTheme } from "../theme-provider";

export default function ResetPasswordPage() {
  const { theme, toggleTheme } = useTheme();
  const supabase = getSupabaseBrowserClient();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const loadSession = async () => {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        setError(sessionError.message);
        return;
      }
      if (!data.session) {
        setError("Open the reset link from your email to continue.");
        return;
      }
      setReady(true);
    };
    loadSession();
  }, [supabase]);

  const handleReset = async () => {
    if (!password || !confirm) {
      setError("Please enter and confirm your new password.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });
    setLoading(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setMessage("Password updated. You can now sign in.");
  };

  return (
    <div className="auth-page">
      <div className="auth-shell is-login">
        <section className="auth-panel auth-panel--slide">
          <div className="auth-slide-glow" />
          <div className="auth-slide-inner">
            <p className="auth-brand">CloudDuty</p>
            <h1 className="auth-slide-title">Reset your password.</h1>
            <p className="auth-slide-text">
              Choose a new password to secure your workspace.
            </p>
            <a className="auth-ghost" href="/login">
              Back to login
            </a>
          </div>
        </section>

        <section className="auth-panel auth-panel--form">
          <div className="auth-form-head">
            <div className="auth-head-row">
              <div>
                <p className="auth-kicker">Reset password</p>
                <h2 className="auth-title">Set a new password</h2>
              </div>
              <button
                className={`theme-slider auth-theme${theme === "obsidian" ? " on" : ""}`}
                type="button"
                role="switch"
                aria-checked={theme === "obsidian"}
                aria-label="Toggle theme"
                onClick={toggleTheme}
              >
                <span className="theme-track" />
                <span className="theme-thumb">
                  <span className="theme-glyph sun" aria-hidden="true" />
                  <span className="theme-glyph moon" aria-hidden="true" />
                </span>
              </button>
            </div>
          </div>

          <form
            className="auth-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (ready) handleReset();
            }}
          >
            <label className="auth-label">
              New password
              <input
                className="auth-input"
                type="password"
                placeholder="Create a strong password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                disabled={!ready}
              />
            </label>
            <label className="auth-label">
              Confirm password
              <input
                className="auth-input"
                type="password"
                placeholder="Re-enter password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                required
                disabled={!ready}
              />
            </label>

            {message ? <p className="auth-message">{message}</p> : null}
            {error ? <p className="auth-error">{error}</p> : null}

            <button className="auth-primary" type="submit" disabled={loading || !ready}>
              {loading ? "Saving..." : "Update password"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
