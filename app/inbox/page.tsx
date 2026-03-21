"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "../components/AppShell";
import { Icon } from "../components/Icon";

const mockThreads = [
  {
    id: "t0",
    name: "CloudDuty AI Bot",
    handle: "@cloudduty-ai",
    last: "Welcome back! Ask me anything about your workspace.",
    time: "Now",
    unread: 2,
  },
];

const initialMessages: Record<string, Array<{ id: string; from: "me" | "them" | "system"; text: string; time?: string }>> =
  {
    t0: [
      { id: "d0", from: "system", text: "Mar 21, 2026" },
      {
        id: "m0",
        from: "them",
        text: "Hi! I’m CloudDuty AI. I can help summarize posts and find insights.",
        time: "10:02 AM",
      },
    ],
    t1: [],
    t2: [],
    t3: [],
  };

export default function InboxPage() {
  const [activeThreadId, setActiveThreadId] = useState(mockThreads[0].id);
  const [messagesByThread, setMessagesByThread] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [showChat, setShowChat] = useState(false);

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

  const activeThread = useMemo(
    () => mockThreads.find((thread) => thread.id === activeThreadId) ?? mockThreads[0],
    [activeThreadId]
  );
  const activeMessages = messagesByThread[activeThreadId] ?? [];

  const handleSend = () => {
    const text = draft.trim();
    if (!text) return;
    const time = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    setMessagesByThread((prev) => ({
      ...prev,
      [activeThreadId]: [
        ...(prev[activeThreadId] ?? []),
        { id: `m-${Date.now()}`, from: "me", text, time },
      ],
    }));
    setDraft("");
  };

  return (
    <AppShell>
      <div className="page-shell">
        <section className="page-card inbox-card">
          <div className={`inbox-grid${showChat ? " show-chat" : ""}`}>
            <aside className="inbox-list">
              <div className="inbox-list-head">
                <div className="inbox-list-title">Inbox</div>
                <button className="inbox-compose" type="button">
                  New
                </button>
              </div>
              <div className="inbox-search">
                <input type="text" placeholder="Search messages" disabled />
              </div>
              <div className="inbox-thread-list">
                {mockThreads.map((thread, index) => (
                  <button
                    className={`inbox-thread${thread.id === activeThreadId ? " active" : ""}`}
                    key={thread.id}
                    type="button"
                    onClick={() => {
                      setActiveThreadId(thread.id);
                      setShowChat(true);
                    }}
                  >
                    <div className="inbox-thread-avatar">
                      <Icon name="cloud" stroke="#fff" />
                    </div>
                    <div className="inbox-thread-main">
                      <div className="inbox-thread-top">
                        <div className="inbox-thread-name">{thread.name}</div>
                        <div className="inbox-thread-time">{thread.time}</div>
                      </div>
                      <div className="inbox-thread-last">{thread.last}</div>
                    </div>
                    {thread.unread ? <span className="inbox-thread-badge">{thread.unread}</span> : null}
                  </button>
                ))}
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
                    ←
                  </button>
                  <div className="inbox-chat-avatar">
                    <Icon name="cloud" stroke="#fff" />
                  </div>
                  <div>
                    <div className="inbox-chat-name">{activeThread.name}</div>
                  </div>
                </div>
                <div className="inbox-chat-actions">
                </div>
              </div>

              <div className="inbox-chat-body">
                {activeMessages.map((msg) =>
                  msg.from === "system" ? (
                    <div className="inbox-date" key={msg.id}>
                      {msg.text}
                    </div>
                  ) : (
                    <div className={`inbox-bubble ${msg.from === "me" ? "me" : "them"}`} key={msg.id}>
                      <div className="inbox-bubble-text">{msg.text}</div>
                      <div className="inbox-bubble-time">{msg.time}</div>
                    </div>
                  )
                )}
              </div>

              <div className="inbox-chat-input">
                <button className="inbox-attach" type="button" disabled>
                  +
                </button>
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") handleSend();
                  }}
                />
                <button type="button" onClick={handleSend} disabled={!draft.trim()}>
                  Send
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
