"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "./Icon";
import { useUIState } from "../state/ui-state";

type MobileBottomNavProps = {
  onCreate?: () => void;
};

export function MobileBottomNav({ onCreate }: MobileBottomNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isLoggedIn, setLoginPromptOpen, hasUnreadNotifications, inboxUnreadCount } = useUIState();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const requireAuth = (action: () => void) => {
    if (isLoggedIn) {
      action();
    } else {
      setLoginPromptOpen(true);
    }
  };

  return (
    <nav className="mob-bottom-nav" aria-label="Main navigation">
      <Link
        className={`mbn-btn${isActive("/") ? " active" : ""}`}
        href="/"
        aria-label="Home"
      >
        <Icon name="home" />
      </Link>

      <button
        className={`mbn-btn${isActive("/queue") ? " active" : ""}`}
        type="button"
        aria-label="Queue"
        onClick={() => requireAuth(() => router.push("/queue"))}
      >
        <Icon name="queue" />
      </button>

      <button
        className={`mbn-btn${isActive("/search") ? " active" : ""}`}
        type="button"
        aria-label="Search"
        onClick={() => router.push("/search")}
      >
        <Icon name="search" />
      </button>

      <button
        className={`mbn-btn${isActive("/inbox") ? " active" : ""}`}
        type="button"
        aria-label="Inbox"
        onClick={() => requireAuth(() => router.push("/inbox"))}
      >
        <span className="mbn-icon-wrap">
          <Icon name="messages" />
          <span
            className="mbn-badge"
            data-empty={inboxUnreadCount === 0 ? "true" : "false"}
            aria-hidden={inboxUnreadCount === 0}
          >
            {inboxUnreadCount > 99 ? "99+" : inboxUnreadCount || ""}
          </span>
        </span>
      </button>

      <button
        className={`mbn-btn${isActive("/notifications") ? " active" : ""}`}
        type="button"
        aria-label="Notifications"
        onClick={() => requireAuth(() => router.push("/notifications"))}
      >
        <span className="mbn-icon-wrap">
          <Icon name="notifications" />
          {hasUnreadNotifications ? <span className="mbn-dot" aria-hidden="true" /> : null}
        </span>
      </button>
    </nav>
  );
}
