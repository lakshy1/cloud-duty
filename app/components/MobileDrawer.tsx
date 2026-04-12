"use client";

import Link from "next/link";
import Image from "next/image";
import { RefObject } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "./Icon";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { useUIState } from "../state/ui-state";

type MobileDrawerProps = {
  open: boolean;
  panelRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  onCreate?: () => void;
  onSearch?: () => void;
};

export function MobileDrawer({ open, panelRef, onClose, onCreate, onSearch }: MobileDrawerProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);
  const { isLoggedIn, setLoginPromptOpen } = useUIState();

  useFocusTrap(panelRef, open, { onEscape: onClose });

  const requireAuth = (action: () => void) => {
    onClose();
    if (isLoggedIn) {
      action();
    } else {
      setLoginPromptOpen(true);
    }
  };

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
          <Link className="m-drawer-logo" href="/" onClick={onClose}>
            <div className="m-drawer-logo-icon">
              <Image src="/logo.png" alt="Cloudduty logo" width={40} height={40} placeholder="empty" style={{ background: "transparent" }} />
            </div>
            <span className="m-drawer-title">Reading Queue</span>
          </Link>
          <button className="m-drawer-close" onClick={onClose} aria-label="Close menu">
            <svg viewBox="0 0 24 24">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="m-drawer-sep" />
        <Link className={`m-nav-item${isActive("/") ? " active" : ""}`} href="/" onClick={onClose}>
          <Icon name="home" />
          Home
        </Link>
        <button
          className={`m-nav-item${isActive("/search") ? " active" : ""}`}
          type="button"
          onClick={() => requireAuth(() => router.push("/search"))}
        >
          <Icon name="search" />
          Search
        </button>
        <button
          className={`m-nav-item${isActive("/my-posts") ? " active" : ""}`}
          type="button"
          onClick={() => requireAuth(() => router.push("/my-posts"))}
        >
          <Icon name="file" />
          My Posts
        </button>
        <button
          className={`m-nav-item${isActive("/inbox") ? " active" : ""}`}
          type="button"
          onClick={() => requireAuth(() => router.push("/inbox"))}
        >
          <Icon name="messages" />
          Inbox
        </button>
        <button
          className="m-nav-item"
          onClick={() => requireAuth(() => onCreate?.())}
          type="button"
        >
          <Icon name="create" />
          Create
        </button>
        <div className="m-drawer-sep" />
        <button
          className={`m-nav-item${isActive("/notifications") ? " active" : ""}`}
          type="button"
          onClick={() => requireAuth(() => router.push("/notifications"))}
        >
          <Icon name="notifications" />
          Notifications
        </button>
        <Link className={`m-nav-item${isActive("/settings") ? " active" : ""}`} href="/settings" onClick={onClose}>
          <Icon name="settings" />
          Settings
        </Link>
      </nav>
    </div>
  );
}
