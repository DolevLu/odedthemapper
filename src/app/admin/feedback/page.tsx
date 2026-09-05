import { prisma } from "@/lib/prisma";
import { markFeedbackStatus } from "@/lib/actions/feedback";

const DATE_FMT = new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
const KIND_LABEL: Record<string, string> = { bug: "🐞 באג", suggestion: "💡 הצעה" };

export default async function AdminFeedbackPage() {
  const items = await prisma.feedback.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: { user: { select: { name: true, email: true } } },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 text-2xl font-bold">משוב ודיווחים</h1>
      <p className="mb-6 text-sm opacity-60">דיווחי באגים והצעות שיפור שנשלחו דרך תפריט הצד באתר ובאפליקציה.</p>

      <div className="flex flex-col gap-3">
        {items.length === 0 && <p className="text-sm opacity-60">אין דיווחים עדיין.</p>}
        {items.map((item) => (
          <div key={item.id} className="flex flex-col gap-2 rounded-xl border border-black/10 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <span>{KIND_LABEL[item.kind] ?? item.kind}</span>
                <span
                  className="rounded-full px-2 py-0.5 text-xs"
                  style={{ background: item.status === "open" ? "#fef3c7" : "#dcfce7" }}
                >
                  {item.status === "open" ? "פתוח" : "נבדק"}
                </span>
              </div>
              <span className="text-xs opacity-50">{DATE_FMT.format(item.createdAt)}</span>
            </div>

            <p className="whitespace-pre-wrap text-sm">{item.description}</p>

            {item.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.imageUrl} alt="" className="max-h-64 w-fit rounded-lg border border-black/10 object-contain" />
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs opacity-60">
              <span>
                {item.user ? `${item.user.name ?? item.user.email}` : "אנונימי"}
                {item.pageUrl ? ` · ${item.pageUrl}` : ""}
              </span>
              <form action={markFeedbackStatus.bind(null, item.id, item.status === "open" ? "reviewed" : "open")}>
                <button type="submit" className="font-medium underline opacity-70 hover:opacity-100">
                  {item.status === "open" ? "סמן כנבדק" : "החזר לפתוח"}
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
