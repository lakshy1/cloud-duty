"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useEffect,
  useRef,
} from "react";
import { getSupabaseBrowserClient } from "../lib/supabase/client";

export type Toast = {
  id: string;
  message: string;
  tone?: "info" | "success" | "warning" | "error";
};

type UIState = {
  drawerOpen: boolean;
  popupOpen: boolean;
  popupIndex: number | null;
  reportOpen: boolean;
  reportCardIndex: number | null;
  createOpen: boolean;
  createdPost: import("../data/card-data").CardData | null;
  searchQuery: string;
  toasts: Toast[];
  isLoggedIn: boolean | null;
  loginPromptOpen: boolean;
  hasUnreadNotifications: boolean;
  setDrawerOpen: (open: boolean) => void;
  setPopupOpen: (open: boolean) => void;
  setPopupIndex: (index: number | null) => void;
  setReportOpen: (open: boolean) => void;
  setReportCardIndex: (index: number | null) => void;
  setCreateOpen: (open: boolean) => void;
  setCreatedPost: (post: import("../data/card-data").CardData | null) => void;
  setSearchQuery: (value: string) => void;
  pushToast: (toast: Omit<Toast, "id"> & { id?: string }) => void;
  removeToast: (id: string) => void;
  setIsLoggedIn: (v: boolean | null) => void;
  setLoginPromptOpen: (open: boolean) => void;
  setHasUnreadNotifications: (value: boolean) => void;
};

const UIStateContext = createContext<UIState | null>(null);

export function UIStateProvider({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupIndex, setPopupIndex] = useState<number | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportCardIndex, setReportCardIndex] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createdPost, setCreatedPost] = useState<import("../data/card-data").CardData | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const lastNotifToastRef = useRef<string | null>(null);

  const buildNotificationToast = useCallback((row: {
    type?: string | null;
    message?: string | null;
    actorName?: string | null;
  }) => {
    const actor = row.actorName?.trim() || "Someone";
    const type = row.type ?? "notification";
    switch (type) {
      case "like":
        return { message: `${actor} liked your post.`, tone: "success" as const };
      case "unlike":
        return { message: `${actor} removed a like from your post.`, tone: "info" as const };
      case "dislike":
        return { message: `${actor} disliked your post.`, tone: "warning" as const };
      case "save":
        return { message: `${actor} saved your post.`, tone: "success" as const };
      case "unsave":
        return { message: `${actor} removed your post from saved.`, tone: "info" as const };
      case "follow":
        return { message: `${actor} started following you.`, tone: "success" as const };
      case "unfollow":
        return { message: `${actor} unfollowed you.`, tone: "warning" as const };
      default:
        return {
          message: row.message?.trim() || "You have a new notification.",
          tone: "info" as const,
        };
    }
  }, []);

  const playNotificationPing = useCallback((type?: string | null) => {
    if (!type) return;
    if (!["message", "like", "unlike", "follow", "unfollow"].includes(type)) return;
    try {
      const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.value = 0.0001;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      const now = ctx.currentTime;
      gain.gain.exponentialRampToValueAtTime(0.15, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
      osc.stop(now + 0.28);
      osc.onended = () => {
        ctx.close();
      };
    } catch {
      // ignore audio errors
    }
  }, []);

  const pushToast = useCallback((toast: Omit<Toast, "id"> & { id?: string }) => {
    const id = toast.id ?? crypto.randomUUID();
    setToasts((prev) => [...prev, { ...toast, id }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value = useMemo<UIState>(
    () => ({
      drawerOpen,
      popupOpen,
      popupIndex,
      reportOpen,
      reportCardIndex,
      createOpen,
      createdPost,
      searchQuery,
      toasts,
      isLoggedIn,
      loginPromptOpen,
      hasUnreadNotifications,
      setDrawerOpen,
      setPopupOpen,
      setPopupIndex,
      setReportOpen,
      setReportCardIndex,
      setCreateOpen,
      setCreatedPost,
      setSearchQuery,
      pushToast,
      removeToast,
      setIsLoggedIn,
      setLoginPromptOpen,
      setHasUnreadNotifications,
    }),
    [
      drawerOpen,
      popupOpen,
      popupIndex,
      reportOpen,
      reportCardIndex,
      createOpen,
      createdPost,
      searchQuery,
      toasts,
      isLoggedIn,
      loginPromptOpen,
      hasUnreadNotifications,
      pushToast,
      removeToast,
    ]
  );

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let active = true;

    const loadNotifications = async () => {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user.id;
      if (!userId) {
        if (active) setHasUnreadNotifications(false);
        return;
      }
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .is("read_at", null);
      if (active) setHasUnreadNotifications((count ?? 0) > 0);

      channel = supabase
        .channel("notifications-realtime")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
          async (payload) => {
            setHasUnreadNotifications(true);
            const row = payload.new as {
              message?: string | null;
              created_at?: string | null;
              actor_id?: string | null;
              type?: string | null;
            };
            const createdAt = row?.created_at ?? null;
            if (createdAt && lastNotifToastRef.current === createdAt) return;
            if (createdAt) lastNotifToastRef.current = createdAt;
            let actorName: string | null = null;
            if (row.actor_id) {
              const { data: profile } = await supabase
                .from("profiles")
                .select("full_name, username")
                .eq("user_id", row.actor_id)
                .maybeSingle();
              actorName =
                profile?.full_name ||
                (profile?.username ? `@${profile.username}` : null);
            }
            const toast = buildNotificationToast({
              type: row.type,
              message: row.message,
              actorName,
            });
            playNotificationPing(row.type);
            pushToast(toast);
          }
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
          (payload) => {
            if (payload.new && (payload.new as { read_at?: string | null }).read_at === null) {
              setHasUnreadNotifications(true);
            }
          }
        )
        .subscribe();

      pollTimer = setInterval(async () => {
        const { count: nextCount } = await supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .is("read_at", null);
        if (active) setHasUnreadNotifications((nextCount ?? 0) > 0);
      }, 20000);
    };

    loadNotifications();
    return () => {
      active = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [buildNotificationToast, pushToast]);

  return <UIStateContext.Provider value={value}>{children}</UIStateContext.Provider>;
}

export function useUIState() {
  const ctx = useContext(UIStateContext);
  if (!ctx) {
    throw new Error("useUIState must be used within UIStateProvider");
  }
  return ctx;
}
