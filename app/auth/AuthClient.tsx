"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Provider, User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "../lib/supabase/client";
import { PrivacyPolicyModal } from "../components/PrivacyPolicyModal";
import { TermsOfServiceModal } from "../components/TermsOfServiceModal";

type AuthMode = "login" | "signup";
type LoginMode = "password" | "phone";

const providers: Array<{ label: string; provider: Provider; icon: "google" | "linkedin" | "apple" }> = [
  { label: "Google", provider: "google", icon: "google" },
  { label: "LinkedIn", provider: "linkedin_oidc", icon: "linkedin" },
  { label: "Apple", provider: "apple", icon: "apple" },
];

const COUNTRY_CODES = [
  { code: "US", dial: "+1",   flag: "🇺🇸", name: "United States" },
  { code: "CA", dial: "+1",   flag: "🇨🇦", name: "Canada" },
  { code: "GB", dial: "+44",  flag: "🇬🇧", name: "United Kingdom" },
  { code: "AU", dial: "+61",  flag: "🇦🇺", name: "Australia" },
  { code: "IN", dial: "+91",  flag: "🇮🇳", name: "India" },
  { code: "DE", dial: "+49",  flag: "🇩🇪", name: "Germany" },
  { code: "FR", dial: "+33",  flag: "🇫🇷", name: "France" },
  { code: "JP", dial: "+81",  flag: "🇯🇵", name: "Japan" },
  { code: "BR", dial: "+55",  flag: "🇧🇷", name: "Brazil" },
  { code: "MX", dial: "+52",  flag: "🇲🇽", name: "Mexico" },
  { code: "AE", dial: "+971", flag: "🇦🇪", name: "UAE" },
  { code: "SG", dial: "+65",  flag: "🇸🇬", name: "Singapore" },
  { code: "KR", dial: "+82",  flag: "🇰🇷", name: "South Korea" },
  { code: "CN", dial: "+86",  flag: "🇨🇳", name: "China" },
  { code: "NL", dial: "+31",  flag: "🇳🇱", name: "Netherlands" },
  { code: "ES", dial: "+34",  flag: "🇪🇸", name: "Spain" },
  { code: "IT", dial: "+39",  flag: "🇮🇹", name: "Italy" },
  { code: "SE", dial: "+46",  flag: "🇸🇪", name: "Sweden" },
  { code: "ZA", dial: "+27",  flag: "🇿🇦", name: "South Africa" },
  { code: "AR", dial: "+54",  flag: "🇦🇷", name: "Argentina" },
];

const DIAL_MAP = new Map(COUNTRY_CODES.map((c) => [c.code, c.dial]));

function formatE164(countryCode: string, local: string): string {
  const dial = DIAL_MAP.get(countryCode) ?? "+1";
  const digits = local.replace(/\D/g, "").replace(/^0+/, "");
  return `${dial}${digits}`;
}

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

function PasswordEyeIcon({ visible }: { visible: boolean }) {
  if (visible) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M1.5 12S5.3 5.5 12 5.5 22.5 12 22.5 12 18.7 18.5 12 18.5 1.5 12 1.5 12Z" />
        <circle cx="12" cy="12" r="3.25" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 3l18 18" />
      <path d="M10.7 6.2A9.8 9.8 0 0 1 12 6.1c6.6 0 10.5 5.9 10.5 5.9a18.4 18.4 0 0 1-4 4.5" />
      <path d="M6.2 7.3A18.1 18.1 0 0 0 1.5 12s3.8 6.5 10.5 6.5c1.2 0 2.3-.2 3.3-.5" />
      <path d="M9.9 10A3.2 3.2 0 0 0 14 14.1" />
    </svg>
  );
}

export default function AuthClient() {
  const searchParams = useSearchParams();
  const supabase = getSupabaseBrowserClient();
  const fallbackBase = "https://readingqueue.vercel.app";
  const siteUrl =
    process.env.NEXT_PUBLIC_PROJECT_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    (typeof window !== "undefined" ? window.location.origin : fallbackBase);
  const redirectBase = siteUrl.includes("netlify.app") ? fallbackBase : siteUrl || fallbackBase;
  const paramMode = searchParams?.get("mode") === "signup" ? "signup" : "login";
  const [authMode, setAuthMode] = useState<AuthMode>(paramMode);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);

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
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginPhone, setLoginPhone] = useState("");
  const [loginCountry, setLoginCountry] = useState("US");
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
    const fullPhone = formatE164(loginCountry, loginPhone);
    const { error: otpError } = await supabase.auth.signInWithOtp({
      phone: fullPhone,
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
    const fullPhone = formatE164(loginCountry, loginPhone);
    const { error: verifyError } = await supabase.auth.verifyOtp({
      phone: fullPhone,
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
  const [signupCountry, setSignupCountry] = useState("US");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirm, setShowSignupConfirm] = useState(false);
  const [passwordFocus, setPasswordFocus] = useState(false);
  const [dismissedRules, setDismissedRules] = useState<Set<string>>(new Set());
  const ruleTimersRef = useRef<Map<string, number>>(new Map());
  const [showStrength, setShowStrength] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupMessage, setSignupMessage] = useState<string | null>(null);
  const [signupError, setSignupError] = useState<string | null>(null);

  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [profileFirstName, setProfileFirstName] = useState("");
  const [profileLastName, setProfileLastName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileCountry, setProfileCountry] = useState("US");

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
  const shouldShowStrength = (passwordFocus || signupPassword.length > 0) && !isPasswordStrong;

  useEffect(() => {
    let hideTimer: number | undefined;

    if (shouldShowStrength) {
      setShowStrength(true);
    } else {
      hideTimer = window.setTimeout(() => {
        setShowStrength(false);
      }, 1000);
    }

    return () => {
      if (hideTimer) {
        window.clearTimeout(hideTimer);
      }
    };
  }, [shouldShowStrength]);

  useEffect(() => {
    passwordStatus.forEach((rule) => {
      if (rule.met) {
        if (!dismissedRules.has(rule.id) && !ruleTimersRef.current.has(rule.id)) {
          const timer = window.setTimeout(() => {
            setDismissedRules((prev) => new Set([...prev, rule.id]));
            ruleTimersRef.current.delete(rule.id);
          }, 1200);
          ruleTimersRef.current.set(rule.id, timer);
        }
      } else {
        if (ruleTimersRef.current.has(rule.id)) {
          window.clearTimeout(ruleTimersRef.current.get(rule.id));
          ruleTimersRef.current.delete(rule.id);
        }
        if (dismissedRules.has(rule.id)) {
          setDismissedRules((prev) => {
            const next = new Set(prev);
            next.delete(rule.id);
            return next;
          });
        }
      }
    });
    return () => {
      ruleTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      ruleTimersRef.current.clear();
    };
  }, [dismissedRules, passwordStatus]);

  const passwordsMatch =
    signupConfirmPassword === "" || signupPassword === signupConfirmPassword;
  const confirmMet = signupConfirmPassword !== "" && signupPassword === signupConfirmPassword;

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
    if (signupPassword !== signupConfirmPassword) {
      setSignupError("Passwords do not match. Please re-enter your password.");
      return;
    }
    setSignupLoading(true);
    setSignupError(null);
    setSignupMessage(null);
    const fullPhone = formatE164(signupCountry, signupPhone);
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: signupEmail,
      password: signupPassword,
      options: {
        emailRedirectTo: `${redirectBase}/auth/callback?next=/email-confirmed`,
        data: {
          first_name: firstName,
          last_name: lastName,
          phone: fullPhone,
          provider: "email",
        },
      },
    });
    setSignupLoading(false);
    const signUpErrorMessage = signUpError?.message.toLowerCase() ?? "";
    if (signUpError) {
      if (signUpErrorMessage.includes("rate limit") || signUpErrorMessage.includes("too many requests")) {
        setSignupError("Too many signup attempts. Please wait a few minutes before trying again.");
      } else if (
        signUpErrorMessage.includes("already") ||
        signUpErrorMessage.includes("registered") ||
        signUpErrorMessage.includes("exists")
      ) {
        setSignupError("You already have an account. Please log in.");
      } else {
        setSignupError(signUpError.message);
      }
      return;
    }

    const existingUserWithoutIdentity =
      !!signUpData?.user &&
      Array.isArray(signUpData.user.identities) &&
      signUpData.user.identities.length === 0;

    if (existingUserWithoutIdentity) {
      setSignupError("You already have an account. Please log in.");
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
    const fullPhone = formatE164(profileCountry, profilePhone);
    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        first_name: profileFirstName,
        last_name: profileLastName,
        phone: fullPhone,
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
                    <div className="auth-input-wrap">
                      <input
                        className="auth-input"
                        type={showLoginPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={loginPassword}
                        onChange={(event) => setLoginPassword(event.target.value)}
                        required
                      />
                      <button
                        type="button"
                        className={`auth-eye${showLoginPassword ? " active" : ""}`}
                        aria-label={showLoginPassword ? "Hide password" : "Show password"}
                        onClick={() => setShowLoginPassword((prev) => !prev)}
                      >
                        <PasswordEyeIcon visible={showLoginPassword} />
                      </button>
                    </div>
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
                    Phone number
                    <div className="auth-phone-group">
                      <select
                        className="auth-dial-select"
                        value={loginCountry}
                        onChange={(event) => setLoginCountry(event.target.value)}
                        aria-label="Country code"
                      >
                        {COUNTRY_CODES.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.dial} ({c.code})
                          </option>
                        ))}
                      </select>
                      <input
                        className="auth-input"
                        type="tel"
                        placeholder="555 123 4567"
                        value={loginPhone}
                        onChange={(event) => setLoginPhone(event.target.value)}
                        required
                      />
                    </div>
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
                </>
              )}

              {loginMessage ? <p className="auth-message">{loginMessage}</p> : null}
              {loginError ? <p className="auth-error">{loginError}</p> : null}

              <button className="auth-primary" type="submit" disabled={loginLoading}>
                {loginLoading
                  ? loginMode === "password"
                    ? "Signing in..."
                    : "Sending..."
                  : loginMode === "password"
                  ? "Sign in"
                  : loginOtpSent
                  ? "Verify code"
                  : "Send code"}
              </button>
            </form>
          </div>
        </section>

        <section className="auth-dual__panel auth-dual__panel--signup">
          <div className="auth-dual__panel-inner">
            <div className="auth-form-head">
              <div className="auth-head-row">
                <div>
                  <h2 className="auth-title">Signup</h2>
                </div>
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
                <div className="auth-grid auth-name-grid">
                  <label className="auth-label">
                    First name
                    <input
                      className="auth-input"
                      type="text"
                      placeholder="Jane"
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
                      placeholder="Doe"
                      value={profileLastName}
                      onChange={(event) => setProfileLastName(event.target.value)}
                      required
                    />
                  </label>
                </div>
                <label className="auth-label">
                  Phone number
                  <div className="auth-phone-group">
                    <select
                      className="auth-dial-select"
                      value={profileCountry}
                      onChange={(event) => setProfileCountry(event.target.value)}
                      aria-label="Country code"
                    >
                      {COUNTRY_CODES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.dial} ({c.code})
                        </option>
                      ))}
                    </select>
                    <input
                      className="auth-input"
                      type="tel"
                      placeholder="555 123 4567"
                      value={profilePhone}
                      onChange={(event) => setProfilePhone(event.target.value)}
                      required
                    />
                  </div>
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
                <div className="auth-grid auth-name-grid">
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
                  Phone number
                  <div className="auth-phone-group">
                    <select
                      className="auth-dial-select"
                      value={signupCountry}
                      onChange={(event) => setSignupCountry(event.target.value)}
                      aria-label="Country code"
                    >
                      {COUNTRY_CODES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.dial} ({c.code})
                        </option>
                      ))}
                    </select>
                    <input
                      className="auth-input"
                      type="tel"
                      placeholder="555 123 4567"
                      value={signupPhone}
                      onChange={(event) => setSignupPhone(event.target.value)}
                      required
                    />
                  </div>
                </label>
                <div className="auth-pass-stack">
                  <label className="auth-label">
                    Password
                    <div className="auth-input-wrap">
                      <input
                        className="auth-input"
                        type={showSignupPassword ? "text" : "password"}
                        placeholder="Create a strong password"
                        value={signupPassword}
                        onChange={(event) => setSignupPassword(event.target.value)}
                        onFocus={() => setPasswordFocus(true)}
                        onBlur={() => setPasswordFocus(false)}
                        required
                      />
                      <button
                        type="button"
                        className={`auth-eye${showSignupPassword ? " active" : ""}`}
                        aria-label={showSignupPassword ? "Hide password" : "Show password"}
                        onClick={() => setShowSignupPassword((prev) => !prev)}
                      >
                        <PasswordEyeIcon visible={showSignupPassword} />
                      </button>
                    </div>
                  </label>
                  <div
                    className={`auth-strength auth-strength--float${showStrength ? " visible" : ""}`}
                    aria-live="polite"
                    aria-hidden={!showStrength}
                  >
                    <div className="auth-strength-label">Password strength</div>
                    <ul className="auth-strength-list">
                      {passwordStatus.map((rule) => (
                        <li
                          key={rule.id}
                          className={`auth-strength-item${rule.met ? " met" : ""}${dismissedRules.has(rule.id) ? " dismissed" : ""}`}
                        >
                          <span className={`auth-strength-icon${rule.met ? " met" : ""}`} aria-hidden="true" />
                          <span className="auth-strength-text">{rule.label}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <label className="auth-label auth-label--hint-pop">
                  Re-enter password
                  <div className="auth-input-wrap">
                    <input
                      className={`auth-input${signupConfirmPassword && !passwordsMatch ? " auth-input--error" : confirmMet ? " auth-input--ok" : ""}`}
                      type={showSignupConfirm ? "text" : "password"}
                      placeholder="Confirm your password"
                      value={signupConfirmPassword}
                      onChange={(event) => setSignupConfirmPassword(event.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className={`auth-eye${showSignupConfirm ? " active" : ""}`}
                      aria-label={showSignupConfirm ? "Hide password" : "Show password"}
                      onClick={() => setShowSignupConfirm((prev) => !prev)}
                    >
                      <PasswordEyeIcon visible={showSignupConfirm} />
                    </button>
                  </div>
                  <div className="auth-field-hint-slot" aria-live="polite">
                    {signupConfirmPassword && !passwordsMatch ? (
                      <span className="auth-field-hint auth-field-hint--error">Passwords do not match</span>
                    ) : confirmMet ? (
                      <span className="auth-field-hint auth-field-hint--ok">Passwords match</span>
                    ) : (
                      <span
                        className="auth-field-hint auth-field-hint--placeholder"
                        aria-hidden="true"
                      >
                        &nbsp;
                      </span>
                    )}
                  </div>
                </label>
                <button
                  className="auth-primary"
                  type="submit"
                  disabled={signupLoading || (signupConfirmPassword !== "" && !passwordsMatch)}
                >
                  {signupLoading ? "Creating..." : "Create account"}
                </button>
              </form>
            )}

            {signupMessage ? <p className="auth-message">{signupMessage}</p> : null}
            {signupError ? <p className="auth-error">{signupError}</p> : null}

            <p className="auth-hint">
              By continuing you agree to Reading Queue&apos;s{" "}
              <button className="auth-hint-link" type="button" onClick={() => setTermsOpen(true)}>
                Terms of Service
              </button>{" "}
              and{" "}
              <button className="auth-hint-link" type="button" onClick={() => setPrivacyOpen(true)}>
                Privacy Policy
              </button>
              .
            </p>
            {termsOpen && <TermsOfServiceModal onClose={() => setTermsOpen(false)} />}
            {privacyOpen && <PrivacyPolicyModal onClose={() => setPrivacyOpen(false)} />}
          </div>
        </section>

        <div className="auth-dual__overlay">
          <div className="auth-dual__overlay-inner">
            <div className="auth-dual__overlay-panel auth-dual__overlay-left">
              <p className="auth-brand">Reading Queue</p>
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
              <p className="auth-brand">Reading Queue</p>
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



