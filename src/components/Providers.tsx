"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";
import { LanguageProvider } from "@/components/i18n/LanguageContext";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <LanguageProvider>{children}</LanguageProvider>
    </SessionProvider>
  );
}
