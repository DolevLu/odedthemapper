import { getAllUsersForAdmin } from "@/lib/admin/users";
import { LiveActiveCount } from "@/components/admin/LiveActiveCount";

const DATE_FMT = new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "numeric", year: "numeric" });
const RELATIVE_FMT = new Intl.RelativeTimeFormat("he-IL", { numeric: "auto" });

function relativeLastSeen(date: Date | null): string {
  if (!date) return "מעולם לא";
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return "עכשיו";
  if (minutes < 60) return RELATIVE_FMT.format(-minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (hours < 24) return RELATIVE_FMT.format(-hours, "hour");
  const days = Math.round(hours / 24);
  return RELATIVE_FMT.format(-days, "day");
}

export default async function AdminUsersPage() {
  const { users, activeNowCount } = await getAllUsersForAdmin();

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="mb-2 text-2xl font-bold">משתמשים</h1>
      <div className="mb-6 flex flex-wrap gap-4">
        <div className="rounded-xl border border-black/10 bg-white px-5 py-3">
          <p className="text-xs opacity-60">פעילים עכשיו</p>
          <p className="text-xl font-bold">
            <LiveActiveCount initialCount={activeNowCount} />
          </p>
        </div>
        <div className="rounded-xl border border-black/10 bg-white px-5 py-3">
          <p className="text-xs opacity-60">סה״כ משתמשים רשומים</p>
          <p className="text-xl font-bold">{users.length}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-black/10 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/10 bg-black/5">
              <th className="p-3 text-start">משתמש</th>
              <th className="p-3 text-start">נוצר בתאריך</th>
              <th className="p-3 text-start">סטטוס</th>
              <th className="p-3 text-start">תוכנית</th>
              <th className="p-3 text-start">יעד חינמי</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-black/5 align-top">
                <td className="p-3">
                  <div className="font-medium">{u.name || "—"}</div>
                  <div className="text-xs opacity-60">{u.email}</div>
                  {u.isAdmin && <span className="mt-1 inline-block rounded-full bg-purple-100 px-1.5 py-0.5 text-[10px] font-semibold text-purple-700">אדמין</span>}
                </td>
                <td className="p-3">{DATE_FMT.format(u.createdAt)}</td>
                <td className="p-3">
                  {u.isOnlineNow ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                      מחובר/ת עכשיו
                    </span>
                  ) : (
                    <span className="text-xs opacity-60">{relativeLastSeen(u.lastSeenAt)}</span>
                  )}
                </td>
                <td className="p-3">{u.planName ?? <span className="opacity-40">—</span>}</td>
                <td className="p-3">{u.freeDestinationName ?? <span className="opacity-40">—</span>}</td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center opacity-60">
                  אין עדיין משתמשים רשומים.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
