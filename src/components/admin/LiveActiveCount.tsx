"use client";

import { useEffect, useState } from "react";

const POLL_INTERVAL_MS = 20_000;

/** Polls /api/admin/active-count so the "online now" number on /admin/users stays live without a manual page
 * reload. Starts from the server-rendered initial count (no loading flash) and only updates on a successful
 * poll - a transient fetch failure just leaves the last-known number showing. */
export function LiveActiveCount({ initialCount }: { initialCount: number }) {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch("/api/admin/active-count");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && typeof data.count === "number") setCount(data.count);
      } catch {
        // keep showing the last-known count
      }
    };
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <span className="inline-flex items-center gap-2">
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
      </span>
      {count}
    </span>
  );
}
