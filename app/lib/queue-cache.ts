"use client";

import { getSupabaseBrowserClient } from "./supabase/client";
import type { CardData } from "../data/card-data";

const SESSION_FLAG = "cd_queue_prefetched";

function cacheKey(userId: string) {
  return `cd_queue_${userId}`;
}

function formatCount(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return `${value}`;
}

/** Fetch saved posts from Supabase and persist to localStorage. */
export async function syncQueueCache(userId: string): Promise<void> {
  try {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("saved_posts")
      .select("post:posts(*)")
      .order("created_at", { ascending: false });

    if (error || !data) return;

    const mapped = (data as unknown as Array<{ post: Record<string, unknown> | null }>)
      .map((row) => row.post)
      .filter(Boolean)
      .map((item) => {
        const post = item as Record<string, unknown>;
        const impressions =
          typeof post.impressions_count === "number" ? post.impressions_count : null;
        return {
          id: post.id as string,
          img: (post.img as string) ?? "",
          ava: (post.ava as string) ?? "",
          author: (post.author as string) ?? "",
          handle: (post.handle as string) ?? "",
          tag: (post.tag as string) ?? "",
          title: (post.title as string) ?? "",
          summary: ((post.summary as string) ?? (post.desc as string)) ?? "",
          details: (post.desc as string) ?? "",
          views:
            impressions !== null
              ? formatCount(impressions)
              : ((post.views as string) ?? ""),
          likes:
            typeof post.likes_count === "number"
              ? formatCount(post.likes_count as number)
              : ((post.likes as string) ?? ""),
          dislikes:
            typeof post.dislikes_count === "number"
              ? formatCount(post.dislikes_count as number)
              : undefined,
          comments: (post.comments as string) ?? "",
          shares: (post.shares as string) ?? "",
          createdAt: (post.created_at as string) ?? undefined,
        } as CardData;
      });

    localStorage.setItem(cacheKey(userId), JSON.stringify(mapped));
  } catch {
    // Network or storage error — silently skip
  }
}

/**
 * Call once per fresh app session.
 * Uses sessionStorage to avoid re-fetching while the tab/app is already open.
 */
export async function prefetchQueueIfNeeded(): Promise<void> {
  if (typeof window === "undefined") return;
  if (sessionStorage.getItem(SESSION_FLAG)) return;

  try {
    const supabase = getSupabaseBrowserClient();
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user?.id;
    if (!userId) return;

    sessionStorage.setItem(SESSION_FLAG, "1");
    await syncQueueCache(userId);
  } catch {
    // Ignore — offline or unauthenticated
  }
}

/** Call after save / unsave to keep cache in sync. */
export async function refreshQueueCache(userId: string): Promise<void> {
  await syncQueueCache(userId);
}

/** Read cached queue cards from localStorage (offline use). */
export function getCachedQueue(userId: string): CardData[] {
  try {
    const raw = localStorage.getItem(cacheKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CardData[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
