"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export function GoogleSignInButton({ callbackUrl = "/" }: { callbackUrl?: string }) {
  const [notConfigured, setNotConfigured] = useState(false);

  async function handleClick() {
    const res = await fetch("/api/auth/providers");
    const providers = await res.json().catch(() => ({}));
    if (!providers.google) {
      setNotConfigured(true);
      return;
    }
    signIn("google", { callbackUrl });
  }

  return (
    <div className="flex flex-col gap-1">
      <button onClick={handleClick} className="rounded-lg border border-black/15 px-4 py-2 font-semibold">
        התחברות עם Google
      </button>
      {notConfigured && (
        <p className="text-xs text-red-600">התחברות עם Google עדיין לא מוגדרת במערכת - נסו באימייל וסיסמה בינתיים.</p>
      )}
    </div>
  );
}
