import { redirect } from "next/navigation";

// The marketing/preview funnel is retired — free browsing straight into
// /trip/[slug] (with tiered locks) now serves as the preview.
export default async function DestinationRedirect({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`/trip/${slug}`);
}
