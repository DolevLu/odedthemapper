import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  uploadKml,
  deleteDestinationContent,
  updateDestinationMeta,
  addCoupon,
  deleteCoupon,
  addPhrasebookEntry,
  deletePhrasebookEntry,
  getEnrichmentStatus,
} from "@/lib/actions/admin";
import { EnrichmentPanel } from "./EnrichmentPanel";

// KML uploads for a large destination (1000-2000+ placemarks) can take a
// while even after batching the DB writes — raised from the platform
// default so a big import isn't killed mid-way through.
export const maxDuration = 60;

export default async function AdminDestinationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const destination = await prisma.destination.findUnique({
    where: { slug },
    include: {
      kmlImports: { orderBy: { createdAt: "desc" } },
      coupons: true,
      phrasebook: true,
      areas: { include: { categories: { include: { _count: { select: { pois: true } } } } } },
    },
  });
  if (!destination) notFound();

  const poiCount = destination.areas.reduce(
    (sum, a) => sum + a.categories.reduce((s, c) => s + c._count.pois, 0),
    0
  );
  const enrichmentStatus = await getEnrichmentStatus(destination.id);

  const uploadAction = uploadKml.bind(null, destination.id, slug);
  const deleteContentAction = deleteDestinationContent.bind(null, destination.id, slug);
  const metaAction = updateDestinationMeta.bind(null, destination.id, slug);
  const couponAction = addCoupon.bind(null, destination.id, slug);
  const phraseAction = addPhrasebookEntry.bind(null, destination.id, slug);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold">{destination.name}</h1>
        <p className="text-sm opacity-60">{poiCount} נקודות · {destination.areas.length} אזורים</p>
      </div>

      <section className="rounded-xl border border-black/10 bg-white p-5">
        <h2 className="mb-3 font-bold">פרטי יעד</h2>
        <form action={metaAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <select name="status" defaultValue={destination.status} className="rounded-lg border px-3 py-2">
            <option value="draft">draft</option>
            <option value="preview">preview</option>
            <option value="live">live</option>
          </select>
          <input name="tagline" defaultValue={destination.tagline ?? ""} placeholder="תגית שיווקית" className="rounded-lg border px-3 py-2" />
          <button type="submit" className="rounded-lg bg-black px-4 py-2 font-semibold text-white sm:col-span-2">
            שמירה
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-black/10 bg-white p-5">
        <h2 className="mb-3 font-bold">העלאת KML</h2>
        <p className="mb-3 text-sm opacity-60">
          לחיצה על &quot;שמירה&quot; מוחקת את כל התוכן הקיים של היעד (אם יש), מייבאת את הקבצים החדשים, מוסיפה שיחון
          בסיסי אוטומטית (אם עדיין ריק), ומפרסמת את היעד - הכל בפעולה אחת. אפשר לבחור כמה קבצי KML בבת אחת (למשל קובץ
          נפרד לכל עיר) - האזורים והקטגוריות שלהם יאוחדו למפה אחת קוהרנטית (אזור/קטגוריה עם אותו שם בכמה קבצים ימוזגו
          לאחד, לא ישוכפלו). בכל מקרה, העלאה חדשה תמיד מחליפה לגמרי את המפה הקיימת, לא מוסיפה עליה.
        </p>
        <form action={uploadAction} className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input type="file" name="files" accept=".kml" multiple required className="flex-1 text-sm" />
          <button type="submit" className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white">
            שמירה והחלפה
          </button>
        </form>
        <div className="mt-4 flex flex-col gap-2 text-sm">
          {destination.kmlImports.map((imp) => (
            <div key={imp.id} className="flex justify-between rounded-lg bg-black/5 px-3 py-2">
              <span>{imp.fileName}</span>
              <span className="opacity-60">
                {imp.placemarkCount} נקודות · {imp.createdAt.toLocaleDateString("he-IL")}
              </span>
            </div>
          ))}
          {destination.kmlImports.length === 0 && <p className="opacity-60">עדיין לא הועלה KML.</p>}
        </div>
        {destination.kmlImports.length > 0 && (
          <form action={deleteContentAction} className="mt-4">
            <button className="text-sm text-red-600 underline">מחיקת כל התוכן של היעד (ללא העלאת קובץ חדש)</button>
          </form>
        )}
      </section>

      <EnrichmentPanel
        destinationId={destination.id}
        slug={slug}
        initialTotal={enrichmentStatus.total}
        initialRemaining={enrichmentStatus.remaining}
      />

      <section className="rounded-xl border border-black/10 bg-white p-5">
        <h2 className="mb-3 font-bold">הנחות וקופונים</h2>
        <form action={couponAction} className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-4">
          <input name="partnerName" placeholder="שם השותף" required className="rounded-lg border px-3 py-2" />
          <input name="discountDesc" placeholder="תיאור ההנחה" required className="rounded-lg border px-3 py-2" />
          <input name="code" placeholder="קוד קופון" className="rounded-lg border px-3 py-2" />
          <button type="submit" className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white">
            הוספה
          </button>
        </form>
        <div className="flex flex-col gap-2 text-sm">
          {destination.coupons.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-lg bg-black/5 px-3 py-2">
              <span>
                {c.partnerName} — {c.discountDesc}
              </span>
              <form action={deleteCoupon.bind(null, c.id, slug)}>
                <button className="opacity-60 underline">מחיקה</button>
              </form>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-black/10 bg-white p-5">
        <h2 className="mb-3 font-bold">שיחון</h2>
        <form action={phraseAction} className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-4">
          <input name="localPhrase" placeholder="ביטוי בשפה המקומית" required className="rounded-lg border px-3 py-2" />
          <input name="translation" placeholder="תרגום" required className="rounded-lg border px-3 py-2" />
          <input name="pronunciation" placeholder="הגייה" className="rounded-lg border px-3 py-2" />
          <button type="submit" className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white">
            הוספה
          </button>
        </form>
        <div className="flex flex-col gap-2 text-sm">
          {destination.phrasebook.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-lg bg-black/5 px-3 py-2">
              <span>
                {p.localPhrase} — {p.translation}
              </span>
              <form action={deletePhrasebookEntry.bind(null, p.id, slug)}>
                <button className="opacity-60 underline">מחיקה</button>
              </form>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
