import Link from "next/link";

/** Shown in place of a write-form (add expense/logistic/etc.) on a free
 * screen when there's no session — there's nothing to save it against for an
 * anonymous visitor, so this replaces the form rather than letting its
 * server action throw on submit. */
export function LoginPromptBanner({ slug, path, message }: { slug: string; path: string; message: string }) {
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 border p-4"
      style={{ borderRadius: "var(--radius)", borderColor: "var(--primary)", background: "var(--surface)" }}
    >
      <p className="text-sm opacity-70">🔒 {message}</p>
      <Link
        href={`/login?callbackUrl=${encodeURIComponent(`/trip/${slug}${path}`)}`}
        className="shrink-0 rounded-full px-5 py-2 text-sm font-semibold text-white"
        style={{ background: "linear-gradient(135deg, #7C3AED, #EC4899)" }}
      >
        התחברות / הרשמה
      </Link>
    </div>
  );
}
