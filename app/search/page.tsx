"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { AppShell } from "../components/AppShell";
import { CardGrid } from "../components/CardGrid";
import { Loader } from "../components/Loader";
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

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterMode>("posts");
  const [profiles, setProfiles] = useState<ProfileResult[]>([]);
  const [posts, setPosts] = useState<CardData[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);

  useEffect(() => {
    let active = true;
    const loadProfiles = async () => {
      setLoadingProfiles(true);
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, username, full_name, avatar_url")
        .order("username", { ascending: true });
      if (!active) return;
      if (error || !data) {
        setProfiles([]);
        setLoadingProfiles(false);
        return;
      }
      setProfiles(data as ProfileResult[]);
      setLoadingProfiles(false);
    };
    loadProfiles();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const loadPosts = async () => {
      setLoadingPosts(true);
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.from("posts").select("*").order("created_at", {
        ascending: false,
      });
      if (!active) return;
      if (error || !data) {
        setPosts([]);
        setLoadingPosts(false);
        return;
      }
      const mapped = data.map((row) => {
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
          views: row.views ?? "0",
          likes: row.likes ?? "0",
          dislikes: row.dislikes ?? undefined,
          comments: row.comments ?? "0",
          shares: row.shares ?? "0",
          createdAt: row.created_at ?? undefined,
        } as CardData;
      });
      setPosts(mapped);
      setLoadingPosts(false);
    };
    loadPosts();
    return () => {
      active = false;
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
            {query ? (
              <button type="button" className="search-hero-clear" onClick={() => setQuery("")}>
                ×
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
              <span className="search-meta-query">Results for “{query.trim()}”</span>
            ) : (
              <span className="search-meta-query">Type to start searching.</span>
            )}
          </div>

          {filter === "profiles" ? (
            <div className="search-results">
              {loadingProfiles ? (
                <Loader label="Loading profiles" />
              ) : !normalizedQuery ? (
                <div className="search-empty">Start typing to search profiles.</div>
              ) : filteredProfiles.length === 0 ? (
                <div className="search-empty">No profiles match your search.</div>
              ) : (
                <div className="profile-list">
                  {filteredProfiles.map((profile) => (
                    <div className="profile-row" key={profile.user_id}>
                      <div className="profile-row-avatar">
                        {profile.avatar_url ? (
                          <Image src={profile.avatar_url} alt={profile.username ?? "Profile"} fill />
                        ) : (
                          <span>{initialsFrom(profile.full_name ?? profile.username)}</span>
                        )}
                      </div>
                      <div className="profile-row-info">
                        <div className="profile-row-username">
                          {profile.username ? `@${profile.username}` : "@user"}
                        </div>
                        <div className="profile-row-name">{profile.full_name ?? "CloudDuty User"}</div>
                      </div>
                      <button className="profile-row-cta" type="button">
                        View
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="search-results">
              {loadingPosts ? (
                <Loader label="Loading posts" />
              ) : !normalizedQuery ? (
                <div className="search-empty">Start typing to search posts.</div>
              ) : filteredPosts.length === 0 ? (
                <div className="search-empty">No posts match your search.</div>
              ) : (
                <CardGrid
                  cards={filteredPosts}
                  onOpenPopup={(_index, _rect) => {}}
                  onOpenReport={(_index) => {}}
                />
              )}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
