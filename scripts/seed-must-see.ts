import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Name fragments matched case-insensitively against imported POI names to
// flag a destination's most iconic, unmissable landmarks.
const LANDMARKS: Record<string, string[]> = {
  italy: ["Colosseum", "Pantheon", "Trevi", "Vatican", "Duomo", "Pisa", "San Marco", "St Mark", "Ponte Vecchio", "Uffizi", "Piazza Navona"],
  japan: ["Fushimi Inari", "Senso-ji", "Sensoji", "Tokyo Tower", "Shibuya", "Fuji", "Kinkaku", "Osaka Castle", "Arashiyama", "Nara Park"],
  prague: ["Charles Bridge", "Prague Castle", "Old Town Square", "Astronomical Clock", "St Vitus", "Vitus Cathedral"],
  budapest: ["Parliament", "Fisherman", "Buda Castle", "Chain Bridge", "Szechenyi", "Széchenyi"],
  thailand: ["Grand Palace", "Wat Arun", "Wat Pho", "Chatuchak"],
  vietnam: ["Ha Long", "Hoan Kiem", "Old Quarter"],
  copenhagen: ["Little Mermaid", "Nyhavn", "Tivoli"],
};

const MAX_PER_DESTINATION = 8;

async function main() {
  for (const [slug, fragments] of Object.entries(LANDMARKS)) {
    const destination = await prisma.destination.findUnique({ where: { slug } });
    if (!destination) {
      console.log(`skip ${slug}: not found`);
      continue;
    }

    let flagged = 0;
    for (const fragment of fragments) {
      if (flagged >= MAX_PER_DESTINATION) break;
      const matches = await prisma.pointOfInterest.findMany({
        where: {
          category: { area: { destinationId: destination.id } },
          name: { contains: fragment, mode: "insensitive" },
        },
        take: 1,
      });
      if (matches.length === 0) {
        console.log(`  ${slug}: no match for "${fragment}"`);
        continue;
      }
      await prisma.pointOfInterest.update({ where: { id: matches[0].id }, data: { isMustSee: true } });
      flagged++;
      console.log(`  ${slug}: flagged "${matches[0].name}" for "${fragment}"`);
    }
    console.log(`${slug}: flagged ${flagged}/${fragments.length} landmarks`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
