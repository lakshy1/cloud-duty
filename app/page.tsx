"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CardGrid } from "./components/CardGrid";
import { AppShell } from "./components/AppShell";
import { PaletteRow } from "./components/PaletteRow";
import { PopupModal, PopupInteractions } from "./components/PopupModal";
import { ReportModal } from "./components/ReportModal";
import { Loader } from "./components/Loader";
import type { CardData } from "./data/card-data";
import { cardData } from "./data/card-data";
import { getSupabaseBrowserClient } from "./lib/supabase/client";
import { useUIState } from "./state/ui-state";

type PopupState = {
  isOpen: boolean;
  currentPopupIndex: number;
  activeAnim: Animation | null;
  savedCardRect: DOMRect | null;
};

type ReportStatus = "" | "submitting" | "success" | "error";

type ReportState = {
  state: ReportStatus;
  message: string;
};

const initialPopupInteractions: PopupInteractions = {
  like: false,
  dislike: false,
  save: false,
  likePop: false,
  dislikePop: false,
  saveSweep: false,
};

function formatCount(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return `${value}`;
}

function sortByRecent(items: CardData[]) {
  return [...items].sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bTime - aTime;
  });
}

export default function Home() {
  const {
    popupIndex,
    setPopupIndex,
    popupOpen,
    setPopupOpen,
    reportOpen,
    setReportOpen,
    setReportCardIndex,
    createdPost,
    setCreatedPost,
    searchQuery,
  } = useUIState();
  const [cards, setCards] = useState<CardData[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [reactions, setReactions] = useState<Map<string, "like" | "dislike">>(new Map());
  const [userId, setUserId] = useState<string | null>(null);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [popupInteractions, setPopupInteractions] = useState<PopupInteractions>(
    initialPopupInteractions
  );

  const [reportReason, setReportReason] = useState<string | null>(null);
  const [reportText, setReportText] = useState("");
  const [reportStatus, setReportStatus] = useState<ReportState>({
    state: "",
    message: "",
  });
  const [reportSubmitting, setReportSubmitting] = useState(false);

  const popupPanelRef = useRef<HTMLDivElement | null>(null);
  const popupOverlayRef = useRef<HTMLDivElement | null>(null);
  const reportPanelRef = useRef<HTMLDivElement | null>(null);
  const cardsRef = useRef<CardData[]>(cards);
  const popupStateRef = useRef<PopupState>({
    isOpen: false,
    currentPopupIndex: -1,
    activeAnim: null,
    savedCardRect: null,
  });

  const popupData = popupIndex !== null ? cards[popupIndex] : null;
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredCards = normalizedQuery
    ? cards.filter((card) => {
        const title = (card.title ?? "").toLowerCase();
        const summary = (card.summary ?? "").toLowerCase();
        const details = (card.details ?? "").toLowerCase();
        const author = (card.author ?? "").toLowerCase();
        const handle = (card.handle ?? "").toLowerCase();
        const tag = (card.tag ?? "").toLowerCase();
        return (
          title.includes(normalizedQuery) ||
          summary.includes(normalizedQuery) ||
          details.includes(normalizedQuery) ||
          author.includes(normalizedQuery) ||
          handle.includes(normalizedQuery) ||
          tag.includes(normalizedQuery)
        );
      })
    : cards;

  const getTargetRect = useCallback(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const isMobile = vw <= 580;
    if (isMobile) {
      const h = vh * 0.9;
      const w = vw;
      const x = 0;
      const y = vh - h;
      return { x, y, w, h, mobile: true };
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

    if (state.activeAnim) {
      state.activeAnim.cancel();
      state.activeAnim = null;
    }

    overlay.classList.remove("active");

    if (mobile) {
      state.activeAnim = panel.animate(
        [
          { transform: "translateY(0)", opacity: 1 },
          { transform: "translateY(105%)", opacity: 0 },
        ],
        {
          duration: 340,
          easing: "cubic-bezier(0.55,0,0.8,0.2)",
          fill: "forwards",
        }
      );
    } else {
      const saved = state.savedCardRect || {
        left: window.innerWidth / 2,
        top: window.innerHeight / 2,
        width: 140,
        height: 180,
      };
      const dx = saved.left + saved.width / 2 - (tx + tw / 2);
      const dy = saved.top + saved.height / 2 - (ty + th / 2);
      const sx = saved.width / tw;
      const sy = saved.height / th;
      state.activeAnim = panel.animate(
        [
          {
            transform: "translate(0,0) scale(1,1)",
            opacity: 1,
            borderRadius: "24px",
          },
          {
            transform: `translate(${dx * 0.6}px,${dy * 0.6}px) scale(${sx * 0.6 + 0.4},${sy * 0.6 + 0.4})`,
            opacity: 0.55,
            borderRadius: "20px",
          },
          {
            transform: `translate(${dx}px,${dy}px) scale(${sx},${sy})`,
            opacity: 0,
            borderRadius: "16px",
          },
        ],
        {
          duration: 360,
          easing: "cubic-bezier(0.55,0,0.8,0.2)",
          fill: "forwards",
        }
      );
    }

    if (state.activeAnim) {
      state.activeAnim.onfinish = () => {
        panel.style.cssText = "left:-9999px;opacity:0;";
        state.savedCardRect = null;
        state.activeAnim = null;
        setPopupIndex(null);
      };
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

      state.savedCardRect = cardRect;
      const { x: tx, y: ty, w: tw, h: th, mobile } = getTargetRect();
      const { left: cx, top: cy, width: cw, height: ch } = state.savedCardRect;
      const dx = cx + cw / 2 - (tx + tw / 2);
      const dy = cy + ch / 2 - (ty + th / 2);
      const sx = cw / tw;
      const sy = ch / th;

      applyFinalGeometry();
      panel.style.opacity = "0";
      panel.style.transform = mobile
        ? "translateY(100%)"
        : `translate(${dx}px,${dy}px) scale(${sx},${sy})`;
      overlay.classList.add("active");
      if (state.activeAnim) {
        state.activeAnim.cancel();
        state.activeAnim = null;
      }

      if (mobile) {
        state.activeAnim = panel.animate(
          [
            { transform: "translateY(100%)", opacity: 0 },
            { transform: "translateY(0)", opacity: 1 },
          ],
          {
            duration: 420,
            easing: "cubic-bezier(0.32,0.72,0,1)",
            fill: "forwards",
          }
        );
      } else {
        state.activeAnim = panel.animate(
          [
            {
              transform: `translate(${dx}px,${dy}px) scale(${sx},${sy})`,
              opacity: 0,
              borderRadius: "20px",
            },
            {
              transform: "translate(0,0) scale(1,1)",
              opacity: 1,
              borderRadius: "24px",
            },
          ],
          {
            duration: 520,
            easing: "cubic-bezier(0.34,1.42,0.64,1)",
            fill: "forwards",
          }
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
    [applyFinalGeometry, getTargetRect]
  );

  const delay = useCallback((ms: number) => {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }, []);

  const openReport = useCallback((index: number) => {
    setReportCardIndex(index);
    setReportReason(null);
    setReportText("");
    setReportStatus({ state: "", message: "" });
    setReportSubmitting(false);
    setReportOpen(true);
  }, [setReportCardIndex, setReportOpen]);

  const closeReport = useCallback(() => {
    setReportCardIndex(null);
    setReportOpen(false);
  }, [setReportCardIndex, setReportOpen]);

  const submitReport = useCallback(async () => {
    if (!reportReason && !reportText.trim()) {
      setReportStatus({
        state: "error",
        message: "Please select a reason or describe the issue.",
      });
      return;
    }
    setReportSubmitting(true);
    setReportStatus({ state: "submitting", message: "Sending your report..." });
    await delay(900);
    setReportStatus({ state: "submitting", message: "Validating content..." });
    await delay(700);
    setReportStatus({
      state: "success",
      message: "Report submitted! We'll review this post within 24h.",
    });
    await delay(900);
    setReportSubmitting(false);
    await delay(1300);
    closeReport();
  }, [closeReport, delay, reportReason, reportText]);

  const toggleSave = useCallback(
    async (postId: string) => {
      let activeUserId = userId;
      if (!activeUserId) {
        const supabase = getSupabaseBrowserClient();
        const { data } = await supabase.auth.getUser();
        activeUserId = data.user?.id ?? null;
        setUserId(activeUserId);
      }
      if (!activeUserId) return;
      const wasSaved = savedIds.has(postId);
      const next = new Set(savedIds);
      if (wasSaved) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      setSavedIds(next);
      const supabase = getSupabaseBrowserClient();
      const { error } = wasSaved
        ? await supabase.from("saved_posts").delete().eq("post_id", postId)
        : await supabase.from("saved_posts").insert({ post_id: postId, user_id: activeUserId });
      if (error) {
        setSavedIds(savedIds);
      }
    },
    [savedIds, userId]
  );

  const toggleReaction = useCallback(
    async (postId: string, reaction: "like" | "dislike") => {
      let activeUserId = userId;
      if (!activeUserId) {
        const supabase = getSupabaseBrowserClient();
        const { data } = await supabase.auth.getUser();
        activeUserId = data.user?.id ?? null;
        setUserId(activeUserId);
      }
      if (!activeUserId) return;
      const current = reactions.get(postId);
      const next = new Map(reactions);
      const supabase = getSupabaseBrowserClient();
      if (current === reaction) {
        next.delete(postId);
      } else {
        next.set(postId, reaction);
      }
      setReactions(next);
      const { data, error } = await supabase.rpc("log_reaction", {
        p_post_id: postId,
        p_reaction: reaction,
      });
      if (error) {
        setReactions(reactions);
        return;
      }
      if (Array.isArray(data) && data[0]) {
        const { likes, dislikes } = data[0];
        setCards((prev) =>
          prev.map((card) =>
            card.id === postId
              ? {
                  ...card,
                  likes: typeof likes === "number" ? formatCount(likes) : card.likes,
                  dislikes:
                    typeof dislikes === "number" ? formatCount(dislikes) : card.dislikes,
                }
              : card
          )
        );
      }
    },
    [reactions, userId]
  );

  const handlePopupLike = useCallback(() => {
    const postId = popupIndex !== null ? cards[popupIndex]?.id : undefined;
    if (postId) {
      toggleReaction(postId, "like");
    }
    setPopupInteractions((prev) => {
      const nextLike = !prev.like;
      return {
        like: nextLike,
        dislike: nextLike ? false : prev.dislike,
        save: prev.save,
        likePop: nextLike,
        dislikePop: false,
        saveSweep: prev.saveSweep,
      };
    });
  }, [cards, popupIndex, toggleReaction]);

  const handlePopupDislike = useCallback(() => {
    const postId = popupIndex !== null ? cards[popupIndex]?.id : undefined;
    if (postId) {
      toggleReaction(postId, "dislike");
    }
    setPopupInteractions((prev) => {
      const nextDislike = !prev.dislike;
      return {
        like: nextDislike ? false : prev.like,
        dislike: nextDislike,
        save: prev.save,
        likePop: false,
        dislikePop: nextDislike,
        saveSweep: prev.saveSweep,
      };
    });
  }, [cards, popupIndex, toggleReaction]);

  const handlePopupSave = useCallback(() => {
    const postId = popupIndex !== null ? cards[popupIndex]?.id : undefined;
    if (postId) {
      toggleSave(postId);
    }
    setPopupInteractions((prev) => {
      const nextSave = !prev.save;
      return {
        like: prev.like,
        dislike: prev.dislike,
        save: nextSave,
        likePop: prev.likePop,
        dislikePop: prev.dislikePop,
        saveSweep: nextSave,
      };
    });
  }, [cards, popupIndex, toggleSave]);

  useEffect(() => {
    if (!popupInteractions.likePop) return;
    const timer = window.setTimeout(() => {
      setPopupInteractions((prev) => ({ ...prev, likePop: false }));
    }, 360);
    return () => window.clearTimeout(timer);
  }, [popupInteractions.likePop]);

  useEffect(() => {
    if (!popupInteractions.dislikePop) return;
    const timer = window.setTimeout(() => {
      setPopupInteractions((prev) => ({ ...prev, dislikePop: false }));
    }, 360);
    return () => window.clearTimeout(timer);
  }, [popupInteractions.dislikePop]);

  useEffect(() => {
    if (!popupInteractions.saveSweep) return;
    const timer = window.setTimeout(() => {
      setPopupInteractions((prev) => ({ ...prev, saveSweep: false }));
    }, 420);
    return () => window.clearTimeout(timer);
  }, [popupInteractions.saveSweep]);

  useEffect(() => {
    cardsRef.current = cards;
  }, [cards]);

  useEffect(() => {
    let active = true;
    const fetchPosts = async () => {
      setLoadingPosts(true);
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.from("posts").select("*").order("created_at", {
        ascending: false,
      });
      if (!active) return;
      if (error || !data) {
        setCards(cardData);
        setLoadingPosts(false);
        return;
      }
      const mapped = data.map((row) => {
        const impressions =
          typeof row.impressions_count === "number" ? row.impressions_count : null;
        return {
          id: row.id,
          img: row.img ?? "",
          ava: row.ava ?? "",
          author: row.author ?? "",
          handle: row.handle ?? "",
          tag: row.tag ?? "",
          title: row.title ?? "",
          summary: row.summary ?? row.desc ?? "",
          details: row.desc ?? "",
          views: impressions !== null ? formatCount(impressions) : (row.views ?? ""),
          likes:
            typeof row.likes_count === "number"
              ? formatCount(row.likes_count)
              : (row.likes ?? ""),
          dislikes:
            typeof row.dislikes_count === "number"
              ? formatCount(row.dislikes_count)
              : undefined,
          comments: row.comments ?? "",
          shares: row.shares ?? "",
          createdAt: row.created_at ?? undefined,
        };
      }) as CardData[];
      setCards(sortByRecent(mapped));
      setLoadingPosts(false);
    };
    fetchPosts();
    return () => {
      active = false;
    };
  }, []);

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
      setSavedIds(new Set());
      return;
    }
    let active = true;
    const supabase = getSupabaseBrowserClient();
    const loadSaved = async () => {
      const { data, error } = await supabase.from("saved_posts").select("post_id");
      if (!active) return;
      if (error || !data) return;
      setSavedIds(new Set(data.map((row) => row.post_id)));
    };
    loadSaved();
    return () => {
      active = false;
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setReactions(new Map());
      return;
    }
    let active = true;
    const supabase = getSupabaseBrowserClient();
    const loadReactions = async () => {
      const { data, error } = await supabase
        .from("post_reactions")
        .select("post_id,reaction");
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
    return () => {
      active = false;
    };
  }, [userId]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel("posts-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "posts" },
        (payload) => {
          const inserted = payload.new as {
            id: string;
            created_at?: string;
            img?: string;
            ava?: string;
            author?: string;
            handle?: string;
            tag?: string;
            title?: string;
            summary?: string;
            desc?: string;
            views?: string;
            likes?: string;
            comments?: string;
            shares?: string;
            impressions_count?: number;
            likes_count?: number;
            dislikes_count?: number;
          };
          const impressions =
            typeof inserted.impressions_count === "number" ? inserted.impressions_count : null;
          const newCard: CardData = {
            id: inserted.id,
            img: inserted.img ?? "",
            ava: inserted.ava ?? "",
            author: inserted.author ?? "",
            handle: inserted.handle ?? "",
            tag: inserted.tag ?? "",
            title: inserted.title ?? "",
            summary: inserted.summary ?? inserted.desc ?? "",
            details: inserted.desc ?? "",
            views: impressions !== null ? formatCount(impressions) : (inserted.views ?? ""),
            likes:
              typeof inserted.likes_count === "number"
                ? formatCount(inserted.likes_count)
                : (inserted.likes ?? ""),
            dislikes:
              typeof inserted.dislikes_count === "number"
                ? formatCount(inserted.dislikes_count)
                : undefined,
            comments: inserted.comments ?? "",
            shares: inserted.shares ?? "",
            createdAt: inserted.created_at ?? undefined,
          };
          setCards((prev) => sortByRecent([newCard, ...prev.filter((card) => card.id !== newCard.id)]));
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "posts" },
        (payload) => {
          const updated = payload.new as {
            id: string;
            impressions_count?: number;
            likes_count?: number;
            dislikes_count?: number;
          };
          setCards((prev) =>
            prev.map((card) =>
              card.id === updated.id
                ? {
                    ...card,
                    views:
                      typeof updated.impressions_count === "number"
                        ? formatCount(updated.impressions_count)
                        : card.views,
                    likes:
                      typeof updated.likes_count === "number"
                        ? formatCount(updated.likes_count)
                        : card.likes,
                    dislikes:
                      typeof updated.dislikes_count === "number"
                        ? formatCount(updated.dislikes_count)
                        : card.dislikes,
                  }
                : card
            )
          );
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!createdPost) return;
    setCards((prev) =>
      sortByRecent([createdPost, ...prev.filter((card) => card.id !== createdPost.id)])
    );
    setCreatedPost(null);
  }, [createdPost, setCreatedPost]);

  useEffect(() => {
    if (popupIndex === null) return;
    const postId = cards[popupIndex]?.id;
    const saved = postId ? savedIds.has(postId) : false;
    const reaction = postId ? reactions.get(postId) : undefined;
    setPopupInteractions((prev) => ({
      ...prev,
      save: saved,
      like: reaction === "like",
      dislike: reaction === "dislike",
    }));
  }, [cards, popupIndex, reactions, savedIds]);

  useEffect(() => {
    if (!popupOpen || popupIndex === null) return;
    const postId = cardsRef.current[popupIndex]?.id;
    if (!postId) return;
    const supabase = getSupabaseBrowserClient();
    const log = async () => {
      const { data } = await supabase.rpc("log_impression", { p_post_id: postId });
      if (typeof data === "number") {
        setCards((prev) =>
          prev.map((card) =>
            card.id === postId ? { ...card, views: formatCount(data) } : card
          )
        );
      }
    };
    log();
  }, [popupIndex, popupOpen]);

  return (
    <>
      <AppShell>
        <PaletteRow />
        {loadingPosts ? (
          <Loader label="Loading posts" />
        ) : (
          <CardGrid
            cards={filteredCards}
            highlightQuery={normalizedQuery}
            savedIds={savedIds}
            onToggleSave={toggleSave}
            reactions={reactions}
            onToggleReaction={toggleReaction}
            onOpenPopup={openPopup}
            onOpenReport={openReport}
          />
        )}
      </AppShell>

      <PopupModal
        open={popupOpen}
        data={popupData}
        interactions={popupInteractions}
        onClose={closePopup}
        onLike={handlePopupLike}
        onDislike={handlePopupDislike}
        onSave={handlePopupSave}
        onReport={() => {
          if (popupIndex !== null) openReport(popupIndex);
        }}
        panelRef={popupPanelRef}
        overlayRef={popupOverlayRef}
      />

      <ReportModal
        open={reportOpen}
        panelRef={reportPanelRef}
        selectedReason={reportReason}
        text={reportText}
        status={reportStatus.state}
        statusMessage={reportStatus.message}
        submitting={reportSubmitting}
        onClose={closeReport}
        onSelectReason={(reason) => setReportReason(reason)}
        onTextChange={setReportText}
        onSubmit={submitReport}
      />
    </>
  );
}
