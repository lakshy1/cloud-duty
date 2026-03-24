"use client";

import { AppShell } from "../components/AppShell";
import { useTheme } from "../theme-provider";

export default function SettingsPage() {
  const { theme, toggleTheme, mounted } = useTheme();

  return (
    <AppShell>
      <div className="page-shell">
        <section className="page-hero">
          <p className="page-kicker">Settings</p>
          <h1 className="page-title">Workspace preferences</h1>
          <p className="page-subtitle">
            Update your experience, notifications, and privacy defaults.
          </p>
        </section>

        <section className="page-card">
          <div className="page-row">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p className="page-label">Theme Toggle</p>
                <p className="page-value">Switch between Minimal and Obsidian themes.</p>
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
            <div>
              <p className="page-label">Notifications</p>
              <p className="page-value">Coming soon — we'll add granular controls here.</p>
            </div>
            <div>
              <p className="page-label">Security</p>
              <p className="page-value">Enable multi-factor authentication (planned).</p>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
