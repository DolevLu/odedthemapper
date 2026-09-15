"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "@/components/i18n/LanguageContext";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

type Status = "unknown" | "unsupported" | "subscribed" | "unsubscribed" | "denied";

function readStatus(): Promise<Status> | Status {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  return navigator.serviceWorker.ready.then((reg) => reg.pushManager.getSubscription().then((sub) => (sub ? "subscribed" : "unsubscribed")));
}

export function NotificationOptIn() {
  const [status, setStatus] = useState<Status>("unknown");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    Promise.resolve(readStatus()).then(setStatus);
  }, []);

  async function subscribe() {
    setError(null);
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    // A missing key used to fail this whole function silently (no state
    // change, no message) — the button just looked like it did nothing.
    if (!publicKey) {
      setError(t("notif.missingConfigError"));
      return;
    }
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("denied");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      if (!res.ok) throw new Error("שמירת ההרשמה נכשלה בשרת");
      setStatus("subscribed");
    } catch (err) {
      // Anything above throwing (a denied native OS permission on Android,
      // a subscribe() failure, a server error) used to leave the button
      // silently back at "הפעלת התראות" with zero explanation — this is
      // what actually reads as "the button doesn't work."
      console.error("Push subscribe failed:", err);
      setError(t("notif.subscribeFailedError"));
    } finally {
      setLoading(false);
    }
  }

  async function unsubscribe() {
    setError(null);
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setStatus("unsubscribed");
    } finally {
      setLoading(false);
    }
  }

  // "Blocked" is a real browser-security state (Notification.permission ===
  // "denied") — no website can override it from code, only the user via
  // their own browser's site settings. This just re-reads it on demand so
  // fixing it there doesn't also require a full page reload here.
  async function recheck() {
    setStatus(await readStatus());
  }

  if (status === "unsupported") return null;

  return (
    <div className="mb-8 flex flex-col gap-2 rounded-2xl border border-black/5 bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-bold">
            🔔 {t("notif.title")}
            {status === "subscribed" && (
              <span className="rounded-full px-2 py-0.5 text-[11px] font-bold text-white" style={{ background: "#16A34A" }}>
                {t("notif.enabled")}
              </span>
            )}
          </h3>
          <p className="text-sm opacity-60">{status === "denied" ? t("notif.deniedDesc") : t("notif.defaultDesc")}</p>
        </div>
        {status !== "denied" && (
          <button
            onClick={status === "subscribed" ? unsubscribe : subscribe}
            disabled={loading}
            className="shrink-0 rounded-full px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: status === "subscribed" ? "#DC2626" : "var(--primary)" }}
          >
            {loading ? "..." : status === "subscribed" ? t("notif.disableBtn") : t("notif.enableBtn")}
          </button>
        )}
      </div>
      {status === "denied" && (
        <button onClick={recheck} className="self-start rounded-full px-4 py-1.5 text-xs font-semibold text-white" style={{ background: "var(--primary)" }}>
          {t("notif.checkAgain")}
        </button>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
