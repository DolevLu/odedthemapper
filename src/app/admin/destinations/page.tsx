import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function AdminDestinationsPage() {
  const destinations = await prisma.destination.findMany({
    orderBy: { name: "asc" },
    include: { areas: { include: { categories: { include: { _count: { select: { pois: true } } } } } } },
  });

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">יעדים</h1>
        <Link href="/admin/destinations/new" className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white">
          + הוספת יעד
        </Link>
      </div>
      <div className="overflow-hidden rounded-xl border border-black/10 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/10 bg-black/5 text-start">
              <th className="p-3 text-start">יעד</th>
              <th className="p-3 text-start">סטטוס</th>
              <th className="p-3 text-start">נקודות</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {destinations.map((d) => {
              const poiCount = d.areas.reduce(
                (sum, a) => sum + a.categories.reduce((s, c) => s + c._count.pois, 0),
                0
              );
              return (
                <tr key={d.id} className="border-b border-black/5">
                  <td className="p-3 font-medium">{d.name}</td>
                  <td className="p-3">
                    <span
                      className="rounded-full px-2 py-0.5 text-xs"
                      style={{
                        background: d.status === "live" ? "#dcfce7" : d.status === "preview" ? "#fef9c3" : "#f3f4f6",
                      }}
                    >
                      {d.status}
                    </span>
                  </td>
                  <td className="p-3">{poiCount}</td>
                  <td className="p-3">
                    <Link href={`/admin/destinations/${d.slug}`} className="font-medium underline">
                      ניהול
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
