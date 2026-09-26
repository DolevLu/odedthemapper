import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/** The Android app registers (POST) or removes (DELETE) its Firebase Cloud Messaging token here. */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "יש להתחבר" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const token: string | undefined = typeof body?.token === "string" ? body.token : undefined;
  if (!token || token.length < 20 || token.length > 4096) return NextResponse.json({ error: "בקשה לא תקינה" }, { status: 400 });

  // One token = one device: if someone else logged in on this phone before, the token moves to the current user.
  await prisma.deviceToken.upsert({
    where: { token },
    update: { userId: session.user.id },
    create: { userId: session.user.id, token, platform: "android" },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "יש להתחבר" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const token: string | undefined = typeof body?.token === "string" ? body.token : undefined;
  if (!token) return NextResponse.json({ error: "בקשה לא תקינה" }, { status: 400 });
  await prisma.deviceToken.deleteMany({ where: { token, userId: session.user.id } });
  return NextResponse.json({ ok: true });
}
