"use client";

import { useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { getSupabaseBrowserClient } from "@/app/lib/supabase/client";
import PushNotificationsBridge from "./push-notifications-bridge";

export default function PushNotificationsProvider() {
  const handleToken = useCallback(async (token: string) => {
    const platform = Capacitor.getPlatform() as "ios" | "android" | "web";
    const supabase = getSupabaseBrowserClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("device_tokens")
      .upsert(
        { user_id: user.id, token, platform, updated_at: new Date().toISOString() },
        { onConflict: "user_id,token" }
      );

    if (error) {
      console.error("[PushNotifications] failed to save token", error);
    }
  }, []);

  return <PushNotificationsBridge onToken={handleToken} />;
}
