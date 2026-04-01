"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "./Icon";
import { useUIState } from "../state/ui-state";

type SidebarProps = {
  onCreate?: () => void;
  onSearch?: () => void;
};

export function Sidebar({ onCreate, onSearch }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);
  const { createOpen, isLoggedIn, setLoginPromptOpen, hasUnreadNotifications } = useUIState();

  const requireAuth = (action: () => void) => {
    if (isLoggedIn) {
      action();
    } else {
      setLoginPromptOpen(true);
    }
  };

  return (
    <aside className="sidebar">
      <Link className="sb-logo" href="/">
        <Icon name="cloud" stroke="#fff" />
      </Link>
      <div className="sb-sep" />
      <Link className={`sb-btn${isActive("/") ? " active" : ""}`} href="/" aria-label="Home">
        <Icon name="home" />
      </Link>
      <button
        className={`sb-btn${isActive("/search") ? " active" : ""}`}
        type="button"
        aria-label="Search"
        onClick={() => requireAuth(() => router.push("/search"))}
      >
        <Icon name="search" />
      </button>
      <button
        className={`sb-btn${isActive("/my-posts") ? " active" : ""}`}
        type="button"
        aria-label="My Posts"
        onClick={() => requireAuth(() => router.push("/my-posts"))}
      >
        <Icon name="file" />
      </button>
      <button
        className={`sb-btn${isActive("/inbox") ? " active" : ""}`}
        type="button"
        aria-label="Inbox"
        onClick={() => requireAuth(() => router.push("/inbox"))}
      >
        <Icon name="messages" />
      </button>
      <button
        className={`sb-btn${createOpen ? " active" : ""}`}
        onClick={() => requireAuth(() => onCreate?.())}
        type="button"
        aria-label="Create"
      >
        <Icon name="create" />
      </button>
      <div className="sb-sep" />
      <button
        className={`sb-btn${isActive("/notifications") ? " active" : ""}`}
        type="button"
        aria-label="Notifications"
        onClick={() => requireAuth(() => router.push("/notifications"))}
      >
        <Icon name="notifications" />
        {hasUnreadNotifications ? <span className="sb-dot" aria-hidden="true" /> : null}
      </button>
      <Link className={`sb-btn${isActive("/settings") ? " active" : ""}`} href="/settings" aria-label="Settings">
        <Icon name="settings" />
      </Link>
      <div className="sb-space" />
    </aside>
  );
}
