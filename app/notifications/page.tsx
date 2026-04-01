"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "../components/AppShell";
import { Skeleton } from "../components/Skeleton";
import { getSupabaseBrowserClient } from "../lib/supabase/client";

type NotificationRow = {
  id: string;
  user_id: string;
  actor_id: string | null;
  type: string;
  entity_type: string | null;
  entity_id: string | null;
  message: string | null;
  created_at: string;
  read_at: string | null;
  metadata: Record<string, unknown> | null;
};

type ActorProfile = {
  user_id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

function formatRelativeTime(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  const minutes = Math.floor(diff / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function buildTitle(type: string) {
  switch (type) {
    case "follow":
      return "New follower";
    case "unfollow":
      return "Follower update";
    case "like":
      return "Post liked";
    case "unlike":
      return "Like removed";
    case "dislike":
      return "Post disliked";
    case "save":
      return "Post saved";
    case "unsave":
      return "Save removed";
    default:
      return "Notification";
  }
}

export default function NotificationsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const profilesRef = useRef(new Map<string, ActorProfile>());
  const [profileTick, setProfileTick] = useState(0);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user.id ?? null);
    });
  }, []);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    const supabase = getSupabaseBrowserClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("notifications")
        .select(
          "id,user_id,actor_id,type,entity_type,entity_id,message,created_at,read_at,metadata"
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (!active) return;
      const rows = (data ?? []) as NotificationRow[];
      setItems(rows);
      setLoading(false);

      const actorIds = Array.from(
        new Set(rows.map((row) => row.actor_id).filter(Boolean) as string[])
      );
      if (actorIds.length) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, username, full_name, avatar_url")
          .in("user_id", actorIds);
        (profiles ?? []).forEach((profile) => {
          profilesRef.current.set(profile.user_id, profile as ActorProfile);
        });
        setProfileTick((prev) => prev + 1);
      }

      await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("user_id", userId)
        .is("read_at", null);

      channel = supabase
        .channel("notifications-page")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
          async (payload) => {
            const next = payload.new as NotificationRow;
            setItems((prev) => [next, ...prev]);
            if (next.actor_id && !profilesRef.current.has(next.actor_id)) {
              const { data: profile } = await supabase
                .from("profiles")
                .select("user_id, username, full_name, avatar_url")
                .eq("user_id", next.actor_id)
                .maybeSingle();
              if (profile) {
                profilesRef.current.set(profile.user_id, profile as ActorProfile);
                setProfileTick((prev) => prev + 1);
              }
            }
            await supabase
              .from("notifications")
              .update({ read_at: new Date().toISOString() })
              .eq("id", next.id);
          }
        )
        .subscribe();
    };

    load();
    return () => {
      active = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [userId]);

  const displayItems = useMemo(
    () =>
      items.map((item) => {
        const actor = item.actor_id ? profilesRef.current.get(item.actor_id) : undefined;
        const actorName =
          actor?.full_name ||
          (actor?.username ? `@${actor.username}` : null) ||
          "Someone";
        const message = item.message || "updated your activity.";
        return {
          ...item,
          actor,
          actorName,
          body: `${actorName} ${message}`,
          title: buildTitle(item.type),
          time: formatRelativeTime(item.created_at),
        };
      }),
    [items, profileTick]
  );

  return (
    <AppShell>
      <div className="page-shell">
        <section className="page-hero">
          <p className="page-kicker">Activity</p>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">Real-time updates from your workspace.</p>
        </section>

        <section className="page-card notif-card">
          {loading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <div className="notif-item" key={`sk-notif-${index}`}>
                <div className="notif-left">
                  <div className="notif-avatar">
                    <Skeleton className="skeleton-circle" />
                  </div>
                  <div className="notif-content">
                    <Skeleton className="skeleton-line skeleton-w-40" />
                    <Skeleton className="skeleton-line sm skeleton-w-80" />
                  </div>
                </div>
                <Skeleton className="skeleton-line sm skeleton-w-30" />
              </div>
            ))
          ) : displayItems.length ? (
            displayItems.map((item) => (
              <div className={`notif-item${item.read_at ? "" : " unread"}`} key={item.id}>
                <div className="notif-left">
                  <div className="notif-avatar">
                    {item.actor?.avatar_url ? (
                      <img src={item.actor.avatar_url} alt={item.actorName} />
                    ) : (
                      <span>{item.actorName[0]?.toUpperCase()}</span>
                    )}
                  </div>
                  <div className="notif-content">
                    <div className="notif-title-row">
                      {!item.read_at ? <span className="notif-dot" aria-hidden="true" /> : null}
                      <div className="notif-title">{item.title}</div>
                    </div>
                    <div className="notif-body">{item.body}</div>
                  </div>
                </div>
                <div className="notif-time">{item.time}</div>
              </div>
            ))
          ) : (
            <div className="notif-empty">No notifications yet.</div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
