import Link from "next/link";
import { auth } from "@/auth";
import { getActiveSubscriptionSummary } from "@/lib/access";
import { FocusModeCollapseButton } from "@/components/FocusModeCollapseButton";
import { ProfileMenu } from "./ProfileMenu";
import { DestinationBadge } from "./DestinationBadge";

export async function SiteHeader() {
  const session = await auth();
  const userId = session?.user?.id;
  const summary = userId ? await getActiveSubscriptionSummary(userId) : null;
  const planLabel = summary ? summary.plan.name : session?.user ? "חינמי" : null;
  const isOrgActive = summary?.plan.isOrgTier ?? false;

  return (
    <header
      className="site-header-bar sticky top-0 z-30 px-6 py-3 backdrop-blur"
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto 1fr",
        alignItems: "center",
        background: "color-mix(in srgb, #FBF6EE 92%, transparent)",
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
      }}
    >
      <div className="flex items-center gap-2 justify-self-start">
        <FocusModeCollapseButton />
        <ProfileMenu isLoggedIn={Boolean(session?.user)} name={session?.user?.name ?? null} planLabel={planLabel} />
        {!isOrgActive && (
          <Link
            href="/pricing"
            className="whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold text-white shadow-sm sm:px-4 sm:py-1.5 sm:text-sm"
            style={{ background: "linear-gradient(135deg, #F59E0B, #EC4899)" }}
          >
            ✨ שדרג
          </Link>
        )}
      </div>

      <div className="justify-self-center text-center">
        <DestinationBadge />
      </div>

      <Link href="/" className="flex items-center gap-2.5 justify-self-end">
        <span className="hidden text-lg font-extrabold sm:inline">עודד המנקד</span>
        <span className="text-lg font-extrabold sm:hidden">טראבי</span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-mark.svg" alt="עודד המנקד" className="site-logo h-9 w-9" />
      </Link>
    </header>
  );
}
