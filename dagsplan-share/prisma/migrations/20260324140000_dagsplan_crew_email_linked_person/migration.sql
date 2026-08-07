-- AlterTable
ALTER TABLE "DagsplanCrewEntry" ADD COLUMN "email" TEXT;
ALTER TABLE "DagsplanCrewEntry" ADD COLUMN "linkedPersonId" TEXT;

-- CreateIndex
CREATE INDEX "DagsplanCrewEntry_linkedPersonId_idx" ON "DagsplanCrewEntry"("linkedPersonId");

-- AddForeignKey
ALTER TABLE "DagsplanCrewEntry" ADD CONSTRAINT "DagsplanCrewEntry_linkedPersonId_fkey" FOREIGN KEY ("linkedPersonId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;
