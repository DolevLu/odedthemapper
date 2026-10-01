import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/** Called periodically by PresenceHeartbeat.tsx while a logged-in user has the app open - the only signal the
 * "live now" admin count (lib/admin/users.ts) has, since NextAuth sessions here are JWT-based and never touch
 * the DB. No-ops silently for a logged-out visitor (nothing to track per-user for them). */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ ok: true });

  await prisma.user.update({ where: { id: session.user.id }, data: { lastSeenAt: new Date() } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
