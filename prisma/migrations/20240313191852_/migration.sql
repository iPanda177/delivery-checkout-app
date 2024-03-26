/*
  Warnings:

  - You are about to drop the column `requiresShippingSurcharge` on the `DeliveryZipCodes` table. All the data in the column will be lost.
  - You are about to drop the column `shippingSurchargePrice` on the `DeliveryZipCodes` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "AddOnProduct" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "productHandle" TEXT NOT NULL,
    "productImgURL" TEXT NOT NULL,
    "deliveryZipCodesId" INTEGER,
    CONSTRAINT "AddOnProduct_deliveryZipCodesId_fkey" FOREIGN KEY ("deliveryZipCodesId") REFERENCES "DeliveryZipCodes" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DeliveryZipCodes" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "zipRangeStart" INTEGER NOT NULL,
    "zipRangeEnd" INTEGER NOT NULL,
    "etaDaysSmallParcelLow" INTEGER NOT NULL,
    "etaDaysSmallParcelHigh" INTEGER NOT NULL,
    "etaDaysFreightLow" INTEGER NOT NULL,
    "etaDaysFreightHigh" INTEGER NOT NULL,
    "extendedAreaEligible" BOOLEAN NOT NULL DEFAULT true
);
INSERT INTO "new_DeliveryZipCodes" ("etaDaysFreightHigh", "etaDaysFreightLow", "etaDaysSmallParcelHigh", "etaDaysSmallParcelLow", "extendedAreaEligible", "id", "zipRangeEnd", "zipRangeStart") SELECT "etaDaysFreightHigh", "etaDaysFreightLow", "etaDaysSmallParcelHigh", "etaDaysSmallParcelLow", "extendedAreaEligible", "id", "zipRangeEnd", "zipRangeStart" FROM "DeliveryZipCodes";
DROP TABLE "DeliveryZipCodes";
ALTER TABLE "new_DeliveryZipCodes" RENAME TO "DeliveryZipCodes";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
