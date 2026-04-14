"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef } from "react";
import { Capacitor } from "@capacitor/core";
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
  const { createOpen, isLoggedIn, setLoginPromptOpen, hasUnreadNotifications, inboxUnreadCount } = useUIState();
  const videoRef = useRef<HTMLVideoElement>(null);
  const isNative = Capacitor.isNativePlatform();

  const handleMouseEnter = () => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = 0;
    v.play();
  };

  const handleMouseLeave = () => {
    // let the video finish playing completely — paused by onEnded
  };

  const requireAuth = (action: () => void) => {
    if (isLoggedIn) {
      action();
    } else {
      setLoginPromptOpen(true);
    }
  };

  return (
    <aside className="sidebar">
      <Link
        className="sb-logo"
        href="/"
        onMouseEnter={isNative ? undefined : handleMouseEnter}
        onMouseLeave={isNative ? undefined : handleMouseLeave}
      >
        {isNative ? (
          <Image
            src="/logo.png"
            alt="Reading Queue logo"
            width={48}
            height={47}
            priority
            style={{ borderRadius: 7, background: "transparent", display: "block" }}
          />
        ) : (
          <video
            ref={videoRef}
            autoPlay={!isNative}
            muted
            playsInline
            onEnded={() => videoRef.current?.pause()}
            style={{ width: 48, height: 47, borderRadius: 7, background: "transparent", display: "block" }}
          >
            <source src="/logo-video-transparent.webm" type="video/webm" />
            <source src="/logo-video.mp4" type="video/mp4" />
          </video>
        )}
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
        className={`sb-btn${isActive("/queue") ? " active" : ""}`}
        type="button"
        aria-label="Queue"
        onClick={() => requireAuth(() => router.push("/queue"))}
      >
        <Icon name="queue" />
      </button>
      <button
        className={`sb-btn${isActive("/inbox") ? " active" : ""}`}
        type="button"
        aria-label="Inbox"
        onClick={() => requireAuth(() => router.push("/inbox"))}
      >
        <Icon name="messages" />
        <span
          className="sb-inbox-count"
          data-empty={inboxUnreadCount === 0 ? "true" : "false"}
          aria-label={inboxUnreadCount ? `${inboxUnreadCount} unread threads` : undefined}
          aria-hidden={inboxUnreadCount === 0}
        >
          {inboxUnreadCount > 99 ? "99+" : inboxUnreadCount || ""}
        </span>
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
