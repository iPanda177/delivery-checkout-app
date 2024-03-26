/*
  Warnings:

  - You are about to drop the `AddOnProduct` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `addOnProductId` to the `Zip Code Rules` table without a default value. This is not possible if the table is not empty.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "AddOnProduct";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "LocationId" (
    "id" TEXT NOT NULL PRIMARY KEY
);

-- CreateTable
CREATE TABLE "_LocationIdToZipCodeRule" (
    "A" TEXT NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_LocationIdToZipCodeRule_A_fkey" FOREIGN KEY ("A") REFERENCES "LocationId" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_LocationIdToZipCodeRule_B_fkey" FOREIGN KEY ("B") REFERENCES "Zip Code Rules" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Zip Code Rules" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "zipRangeStart" TEXT NOT NULL,
    "zipRangeEnd" TEXT NOT NULL,
    "etaDaysSmallParcelLow" INTEGER NOT NULL,
    "etaDaysSmallParcelHigh" INTEGER NOT NULL,
    "etaDaysFreightLow" INTEGER NOT NULL,
    "etaDaysFreightHigh" INTEGER NOT NULL,
    "extendedAreaEligible" BOOLEAN NOT NULL DEFAULT true,
    "addOnProductId" TEXT NOT NULL
);
INSERT INTO "new_Zip Code Rules" ("etaDaysFreightHigh", "etaDaysFreightLow", "etaDaysSmallParcelHigh", "etaDaysSmallParcelLow", "extendedAreaEligible", "id", "zipRangeEnd", "zipRangeStart") SELECT "etaDaysFreightHigh", "etaDaysFreightLow", "etaDaysSmallParcelHigh", "etaDaysSmallParcelLow", "extendedAreaEligible", "id", "zipRangeEnd", "zipRangeStart" FROM "Zip Code Rules";
DROP TABLE "Zip Code Rules";
ALTER TABLE "new_Zip Code Rules" RENAME TO "Zip Code Rules";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

-- CreateIndex
CREATE UNIQUE INDEX "LocationId_id_key" ON "LocationId"("id");

-- CreateIndex
CREATE UNIQUE INDEX "_LocationIdToZipCodeRule_AB_unique" ON "_LocationIdToZipCodeRule"("A", "B");

-- CreateIndex
CREATE INDEX "_LocationIdToZipCodeRule_B_index" ON "_LocationIdToZipCodeRule"("B");
