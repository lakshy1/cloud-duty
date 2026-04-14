"use client";

import { useEffect, useRef } from "react";
import { Footer } from "./Footer";
import { MobileDrawer } from "./MobileDrawer";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { Toasts } from "./Toasts";
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
  } = useUIState();
  const drawerPanelRef = useRef<HTMLElement>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

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
      />

      <main className={`feed${routeClassName ? ` ${routeClassName}` : ""}`}>
        <div className="feed-body">
          {children}
        </div>
        <Footer />
      </main>
      <Toasts />

      <CreatePostModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <LoginPromptModal open={loginPromptOpen} onClose={() => setLoginPromptOpen(false)} />
    </>
  );
}
