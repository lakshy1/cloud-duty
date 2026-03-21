"use client";

import { AppShell } from "../components/AppShell";

export default function SettingsPage() {
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
            <div>
              <p className="page-label">Theme</p>
              <p className="page-value">
                Use the switch in the top bar to change between Minimal and Obsidian.
              </p>
            </div>
            <div>
              <p className="page-label">Notifications</p>
              <p className="page-value">Coming soon — we’ll add granular controls here.</p>
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
