"use client";

import { useFollow } from "../hooks/useFollow";
import { useUIState } from "../state/ui-state";

type FollowButtonProps = {
  targetUserId: string | null | undefined;
  className?: string;
  size?: "sm" | "md";
};

export function FollowButton({ targetUserId, className = "", size = "md" }: FollowButtonProps) {
  const { isFollowing, loading, toggle, isOwnProfile, isLoggedIn } = useFollow(targetUserId ?? null);
  const { setLoginPromptOpen } = useUIState();

  if (!targetUserId || isOwnProfile) return null;

  const handleClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!isLoggedIn) {
      setLoginPromptOpen(true);
      return;
    }
    toggle();
  };

  return (
    <button
      className={`follow-btn${isFollowing ? " follow-btn--following" : ""}${size === "sm" ? " follow-btn--sm" : ""} ${className}`.trim()}
      onClick={handleClick}
      disabled={loading}
      type="button"
      aria-label={isFollowing ? "Unfollow" : "Follow"}
    >
      {isFollowing ? (
        <>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Following
        </>
      ) : (
        <>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Follow
        </>
      )}
    </button>
  );
}
