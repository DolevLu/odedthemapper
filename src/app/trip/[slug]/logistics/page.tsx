import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getDestinationBySlug } from "@/lib/data/destinations";
import { getFlatPoisForDestination } from "@/lib/data/pois";
import { prisma } from "@/lib/prisma";
import { addLogistic } from "@/lib/actions/trip";
import { LoginPromptBanner } from "@/components/LoginPromptBanner";
import { WhereToStayHeatmap } from "./WhereToStayHeatmap";
import { LogisticsList } from "./LogisticsList";
import type { LogisticItem } from "./LogisticTicketCard";

export default async function LogisticsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const destination = await getDestinationBySlug(slug);
  if (!destination) notFound();

  const session = await auth();
  const userId = session?.user?.id;
  const [items, pois] = await Promise.all([
    userId
      ? prisma.tripLogistic.findMany({ where: { userId, destinationId: destination.id }, orderBy: { startsAt: "asc" } })
      : Promise.resolve([]),
    getFlatPoisForDestination(destination.id),
  ]);

  const addAction = addLogistic.bind(null, destination.id, slug);
  const heatmapPoints: [number, number][] = pois.map((p) => [p.lat, p.lng]);

  const logisticItems: LogisticItem[] = items.map((item) => {
    const details = JSON.parse(item.detailsJson) as { title: string; notes: string };
    const dateRange = item.startsAt
      ? item.endsAt && item.endsAt.getTime() !== item.startsAt.getTime()
        ? `${item.startsAt.toLocaleDateString("he-IL")} — ${item.endsAt.toLocaleDateString("he-IL")}`
        : item.startsAt.toLocaleDateString("he-IL")
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">✈️ לוגיסטיקת טיול</h1>
        {heatmapPoints.length > 0 && <WhereToStayHeatmap points={heatmapPoints} destinationName={destination.name} />}
      </div>

      {userId ? (
        <form
          action={addAction}
          className="grid grid-cols-1 gap-3 border p-4 sm:grid-cols-2"
          style={{ borderRadius: "var(--radius)", borderColor: "var(--primary)", background: "var(--surface)" }}
        >
          <select name="type" className="rounded-lg border px-3 py-2" style={{ borderColor: "var(--primary)" }}>
            <option value="flight">✈️ טיסה</option>
            <option value="hotel">🏨 מלון</option>
            <option value="ticket">🎫 כרטיס כללי (רכבת/אוטובוס/אטרקציה)</option>
            <option value="passport">🛂 דרכון</option>
            <option value="visa">📋 ויזה</option>
            <option value="insurance">🛡️ ביטוח נסיעות</option>
            <option value="vaccination">💉 חיסון</option>
            <option value="other">📄 אחר</option>
          </select>
          <input name="title" placeholder="למשל: אל-על LY386 / מלון רומא סנטרל" required className="rounded-lg border px-3 py-2" style={{ borderColor: "var(--primary)" }} />
          <input name="confirmationNumber" placeholder="מספר אישור" className="rounded-lg border px-3 py-2" style={{ borderColor: "var(--primary)" }} />
          <input name="address" placeholder="כתובת (למלון — יסומן אוטומטית על המפה)" className="rounded-lg border px-3 py-2" style={{ borderColor: "var(--primary)" }} />
          <div className="flex gap-2">
            <label className="flex-1 text-xs opacity-60">
              מתאריך
              <input name="startsAt" type="date" className="mt-1 w-full rounded-lg border px-3 py-2" style={{ borderColor: "var(--primary)" }} />
            </label>
            <label className="flex-1 text-xs opacity-60">
              עד תאריך
              <input name="endsAt" type="date" className="mt-1 w-full rounded-lg border px-3 py-2" style={{ borderColor: "var(--primary)" }} />
            </label>
          </div>
          <input name="notes" placeholder="הערות" className="rounded-lg border px-3 py-2 sm:col-span-2" style={{ borderColor: "var(--primary)" }} />
          <label className="text-sm sm:col-span-2">
            <span className="mb-1 block text-xs opacity-60">תמונה או PDF (כרטיס טיסה / אישור הזמנה)</span>
            <input name="image" type="file" accept="image/*,application/pdf" className="w-full text-sm" />
          </label>
          <button type="submit" className="rounded-full px-4 py-2 font-semibold text-white sm:col-span-2" style={{ background: "var(--primary)" }}>
            הוספה
          </button>
        </form>
      ) : (
        <LoginPromptBanner slug={slug} path="/logistics" message="התחברו כדי להוסיף ולשמור טיסות, מלונות ומסמכי טיול" />
      )}

      <LogisticsList items={logisticItems} slug={slug} />
    </div>
  );
}
