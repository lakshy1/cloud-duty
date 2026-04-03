"use client";

type CacheEnvelope<T> = {
  ts: number;
  v: T;
};

export function getCache<T>(key: string, maxAgeMs: number): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    if (!parsed || typeof parsed.ts !== "number") return null;
    if (Date.now() - parsed.ts > maxAgeMs) {
      window.localStorage.removeItem(key);
      return null;
    }
    return parsed.v ?? null;
  } catch {
    return null;
  }
}

export function setCache<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    const payload: CacheEnvelope<T> = { ts: Date.now(), v: value };
    window.localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // ignore storage errors
  }
}

