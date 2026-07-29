import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

/** Saves an uploaded File under public/uploads/<subfolder>/ and returns its public URL path. */
export async function saveUploadedFile(file: File, subfolder: string): Promise<string> {
  const bytes = Buffer.from(await file.arrayBuffer());
  const dir = path.join(process.cwd(), "public", "uploads", subfolder);
  await mkdir(dir, { recursive: true });

  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const fileName = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${safeName}`;
  await writeFile(path.join(dir, fileName), bytes);

  return `/uploads/${subfolder}/${fileName}`;
}
