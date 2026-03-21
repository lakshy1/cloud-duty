"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Provider, User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "../lib/supabase/client";
import { useTheme } from "../theme-provider";

type AuthMode = "login" | "signup";
type LoginMode = "password" | "phone";

const providers: Array<{ label: string; provider: Provider; icon: "google" | "linkedin" | "apple" }> = [
  { label: "Google", provider: "google", icon: "google" },
  { label: "LinkedIn", provider: "linkedin_oidc", icon: "linkedin" },
  { label: "Apple", provider: "apple", icon: "apple" },
];

const passwordRules = [
  {
    id: "length",
    label: "At least 10 characters",
    test: (value: string) => value.length >= 10,
  },
  {
    id: "upper",
    label: "One uppercase letter",
    test: (value: string) => /[A-Z]/.test(value),
  },
  {
    id: "lower",
    label: "One lowercase letter",
    test: (value: string) => /[a-z]/.test(value),
  },
  {
    id: "number",
    label: "One number",
    test: (value: string) => /\d/.test(value),
  },
  {
    id: "symbol",
    label: "One symbol",
    test: (value: string) => /[^A-Za-z0-9]/.test(value),
  },
];

export default function AuthClient() {
  const { theme, toggleTheme, mounted } = useTheme();
  const searchParams = useSearchParams();
  const supabase = getSupabaseBrowserClient();
  const redirectBase =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (typeof window !== "undefined" ? window.location.origin : "");
  const paramMode = searchParams?.get("mode") === "signup" ? "signup" : "login";
  const [authMode, setAuthMode] = useState<AuthMode>(paramMode);

  useEffect(() => {
    setAuthMode(paramMode);
  }, [paramMode]);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    html.style.overflow = "auto";
    body.style.overflow = "auto";
    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
    };
  }, []);

  const [loginMode, setLoginMode] = useState<LoginMode>("password");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginPhone, setLoginPhone] = useState("");
  const [loginOtp, setLoginOtp] = useState("");
  const [loginOtpSent, setLoginOtpSent] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginMessage, setLoginMessage] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showReset, setShowReset] = useState(false);

  const canSubmitPassword = useMemo(
    () => loginEmail && loginPassword,
    [loginEmail, loginPassword]
  );

  const handleOAuthLogin = async (provider: Provider) => {
    setLoginError(null);
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${redirectBase}/auth/callback?next=/auth?mode=login`,
      },
    });
  };

  const handlePasswordLogin = async () => {
    if (!canSubmitPassword) return;
    setLoginLoading(true);
    setLoginError(null);
    setLoginMessage(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });
    setLoginLoading(false);
    if (signInError) {
      setLoginError(signInError.message);
      return;
    }
    setLoginMessage("Signed in successfully. Redirecting...");
    window.location.href = "/";
  };

  const handlePasswordReset = async () => {
    if (!loginEmail) {
      setLoginError("Enter your account email to receive a reset link.");
      return;
    }
    setLoginLoading(true);
    setLoginError(null);
    setLoginMessage(null);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      loginEmail,
      {
        redirectTo: `${redirectBase}/auth/callback?next=/reset-password`,
      }
    );
    setLoginLoading(false);
    if (resetError) {
      // Handle rate limit errors specifically
      if (resetError.message.toLowerCase().includes('rate limit') ||
          resetError.message.toLowerCase().includes('too many requests')) {
        setLoginError("Too many password reset attempts. Please wait a few minutes before trying again.");
      } else {
        setLoginError(resetError.message);
      }
      return;
    }
    setShowReset(false);
    setLoginMessage("Password reset link sent. Check your inbox.");
  };

  const handleSendOtp = async () => {
    if (!loginPhone) return;
    setLoginLoading(true);
    setLoginError(null);
    setLoginMessage(null);
    const { error: otpError } = await supabase.auth.signInWithOtp({
      phone: loginPhone,
      options: { shouldCreateUser: false },
    });
    setLoginLoading(false);
    if (otpError) {
      setLoginError(otpError.message);
      return;
    }
    setLoginOtpSent(true);
    setLoginMessage("SMS code sent. Enter it below to continue.");
  };

  const handleVerifyOtp = async () => {
    if (!loginPhone || !loginOtp) return;
    setLoginLoading(true);
    setLoginError(null);
    setLoginMessage(null);
    const { error: verifyError } = await supabase.auth.verifyOtp({
      phone: loginPhone,
      token: loginOtp,
      type: "sms",
    });
    setLoginLoading(false);
    if (verifyError) {
      setLoginError(verifyError.message);
      return;
    }
    setLoginMessage("Signed in successfully. Redirecting...");
    window.location.href = "/";
  };

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupMessage, setSignupMessage] = useState<string | null>(null);
  const [signupError, setSignupError] = useState<string | null>(null);

  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [profileFirstName, setProfileFirstName] = useState("");
  const [profileLastName, setProfileLastName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      const meta = data.user.user_metadata ?? {};
      const needsProfile = !meta.first_name || !meta.last_name || !meta.phone;
      if (needsProfile) {
        setProfileUser(data.user);
        setProfileFirstName(meta.first_name ?? "");
        setProfileLastName(meta.last_name ?? "");
        setProfilePhone(meta.phone ?? "");
      }
    };
    loadUser();
  }, [supabase]);

  const passwordStatus = useMemo(
    () =>
      passwordRules.map((rule) => ({
        ...rule,
        met: rule.test(signupPassword),
      })),
    [signupPassword]
  );
  const isPasswordStrong = passwordStatus.every((rule) => rule.met);

  const handleOAuthSignup = async (provider: Provider) => {
    setSignupError(null);
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${redirectBase}/auth/callback?next=/auth?mode=signup`,
      },
    });
  };

  const handleSignup = async () => {
    if (!firstName || !lastName || !signupEmail || !signupPhone) {
      setSignupError("Please fill in all required fields.");
      return;
    }
    if (!isPasswordStrong) {
      setSignupError("Please create a stronger password.");
      return;
    }
    setSignupLoading(true);
    setSignupError(null);
    setSignupMessage(null);
    const { error: signUpError } = await supabase.auth.signUp({
      email: signupEmail,
      password: signupPassword,
      options: {
        emailRedirectTo: `${redirectBase}/auth/callback?next=/auth?mode=signup`,
        data: {
          first_name: firstName,
          last_name: lastName,
          phone: signupPhone,
          provider: "email",
        },
      },
    });
    setSignupLoading(false);
    if (signUpError) {
      // Handle rate limit errors specifically
      if (signUpError.message.toLowerCase().includes('rate limit') ||
          signUpError.message.toLowerCase().includes('too many requests')) {
        setSignupError("Too many signup attempts. Please wait a few minutes before trying again.");
      } else {
        setSignupError(signUpError.message);
      }
      return;
    }
    setSignupMessage("Check your email to confirm your account, then sign in.");
  };

  const handleCompleteProfile = async () => {
    if (!profileUser) return;
    setSignupLoading(true);
    setSignupError(null);
    setSignupMessage(null);
    const provider = profileUser.app_metadata?.provider ?? "oauth";
    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        first_name: profileFirstName,
        last_name: profileLastName,
        phone: profilePhone,
        provider,
      },
    });
    setSignupLoading(false);
    if (updateError) {
      setSignupError(updateError.message);
      return;
    }
    setProfileUser(null);
    setSignupMessage("Profile completed. Redirecting...");
    window.location.href = "/";
  };

  return (
    <div className="auth-page auth-page--duo">
      <div className={`auth-dual ${authMode === "signup" ? "is-signup" : "is-login"}`}>
        <section className="auth-dual__panel auth-dual__panel--signin">
          <div className="auth-dual__panel-inner">
            <div className="auth-form-head">
              <div className="auth-head-row">
                <div>
                  <h2 className="auth-title">Login</h2>
                </div>
                <button
                  className={`theme-slider auth-theme${mounted && theme === "obsidian" ? " on" : ""}`}
                  type="button"
                  role="switch"
                  aria-checked={mounted && theme === "obsidian"}
                  aria-label="Toggle theme"
                  suppressHydrationWarning
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

            <div className="auth-socials auth-socials--pro">
              {providers.map(({ label, provider, icon }) => (
                <button
                  key={provider}
                  className={`auth-social auth-social--${label.toLowerCase()}`}
                  type="button"
                  aria-label={`Continue with ${label}`}
                  onClick={() => handleOAuthLogin(provider)}
                >
                  <span className="auth-social-icon">
                    {icon === "google" ? (
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          d="M12.24 10.285v3.43h5.01c-.2 1.29-1.51 3.78-5.01 3.78-3.01 0-5.47-2.49-5.47-5.56 0-3.07 2.46-5.56 5.47-5.56 1.71 0 2.86.73 3.52 1.36l2.39-2.3C16.7 3.6 14.7 2.5 12.24 2.5 7.96 2.5 4.5 5.98 4.5 10.25c0 4.27 3.46 7.75 7.74 7.75 4.47 0 7.43-3.14 7.43-7.56 0-.51-.06-.9-.12-1.29H12.24z"
                          fill="currentColor"
                        />
                      </svg>
                    ) : icon === "linkedin" ? (
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          d="M6.94 8.5H4.2v11h2.74v-11zM5.57 7.4A1.59 1.59 0 1 0 5.57 4.2a1.59 1.59 0 0 0 0 3.2zM20.5 13.2c0-3.3-1.77-4.84-4.14-4.84-1.9 0-2.75 1.04-3.22 1.77V8.5H10.4c.04 1.07 0 11 0 11h2.74v-6.14c0-.33.02-.66.12-.9.26-.66.86-1.34 1.86-1.34 1.31 0 1.84 1 1.84 2.46v5.92h2.74v-6.3z"
                          fill="currentColor"
                        />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          d="M17.56 12.38c-.03-2.08 1.7-3.07 1.78-3.12-0.97-1.42-2.48-1.61-3.01-1.63-1.28-.13-2.5.75-3.15.75-.65 0-1.66-.73-2.73-.71-1.4.02-2.7.82-3.42 2.08-1.46 2.52-.37 6.27 1.05 8.31.7.99 1.53 2.1 2.62 2.06 1.05-.04 1.45-.68 2.72-.68 1.27 0 1.63.68 2.73.66 1.13-.02 1.84-1.02 2.54-2.01.8-1.17 1.13-2.31 1.15-2.36-.02-.01-2.22-.85-2.24-3.35zM15.5 6.6c.58-.7.97-1.67.86-2.65-.83.03-1.83.55-2.43 1.25-.54.62-.99 1.61-.87 2.56.92.07 1.86-.47 2.44-1.16z"
                          fill="currentColor"
                        />
                      </svg>
                    )}
                  </span>
                </button>
              ))}
            </div>

            <div className="auth-divider auth-divider--pro">OR</div>

            <div className="auth-tabs">
              <button
                className={`auth-tab${loginMode === "password" ? " active" : ""}`}
                type="button"
                onClick={() => setLoginMode("password")}
              >
                Email
              </button>
              <button
                className={`auth-tab${loginMode === "phone" ? " active" : ""}`}
                type="button"
                onClick={() => setLoginMode("phone")}
              >
                Phone
              </button>
            </div>

            <form
              className="auth-form"
              onSubmit={(event) => {
                event.preventDefault();
                if (loginMode === "password") {
                  handlePasswordLogin();
                } else if (loginOtpSent) {
                  handleVerifyOtp();
                } else {
                  handleSendOtp();
                }
              }}
            >
              {loginMode === "password" ? (
                <>
                  <label className="auth-label">
                    Email address
                    <input
                      className="auth-input"
                      type="email"
                      placeholder="you@company.com"
                      value={loginEmail}
                      onChange={(event) => setLoginEmail(event.target.value)}
                      required
                    />
                  </label>
                  <label className="auth-label">
                    Password
                    <input
                      className="auth-input"
                      type="password"
                      placeholder="Enter your password"
                      value={loginPassword}
                      onChange={(event) => setLoginPassword(event.target.value)}
                      required
                    />
                  </label>
                  <div className="auth-row">
                    <button
                      className="auth-link"
                      type="button"
                      onClick={() => {
                        setShowReset((prev) => !prev);
                        setLoginMessage(null);
                        setLoginError(null);
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
                        disabled={loginLoading}
                      >
                        {loginLoading ? "Sending..." : "Send reset link"}
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
                      value={loginPhone}
                      onChange={(event) => setLoginPhone(event.target.value)}
                      required
                    />
                  </label>
                  {loginOtpSent ? (
                    <label className="auth-label">
                      Verification code
                      <input
                        className="auth-input"
                        type="text"
                        placeholder="6-digit code"
                        value={loginOtp}
                        onChange={(event) => setLoginOtp(event.target.value)}
                        required
                      />
                    </label>
                  ) : null}
                  <div className="auth-row">
                    <button
                      className="auth-link"
                      type="button"
                      onClick={() => {
                        setLoginOtpSent(false);
                        setLoginOtp("");
                      }}
                    >
                      Use email instead
                    </button>
                    {loginOtpSent ? (
                      <button className="auth-link" type="button" onClick={handleSendOtp}>
                        Resend code
                      </button>
                    ) : null}
                  </div>
                </>
              )}

              {loginMessage ? <p className="auth-message">{loginMessage}</p> : null}
              {loginError ? <p className="auth-error">{loginError}</p> : null}

              <button className="auth-primary" type="submit" disabled={loginLoading}>
                {loginLoading
                  ? "Working..."
                  : loginMode === "password"
                    ? "Sign in"
                    : loginOtpSent
                      ? "Verify & Sign in"
                      : "Send code"}
              </button>
            </form>

            <p className="auth-hint">
              By continuing you agree to CloudDuty&apos;s Terms of Service and Privacy Policy.
            </p>
          </div>
        </section>

        <section className="auth-dual__panel auth-dual__panel--signup">
          <div className="auth-dual__panel-inner">
            <div className="auth-form-head">
              <div className="auth-head-row">
                <div>
                  <h2 className="auth-title">Signup</h2>
                </div>
                <button
                  className={`theme-slider auth-theme${mounted && theme === "obsidian" ? " on" : ""}`}
                  type="button"
                  role="switch"
                  aria-checked={mounted && theme === "obsidian"}
                  aria-label="Toggle theme"
                  suppressHydrationWarning
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

            <div className="auth-socials auth-socials--pro">
              {providers.map(({ label, provider, icon }) => (
                <button
                  key={provider}
                  className={`auth-social auth-social--${label.toLowerCase()}`}
                  type="button"
                  aria-label={`Continue with ${label}`}
                  onClick={() => handleOAuthSignup(provider)}
                >
                  <span className="auth-social-icon">
                    {icon === "google" ? (
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          d="M12.24 10.285v3.43h5.01c-.2 1.29-1.51 3.78-5.01 3.78-3.01 0-5.47-2.49-5.47-5.56 0-3.07 2.46-5.56 5.47-5.56 1.71 0 2.86.73 3.52 1.36l2.39-2.3C16.7 3.6 14.7 2.5 12.24 2.5 7.96 2.5 4.5 5.98 4.5 10.25c0 4.27 3.46 7.75 7.74 7.75 4.47 0 7.43-3.14 7.43-7.56 0-.51-.06-.9-.12-1.29H12.24z"
                          fill="currentColor"
                        />
                      </svg>
                    ) : icon === "linkedin" ? (
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          d="M6.94 8.5H4.2v11h2.74v-11zM5.57 7.4A1.59 1.59 0 1 0 5.57 4.2a1.59 1.59 0 0 0 0 3.2zM20.5 13.2c0-3.3-1.77-4.84-4.14-4.84-1.9 0-2.75 1.04-3.22 1.77V8.5H10.4c.04 1.07 0 11 0 11h2.74v-6.14c0-.33.02-.66.12-.9.26-.66.86-1.34 1.86-1.34 1.31 0 1.84 1 1.84 2.46v5.92h2.74v-6.3z"
                          fill="currentColor"
                        />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          d="M17.56 12.38c-.03-2.08 1.7-3.07 1.78-3.12-0.97-1.42-2.48-1.61-3.01-1.63-1.28-.13-2.5.75-3.15.75-.65 0-1.66-.73-2.73-.71-1.4.02-2.7.82-3.42 2.08-1.46 2.52-.37 6.27 1.05 8.31.7.99 1.53 2.1 2.62 2.06 1.05-.04 1.45-.68 2.72-.68 1.27 0 1.63.68 2.73.66 1.13-.02 1.84-1.02 2.54-2.01.8-1.17 1.13-2.31 1.15-2.36-.02-.01-2.22-.85-2.24-3.35zM15.5 6.6c.58-.7.97-1.67.86-2.65-.83.03-1.83.55-2.43 1.25-.54.62-.99 1.61-.87 2.56.92.07 1.86-.47 2.44-1.16z"
                          fill="currentColor"
                        />
                      </svg>
                    )}
                  </span>
                </button>
              ))}
            </div>

            <div className="auth-divider auth-divider--pro">OR</div>

            {profileUser ? (
              <form
                className="auth-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  handleCompleteProfile();
                }}
              >
                <div className="auth-grid">
                  <label className="auth-label">
                    First name
                    <input
                      className="auth-input"
                      type="text"
                      value={profileFirstName}
                      onChange={(event) => setProfileFirstName(event.target.value)}
                      required
                    />
                  </label>
                  <label className="auth-label">
                    Last name
                    <input
                      className="auth-input"
                      type="text"
                      value={profileLastName}
                      onChange={(event) => setProfileLastName(event.target.value)}
                      required
                    />
                  </label>
                </div>
                <label className="auth-label">
                  US phone number
                  <input
                    className="auth-input"
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    value={profilePhone}
                    onChange={(event) => setProfilePhone(event.target.value)}
                    required
                  />
                </label>

                <button className="auth-primary" type="submit" disabled={signupLoading}>
                  {signupLoading ? "Saving..." : "Finish setup"}
                </button>
              </form>
            ) : (
              <form
                className="auth-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  handleSignup();
                }}
              >
                <div className="auth-grid">
                  <label className="auth-label">
                    First name
                    <input
                      className="auth-input"
                      type="text"
                      placeholder="Jane"
                      value={firstName}
                      onChange={(event) => setFirstName(event.target.value)}
                      required
                    />
                  </label>
                  <label className="auth-label">
                    Last name
                    <input
                      className="auth-input"
                      type="text"
                      placeholder="Doe"
                      value={lastName}
                      onChange={(event) => setLastName(event.target.value)}
                      required
                    />
                  </label>
                </div>
                <label className="auth-label">
                  Email address
                  <input
                    className="auth-input"
                    type="email"
                    placeholder="you@company.com"
                    value={signupEmail}
                    onChange={(event) => setSignupEmail(event.target.value)}
                    required
                  />
                </label>
                <label className="auth-label">
                  US phone number
                  <input
                    className="auth-input"
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    value={signupPhone}
                    onChange={(event) => setSignupPhone(event.target.value)}
                    required
                  />
                </label>
                <label className="auth-label">
                  Password
                  <input
                    className="auth-input"
                    type="password"
                    placeholder="Create a strong password"
                    value={signupPassword}
                    onChange={(event) => setSignupPassword(event.target.value)}
                    required
                  />
                </label>
                <button className="auth-primary" type="submit" disabled={signupLoading}>
                  {signupLoading ? "Creating..." : "Create account"}
                </button>
              </form>
            )}

            {signupMessage ? <p className="auth-message">{signupMessage}</p> : null}
            {signupError ? <p className="auth-error">{signupError}</p> : null}

            <p className="auth-hint">
              By continuing you agree to CloudDuty&apos;s Terms of Service and Privacy Policy.
            </p>
          </div>
        </section>

        <div className="auth-dual__overlay">
          <div className="auth-dual__overlay-inner">
            <div className="auth-dual__overlay-panel auth-dual__overlay-left">
              <p className="auth-brand">CloudDuty</p>
              <h2 className="auth-slide-title">Welcome back.</h2>
              <p className="auth-slide-text">To keep connected, sign in with your personal info.</p>
              <button
                className="auth-ghost"
                type="button"
                onClick={() => setAuthMode("login")}
              >
                Sign in
              </button>
            </div>
            <div className="auth-dual__overlay-panel auth-dual__overlay-right">
              <p className="auth-brand">CloudDuty</p>
              <h2 className="auth-slide-title">Start your workspace.</h2>
              <p className="auth-slide-text">Create your account and launch in minutes.</p>
              <button
                className="auth-ghost"
                type="button"
                onClick={() => setAuthMode("signup")}
              >
                Create account
              </button>
            </div>
          </div>
        </div>

        <div className="auth-dual__switch">
          <button
            className={`auth-tab${authMode === "login" ? " active" : ""}`}
            type="button"
            onClick={() => setAuthMode("login")}
          >
            Sign in
          </button>
          <button
            className={`auth-tab${authMode === "signup" ? " active" : ""}`}
            type="button"
            onClick={() => setAuthMode("signup")}
          >
            Create account
          </button>
        </div>
      </div>
    </div>
  );
}
