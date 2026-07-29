"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
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
      setError("ההרשמה הצליחה, אך ההתחברות נכשלה — נסו להתחבר ידנית");
      return;
    }
    router.push("/");
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

      <GoogleSignInButton callbackUrl="/" />

      <p className="text-sm opacity-70">
        כבר יש לך חשבון?{" "}
        <Link href="/login" className="font-semibold underline">
          התחברות
        </Link>
      </p>
    </div>
  );
}
