"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";
import { LanguageProvider } from "@/components/i18n/LanguageContext";
import { PushRegistrar } from "@/components/PushRegistrar";
import type { Lang } from "@/lib/i18n/dictionary";

export function Providers({ children, initialLang }: { children: ReactNode; initialLang: Lang }) {
  return (
    <SessionProvider>
      <LanguageProvider initialLang={initialLang}>
        <PushRegistrar />
        {children}
      </LanguageProvider>
    </SessionProvider>
  );
}
