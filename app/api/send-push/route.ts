import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Exchange a Firebase service account for an OAuth2 access token,
 * required by the FCM HTTP v1 API.
 */
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
    title,
    body: msgBody,
    data,
    accessToken: userToken,
  } = (body ?? {}) as {
    recipientId?: string;
    title?: string;
    body?: string;
    data?: Record<string, string>;
    accessToken?: string;
  };

  if (!recipientId || !userToken) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Verify the caller is an authenticated user
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${userToken}` } } }
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Look up recipient device tokens via SECURITY DEFINER function (bypasses RLS)
  const { data: tokens } = await supabase.rpc("get_push_tokens", {
    target_user_id: recipientId,
  }) as { data: { token: string; platform: string }[] | null };

  if (!tokens?.length) {
    return Response.json({ sent: 0 });
  }

  const fcmToken = await getFcmAccessToken();
  if (!fcmToken) {
    // Credentials not configured — silently skip rather than error in client
    return Response.json({ sent: 0, reason: "FCM not configured" });
  }

  const projectId = process.env.FIREBASE_PROJECT_ID ?? "cloudduty-8cea8";
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
              notification: { title: title ?? "New message", body: msgBody ?? "" },
              data: data ?? {},
              android: { priority: "high" },
              apns: { headers: { "apns-priority": "10" } },
            },
          }),
        }
      );
      if (res.ok) sent++;
    } catch {
      // Individual token failures don't block the rest
    }
  }

  return Response.json({ sent });
}
