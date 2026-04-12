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
import { usePathname } from "next/navigation";
import { getSupabaseBrowserClient } from "../lib/supabase/client";
import { Capacitor } from "@capacitor/core";

export type Toast = {
  id: string;
  title?: string;
  message: string;
  detail?: string;
  tone?: "info" | "success" | "warning" | "error";
  target?: "notifications" | "inbox";
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
  inboxUnreadCount: number;
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
  setInboxUnreadCount: (value: number) => void;
};

const UIStateContext = createContext<UIState | null>(null);

export function UIStateProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const notificationsActive = pathname?.startsWith("/notifications") ?? false;
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
  const [inboxUnreadCount, setInboxUnreadCount] = useState(0);
  const inboxRefreshRef = useRef<() => void>(() => {});
  const notificationsActiveRef = useRef(false);
  const lastNotifToastRef = useRef<string | null>(null);
  const lastMessageToastRef = useRef<string | null>(null);
  const inboxUserIdRef = useRef<string | null>(null);

  const buildNotificationToast = useCallback((row: {
    type?: string | null;
    message?: string | null;
    actorName?: string | null;
    preview?: string | null;
  }) => {
    const actor = row.actorName?.trim() || "Someone";
    const type = row.type ?? "notification";
    switch (type) {
      case "like":
        return { title: actor, message: "liked your post", tone: "success" as const, target: "notifications" as const };
      case "unlike":
        return { title: actor, message: "removed a like from your post", tone: "info" as const, target: "notifications" as const };
      case "dislike":
        return { title: actor, message: "disliked your post", tone: "warning" as const, target: "notifications" as const };
      case "save":
        return { title: actor, message: "saved your post", tone: "success" as const, target: "notifications" as const };
      case "unsave":
        return { title: actor, message: "removed your post from saved", tone: "info" as const, target: "notifications" as const };
      case "follow":
        return { title: actor, message: "started following you", tone: "success" as const, target: "notifications" as const };
      case "unfollow":
        return { title: actor, message: "unfollowed you", tone: "warning" as const, target: "notifications" as const };
      case "message":
        return {
          title: actor,
          message: "sent you a message",
          detail: row.preview?.trim() || row.message?.trim() || "",
          tone: "info" as const,
          target: "inbox" as const,
        };
      default:
        return {
          title: actor,
          message: row.message?.trim() || "You have a new notification.",
          tone: "info" as const,
          target: "notifications" as const,
        };
    }
  }, []);

  const buildMessageToast = useCallback(
    (row: { body?: string | null; attachment_name?: string | null; senderName?: string | null }) => {
      const actor = row.senderName?.trim() || "Someone";
      const body = row.body?.trim() || "";
      const attachment = row.attachment_name?.trim() || "";
      const detail = body || (attachment ? `Attachment: ${attachment}` : "");
      return {
        title: actor,
        message: body ? "sent you a message" : "sent you an attachment",
        detail,
        tone: "info" as const,
        target: "inbox" as const,
      };
    },
    []
  );

  const playNotificationPing = useCallback((type?: string | null) => {
    if (!type) return;
    if (!["message", "like", "unlike", "follow", "unfollow"].includes(type)) return;
    try {
      const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      osc1.type = "triangle";
      osc2.type = "sine";
      osc1.frequency.value = 960;
      osc2.frequency.value = 1280;
      gain.gain.value = 0.0001;
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      osc1.start();
      osc2.start();
      const now = ctx.currentTime;
      gain.gain.exponentialRampToValueAtTime(0.55, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.18, now + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
      osc1.stop(now + 0.3);
      osc2.stop(now + 0.3);
      osc2.onended = () => {
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
      inboxUnreadCount,
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
      setInboxUnreadCount,
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
      inboxUnreadCount,
      pushToast,
      removeToast,
    ]
  );

  useEffect(() => {
    notificationsActiveRef.current = notificationsActive;
    if (notificationsActive) {
      setHasUnreadNotifications(false);
    }
  }, [notificationsActive]);

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
        .neq("type", "message")
        .is("read_at", null);
      if (active) setHasUnreadNotifications(notificationsActiveRef.current ? false : (count ?? 0) > 0);

      channel = supabase
        .channel("notifications-realtime")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
          async (payload) => {
            const row = payload.new as {
              message?: string | null;
              created_at?: string | null;
              actor_id?: string | null;
              type?: string | null;
            };
            if (row.type === "message") return;
            if (!notificationsActiveRef.current) {
              setHasUnreadNotifications(true);
            }
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
              preview: (payload.new as { metadata?: { preview?: string | null } | null })?.metadata?.preview,
            });
            playNotificationPing(row.type);
            if (Capacitor.isNativePlatform()) {
              const { LocalNotifications } = await import("@capacitor/local-notifications");
              await LocalNotifications.schedule({
                notifications: [{
                  id: Date.now(),
                  title: toast.title ?? "Reading Queue",
                  body: toast.message,
                }],
              }).catch(() => {});
            } else {
              pushToast(toast);
            }
          }
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
          (payload) => {
            if (
              payload.new &&
              (payload.new as { read_at?: string | null; type?: string | null }).read_at === null &&
              (payload.new as { type?: string | null }).type !== "message"
            ) {
              if (!notificationsActiveRef.current) {
                setHasUnreadNotifications(true);
              }
            }
          }
        )
        .subscribe();

      pollTimer = setInterval(async () => {
        const { count: nextCount } = await supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .neq("type", "message")
          .is("read_at", null);
        if (active) setHasUnreadNotifications(notificationsActiveRef.current ? false : (nextCount ?? 0) > 0);
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
  }, [buildNotificationToast, playNotificationPing, pushToast]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let messageChannel: ReturnType<typeof supabase.channel> | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    const chatKeyRef = { current: "" };

    const loadInboxUnread = async () => {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user.id;
      if (!userId) {
        if (active) setInboxUnreadCount(0);
        return [];
      }
      inboxUserIdRef.current = userId;
      const { data: chats } = await supabase
        .from("chats")
        .select("id,user_a,user_b")
        .or(`user_a.eq.${userId},user_b.eq.${userId}`);
      const chatIds = (chats ?? []).map((chat) => chat.id);
      if (chatIds.length === 0) {
        if (active) setInboxUnreadCount(0);
        return chatIds;
      }
      const { data: unreadRows } = await supabase
        .from("chat_messages")
        .select("chat_id,sender_id,read_at")
        .in("chat_id", chatIds)
        .is("read_at", null)
        .neq("sender_id", userId);
      const unreadChatIds = new Set((unreadRows ?? []).map((row) => row.chat_id).filter(Boolean));
      if (active) setInboxUnreadCount(unreadChatIds.size);
      return chatIds;
    };
    inboxRefreshRef.current = () => {
      loadInboxUnread();
    };

    const syncInboxRealtime = async () => {
      const chatIds = await loadInboxUnread();
      if (!active) return;
      const nextKey = [...chatIds].sort().join(",");
      if (nextKey === chatKeyRef.current) return;
      chatKeyRef.current = nextKey;

      if (channel) {
        supabase.removeChannel(channel);
        channel = null;
      }
      if (messageChannel) {
        supabase.removeChannel(messageChannel);
        messageChannel = null;
      }
      if (chatIds.length === 0) return;

      channel = supabase
        .channel("inbox-unread-realtime")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "chat_messages",
            filter: `chat_id=in.(${chatIds.join(",")})`,
          },
          loadInboxUnread
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "chat_messages",
            filter: `chat_id=in.(${chatIds.join(",")})`,
          },
          loadInboxUnread
        )
        .subscribe();

      messageChannel = supabase
        .channel("inbox-message-toast")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "chat_messages",
            filter: `chat_id=in.(${chatIds.join(",")})`,
          },
          async (payload) => {
            const row = payload.new as {
              id?: string | null;
              chat_id?: string | null;
              sender_id?: string | null;
              body?: string | null;
              attachment_name?: string | null;
            };
            if (!row || !row.sender_id) return;
            if (row.sender_id === inboxUserIdRef.current) return;
            if (row.id && lastMessageToastRef.current === row.id) return;
            if (row.id) lastMessageToastRef.current = row.id;
            let senderName: string | null = null;
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name, username")
              .eq("user_id", row.sender_id)
              .maybeSingle();
            senderName =
              profile?.full_name ||
              (profile?.username ? `@${profile.username}` : null);
            const toast = buildMessageToast({
              body: row.body,
              attachment_name: row.attachment_name ?? null,
              senderName,
            });
            playNotificationPing("message");
            if (Capacitor.isNativePlatform()) {
              const { LocalNotifications } = await import("@capacitor/local-notifications");
              await LocalNotifications.schedule({
                notifications: [{
                  id: Date.now(),
                  title: toast.title ?? "Reading Queue",
                  body: toast.message,
                }],
              }).catch(() => {});
            } else {
              pushToast(toast);
            }
          }
        )
        .subscribe();
    };

    const setupInboxRealtime = async () => {
      await syncInboxRealtime();
      pollTimer = setInterval(syncInboxRealtime, 20000);
    };

    setupInboxRealtime();
    return () => {
      active = false;
      if (channel) supabase.removeChannel(channel);
      if (messageChannel) supabase.removeChannel(messageChannel);
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [buildMessageToast, playNotificationPing, pushToast]);

  useEffect(() => {
    const handler = () => inboxRefreshRef.current?.();
    window.addEventListener("inbox-unread-refresh", handler);
    return () => window.removeEventListener("inbox-unread-refresh", handler);
  }, []);

  return <UIStateContext.Provider value={value}>{children}</UIStateContext.Provider>;
}

export function useUIState() {
  const ctx = useContext(UIStateContext);
  if (!ctx) {
    throw new Error("useUIState must be used within UIStateProvider");
  }
  return ctx;
}
