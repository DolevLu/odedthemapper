"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { signOut } from "next-auth/react";

export function ProfileMenu({
  isLoggedIn,
  name,
  planLabel,
}: {
  isLoggedIn: boolean;
  name: string | null;
  planLabel: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function toggleOpen() {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      // This app is always RTL (dir="rtl" is hardcoded on <html>, never
      // toggled) — no runtime getComputedStyle direction check needed, and
      // deliberately none: that same category of runtime RTL detection
      // silently misfired on at least one real device already (see
      // AppSidebar's profile-button fix). Anchoring the panel to the
      // button's own right edge and computing physical `right` directly
      // (not a logical inset property) has nothing left to misdetect.
      setPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
    setOpen((o) => !o);
  }

  const initial = name?.charAt(0)?.toUpperCase() ?? "?";

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={toggleOpen}
        className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white"
        style={{ background: "linear-gradient(135deg, #7C3AED, #EC4899)" }}
        aria-label="פרופיל"
      >
        {isLoggedIn ? initial : "👤"}
      </button>

      {mounted &&
        open &&
        pos &&
        createPortal(
          <div
            ref={panelRef}
            className="fixed z-[100] w-56 rounded-2xl border border-black/10 bg-white p-3 shadow-xl"
            style={{ top: pos.top, right: pos.right }}
          >
            {isLoggedIn ? (
              <div className="flex flex-col gap-2">
                <div className="border-b border-black/5 pb-2">
                  <p className="font-semibold">{name}</p>
                  <p className="text-xs opacity-60">{planLabel ?? "חינמי"}</p>
                </div>
                <Link href="/account" className="rounded-lg px-2 py-1.5 text-sm hover:bg-black/5" onClick={() => setOpen(false)}>
                  הפרופיל שלי
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="rounded-lg px-2 py-1.5 text-start text-sm text-red-600 hover:bg-black/5"
                >
                  התנתקות
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Link href="/login" className="rounded-lg px-2 py-1.5 text-sm hover:bg-black/5" onClick={() => setOpen(false)}>
                  התחברות
                </Link>
                <Link href="/register" className="rounded-lg px-2 py-1.5 text-sm font-semibold hover:bg-black/5" onClick={() => setOpen(false)}>
                  הרשמה
                </Link>
              </div>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}
