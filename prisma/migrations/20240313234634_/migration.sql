/*
  Warnings:

  - You are about to drop the `DeliveryZipCodes` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "DeliveryZipCodes";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "Zip Code Rules" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "zipRangeStart" INTEGER NOT NULL,
    "zipRangeEnd" INTEGER NOT NULL,
    "etaDaysSmallParcelLow" INTEGER NOT NULL,
    "etaDaysSmallParcelHigh" INTEGER NOT NULL,
    "etaDaysFreightLow" INTEGER NOT NULL,
    "etaDaysFreightHigh" INTEGER NOT NULL,
    "extendedAreaEligible" BOOLEAN NOT NULL DEFAULT true
);

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AddOnProduct" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "productHandle" TEXT NOT NULL,
    "productImgURL" TEXT NOT NULL,
    "deliveryZipCodesId" INTEGER,
    CONSTRAINT "AddOnProduct_deliveryZipCodesId_fkey" FOREIGN KEY ("deliveryZipCodesId") REFERENCES "Zip Code Rules" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_AddOnProduct" ("deliveryZipCodesId", "id", "productHandle", "productId", "productImgURL") SELECT "deliveryZipCodesId", "id", "productHandle", "productId", "productImgURL" FROM "AddOnProduct";
DROP TABLE "AddOnProduct";
ALTER TABLE "new_AddOnProduct" RENAME TO "AddOnProduct";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
