"use client";

import { usePathname } from "next/navigation";
import { Icon } from "./Icon";
import { useUIState } from "../state/ui-state";

type SidebarProps = {
  onCreate?: () => void;
  onSearch?: () => void;
};

export function Sidebar({ onCreate, onSearch }: SidebarProps) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);
  const { createOpen, isLoggedIn, setLoginPromptOpen } = useUIState();

  const requireAuth = (action: () => void) => {
    if (isLoggedIn) {
      action();
    } else {
      setLoginPromptOpen(true);
    }
  };

  return (
    <aside className="sidebar">
      <a className="sb-logo" href="/">
        <Icon name="cloud" stroke="#fff" />
      </a>
      <div className="sb-sep" />
      <a className={`sb-btn${isActive("/") ? " active" : ""}`} href="/" aria-label="Home">
        <Icon name="home" />
      </a>
      <button
        className={`sb-btn${isActive("/search") ? " active" : ""}`}
        type="button"
        aria-label="Search"
        onClick={() => requireAuth(() => { window.location.href = "/search"; })}
      >
        <Icon name="search" />
      </button>
      <button
        className={`sb-btn${isActive("/my-posts") ? " active" : ""}`}
        type="button"
        aria-label="My Posts"
        onClick={() => requireAuth(() => { window.location.href = "/my-posts"; })}
      >
        <Icon name="file" />
      </button>
      <button
        className={`sb-btn${isActive("/inbox") ? " active" : ""}`}
        type="button"
        aria-label="Inbox"
        onClick={() => requireAuth(() => { window.location.href = "/inbox"; })}
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
        onClick={() => requireAuth(() => { window.location.href = "/notifications"; })}
      >
        <Icon name="notifications" />
      </button>
      <a className={`sb-btn${isActive("/settings") ? " active" : ""}`} href="/settings" aria-label="Settings">
        <Icon name="settings" />
      </a>
      <div className="sb-space" />
    </aside>
  );
}
