import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getDestinationBySlug } from "@/lib/data/destinations";
import { prisma } from "@/lib/prisma";
import { addLogistic, deleteLogistic } from "@/lib/actions/trip";

export default async function LogisticsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const destination = await getDestinationBySlug(slug);
  if (!destination) notFound();

  const session = await auth();
  const items = await prisma.tripLogistic.findMany({
    where: { userId: session!.user!.id, destinationId: destination.id },
    orderBy: { startsAt: "asc" },
  });

  const addAction = addLogistic.bind(null, destination.id, slug);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold">✈️ לוגיסטיקת טיול</h1>

      <form
        action={addAction}
        className="grid grid-cols-1 gap-3 border p-4 sm:grid-cols-2"
        style={{ borderRadius: "var(--radius)", borderColor: "var(--primary)", background: "var(--surface)" }}
      >
        <select name="type" className="rounded-lg border px-3 py-2" style={{ borderColor: "var(--primary)" }}>
          <option value="flight">טיסה</option>
          <option value="hotel">מלון</option>
        </select>
        <input name="title" placeholder="למשל: אל-על LY386 / מלון רומא סנטרל" required className="rounded-lg border px-3 py-2" style={{ borderColor: "var(--primary)" }} />
        <input name="confirmationNumber" placeholder="מספר אישור" className="rounded-lg border px-3 py-2" style={{ borderColor: "var(--primary)" }} />
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
          <span className="mb-1 block text-xs opacity-60">תמונה (כרטיס טיסה / אישור הזמנה)</span>
          <input name="image" type="file" accept="image/*" className="w-full text-sm" />
        </label>
        <button type="submit" className="rounded-full px-4 py-2 font-semibold text-white sm:col-span-2" style={{ background: "var(--primary)" }}>
          הוספה
        </button>
      </form>

      <div className="flex flex-col gap-2">
        {items.length === 0 && <p className="text-sm opacity-60">עדיין לא הוספתם טיסות או מלונות.</p>}
        {items.map((item) => {
          const details = JSON.parse(item.detailsJson) as { title: string; notes: string };
          const dateRange = item.startsAt
            ? item.endsAt && item.endsAt.getTime() !== item.startsAt.getTime()
              ? `${item.startsAt.toLocaleDateString("he-IL")} — ${item.endsAt.toLocaleDateString("he-IL")}`
              : item.startsAt.toLocaleDateString("he-IL")
            : null;
          return (
            <div
              key={item.id}
              className="flex items-start justify-between gap-3 border p-4"
              style={{ borderRadius: "var(--radius)", borderColor: "var(--primary)", background: "var(--surface)" }}
            >
              <div className="flex gap-3">
                {item.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.imageUrl} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                )}
                <div>
                  <p className="text-xs opacity-60">{item.type === "flight" ? "✈️ טיסה" : "🏨 מלון"}</p>
                  <p className="font-semibold">{details.title}</p>
                  {item.confirmationNumber && <p className="text-sm opacity-70">אישור: {item.confirmationNumber}</p>}
                  {dateRange && <p className="text-sm opacity-70">{dateRange}</p>}
                  {details.notes && <p className="text-sm opacity-70">{details.notes}</p>}
                </div>
              </div>
              <form action={deleteLogistic.bind(null, item.id, slug)}>
                <button className="text-sm opacity-60 underline">מחיקה</button>
              </form>
            </div>
          );
        })}
      </div>
    </div>
  );
}
