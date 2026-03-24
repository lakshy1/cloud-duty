"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../lib/supabase/client";

export function useFollow(targetUserId: string | null) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    if (!targetUserId) return;
    let active = true;
    const supabase = getSupabaseBrowserClient();

    const check = async () => {
      const [followRes, countRes] = await Promise.all([
        currentUserId
          ? supabase
              .from("follows")
              .select("follower_id", { count: "exact", head: true })
              .eq("follower_id", currentUserId)
              .eq("following_id", targetUserId)
          : Promise.resolve({ count: 0 }),
        supabase
          .from("follows")
          .select("follower_id", { count: "exact", head: true })
          .eq("following_id", targetUserId),
      ]);
      if (!active) return;
      setIsFollowing(((followRes as { count: number | null }).count ?? 0) > 0);
      setFollowerCount((countRes as { count: number | null }).count ?? 0);
      setInitialized(true);
    };

    check();
    return () => {
      active = false;
    };
  }, [currentUserId, targetUserId]);

  const toggle = useCallback(async () => {
    if (!currentUserId || !targetUserId) return;
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    if (isFollowing) {
      await supabase
        .from("follows")
        .delete()
        .eq("follower_id", currentUserId)
        .eq("following_id", targetUserId);
      setIsFollowing(false);
      setFollowerCount((prev) => Math.max(0, prev - 1));
    } else {
      await supabase.from("follows").insert({
        follower_id: currentUserId,
        following_id: targetUserId,
      });
      setIsFollowing(true);
      setFollowerCount((prev) => prev + 1);
    }
    setLoading(false);
  }, [currentUserId, isFollowing, targetUserId]);

  const isOwnProfile = currentUserId !== null && currentUserId === targetUserId;
  const isLoggedIn = currentUserId !== null;

  return { isFollowing, followerCount, loading, toggle, currentUserId, isOwnProfile, isLoggedIn, initialized };
}
