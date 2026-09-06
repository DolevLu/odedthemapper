"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { FeedbackModal } from "@/components/FeedbackModal";
import { SettingsModal } from "@/components/SettingsModal";

/** Replaces the old plain "i" link-to-/guide button — a 3-dot menu with the
 * guide link, a bug/suggestion report option, and settings, all behind one
 * click instead of the guide being the only thing reachable from here.
 *
 * The dropdown (and the modals it opens) are portaled to document.body: the
 * desktop sidebar is `sm:sticky`, which — despite these being
 * `position: fixed` — still traps them inside the sidebar's own stacking
 * context, so anything outside the sidebar with its own stacking context
 * (the map, most notably) could paint on top regardless of z-index.
 * Portaling to body escapes that entirely, which is what "opens behind
 * other features instead of in front" actually was. */
export function GuideMenuButton({ onNavigate }: { onNavigate?: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [menuOpen]);

  function openMenu() {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    setMenuOpen(true);
  }

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => (menuOpen ? setMenuOpen(false) : openMenu())}
        title="עוד"
        aria-label="עוד אפשרויות"
        aria-expanded={menuOpen}
        className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white shadow-sm transition-transform hover:scale-110"
        style={{ background: "linear-gradient(135deg, #7C3AED, #EC4899)" }}
      >
        ⋮
      </button>
      {menuOpen &&
        menuPos &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-[400] flex w-48 flex-col overflow-hidden rounded-xl shadow-2xl"
            style={{ top: menuPos.top, right: menuPos.right, background: "var(--surface)" }}
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
            <button
              onClick={() => {
                setMenuOpen(false);
                setSettingsOpen(true);
              }}
              className="flex items-center gap-2 px-3 py-2.5 text-start text-sm font-semibold hover:brightness-95"
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center text-sm">⚙️</span>
              הגדרות
            </button>
          </div>,
          document.body
        )}
      {feedbackOpen && <FeedbackModal onClose={() => setFeedbackOpen(false)} />}
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </>
  );
}
