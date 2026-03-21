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
  const { createOpen } = useUIState();

  return (
    <aside className="sidebar">
      <a className="sb-logo" href="/">
        <Icon name="cloud" stroke="#fff" />
      </a>
      <div className="sb-sep" />
      <a className={`sb-btn${isActive("/") ? " active" : ""}`} href="/" aria-label="Home">
        <Icon name="home" />
      </a>
      <a className={`sb-btn${isActive("/search") ? " active" : ""}`} href="/search" aria-label="Search">
        <Icon name="search" />
      </a>
      <a className={`sb-btn${isActive("/my-posts") ? " active" : ""}`} href="/my-posts" aria-label="My Posts">
        <Icon name="file" />
      </a>
      <a className={`sb-btn${isActive("/inbox") ? " active" : ""}`} href="/inbox" aria-label="Inbox">
        <Icon name="messages" />
      </a>
      <button
        className={`sb-btn${createOpen ? " active" : ""}`}
        onClick={onCreate}
        type="button"
        aria-label="Create"
      >
        <Icon name="create" />
      </button>
      <div className="sb-sep" />
      <a
        className={`sb-btn${isActive("/notifications") ? " active" : ""}`}
        href="/notifications"
        aria-label="Notifications"
      >
        <Icon name="notifications" />
      </a>
      <a className={`sb-btn${isActive("/settings") ? " active" : ""}`} href="/settings" aria-label="Settings">
        <Icon name="settings" />
      </a>
      <div className="sb-space" />
    </aside>
  );
}
