import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { colorForDay } from "@/lib/geo";
import { PrintButton } from "./PrintButton";

export default async function SharedItineraryPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const itinerary = await prisma.itinerary.findUnique({
    where: { shareToken: token },
    include: {
      destination: true,
      days: {
        orderBy: { dayIndex: "asc" },
        include: {
          items: {
            orderBy: { order: "asc" },
            include: { poi: { include: { category: true, photos: { take: 1 } } } },
          },
        },
      },
    },
  });
  if (!itinerary) notFound();

  const isClientPlan = itinerary.kind === "client";
  const plannerProfile = isClientPlan ? await prisma.plannerProfile.findUnique({ where: { userId: itinerary.userId } }) : null;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-12 print:py-4">
      <div className="flex items-center justify-between gap-3 border-b pb-4" style={{ borderColor: "#1A1A1A22" }}>
        <div className="flex items-center gap-3">
          {plannerProfile?.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={plannerProfile.logoUrl} alt={plannerProfile.companyName ?? ""} className="h-10 w-10 rounded-lg object-contain" />
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.svg" alt="עודד המנקד" className="h-10 w-10" />
          <div>
            <p className="text-xs font-bold tracking-wide opacity-70">
              {plannerProfile?.companyName ? `${plannerProfile.companyName} · עודד המנקד` : "עודד המנקד"}
            </p>
            <p className="text-sm opacity-60">{isClientPlan ? "מסלול מקצועי — תצוגת לקוח" : "מסלול טיול — תצוגת אורח"}</p>
          </div>
        </div>
        <PrintButton />
      </div>

      <h1 className="-mt-2 text-2xl font-extrabold">{itinerary.destination.name}</h1>

      {itinerary.days.length === 0 && <p className="opacity-60">אין עדיין תוכן במסלול הזה.</p>}

      <div className="flex flex-col gap-6">
        {itinerary.days.map((day) => {
          const dayColor = colorForDay(day.dayIndex - 1);
          return (
            <div key={day.id} className="rounded-2xl border-2 p-5" style={{ borderColor: dayColor }}>
              <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
                <span className="h-3 w-3 rounded-full" style={{ background: dayColor }} />
                יום {day.dayIndex}
              </h2>
              <div className="flex flex-col gap-2">
                {day.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 rounded-lg bg-black/[0.03] px-3 py-2 text-sm">
                    {item.poi?.photos[0] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.poi.photos[0].url} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                    )}
                    {item.timeOfDay && <span className="font-mono text-xs opacity-70">{item.timeOfDay}</span>}
                    {item.poi && <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: item.poi.category.colorHex }} />}
                    <span>{item.poi ? item.poi.name : item.customLabel}</span>
                  </div>
                ))}
                {day.items.length === 0 && <p className="text-xs opacity-50">אין פריטים ביום הזה.</p>}
              </div>
            </div>
          );
        })}
      </div>

      <p className="print:hidden mt-4 text-center text-xs opacity-50">נוצר עם עודד המנקד</p>
    </div>
  );
}
