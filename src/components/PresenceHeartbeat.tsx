"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";

const PING_INTERVAL_MS = 45_000;

/** Pings /api/presence/ping every 45s while this user is logged in and the tab is visible, so the admin "active
 * now" count (lib/admin/users.ts) has a real, recent lastSeenAt to work with. Mounted once in the root layout -
 * does nothing for a logged-out visitor. Skips the ping while the tab is hidden/backgrounded rather than trying
 * to keep it alive: a closed/backgrounded tab naturally ages out of the "active now" window within a few
 * minutes, which is exactly the point of this signal. */
export function PresenceHeartbeat() {
  const { status } = useSession();

  useEffect(() => {
    if (status !== "authenticated") return;

    const ping = () => {
      if (document.visibilityState !== "visible") return;
      fetch("/api/presence/ping", { method: "POST", keepalive: true }).catch(() => {});
    };

    ping();
    const interval = setInterval(ping, PING_INTERVAL_MS);
    document.addEventListener("visibilitychange", ping);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", ping);
    };
  }, [status]);

  return null;
}
