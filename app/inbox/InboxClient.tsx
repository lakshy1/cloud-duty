"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "../components/AppShell";
import { Icon } from "../components/Icon";
import { useUIState } from "../state/ui-state";
import { getSupabaseBrowserClient } from "../lib/supabase/client";
import { Skeleton } from "../components/Skeleton";

const AI_THREAD_ID = "ai";

type ChatAttachment = {
  name: string;
  size: number;
  type: string;
  preview?: string;
};

type AiMessage = {
  id: string;
  from: "me" | "them";
  text: string;
  createdAt: string;
  attachment?: ChatAttachment;
};

type ChatMessage = {
  id: string;
  sender_id: string;
  body: string | null;
  attachment_url?: string | null;
  attachment_name?: string | null;
  attachment_type?: string | null;
  attachment_size?: number | null;
  read_at?: string | null;
  read_by?: string | null;
  created_at: string;
  deleted_at: string | null;
  deleted_by: string | null;
};

type Thread = {
  id: string;
  type: "ai" | "chat";
  name: string;
  handle: string;
  avatarUrl?: string | null;
  last: string;
  time: string;
  timeSort?: string | null;
  chatId?: string;
  userId?: string;
  unreadCount?: number;
};

type MutualUser = {
  user_id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

const initialAiMessages: Record<string, AiMessage[]> = {
  [AI_THREAD_ID]: [
    {
      id: "m0",
      from: "them",
      text: "Hi! I'm CloudDuty AI. I can help summarize posts and find insights.",
      createdAt: new Date().toISOString(),
    },
  ],
};

export default function InboxClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { pushToast } = useUIState();
  const [activeThreadId, setActiveThreadId] = useState(AI_THREAD_ID);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [threadsLoading, setThreadsLoading] = useState(true);
  const [aiMessagesByThread, setAiMessagesByThread] = useState(initialAiMessages);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadLabel, setUploadLabel] = useState<string | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<{
    url: string;
    name: string;
    type?: string | null;
  } | null>(null);
  const [threadQuery, setThreadQuery] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [threadsReloadKey, setThreadsReloadKey] = useState(0);
  const [threadChatIds, setThreadChatIds] = useState<string[]>([]);
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [mutualLoading, setMutualLoading] = useState(false);
  const [mutualSearch, setMutualSearch] = useState("");
  const [mutualList, setMutualList] = useState<MutualUser[]>([]);
  const [threadMenuOpen, setThreadMenuOpen] = useState<string | null>(null);
  const [hiddenChatIds, setHiddenChatIds] = useState<Set<string>>(new Set());
  const [activeStats, setActiveStats] = useState<{ followers: number; following: number } | null>(
    null
  );
  const [messageMenuOpenId, setMessageMenuOpenId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const currentChatIdRef = useRef<string | null>(null);
  const threadsLoadedRef = useRef(false);
  const chatLoadedRef = useRef<Set<string>>(new Set());
  const chatLoadIdRef = useRef<string | null>(null);
  const chatCacheRef = useRef<Map<string, ChatMessage[]>>(new Map());
  const threadLongPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const threadLongPressFiredRef = useRef(false);
  const messageLongPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatBodyRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const threadMenuRef = useRef<HTMLDivElement | null>(null);
  const messageMenuRef = useRef<HTMLDivElement | null>(null);

  const isAiThread = activeThreadId === AI_THREAD_ID;

  useEffect(() => {
    const prev = document.body.dataset.route;
    document.body.dataset.route = "inbox";
    return () => {
      if (prev) {
        document.body.dataset.route = prev;
      } else {
        delete document.body.dataset.route;
      }
    };
  }, []);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  const formatDateLabel = (iso: string) => {
    const date = new Date(iso);
    const now = new Date();
    const isToday =
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate();
    if (isToday) return "Today";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  };

  const formatTimeSafe = (iso: string) => (hydrated ? formatTime(iso) : "");
  const formatDateLabelSafe = (iso: string) => (hydrated ? formatDateLabel(iso) : "");

  const formatSize = (bytes: number) => {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes} B`;
  };

  const startThreadLongPress = (threadId: string) => {
    threadLongPressFiredRef.current = false;
    if (threadLongPressTimerRef.current) clearTimeout(threadLongPressTimerRef.current);
    threadLongPressTimerRef.current = setTimeout(() => {
      threadLongPressFiredRef.current = true;
      setThreadMenuOpen(threadId);
    }, 520);
  };

  const cancelThreadLongPress = () => {
    if (threadLongPressTimerRef.current) {
      clearTimeout(threadLongPressTimerRef.current);
      threadLongPressTimerRef.current = null;
    }
  };

  const startMessageLongPress = (messageId: string, target: EventTarget | null) => {
    const element = target instanceof HTMLElement ? target : null;
    if (element?.closest(".inbox-attachment")) return;
    if (messageLongPressTimerRef.current) clearTimeout(messageLongPressTimerRef.current);
    messageLongPressTimerRef.current = setTimeout(() => {
      setMessageMenuOpenId((prev) => (prev === messageId ? null : messageId));
    }, 520);
  };

  const cancelMessageLongPress = () => {
    if (messageLongPressTimerRef.current) {
      clearTimeout(messageLongPressTimerRef.current);
      messageLongPressTimerRef.current = null;
    }
  };

  const filteredThreads = useMemo(() => {
    const q = threadQuery.trim().toLowerCase();
    return threads.filter((thread) => {
      if (thread.type === "chat" && thread.chatId && hiddenChatIds.has(thread.chatId)) {
        return false;
      }
      if (!q) return true;
      const name = thread.name.toLowerCase();
      const handle = thread.handle.toLowerCase();
      return name.includes(q) || handle.includes(q);
    });
  }, [threadQuery, threads, hiddenChatIds]);

  const filteredMutuals = useMemo(() => {
    const q = mutualSearch.trim().toLowerCase();
    if (!q) return mutualList;
    return mutualList.filter((user) => {
      const name = (user.full_name ?? "").toLowerCase();
      const username = (user.username ?? "").toLowerCase();
      return name.includes(q) || username.includes(q);
    });
  }, [mutualList, mutualSearch]);

  const activeThread = useMemo(
    () => threads.find((thread) => thread.id === activeThreadId) ?? null,
    [activeThreadId, threads]
  );
  const activeChatId = activeThread?.chatId ?? null;

  useEffect(() => {
    if (!threads.length) return;
    const exists = threads.some((thread) => thread.id === activeThreadId);
    if (!exists) {
      setActiveThreadId(threads[0].id);
    }
  }, [threads, activeThreadId]);

  const markThreadRead = useCallback(
    async (chatId?: string) => {
      if (!chatId || !userId) return;
      const supabase = getSupabaseBrowserClient();
      await supabase
        .from("chat_messages")
        .update({ read_at: new Date().toISOString(), read_by: userId })
        .eq("chat_id", chatId)
        .neq("sender_id", userId)
        .is("read_at", null);
      setThreads((prev) =>
        prev.map((thread) => (thread.chatId === chatId ? { ...thread, unreadCount: 0 } : thread))
      );
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("inbox-unread-refresh"));
      }
    },
    [userId]
  );

  const loadChatMessages = useCallback(
    async (chatId: string, silent = false) => {
      if (!userId) return;
      const supabase = getSupabaseBrowserClient();
      chatLoadIdRef.current = chatId;
      if (!silent && !chatLoadedRef.current.has(chatId)) {
        setChatLoading(true);
      }
      const { data } = await supabase
        .from("chat_messages")
        .select(
          "id,chat_id,sender_id,body,created_at,deleted_at,deleted_by,attachment_url,attachment_name,attachment_type,attachment_size,read_at,read_by"
        )
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true });
      if (chatLoadIdRef.current !== chatId) return;
      const nextMessages = (data ?? []) as ChatMessage[];
      chatCacheRef.current.set(chatId, nextMessages);
      setChatMessages(nextMessages);
      setChatLoading(false);
      chatLoadedRef.current.add(chatId);
      if ((data ?? []).length > 0) {
        markThreadRead(chatId);
      }
    },
    [markThreadRead, userId]
  );

  useEffect(() => {
    if (!activeThread?.id) return;
    setThreads((prev) =>
      prev.map((thread) =>
        thread.id === activeThread.id ? { ...thread, unreadCount: 0 } : thread
      )
    );
  }, [activeThread?.id]);

  const lastOutboundIndex = useMemo(() => {
    if (!chatMessages.length || !userId) return -1;
    let idx = -1;
    chatMessages.forEach((msg, index) => {
      if (msg.sender_id === userId) idx = index;
    });
    return idx;
  }, [chatMessages, userId]);

  const refreshActiveStats = useCallback(async () => {
    if (!activeThread?.userId) {
      setActiveStats(null);
      return;
    }
    const supabase = getSupabaseBrowserClient();
    const [followersRes, followingRes] = await Promise.all([
      supabase
        .from("follows")
        .select("follower_id", { count: "exact", head: true })
        .eq("following_id", activeThread.userId),
      supabase
        .from("follows")
        .select("following_id", { count: "exact", head: true })
        .eq("follower_id", activeThread.userId),
    ]);
    setActiveStats({
      followers: followersRes.count ?? 0,
      following: followingRes.count ?? 0,
    });
  }, [activeThread?.userId]);

  useEffect(() => {
    const container = chatBodyRef.current;
    if (!container) return;
    const scrollToBottom = () => {
      container.scrollTop = container.scrollHeight;
    };
    scrollToBottom();
    const raf = window.requestAnimationFrame(scrollToBottom);
    return () => window.cancelAnimationFrame(raf);
  }, [activeThreadId, chatMessages.length, aiMessagesByThread, isSending]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user.id ?? null);
    });
  }, []);

  useEffect(() => {
    if (!userId) return;
    const key = `inbox_hidden_chats_${userId}`;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setHiddenChatIds(new Set(parsed.filter((id) => typeof id === "string")));
        }
      }
    } catch {
      setHiddenChatIds(new Set());
    }
  }, [userId]);

  useEffect(() => {
    if (!threadMenuOpen) return;
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (threadMenuRef.current?.contains(target)) return;
      setThreadMenuOpen(null);
    };
    document.addEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("mousedown", handleClick);
    };
  }, [threadMenuOpen]);

  useEffect(() => {
    setThreadMenuOpen(null);
  }, [activeThreadId]);

  useEffect(() => {
    if (!messageMenuOpenId) return;
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (messageMenuRef.current?.contains(target)) return;
      if (target.closest(".inbox-msg-menu-btn")) return;
      setMessageMenuOpenId(null);
    };
    document.addEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("mousedown", handleClick);
    };
  }, [messageMenuOpenId]);


  useEffect(() => {
    const targetChat = searchParams.get("chat");
    if (!targetChat) return;
    const nextId = `chat-${targetChat}`;
    if (activeThreadId === nextId) return;
    setActiveThreadId(nextId);
    setShowChat(true);
  }, [searchParams, activeThreadId]);

  useEffect(() => {
    const loadThreads = async () => {
      if (!threadsLoadedRef.current) {
        setThreadsLoading(true);
      }
      const aiMessages = aiMessagesByThread[AI_THREAD_ID] ?? [];
      const aiLast = aiMessages[aiMessages.length - 1];
      const aiThread: Thread = {
        id: AI_THREAD_ID,
        type: "ai",
        name: "CloudDuty AI Bot",
        handle: "@cloudduty-ai",
        last: aiLast?.text ?? "Start a conversation",
        time: aiLast ? formatTimeSafe(aiLast.createdAt) : "",
      };

      if (!userId) {
        setThreads([aiThread]);
        setThreadsLoading(false);
        return;
      }

      const supabase = getSupabaseBrowserClient();
      const { data: chats } = await supabase
        .from("chats")
        .select("id,user_a,user_b,created_at")
        .or(`user_a.eq.${userId},user_b.eq.${userId}`)
        .order("created_at", { ascending: false });

      const chatRows = chats ?? [];
      const visibleChats = chatRows.filter((chat) => !hiddenChatIds.has(chat.id));
      const visibleChatIds = visibleChats.map((chat) => chat.id);
      setThreadChatIds(visibleChatIds);
      let unreadMap = new Map<string, number>();
      if (visibleChatIds.length > 0) {
        const { data: unreadRows } = await supabase
            .from("chat_messages")
            .select("chat_id,sender_id,read_at")
            .in("chat_id", visibleChatIds)
            .is("read_at", null)
            .neq("sender_id", userId);
        unreadRows?.forEach((row) => {
          if (!row.chat_id) return;
          unreadMap.set(row.chat_id, (unreadMap.get(row.chat_id) ?? 0) + 1);
        });
      }
      const otherIds = visibleChats.map((chat) => (chat.user_a === userId ? chat.user_b : chat.user_a));
      const { data: profiles } = otherIds.length
        ? await supabase
            .from("profiles")
            .select("user_id, username, full_name, avatar_url")
            .in("user_id", otherIds)
        : { data: [] };

      const profileMap = new Map(
        (profiles ?? []).map((p) => [p.user_id, p] as const)
      );

      const chatThreads: Thread[] = await Promise.all(
        visibleChats.map(async (chat) => {
          const otherId = chat.user_a === userId ? chat.user_b : chat.user_a;
          const profile = profileMap.get(otherId);
          const { data: lastRows } = await supabase
            .from("chat_messages")
            .select("body,created_at,deleted_at,deleted_by")
            .eq("chat_id", chat.id)
            .order("created_at", { ascending: false })
            .limit(1);
          const last = lastRows?.[0];
          const lastText = last?.deleted_at
            ? "This message was deleted."
            : last?.body || "Start chatting";
          const lastTime = last?.created_at ? formatTimeSafe(last.created_at) : "";
          return {
            id: `chat-${chat.id}`,
            type: "chat",
            name: profile?.full_name || profile?.username || "User",
            handle: profile?.username ? `@${profile.username}` : "@user",
            avatarUrl: profile?.avatar_url ?? null,
            last: lastText,
            time: lastTime,
            timeSort: last?.created_at || chat.created_at,
            chatId: chat.id,
            userId: otherId,
            unreadCount: unreadMap.get(chat.id) ?? 0,
          };
        })
      );

      const sortedChats = chatThreads.sort((a, b) =>
        (b.timeSort ?? "").localeCompare(a.timeSort ?? "")
      );
      setThreads([aiThread, ...sortedChats]);
      setThreadsLoading(false);
      threadsLoadedRef.current = true;
    };

    loadThreads();
  }, [aiMessagesByThread, userId, threadsReloadKey, hiddenChatIds]);

  const unreadThreadCount = useMemo(
    () => threads.reduce((acc, thread) => (thread.unreadCount && thread.unreadCount > 0 ? acc + 1 : acc), 0),
    [threads]
  );

  useEffect(() => {
    if (!userId || threadChatIds.length === 0) return;
    const supabase = getSupabaseBrowserClient();
    const handleThreadRefresh = () => {
      if (showChat) return;
      setThreadsReloadKey((prev) => prev + 1);
    };
    const channel = supabase
      .channel("inbox-thread-refresh")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `chat_id=in.(${threadChatIds.join(",")})`,
        },
        handleThreadRefresh
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_messages",
          filter: `chat_id=in.(${threadChatIds.join(",")})`,
        },
        handleThreadRefresh
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadChatIds, userId, showChat]);

  useEffect(() => {
    if (!activeChatId || !userId) {
      return;
    }

    const supabase = getSupabaseBrowserClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let active = true;

    const loadMessages = async () => {
      if (currentChatIdRef.current === activeChatId && chatLoadedRef.current.has(activeChatId)) {
        return;
      }
      currentChatIdRef.current = activeChatId;
      const cached = chatCacheRef.current.get(activeChatId);
      if (cached && cached.length) {
        setChatMessages(cached);
        setChatLoading(false);
        loadChatMessages(activeChatId, true);
        return;
      }
      await loadChatMessages(activeChatId, false);
    };

    loadMessages();

    channel = supabase
      .channel(`chat-${activeChatId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `chat_id=eq.${activeChatId}` },
        (payload) => {
          const nextMessage = payload.new as ChatMessage;
          setChatMessages((prev) => {
            const next = [...prev, nextMessage];
            if (activeChatId) {
              chatCacheRef.current.set(activeChatId, next);
            }
            return next;
          });
          if (nextMessage.sender_id !== userId) {
            supabase
              .from("chat_messages")
              .update({ read_at: new Date().toISOString(), read_by: userId })
              .eq("id", nextMessage.id);
            markThreadRead(activeChatId);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "chat_messages", filter: `chat_id=eq.${activeChatId}` },
        (payload) => {
          const updated = payload.new as ChatMessage;
          setChatMessages((prev) => {
            const next = prev.map((msg) => (msg.id === updated.id ? updated : msg));
            chatCacheRef.current.set(activeThread.chatId, next);
            return next;
          });
        }
      )
      .subscribe();

    markThreadRead(activeChatId);

    return () => {
      active = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [activeChatId, userId, showChat, loadChatMessages, markThreadRead]);

  useEffect(() => {
    if (!activeChatId || !userId) return;
    const hasUnreadIncoming = chatMessages.some(
      (msg) => msg.sender_id !== userId && !msg.read_at
    );
    if (!hasUnreadIncoming) return;
    markThreadRead(activeChatId);
  }, [chatMessages, activeChatId, userId, markThreadRead]);

  useEffect(() => {
    if (!activeThread?.userId) {
      setActiveStats(null);
      return;
    }
    refreshActiveStats();
    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel(`inbox-stats-${activeThread.userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "follows", filter: `following_id=eq.${activeThread.userId}` },
        refreshActiveStats
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "follows", filter: `following_id=eq.${activeThread.userId}` },
        refreshActiveStats
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "follows", filter: `follower_id=eq.${activeThread.userId}` },
        refreshActiveStats
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "follows", filter: `follower_id=eq.${activeThread.userId}` },
        refreshActiveStats
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeThread?.userId, refreshActiveStats]);

  useEffect(() => {
    if (!newModalOpen || !userId) return;
    let active = true;
    const loadMutuals = async () => {
      setMutualLoading(true);
      const supabase = getSupabaseBrowserClient();
      const [followingRes, followersRes] = await Promise.all([
        supabase.from("follows").select("following_id").eq("follower_id", userId),
        supabase.from("follows").select("follower_id").eq("following_id", userId),
      ]);
      const followingIds = new Set((followingRes.data ?? []).map((row) => row.following_id));
      const followerIds = new Set((followersRes.data ?? []).map((row) => row.follower_id));
      const mutualIds = Array.from(followingIds).filter((id) => followerIds.has(id));
      if (!active) return;
      if (mutualIds.length === 0) {
        setMutualList([]);
        setMutualLoading(false);
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("user_id, username, full_name, avatar_url")
        .in("user_id", mutualIds);
      if (!active) return;
      setMutualList((data ?? []) as MutualUser[]);
      setMutualLoading(false);
    };
    loadMutuals();
    return () => {
      active = false;
    };
  }, [newModalOpen, userId]);

  useEffect(() => {
    if (newModalOpen) return;
    setMutualSearch("");
    setMutualList([]);
  }, [newModalOpen]);

  const requestAiReply = async (threadId: string, threadMessages: AiMessage[]) => {
    try {
      const payloadMessages = threadMessages.map((msg) => ({
        role: msg.from === "me" ? "user" : "assistant",
        content:
          msg.attachment?.preview && msg.from === "me"
            ? `${msg.text}\n\nContent preview:\n${msg.attachment.preview}`
            : msg.text,
      }));

      const response = await fetch("/api/grok", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: payloadMessages }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const message = data?.error ?? "Sorry, the AI service is unavailable right now.";
        throw new Error(message);
      }

      const replyText =
        typeof data?.message === "string" && data.message.trim()
          ? data.message.trim()
          : "I'm here to help. What would you like to explore?";

      setAiMessagesByThread((prev) => ({
        ...prev,
        [threadId]: [
          ...(prev[threadId] ?? []),
          { id: `a-${Date.now()}`, from: "them", text: replyText, createdAt: new Date().toISOString() },
        ],
      }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong while contacting the AI.";
      setAiMessagesByThread((prev) => ({
        ...prev,
        [threadId]: [
          ...(prev[threadId] ?? []),
          {
            id: `e-${Date.now()}`,
            from: "them",
            text: `Sorry, I couldn't reach the AI service. ${message}`,
            createdAt: new Date().toISOString(),
          },
        ],
      }));
    } finally {
      setIsSending(false);
    }
  };

  const handleStartChat = async (targetId: string) => {
    if (!userId) return;
    const supabase = getSupabaseBrowserClient();
    const { data: existing } = await supabase
      .from("chats")
      .select("id,user_a,user_b")
      .or(
        `and(user_a.eq.${userId},user_b.eq.${targetId}),and(user_a.eq.${targetId},user_b.eq.${userId})`
      )
      .maybeSingle();
    let chatId = existing?.id;
    if (!chatId) {
      const [userA, userB] = [userId, targetId].sort();
      const { data: created, error } = await supabase
        .from("chats")
        .insert({ user_a: userA, user_b: userB })
        .select("id")
        .single();
      if (error || !created) {
        pushToast({ message: "Unable to start chat. Try again.", tone: "error" });
        return;
      }
      chatId = created.id;
    }
    const key = `inbox_hidden_chats_${userId}`;
    setHiddenChatIds((prev) => {
      if (!chatId) return prev;
      if (!prev.has(chatId)) return prev;
      const next = new Set(prev);
      next.delete(chatId);
      try {
        window.localStorage.setItem(key, JSON.stringify(Array.from(next)));
      } catch {
        // ignore storage errors
      }
      return next;
    });
    setThreadsReloadKey((prev) => prev + 1);
    setActiveThreadId(`chat-${chatId}`);
    setShowChat(true);
    setNewModalOpen(false);
    router.push(`/inbox?chat=${chatId}`);
  };

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || isSending) return;

    if (isAiThread) {
      const threadId = AI_THREAD_ID;
      const newMessage: AiMessage = {
        id: `m-${Date.now()}`,
        from: "me",
        text,
        createdAt: new Date().toISOString(),
      };
      const threadMessages = [...(aiMessagesByThread[threadId] ?? []), newMessage];
      setAiMessagesByThread((prev) => ({
        ...prev,
        [threadId]: threadMessages,
      }));
      setDraft("");
      setIsSending(true);
      await requestAiReply(threadId, threadMessages);
      return;
    }

    if (!activeThread || activeThread.type !== "chat" || !activeThread.chatId || !userId) return;
    setIsSending(true);

    const supabase = getSupabaseBrowserClient();
    let otherUserId = activeThread.userId ?? null;
    if (!otherUserId) {
      const { data: chatRow } = await supabase
        .from("chats")
        .select("user_a,user_b")
        .eq("id", activeThread.chatId)
        .maybeSingle();
      if (chatRow) {
        otherUserId = chatRow.user_a === userId ? chatRow.user_b : chatRow.user_a;
      }
    }
    const { count: mutualA } = await supabase
      .from("follows")
      .select("follower_id", { count: "exact", head: true })
      .eq("follower_id", userId)
      .eq("following_id", otherUserId ?? "");
    const { count: mutualB } = await supabase
      .from("follows")
      .select("follower_id", { count: "exact", head: true })
      .eq("follower_id", otherUserId ?? "")
      .eq("following_id", userId);
    const isMutual = (mutualA ?? 0) > 0 && (mutualB ?? 0) > 0;
    if (!isMutual) {
      pushToast({
        message: "You both need to follow each other to enable messaging.",
        tone: "warning",
      });
      setIsSending(false);
      return;
    }

    const { error } = await supabase.from("chat_messages").insert({
      chat_id: activeThread.chatId,
      sender_id: userId,
      body: text,
    });
    if (error) {
      pushToast({ message: error.message, tone: "error" });
    } else {
      setDraft("");
      // message notifications are handled via inbox unread state (no bell notifications)
    }
    setIsSending(false);
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!userId || !activeThread?.chatId) return;
    const supabase = getSupabaseBrowserClient();
    await supabase
      .from("chat_messages")
      .update({ deleted_at: new Date().toISOString(), deleted_by: userId })
      .eq("id", messageId)
      .eq("sender_id", userId);
  };

  const handleDeleteChat = async () => {
    if (!userId || !activeThread?.chatId) return;
    const supabase = getSupabaseBrowserClient();
    await supabase
      .from("chat_messages")
      .update({ deleted_at: new Date().toISOString(), deleted_by: userId })
      .eq("chat_id", activeThread.chatId)
      .eq("sender_id", userId);
  };

  const handleDeleteThread = async (thread: Thread) => {
    if (!userId || thread.type !== "chat" || !thread.chatId) return;
    const supabase = getSupabaseBrowserClient();
    await supabase
      .from("chat_messages")
      .update({ deleted_at: new Date().toISOString(), deleted_by: userId })
      .eq("chat_id", thread.chatId)
      .eq("sender_id", userId);
    const key = `inbox_hidden_chats_${userId}`;
    setHiddenChatIds((prev) => {
      const next = new Set(prev);
      next.add(thread.chatId as string);
      try {
        window.localStorage.setItem(key, JSON.stringify(Array.from(next)));
      } catch {
        // ignore storage errors
      }
      return next;
    });
    setThreads((prev) => prev.filter((item) => item.id !== thread.id));
    if (activeThreadId === thread.id) {
      setActiveThreadId(AI_THREAD_ID);
      setShowChat(false);
      router.replace("/inbox");
    }
  };

  const handleAttach = () => {
    if (isSending) return;
    fileInputRef.current?.click();
  };

  const openAttachment = (url: string, name: string, type?: string | null) => {
    if (!url) return;
    setAttachmentPreview({ url, name, type });
  };

  const handleAttachmentOpen = (url: string, name: string, type?: string | null) => {
    openAttachment(url, name, type);
  };

  const closeAttachment = () => {
    setAttachmentPreview(null);
  };

  const handleFileSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const maxSize = 5 * 1024 * 1024;
    const isAllowed =
      file.type.startsWith("image/") || file.type === "application/pdf";
    if (!isAllowed) {
      pushToast({ message: "Only PDF and image files are allowed.", tone: "warning" });
      event.target.value = "";
      return;
    }
    if (file.size > maxSize) {
      pushToast({ message: "File size must be 5MB or less.", tone: "warning" });
      event.target.value = "";
      return;
    }

    const threadId = AI_THREAD_ID;
    setUploadLabel(file.name);
    setUploadProgress(0);

    const isText =
      file.type.startsWith("text/") ||
      file.type === "application/json" ||
      file.name.endsWith(".md") ||
      file.name.endsWith(".csv");

    const readContent = () =>
      new Promise<string | null>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("Failed to read file."));
        reader.onprogress = (e) => {
          if (e.lengthComputable) {
            setUploadProgress(Math.round((e.loaded / e.total) * 100));
          }
        };
        reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
        if (isText) {
          reader.readAsText(file);
        } else {
          reader.readAsArrayBuffer(file);
        }
      });

    if (isAiThread) {
      let preview: string | undefined;
      try {
        const content = await readContent();
        if (isText && content) {
          preview = content.slice(0, 1200);
        }
      } catch {
        pushToast({ message: "Failed to read attachment.", tone: "error" });
      }

      setUploadProgress(100);
      window.setTimeout(() => {
        setUploadProgress(null);
        setUploadLabel(null);
      }, 1200);

      const attachment: ChatAttachment = {
        name: file.name,
        size: file.size,
        type: file.type || "application/octet-stream",
        preview,
      };

      const attachmentSummary = `Attached file: ${file.name} (${attachment.type || "unknown"}, ${formatSize(
        file.size
      )}).${preview ? "" : " (Binary file attached, no preview.)"}`;

      const newMessage: AiMessage = {
        id: `m-${Date.now()}`,
        from: "me",
        text: attachmentSummary,
        createdAt: new Date().toISOString(),
        attachment,
      };

      const threadMessages = [...(aiMessagesByThread[threadId] ?? []), newMessage];
      setAiMessagesByThread((prev) => ({
        ...prev,
        [threadId]: threadMessages,
      }));

      setIsSending(true);
      await requestAiReply(threadId, threadMessages);
      event.target.value = "";
      return;
    }

    if (!activeThread?.chatId || !userId) {
      event.target.value = "";
      return;
    }

    setIsSending(true);
    const supabase = getSupabaseBrowserClient();
    let otherUserId = activeThread.userId ?? null;
    if (!otherUserId) {
      const { data: chatRow } = await supabase
        .from("chats")
        .select("user_a,user_b")
        .eq("id", activeThread.chatId)
        .maybeSingle();
      if (chatRow) {
        otherUserId = chatRow.user_a === userId ? chatRow.user_b : chatRow.user_a;
      }
    }
    const bucketName = process.env.NEXT_PUBLIC_CHAT_ATTACHMENTS_BUCKET || "chat-attachments";
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "");
    const filePath = `${activeThread.chatId}/${userId}/${Date.now()}-${safeName}`;

    let progress = 10;
    const timer = window.setInterval(() => {
      progress = Math.min(90, progress + 12);
      setUploadProgress(progress);
    }, 180);

    const { error: uploadError } = await supabase.storage.from(bucketName).upload(filePath, file, {
      upsert: true,
      cacheControl: "3600",
      contentType: file.type || "application/octet-stream",
    });
    window.clearInterval(timer);

    if (uploadError) {
      setUploadProgress(null);
      setUploadLabel(null);
      setIsSending(false);
      pushToast({ message: uploadError.message, tone: "error" });
      event.target.value = "";
      return;
    }

    const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath);
    const publicUrl = data.publicUrl;

    const { error } = await supabase.from("chat_messages").insert({
      chat_id: activeThread.chatId,
      sender_id: userId,
      body: null,
      attachment_url: publicUrl,
      attachment_name: file.name,
      attachment_type: file.type || "application/octet-stream",
      attachment_size: file.size,
    });

    setUploadProgress(100);
    window.setTimeout(() => {
      setUploadProgress(null);
      setUploadLabel(null);
    }, 800);

    if (error) {
      pushToast({ message: error.message, tone: "error" });
    } else {
      pushToast({ message: "Attachment sent.", tone: "success" });
      if (otherUserId) {
        await supabase.from("notifications").insert({
          user_id: otherUserId,
          actor_id: userId,
          type: "message",
          entity_type: "chat",
          entity_id: activeThread.chatId,
          message: "You received an attachment",
          metadata: { chat_id: activeThread.chatId, attachment: file.name },
        });
      }
    }
    setIsSending(false);
    event.target.value = "";
  };

  const activeAiMessages = aiMessagesByThread[AI_THREAD_ID] ?? [];
  const previewIsImage = attachmentPreview?.type?.startsWith("image/") ?? false;
  const previewIsPdf =
    !!attachmentPreview &&
    !previewIsImage &&
    (attachmentPreview.type?.includes("pdf") ||
      attachmentPreview.url.toLowerCase().endsWith(".pdf"));

  return (
    <AppShell>
      <div className="page-shell">
        <section className="page-card inbox-card">
          <div className={`inbox-grid${showChat ? " show-chat" : ""}`}>
            <aside className="inbox-list" data-unread={unreadThreadCount > 0 ? "true" : "false"}>
              <div className="inbox-list-head">
                <div className="inbox-list-title">Inbox</div>
                <div className="inbox-list-actions">
                  <div className="inbox-search">
                    <input
                      type="text"
                      placeholder="Search"
                      value={threadQuery}
                      onChange={(event) => setThreadQuery(event.target.value)}
                    />
                  </div>
                  <button
                    className="inbox-compose"
                    type="button"
                    onClick={() => {
                      if (!userId) {
                        pushToast({ message: "Please sign in to start a chat.", tone: "warning" });
                        return;
                      }
                      setNewModalOpen(true);
                    }}
                  >
                    New
                  </button>
                </div>
              </div>
              <div className="inbox-thread-list">
                {threadsLoading ? (
                  Array.from({ length: 4 }).map((_, index) => (
                    <div className="inbox-thread" key={`sk-thread-${index}`}>
                      <div className="inbox-thread-avatar">
                        <Skeleton className="skeleton-circle" />
                      </div>
                      <div className="inbox-thread-main">
                        <Skeleton className="skeleton-line skeleton-w-60" />
                        <Skeleton className="skeleton-line sm skeleton-w-80" />
                      </div>
                    </div>
                  ))
                ) : (
                  filteredThreads.map((thread) => (
                    <div
                      className={`inbox-thread${thread.id === activeThreadId ? " active" : ""}`}
                      key={thread.id}
                      role="button"
                      tabIndex={0}
                      onClick={(event) => {
                        if (threadLongPressFiredRef.current) {
                          threadLongPressFiredRef.current = false;
                          return;
                        }
                        const target = event.target as HTMLElement;
                        if (target.closest(".inbox-thread-menu-btn")) return;
                        if (target.closest(".inbox-thread-menu-pop")) return;
                        setThreadMenuOpen(null);
                        setActiveThreadId(thread.id);
                        setShowChat(true);
                        if (thread.chatId) {
                          markThreadRead(thread.chatId);
                        }
                      }}
                      onTouchStart={
                        thread.type === "chat"
                          ? () => startThreadLongPress(thread.id)
                          : undefined
                      }
                      onTouchEnd={cancelThreadLongPress}
                      onTouchCancel={cancelThreadLongPress}
                      onTouchMove={cancelThreadLongPress}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setActiveThreadId(thread.id);
                          setShowChat(true);
                        }
                      }}
                    >
                      <div className="inbox-thread-avatar">
                        {thread.avatarUrl ? (
                          <img src={thread.avatarUrl} alt={thread.name} />
                        ) : thread.type === "chat" ? (
                          <span className="inbox-thread-initial">
                            {(thread.name || "U")[0]?.toUpperCase()}
                          </span>
                        ) : (
                          <Icon name="cloud" stroke="#fff" />
                        )}
                      </div>
                      <div className="inbox-thread-main">
                        <div className="inbox-thread-top">
                          <div className="inbox-thread-name">{thread.name}</div>
                          {thread.time ? <div className="inbox-thread-time">{thread.time}</div> : null}
                        </div>
                        <div className="inbox-thread-last">{thread.last}</div>
                      </div>
                      {thread.unreadCount && thread.unreadCount > 0 ? (
                        <span className="inbox-thread-unread" aria-label={`${thread.unreadCount} unread messages`}>
                          {thread.unreadCount > 99 ? "99+" : thread.unreadCount}
                        </span>
                      ) : null}
                      {thread.type === "chat" && thread.userId ? (
                        <div className="inbox-thread-menu">
                          <button
                            className="inbox-thread-menu-btn"
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setThreadMenuOpen((prev) => (prev === thread.id ? null : thread.id));
                            }}
                            aria-label="Thread options"
                          >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </button>
                          {threadMenuOpen === thread.id ? (
                            <div className="inbox-thread-menu-pop" ref={threadMenuRef}>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  router.push(`/user/${thread.userId}`);
                                  setThreadMenuOpen(null);
                                }}
                              >
                                View profile
                              </button>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleDeleteThread(thread);
                                  setThreadMenuOpen(null);
                                }}
                              >
                                Delete chat
                              </button>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </aside>

            <div className="inbox-chat">
              <div className="inbox-chat-head">
                <div className="inbox-chat-profile">
                  <button
                    className="inbox-back"
                    type="button"
                    onClick={() => setShowChat(false)}
                    aria-label="Back to conversations"
                  >
                    <svg aria-hidden="true" viewBox="0 0 24 24">
                      <path
                        d="M15 19l-7-7 7-7"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                  <div className="inbox-chat-avatar">
                    {activeThread?.type === "chat" && activeThread.avatarUrl ? (
                      <img src={activeThread.avatarUrl} alt={activeThread.name} />
                    ) : activeThread?.type === "chat" ? (
                      <span className="inbox-chat-initial">
                        {(activeThread?.name || "U")[0]?.toUpperCase()}
                      </span>
                    ) : (
                      <Icon name="cloud" stroke="#fff" />
                    )}
                  </div>
                  <div className="inbox-chat-title">
                    <div className="inbox-chat-name-row">
                      <div className="inbox-chat-name">{activeThread?.name ?? ""}</div>
                    </div>
                    <div className="inbox-chat-status">
                      {activeThread?.type === "chat" ? "Direct message" : "CloudDuty AI"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="inbox-chat-body" ref={chatBodyRef}>
                {isAiThread
                  ? activeAiMessages.map((msg, index) => {
                      const previous = activeAiMessages[index - 1];
                      const showDate =
                        hydrated &&
                        (!previous ||
                          formatDateLabel(previous.createdAt) !== formatDateLabel(msg.createdAt));
                      return (
                        <div key={msg.id} className="inbox-message-block">
                          {showDate ? <div className="inbox-date">{formatDateLabelSafe(msg.createdAt)}</div> : null}
                          <div className={`inbox-bubble ${msg.from === "me" ? "me" : "them"}`}>
                            <div className="inbox-bubble-text">{msg.text}</div>
                            {msg.attachment ? (
                              <button
                                className="inbox-attachment inbox-attachment-btn"
                                type="button"
                                onClick={() =>
                                  handleAttachmentOpen(
                                    msg.attachment!.preview ?? "",
                                    msg.attachment!.name,
                                    msg.attachment!.type
                                  )
                                }
                                onTouchEnd={() =>
                                  handleAttachmentOpen(
                                    msg.attachment!.preview ?? "",
                                    msg.attachment!.name,
                                    msg.attachment!.type
                                  )
                                }
                              >
                                <div className="inbox-attachment-name">{msg.attachment!.name}</div>
                                <div className="inbox-attachment-meta">
                                  {msg.attachment!.type} - {formatSize(msg.attachment!.size)}
                                </div>
                              </button>
                            ) : null}
                            <div className="inbox-bubble-time">{formatTimeSafe(msg.createdAt)}</div>
                          </div>
                        </div>
                      );
                    })
                  : chatLoading && chatMessages.length === 0
                    ? Array.from({ length: 4 }).map((_, index) => (
                        <div className="inbox-message-block" key={`sk-msg-${index}`}>
                          <div className="inbox-bubble them">
                            <Skeleton className="skeleton-line skeleton-w-80" />
                            <Skeleton className="skeleton-line sm skeleton-w-40" />
                          </div>
                        </div>
                      ))
                    : chatMessages.map((msg, index) => {
                      const previous = chatMessages[index - 1];
                      const showDate =
                        hydrated &&
                        (!previous ||
                          formatDateLabel(previous.created_at) !== formatDateLabel(msg.created_at));
                      const isMine = msg.sender_id === userId;
                      const displayText = msg.deleted_at
                        ? "This message was deleted."
                        : msg.body || "";
                      const isLastOutbound = isMine && index === lastOutboundIndex;
                      const seenAfter = isLastOutbound && !!msg.read_at;
                      return (
                        <div key={msg.id} className="inbox-message-block">
                          {showDate ? <div className="inbox-date">{formatDateLabelSafe(msg.created_at)}</div> : null}
                          <div
                            className={`inbox-bubble ${isMine ? "me" : "them"}`}
                            onTouchStart={
                              isMine && !msg.deleted_at
                                ? (event) => startMessageLongPress(msg.id, event.target)
                                : undefined
                            }
                            onTouchEnd={isMine && !msg.deleted_at ? cancelMessageLongPress : undefined}
                            onTouchCancel={isMine && !msg.deleted_at ? cancelMessageLongPress : undefined}
                            onTouchMove={isMine && !msg.deleted_at ? cancelMessageLongPress : undefined}
                          >
                            {isMine && !msg.deleted_at ? (
                              <button
                                className="inbox-msg-menu-btn"
                                type="button"
                                onClick={() =>
                                  setMessageMenuOpenId((prev) => (prev === msg.id ? null : msg.id))
                                }
                                aria-label="Message options"
                              >
                                <svg aria-hidden="true" viewBox="0 0 24 24">
                                  <polyline points="6 9 12 15 18 9" />
                                </svg>
                              </button>
                            ) : null}
                            {isMine && !msg.deleted_at && messageMenuOpenId === msg.id ? (
                              <div className="inbox-msg-menu" ref={messageMenuRef}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleDeleteMessage(msg.id);
                                    setMessageMenuOpenId(null);
                                  }}
                                >
                                  Delete message
                                </button>
                              </div>
                            ) : null}
                            <div className="inbox-bubble-text">{displayText}</div>
                            {msg.attachment_url ? (
                              <button
                                className="inbox-attachment inbox-attachment-btn"
                                type="button"
                                onClick={() =>
                                  handleAttachmentOpen(
                                    msg.attachment_url!,
                                    msg.attachment_name ?? "Attachment",
                                    msg.attachment_type
                                  )
                                }
                                onTouchEnd={() =>
                                  handleAttachmentOpen(
                                    msg.attachment_url!,
                                    msg.attachment_name ?? "Attachment",
                                    msg.attachment_type
                                  )
                                }
                              >
                                {msg.attachment_type?.startsWith("image/") ? (
                                  <img src={msg.attachment_url} alt={msg.attachment_name ?? "Attachment"} />
                                ) : (
                                  <div className="inbox-attachment-file">
                                    <Icon name="file" />
                                    <div>
                                      <div className="inbox-attachment-name">
                                        {msg.attachment_name ?? "Attachment"}
                                      </div>
                                      <div className="inbox-attachment-meta">
                                        PDF • {formatSize(msg.attachment_size ?? 0)}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </button>
                            ) : null}
                            <div className="inbox-bubble-time">{formatTimeSafe(msg.created_at)}</div>
                          </div>
                          {isLastOutbound && !msg.deleted_at ? (
                            <div className={`inbox-read-receipt${seenAfter ? " seen" : ""}`}>
                              <span className="receipt-icon" aria-hidden="true">
                                <svg viewBox="0 0 24 24">
                                  <polyline points="2 12 7 17 18 6" />
                                  {seenAfter ? <polyline points="8 12 13 17 22 6" /> : null}
                                </svg>
                              </span>
                              <span>{seenAfter ? "Seen" : "Sent"}</span>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                {isSending && isAiThread ? (
                  <div className="inbox-bubble them inbox-bubble-typing" aria-live="polite">
                    <div className="typing-dots" aria-hidden="true">
                      <span />
                      <span />
                      <span />
                    </div>
                    <span className="typing-label">CloudDuty AI is typing</span>
                  </div>
                ) : null}
              </div>

              <div className="inbox-chat-input">
                <button
                  className="inbox-attach"
                  type="button"
                  onClick={handleAttach}
                  disabled={isSending}
                >
                  +
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelected}
                  className="inbox-file-input"
                  accept="image/*,application/pdf"
                  aria-hidden="true"
                  tabIndex={-1}
                />
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleSend();
                    }
                  }}
                  disabled={isSending}
                />
                <button type="button" onClick={handleSend} disabled={!draft.trim() || isSending}>
                  {isSending ? "Sending..." : "Send"}
                </button>
              </div>
              {uploadProgress !== null ? (
                <div className="inbox-upload-status" aria-live="polite">
                  <span>Uploading {uploadLabel ?? "attachment"}...</span>
                  <div className="inbox-upload-bar">
                    <span style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              ) : null}
              {attachmentPreview ? (
                <div
                  className="attachment-overlay"
                  role="dialog"
                  aria-modal="true"
                  onClick={closeAttachment}
                >
                  <div className="attachment-modal" onClick={(event) => event.stopPropagation()}>
                    <button
                      className="attachment-close"
                      type="button"
                      aria-label="Close attachment"
                      onClick={closeAttachment}
                    >
                      <svg aria-hidden="true" viewBox="0 0 24 24">
                        <path d="M18 6 6 18" />
                        <path d="M6 6l12 12" />
                      </svg>
                    </button>
                    <div className="attachment-head">
                      <div className="attachment-name">{attachmentPreview.name}</div>
                      <a
                        className="attachment-open"
                        href={attachmentPreview.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open in new tab
                      </a>
                    </div>
                    <div className="attachment-body">
                      {previewIsImage ? (
                        <img src={attachmentPreview.url} alt={attachmentPreview.name} />
                      ) : previewIsPdf ? (
                        <iframe src={attachmentPreview.url} title={attachmentPreview.name} />
                      ) : (
                        <a href={attachmentPreview.url} target="_blank" rel="noreferrer">
                          Download file
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </div>

      {newModalOpen ? (
        <div
          className="inbox-modal-overlay"
          role="dialog"
          aria-modal="true"
          onClick={() => setNewModalOpen(false)}
        >
          <div className="inbox-modal" onClick={(event) => event.stopPropagation()}>
            <div className="inbox-modal-head">
              <div>
                <div className="inbox-modal-title">Start a chat</div>
                <div className="inbox-modal-sub">Mutual followers</div>
              </div>
              <button
                className="inbox-modal-close"
                type="button"
                onClick={() => setNewModalOpen(false)}
                aria-label="Close"
              >
                X
              </button>
            </div>
            <div className="inbox-modal-search">
              <input
                type="text"
                placeholder="Search mutual followers"
                value={mutualSearch}
                onChange={(event) => setMutualSearch(event.target.value)}
              />
            </div>
            <div className="inbox-modal-list">
              {mutualLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <div className="inbox-modal-item" key={`mutual-skel-${index}`}>
                    <div className="inbox-modal-avatar">
                      <Skeleton className="skeleton-circle" />
                    </div>
                    <div className="inbox-modal-item-text">
                      <Skeleton className="skeleton-line skeleton-w-60" />
                      <Skeleton className="skeleton-line sm skeleton-w-40" />
                    </div>
                  </div>
                ))
              ) : filteredMutuals.length ? (
                filteredMutuals.map((user) => (
                  <button
                    className="inbox-modal-item"
                    type="button"
                    key={user.user_id}
                    onClick={() => handleStartChat(user.user_id)}
                  >
                    <div className="inbox-modal-avatar">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt={user.full_name ?? "User"} />
                      ) : (
                        <span>{(user.full_name || user.username || "U")[0]?.toUpperCase()}</span>
                      )}
                    </div>
                    <div className="inbox-modal-item-text">
                      <div className="inbox-modal-name">{user.full_name || user.username || "User"}</div>
                      <div className="inbox-modal-handle">
                        {user.username ? `@${user.username}` : "@user"}
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="inbox-modal-empty">No mutual followers yet.</div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
