"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Live 24h countdown shown in the sidebar in place of the plain tier badge
 * while a free trial (see lib/actions/trial.ts) is active. The actual
 * access cutoff is already enforced server-side the moment currentPeriodEnd
 * passes (every access check already filters on it) — this just keeps the
 * currently-open page in sync with that the instant it happens, rather than
 * leaving stale server-rendered (still-unlocked) content on screen until the
 * next navigation. router.refresh() fires once, guarded against repeating,
 * when the countdown first reaches zero. */
export function TrialCountdown({ endsAt }: { endsAt: string }) {
  const router = useRouter();
  const end = new Date(endsAt).getTime();
  const [remainingMs, setRemainingMs] = useState(() => end - Date.now());
  const refreshedRef = useRef(false);

  useEffect(() => {
    const id = setInterval(() => {
      const next = end - Date.now();
      setRemainingMs(next);
      if (next <= 0 && !refreshedRef.current) {
        refreshedRef.current = true;
        router.refresh();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [end, router]);

  if (remainingMs <= 0) {
    return (
      <Link href="/pricing" className="text-[10px] font-bold underline" style={{ color: "#DC2626" }}>
        הניסיון הסתיים - שדרגו עכשיו
      </Link>
    );
  }

  const totalSeconds = Math.floor(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return (
    <span className="text-[10px] font-bold tracking-wide" style={{ color: "#7C3AED" }} dir="ltr">
      ⏱️ {pad(hours)}:{pad(minutes)}:{pad(seconds)}
    </span>
  );
}
