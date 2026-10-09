import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";
import { auth } from "@/auth";
import { consumeApiQuota } from "@/lib/apiQuota";

/** Largest file saveUploadedFile will store. Real phone photos are 3-10MB; video goes through the album's direct-to-Blob
 * route instead (which has its own cap), so nothing legitimate on this path needs more. */
const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;

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
  // Every stored byte costs money (Blob storage + egress): signed-in users only, images/video only, size-capped, and
  // a daily per-user file budget so a script can't fill the bucket.
  if (file.size > MAX_UPLOAD_BYTES || !/^(image|video)\//.test(file.type)) return null;
  const session = await auth();
  if (!session?.user?.id || !(await consumeApiQuota(session.user.id, "upload"))) return null;

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

/**
 * Downloads a remote image and re-hosts it through the same storage
 * `saveUploadedFile` uses, returning our own stable URL (or null on any
 * failure — callers should treat that as "no photo" rather than falling
 * back to the original remote URL).
 *
 * Written for Google Place photo URLs specifically: the classic Places JS
 * library's `photos[0].getUrl()` (and the "new" Places API's photo `media`
 * endpoint) both hand back a URL carrying a short-lived signed token, not a
 * stable direct link — Google's own docs say not to persist it. Confirmed
 * live: pins saved from a Google list import showed a broken-image icon
 * once that token aged out, well before the user ever looked at the pin
 * again. Mirroring the actual bytes at save time — while the token is
 * still fresh, right after the browser resolved it — is what makes the
 * photo survive independently of Google's token lifetime.
 */
export async function mirrorRemoteImage(url: string, subfolder: string): Promise<string | null> {
  try {
    // Only ever called with Google place-photo URLs — refuse anything else rather than fetching arbitrary client-supplied hosts.
    const host = new URL(url).hostname;
    if (!/(^|\.)(googleusercontent\.com|googleapis\.com|ggpht\.com|gstatic\.com|cdninstagram\.com|fbcdn\.net|tiktokcdn(-us|-eu)?\.com|muscdn\.com)$/.test(host)) return null;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    if (!contentType.startsWith("image/")) return null;
    const blob = await res.blob();
    // 5MB is generous for a place photo and keeps one oversized response
    // from turning an import of many pins into a slow/expensive upload.
    if (blob.size === 0 || blob.size > 5 * 1024 * 1024) return null;
    const ext = contentType.split("/")[1]?.split(";")[0] || "jpg";
    const file = new File([blob], `photo.${ext}`, { type: contentType });
    return await saveUploadedFile(file, subfolder);
  } catch (err) {
    console.error(`mirrorRemoteImage failed for ${url}:`, err);
    return null;
  }
}
