import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";

/**
 * Saves an uploaded File and returns its public URL, or null if it couldn't
 * be saved. Uses Vercel Blob when BLOB_READ_WRITE_TOKEN is configured
 * (required in production — Vercel's filesystem is read-only/ephemeral
 * outside a single request, so writing under public/uploads/ there throws).
 * Without that token we still try the local-filesystem path (works in dev)
 * but never let a storage failure take down the whole form submission —
 * callers treat a null return as "saved without this file".
 */
export async function saveUploadedFile(file: File, subfolder: string): Promise<string | null> {
  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const fileName = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${safeName}`;

  try {
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(`${subfolder}/${fileName}`, file, { access: "public" });
      return blob.url;
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const dir = path.join(process.cwd(), "public", "uploads", subfolder);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, fileName), bytes);

    return `/uploads/${subfolder}/${fileName}`;
  } catch (err) {
    console.error(`saveUploadedFile failed for ${subfolder}/${fileName}:`, err);
    return null;
  }
}
