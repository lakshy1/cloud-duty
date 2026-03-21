"use client";

import { useMemo, useState } from "react";
import { Icon } from "../components/Icon";
import { getSupabaseBrowserClient } from "../lib/supabase/client";
import { useTheme } from "../theme-provider";

type LoginMode = "password" | "phone";

const providers = [
  { label: "Google", provider: "google", icon: "google" as const },
  { label: "LinkedIn", provider: "linkedin_oidc", icon: "linkedin" as const },
  { label: "Apple", provider: "apple", icon: "apple" as const },
];

export default function LoginPage() {
  const { theme, toggleTheme } = useTheme();
  const supabase = getSupabaseBrowserClient();

  const [mode, setMode] = useState<LoginMode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showReset, setShowReset] = useState(false);

  const canSubmitPassword = useMemo(() => email && password, [email, password]);

  const handleOAuth = async (provider: string) => {
    setError(null);
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/login`,
      },
    });
  };

  const handlePasswordLogin = async () => {
    if (!canSubmitPassword) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    setMessage("Signed in successfully. Redirecting...");
    window.location.href = "/";
  };

  const handlePasswordReset = async () => {
    if (!email) {
      setError("Enter your account email to receive a reset link.");
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      }
    );
    setLoading(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setShowReset(false);
    setMessage("Password reset link sent. Check your inbox.");
  };

  const handleSendOtp = async () => {
    if (!phone) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    const { error: otpError } = await supabase.auth.signInWithOtp({
      phone,
      options: { shouldCreateUser: false },
    });
    setLoading(false);
    if (otpError) {
      setError(otpError.message);
      return;
    }
    setOtpSent(true);
    setMessage("SMS code sent. Enter it below to continue.");
  };

  const handleVerifyOtp = async () => {
    if (!phone || !otp) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    const { error: verifyError } = await supabase.auth.verifyOtp({
      phone,
      token: otp,
      type: "sms",
    });
    setLoading(false);
    if (verifyError) {
      setError(verifyError.message);
      return;
    }
    setMessage("Signed in successfully. Redirecting...");
    window.location.href = "/";
  };

  return (
    <div className="auth-page">
      <div className="auth-shell is-login">
        <section className="auth-panel auth-panel--slide">
          <div className="auth-slide-glow" />
          <div className="auth-slide-inner">
            <p className="auth-brand">CloudDuty</p>
            <h1 className="auth-slide-title">Welcome back.</h1>
            <p className="auth-slide-text">
              Sign in to your secure cloud workspace.
            </p>
            <a className="auth-ghost" href="/signup">
              Create account
            </a>
          </div>
        </section>

        <section className="auth-panel auth-panel--form">
          <div className="auth-form-head">
            <div className="auth-head-row">
              <div>
                <p className="auth-kicker">Sign in</p>
                <h2 className="auth-title">Login to your workspace</h2>
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

          <div className="auth-socials">
            {providers.map(({ label, provider, icon }) => (
              <button
                key={provider}
                className={`auth-social auth-social--${label.toLowerCase()}`}
                type="button"
                aria-label={`Continue with ${label}`}
                onClick={() => handleOAuth(provider)}
              >
                <span className="auth-social-icon">
                  <Icon name={icon} />
                </span>
              </button>
            ))}
          </div>

          <div className="auth-divider">or continue with</div>

          <div className="auth-tabs">
            <button
              className={`auth-tab${mode === "password" ? " active" : ""}`}
              type="button"
              onClick={() => setMode("password")}
            >
              Email + Password
            </button>
            <button
              className={`auth-tab${mode === "phone" ? " active" : ""}`}
              type="button"
              onClick={() => setMode("phone")}
            >
              Phone + Code
            </button>
          </div>

          <form
            className="auth-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (mode === "password") {
                handlePasswordLogin();
              } else if (otpSent) {
                handleVerifyOtp();
              } else {
                handleSendOtp();
              }
            }}
          >
            {mode === "password" ? (
              <>
                <label className="auth-label">
                  Email address
                  <input
                    className="auth-input"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </label>
                <label className="auth-label">
                  Password
                  <input
                    className="auth-input"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                </label>
                <div className="auth-row">
                  <button
                    className="auth-link"
                    type="button"
                    onClick={() => {
                      setShowReset((prev) => !prev);
                      setMessage(null);
                      setError(null);
                    }}
                  >
                    Forgot password?
                  </button>
                </div>
                {showReset ? (
                  <div className="auth-row">
                    <button
                      className="auth-ghost"
                      type="button"
                      onClick={handlePasswordReset}
                      disabled={loading}
                    >
                      {loading ? "Sending..." : "Send reset link"}
                    </button>
                  </div>
                ) : null}
              </>
            ) : (
              <>
                <label className="auth-label">
                  US phone number
                  <input
                    className="auth-input"
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    required
                  />
                </label>
                {otpSent ? (
                  <label className="auth-label">
                    Verification code
                    <input
                      className="auth-input"
                      type="text"
                      placeholder="6-digit code"
                      value={otp}
                      onChange={(event) => setOtp(event.target.value)}
                      required
                    />
                  </label>
                ) : null}
                <div className="auth-row">
                  <button
                    className="auth-link"
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setOtp("");
                    }}
                  >
                    Use email instead
                  </button>
                  {otpSent ? (
                    <button className="auth-link" type="button" onClick={handleSendOtp}>
                      Resend code
                    </button>
                  ) : null}
                </div>
              </>
            )}

            {message ? <p className="auth-message">{message}</p> : null}
            {error ? <p className="auth-error">{error}</p> : null}

            <button className="auth-primary" type="submit" disabled={loading}>
              {loading
                ? "Working..."
                : mode === "password"
                  ? "Sign in"
                  : otpSent
                    ? "Verify & Sign in"
                    : "Send code"}
            </button>
          </form>

          <p className="auth-hint">
            By continuing you agree to CloudDuty&apos;s Terms of Service and Privacy Policy.
          </p>
        </section>
      </div>
    </div>
  );
}
