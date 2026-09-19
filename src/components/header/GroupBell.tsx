"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getGroupFeed, markGroupFeedSeen, type GroupFeed } from "@/lib/actions/group";
import { useTranslation } from "@/components/i18n/LanguageContext";

const POLL_MS = 30_000;

function timeAgo(iso: string, lang: "he" | "en"): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return lang === "he" ? "עכשיו" : "now";
  if (mins < 60) return lang === "he" ? `לפני ${mins} דק׳` : `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return lang === "he" ? `לפני ${hours} שע׳` : `${hours}h ago`;
  return new Date(iso).toLocaleDateString(lang === "he" ? "he-IL" : "en-GB", { day: "numeric", month: "numeric" });
}

/** The small bell that tells everyone in a shared trip group what the others
 * just changed - added/edited/removed a place, voted, moved a stop. Polls the
 * group's change feed (no websockets on this host), and hides itself entirely
 * for anyone who isn't in a shared group. */
export function GroupBell({ isLoggedIn, compact = false }: { isLoggedIn: boolean; compact?: boolean }) {
  const { t, lang } = useTranslation();
  const router = useRouter();
  const [feed, setFeed] = useState<GroupFeed | null>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const knownIds = useRef<Set<string> | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  const load = useCallback(async () => {
    try {
      const next = await getGroupFeed();
      setFeed(next);
      // Only announce genuinely new changes from other people, never the
      // backlog that was already there when the page first loaded.
      if (knownIds.current) {
        const fresh = next.items.filter((i) => !knownIds.current!.has(i.id) && !i.mine);
        if (fresh.length > 0) setToast(`${fresh[0].actorName} ${fresh[0].summary}`);
      }
      knownIds.current = new Set(next.items.map((i) => i.id));
    } catch {
      // signed out or offline - the bell just stays as it was
    }
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;
    void load();
    const id = setInterval(() => void load(), POLL_MS);
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [isLoggedIn, load]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 8000);
    return () => clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  if (!isLoggedIn || !feed?.shared) return null;

  function toggle() {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 8, right: Math.max(8, window.innerWidth - rect.right) });
      // Opening the bell is what marks everything as seen.
      void markGroupFeedSeen().then(() => setFeed((f) => (f ? { ...f, unread: 0, items: f.items.map((i) => ({ ...i, unread: false })) } : f)));
    }
    setOpen((o) => !o);
  }

  const size = compact ? "h-7 w-7 text-sm" : "h-9 w-9 text-base";

  return (
    <>
      <button
        ref={buttonRef}
        onClick={toggle}
        aria-label={t("group.bellAria")}
        title={t("group.bellAria")}
        className={`relative flex ${size} shrink-0 items-center justify-center rounded-full border shadow-sm`}
        style={{ background: "var(--surface, #fff)", borderColor: "color-mix(in srgb, var(--primary, #333) 25%, transparent)" }}
      >
        <span aria-hidden>🔔</span>
        {feed.unread > 0 && (
          <span
            className="absolute -end-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white"
            aria-label={`${feed.unread} ${t("group.unread")}`}
          >
            {feed.unread > 9 ? "9+" : feed.unread}
          </span>
        )}
      </button>

      {toast && (
        <button
          onClick={() => {
            setToast(null);
            router.refresh();
          }}
          className="fixed bottom-24 start-1/2 z-[400] max-w-[92vw] -translate-x-1/2 rounded-full bg-black/85 px-4 py-2 text-xs font-semibold text-white shadow-lg sm:bottom-6"
        >
          🔔 {toast} · {t("group.refresh")}
        </button>
      )}

      {mounted &&
        open &&
        pos &&
        createPortal(
          <div
            ref={panelRef}
            dir={lang === "he" ? "rtl" : "ltr"}
            className="fixed z-[500] flex max-h-[70vh] w-[min(92vw,22rem)] flex-col overflow-hidden rounded-2xl border shadow-2xl"
            style={{ top: pos.top, right: pos.right, background: "var(--surface, #fff)", borderColor: "rgba(0,0,0,0.1)" }}
          >
            <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
              <p className="text-sm font-bold">🔔 {t("group.title")}</p>
              <p className="text-xs opacity-60">
                {feed.members} {t("group.members")}
              </p>
            </div>
            {feed.items.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm opacity-60">{t("group.empty")}</p>
            ) : (
              <ul className="flex flex-col overflow-y-auto">
                {feed.items.map((item) => {
                  const inner = (
                    <>
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: item.unread ? "#EF4444" : "transparent" }} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm leading-snug">
                          <b>{item.mine ? t("group.you") : item.actorName}</b> {item.summary}
                        </span>
                        <span className="text-[11px] opacity-50">{timeAgo(item.createdAt, lang)}</span>
                      </span>
                    </>
                  );
                  const href = item.slug ? `/trip/${item.slug}/${item.type.startsWith("item") || item.type.startsWith("day") || item.type === "plan_shifted" ? "itinerary" : "map"}` : null;
                  return (
                    <li key={item.id} className="border-b last:border-b-0" style={{ borderColor: "rgba(0,0,0,0.05)" }}>
                      {href ? (
                        <Link href={href} onClick={() => setOpen(false)} className="flex items-start gap-2 px-4 py-2.5 hover:bg-black/5">
                          {inner}
                        </Link>
                      ) : (
                        <div className="flex items-start gap-2 px-4 py-2.5">{inner}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>,
          document.body
        )}
    </>
  );
}
