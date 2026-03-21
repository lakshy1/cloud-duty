"use client";

import { AppShell } from "../components/AppShell";

const mockNotifs = [
  { id: "n1", title: "New like", body: "Aarav liked your post.", time: "2m" },
  { id: "n2", title: "New follower", body: "Meera started following you.", time: "1h" },
  { id: "n3", title: "Post saved", body: "Dev Ops Team saved your post.", time: "Yesterday" },
];

export default function NotificationsPage() {
  return (
    <AppShell>
      <div className="page-shell">
        <section className="page-hero">
          <p className="page-kicker">Activity</p>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">Recent updates from your workspace.</p>
        </section>

        <section className="page-card notif-card">
          {mockNotifs.map((item) => (
            <div className="notif-item" key={item.id}>
              <div>
                <div className="notif-title">{item.title}</div>
                <div className="notif-body">{item.body}</div>
              </div>
              <div className="notif-time">{item.time}</div>
            </div>
          ))}
        </section>
      </div>
    </AppShell>
  );
}
