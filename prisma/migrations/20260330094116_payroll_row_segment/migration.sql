-- CreateEnum
CREATE TYPE "PayrollRowSegment" AS ENUM ('crew', 'cast');

-- AlterTable
ALTER TABLE "PayrollRow" ADD COLUMN     "segment" "PayrollRowSegment" NOT NULL DEFAULT 'crew';

-- CreateIndex
CREATE INDEX "PayrollRow_payrollListId_segment_idx" ON "PayrollRow"("payrollListId", "segment");
