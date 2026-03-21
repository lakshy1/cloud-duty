"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "../lib/supabase/client";
import { Icon } from "./Icon";
import { useUIState } from "../state/ui-state";

export type ThemeName = "minimal" | "obsidian";

type TopbarProps = {
  theme: ThemeName;
  onThemeSelect: (nextTheme: ThemeName) => void;
  drawerOpen: boolean;
  onToggleDrawer: () => void;
  searchInputRef?: React.RefObject<HTMLInputElement>;
  themeReady?: boolean;
};

export function Topbar({
  theme,
  onThemeSelect,
  drawerOpen,
  onToggleDrawer,
  searchInputRef,
  themeReady = true,
}: TopbarProps) {
  const { searchQuery, setSearchQuery } = useUIState();
  const [profOpen, setProfOpen] = useState(false);
  const profDropRef = useRef<HTMLDivElement | null>(null);
  const [initials, setInitials] = useState("?");
  const [userName, setUserName] = useState("Account");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const handleThemeToggle = useCallback(() => {
    const nextTheme: ThemeName = theme === "minimal" ? "obsidian" : "minimal";
    onThemeSelect(nextTheme);
  }, [onThemeSelect, theme]);

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (profDropRef.current && !profDropRef.current.contains(target)) {
        setProfOpen(false);
      }
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const loadUser = async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user ?? null;
      if (!user) {
        setUserName("Account");
        setInitials("U");
        setAvatarUrl(null);
        return;
      }
      const meta = user.user_metadata ?? {};
      const first = (meta.first_name ?? "").toString().trim();
      const last = (meta.last_name ?? "").toString().trim();
      const nameFromMeta = [first, last].filter(Boolean).join(" ").trim();
      const { data: profile } = await supabase
        .from("profiles")
        .select("username, full_name, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();
      const nameFromProfile = (profile?.full_name ?? "").toString().trim();
      const resolvedName = nameFromProfile || nameFromMeta || profile?.username || "Account";
      const initialsSource = nameFromProfile || nameFromMeta || profile?.username || "U";
      const initialsFromName = initialsSource
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join("");
      setUserName(resolvedName);
      setInitials(initialsFromName || "U");
      setAvatarUrl(profile?.avatar_url || meta.avatar_url || null);
    };
    loadUser();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadUser();
    });
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }, []);

  return (
    <header className="topbar">
      <button
        className={`m-burger${drawerOpen ? " open" : ""}`}
        id="mBurger"
        onClick={onToggleDrawer}
        aria-label="Menu"
        aria-expanded={drawerOpen}
        aria-controls="mDrawer"
      >
        <span />
        <span />
        <span />
      </button>

      <div className="search-bar search-bar--wide">
        <Icon name="search" className="search-ico" />
        <input
          ref={searchInputRef}
          id="globalSearch"
          type="text"
          placeholder="Search posts, boards..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
        />
        {searchQuery ? (
          <button
            className="search-clear"
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setSearchQuery("");
              searchInputRef?.current?.focus();
            }}
          >
            ×
          </button>
        ) : null}
        <span className="search-kbd">/</span>
      </div>

      <div className="topbar-space" />

      <div className="theme-switch">
        <button
          className={`theme-slider${themeReady && theme === "obsidian" ? " on" : ""}`}
          type="button"
          role="switch"
          aria-checked={themeReady && theme === "obsidian"}
          aria-label="Toggle dark mode"
          suppressHydrationWarning
          onClick={(event) => {
            event.stopPropagation();
            handleThemeToggle();
          }}
        >
          <span className="theme-track" />
          <span className="theme-thumb">
            <span className="theme-glyph sun" aria-hidden="true" />
            <span className="theme-glyph moon" aria-hidden="true" />
          </span>
        </button>
      </div>

      <div className={`prof-drop${profOpen ? " open" : ""}`} id="profDrop" ref={profDropRef}>
        <div
          className="prof"
          role="button"
          tabIndex={0}
          aria-haspopup="menu"
          aria-expanded={profOpen}
          aria-controls="profMenu"
          onClick={(event) => {
            event.stopPropagation();
            setProfOpen((prev) => !prev);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setProfOpen((prev) => !prev);
            }
          }}
        >
          <div className="prof-ava" aria-label={userName}>
            {avatarUrl ? <img src={avatarUrl} alt={userName} /> : initials}
          </div>
          <Icon name="chevron-down" className="prof-chev" />
        </div>
        <div className="prof-menu" id="profMenu">
          <a className="prof-opt" href="/profile">
            <svg viewBox="0 0 24 24">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            Profile
          </a>
          <a className="prof-opt" href="/my-posts">
            <svg viewBox="0 0 24 24">
              <path d="M6 3h9l3 3v15a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
              <path d="M9 13h6" />
              <path d="M9 17h6" />
              <path d="M9 9h3" />
            </svg>
            My Posts
          </a>
          <a className="prof-opt" href="/saved">
            <svg viewBox="0 0 24 24">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            Saved Posts
          </a>
          <a className="prof-opt" href="/settings">
            <Icon name="settings" />
            Settings
          </a>
          <div className="prof-menu-sep" />
          <button className="prof-opt danger" type="button" onClick={handleLogout}>
            <svg viewBox="0 0 24 24">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Log Out
          </button>
        </div>
      </div>
    </header>
  );
}
