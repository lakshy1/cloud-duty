"use client";

import type { CardData } from "../data/card-data";

type ReaderCard = Pick<CardData, "title" | "summary" | "details"> | null | undefined;

export function shouldUseReadingMode(card: ReaderCard) {
  if (!card) return false;
  if (typeof window === "undefined") return false;
  return window.innerWidth <= 580;
}

export function setReaderMode(enabled: boolean) {
  if (typeof document === "undefined") return;
  document.body.classList.toggle("reader-mode", enabled);
  document.body.style.overflow = enabled ? "hidden" : "";
}

export function isReaderModeActive() {
  if (typeof document === "undefined") return false;
  return document.body.classList.contains("reader-mode");
}
