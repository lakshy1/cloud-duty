"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { AppShell } from "../../components/AppShell";
import { Loader } from "../../components/Loader";
import { FollowButton } from "../../components/FollowButton";
import { CardGrid } from "../../components/CardGrid";
import { PopupModal, PopupInteractions } from "../../components/PopupModal";
import { getSupabaseBrowserClient } from "../../lib/supabase/client";
import type { CardData } from "../../data/card-data";

type ProfileData = {
  user_id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  cover_url: string | null;
};

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
}

function initials(name?: string | null, fallback = "U") {
  if (!name) return fallback;
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");
}

const initialPopupInteractions: PopupInteractions = {
  like: false,
  dislike: false,
  save: false,
  likePop: false,
  dislikePop: false,
  saveSweep: false,
};

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const targetUserId = typeof params?.userId === "string" ? params.userId : null;

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [posts, setPosts] = useState<CardData[]>([]);
  const [stats, setStats] = useState({ posts: 0, likes: 0, followers: 0, following: 0 });
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [popupIndex, setPopupIndex] = useState<number | null>(null);
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupInteractions, setPopupInteractions] = useState<PopupInteractions>(initialPopupInteractions);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [reactions, setReactions] = useState<Map<string, "like" | "dislike">>(new Map());

  const popupPanelRef = useRef<HTMLDivElement | null>(null);
  const popupOverlayRef = useRef<HTMLDivElement | null>(null);
  const isOpenRef = useRef(false);

  const popupData = popupIndex !== null ? posts[popupIndex] : null;

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    if (!targetUserId) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    let active = true;
    const supabase = getSupabaseBrowserClient();

    const load = async () => {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("user_id, username, full_name, avatar_url, cover_url")
        .eq("user_id", targetUserId)
        .maybeSingle();

      if (!active) return;
      if (!profileData) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setProfile(profileData as ProfileData);

      const [postsRes, followersRes, followingRes, likesRes] = await Promise.all([
        supabase
          .from("posts")
          .select("*")
          .eq("user_id", targetUserId)
          .order("created_at", { ascending: false }),
        supabase
          .from("follows")
          .select("follower_id", { count: "exact", head: true })
          .eq("following_id", targetUserId),
        supabase
          .from("follows")
          .select("following_id", { count: "exact", head: true })
          .eq("follower_id", targetUserId),
        supabase.from("posts").select("likes_count").eq("user_id", targetUserId),
      ]);

      if (!active) return;

      const mappedPosts: CardData[] = (postsRes.data ?? []).map((row) => ({
        id: row.id,
        userId: row.user_id,
        img: row.img ?? "",
        ava: row.ava ?? "",
        author: row.author ?? "",
        handle: row.handle ?? "",
        tag: row.tag ?? "",
        title: row.title ?? "",
        summary: row.summary ?? row.desc ?? "",
        details: row.desc ?? "",
        views:
          typeof row.impressions_count === "number"
            ? formatCount(row.impressions_count)
            : (row.views ?? "0"),
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
        createdAt: row.created_at,
      }));

      setPosts(mappedPosts);

      const totalLikes = (likesRes.data ?? []).reduce(
        (sum, row) =>
          sum + (typeof row.likes_count === "number" ? row.likes_count : 0),
        0
      );
      setStats({
        posts: postsRes.data?.length ?? 0,
        followers: followersRes.count ?? 0,
        following: followingRes.count ?? 0,
        likes: totalLikes,
      });
      setLoading(false);
    };

    load();
    return () => {
      active = false;
    };
  }, [targetUserId]);

  useEffect(() => {
    if (!currentUserId) return;
    const supabase = getSupabaseBrowserClient();
    supabase
      .from("saved_posts")
      .select("post_id")
      .then(({ data }) => {
        if (data) setSavedIds(new Set(data.map((r) => r.post_id)));
      });
  }, [currentUserId]);

  const applyPanelGeometry = useCallback(() => {
    const panel = popupPanelRef.current;
    if (!panel) return { mobile: false };
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
    return { mobile };
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
        panel.style.transition = "opacity 0.22s ease, transform 0.28s cubic-bezier(0.34,1.4,0.64,1)";
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
    const postId = popupIndex !== null ? posts[popupIndex]?.id : undefined;
    if (postId) toggleReaction(postId, "like");
    setPopupInteractions((prev) => ({
      like: !prev.like,
      dislike: !prev.like ? false : prev.dislike,
      save: prev.save,
      likePop: !prev.like,
      dislikePop: false,
      saveSweep: prev.saveSweep,
    }));
  }, [popupIndex, posts, toggleReaction]);

  const handlePopupDislike = useCallback(() => {
    const postId = popupIndex !== null ? posts[popupIndex]?.id : undefined;
    if (postId) toggleReaction(postId, "dislike");
    setPopupInteractions((prev) => ({
      like: !prev.dislike ? false : prev.like,
      dislike: !prev.dislike,
      save: prev.save,
      likePop: false,
      dislikePop: !prev.dislike,
      saveSweep: prev.saveSweep,
    }));
  }, [popupIndex, posts, toggleReaction]);

  const handlePopupSave = useCallback(() => {
    const postId = popupIndex !== null ? posts[popupIndex]?.id : undefined;
    if (postId) toggleSave(postId);
    setPopupInteractions((prev) => ({
      ...prev,
      save: !prev.save,
      saveSweep: !prev.save,
    }));
  }, [popupIndex, posts, toggleSave]);

  const displayName = profile?.full_name || profile?.username || "User";
  const handle = profile?.username ? `@${profile.username}` : "";

  if (loading) {
    return (
      <AppShell>
        <div className="page-shell">
          <div className="page-card" style={{ minHeight: 320, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Loader label="Loading profile" />
          </div>
        </div>
      </AppShell>
    );
  }

  if (notFound || !profile) {
    return (
      <AppShell>
        <div className="page-shell">
          <div className="page-card user-profile-not-found">
            <div className="user-profile-nf-icon">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
              </svg>
            </div>
            <h2>Profile not found</h2>
            <p>This user doesn&apos;t exist or hasn&apos;t set up their profile yet.</p>
            <button className="pp-act-primary" onClick={() => router.back()}>
              Go back
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="page-shell">
        <div className="user-profile-card">
          <div
            className="user-profile-cover"
            style={profile.cover_url ? { backgroundImage: `url(${profile.cover_url})` } : undefined}
          >
            <div className="user-profile-cover-bg" aria-hidden="true" />
            <div className="user-profile-cover-content">
              <div className="user-profile-avatar-wrap">
                {profile.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt={displayName}
                    fill
                    sizes="96px"
                    className="user-profile-avatar-img"
                  />
                ) : (
                  <span className="user-profile-avatar-initials">{initials(displayName)}</span>
                )}
              </div>
              <div className="user-profile-identity">
                <div className="user-profile-name">{displayName}</div>
                {handle && <div className="user-profile-handle">{handle}</div>}
              </div>
              <div className="user-profile-actions">
                {currentUserId === targetUserId ? (
                  <button
                    className="pp-act-secondary"
                    onClick={() => router.push("/profile")}
                    type="button"
                  >
                    Edit Profile
                  </button>
                ) : (
                  <FollowButton targetUserId={targetUserId} size="md" />
                )}
              </div>
            </div>
          </div>

          <div className="user-profile-stats">
            <div className="user-profile-stat">
              <div className="user-profile-stat-val">{formatCount(stats.posts)}</div>
              <div className="user-profile-stat-label">Posts</div>
            </div>
            <div className="user-profile-stat">
              <div className="user-profile-stat-val">{formatCount(stats.followers)}</div>
              <div className="user-profile-stat-label">Followers</div>
            </div>
            <div className="user-profile-stat">
              <div className="user-profile-stat-val">{formatCount(stats.following)}</div>
              <div className="user-profile-stat-label">Following</div>
            </div>
            <div className="user-profile-stat">
              <div className="user-profile-stat-val">{formatCount(stats.likes)}</div>
              <div className="user-profile-stat-label">Likes</div>
            </div>
          </div>

          <div className="user-profile-posts-section">
            {posts.length === 0 ? (
              <div className="user-profile-empty">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M3 9h18M9 21V9" />
                </svg>
                <p>No posts yet</p>
              </div>
            ) : (
              <CardGrid
                cards={posts}
                savedIds={savedIds}
                onToggleSave={toggleSave}
                reactions={reactions}
                onToggleReaction={toggleReaction}
                onOpenPopup={(index, _rect) => openPopup(index)}
                onOpenReport={() => {}}
              />
            )}
          </div>
        </div>
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
