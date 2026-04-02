"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { AppShell } from "../components/AppShell";
import { useTheme } from "../theme-provider";
import { getSupabaseBrowserClient } from "../lib/supabase/client";
import { useUIState } from "../state/ui-state";

export default function SettingsPage() {
  const { theme, toggleTheme, mounted } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [securityBusy, setSecurityBusy] = useState<{
    reset: boolean;
    signout: boolean;
    del: boolean;
  }>({ reset: false, signout: false, del: false });
  const { pushToast } = useUIState();

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
        setEditName(derivedName ?? "");
        setEditEmail(u.email ?? "");
        setEditPhone(m.phone ?? "");
        supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", u.id)
          .maybeSingle()
          .then(({ data: pd }) => {
            if (pd?.full_name) {
              setFullName(pd.full_name);
              setEditName(pd.full_name);
            }
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

  const handleSave = useCallback(async () => {
    if (!user) return;
    setSaving(true);
    setStatus(null);
    const supabase = getSupabaseBrowserClient();
    try {
      const updates = {
        full_name: editName || null,
        phone: editPhone || null,
      };
      const { error: metaError } = await supabase.auth.updateUser({
        data: updates,
      });
      if (metaError) throw metaError;

      await supabase
        .from("profiles")
        .update({ full_name: editName || null })
        .eq("user_id", user.id);

      if (editEmail && editEmail !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: editEmail,
        });
        if (emailError) throw emailError;
        setStatus("Check your inbox to confirm the new email address.");
      } else {
        setStatus("Account details updated.");
      }
      setFullName(editName || null);
      setEditMode(false);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Unable to update account.");
    } finally {
      setSaving(false);
    }
  }, [editEmail, editName, editPhone, user]);

  const handlePasswordReset = useCallback(async () => {
    if (!user?.email) return;
    setSecurityBusy((prev) => ({ ...prev, reset: true }));
    setStatus(null);
    const supabase = getSupabaseBrowserClient();
    const redirectTo = `${window.location.origin}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, { redirectTo });
    if (error) {
      pushToast({ tone: "error", message: error.message });
    } else {
      pushToast({ tone: "success", message: "Password reset email sent." });
    }
    setSecurityBusy((prev) => ({ ...prev, reset: false }));
  }, [pushToast, user]);

  const handleSignOutOthers = useCallback(async () => {
    setSecurityBusy((prev) => ({ ...prev, signout: true }));
    setStatus(null);
    const supabase = getSupabaseBrowserClient();
    try {
      const { error } = await supabase.auth.signOut({ scope: "others" });
      if (error) throw error;
      pushToast({ tone: "success", message: "Signed out of other sessions." });
    } catch (err) {
      pushToast({
        tone: "error",
        message: err instanceof Error ? err.message : "Unable to sign out other sessions.",
      });
    } finally {
      setSecurityBusy((prev) => ({ ...prev, signout: false }));
    }
  }, [pushToast]);

  const handleDeleteAccount = useCallback(async () => {
    if (!user) return;
    setSecurityBusy((prev) => ({ ...prev, del: true }));
    setStatus(null);
    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Unable to delete account.");
      }
      pushToast({ tone: "success", message: "Account deleted. Signing out..." });
      await getSupabaseBrowserClient().auth.signOut();
      window.location.href = "/";
    } catch (err) {
      pushToast({
        tone: "error",
        message: err instanceof Error ? err.message : "Unable to delete account.",
      });
    } finally {
      setSecurityBusy((prev) => ({ ...prev, del: false }));
      setDeleteOpen(false);
    }
  }, [pushToast, user]);

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

        {/* Account Information */}
        <section className="page-card stgs-card">
          <div className="stgs-section-head">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
            <h2 className="stgs-section-title">Account Information</h2>
            {!editMode ? (
              <button className="stgs-action" type="button" onClick={() => setEditMode(true)}>
                Edit
              </button>
            ) : null}
          </div>
          <div className="stgs-field-grid">
            <div className="stgs-field">
              <p className="stgs-label">Full Name</p>
              {editMode ? (
                <input
                  className="stgs-input"
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  placeholder="Your name"
                />
              ) : (
                <p className="stgs-value">{fullName || "Not set"}</p>
              )}
            </div>
            <div className="stgs-field">
              <p className="stgs-label">Email Address</p>
              {editMode ? (
                <input
                  className="stgs-input"
                  type="email"
                  value={editEmail}
                  onChange={(event) => setEditEmail(event.target.value)}
                  placeholder="you@company.com"
                />
              ) : (
                <p className="stgs-value">{user?.email ?? "Not set"}</p>
              )}
            </div>
            <div className="stgs-field">
              <p className="stgs-label">Phone Number</p>
              {editMode ? (
                <input
                  className="stgs-input"
                  type="tel"
                  value={editPhone}
                  onChange={(event) => setEditPhone(event.target.value)}
                  placeholder="(555) 123-4567"
                />
              ) : (
                <p className="stgs-value">{phone || "Not set"}</p>
              )}
            </div>
            <div className="stgs-field">
              <p className="stgs-label">Sign-in Method</p>
              <p className="stgs-value">
                <span className="stgs-badge">{provider}</span>
              </p>
            </div>
          </div>
          <div className="stgs-actions">
            {editMode ? (
              <>
                <button
                  className="stgs-primary"
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save changes"}
                </button>
                <button
                  className="stgs-secondary"
                  type="button"
                  onClick={() => {
                    setEditMode(false);
                    setEditName(fullName ?? "");
                    setEditEmail(user?.email ?? "");
                    setEditPhone(phone ?? "");
                  }}
                >
                  Cancel
                </button>
              </>
            ) : null}
          </div>
          {status ? <div className="stgs-status">{status}</div> : null}
          <p className="stgs-footer-note">
            To update your name or profile photo, visit your{" "}
            <a href="/profile" className="stgs-link">
              Profile page
            </a>
            .
          </p>
        </section>

        {/* Appearance */}
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

        {/* Notifications */}
        <section className="page-card stgs-card">
          <div className="stgs-section-head">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <h2 className="stgs-section-title">Notifications</h2>
          </div>
          <div className="stgs-toggle-grid">
            <label className="stgs-toggle">
              <input type="checkbox" disabled />
              <span className="stgs-toggle-ui" />
              <span className="stgs-toggle-text">Email alerts (coming soon)</span>
            </label>
            <label className="stgs-toggle">
              <input type="checkbox" disabled />
              <span className="stgs-toggle-ui" />
              <span className="stgs-toggle-text">Push notifications (coming soon)</span>
            </label>
          </div>
        </section>

        {/* Security */}
        <section className="page-card stgs-card">
          <div className="stgs-section-head">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <h2 className="stgs-section-title">Security</h2>
          </div>
          <div className="stgs-security-grid">
            <button
              className="stgs-primary"
              type="button"
              onClick={handlePasswordReset}
              disabled={securityBusy.reset || !user?.email}
            >
              {securityBusy.reset ? "Sending..." : "Send password reset"}
            </button>
            <button
              className="stgs-secondary"
              type="button"
              onClick={handleSignOutOthers}
              disabled={securityBusy.signout}
            >
              {securityBusy.signout ? "Working..." : "Sign out other sessions"}
            </button>
            <button
              className="stgs-danger"
              type="button"
              onClick={() => setDeleteOpen(true)}
              disabled={securityBusy.del}
            >
              {securityBusy.del ? "Deleting..." : "Delete account"}
            </button>
          </div>
          <div className="stgs-toggle-grid">
            <label className="stgs-toggle">
              <input type="checkbox" disabled />
              <span className="stgs-toggle-ui" />
              <span className="stgs-toggle-text">Two-factor authentication (coming soon)</span>
            </label>
            <label className="stgs-toggle">
              <input type="checkbox" disabled />
              <span className="stgs-toggle-ui" />
              <span className="stgs-toggle-text">Login alerts (coming soon)</span>
            </label>
          </div>
        </section>
      </div>

      {deleteOpen ? (
        <div
          className="delete-overlay"
          role="dialog"
          aria-modal="true"
          onClick={(event) => {
            if (event.target === event.currentTarget) setDeleteOpen(false);
          }}
        >
          <div className="delete-panel">
            <div className="delete-head">
              <div>
                <div className="delete-title">Delete account</div>
                <div className="delete-subtitle">This action is permanent and cannot be undone.</div>
              </div>
              <button className="delete-close" type="button" onClick={() => setDeleteOpen(false)}>
                <svg viewBox="0 0 24 24">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="delete-body">
              <div className="delete-preview">
                <div className="delete-preview-title">{user?.email ?? "Your account"}</div>
                <div className="delete-preview-date">Account removal</div>
              </div>
              <div className="delete-actions">
                <button className="delete-secondary" type="button" onClick={() => setDeleteOpen(false)}>
                  Cancel
                </button>
                <button
                  className="delete-primary"
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={securityBusy.del}
                >
                  {securityBusy.del ? "Deleting..." : "Delete account"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
