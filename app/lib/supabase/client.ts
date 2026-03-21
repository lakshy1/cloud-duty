import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

declare global {
  interface Window {
    __supabase?: SupabaseClient;
  }
}

export function getSupabaseBrowserClient(): SupabaseClient {
  if (client) return client;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables.");
  }

  client = createBrowserClient(supabaseUrl, supabaseAnonKey);
  if (typeof window !== "undefined") {
    window.__supabase = client;
  }
  return client;
}
