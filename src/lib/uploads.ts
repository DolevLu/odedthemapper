import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";

/**
 * Saves an uploaded File and returns its public URL. Uses Vercel Blob when
 * BLOB_READ_WRITE_TOKEN is configured (production — Vercel's filesystem is
 * read-only/ephemeral outside a single request), otherwise writes under
 * public/uploads/<subfolder>/ for local dev.
 */
export async function saveUploadedFile(file: File, subfolder: string): Promise<string> {
  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const fileName = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${safeName}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`${subfolder}/${fileName}`, file, { access: "public" });
    return blob.url;
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const dir = path.join(process.cwd(), "public", "uploads", subfolder);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, fileName), bytes);

  return `/uploads/${subfolder}/${fileName}`;
}
