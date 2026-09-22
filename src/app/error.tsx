"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const RETRY_KEY = "travi:error-retry";
const MAX_RETRIES = 4;
const MIN_GAP_MS = 1000;
// A burst older than this belongs to a separate incident — don't let it
// count against (or rate-limit) a fresh one.
const INCIDENT_TTL_MS = 30_000;

/**
 * Root error boundary for everything under the root layout. Reported cause:
 * on a slow/cellular connection, an interrupted RSC stream, a transient
 * Prisma pool wait, or any other render-time exception below this point
 * lands here as Next's own bare English "This page couldn't load" box —
 * confirmed live on-device (screen recording): it appeared for a beat mid
 * session on the map screen, and a normal re-render recovered on its own a
 * moment later. The overwhelming majority of these are transient, so
 * silently retry a couple of times first; only show anything to the user
 * if that genuinely doesn't recover.
 *
 * State lives in sessionStorage, NOT component state/refs: testing this
 * against a page that always throws showed Next reusing or replacing this
 * component's instance unpredictably across repeated catches, so anything
 * kept in React state resets on some retries and not others — a counter
 * gated only by a dependency-array effect either stops retrying after just
 * one attempt (if the instance IS reused, the effect never fires again) or
 * never stops at all (if a fresh instance mounts on every single catch, each
 * one starts its own retry budget from zero — confirmed live: 176 catches in
 * 12 seconds). sessionStorage is the one thing guaranteed to persist across
 * however many instances get created, so it's what actually enforces the cap.
 *
 * Deliberately no i18n/context hooks (no useTranslation) here: an error
 * boundary can be asked to render with a broken or unmounted ancestor tree
 * above it — that's often exactly *why* it's rendering — so anything that
 * assumes a provider higher up can itself throw and take down the recovery
 * path with it (confirmed the hard way once already). Plain hardcoded
 * Hebrew only.
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();
  const [phase, setPhase] = useState<"retrying" | "giveup">("retrying");

  // Fire-and-forget, once per catch: this is the ONLY reason this route
  // exists — to actually see what's throwing in a report that couldn't be
  // reproduced from outside the reporter's own session/network despite
  // extensive testing. Never awaited, never allowed to affect the retry
  // flow below even if it fails.
  useEffect(() => {
    try {
      void fetch("/api/diagnostics/client-error", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: error?.message || String(error),
          digest: error?.digest ?? null,
          stack: error?.stack ?? null,
          url: window.location.href,
          userAgent: navigator.userAgent,
        }),
        keepalive: true,
      });
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    const { count, lastAt } = readRetryState();

    if (count >= MAX_RETRIES || (lastAt && Date.now() - lastAt < MIN_GAP_MS)) {
      setPhase("giveup");
      return;
    }

    writeRetryState(count + 1);
    const id = setTimeout(() => {
      if (cancelled) return;
      router.refresh();
      reset();
    }, 700);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [reset, router]);

  if (phase === "retrying") {
    // The same neutral, wordless moment the route-level loading.tsx already
    // shows elsewhere in the app — nothing that reads as an error.
    return <div style={{ minHeight: "60vh" }} />;
  }

  return (
    <div
      dir="rtl"
      style={{
        display: "flex",
        minHeight: "60vh",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        padding: 32,
        textAlign: "center",
      }}
    >
      <p style={{ fontSize: 28 }}>🧭</p>
      <h1 style={{ fontSize: 20, fontWeight: 700 }}>משהו לא נטען כמו שצריך</h1>
      <button
        onClick={() => {
          clearRetryState();
          window.location.reload();
        }}
        style={{
          borderRadius: 999,
          padding: "8px 20px",
          fontSize: 14,
          fontWeight: 700,
          color: "white",
          background: "#7C3AED",
          border: "none",
        }}
      >
        נסו שוב
      </button>
    </div>
  );
}

function readRetryState(): { count: number; lastAt: number } {
  try {
    const raw = sessionStorage.getItem(RETRY_KEY);
    if (!raw) return { count: 0, lastAt: 0 };
    const parsed = JSON.parse(raw) as { count?: number; lastAt?: number };
    const lastAt = Number(parsed.lastAt) || 0;
    if (Date.now() - lastAt > INCIDENT_TTL_MS) return { count: 0, lastAt: 0 };
    return { count: Number(parsed.count) || 0, lastAt };
  } catch {
    return { count: 0, lastAt: 0 };
  }
}

function writeRetryState(count: number) {
  try {
    sessionStorage.setItem(RETRY_KEY, JSON.stringify({ count, lastAt: Date.now() }));
  } catch {
    // Private-mode/storage-disabled: retries just won't be rate-limited or
    // capped by count, only by MIN_GAP_MS's own within-call timing — still
    // bounded, just less precisely.
  }
}

function clearRetryState() {
  try {
    sessionStorage.removeItem(RETRY_KEY);
  } catch {
    // ignore
  }
}
