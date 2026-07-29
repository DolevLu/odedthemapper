import { prisma } from "../src/lib/prisma";
async function main() {
  const imports = await prisma.kmlImport.findMany({ include: { destination: { select: { slug: true } } } });
  console.log(`KML imports so far: ${imports.length}`);
  console.log(imports.map((i) => i.destination.slug).join(", "));
  const poiCount = await prisma.pointOfInterest.count();
  console.log(`Total POIs: ${poiCount}`);
}
main().finally(() => prisma.$disconnect());
