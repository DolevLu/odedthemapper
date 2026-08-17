import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { claimReferralCode } from "@/lib/referral";

const RegisterSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(200),
  ref: z.string().optional(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = RegisterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "פרטים לא תקינים" }, { status: 400 });
  }

  const { name, email, password, ref } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "כבר קיים חשבון עם המייל הזה" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const created = await prisma.user.create({ data: { name, email, passwordHash } });
  if (ref) await claimReferralCode(created.id, ref);

  return NextResponse.json({ ok: true });
}
