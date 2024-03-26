/*
  Warnings:

  - You are about to drop the `_LocationIdToShippingRule` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "_LocationIdToShippingRule";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "_LocationIdToShippingRules" (
    "A" TEXT NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_LocationIdToShippingRules_A_fkey" FOREIGN KEY ("A") REFERENCES "LocationId" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_LocationIdToShippingRules_B_fkey" FOREIGN KEY ("B") REFERENCES "Shipping Rules" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "_LocationIdToShippingRules_AB_unique" ON "_LocationIdToShippingRules"("A", "B");

-- CreateIndex
CREATE INDEX "_LocationIdToShippingRules_B_index" ON "_LocationIdToShippingRules"("B");
