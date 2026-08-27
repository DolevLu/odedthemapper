"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManageContent } from "@/lib/access";

async function requireContentManager() {
  const session = await auth();
  if (!session?.user?.id || !(await canManageContent(session.user.id))) {
    throw new Error("אין הרשאה לניהול תוכן");
  }
}

export async function createPromoCode(formData: FormData): Promise<{ error?: string }> {
  await requireContentManager();
  const code = String(formData.get("code") ?? "").trim().toLowerCase();
  const discountPercent = Number(formData.get("discountPercent"));
  const partnerName = String(formData.get("partnerName") ?? "").trim() || null;
  const maxUsesRaw = String(formData.get("maxUses") ?? "").trim();
  const maxUses = maxUsesRaw ? Number(maxUsesRaw) : null;
  const expiresAtRaw = String(formData.get("expiresAt") ?? "").trim();
  const expiresAt = expiresAtRaw ? new Date(expiresAtRaw) : null;

  if (!code) return { error: "יש להזין קוד" };
  if (!Number.isFinite(discountPercent) || discountPercent < 1 || discountPercent > 100) {
    return { error: "אחוז ההנחה חייב להיות בין 1 ל-100" };
  }

  try {
    await prisma.promoCode.create({ data: { code, discountPercent, partnerName, maxUses, expiresAt } });
  } catch {
    return { error: `הקוד "${code}" כבר קיים` };
  }
  revalidatePath("/admin/promo-codes");
  return {};
}

export async function togglePromoCodeActive(promoId: string, active: boolean) {
  await requireContentManager();
  await prisma.promoCode.update({ where: { id: promoId }, data: { active } });
  revalidatePath("/admin/promo-codes");
}

export async function deletePromoCode(promoId: string) {
  await requireContentManager();
  await prisma.promoCode.delete({ where: { id: promoId } });
  revalidatePath("/admin/promo-codes");
}
