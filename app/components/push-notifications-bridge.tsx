"use client";

import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { LocalNotifications } from "@capacitor/local-notifications";

type TokenRegistrationHandler = (token: string) => void;

const logPrefix = "[PushNotifications]";

// Maps the notification_type value sent in the data payload to a human-readable label.
function getTypeLabel(type?: string): string {
  switch (type) {
    case "message":    return "New message";
    case "attachment": return "Sent an attachment";
    case "like":       return "Liked your post";
    case "dislike":    return "Disliked your post";
    case "follow":     return "Started following you";
    case "unfollow":   return "Unfollowed you";
    case "comment":    return "Commented on your post";
    case "save":       return "Saved your post";
    default:           return type ?? "New notification";
  }
}

export default function PushNotificationsBridge({
  onToken,
}: {
  onToken?: TokenRegistrationHandler;
}) {
  const onTokenRef = useRef(onToken);
  useEffect(() => {
    onTokenRef.current = onToken;
  });

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let active = true;

    const register = async () => {
      try {
        const localPerm = await LocalNotifications.checkPermissions();
        if (localPerm.display !== "granted") {
          await LocalNotifications.requestPermissions();
        }

        let permission = await PushNotifications.checkPermissions();
        if (permission.receive !== "granted") {
          permission = await PushNotifications.requestPermissions();
        }
        if (permission.receive !== "granted") {
          console.info(`${logPrefix} permission not granted`);
          return;
        }

        await PushNotifications.register();

        PushNotifications.addListener("registration", (token) => {
          if (!active) return;
          console.info(`${logPrefix} token`, token.value);
          onTokenRef.current?.(token.value);
        });

        PushNotifications.addListener("registrationError", (err) => {
          if (!active) return;
          console.error(`${logPrefix} registration error`, err);
        });

        // When the app is in the foreground Android suppresses the system
        // notification — show a rich LocalNotification instead.
        PushNotifications.addListener("pushNotificationReceived", async (notification) => {
          if (!active) return;
          console.info(`${logPrefix} received`, notification);

          const d = notification.data as Record<string, string> | undefined;
          const senderName  = d?.sender_name  || notification.title  || "Reading Queue";
          const typeLabel   = getTypeLabel(d?.notification_type) || notification.body || "";
          const content     = d?.content ?? "";

          try {
            await LocalNotifications.schedule({
              notifications: [
                {
                  id: Date.now(),
                  // Top line: who sent it
                  title: senderName,
                  // Bottom line (collapsed): what happened
                  body: typeLabel,
                  // Expanded text — Android shows a down-arrow to expand into this
                  largeBody: content || typeLabel,
                  // Summary shown in grouped/expanded view
                  summaryText: content || typeLabel,
                  extra: d ?? {},
                  iconColor: "#2563EB",
                },
              ],
            });
          } catch (err) {
            console.error(`${logPrefix} local notification error`, err);
          }
        });

        PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
          if (!active) return;
          console.info(`${logPrefix} action`, action);
        });
      } catch (error) {
        console.error(`${logPrefix} setup error`, error);
      }
    };

    register();

    return () => {
      active = false;
      void PushNotifications.removeAllListeners();
    };
  }, []);

  return null;
}
