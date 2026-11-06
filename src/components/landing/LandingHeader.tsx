"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslation } from "@/components/i18n/LanguageContext";

type Nav = { destinations: string; features: string; how: string; faq: string; contact: string; login: string; myMap: string };

export function LandingHeader({ nav, brand, loggedIn, lang }: { nav: Nav; brand: string; loggedIn: boolean; lang: "he" | "en" }) {
  const [open, setOpen] = useState(false);
  const { setLang } = useTranslation();
  const links = [
    { href: "#destinations", label: nav.destinations },
    { href: "#features", label: nav.features },
    { href: "#how", label: nav.how },
    { href: "#faq", label: nav.faq },
    { href: "#contact", label: nav.contact },
  ];
  function switchLang() {
    setLang(lang === "he" ? "en" : "he");
    window.location.reload();
  }
  return (
    <header className="sticky top-0 z-40 border-b border-black/5 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4">
        <Link href="/" className="flex items-center gap-2 text-xl font-extrabold" style={{ color: "#111111" }}>
          <svg width="30" height="30" viewBox="0 0 96 96" aria-hidden="true">
            <defs>
              <linearGradient id="lh-g" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#7C3AED" />
                <stop offset="100%" stopColor="#6D28D9" />
              </linearGradient>
            </defs>
            <circle cx="48" cy="48" r="48" fill="url(#lh-g)" />
            <path d="M48 22c-12 0-21 9-21 21 0 16 21 31 21 31s21-15 21-31c0-12-9-21-21-21zm0 29a8 8 0 1 1 0-16 8 8 0 0 1 0 16z" fill="#fff" />
          </svg>
          {brand}
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="rounded-full px-3.5 py-2 text-sm font-semibold hover:bg-black/5">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <button onClick={switchLang} className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-bold hover:bg-black/5" aria-label="Language">
            {lang === "he" ? "EN" : "עב"}
          </button>
          <Link
            href={loggedIn ? "/account" : "/login"}
            className="rounded-full px-4 py-2 text-sm font-bold text-white"
            style={{ background: "#6D28D9" }}
          >
            {loggedIn ? nav.myMap : nav.login}
          </Link>
          <button className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-black/5 md:hidden" onClick={() => setOpen((o) => !o)} aria-label="Menu" aria-expanded={open}>
            <span className="text-xl">{open ? "✕" : "☰"}</span>
          </button>
        </div>
      </div>
      {open && (
        <nav className="flex flex-col border-t border-black/5 bg-white px-4 pb-3 md:hidden">
          {links.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="border-b border-black/5 py-3 font-semibold last:border-0">
              {l.label}
            </a>
          ))}
        </nav>
      )}
    </header>
  );
}
