"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

export type Toast = {
  id: string;
  message: string;
  tone?: "info" | "success" | "warning" | "error";
};

type UIState = {
  drawerOpen: boolean;
  popupOpen: boolean;
  popupIndex: number | null;
  reportOpen: boolean;
  reportCardIndex: number | null;
  createOpen: boolean;
  createdPost: import("../data/card-data").CardData | null;
  searchQuery: string;
  toasts: Toast[];
  setDrawerOpen: (open: boolean) => void;
  setPopupOpen: (open: boolean) => void;
  setPopupIndex: (index: number | null) => void;
  setReportOpen: (open: boolean) => void;
  setReportCardIndex: (index: number | null) => void;
  setCreateOpen: (open: boolean) => void;
  setCreatedPost: (post: import("../data/card-data").CardData | null) => void;
  setSearchQuery: (value: string) => void;
  pushToast: (toast: Omit<Toast, "id"> & { id?: string }) => void;
  removeToast: (id: string) => void;
};

const UIStateContext = createContext<UIState | null>(null);

export function UIStateProvider({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupIndex, setPopupIndex] = useState<number | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportCardIndex, setReportCardIndex] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createdPost, setCreatedPost] = useState<import("../data/card-data").CardData | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [toasts, setToasts] = useState<Toast[]>([]);

  const pushToast = useCallback((toast: Omit<Toast, "id"> & { id?: string }) => {
    const id = toast.id ?? crypto.randomUUID();
    setToasts((prev) => [...prev, { ...toast, id }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value = useMemo<UIState>(
    () => ({
      drawerOpen,
      popupOpen,
      popupIndex,
      reportOpen,
      reportCardIndex,
      createOpen,
      createdPost,
      searchQuery,
      toasts,
      setDrawerOpen,
      setPopupOpen,
      setPopupIndex,
      setReportOpen,
      setReportCardIndex,
      setCreateOpen,
      setCreatedPost,
      setSearchQuery,
      pushToast,
      removeToast,
    }),
    [
      drawerOpen,
      popupOpen,
      popupIndex,
      reportOpen,
      reportCardIndex,
      createOpen,
      createdPost,
      searchQuery,
      toasts,
      pushToast,
      removeToast,
    ]
  );

  return <UIStateContext.Provider value={value}>{children}</UIStateContext.Provider>;
}

export function useUIState() {
  const ctx = useContext(UIStateContext);
  if (!ctx) {
    throw new Error("useUIState must be used within UIStateProvider");
  }
  return ctx;
}
