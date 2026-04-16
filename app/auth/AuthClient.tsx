"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Provider, User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "../lib/supabase/client";
import { PrivacyPolicyModal } from "../components/PrivacyPolicyModal";
import { TermsOfServiceModal } from "../components/TermsOfServiceModal";

type AuthMode = "login" | "signup";
type AuthStep =
  | "select"
  | "email-login"
  | "email-signup"
  | "email-signup-otp"
  | "phone"
  | "reset"
  | "reset-sent"
  | "reset-phone-otp"
  | "reset-new-password";

const OAUTH_PROVIDERS: Array<{ label: string; provider: Provider; icon: "google" | "linkedin" | "apple" }> = [
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

const PASSWORD_RULES = [
  { id: "length", label: "At least 10 characters", test: (v: string) => v.length >= 10 },
  { id: "upper",  label: "One uppercase letter",   test: (v: string) => /[A-Z]/.test(v) },
  { id: "lower",  label: "One lowercase letter",   test: (v: string) => /[a-z]/.test(v) },
  { id: "number", label: "One number",             test: (v: string) => /\d/.test(v) },
  { id: "symbol", label: "One symbol",             test: (v: string) => /[^A-Za-z0-9]/.test(v) },
];

function EyeIcon({ visible }: { visible: boolean }) {
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

function OAuthIcon({ icon }: { icon: "google" | "linkedin" | "apple" }) {
  if (icon === "google") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" width="18" height="18">
        <path d="M12.24 10.285v3.43h5.01c-.2 1.29-1.51 3.78-5.01 3.78-3.01 0-5.47-2.49-5.47-5.56 0-3.07 2.46-5.56 5.47-5.56 1.71 0 2.86.73 3.52 1.36l2.39-2.3C16.7 3.6 14.7 2.5 12.24 2.5 7.96 2.5 4.5 5.98 4.5 10.25c0 4.27 3.46 7.75 7.74 7.75 4.47 0 7.43-3.14 7.43-7.56 0-.51-.06-.9-.12-1.29H12.24z" fill="currentColor" />
      </svg>
    );
  }
  if (icon === "linkedin") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" width="18" height="18">
        <path d="M6.94 8.5H4.2v11h2.74v-11zM5.57 7.4A1.59 1.59 0 1 0 5.57 4.2a1.59 1.59 0 0 0 0 3.2zM20.5 13.2c0-3.3-1.77-4.84-4.14-4.84-1.9 0-2.75 1.04-3.22 1.77V8.5H10.4c.04 1.07 0 11 0 11h2.74v-6.14c0-.33.02-.66.12-.9.26-.66.86-1.34 1.86-1.34 1.31 0 1.84 1 1.84 2.46v5.92h2.74v-6.3z" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" width="18" height="18">
      <path d="M17.56 12.38c-.03-2.08 1.7-3.07 1.78-3.12-.97-1.42-2.48-1.61-3.01-1.63-1.28-.13-2.5.75-3.15.75-.65 0-1.66-.73-2.73-.71-1.4.02-2.7.82-3.42 2.08-1.46 2.52-.37 6.27 1.05 8.31.7.99 1.53 2.1 2.62 2.06 1.05-.04 1.45-.68 2.72-.68 1.27 0 1.63.68 2.73.66 1.13-.02 1.84-1.02 2.54-2.01.8-1.17 1.13-2.31 1.15-2.36-.02-.01-2.22-.85-2.24-3.35zM15.5 6.6c.58-.7.97-1.67.86-2.65-.83.03-1.83.55-2.43 1.25-.54.62-.99 1.61-.87 2.56.92.07 1.86-.47 2.44-1.16z" fill="currentColor" />
    </svg>
  );
}

/* ─── Phone field (shared) ─────────────────────────────────────── */
function PhoneField({
  country, setCountry, phone, setPhone, label = "Phone number",
}: {
  country: string; setCountry: (v: string) => void;
  phone: string; setPhone: (v: string) => void;
  label?: string;
}) {
  return (
    <label className="auth-label">
      {label}
      <div className="auth-phone-group">
        <select className="auth-dial-select" value={country} onChange={(e) => setCountry(e.target.value)} aria-label="Country code">
          {COUNTRY_CODES.map((c) => (
            <option key={c.code} value={c.code}>{c.flag} {c.dial}</option>
          ))}
        </select>
        <input className="auth-input" type="tel" placeholder="555 123 4567" value={phone} onChange={(e) => setPhone(e.target.value)} required />
      </div>
    </label>
  );
}

/* ─── OTP input ────────────────────────────────────────────────── */
function OtpField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className="auth-label">
      Verification code
      <input
        className="auth-input auth-input--otp"
        type="text"
        inputMode="numeric"
        placeholder="6-digit code"
        maxLength={6}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
        required
      />
    </label>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
export default function AuthClient() {
  const searchParams = useSearchParams();
  const supabase = getSupabaseBrowserClient();

  const fallbackBase = "https://readingqueue.vercel.app";
  const siteUrl = process.env.NEXT_PUBLIC_PROJECT_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? (typeof window !== "undefined" ? window.location.origin : fallbackBase);
  const redirectBase = siteUrl.includes("netlify.app") ? fallbackBase : siteUrl || fallbackBase;

  const paramMode = searchParams?.get("mode") === "signup" ? "signup" : "login";
  const [mode, setMode] = useState<AuthMode>(paramMode);
  const [step, setStep] = useState<AuthStep>("select");

  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);

  /* fix body scroll on auth page */
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const ph = html.style.overflow;
    const pb = body.style.overflow;
    html.style.overflow = "auto";
    body.style.overflow = "auto";
    return () => { html.style.overflow = ph; body.style.overflow = pb; };
  }, []);

  useEffect(() => { setMode(paramMode); }, [paramMode]);

  /* ── OAuth phone verification overlay (non-dismissible) ──────── */
  const [oauthUser, setOauthUser] = useState<User | null>(null);
  const [oauthPhoneStep, setOauthPhoneStep] = useState<"entry" | "otp">("entry");
  const [oauthPhone, setOauthPhone] = useState("");
  const [oauthCountry, setOauthCountry] = useState("US");
  const [oauthOtp, setOauthOtp] = useState("");
  const [oauthLoading, setOauthLoading] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);

  useEffect(() => {
    const checkOAuthUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      const provider = data.user.app_metadata?.provider ?? "email";
      const isOAuth = provider !== "email";
      const phoneVerified = data.user.user_metadata?.phone_verified === true;
      if (isOAuth && !phoneVerified) setOauthUser(data.user);
    };
    checkOAuthUser();
  }, [supabase]);

  const handleOauthSendOtp = async () => {
    if (!oauthPhone) return;
    setOauthLoading(true);
    setOauthError(null);
    const full = formatE164(oauthCountry, oauthPhone);
    const { error } = await supabase.auth.updateUser({ phone: full });
    setOauthLoading(false);
    if (error) { setOauthError(error.message); return; }
    setOauthPhoneStep("otp");
  };

  const handleOauthVerifyOtp = async () => {
    if (!oauthOtp) return;
    setOauthLoading(true);
    setOauthError(null);
    const full = formatE164(oauthCountry, oauthPhone);
    const { error } = await supabase.auth.verifyOtp({ phone: full, token: oauthOtp, type: "phone_change" });
    if (error) { setOauthError(error.message); setOauthLoading(false); return; }
    await supabase.auth.updateUser({ data: { phone: full, phone_verified: true } });
    setOauthLoading(false);
    window.location.href = "/";
  };

  /* ── Email login ─────────────────────────────────────────────── */
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPw, setShowLoginPw] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginMsg, setLoginMsg] = useState<string | null>(null);
  const [loginErr, setLoginErr] = useState<string | null>(null);

  const handleEmailLogin = async () => {
    if (!loginEmail || !loginPassword) return;
    setLoginLoading(true); setLoginErr(null); setLoginMsg(null);
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
    setLoginLoading(false);
    if (error) { setLoginErr(error.message); return; }
    setLoginMsg("Signed in. Redirecting…");
    window.location.href = "/";
  };

  /* ── Password reset ──────────────────────────────────────────── */
  const [resetEmail, setResetEmail] = useState("");
  const [resetPhone, setResetPhone] = useState("");
  const [resetCountry, setResetCountry] = useState("US");
  const [resetOtp, setResetOtp] = useState("");
  const [resetNewPw, setResetNewPw] = useState("");
  const [resetConfirmPw, setResetConfirmPw] = useState("");
  const [showResetPw, setShowResetPw] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMsg, setResetMsg] = useState<string | null>(null);
  const [resetErr, setResetErr] = useState<string | null>(null);

  const handleResetEmail = async () => {
    if (!resetEmail) { setResetErr("Enter your email address."); return; }
    setResetLoading(true); setResetErr(null); setResetMsg(null);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${redirectBase}/auth/callback?next=/reset-password`,
    });
    setResetLoading(false);
    if (error) {
      setResetErr(error.message.toLowerCase().includes("rate limit") ? "Too many attempts. Please wait a few minutes." : error.message);
      return;
    }
    setStep("reset-sent");
  };

  const handleResetSendOtp = async () => {
    if (!resetPhone) return;
    setResetLoading(true); setResetErr(null); setResetMsg(null);
    const full = formatE164(resetCountry, resetPhone);
    const { error } = await supabase.auth.signInWithOtp({ phone: full, options: { shouldCreateUser: false } });
    setResetLoading(false);
    if (error) { setResetErr(error.message); return; }
    setStep("reset-phone-otp");
    setResetMsg("Code sent. Enter it below.");
  };

  const handleResetVerifyOtp = async () => {
    if (!resetPhone || !resetOtp) return;
    setResetLoading(true); setResetErr(null); setResetMsg(null);
    const full = formatE164(resetCountry, resetPhone);
    const { error } = await supabase.auth.verifyOtp({ phone: full, token: resetOtp, type: "sms" });
    setResetLoading(false);
    if (error) { setResetErr(error.message); return; }
    setStep("reset-new-password");
  };

  const handleSetNewPassword = async () => {
    if (!resetNewPw || !resetConfirmPw) { setResetErr("Please fill both fields."); return; }
    if (resetNewPw !== resetConfirmPw) { setResetErr("Passwords do not match."); return; }
    setResetLoading(true); setResetErr(null); setResetMsg(null);
    const { error } = await supabase.auth.updateUser({ password: resetNewPw });
    setResetLoading(false);
    if (error) { setResetErr(error.message); return; }
    setResetMsg("Password updated. Redirecting…");
    setTimeout(() => { window.location.href = "/"; }, 1500);
  };

  /* ── Email signup ────────────────────────────────────────────── */
  const [sgFirst, setSgFirst] = useState("");
  const [sgLast, setSgLast] = useState("");
  const [sgEmail, setSgEmail] = useState("");
  const [sgPhone, setSgPhone] = useState("");
  const [sgCountry, setSgCountry] = useState("US");
  const [sgPassword, setSgPassword] = useState("");
  const [sgConfirm, setSgConfirm] = useState("");
  const [showSgPw, setShowSgPw] = useState(false);
  const [showSgConfirm, setShowSgConfirm] = useState(false);
  const [pwFocus, setPwFocus] = useState(false);
  const [dismissedRules, setDismissedRules] = useState<Set<string>>(new Set());
  const ruleTimers = useRef<Map<string, number>>(new Map());
  const [showStrength, setShowStrength] = useState(false);
  const [sgOtp, setSgOtp] = useState("");
  const [sgLoading, setSgLoading] = useState(false);
  const [sgMsg, setSgMsg] = useState<string | null>(null);
  const [sgErr, setSgErr] = useState<string | null>(null);

  const pwStatus = useMemo(() => PASSWORD_RULES.map((r) => ({ ...r, met: r.test(sgPassword) })), [sgPassword]);
  const isPwStrong = pwStatus.every((r) => r.met);
  const shouldShowStrength = (pwFocus || sgPassword.length > 0) && !isPwStrong;

  useEffect(() => {
    let t: number | undefined;
    if (shouldShowStrength) { setShowStrength(true); }
    else { t = window.setTimeout(() => setShowStrength(false), 1000); }
    return () => { if (t) window.clearTimeout(t); };
  }, [shouldShowStrength]);

  useEffect(() => {
    pwStatus.forEach((rule) => {
      if (rule.met) {
        if (!dismissedRules.has(rule.id) && !ruleTimers.current.has(rule.id)) {
          const t = window.setTimeout(() => {
            setDismissedRules((prev) => new Set([...prev, rule.id]));
            ruleTimers.current.delete(rule.id);
          }, 1200);
          ruleTimers.current.set(rule.id, t);
        }
      } else {
        if (ruleTimers.current.has(rule.id)) { window.clearTimeout(ruleTimers.current.get(rule.id)!); ruleTimers.current.delete(rule.id); }
        if (dismissedRules.has(rule.id)) { setDismissedRules((prev) => { const n = new Set(prev); n.delete(rule.id); return n; }); }
      }
    });
    return () => { ruleTimers.current.forEach((t) => window.clearTimeout(t)); ruleTimers.current.clear(); };
  }, [dismissedRules, pwStatus]);

  const pwsMatch = sgConfirm === "" || sgPassword === sgConfirm;
  const confirmMet = sgConfirm !== "" && sgPassword === sgConfirm;

  const handleEmailSignup = async () => {
    if (!sgFirst || !sgLast || !sgEmail || !sgPhone) { setSgErr("Please fill in all required fields."); return; }
    if (!isPwStrong) { setSgErr("Please create a stronger password."); return; }
    if (sgPassword !== sgConfirm) { setSgErr("Passwords do not match."); return; }
    setSgLoading(true); setSgErr(null); setSgMsg(null);
    const fullPhone = formatE164(sgCountry, sgPhone);
    const { data, error } = await supabase.auth.signUp({
      email: sgEmail,
      password: sgPassword,
      options: {
        emailRedirectTo: `${redirectBase}/auth/callback?next=/email-confirmed`,
        data: { first_name: sgFirst, last_name: sgLast, phone: fullPhone, provider: "email" },
      },
    });
    if (error) {
      const msg = error.message.toLowerCase();
      setSgErr(
        msg.includes("rate limit") ? "Too many signup attempts. Please wait a moment." :
        (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) ? "An account with this email already exists. Please log in." :
        error.message
      );
      setSgLoading(false);
      return;
    }
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      setSgErr("An account with this email already exists. Please log in.");
      setSgLoading(false);
      return;
    }
    /* send phone OTP */
    const { error: phoneErr } = await supabase.auth.updateUser({ phone: fullPhone });
    setSgLoading(false);
    if (phoneErr) {
      setSgMsg("Account created! A verification email was sent. Phone OTP failed — you can verify later.");
      setTimeout(() => { window.location.href = "/"; }, 2500);
      return;
    }
    setSgMsg("Account created! A verification email was sent. Now verify your phone.");
    setStep("email-signup-otp");
  };

  const handleSignupVerifyOtp = async () => {
    if (!sgOtp) return;
    setSgLoading(true); setSgErr(null); setSgMsg(null);
    const fullPhone = formatE164(sgCountry, sgPhone);
    const { error } = await supabase.auth.verifyOtp({ phone: fullPhone, token: sgOtp, type: "phone_change" });
    if (error) { setSgErr(error.message); setSgLoading(false); return; }
    await supabase.auth.updateUser({ data: { phone_verified: true } });
    setSgLoading(false);
    window.location.href = "/";
  };

  /* ── Phone login / signup ────────────────────────────────────── */
  const [phPhone, setPhPhone] = useState("");
  const [phCountry, setPhCountry] = useState("US");
  const [phOtp, setPhOtp] = useState("");
  const [phOtpSent, setPhOtpSent] = useState(false);
  const [phLoading, setPhLoading] = useState(false);
  const [phMsg, setPhMsg] = useState<string | null>(null);
  const [phErr, setPhErr] = useState<string | null>(null);

  const handlePhoneSend = async () => {
    if (!phPhone) return;
    setPhLoading(true); setPhErr(null); setPhMsg(null);
    const full = formatE164(phCountry, phPhone);
    const { error } = await supabase.auth.signInWithOtp({ phone: full, options: { shouldCreateUser: mode === "signup" } });
    setPhLoading(false);
    if (error) { setPhErr(error.message); return; }
    setPhOtpSent(true);
    setPhMsg("Code sent. Enter it below.");
  };

  const handlePhoneVerify = async () => {
    if (!phPhone || !phOtp) return;
    setPhLoading(true); setPhErr(null); setPhMsg(null);
    const full = formatE164(phCountry, phPhone);
    const { error } = await supabase.auth.verifyOtp({ phone: full, token: phOtp, type: "sms" });
    setPhLoading(false);
    if (error) { setPhErr(error.message); return; }
    window.location.href = "/";
  };

  /* ── OAuth ───────────────────────────────────────────────────── */
  const handleOAuth = async (provider: Provider) => {
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${redirectBase}/auth/callback?next=/auth?mode=${mode}` },
    });
  };

  /* ── Back button helper ──────────────────────────────────────── */
  const goBack = () => {
    setSgErr(null); setSgMsg(null);
    setLoginErr(null); setLoginMsg(null);
    setPhErr(null); setPhMsg(null);
    setResetErr(null); setResetMsg(null);
    setPhOtpSent(false);
    if (step === "email-signup-otp") { setStep("email-signup"); return; }
    if (step === "reset" || step === "reset-sent" || step === "reset-phone-otp" || step === "reset-new-password") {
      setStep("email-login"); return;
    }
    setStep("select");
  };

  /* ── Inline email state (used on select step, pre-fills form) ── */
  const [selectEmail, setSelectEmail] = useState("");

  const handleContinueWithEmail = () => {
    if (!selectEmail) return;
    if (mode === "login") {
      setLoginEmail(selectEmail);
      setStep("email-login");
    } else {
      setSgEmail(selectEmail);
      setStep("email-signup");
    }
  };

  /* ── Derived ─────────────────────────────────────────────────── */
  const hasBack = step !== "select";
  const stepTitle: Record<AuthStep, string> = {
    select:              mode === "login" ? "Log in to Cloudduty" : "Create your account",
    "email-login":       "Log in with email",
    "email-signup":      "Create your account",
    "email-signup-otp":  "Verify your phone",
    phone:               mode === "login" ? "Log in with phone" : "Sign up with phone",
    reset:               "Reset your password",
    "reset-sent":        "Check your inbox",
    "reset-phone-otp":   "Verify your phone",
    "reset-new-password":"Set new password",
  };

  /* ══════════════════════════════════════════════════════════════ */
  return (
    <>
      {/* Non-dismissible OAuth phone verification overlay */}
      {oauthUser && (
        <div className="av2-overlay" role="dialog" aria-modal="true" aria-label="Phone verification required">
          <div className="av2-overlay-card">
            <div className="av2-overlay-lock" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h2 className="av2-overlay-title">Security verification required</h2>
            <p className="av2-overlay-text">
              To protect your account, verify your phone number before continuing. This cannot be skipped.
            </p>
            {oauthPhoneStep === "entry" ? (
              <form className="auth-form" onSubmit={(e) => { e.preventDefault(); handleOauthSendOtp(); }}>
                <PhoneField country={oauthCountry} setCountry={setOauthCountry} phone={oauthPhone} setPhone={setOauthPhone} />
                {oauthError && <p className="auth-error">{oauthError}</p>}
                <button className="auth-primary" type="submit" disabled={oauthLoading || !oauthPhone}>
                  {oauthLoading ? "Sending…" : "Send verification code"}
                </button>
              </form>
            ) : (
              <form className="auth-form" onSubmit={(e) => { e.preventDefault(); handleOauthVerifyOtp(); }}>
                <p className="av2-overlay-hint">Code sent to {formatE164(oauthCountry, oauthPhone)}</p>
                <OtpField value={oauthOtp} onChange={setOauthOtp} />
                {oauthError && <p className="auth-error">{oauthError}</p>}
                <button className="auth-primary" type="submit" disabled={oauthLoading || oauthOtp.length < 6}>
                  {oauthLoading ? "Verifying…" : "Verify & continue"}
                </button>
                <button className="av2-resend" type="button" onClick={() => { setOauthPhoneStep("entry"); setOauthOtp(""); setOauthError(null); }}>
                  Change phone number
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Fixed top nav — logo left, Sign Up / Log in right */}
      <nav className="av2-topnav">
        <a className="av2-topnav-logo" href="/">
          <Image src="/logo.png" alt="Cloudduty" width={28} height={28} style={{ background: "transparent" }} />
          <span className="av2-topnav-logo-name">Cloudduty</span>
        </a>
        {step === "select" && (
          mode === "login"
            ? <button className="av2-topnav-cta" type="button" onClick={() => setMode("signup")}>Sign Up</button>
            : <button className="av2-topnav-cta" type="button" onClick={() => setMode("login")}>Log In</button>
        )}
      </nav>

      {/* Main auth page */}
      <div className="auth-page av2-page">
        <div className="av2-card">

          {/* Back button */}
          {hasBack && (
            <button className="av2-back" type="button" onClick={goBack} aria-label="Go back">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M19 12H5M12 5l-7 7 7 7" />
              </svg>
              Back
            </button>
          )}

          {/* Step title */}
          <h1 className="av2-title">{stepTitle[step]}</h1>

          {/* ── SELECT ─────────────────────────────────────────── */}
          {step === "select" && (
            <>
              {/* Email input + primary CTA — exactly like Vercel */}
              <form className="av2-email-block" onSubmit={(e) => { e.preventDefault(); handleContinueWithEmail(); }}>
                <input
                  className="av2-email-input"
                  type="email"
                  placeholder="Email Address"
                  value={selectEmail}
                  onChange={(e) => setSelectEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
                <button className="av2-email-btn" type="submit" disabled={!selectEmail}>
                  Continue with Email
                </button>
              </form>

              <div className="av2-divider" />

              {/* OAuth + Phone options */}
              <div className="av2-opts">
                {OAUTH_PROVIDERS.map(({ label, provider, icon }) => (
                  <button key={provider} className="av2-opt" type="button" onClick={() => handleOAuth(provider)}>
                    <span className="av2-opt-icon"><OAuthIcon icon={icon} /></span>
                    <span className="av2-opt-label">Continue with {label}</span>
                  </button>
                ))}

                <button className="av2-opt" type="button" onClick={() => setStep("phone")}>
                  <span className="av2-opt-icon">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.98a16 16 0 0 0 6.12 6.12l.97-.97a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                  </span>
                  <span className="av2-opt-label">Continue with Phone</span>
                </button>
              </div>

              <p className="av2-legal">
                By continuing you agree to Cloudduty&apos;s{" "}
                <button className="auth-hint-link" type="button" onClick={() => setTermsOpen(true)}>Terms of Service</button>
                {" "}and{" "}
                <button className="auth-hint-link" type="button" onClick={() => setPrivacyOpen(true)}>Privacy Policy</button>.
              </p>
              {mode === "login" ? (
                <p className="av2-switch">Don&apos;t have an account?{" "}<button className="auth-hint-link" type="button" onClick={() => setMode("signup")}>Sign Up</button></p>
              ) : (
                <p className="av2-switch">Already have an account?{" "}<button className="auth-hint-link" type="button" onClick={() => setMode("login")}>Log In</button></p>
              )}
            </>
          )}

          {/* ── EMAIL LOGIN ─────────────────────────────────────── */}
          {step === "email-login" && (
            <form className="auth-form av2-form" onSubmit={(e) => { e.preventDefault(); handleEmailLogin(); }}>
              <label className="auth-label">
                Email address
                <input className="auth-input" type="email" placeholder="you@company.com" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
              </label>
              <label className="auth-label">
                Password
                <div className="auth-input-wrap">
                  <input className="auth-input" type={showLoginPw ? "text" : "password"} placeholder="Your password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required />
                  <button type="button" className={`auth-eye${showLoginPw ? " active" : ""}`} aria-label={showLoginPw ? "Hide" : "Show"} onClick={() => setShowLoginPw((p) => !p)}>
                    <EyeIcon visible={showLoginPw} />
                  </button>
                </div>
              </label>
              <button className="auth-link av2-forgot" type="button" onClick={() => { setResetEmail(loginEmail); setStep("reset"); }}>
                Forgot password?
              </button>
              {loginMsg && <p className="auth-message">{loginMsg}</p>}
              {loginErr && <p className="auth-error">{loginErr}</p>}
              <button className="auth-primary" type="submit" disabled={loginLoading || !loginEmail || !loginPassword}>
                {loginLoading ? "Signing in…" : "Sign in"}
              </button>
              <p className="av2-switch">Don&apos;t have an account?{" "}<button className="auth-hint-link" type="button" onClick={() => { setMode("signup"); setStep("email-signup"); }}>Sign up</button></p>
            </form>
          )}

          {/* ── EMAIL SIGNUP ────────────────────────────────────── */}
          {step === "email-signup" && (
            <form className="auth-form av2-form" onSubmit={(e) => { e.preventDefault(); handleEmailSignup(); }}>
              <div className="auth-grid auth-name-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <label className="auth-label">
                  First name
                  <input className="auth-input" type="text" placeholder="Jane" value={sgFirst} onChange={(e) => setSgFirst(e.target.value)} required />
                </label>
                <label className="auth-label">
                  Last name
                  <input className="auth-input" type="text" placeholder="Doe" value={sgLast} onChange={(e) => setSgLast(e.target.value)} required />
                </label>
              </div>
              <label className="auth-label">
                Email address
                <input className="auth-input" type="email" placeholder="you@company.com" value={sgEmail} onChange={(e) => setSgEmail(e.target.value)} required />
              </label>
              <PhoneField country={sgCountry} setCountry={setSgCountry} phone={sgPhone} setPhone={setSgPhone} label="Phone number (required)" />
              <div className="auth-pass-stack">
                <label className="auth-label">
                  Password
                  <div className="auth-input-wrap">
                    <input
                      className="auth-input"
                      type={showSgPw ? "text" : "password"}
                      placeholder="Create a strong password"
                      value={sgPassword}
                      onChange={(e) => setSgPassword(e.target.value)}
                      onFocus={() => setPwFocus(true)}
                      onBlur={() => setPwFocus(false)}
                      required
                    />
                    <button type="button" className={`auth-eye${showSgPw ? " active" : ""}`} aria-label={showSgPw ? "Hide" : "Show"} onClick={() => setShowSgPw((p) => !p)}>
                      <EyeIcon visible={showSgPw} />
                    </button>
                  </div>
                </label>
                <div className={`auth-strength auth-strength--float${showStrength ? " visible" : ""}`} aria-live="polite" aria-hidden={!showStrength}>
                  <div className="auth-strength-label">Password strength</div>
                  <ul className="auth-strength-list">
                    {pwStatus.map((rule) => (
                      <li key={rule.id} className={`auth-strength-item${rule.met ? " met" : ""}${dismissedRules.has(rule.id) ? " dismissed" : ""}`}>
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
                    className={`auth-input${sgConfirm && !pwsMatch ? " auth-input--error" : confirmMet ? " auth-input--ok" : ""}`}
                    type={showSgConfirm ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={sgConfirm}
                    onChange={(e) => setSgConfirm(e.target.value)}
                    required
                  />
                  <button type="button" className={`auth-eye${showSgConfirm ? " active" : ""}`} aria-label={showSgConfirm ? "Hide" : "Show"} onClick={() => setShowSgConfirm((p) => !p)}>
                    <EyeIcon visible={showSgConfirm} />
                  </button>
                </div>
                <div className="auth-field-hint-slot" aria-live="polite">
                  {sgConfirm && !pwsMatch ? (
                    <span className="auth-field-hint auth-field-hint--error">Passwords do not match</span>
                  ) : confirmMet ? (
                    <span className="auth-field-hint auth-field-hint--ok">Passwords match</span>
                  ) : (
                    <span className="auth-field-hint auth-field-hint--placeholder" aria-hidden="true">&nbsp;</span>
                  )}
                </div>
              </label>
              {sgMsg && <p className="auth-message">{sgMsg}</p>}
              {sgErr && <p className="auth-error">{sgErr}</p>}
              <button className="auth-primary" type="submit" disabled={sgLoading || (sgConfirm !== "" && !pwsMatch)}>
                {sgLoading ? "Creating account…" : "Create account"}
              </button>
              <p className="av2-switch">Already have an account?{" "}<button className="auth-hint-link" type="button" onClick={() => { setMode("login"); setStep("email-login"); }}>Log in</button></p>
            </form>
          )}

          {/* ── EMAIL SIGNUP — PHONE OTP ─────────────────────────── */}
          {step === "email-signup-otp" && (
            <form className="auth-form av2-form" onSubmit={(e) => { e.preventDefault(); handleSignupVerifyOtp(); }}>
              <p className="av2-otp-hint">
                A verification code was sent to{" "}
                <strong>{formatE164(sgCountry, sgPhone)}</strong>.
                {" "}A confirmation email was also sent to <strong>{sgEmail}</strong>.
              </p>
              <OtpField value={sgOtp} onChange={setSgOtp} />
              {sgMsg && <p className="auth-message">{sgMsg}</p>}
              {sgErr && <p className="auth-error">{sgErr}</p>}
              <button className="auth-primary" type="submit" disabled={sgLoading || sgOtp.length < 6}>
                {sgLoading ? "Verifying…" : "Verify & continue"}
              </button>
            </form>
          )}

          {/* ── PHONE ───────────────────────────────────────────── */}
          {step === "phone" && (
            <form
              className="auth-form av2-form"
              onSubmit={(e) => { e.preventDefault(); phOtpSent ? handlePhoneVerify() : handlePhoneSend(); }}
            >
              {!phOtpSent ? (
                <PhoneField country={phCountry} setCountry={setPhCountry} phone={phPhone} setPhone={setPhPhone} />
              ) : (
                <>
                  <p className="av2-otp-hint">Code sent to <strong>{formatE164(phCountry, phPhone)}</strong>.</p>
                  <OtpField value={phOtp} onChange={setPhOtp} />
                </>
              )}
              {phMsg && <p className="auth-message">{phMsg}</p>}
              {phErr && <p className="auth-error">{phErr}</p>}
              <button className="auth-primary" type="submit" disabled={phLoading || (!phOtpSent && !phPhone) || (phOtpSent && phOtp.length < 6)}>
                {phLoading ? (phOtpSent ? "Verifying…" : "Sending…") : phOtpSent ? "Verify code" : "Send code"}
              </button>
              {phOtpSent && (
                <button className="auth-link av2-resend" type="button" onClick={() => { setPhOtpSent(false); setPhOtp(""); setPhErr(null); setPhMsg(null); }}>
                  Resend or change number
                </button>
              )}
            </form>
          )}

          {/* ── RESET OPTIONS ───────────────────────────────────── */}
          {step === "reset" && (
            <div className="av2-form">
              <p className="av2-otp-hint">How would you like to reset your password?</p>
              <div className="av2-opts">
                <button className="av2-opt" type="button" onClick={() => {}}>
                  <span className="av2-opt-icon">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <path d="m2 7 10 7 10-7" />
                    </svg>
                  </span>
                  <span className="av2-opt-label av2-opt-label--stacked">
                    <span>Reset via email</span>
                    <span className="av2-opt-sub">Receive a reset link by email</span>
                  </span>
                </button>
              </div>
              <form className="auth-form" style={{ marginTop: "0" }} onSubmit={(e) => { e.preventDefault(); handleResetEmail(); }}>
                <label className="auth-label">
                  Your email address
                  <input className="auth-input" type="email" placeholder="you@company.com" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} required />
                </label>
                {resetErr && <p className="auth-error">{resetErr}</p>}
                <button className="auth-primary" type="submit" disabled={resetLoading || !resetEmail}>
                  {resetLoading ? "Sending…" : "Send reset link"}
                </button>
              </form>

              <div className="av2-divider" style={{ margin: "16px 0" }}><span>or</span></div>

              <div className="av2-opts">
                <button className="av2-opt" type="button" onClick={() => {}}>
                  <span className="av2-opt-icon">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.98a16 16 0 0 0 6.12 6.12l.97-.97a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                  </span>
                  <span className="av2-opt-label av2-opt-label--stacked">
                    <span>Reset via phone</span>
                    <span className="av2-opt-sub">Verify with SMS code, then set new password</span>
                  </span>
                </button>
              </div>
              <form className="auth-form" style={{ marginTop: "0" }} onSubmit={(e) => { e.preventDefault(); handleResetSendOtp(); }}>
                <PhoneField country={resetCountry} setCountry={setResetCountry} phone={resetPhone} setPhone={setResetPhone} />
                {resetErr && <p className="auth-error">{resetErr}</p>}
                <button className="auth-primary" type="submit" disabled={resetLoading || !resetPhone}>
                  {resetLoading ? "Sending…" : "Send SMS code"}
                </button>
              </form>
            </div>
          )}

          {/* ── RESET SENT ──────────────────────────────────────── */}
          {step === "reset-sent" && (
            <div className="av2-form">
              <div className="av2-success-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <p className="av2-otp-hint" style={{ textAlign: "center" }}>
                A password reset link was sent to <strong>{resetEmail}</strong>. Check your inbox and click the link to set a new password.
              </p>
              <button className="auth-primary" type="button" onClick={() => { setStep("select"); setMode("login"); }}>
                Back to log in
              </button>
            </div>
          )}

          {/* ── RESET PHONE OTP ─────────────────────────────────── */}
          {step === "reset-phone-otp" && (
            <form className="auth-form av2-form" onSubmit={(e) => { e.preventDefault(); handleResetVerifyOtp(); }}>
              <p className="av2-otp-hint">Code sent to <strong>{formatE164(resetCountry, resetPhone)}</strong>.</p>
              <OtpField value={resetOtp} onChange={setResetOtp} />
              {resetMsg && <p className="auth-message">{resetMsg}</p>}
              {resetErr && <p className="auth-error">{resetErr}</p>}
              <button className="auth-primary" type="submit" disabled={resetLoading || resetOtp.length < 6}>
                {resetLoading ? "Verifying…" : "Verify code"}
              </button>
            </form>
          )}

          {/* ── RESET NEW PASSWORD ──────────────────────────────── */}
          {step === "reset-new-password" && (
            <form className="auth-form av2-form" onSubmit={(e) => { e.preventDefault(); handleSetNewPassword(); }}>
              <p className="av2-otp-hint">Phone verified. Set a new password for your account.</p>
              <label className="auth-label">
                New password
                <div className="auth-input-wrap">
                  <input className="auth-input" type={showResetPw ? "text" : "password"} placeholder="Create a strong password" value={resetNewPw} onChange={(e) => setResetNewPw(e.target.value)} required />
                  <button type="button" className={`auth-eye${showResetPw ? " active" : ""}`} aria-label={showResetPw ? "Hide" : "Show"} onClick={() => setShowResetPw((p) => !p)}>
                    <EyeIcon visible={showResetPw} />
                  </button>
                </div>
              </label>
              <label className="auth-label">
                Confirm new password
                <input className="auth-input" type="password" placeholder="Re-enter password" value={resetConfirmPw} onChange={(e) => setResetConfirmPw(e.target.value)} required />
              </label>
              {resetMsg && <p className="auth-message">{resetMsg}</p>}
              {resetErr && <p className="auth-error">{resetErr}</p>}
              <button className="auth-primary" type="submit" disabled={resetLoading}>
                {resetLoading ? "Saving…" : "Update password"}
              </button>
            </form>
          )}
        </div>
      </div>

      {termsOpen && <TermsOfServiceModal onClose={() => setTermsOpen(false)} />}
      {privacyOpen && <PrivacyPolicyModal onClose={() => setPrivacyOpen(false)} />}
    </>
  );
}
