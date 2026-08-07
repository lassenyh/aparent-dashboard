-- AlterTable
ALTER TABLE "DagsplanScheduleEntry" ADD COLUMN     "rowKind" TEXT NOT NULL DEFAULT 'sequential';

-- Første rad per dagsplan var tidligere implisitt anker
UPDATE "DagsplanScheduleEntry" e
SET "rowKind" = 'anchor'
WHERE e.id IN (
  SELECT id FROM (
    SELECT DISTINCT ON ("dagsplanId") id
    FROM "DagsplanScheduleEntry"
    ORDER BY "dagsplanId", "sortOrder" ASC
  ) first_rows
);
