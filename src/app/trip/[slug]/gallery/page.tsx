import { notFound } from "next/navigation";
import { getDestinationBySlug } from "@/lib/data/destinations";
import { prisma } from "@/lib/prisma";

export default async function GalleryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const destination = await getDestinationBySlug(slug);
  if (!destination) notFound();

  const photos = await prisma.poiPhoto.findMany({
    where: { poi: { category: { area: { destinationId: destination.id } } } },
    include: { poi: true },
    take: 120,
  });

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold" style={{ fontFamily: "var(--font-heading)" }}>
        🖼️ גלריית תמונות
      </h1>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {photos.map((photo) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={photo.id}
            src={photo.url}
            alt={photo.poi.name}
            className="aspect-square w-full object-cover"
            style={{ borderRadius: "var(--radius)" }}
            loading="lazy"
          />
        ))}
      </div>
    </div>
  );
}
