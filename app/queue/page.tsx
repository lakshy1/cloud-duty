"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AppShell } from "../components/AppShell";
import { CardGrid } from "../components/CardGrid";
import { PopupModal, PopupInteractions } from "../components/PopupModal";
import type { CardData } from "../data/card-data";
import { getSupabaseBrowserClient } from "../lib/supabase/client";
import { Skeleton } from "../components/Skeleton";
import { isReaderModeActive, setReaderMode, shouldUseReadingMode } from "../lib/reading-mode";
import { useUIState } from "../state/ui-state";

function formatCount(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return `${value}`;
}

type PopupState = {
  isOpen: boolean;
  currentPopupIndex: number;
  activeAnim: Animation | null;
  savedCardRect: DOMRect | null;
};

type SavedPost = {
  id?: string;
  img?: string;
  ava?: string;
  author?: string;
  handle?: string;
  tag?: string;
  title?: string;
  summary?: string;
  desc?: string;
  details?: string;
  views?: string;
  likes?: string;
  dislikes?: string;
  comments?: string;
  shares?: string;
  created_at?: string;
  impressions_count?: number;
  likes_count?: number;
  dislikes_count?: number;
};

type SavedPostRow = {
  post: SavedPost | null;
};

const initialPopupInteractions: PopupInteractions = {
  like: false,
  dislike: false,
  save: false,
  likePop: false,
  dislikePop: false,
  saveSweep: false,
};

export default function QueuePage() {
  const { searchQuery } = useUIState();
  const [cards, setCards] = useState<CardData[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [reactions, setReactions] = useState<Map<string, "like" | "dislike">>(new Map());
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupIndex, setPopupIndex] = useState<number | null>(null);
  const [popupInteractions, setPopupInteractions] = useState<PopupInteractions>(
    initialPopupInteractions
  );
  const popupPanelRef = useRef<HTMLDivElement | null>(null);
  const popupOverlayRef = useRef<HTMLDivElement | null>(null);
  const cardsRef = useRef<CardData[]>([]);
  const popupStateRef = useRef<PopupState>({
    isOpen: false,
    currentPopupIndex: -1,
    activeAnim: null,
    savedCardRect: null,
  });

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUserId(data.user?.id ?? null);
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (!userId) {
      setCards([]);
      setSavedIds(new Set());
      setLoading(false);
      return;
    }
    let active = true;
    const supabase = getSupabaseBrowserClient();
    const loadSaved = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("saved_posts")
        .select("post:posts(*)")
        .order("created_at", { ascending: false });
      if (!active) return;
      if (error || !data) {
        setLoading(false);
        return;
      }
      const typedData = data as SavedPostRow[];
      const mapped = typedData
        .map((row) => row.post)
        .filter(Boolean)
        .map((post) => {
          const item = post as SavedPost;
          const impressions =
            typeof item.impressions_count === "number" ? item.impressions_count : null;
          return {
            id: item.id,
            img: item.img ?? "",
            ava: item.ava ?? "",
            author: item.author ?? "",
            handle: item.handle ?? "",
            tag: item.tag ?? "",
            title: item.title ?? "",
            summary: item.summary ?? item.desc ?? "",
            details: item.desc ?? "",
            views: impressions !== null ? formatCount(impressions) : (item.views ?? ""),
            likes:
              typeof item.likes_count === "number"
                ? formatCount(item.likes_count)
                : (item.likes ?? ""),
            dislikes:
              typeof item.dislikes_count === "number"
                ? formatCount(item.dislikes_count)
                : undefined,
            comments: item.comments ?? "",
            shares: item.shares ?? "",
            createdAt: item.created_at ?? undefined,
          };
        }) as CardData[];
      setCards(mapped);
      setSavedIds(new Set(mapped.map((p) => p.id!).filter(Boolean)));
      setLoading(false);
    };
    loadSaved();
    return () => { active = false; };
  }, [userId]);

  useEffect(() => {
    cardsRef.current = cards;
  }, [cards]);

  const getTargetRect = useCallback(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (isReaderModeActive()) {
      return { x: 0, y: 0, w: vw, h: vh, mobile: true };
    }
    const isMobile = vw <= 580;
    if (isMobile) {
      const h = vh * 0.9;
      return { x: 0, y: vh - h, w: vw, h, mobile: true };
    }
    const w = Math.min(vw * 0.84, 880);
    const h = Math.min(vh * 0.84, 590);
    return { x: (vw - w) / 2, y: (vh - h) / 2, w, h, mobile: false };
  }, []);

  const applyFinalGeometry = useCallback(() => {
    const panel = popupPanelRef.current;
    if (!panel) return;
    const { x, y, w, h, mobile } = getTargetRect();
    panel.style.left = `${x}px`;
    panel.style.top = `${y}px`;
    panel.style.width = `${w}px`;
    panel.style.height = `${h}px`;
    panel.style.borderRadius = mobile ? "22px 22px 0 0" : "24px";
  }, [getTargetRect]);

  const closePopup = useCallback(() => {
    const panel = popupPanelRef.current;
    const overlay = popupOverlayRef.current;
    if (!panel || !overlay) return;
    const state = popupStateRef.current;
    if (!state.isOpen) return;
    state.isOpen = false;
    setPopupOpen(false);
    panel.classList.remove("content-visible", "ready");
    const { x: tx, y: ty, w: tw, h: th, mobile } = getTargetRect();
    if (state.activeAnim) { state.activeAnim.cancel(); state.activeAnim = null; }
    overlay.classList.remove("active");
    const wasReaderMode = isReaderModeActive();
    if (mobile) {
      state.activeAnim = panel.animate(
        [{ transform: "translateY(0)", opacity: 1 }, { transform: "translateY(105%)", opacity: 0 }],
        { duration: 340, easing: "cubic-bezier(0.55,0,0.8,0.2)", fill: "forwards" }
      );
    } else {
      const saved = state.savedCardRect || { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 140, height: 180 };
      const dx = saved.left + saved.width / 2 - (tx + tw / 2);
      const dy = saved.top + saved.height / 2 - (ty + th / 2);
      const sx = saved.width / tw;
      const sy = saved.height / th;
      state.activeAnim = panel.animate(
        [
          { transform: "translate(0,0) scale(1,1)", opacity: 1, borderRadius: "24px" },
          { transform: `translate(${dx * 0.6}px,${dy * 0.6}px) scale(${sx * 0.6 + 0.4},${sy * 0.6 + 0.4})`, opacity: 0.55, borderRadius: "20px" },
          { transform: `translate(${dx}px,${dy}px) scale(${sx},${sy})`, opacity: 0, borderRadius: "16px" },
        ],
        { duration: 360, easing: "cubic-bezier(0.55,0,0.8,0.2)", fill: "forwards" }
      );
    }
    if (state.activeAnim) {
      state.activeAnim.onfinish = () => {
        panel.style.cssText = "left:-9999px;opacity:0;";
        state.savedCardRect = null;
        state.activeAnim = null;
        setPopupIndex(null);
        if (wasReaderMode) setReaderMode(false);
      };
    } else if (wasReaderMode) {
      setReaderMode(false);
    }
  }, [getTargetRect]);

  const openPopup = useCallback(
    (index: number, cardRect: DOMRect) => {
      const panel = popupPanelRef.current;
      const overlay = popupOverlayRef.current;
      if (!panel || !overlay) return;
      const state = popupStateRef.current;
      if (state.isOpen) return;
      state.isOpen = true;
      setPopupIndex(index);
      setPopupOpen(true);
      setPopupInteractions({ ...initialPopupInteractions });
      state.currentPopupIndex = index;
      panel.classList.remove("content-visible", "ready");
      setReaderMode(shouldUseReadingMode(cards[index]));
      state.savedCardRect = cardRect;
      const { x: tx, y: ty, w: tw, h: th, mobile } = getTargetRect();
      const { left: cx, top: cy, width: cw, height: ch } = state.savedCardRect;
      const dx = cx + cw / 2 - (tx + tw / 2);
      const dy = cy + ch / 2 - (ty + th / 2);
      const sx = cw / tw;
      const sy = ch / th;
      applyFinalGeometry();
      panel.style.opacity = "0";
      panel.style.transform = mobile ? "translateY(100%)" : `translate(${dx}px,${dy}px) scale(${sx},${sy})`;
      overlay.classList.add("active");
      if (state.activeAnim) { state.activeAnim.cancel(); state.activeAnim = null; }
      if (mobile) {
        state.activeAnim = panel.animate(
          [{ transform: "translateY(100%)", opacity: 0 }, { transform: "translateY(0)", opacity: 1 }],
          { duration: 420, easing: "cubic-bezier(0.32,0.72,0,1)", fill: "forwards" }
        );
      } else {
        state.activeAnim = panel.animate(
          [
            { transform: `translate(${dx}px,${dy}px) scale(${sx},${sy})`, opacity: 0, borderRadius: "20px" },
            { transform: "translate(0,0) scale(1,1)", opacity: 1, borderRadius: "24px" },
          ],
          { duration: 520, easing: "cubic-bezier(0.34,1.42,0.64,1)", fill: "forwards" }
        );
      }
      if (state.activeAnim) {
        state.activeAnim.onfinish = () => {
          panel.style.transform = "";
          panel.classList.add("ready", "content-visible");
          state.activeAnim = null;
        };
      }
    },
    [applyFinalGeometry, cards, getTargetRect]
  );

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel("queue-posts-realtime")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "posts" }, (payload) => {
        const updated = payload.new as { id: string; impressions_count?: number; likes_count?: number; dislikes_count?: number };
        setCards((prev) =>
          prev.map((card) =>
            card.id === updated.id
              ? {
                  ...card,
                  views: typeof updated.impressions_count === "number" ? formatCount(updated.impressions_count) : card.views,
                  likes: typeof updated.likes_count === "number" ? formatCount(updated.likes_count) : card.likes,
                  dislikes: typeof updated.dislikes_count === "number" ? formatCount(updated.dislikes_count) : card.dislikes,
                }
              : card
          )
        );
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (!userId) { setReactions(new Map()); return; }
    let active = true;
    const supabase = getSupabaseBrowserClient();
    const loadReactions = async () => {
      const { data, error } = await supabase.from("post_reactions").select("post_id,reaction");
      if (!active) return;
      if (error || !data) return;
      const next = new Map<string, "like" | "dislike">();
      data.forEach((row) => {
        if (row.post_id && (row.reaction === "like" || row.reaction === "dislike")) {
          next.set(row.post_id, row.reaction);
        }
      });
      setReactions(next);
    };
    loadReactions();
    return () => { active = false; };
  }, [userId]);

  const toggleReaction = useCallback(
    async (postId: string, reaction: "like" | "dislike") => {
      if (!userId) return;
      const current = reactions.get(postId);
      const next = new Map(reactions);
      const supabase = getSupabaseBrowserClient();
      if (current === reaction) {
        next.delete(postId);
        setReactions(next);
        const { error } = await supabase.from("post_reactions").delete().eq("post_id", postId);
        if (error) setReactions(reactions);
        return;
      }
      next.set(postId, reaction);
      setReactions(next);
      const { error } = await supabase.from("post_reactions").upsert({ post_id: postId, user_id: userId, reaction });
      if (error) setReactions(reactions);
    },
    [reactions, userId]
  );

  const toggleSave = useCallback(
    async (postId: string) => {
      if (!userId) return;
      const next = new Set(savedIds);
      if (next.has(postId)) { next.delete(postId); } else { next.add(postId); }
      setSavedIds(next);
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from("saved_posts").delete().eq("post_id", postId);
      if (error) { setSavedIds(savedIds); return; }
      setCards((prev) => prev.filter((p) => p.id !== postId));
    },
    [savedIds, userId]
  );

  const handlePopupLike = useCallback(() => {
    const postId = popupIndex !== null ? cards[popupIndex]?.id : undefined;
    if (postId) toggleReaction(postId, "like");
    setPopupInteractions((prev) => ({ ...prev, like: !prev.like, dislike: prev.like ? prev.dislike : false, likePop: !prev.like, dislikePop: false }));
  }, [cards, popupIndex, toggleReaction]);

  const handlePopupDislike = useCallback(() => {
    const postId = popupIndex !== null ? cards[popupIndex]?.id : undefined;
    if (postId) toggleReaction(postId, "dislike");
    setPopupInteractions((prev) => ({ ...prev, like: prev.dislike ? prev.like : false, dislike: !prev.dislike, likePop: false, dislikePop: !prev.dislike }));
  }, [cards, popupIndex, toggleReaction]);

  const handlePopupSave = useCallback(() => {
    const postId = popupIndex !== null ? cards[popupIndex]?.id : undefined;
    if (postId) toggleSave(postId);
    setPopupInteractions((prev) => ({ ...prev, save: !prev.save, saveSweep: !prev.save }));
  }, [cards, popupIndex, toggleSave]);

  useEffect(() => {
    if (popupIndex === null) return;
    const postId = cards[popupIndex]?.id;
    const saved = postId ? savedIds.has(postId) : false;
    const reaction = postId ? reactions.get(postId) : undefined;
    setPopupInteractions((prev) => ({ ...prev, save: saved, like: reaction === "like", dislike: reaction === "dislike" }));
  }, [cards, popupIndex, reactions, savedIds]);

  useEffect(() => {
    if (!popupOpen || popupIndex === null) return;
    const postId = cardsRef.current[popupIndex]?.id;
    if (!postId) return;
    const supabase = getSupabaseBrowserClient();
    const log = async () => {
      const { data } = await supabase.rpc("log_impression", { p_post_id: postId });
      if (typeof data === "number") {
        setCards((prev) => prev.map((card) => card.id === postId ? { ...card, views: formatCount(data) } : card));
      }
    };
    log();
  }, [popupIndex, popupOpen]);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredCards = normalizedQuery
    ? cards.filter((card) => {
        const t = (card.title ?? "").toLowerCase();
        const s = (card.summary ?? "").toLowerCase();
        const d = (card.details ?? "").toLowerCase();
        const a = (card.author ?? "").toLowerCase();
        const h = (card.handle ?? "").toLowerCase();
        const g = (card.tag ?? "").toLowerCase();
        return t.includes(normalizedQuery) || s.includes(normalizedQuery) || d.includes(normalizedQuery) || a.includes(normalizedQuery) || h.includes(normalizedQuery) || g.includes(normalizedQuery);
      })
    : cards;

  return (
    <AppShell>
      <div className="page-shell">
        {/* Queue hero header */}
        <section className="queue-hero">
          <div className="queue-hero-eyebrow">Reading Queue</div>
          <h1 className="queue-hero-title">
            <span className="queue-hero-line">Your Career.</span>
            <span className="queue-hero-line">Your Interest.</span>
            <span className="queue-hero-line queue-hero-line--accent">Your Queue.</span>
          </h1>
          <p className="queue-hero-sub">
            {cards.length > 0 ? (
              <>
                <span className="queue-hero-count">{cards.length}</span>
                {` post${cards.length === 1 ? "" : "s"} in your reading queue`}
              </>
            ) : (
              "Posts you save appear here"
            )}
          </p>
        </section>

        {loading ? (
          <div className="masonry" aria-hidden="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <div className="skeleton-card" key={`sk-${i}`}>
                <Skeleton className="skeleton-thumb" />
                <Skeleton className="skeleton-line skeleton-w-80" />
                <Skeleton className="skeleton-line skeleton-w-60" />
                <Skeleton className="skeleton-line sm skeleton-w-40" />
              </div>
            ))}
          </div>
        ) : filteredCards.length === 0 ? (
          <section className="queue-empty">
            <div className="queue-empty-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 2 7 12 12 22 7 12 2" />
                <polyline points="2 12 12 17 22 12" />
                <polyline points="2 17 12 22 22 17" />
              </svg>
            </div>
            <p className="queue-empty-title">
              {normalizedQuery ? "No matches found" : "Your queue is empty"}
            </p>
            <p className="queue-empty-sub">
              {normalizedQuery
                ? "Try a different search term."
                : "Bookmark posts from the feed and they'll show up here."}
            </p>
          </section>
        ) : (
          <CardGrid
            cards={filteredCards}
            highlightQuery={normalizedQuery}
            savedIds={savedIds}
            onToggleSave={toggleSave}
            reactions={reactions}
            onToggleReaction={toggleReaction}
            onOpenPopup={openPopup}
            onOpenReport={() => {}}
          />
        )}
      </div>

      <PopupModal
        open={popupOpen}
        data={popupIndex !== null ? cards[popupIndex] : null}
        interactions={popupInteractions}
        onClose={closePopup}
        onLike={handlePopupLike}
        onDislike={handlePopupDislike}
        onSave={handlePopupSave}
        onReport={() => {}}
        panelRef={popupPanelRef}
        overlayRef={popupOverlayRef}
      />
    </AppShell>
  );
}
