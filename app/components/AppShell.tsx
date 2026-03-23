"use client";

import { useCallback, useEffect, useRef } from "react";
import { Footer } from "./Footer";
import { MobileDrawer } from "./MobileDrawer";
import { Sidebar } from "./Sidebar";
import { ThemeName, Topbar } from "./Topbar";
import { Toasts } from "./Toasts";
import { useUIState } from "../state/ui-state";
import { CreatePostModal } from "./CreatePostModal";
import { LoginPromptModal } from "./LoginPromptModal";
import { useTheme } from "../theme-provider";
import { getSupabaseBrowserClient } from "../lib/supabase/client";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { theme, setTheme, mounted } = useTheme();
  const {
    drawerOpen, setDrawerOpen,
    createOpen, setCreateOpen,
    loginPromptOpen, setLoginPromptOpen,
    setIsLoggedIn,
  } = useUIState();
  const flashRef = useRef<HTMLDivElement | null>(null);
  const drawerPanelRef = useRef<HTMLElement>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

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

  const handleThemeSelect = useCallback(
    (nextTheme: ThemeName) => {
      const flash = flashRef.current;
      if (flash) {
        flash.classList.add("on");
      }
      window.setTimeout(() => {
        setTheme(nextTheme);
        flash?.classList.remove("on");
      }, 180);
    },
    [setTheme]
  );

  return (
    <>
      <div id="flash" ref={flashRef} />

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
        theme={theme as ThemeName}
        onThemeSelect={handleThemeSelect}
        drawerOpen={drawerOpen}
        onToggleDrawer={() => setDrawerOpen(!drawerOpen)}
        searchInputRef={searchInputRef}
        themeReady={mounted}
      />

      <main className="feed">
        {children}
        <Footer />
      </main>
      <Toasts />

      <CreatePostModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <LoginPromptModal open={loginPromptOpen} onClose={() => setLoginPromptOpen(false)} />
    </>
  );
}
