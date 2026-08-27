"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { REFERRAL_STORAGE_KEY } from "@/lib/referralStorage";

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const refCode = searchParams.get("ref");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Stashed in sessionStorage so it survives the full-page redirect round
  // trip through Google OAuth — <ReferralClaimer/> (mounted app-wide) picks
  // it up once the user lands back authenticated, regardless of which page
  // that turns out to be.
  useEffect(() => {
    if (refCode) sessionStorage.setItem(REFERRAL_STORAGE_KEY, refCode);
  }, [refCode]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, ref: refCode ?? undefined }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "שגיאה בהרשמה");
      setLoading(false);
      return;
    }

    const result = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (result?.error) {
      setError("ההרשמה הצליחה, אך ההתחברות נכשלה - נסו להתחבר ידנית");
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-6 py-16">
      <h1 className="text-2xl font-bold">הרשמה</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="text"
          required
          placeholder="שם מלא"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-lg border border-black/15 px-4 py-2"
        />
        <input
          type="email"
          required
          placeholder="אימייל"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg border border-black/15 px-4 py-2"
        />
        <input
          type="password"
          required
          minLength={8}
          placeholder="סיסמה (8+ תווים)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-lg border border-black/15 px-4 py-2"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-black px-4 py-2 font-semibold text-white disabled:opacity-50"
        >
          {loading ? "נרשם..." : "הרשמה"}
        </button>
      </form>

      <GoogleSignInButton callbackUrl={callbackUrl} />

      <p className="text-sm opacity-70">
        כבר יש לך חשבון?{" "}
        <Link href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="font-semibold underline">
          התחברות
        </Link>
      </p>
    </div>
  );
}
