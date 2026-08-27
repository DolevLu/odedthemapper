"use client";

import { useEffect, useState } from "react";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

type Status = "unknown" | "unsupported" | "subscribed" | "unsubscribed" | "denied";

export function NotificationOptIn() {
  const [status, setStatus] = useState<Status>("unknown");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }
    navigator.serviceWorker.ready.then((reg) => reg.pushManager.getSubscription().then((sub) => setStatus(sub ? "subscribed" : "unsubscribed")));
  }, []);

  async function subscribe() {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) return;
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
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      setStatus("subscribed");
    } finally {
      setLoading(false);
    }
  }

  async function unsubscribe() {
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

  if (status === "unsupported") return null;

  return (
    <div className="mb-8 flex items-center justify-between gap-3 rounded-2xl border border-black/5 bg-white p-5">
      <div>
        <h3 className="font-bold">🔔 התראות</h3>
        <p className="text-sm opacity-60">
          {status === "denied"
            ? "חסמתם התראות בדפדפן - ניתן לאפשר מחדש בהגדרות האתר בדפדפן."
            : "תזכורות צ׳ק-אין לטיסות והתראות תקציב, ישירות למכשיר שלכם."}
        </p>
      </div>
      {status !== "denied" && (
        <button
          onClick={status === "subscribed" ? unsubscribe : subscribe}
          disabled={loading}
          className="shrink-0 rounded-full px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: status === "subscribed" ? "#DC2626" : "var(--primary)" }}
        >
          {loading ? "..." : status === "subscribed" ? "כיבוי התראות" : "הפעלת התראות"}
        </button>
      )}
    </div>
  );
}
