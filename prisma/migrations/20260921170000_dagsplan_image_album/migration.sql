CREATE TABLE "DagsplanImageAsset" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DagsplanImageAsset_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "DagsplanScheduleEntry"
ADD COLUMN "shotImageAssetId" TEXT,
ADD COLUMN "shotImageZoom" DOUBLE PRECISION NOT NULL DEFAULT 1,
ADD COLUMN "shotImagePositionX" DOUBLE PRECISION NOT NULL DEFAULT 50,
ADD COLUMN "shotImagePositionY" DOUBLE PRECISION NOT NULL DEFAULT 50,
ADD COLUMN "shotImageFit" TEXT NOT NULL DEFAULT 'contain';

CREATE UNIQUE INDEX "DagsplanImageAsset_projectId_url_key" ON "DagsplanImageAsset"("projectId", "url");
CREATE INDEX "DagsplanImageAsset_projectId_createdAt_idx" ON "DagsplanImageAsset"("projectId", "createdAt");
CREATE INDEX "DagsplanScheduleEntry_shotImageAssetId_idx" ON "DagsplanScheduleEntry"("shotImageAssetId");

ALTER TABLE "DagsplanImageAsset" ADD CONSTRAINT "DagsplanImageAsset_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DagsplanScheduleEntry" ADD CONSTRAINT "DagsplanScheduleEntry_shotImageAssetId_fkey" FOREIGN KEY ("shotImageAssetId") REFERENCES "DagsplanImageAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "DagsplanImageAsset" ("id", "projectId", "url", "name", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text || d."projectId" || s."shotImageUrl"), d."projectId", s."shotImageUrl", 'Eksisterende dagsplanbilde', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "DagsplanScheduleEntry" s
JOIN "Dagsplan" d ON d."id" = s."dagsplanId"
WHERE s."shotImageUrl" IS NOT NULL AND btrim(s."shotImageUrl") <> ''
GROUP BY d."projectId", s."shotImageUrl";

UPDATE "DagsplanScheduleEntry" s
SET "shotImageAssetId" = a."id"
FROM "Dagsplan" d, "DagsplanImageAsset" a
WHERE d."id" = s."dagsplanId" AND a."projectId" = d."projectId" AND a."url" = s."shotImageUrl";
