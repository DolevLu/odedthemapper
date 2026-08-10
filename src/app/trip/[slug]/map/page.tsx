import { redirect } from "next/navigation";

// The map is now the trip's home screen — old bookmarks/links to /map still work.
export default async function TripMapPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`/trip/${slug}`);
}
