import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/** The on/off switch in Settings (the 3-dot menu). Notifications are ON by default (User.notificationsEnabled). */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "יש להתחבר" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { notificationsEnabled: true } });
  return NextResponse.json({ enabled: user?.notificationsEnabled ?? true });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "יש להתחבר" }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (typeof body?.enabled !== "boolean") return NextResponse.json({ error: "בקשה לא תקינה" }, { status: 400 });
  await prisma.user.update({ where: { id: session.user.id }, data: { notificationsEnabled: body.enabled } });
  return NextResponse.json({ ok: true, enabled: body.enabled });
}
