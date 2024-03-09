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
    "shippingSurchargePrice" REAL
);
INSERT INTO "new_DeliveryZipCodes" ("etaDaysFeightLow", "etaDaysFreightHigh", "etaDaysSmallParcelHigh", "etaDaysSmallParcelLow", "id", "requiresShippingSurcharge", "shippingSurchargePrice", "zipRangeEnd", "zipRangeStart") SELECT "etaDaysFeightLow", "etaDaysFreightHigh", "etaDaysSmallParcelHigh", "etaDaysSmallParcelLow", "id", "requiresShippingSurcharge", "shippingSurchargePrice", "zipRangeEnd", "zipRangeStart" FROM "DeliveryZipCodes";
DROP TABLE "DeliveryZipCodes";
ALTER TABLE "new_DeliveryZipCodes" RENAME TO "DeliveryZipCodes";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
