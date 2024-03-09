/*
  Warnings:

  - You are about to drop the column `etaDaysFeightLow` on the `DeliveryZipCodes` table. All the data in the column will be lost.
  - Added the required column `etaDaysFreightLow` to the `DeliveryZipCodes` table without a default value. This is not possible if the table is not empty.

*/
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
    "extendedAreaEligible" BOOLEAN NOT NULL DEFAULT true,
    "requiresShippingSurcharge" BOOLEAN NOT NULL DEFAULT true,
    "shippingSurchargePrice" REAL
);
INSERT INTO "new_DeliveryZipCodes" ("etaDaysFreightHigh", "etaDaysSmallParcelHigh", "etaDaysSmallParcelLow", "id", "requiresShippingSurcharge", "shippingSurchargePrice", "zipRangeEnd", "zipRangeStart") SELECT "etaDaysFreightHigh", "etaDaysSmallParcelHigh", "etaDaysSmallParcelLow", "id", "requiresShippingSurcharge", "shippingSurchargePrice", "zipRangeEnd", "zipRangeStart" FROM "DeliveryZipCodes";
DROP TABLE "DeliveryZipCodes";
ALTER TABLE "new_DeliveryZipCodes" RENAME TO "DeliveryZipCodes";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
