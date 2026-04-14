"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Footer } from "./Footer";
import { MobileDrawer } from "./MobileDrawer";
import { MobileBottomNav } from "./MobileBottomNav";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { Toasts } from "./Toasts";
import { Icon } from "./Icon";
import { useUIState } from "../state/ui-state";
import { CreatePostModal } from "./CreatePostModal";
import { LoginPromptModal } from "./LoginPromptModal";
import { getSupabaseBrowserClient } from "../lib/supabase/client";

export function AppShell({
  children,
  routeClassName,
}: {
  children: React.ReactNode;
  routeClassName?: string;
}) {
  const {
    drawerOpen, setDrawerOpen,
    createOpen, setCreateOpen,
    loginPromptOpen, setLoginPromptOpen,
    setIsLoggedIn,
    isLoggedIn,
  } = useUIState();
  const pathname = usePathname();
  const drawerPanelRef = useRef<HTMLElement>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const feedRef = useRef<HTMLElement>(null);
  const lastScrollYRef = useRef(0);
  const [topbarHidden, setTopbarHidden] = useState(false);
  const showFab = pathname === "/";

  // Hide Capacitor native splash screen once app shell mounts
  useEffect(() => {
    const hideSplash = async () => {
      try {
        // @ts-ignore - Capacitor types may not be available
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.SplashScreen) {
          // @ts-ignore
          await window.Capacitor.Plugins.SplashScreen.hide();
        }
      } catch (e) {
        // SplashScreen plugin not available (web only)
      }
    };
    hideSplash();
  }, []);

  // Auth state subscription
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      setIsLoggedIn(!!data.session);
    };
    checkAuth();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
    });
    return () => subscription.unsubscribe();
  }, [setIsLoggedIn]);

  // Scroll-direction detection — auto-hide topbar on scroll down, reveal on scroll up
  useEffect(() => {
    const el = feedRef.current;
    if (!el) return;

    const handleScroll = () => {
      const y = el.scrollTop;
      const delta = y - lastScrollYRef.current;
      if (Math.abs(delta) < 6) return; // ignore tiny jitter
      if (delta > 0 && y > 80) {
        setTopbarHidden(true);
      } else if (delta < 0) {
        setTopbarHidden(false);
      }
      lastScrollYRef.current = y;
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  const handleCreate = () => {
    if (isLoggedIn) {
      setCreateOpen(true);
    } else {
      setLoginPromptOpen(true);
    }
  };

  return (
    <>
      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        panelRef={drawerPanelRef}
        onCreate={() => setCreateOpen(true)}
        onSearch={() => {
          searchInputRef.current?.focus();
        }}
      />

      <Sidebar
        onCreate={() => setCreateOpen(true)}
        onSearch={() => {
          searchInputRef.current?.focus();
        }}
      />

      <Topbar
        drawerOpen={drawerOpen}
        onToggleDrawer={() => setDrawerOpen(!drawerOpen)}
        searchInputRef={searchInputRef}
        hidden={topbarHidden}
      />

      <main
        ref={feedRef}
        className={`feed${routeClassName ? ` ${routeClassName}` : ""}${topbarHidden ? " feed--nav-hidden" : ""}`}
      >
        <div className="feed-body">
          {children}
        </div>
        <Footer />
      </main>

      {/* Floating action button — mobile only, create post */}
      {showFab ? (
        <button
          className="mob-fab"
          type="button"
          aria-label="Create post"
          onClick={handleCreate}
        >
          <Icon name="create" />
        </button>
      ) : null}

      {/* Bottom navigation bar — mobile only */}
      <MobileBottomNav onCreate={handleCreate} />

      <Toasts />

      <CreatePostModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <LoginPromptModal open={loginPromptOpen} onClose={() => setLoginPromptOpen(false)} />
    </>
  );
}
