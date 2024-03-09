/*
  Warnings:

  - You are about to alter the column `shippingSurchargePrice` on the `DeliveryZipCodes` table. The data in that column could be lost. The data in that column will be cast from `String` to `Float`.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DeliveryZipCodes" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "zipRangeStart" INTEGER NOT NULL,
    "zipRangeEnd" INTEGER NOT NULL,
    "etaDaysSmallParcelLow" INTEGER NOT NULL,
    "etaDaysSmallParcelHigh" INTEGER NOT NULL,
    "etaDaysFeightLow" INTEGER NOT NULL,
    "etaDaysFreightHigh" INTEGER NOT NULL,
    "requiresShippingSurcharge" BOOLEAN NOT NULL DEFAULT false,
    "shippingSurchargePrice" REAL NOT NULL
);
INSERT INTO "new_DeliveryZipCodes" ("etaDaysFeightLow", "etaDaysFreightHigh", "etaDaysSmallParcelHigh", "etaDaysSmallParcelLow", "id", "requiresShippingSurcharge", "shippingSurchargePrice", "zipRangeEnd", "zipRangeStart") SELECT "etaDaysFeightLow", "etaDaysFreightHigh", "etaDaysSmallParcelHigh", "etaDaysSmallParcelLow", "id", "requiresShippingSurcharge", "shippingSurchargePrice", "zipRangeEnd", "zipRangeStart" FROM "DeliveryZipCodes";
DROP TABLE "DeliveryZipCodes";
ALTER TABLE "new_DeliveryZipCodes" RENAME TO "DeliveryZipCodes";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
