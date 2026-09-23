import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Serves a curated point's linked Google Place photo (see PointOfInterest.
 * googlePhotoRef) from a stable same-origin URL, cached hard at the edge.
 *
 * Why a proxy instead of storing a Google photo URL: the URLs Google hands
 * out (the JS library's getUrl(), the Photo endpoint with a key) either carry
 * a short-lived signed token or bill per view — persisted, they break into a
 * red-X icon (confirmed on saved pins). Here the DB keeps only the photo
 * reference, this route fetches the real bytes once, and Vercel's CDN caches
 * the response for a year, so Google is hit once per point rather than once
 * per viewer. If a reference ever stops working (Google says they can
 * expire), it's re-resolved from the point's place id and re-saved, so the
 * image heals itself instead of staying broken. */
export async function GET(_req: Request, { params }: { params: Promise<{ poiId: string }> }) {
  const { poiId } = await params;
  const poi = await prisma.pointOfInterest.findUnique({
    where: { id: poiId },
    select: { googlePlaceId: true, googlePhotoRef: true },
  });
  const apiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!poi || !apiKey || (!poi.googlePhotoRef && !poi.googlePlaceId)) return new NextResponse("Not found", { status: 404 });

  async function fetchPhoto(ref: string): Promise<Response | null> {
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${encodeURIComponent(ref)}&key=${apiKey}`
      );
      const type = res.headers.get("content-type") ?? "";
      return res.ok && type.startsWith("image/") ? res : null;
    } catch {
      return null;
    }
  }

  let upstream = poi.googlePhotoRef ? await fetchPhoto(poi.googlePhotoRef) : null;

  if (!upstream && poi.googlePlaceId) {
    try {
      const detailsRes = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(poi.googlePlaceId)}&fields=photo&key=${apiKey}`
      );
      const details = await detailsRes.json();
      const freshRef = details?.result?.photos?.[0]?.photo_reference as string | undefined;
      if (freshRef) {
        upstream = await fetchPhoto(freshRef);
        if (upstream) await prisma.pointOfInterest.update({ where: { id: poiId }, data: { googlePhotoRef: freshRef } });
      }
    } catch {
      // fall through to 404
    }
  }

  if (!upstream) return new NextResponse("Photo unavailable", { status: 404 });

  return new NextResponse(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "image/jpeg",
      "Cache-Control": "public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=86400, immutable",
    },
  });
}
