import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getFcmAccessToken(): Promise<string | null> {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    const sa = JSON.parse(raw) as { client_email: string; private_key: string };
    const now = Math.floor(Date.now() / 1000);
    const headerB64 = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
    const payloadB64 = Buffer.from(
      JSON.stringify({
        iss: sa.client_email,
        scope: "https://www.googleapis.com/auth/firebase.messaging",
        aud: "https://oauth2.googleapis.com/token",
        iat: now,
        exp: now + 3600,
      })
    ).toString("base64url");
    const signingInput = `${headerB64}.${payloadB64}`;
    const sign = crypto.createSign("RSA-SHA256");
    sign.update(signingInput);
    const sig = sign.sign(sa.private_key, "base64url");
    const jwt = `${signingInput}.${sig}`;

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
    });
    const data = (await tokenRes.json()) as { access_token?: string };
    return data.access_token ?? null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const {
    recipientId,
    senderName,
    senderAvatar,
    notificationType,
    content,
    data: extraData,
    accessToken: userToken,
  } = (body ?? {}) as {
    recipientId?: string;
    senderName?: string;
    senderAvatar?: string;
    notificationType?: string;
    content?: string;
    data?: Record<string, string>;
    accessToken?: string;
  };

  if (!recipientId || !userToken) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${userToken}` } } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: tokens } = await supabase.rpc("get_push_tokens", {
    target_user_id: recipientId,
  }) as { data: { token: string; platform: string }[] | null };

  if (!tokens?.length) {
    return Response.json({ sent: 0 });
  }

  const fcmToken = await getFcmAccessToken();
  if (!fcmToken) {
    return Response.json({ sent: 0, reason: "FCM not configured" });
  }

  const projectId = process.env.FIREBASE_PROJECT_ID ?? "readingqueue";

  // title   = sender name  (top line of notification)
  // body    = notification type label  (bottom line, collapsed)
  // content = actual message text  (shown when notification is expanded)
  const notifTitle = senderName ?? "Reading Queue";
  const notifBody = notificationType ?? "New message";

  // Data payload is available in the bridge for foreground rich rendering
  const dataPayload: Record<string, string> = {
    notification_type: notificationType ?? "message",
    sender_name: senderName ?? "",
    sender_avatar: senderAvatar ?? "",
    content: content ?? "",
    ...extraData,
  };

  let sent = 0;
  for (const { token } of tokens) {
    try {
      const res = await fetch(
        `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${fcmToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: {
              token,
              notification: { title: notifTitle, body: notifBody },
              data: dataPayload,
              android: {
                priority: "high",
                notification: {
                  channel_id: "readingqueue_messages",
                  notification_priority: "PRIORITY_HIGH",
                  default_sound: true,
                  default_vibrate_timings: true,
                  visibility: "PUBLIC",
                  // Android shows content as expanded BigText automatically
                  // when it differs from the short body
                  body: notifBody,
                },
              },
              apns: {
                headers: { "apns-priority": "10" },
                payload: {
                  aps: {
                    alert: {
                      title: notifTitle,
                      subtitle: notifBody,
                      body: content ?? notifBody,
                    },
                    sound: "default",
                    badge: 1,
                  },
                },
              },
            },
          }),
        }
      );
      if (res.ok) sent++;
    } catch {
      // individual token failures don't block the rest
    }
  }

  return Response.json({ sent });
}
