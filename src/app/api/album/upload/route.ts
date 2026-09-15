import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { auth } from "@/auth";

// Client-direct-to-Blob upload endpoint for the album — the album's own
// upload form used to send the file bytes through a plain Server Action
// (uploadAlbumMedia), which routes through the request body of a Vercel
// serverless function. Next.js's own bodySizeLimit config (50mb here) has
// no effect on Vercel's separate, non-configurable platform-level payload
// limit for serverless functions (~4.5MB) — a real phone photo or video
// clears that easily and the whole request fails hard, reading as "the
// site crashed" rather than a graceful upload error. This route only ever
// issues a short-lived upload token; the file itself goes straight from
// the browser to Blob storage and never touches this server's body at all.
export async function POST(request: Request): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "יש להתחבר" }, { status: 401 });
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ["image/*", "video/*"],
        // Generous for a real phone video (a plain <input accept> already
        // steers toward images/video, this just keeps a very oversized
        // upload from silently eating storage).
        maximumSizeInBytes: 200 * 1024 * 1024,
        addRandomSuffix: true,
      }),
      // Not used: onUploadCompleted is a webhook Vercel's own infrastructure
      // calls after the fact, which needs a publicly reachable URL and
      // never fires against localhost in dev. The AlbumMedia row is created
      // directly by the client instead, right after upload() resolves with
      // the real blob URL (see recordAlbumMedia in lib/actions/album.ts) —
      // works identically in dev and production.
    });
    return NextResponse.json(jsonResponse);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
