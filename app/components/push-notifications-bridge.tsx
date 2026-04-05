"use client";

import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { LocalNotifications } from "@capacitor/local-notifications";

type TokenRegistrationHandler = (token: string) => void;

const logPrefix = "[PushNotifications]";

export default function PushNotificationsBridge({
  onToken,
}: {
  onToken?: TokenRegistrationHandler;
}) {
  // Keep a stable ref so the registration effect runs once, not on every render
  const onTokenRef = useRef(onToken);
  useEffect(() => {
    onTokenRef.current = onToken;
  });

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    let active = true;

    const register = async () => {
      try {
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

        // When the app is in the foreground, Android suppresses the system
        // notification. Display it manually via LocalNotifications instead.
        PushNotifications.addListener("pushNotificationReceived", async (notification) => {
          if (!active) return;
          console.info(`${logPrefix} received`, notification);

          try {
            await LocalNotifications.schedule({
              notifications: [
                {
                  id: Date.now(),
                  title: notification.title ?? "CloudDuty",
                  body: notification.body ?? "",
                  extra: notification.data,
                },
              ],
            });
          } catch (err) {
            console.error(`${logPrefix} local notification error`, err);
          }
        });

        PushNotifications.addListener(
          "pushNotificationActionPerformed",
          (action) => {
            if (!active) return;
            console.info(`${logPrefix} action`, action);
          }
        );
      } catch (error) {
        console.error(`${logPrefix} setup error`, error);
      }
    };

    register();

    return () => {
      active = false;
      void PushNotifications.removeAllListeners();
    };
  }, []); // runs once — onToken changes are handled via onTokenRef

  return null;
}
