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
          (payload) => {
            setHasUnreadNotifications(true);
            const row = payload.new as { message?: string | null; created_at?: string | null };
            const createdAt = row?.created_at ?? null;
            if (createdAt && lastNotifToastRef.current === createdAt) return;
            if (createdAt) lastNotifToastRef.current = createdAt;
            const message =
              row?.message && row.message.trim()
                ? row.message
                : "You have a new notification.";
            pushToast({ message, tone: "info" });
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
  }, [pushToast]);

  return <UIStateContext.Provider value={value}>{children}</UIStateContext.Provider>;
}

export function useUIState() {
  const ctx = useContext(UIStateContext);
  if (!ctx) {
    throw new Error("useUIState must be used within UIStateProvider");
  }
  return ctx;
}
