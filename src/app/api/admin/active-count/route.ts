import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { canManageContent } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { ACTIVE_NOW_WINDOW_MS } from "@/lib/admin/users";

/** Backs LiveActiveCount.tsx's polling on /admin/users - a tiny, cheap COUNT query (not the full user list) so
 * the "online now" number can refresh every ~20s without reloading the whole table. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id || !(await canManageContent(session.user.id))) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  const count = await prisma.user.count({ where: { lastSeenAt: { gte: new Date(Date.now() - ACTIVE_NOW_WINDOW_MS) } } });
  return NextResponse.json({ count });
}
