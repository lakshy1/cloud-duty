"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  chatId?: string;
  userId?: string;
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

export default function InboxPage() {
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
  const [threadQuery, setThreadQuery] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [threadsReloadKey, setThreadsReloadKey] = useState(0);
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [mutualLoading, setMutualLoading] = useState(false);
  const [mutualSearch, setMutualSearch] = useState("");
  const [mutualList, setMutualList] = useState<MutualUser[]>([]);
  const [threadMenuOpen, setThreadMenuOpen] = useState<string | null>(null);
  const [hiddenChatIds, setHiddenChatIds] = useState<Set<string>>(new Set());
  const chatBodyRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const threadMenuRef = useRef<HTMLDivElement | null>(null);

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

  const formatSize = (bytes: number) => {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes} B`;
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
    () => threads.find((thread) => thread.id === activeThreadId) ?? threads[0],
    [activeThreadId, threads]
  );

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
    const targetChat = searchParams.get("chat");
    if (targetChat) {
      setActiveThreadId(`chat-${targetChat}`);
      setShowChat(true);
    }
  }, [searchParams]);

  useEffect(() => {
    const loadThreads = async () => {
      setThreadsLoading(true);
      const aiMessages = aiMessagesByThread[AI_THREAD_ID] ?? [];
      const aiLast = aiMessages[aiMessages.length - 1];
      const aiThread: Thread = {
        id: AI_THREAD_ID,
        type: "ai",
        name: "CloudDuty AI Bot",
        handle: "@cloudduty-ai",
        last: aiLast?.text ?? "Start a conversation",
        time: aiLast ? formatTime(aiLast.createdAt) : "",
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
          const lastTime = last?.created_at ? formatTime(last.created_at) : "";
          return {
            id: `chat-${chat.id}`,
            type: "chat",
            name: profile?.full_name || profile?.username || "User",
            handle: profile?.username ? `@${profile.username}` : "@user",
            avatarUrl: profile?.avatar_url ?? null,
            last: lastText,
            time: lastTime,
            chatId: chat.id,
            userId: otherId,
          };
        })
      );

      setThreads([aiThread, ...chatThreads]);
      setThreadsLoading(false);
    };

    loadThreads();
  }, [aiMessagesByThread, userId, threadsReloadKey, hiddenChatIds]);

  useEffect(() => {
    if (!activeThread || activeThread.type !== "chat" || !activeThread.chatId || !userId) {
      return;
    }

    const supabase = getSupabaseBrowserClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let active = true;

    const loadMessages = async () => {
      setChatMessages([]);
      setChatLoading(true);
      const { data } = await supabase
        .from("chat_messages")
        .select("id,chat_id,sender_id,body,created_at,deleted_at,deleted_by")
        .eq("chat_id", activeThread.chatId)
        .order("created_at", { ascending: true });
      if (!active) return;
      setChatMessages((data ?? []) as ChatMessage[]);
      setChatLoading(false);
    };

    loadMessages();

    channel = supabase
      .channel(`chat-${activeThread.chatId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `chat_id=eq.${activeThread.chatId}` },
        (payload) => {
          setChatMessages((prev) => [...prev, payload.new as ChatMessage]);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "chat_messages", filter: `chat_id=eq.${activeThread.chatId}` },
        (payload) => {
          const updated = payload.new as ChatMessage;
          setChatMessages((prev) => prev.map((msg) => (msg.id === updated.id ? updated : msg)));
        }
      )
      .subscribe();

    return () => {
      active = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [activeThread, userId]);

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
    const { count: mutualA } = await supabase
      .from("follows")
      .select("follower_id", { count: "exact", head: true })
      .eq("follower_id", userId)
      .eq("following_id", activeThread.userId ?? "");
    const { count: mutualB } = await supabase
      .from("follows")
      .select("follower_id", { count: "exact", head: true })
      .eq("follower_id", activeThread.userId ?? "")
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
    if (isSending || !isAiThread) return;
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
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
  };

  const activeAiMessages = aiMessagesByThread[AI_THREAD_ID] ?? [];

  return (
    <AppShell>
      <div className="page-shell">
        <section className="page-card inbox-card">
          <div className={`inbox-grid${showChat ? " show-chat" : ""}`}>
            <aside className="inbox-list">
              <div className="inbox-list-head">
                <div className="inbox-list-title">Inbox</div>
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
              <div className="inbox-search">
                <input
                  type="text"
                  placeholder="Search messages"
                  value={threadQuery}
                  onChange={(event) => setThreadQuery(event.target.value)}
                />
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
                        const target = event.target as HTMLElement;
                        if (target.closest(".inbox-thread-menu-btn")) return;
                        if (target.closest(".inbox-thread-menu-pop")) return;
                        setActiveThreadId(thread.id);
                        setShowChat(true);
                      }}
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
                            <span aria-hidden="true" className="inbox-thread-menu-dots" />
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
                    <span aria-hidden="true">&lt;-</span>
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
                    {activeThread?.handle ? (
                      <div className="inbox-chat-status">{activeThread.handle}</div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="inbox-chat-body" ref={chatBodyRef}>
                {isAiThread
                  ? activeAiMessages.map((msg, index) => {
                      const previous = activeAiMessages[index - 1];
                      const showDate =
                        !previous || formatDateLabel(previous.createdAt) !== formatDateLabel(msg.createdAt);
                      return (
                        <div key={msg.id} className="inbox-message-block">
                          {showDate ? <div className="inbox-date">{formatDateLabel(msg.createdAt)}</div> : null}
                          <div className={`inbox-bubble ${msg.from === "me" ? "me" : "them"}`}>
                            <div className="inbox-bubble-text">{msg.text}</div>
                            {msg.attachment ? (
                              <div className="inbox-attachment">
                                <div className="inbox-attachment-name">{msg.attachment.name}</div>
                                <div className="inbox-attachment-meta">
                                  {msg.attachment.type} - {formatSize(msg.attachment.size)}
                                </div>
                              </div>
                            ) : null}
                            <div className="inbox-bubble-time">{formatTime(msg.createdAt)}</div>
                          </div>
                        </div>
                      );
                    })
                  : chatLoading
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
                        !previous || formatDateLabel(previous.created_at) !== formatDateLabel(msg.created_at);
                      const isMine = msg.sender_id === userId;
                      const displayText = msg.deleted_at
                        ? "This message was deleted."
                        : msg.body || "";
                      return (
                        <div key={msg.id} className="inbox-message-block">
                          {showDate ? <div className="inbox-date">{formatDateLabel(msg.created_at)}</div> : null}
                          <div className={`inbox-bubble ${isMine ? "me" : "them"}`}>
                            <div className="inbox-bubble-text">{displayText}</div>
                            <div className="inbox-bubble-time">{formatTime(msg.created_at)}</div>
                            {isMine && !msg.deleted_at ? (
                              <button
                                className="inbox-delete-btn"
                                type="button"
                                onClick={() => handleDeleteMessage(msg.id)}
                              >
                                Delete
                              </button>
                            ) : null}
                          </div>
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
                  disabled={isSending || !isAiThread}
                >
                  +
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelected}
                  className="inbox-file-input"
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
