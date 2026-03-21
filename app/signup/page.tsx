"use client";

import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Icon } from "../components/Icon";
import { getSupabaseBrowserClient } from "../lib/supabase/client";
import { useTheme } from "../theme-provider";

const providers = [
  { label: "Google", provider: "google", icon: "google" as const },
  { label: "LinkedIn", provider: "linkedin_oidc", icon: "linkedin" as const },
  { label: "Apple", provider: "apple", icon: "apple" as const },
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

export default function SignupPage() {
  const { theme, toggleTheme } = useTheme();
  const supabase = getSupabaseBrowserClient();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        met: rule.test(password),
      })),
    [password]
  );

  const isPasswordStrong = passwordStatus.every((rule) => rule.met);

  const handleOAuth = async (provider: string) => {
    setError(null);
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/signup`,
      },
    });
  };

  const handleSignup = async () => {
    if (!firstName || !lastName || !email || !phone) {
      setError("Please fill in all required fields.");
      return;
    }
    if (!isPasswordStrong) {
      setError("Please create a stronger password.");
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          phone,
          provider: "email",
        },
      },
    });
    setLoading(false);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    setMessage("Check your email to confirm your account, then sign in.");
  };

  const handleCompleteProfile = async () => {
    if (!profileUser) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    const provider = profileUser.app_metadata?.provider ?? "oauth";
    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        first_name: profileFirstName,
        last_name: profileLastName,
        phone: profilePhone,
        provider,
      },
    });
    setLoading(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setProfileUser(null);
    setMessage("Profile completed. Redirecting...");
    window.location.href = "/";
  };

  return (
    <div className="auth-page">
      <div className="auth-shell is-signup">
        <section className="auth-panel auth-panel--slide">
          <div className="auth-slide-glow" />
          <div className="auth-slide-inner">
            <p className="auth-brand">CloudDuty</p>
            <h1 className="auth-slide-title">Start your workspace.</h1>
            <p className="auth-slide-text">
              Launch a secure cloud workspace in minutes.
            </p>
            <a className="auth-ghost" href="/login">
              I have an account
            </a>
          </div>
        </section>

        <section className="auth-panel auth-panel--form">
          <div className="auth-form-head">
            <div className="auth-head-row">
              <div>
                <p className="auth-kicker">Create account</p>
                <h2 className="auth-title">Get started with CloudDuty</h2>
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

          <div className="auth-divider">or create with email</div>

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

              <button className="auth-primary" type="submit" disabled={loading}>
                {loading ? "Saving..." : "Finish setup"}
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
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </label>
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
              <label className="auth-label">
                Password
                <input
                  className="auth-input"
                  type="password"
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </label>
              <button className="auth-primary" type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create account"}
              </button>
            </form>
          )}

          {message ? <p className="auth-message">{message}</p> : null}
          {error ? <p className="auth-error">{error}</p> : null}

          <p className="auth-hint">
            By continuing you agree to CloudDuty&apos;s Terms of Service and Privacy Policy.
          </p>
        </section>
      </div>
    </div>
  );
}
