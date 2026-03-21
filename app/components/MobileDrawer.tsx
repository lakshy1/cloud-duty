"use client";

import { RefObject } from "react";
import { usePathname } from "next/navigation";
import { Icon } from "./Icon";
import { useFocusTrap } from "../hooks/useFocusTrap";

type MobileDrawerProps = {
  open: boolean;
  panelRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  onCreate?: () => void;
  onSearch?: () => void;
};

export function MobileDrawer({ open, panelRef, onClose, onCreate, onSearch }: MobileDrawerProps) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  useFocusTrap(panelRef, open, { onEscape: onClose });

  return (
    <div className={`m-drawer${open ? " open" : ""}`} id="mDrawer">
      <div className="m-drawer-backdrop" onClick={onClose} />
      <nav
        className="m-drawer-panel"
        ref={panelRef as RefObject<HTMLDivElement | null>}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation"
        aria-hidden={!open}
        tabIndex={-1}
      >
        <div className="m-drawer-head">
          <a className="m-drawer-logo" href="/" onClick={onClose}>
            <div className="m-drawer-logo-icon">
              <Icon name="cloud" stroke="#fff" />
            </div>
            <span className="m-drawer-title">CloudDuty</span>
          </a>
          <button className="m-drawer-close" onClick={onClose} aria-label="Close menu">
            <svg viewBox="0 0 24 24">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="m-drawer-sep" />
        <a className={`m-nav-item${isActive("/") ? " active" : ""}`} href="/" onClick={onClose}>
          <Icon name="home" />
          Home
        </a>
        <a className={`m-nav-item${isActive("/search") ? " active" : ""}`} href="/search" onClick={onClose}>
          <Icon name="search" />
          Search
        </a>
        <a className={`m-nav-item${isActive("/my-posts") ? " active" : ""}`} href="/my-posts" onClick={onClose}>
          <Icon name="file" />
          My Posts
        </a>
        <a className={`m-nav-item${isActive("/inbox") ? " active" : ""}`} href="/inbox" onClick={onClose}>
          <Icon name="messages" />
          Inbox
        </a>
        <button
          className="m-nav-item"
          onClick={() => {
            onClose();
            onCreate?.();
          }}
          type="button"
        >
          <Icon name="create" />
          Create
        </button>
        <div className="m-drawer-sep" />
        <a
          className={`m-nav-item${isActive("/notifications") ? " active" : ""}`}
          href="/notifications"
          onClick={onClose}
        >
          <Icon name="notifications" />
          Notifications
        </a>
        <a className={`m-nav-item${isActive("/profile") ? " active" : ""}`} href="/profile" onClick={onClose}>
          <Icon name="settings" />
          Profile
        </a>
      </nav>
    </div>
  );
}
