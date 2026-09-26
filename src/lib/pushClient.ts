"use client";

import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";

/** Client side of push notifications, for both places the site runs:
 *  - the Android app (a Capacitor WebView - it has no web-push support, so it uses native Firebase Cloud Messaging), and
 *  - a normal browser (standard web push with the service worker).
 * The on/off preference itself lives on the server (User.notificationsEnabled, default ON). */

export const isNativeApp = () => Capacitor.isNativePlatform();

const TOKEN_KEY = "fcmToken";
let listenersAdded = false;

async function saveToken(token: string) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {}
  await fetch("/api/push/device", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) }).catch(() => {});
}

function addNativeListeners() {
  if (listenersAdded) return;
  listenersAdded = true;
  PushNotifications.addListener("registration", (t) => void saveToken(t.value));
  PushNotifications.addListener("registrationError", (e) => console.error("Push registration failed:", e));
  // A tap on a notification opens the screen it is about (every push carries a url).
  PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
    const url = (action.notification.data as { url?: string } | undefined)?.url;
    if (url && url.startsWith("/")) window.location.assign(url);
  });
}

/** Asks Android for the notification permission (a system dialog, shown once), then registers this phone with FCM.
 * "denied" = the user (or the OS) blocked notifications for the app; only the device's own settings can change that. */
export async function enableNative(): Promise<"ok" | "denied" | "error"> {
  try {
    let perm = await PushNotifications.checkPermissions();
    if (perm.receive === "prompt" || perm.receive === "prompt-with-rationale") perm = await PushNotifications.requestPermissions();
    if (perm.receive !== "granted") return "denied";
    addNativeListeners();
    await PushNotifications.createChannel({ id: "travi_default", name: "טראבי", description: "עדכונים והמלצות לטיול", importance: 4 }).catch(() => {});
    await PushNotifications.register();
    return "ok";
  } catch (err) {
    console.error("Native push setup failed:", err);
    return "error";
  }
}

export async function disableNative() {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      await fetch("/api/push/device", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) }).catch(() => {});
      localStorage.removeItem(TOKEN_KEY);
    }
    await PushNotifications.unregister();
  } catch {}
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const out = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) out[i] = rawData.charCodeAt(i);
  return out;
}

export const webPushSupported = () => typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

export async function enableWeb(): Promise<"ok" | "denied" | "error"> {
  try {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey || !webPushSupported()) return "error";
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return "denied";
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource });
    const res = await fetch("/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sub.toJSON()) });
    return res.ok ? "ok" : "error";
  } catch (err) {
    console.error("Web push setup failed:", err);
    return "error";
  }
}

export async function disableWeb() {
  try {
    if (!webPushSupported()) return;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await fetch("/api/push/unsubscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(() => {});
      await sub.unsubscribe();
    }
  } catch {}
}

/** Reads the switch from the server: true/false, or null when the visitor isn't logged in. */
export async function fetchPreference(): Promise<boolean | null> {
  try {
    const res = await fetch("/api/push/preference");
    if (!res.ok) return null;
    return ((await res.json()) as { enabled: boolean }).enabled;
  } catch {
    return null;
  }
}

export async function savePreference(enabled: boolean) {
  await fetch("/api/push/preference", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled }) });
}

/** Turns notifications on/off end to end: the server preference plus this device's registration. */
export async function setNotifications(enabled: boolean): Promise<"ok" | "denied" | "error"> {
  if (enabled) {
    const result = isNativeApp() ? await enableNative() : webPushSupported() ? await enableWeb() : "ok";
    // If the phone/browser refuses, keep the switch off so it never claims to be on when it isn't.
    await savePreference(result === "ok");
    return result;
  }
  await savePreference(false);
  if (isNativeApp()) await disableNative();
  else await disableWeb();
  return "ok";
}
