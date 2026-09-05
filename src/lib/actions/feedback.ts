"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { saveUploadedFile } from "@/lib/uploads";
import { canManageContent } from "@/lib/access";

const VALID_KINDS = new Set(["bug", "suggestion"]);

/** Submitted from the sidebar's report menu (see FeedbackModal). Works for
 * anonymous visitors too (userId stays null) — reporting a bug shouldn't
 * require being logged in. */
export async function submitFeedback(formData: FormData): Promise<{ error: string } | { ok: true }> {
  const kind = formData.get("kind");
  const description = formData.get("description");
  const pageUrl = formData.get("pageUrl");
  const image = formData.get("image");

  if (typeof kind !== "string" || !VALID_KINDS.has(kind)) return { error: "יש לבחור סוג פנייה" };
  if (typeof description !== "string" || !description.trim()) return { error: "יש לכתוב תיאור" };

  const session = await auth();

  let imageUrl: string | null = null;
  if (image instanceof File && image.size > 0) {
    imageUrl = await saveUploadedFile(image, "feedback");
  }

  await prisma.feedback.create({
    data: {
      userId: session?.user?.id ?? null,
      kind,
      description: description.trim(),
      imageUrl,
      pageUrl: typeof pageUrl === "string" ? pageUrl : null,
    },
  });

  return { ok: true };
}

export async function markFeedbackStatus(id: string, status: "open" | "reviewed") {
  const session = await auth();
  if (!session?.user?.id || !(await canManageContent(session.user.id))) throw new Error("אין הרשאה");

  await prisma.feedback.update({ where: { id }, data: { status } });
  revalidatePath("/admin/feedback");
}
