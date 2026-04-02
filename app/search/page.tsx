"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AppShell } from "../components/AppShell";
import { CardGrid } from "../components/CardGrid";
import { Skeleton } from "../components/Skeleton";
import { FollowButton } from "../components/FollowButton";
import { PopupModal, PopupInteractions } from "../components/PopupModal";
import { getSupabaseBrowserClient } from "../lib/supabase/client";
import type { CardData } from "../data/card-data";

type ProfileResult = {
  user_id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

type FilterMode = "profiles" | "posts";

function initialsFrom(name?: string | null) {
  if (!name) return "U";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
}

const initialPopupInteractions: PopupInteractions = {
  like: false,
  dislike: false,
  save: false,
  likePop: false,
  dislikePop: false,
  saveSweep: false,
};

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterMode>("posts");
  const [profiles, setProfiles] = useState<ProfileResult[]>([]);
  const [posts, setPosts] = useState<CardData[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);

  const [popupIndex, setPopupIndex] = useState<number | null>(null);
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupInteractions, setPopupInteractions] = useState<PopupInteractions>(initialPopupInteractions);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [reactions, setReactions] = useState<Map<string, "like" | "dislike">>(new Map());
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const popupPanelRef = useRef<HTMLDivElement | null>(null);
  const popupOverlayRef = useRef<HTMLDivElement | null>(null);
  const isOpenRef = useRef(false);

  const filteredPostsRef = useRef<CardData[]>([]);
  const suggestions = ["System design", "AI Tools", "Payments", "Portfolio"];

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    if (!currentUserId) return;
    const supabase = getSupabaseBrowserClient();
    supabase.from("saved_posts").select("post_id").then(({ data }) => {
      if (data) setSavedIds(new Set(data.map((r) => r.post_id)));
    });
  }, [currentUserId]);

  const loadProfiles = async () => {
    setLoadingProfiles(true);
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, username, full_name, avatar_url")
      .order("username", { ascending: true });
    if (error || !data) {
      setProfiles([]);
      setLoadingProfiles(false);
      return;
    }
    setProfiles(data as ProfileResult[]);
    setLoadingProfiles(false);
  };

  const loadPosts = async () => {
    setLoadingPosts(true);
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase.from("posts").select("*").order("created_at", {
      ascending: false,
    });
    if (error || !data) {
      setPosts([]);
      setLoadingPosts(false);
      return;
    }
    const mapped = data.map((row) => {
      const impressions = typeof row.impressions_count === "number" ? row.impressions_count : null;
      return {
        id: row.id,
        userId: row.user_id ?? undefined,
        img: row.img ?? "",
        ava: row.ava ?? "",
        author: row.author ?? "",
        handle: row.handle ?? "",
        tag: row.tag ?? "",
        title: row.title ?? "",
        summary: row.summary ?? row.desc ?? "",
        details: row.desc ?? "",
        views: impressions !== null ? formatCount(impressions) : (row.views ?? "0"),
        likes:
          typeof row.likes_count === "number"
            ? formatCount(row.likes_count)
            : (row.likes ?? "0"),
        dislikes:
          typeof row.dislikes_count === "number"
            ? formatCount(row.dislikes_count)
            : undefined,
        comments: row.comments ?? "0",
        shares: row.shares ?? "0",
        createdAt: row.created_at ?? undefined,
      } as CardData;
    });
    setPosts(mapped);
    setLoadingPosts(false);
  };

  useEffect(() => {
    loadProfiles();
    loadPosts();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadProfiles();
        loadPosts();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const normalizedQuery = query.trim().toLowerCase();

  const filteredProfiles = useMemo(() => {
    if (!normalizedQuery) return [];
    return profiles.filter((profile) => {
      const username = (profile.username ?? "").toLowerCase();
      const name = (profile.full_name ?? "").toLowerCase();
      return username.includes(normalizedQuery) || name.includes(normalizedQuery);
    });
  }, [normalizedQuery, profiles]);

  const filteredPosts = useMemo(() => {
    if (!normalizedQuery) return [];
    return posts.filter((card) => {
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
    });
  }, [normalizedQuery, posts]);

  useEffect(() => {
    filteredPostsRef.current = filteredPosts;
  }, [filteredPosts]);

  const applyPanelGeometry = useCallback(() => {
    const panel = popupPanelRef.current;
    if (!panel) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const mobile = vw <= 580;
    if (mobile) {
      panel.style.left = "0px";
      panel.style.top = `${vh * 0.1}px`;
      panel.style.width = `${vw}px`;
      panel.style.height = `${vh * 0.9}px`;
      panel.style.borderRadius = "22px 22px 0 0";
    } else {
      const w = Math.min(vw * 0.84, 880);
      const h = Math.min(vh * 0.84, 590);
      panel.style.left = `${(vw - w) / 2}px`;
      panel.style.top = `${(vh - h) / 2}px`;
      panel.style.width = `${w}px`;
      panel.style.height = `${h}px`;
      panel.style.borderRadius = "24px";
    }
  }, []);

  const openPopup = useCallback(
    (index: number) => {
      if (isOpenRef.current) return;
      isOpenRef.current = true;
      setPopupIndex(index);
      setPopupOpen(true);
      setPopupInteractions({ ...initialPopupInteractions });

      const panel = popupPanelRef.current;
      const overlay = popupOverlayRef.current;
      if (!panel || !overlay) return;

      panel.classList.remove("ready", "content-visible");
      applyPanelGeometry();
      panel.style.opacity = "0";
      panel.style.transform = "scale(0.94)";
      panel.style.transition = "";
      overlay.classList.add("active");

      requestAnimationFrame(() => {
        panel.style.transition =
          "opacity 0.22s ease, transform 0.28s cubic-bezier(0.34,1.4,0.64,1)";
        panel.style.opacity = "1";
        panel.style.transform = "scale(1)";
        setTimeout(() => {
          panel.classList.add("ready", "content-visible");
        }, 160);
      });
    },
    [applyPanelGeometry]
  );

  const closePopup = useCallback(() => {
    if (!isOpenRef.current) return;
    isOpenRef.current = false;
    setPopupOpen(false);

    const panel = popupPanelRef.current;
    const overlay = popupOverlayRef.current;
    if (!panel || !overlay) return;

    panel.classList.remove("ready", "content-visible");
    overlay.classList.remove("active");
    panel.style.transition = "opacity 0.18s ease, transform 0.2s ease";
    panel.style.opacity = "0";
    panel.style.transform = "scale(0.96)";

    setTimeout(() => {
      panel.style.cssText = "left:-9999px;opacity:0;";
      setPopupIndex(null);
    }, 220);
  }, []);

  const toggleSave = useCallback(
    async (postId: string) => {
      if (!currentUserId) return;
      const wasSaved = savedIds.has(postId);
      const next = new Set(savedIds);
      if (wasSaved) next.delete(postId);
      else next.add(postId);
      setSavedIds(next);
      const supabase = getSupabaseBrowserClient();
      const { error } = wasSaved
        ? await supabase.from("saved_posts").delete().eq("post_id", postId)
        : await supabase.from("saved_posts").insert({ post_id: postId, user_id: currentUserId });
      if (error) setSavedIds(savedIds);
    },
    [currentUserId, savedIds]
  );

  const toggleReaction = useCallback(
    async (postId: string, reaction: "like" | "dislike") => {
      if (!currentUserId) return;
      const supabase = getSupabaseBrowserClient();
      const next = new Map(reactions);
      const current = reactions.get(postId);
      if (current === reaction) next.delete(postId);
      else next.set(postId, reaction);
      setReactions(next);
      await supabase.rpc("log_reaction", { p_post_id: postId, p_reaction: reaction });
    },
    [currentUserId, reactions]
  );

  const handlePopupLike = useCallback(() => {
    const postId = popupIndex !== null ? filteredPostsRef.current[popupIndex]?.id : undefined;
    if (postId) toggleReaction(postId, "like");
    setPopupInteractions((prev) => ({
      like: !prev.like,
      dislike: !prev.like ? false : prev.dislike,
      save: prev.save,
      likePop: !prev.like,
      dislikePop: false,
      saveSweep: prev.saveSweep,
    }));
  }, [popupIndex, toggleReaction]);

  const handlePopupDislike = useCallback(() => {
    const postId = popupIndex !== null ? filteredPostsRef.current[popupIndex]?.id : undefined;
    if (postId) toggleReaction(postId, "dislike");
    setPopupInteractions((prev) => ({
      like: !prev.dislike ? false : prev.like,
      dislike: !prev.dislike,
      save: prev.save,
      likePop: false,
      dislikePop: !prev.dislike,
      saveSweep: prev.saveSweep,
    }));
  }, [popupIndex, toggleReaction]);

  const handlePopupSave = useCallback(() => {
    const postId = popupIndex !== null ? filteredPostsRef.current[popupIndex]?.id : undefined;
    if (postId) toggleSave(postId);
    setPopupInteractions((prev) => ({
      ...prev,
      save: !prev.save,
      saveSweep: !prev.save,
    }));
  }, [popupIndex, toggleSave]);

  const popupData = popupIndex !== null ? filteredPostsRef.current[popupIndex] : null;

  return (
    <AppShell>
      <div className="page-shell search-page">
        <section className="search-hero">
          <div className="search-hero-input">
            <div className="search-hero-icon">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search for profiles or posts..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <div className="search-filters search-filters--inline">
              <button
                type="button"
                className={`search-filter${filter === "profiles" ? " active" : ""}`}
                onClick={() => setFilter("profiles")}
              >
                Profiles
              </button>
              <button
                type="button"
                className={`search-filter${filter === "posts" ? " active" : ""}`}
                onClick={() => setFilter("posts")}
              >
                Posts
              </button>
            </div>
            <div className="search-filter-select">
              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value as FilterMode)}
                aria-label="Filter results"
              >
                <option value="profiles">Profiles</option>
                <option value="posts">Posts</option>
              </select>
            </div>
            {query ? (
              <button type="button" className="search-hero-clear" onClick={() => setQuery("")}>
                x
              </button>
            ) : null}
          </div>
        </section>

        <section className="search-surface">
          <div className="search-meta">
            <span className="search-meta-pill">
              {filter === "profiles"
                ? `${filteredProfiles.length} Profiles`
                : `${filteredPosts.length} Posts`}
            </span>
            {normalizedQuery ? (
              <span className="search-meta-query">Results for &quot;{query.trim()}&quot;</span>
            ) : null}
          </div>

          {!normalizedQuery ? (
            <div className="search-empty-panel">
              <div className="search-empty-title">Search the CloudDuty workspace</div>
              <div className="search-empty-sub">
                Try a tag, project name, or teammate handle.
              </div>
              <div className="search-empty-hint">Suggestions</div>
              <div className="search-suggestions">
                {suggestions.map((value) => (
                  <button
                    key={value}
                    type="button"
                    className="search-suggestion"
                    onClick={() => {
                      setFilter("posts");
                      setQuery(value);
                    }}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {filter === "profiles" ? (
            <div className="search-results">
              {loadingProfiles ? (
                <div className="profile-list" aria-hidden="true">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div className="profile-row" key={`sk-prof-${index}`}>
                      <div className="profile-row-avatar">
                        <Skeleton className="skeleton-circle skeleton-w-100" />
                      </div>
                      <div className="profile-row-info">
                        <Skeleton className="skeleton-line skeleton-w-60" />
                        <Skeleton className="skeleton-line sm skeleton-w-40" />
                      </div>
                      <div className="profile-row-actions">
                        <Skeleton className="skeleton-chip skeleton-w-80" />
                        <Skeleton className="skeleton-chip skeleton-w-40" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : !normalizedQuery ? null : filteredProfiles.length === 0 ? (
                <div className="search-empty">No profiles match your search.</div>
              ) : (
                <div className="profile-list">
                  {filteredProfiles.map((profile) => (
                    <div className="profile-row" key={profile.user_id}>
                      <div
                        className="profile-row-avatar"
                        onClick={() => router.push(`/user/${profile.user_id}`)}
                        style={{ cursor: "pointer" }}
                      >
                        {profile.avatar_url ? (
                          <Image src={profile.avatar_url} alt={profile.username ?? "Profile"} fill />
                        ) : (
                          <span>{initialsFrom(profile.full_name ?? profile.username)}</span>
                        )}
                      </div>
                      <div
                        className="profile-row-info"
                        onClick={() => router.push(`/user/${profile.user_id}`)}
                        style={{ cursor: "pointer" }}
                      >
                        <div className="profile-row-name">{profile.full_name ?? "CloudDuty User"}</div>
                        <div className="profile-row-username">
                          {profile.username ? `@${profile.username}` : "@user"}
                        </div>
                      </div>
                      <div className="profile-row-actions">
                        <FollowButton targetUserId={profile.user_id} size="sm" />
                        <button
                          className="profile-row-cta"
                          type="button"
                          onClick={() => router.push(`/user/${profile.user_id}`)}
                        >
                          View
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="search-results">
              {loadingPosts ? (
                <div className="masonry" aria-hidden="true">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div className="skeleton-card" key={`sk-post-${index}`}>
                      <Skeleton className="skeleton-thumb" />
                      <Skeleton className="skeleton-line skeleton-w-80" />
                      <Skeleton className="skeleton-line skeleton-w-60" />
                      <Skeleton className="skeleton-line sm skeleton-w-40" />
                    </div>
                  ))}
                </div>
              ) : !normalizedQuery ? null : filteredPosts.length === 0 ? (
                <div className="search-empty">No posts match your search.</div>
              ) : (
                <CardGrid
                  cards={filteredPosts}
                  highlightQuery={normalizedQuery}
                  savedIds={savedIds}
                  onToggleSave={toggleSave}
                  reactions={reactions}
                  onToggleReaction={toggleReaction}
                  onOpenPopup={(index, _rect) => openPopup(index)}
                  onOpenReport={() => {}}
                />
              )}
            </div>
          )}
        </section>
      </div>

      <PopupModal
        open={popupOpen}
        data={popupData}
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
