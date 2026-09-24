import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getDestinationBySlug } from "@/lib/data/destinations";
import { getPoiLocationsForDestination } from "@/lib/data/pois";
import { prisma } from "@/lib/prisma";
import { addLogistic } from "@/lib/actions/trip";
import { LoginPromptBanner } from "@/components/LoginPromptBanner";
import { SheetLauncher } from "@/components/SheetLauncher";
import type { DictionaryKey } from "@/lib/i18n/dictionary";
import { WhereToStayHeatmap } from "./WhereToStayHeatmap";
import { LogisticsList } from "./LogisticsList";
import type { LogisticItem } from "./LogisticTicketCard";
import { getLang, getServerT } from "@/lib/i18n/server";

export default async function LogisticsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [destination, session] = await Promise.all([getDestinationBySlug(slug), auth()]);
  if (!destination) notFound();
  const userId = session?.user?.id;
  const [items, heatmapPoints, t, lang] = await Promise.all([
    userId
      ? prisma.tripLogistic.findMany({ where: { userId, destinationId: destination.id }, orderBy: { startsAt: "asc" } })
      : Promise.resolve([]),
    getPoiLocationsForDestination(destination.id),
    getServerT(),
    getLang(),
  ]);
  const dateLocale = lang === "en" ? "en-GB" : "he-IL";

  const addAction = addLogistic.bind(null, destination.id, slug);

  const logisticItems: LogisticItem[] = items.map((item) => {
    const details = JSON.parse(item.detailsJson) as { title: string; notes: string };
    const dateRange = item.startsAt
      ? item.endsAt && item.endsAt.getTime() !== item.startsAt.getTime()
        ? `${item.startsAt.toLocaleDateString(dateLocale)} — ${item.endsAt.toLocaleDateString(dateLocale)}`
        : item.startsAt.toLocaleDateString(dateLocale)
      : null;
    return {
      id: item.id,
      type: item.type,
      title: details.title,
      notes: details.notes,
      confirmationNumber: item.confirmationNumber,
      dateRange,
      address: item.address,
      hasMapPin: Boolean(item.lat && item.lng),
      imageUrl: item.imageUrl,
    };
  });

  const inputCls = "w-full rounded-xl border px-3 py-2.5 text-base";
  const inputStyle = { borderColor: "color-mix(in srgb, var(--primary) 35%, transparent)", background: "var(--surface)" };
  const TYPES = [
    { value: "flight", icon: "✈️" },
    { value: "hotel", icon: "🏨" },
    { value: "ticket", icon: "🎫" },
    { value: "passport", icon: "🛂" },
    { value: "visa", icon: "📋" },
    { value: "insurance", icon: "🛡️" },
    { value: "vaccination", icon: "💉" },
    { value: "other", icon: "📄" },
  ] as const;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">{t("logistics.title")}</h1>
        <div className="flex items-center gap-2">
          {heatmapPoints.length > 0 && <WhereToStayHeatmap points={heatmapPoints} destinationName={destination.name} />}
          {userId && (
            <SheetLauncher label={<>＋ {t("logistics.add")}</>} title={t("logistics.add")}>
              <form action={addAction} className="flex flex-col gap-3">
                <div className="grid grid-cols-4 gap-2">
                  {TYPES.map((ty, i) => (
                    <label key={ty.value} className="cursor-pointer">
                      <input type="radio" name="type" value={ty.value} defaultChecked={i === 0} className="peer sr-only" />
                      <span
                        className="flex flex-col items-center gap-0.5 rounded-xl border px-1 py-2 text-center text-[11px] font-semibold peer-checked:border-[color:var(--primary)] peer-checked:bg-[color-mix(in_srgb,var(--primary)_14%,transparent)]"
                        style={{ borderColor: "color-mix(in srgb, var(--primary) 20%, transparent)" }}
                      >
                        <span className="text-xl">{ty.icon}</span>
                        {t(`logistics.type.${ty.value}` as DictionaryKey)}
                      </span>
                    </label>
                  ))}
                </div>
                <input name="title" placeholder={t("logistics.titlePlaceholder")} required className={inputCls} style={inputStyle} />
                <input name="confirmationNumber" placeholder={t("logistics.confirmationPlaceholder")} className={inputCls} style={inputStyle} />
                <div className="flex gap-2">
                  <label className="flex-1 text-xs opacity-70">
                    {t("logistics.fromDate")}
                    <input name="startsAt" type="date" className={`${inputCls} mt-1`} style={inputStyle} />
                  </label>
                  <label className="flex-1 text-xs opacity-70">
                    {t("logistics.toDate")}
                    <input name="endsAt" type="date" className={`${inputCls} mt-1`} style={inputStyle} />
                  </label>
                </div>
                <input name="address" placeholder={t("logistics.addressPlaceholder")} className={inputCls} style={inputStyle} />
                <input name="notes" placeholder={t("logistics.notesPlaceholder")} className={inputCls} style={inputStyle} />
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed px-3 py-3 text-sm" style={{ borderColor: "color-mix(in srgb, var(--primary) 40%, transparent)" }}>
                  <span className="text-2xl">📎</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs opacity-60">{t("logistics.imageOrPdf")}</span>
                    <input name="image" type="file" accept="image/*,application/pdf" className="w-full text-sm" />
                  </span>
                </label>
                <button type="submit" className="mt-1 rounded-full py-3 text-base font-bold text-white" style={{ background: "var(--primary)" }}>
                  {t("logistics.add")}
                </button>
              </form>
            </SheetLauncher>
          )}
        </div>
      </div>

      {!userId && <LoginPromptBanner slug={slug} path="/logistics" message={t("logistics.loginPrompt")} />}

      <LogisticsList items={logisticItems} slug={slug} />
    </div>
  );
}
