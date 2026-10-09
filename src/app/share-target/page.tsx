import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getServerT } from "@/lib/i18n/server";
import { SharePlaceImport } from "@/components/map/SharePlaceImport";

// The landing page for "Share -> Travi": the Android app (see MainActivity) and an installed web app (manifest
// share_target) both open /share-target?text=...&url=... with whatever the share sheet sent. It also serves the
// "paste a link" tab of the map's + menu. Everything after this is SharePlaceImport.
export default async function ShareTargetPage({ searchParams }: { searchParams: Promise<{ text?: string; url?: string; title?: string }> }) {
  const { text, url, title } = await searchParams;
  const shared = [title, text, url].filter(Boolean).join("\n").slice(0, 4000);

  const session = await auth();
  if (!session?.user?.id) {
    const back = `/share-target?text=${encodeURIComponent(shared)}`;
    redirect(`/login?callbackUrl=${encodeURIComponent(back)}`);
  }

  const t = await getServerT();
  return (
    <div className="flex flex-1 flex-col items-center px-4 py-8" style={{ background: "var(--background)" }}>
      <div className="w-full max-w-md rounded-3xl border border-black/5 bg-white p-5">
        <h1 className="mb-4 text-xl font-extrabold">📍 {t("share.title")}</h1>
        <SharePlaceImport initialText={shared} />
      </div>
    </div>
  );
}
