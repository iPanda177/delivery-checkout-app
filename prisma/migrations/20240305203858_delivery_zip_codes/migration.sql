-- CreateTable
CREATE TABLE "DeliveryZipCodes" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "zipRangeStart" INTEGER NOT NULL,
    "zipRangeEnd" INTEGER NOT NULL,
    "etaDaysSmallParcelLow" INTEGER NOT NULL,
    "etaDaysSmallParcelHigh" INTEGER NOT NULL,
    "etaDaysFeightLow" INTEGER NOT NULL,
    "etaDaysFreightHigh" INTEGER NOT NULL,
    "requiresShippingSurcharge" BOOLEAN NOT NULL,
    "shippingSurchargePrice" TEXT NOT NULL
);
