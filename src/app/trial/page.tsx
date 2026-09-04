import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { TRIAL_PLAN } from "@/lib/plans";
import { TrialDestinationPicker } from "./TrialDestinationPicker";

export default async function TrialPage({ searchParams }: { searchParams: Promise<{ dest?: string }> }) {
  const { dest } = await searchParams;
  const session = await auth();
  if (!session?.user?.id) redirect(`/register?callbackUrl=${encodeURIComponent(`/trial${dest ? `?dest=${dest}` : ""}`)}`);

  const destinations = await prisma.destination.findMany({
    where: { status: { in: ["preview", "live"] } },
    orderBy: { name: "asc" },
    select: { id: true, slug: true, name: true, tagline: true },
  });
  const preselected = dest ? destinations.find((d) => d.slug === dest)?.id : undefined;

  return (
    <div className="flex flex-1 flex-col items-center px-6 py-16" style={{ background: "#FBF6EE" }}>
      <div className="w-full max-w-2xl rounded-3xl border border-black/5 bg-white p-8">
        <p className="text-sm font-semibold opacity-60">{TRIAL_PLAN.audience}</p>
        <h1 className="mt-1 text-3xl font-extrabold">🎁 {TRIAL_PLAN.name}</h1>
        <p className="mt-2 text-lg opacity-70">{TRIAL_PLAN.tagline}</p>

        <ul className="mt-4 flex flex-col gap-1.5 text-sm">
          {TRIAL_PLAN.features.map((f) => (
            <li key={f} className="flex items-start gap-2">
              <span className="mt-0.5 text-emerald-500">✓</span>
              <span className="opacity-80">{f}</span>
            </li>
          ))}
        </ul>

        <div className="mt-6 border-t border-black/5 pt-6">
          <TrialDestinationPicker destinations={destinations} preselectId={preselected} />
        </div>
      </div>
    </div>
  );
}
