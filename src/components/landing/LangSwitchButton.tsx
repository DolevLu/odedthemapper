"use client";

import { useTranslation } from "@/components/i18n/LanguageContext";

export function LangSwitchButton({ to, children, className }: { to: "he" | "en"; children: React.ReactNode; className?: string }) {
  const { setLang } = useTranslation();
  return (
    <button
      className={className}
      onClick={() => {
        setLang(to);
        window.location.reload();
      }}
    >
      {children}
    </button>
  );
}
