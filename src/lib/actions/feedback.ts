"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { saveUploadedFile } from "@/lib/uploads";
import { canManageContent } from "@/lib/access";
import { notifyAdmins } from "@/lib/adminAlerts";

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
  // Anonymous reports are text-only: an open file-upload endpoint would be free storage for anyone.
  if (session?.user?.id && image instanceof File && image.size > 0) {
    imageUrl = await saveUploadedFile(image, "feedback");
  }

  await prisma.feedback.create({
    data: {
      userId: session?.user?.id ?? null,
      kind,
      description: description.trim().slice(0, 2000),
      imageUrl,
      pageUrl: typeof pageUrl === "string" ? pageUrl : null,
    },
  });

  const kindLabel = kind === "bug" ? "🐛 באג" : "💡 הצעה";
  const reporter = session?.user?.email ?? "אנונימי";
  const preview = description.trim().slice(0, 120);
  await notifyAdmins({
    title: `${kindLabel} - פנייה חדשה`,
    body: `${reporter}: ${preview}`,
    url: "/admin/feedback",
  });

  return { ok: true };
}

export async function markFeedbackStatus(id: string, status: "open" | "reviewed") {
  const session = await auth();
  if (!session?.user?.id || !(await canManageContent(session.user.id))) throw new Error("אין הרשאה");

  await prisma.feedback.update({ where: { id }, data: { status } });
  revalidatePath("/admin/feedback");
}
