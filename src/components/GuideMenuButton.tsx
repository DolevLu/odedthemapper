"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FeedbackModal } from "@/components/FeedbackModal";

/** Replaces the old plain "i" link-to-/guide button — a 3-dot menu with the
 * guide link plus a bug/suggestion report option, both behind one click
 * instead of the guide being the only thing reachable from here. */
export function GuideMenuButton({ onNavigate }: { onNavigate?: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [menuOpen]);

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        onClick={() => setMenuOpen((v) => !v)}
        title="עוד"
        aria-label="עוד אפשרויות"
        aria-expanded={menuOpen}
        className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white shadow-sm transition-transform hover:scale-110"
        style={{ background: "linear-gradient(135deg, #7C3AED, #EC4899)" }}
      >
        ⋮
      </button>
      {menuOpen && (
        <div
          className="absolute top-full z-50 mt-1 flex w-48 flex-col overflow-hidden rounded-xl shadow-2xl"
          style={{ background: "var(--surface)", insetInlineStart: 0 }}
        >
          <Link
            href="/guide"
            onClick={() => {
              setMenuOpen(false);
              onNavigate?.();
            }}
            className="flex items-center gap-2 px-3 py-2.5 text-sm font-semibold hover:brightness-95"
          >
            <span
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
              style={{ background: "linear-gradient(135deg, #7C3AED, #EC4899)", fontFamily: "Georgia, serif" }}
            >
              i
            </span>
            מדריך שימוש
          </Link>
          <button
            onClick={() => {
              setMenuOpen(false);
              setFeedbackOpen(true);
            }}
            className="flex items-center gap-2 px-3 py-2.5 text-start text-sm font-semibold hover:brightness-95"
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center text-sm">🐞</span>
            דיווח על באג / הצעה לשיפור
          </button>
        </div>
      )}
      {feedbackOpen && <FeedbackModal onClose={() => setFeedbackOpen(false)} />}
    </div>
  );
}
