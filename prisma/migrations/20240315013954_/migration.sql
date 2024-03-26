/*
  Warnings:

  - You are about to drop the `Zip Code Rules` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_LocationIdToZipCodeRule` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Zip Code Rules";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "_LocationIdToZipCodeRule";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "Shipping Rules" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ruleName" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "zipRangeStart" TEXT NOT NULL,
    "zipRangeEnd" TEXT NOT NULL,
    "etaDaysSmallParcelLow" INTEGER NOT NULL,
    "etaDaysSmallParcelHigh" INTEGER NOT NULL,
    "etaDaysFreightLow" INTEGER NOT NULL,
    "etaDaysFreightHigh" INTEGER NOT NULL,
    "extendedAreaEligible" BOOLEAN NOT NULL DEFAULT true,
    "addOnProductId" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_LocationIdToShippingRule" (
    "A" TEXT NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_LocationIdToShippingRule_A_fkey" FOREIGN KEY ("A") REFERENCES "LocationId" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_LocationIdToShippingRule_B_fkey" FOREIGN KEY ("B") REFERENCES "Shipping Rules" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "_LocationIdToShippingRule_AB_unique" ON "_LocationIdToShippingRule"("A", "B");

-- CreateIndex
CREATE INDEX "_LocationIdToShippingRule_B_index" ON "_LocationIdToShippingRule"("B");
