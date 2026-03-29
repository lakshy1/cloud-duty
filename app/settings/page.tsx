"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { AppShell } from "../components/AppShell";
import { useTheme } from "../theme-provider";
import { getSupabaseBrowserClient } from "../lib/supabase/client";

export default function SettingsPage() {
  const { theme, toggleTheme, mounted } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null;
      setUser(u);
      if (u) {
        const m = u.user_metadata ?? {};
        const derivedName =
          [m.first_name, m.last_name].filter(Boolean).join(" ") ||
          m.full_name ||
          m.name ||
          null;
        setFullName(derivedName);
        supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", u.id)
          .maybeSingle()
          .then(({ data: pd }) => {
            if (pd?.full_name) setFullName(pd.full_name);
          });
      }
    });
  }, []);

  const meta = user?.user_metadata ?? {};
  const phone: string | null = meta.phone ?? null;
  const provider: string = (() => {
    const p = meta.provider ?? meta.app_metadata?.provider ?? "";
    if (p === "google") return "Google";
    if (p === "github") return "GitHub";
    if (p === "email") return "Email & Password";
    return p || "Email & Password";
  })();

  return (
    <AppShell>
      <div className="page-shell">
        <section className="page-hero">
          <p className="page-kicker">Settings</p>
          <h1 className="page-title">Account Settings</h1>
          <p className="page-subtitle">
            Manage your account details, appearance, and security preferences.
          </p>
        </section>

        {/* ── Account Information ── */}
        <section className="page-card stgs-card">
          <div className="stgs-section-head">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
            <h2 className="stgs-section-title">Account Information</h2>
          </div>
          <div className="stgs-field-grid">
            <div className="stgs-field">
              <p className="stgs-label">Full Name</p>
              <p className="stgs-value">{fullName || "Not set"}</p>
            </div>
            <div className="stgs-field">
              <p className="stgs-label">Email Address</p>
              <p className="stgs-value">{user?.email ?? "—"}</p>
            </div>
            <div className="stgs-field">
              <p className="stgs-label">Phone Number</p>
              <p className="stgs-value">{phone || "Not set"}</p>
            </div>
            <div className="stgs-field">
              <p className="stgs-label">Sign-in Method</p>
              <p className="stgs-value">
                <span className="stgs-badge">{provider}</span>
              </p>
            </div>
          </div>
          <p className="stgs-footer-note">
            To update your name or profile photo, visit your{" "}
            <a href="/profile" className="stgs-link">
              Profile page
            </a>
            .
          </p>
        </section>

        {/* ── Appearance ── */}
        <section className="page-card stgs-card">
          <div className="stgs-section-head">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="4" />
              <line x1="12" y1="2" x2="12" y2="4" />
              <line x1="12" y1="20" x2="12" y2="22" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="2" y1="12" x2="4" y2="12" />
              <line x1="20" y1="12" x2="22" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
            <h2 className="stgs-section-title">Appearance</h2>
          </div>
          <div className="stgs-toggle-row">
            <div className="stgs-toggle-info">
              <p className="stgs-toggle-label">Theme</p>
              <p className="stgs-toggle-desc">
                Switch between <strong>Minimal</strong> (light) and{" "}
                <strong>Obsidian</strong> (dark) modes.
              </p>
            </div>
            <button
              className={`theme-slider${mounted && theme === "obsidian" ? " on" : ""}`}
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
        </section>

        {/* ── Notifications ── */}
        <section className="page-card stgs-card">
          <div className="stgs-section-head">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <h2 className="stgs-section-title">Notifications</h2>
          </div>
          <p className="stgs-soon">
            Granular notification controls — coming soon.
          </p>
        </section>

        {/* ── Security ── */}
        <section className="page-card stgs-card">
          <div className="stgs-section-head">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <h2 className="stgs-section-title">Security</h2>
          </div>
          <p className="stgs-soon">
            Password management and multi-factor authentication — coming soon.
          </p>
        </section>
      </div>
    </AppShell>
  );
}
