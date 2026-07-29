-- AlterTable
ALTER TABLE "TripLogistic" ADD COLUMN "imageUrl" TEXT;

-- CreateTable
CREATE TABLE "TripBudget" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "destinationId" TEXT NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ILS',
    "tripDays" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "TripBudget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TripBudget_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ItineraryItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itineraryDayId" TEXT NOT NULL,
    "poiId" TEXT,
    "customLabel" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    CONSTRAINT "ItineraryItem_itineraryDayId_fkey" FOREIGN KEY ("itineraryDayId") REFERENCES "ItineraryDay" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ItineraryItem_poiId_fkey" FOREIGN KEY ("poiId") REFERENCES "PointOfInterest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ItineraryItem" ("id", "itineraryDayId", "note", "order", "poiId") SELECT "id", "itineraryDayId", "note", "order", "poiId" FROM "ItineraryItem";
DROP TABLE "ItineraryItem";
ALTER TABLE "new_ItineraryItem" RENAME TO "ItineraryItem";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "TripBudget_userId_destinationId_key" ON "TripBudget"("userId", "destinationId");
