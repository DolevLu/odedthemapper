import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { FREE_PLAN } from "@/lib/plans";
import { TrialDestinationPicker } from "./TrialDestinationPicker";

// Route kept at /trial (not renamed) — it's the one real link to this page (see PricingCards), so there's nothing
// gained by moving it and a real risk of breaking a bookmarked/shared link for no reason. The content itself is
// the 2026-10-07 "one free week, one destination" offer now (the week itself starts at sign-up — see lib/freeWeek.ts).
function weekStateOf(freeUntil: Date | null): "never" | "over" | "active" {
  if (!freeUntil) return "never";
  return freeUntil.getTime() <= Date.now() ? "over" : "active";
}

export default async function TrialPage({ searchParams }: { searchParams: Promise<{ dest?: string }> }) {
  const { dest } = await searchParams;
  const session = await auth();
  if (!session?.user?.id) redirect(`/register?callbackUrl=${encodeURIComponent(`/trial${dest ? `?dest=${dest}` : ""}`)}`);

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { freeUntil: true } });
  const freeUntil = user?.freeUntil ?? null;
  const weekState = weekStateOf(freeUntil);

  const destinations = await prisma.destination.findMany({
    where: { status: { in: ["preview", "live"] }, isPublic: true },
    orderBy: { name: "asc" },
    select: { id: true, slug: true, name: true, tagline: true },
  });
  const preselected = dest ? destinations.find((d) => d.slug === dest)?.id : undefined;

  return (
    <div className="flex flex-1 flex-col items-center px-6 py-16" style={{ background: "var(--background)" }}>
      <div className="w-full max-w-2xl rounded-3xl border border-black/5 bg-white p-8">
        <p className="text-sm font-semibold opacity-60">{FREE_PLAN.audience}</p>
        <h1 className="mt-1 text-3xl font-extrabold">🎁 {FREE_PLAN.name}</h1>
        <p className="mt-2 text-lg opacity-70">{FREE_PLAN.tagline}</p>

        <ul className="mt-4 flex flex-col gap-1.5 text-sm">
          {FREE_PLAN.features.map((f) => (
            <li key={f} className="flex items-start gap-2">
              <span className="mt-0.5 text-emerald-500">✓</span>
              <span className="opacity-80">{f}</span>
            </li>
          ))}
        </ul>

        <div className="mt-6 border-t border-black/5 pt-6">
          {weekState === "active" ? (
            <>
              <p className="mb-4 rounded-2xl bg-violet-50 p-3 text-sm font-semibold" style={{ color: "#6D28D9" }}>
                ⏱️ השבוע החינמי שלכם מסתיים ב-{freeUntil!.toLocaleDateString("he-IL", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
              </p>
              <TrialDestinationPicker destinations={destinations} preselectId={preselected} />
            </>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-sm font-semibold">
                {weekState === "over"
                  ? "השבוע החינמי שלכם הסתיים. אפשר להמשיך עם אחת התוכניות - מ-29 ₪ לחודש."
                  : "השבוע החינמי כבר נוצל מהרשת הזו (שבוע אחד לכל רשת, גם עם חשבון חדש). אפשר להמשיך עם אחת התוכניות - מ-29 ₪ לחודש."}
              </p>
              <Link href="/pricing" className="rounded-full px-5 py-3 text-center font-semibold text-white" style={{ background: "linear-gradient(135deg, #6D28D9, #EC4899)" }}>
                לתוכניות ולמחירים
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
