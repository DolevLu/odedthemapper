import { importPKCS8, SignJWT } from "jose";

/** Native (Android app) push through Firebase Cloud Messaging's HTTP v1 API. FCM itself is free. It needs a Firebase
 * service-account key in the FIREBASE_SERVICE_ACCOUNT_JSON env var (raw JSON, or the same JSON base64-encoded);
 * without it every function here is a silent no-op, exactly like web push without VAPID keys. */

type ServiceAccount = { project_id: string; client_email: string; private_key: string };

let cachedAccount: ServiceAccount | null | undefined;
function serviceAccount(): ServiceAccount | null {
  if (cachedAccount !== undefined) return cachedAccount;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return (cachedAccount = null);
  try {
    const text = raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
    const parsed = JSON.parse(text) as ServiceAccount;
    return (cachedAccount = parsed.project_id && parsed.client_email && parsed.private_key ? parsed : null);
  } catch {
    return (cachedAccount = null);
  }
}

export function fcmConfigured(): boolean {
  return serviceAccount() !== null;
}

let cachedToken: { value: string; expiresAt: number } | null = null;
async function accessToken(account: ServiceAccount): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  const key = await importPKCS8(account.private_key.replace(/\\n/g, "\n"), "RS256");
  const now = Math.floor(Date.now() / 1000);
  const assertion = await new SignJWT({ scope: "https://www.googleapis.com/auth/firebase.messaging" })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(account.client_email)
    .setSubject(account.client_email)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  if (!res.ok) throw new Error(`FCM auth failed: ${res.status}`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return json.access_token;
}

/** Sends one notification to one device token. Returns "ok", "dead" (the token is no longer valid and should be
 * deleted) or "failed" (anything else - keep the token). Never throws. */
export async function sendFcm(token: string, payload: { title: string; body: string; url?: string }): Promise<"ok" | "dead" | "failed"> {
  const account = serviceAccount();
  if (!account) return "failed";
  try {
    const res = await fetch(`https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`, {
      method: "POST",
      headers: { Authorization: `Bearer ${await accessToken(account)}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: {
          token,
          notification: { title: payload.title, body: payload.body },
          data: { url: payload.url ?? "/" },
          android: { priority: "HIGH", notification: { channel_id: "travi_default" } },
        },
      }),
    });
    if (res.ok) return "ok";
    const status = res.status;
    if (status === 404 || status === 410) return "dead";
    const err = (await res.json().catch(() => null)) as { error?: { status?: string } } | null;
    return err?.error?.status === "UNREGISTERED" ? "dead" : "failed";
  } catch {
    return "failed";
  }
}
