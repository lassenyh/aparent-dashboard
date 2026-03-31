-- One-time upgrade for databases that still have location/parking columns on "Dagsplan"
-- (typisk etter kun `db push` før locations-endringen).
-- Kjør i Neon SQL Editor KUN hvis "DagsplanLocation" ikke finnes eller "Dagsplan" fortsatt har "locationText".
-- Etterpå: npx prisma migrate resolve --applied "20260101000000_init"

CREATE TABLE IF NOT EXISTS "DagsplanLocation" (
    "id" TEXT NOT NULL,
    "dagsplanId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "locationText" TEXT,
    "locationMapsUrl" TEXT,
    "parkingText" TEXT,
    "parkingMapsUrl" TEXT,
    "parkingImageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DagsplanLocation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DagsplanLocation_dagsplanId_idx" ON "DagsplanLocation"("dagsplanId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'DagsplanLocation_dagsplanId_fkey'
  ) THEN
    ALTER TABLE "DagsplanLocation"
      ADD CONSTRAINT "DagsplanLocation_dagsplanId_fkey"
      FOREIGN KEY ("dagsplanId") REFERENCES "Dagsplan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Flytt data og fjern gamle kolonner bare hvis de finnes
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Dagsplan' AND column_name = 'locationText'
  ) THEN
    INSERT INTO "DagsplanLocation" (
      "id", "dagsplanId", "sortOrder",
      "locationText", "locationMapsUrl", "parkingText", "parkingMapsUrl", "parkingImageUrl",
      "createdAt", "updatedAt"
    )
    SELECT
      gen_random_uuid()::text,
      d."id",
      0,
      d."locationText",
      d."locationMapsUrl",
      d."parkingText",
      d."parkingMapsUrl",
      d."parkingImageUrl",
      NOW(),
      NOW()
    FROM "Dagsplan" d
    WHERE NOT EXISTS (
      SELECT 1 FROM "DagsplanLocation" l WHERE l."dagsplanId" = d."id"
    );

    ALTER TABLE "Dagsplan" DROP COLUMN IF EXISTS "locationText";
    ALTER TABLE "Dagsplan" DROP COLUMN IF EXISTS "locationMapsUrl";
    ALTER TABLE "Dagsplan" DROP COLUMN IF EXISTS "parkingText";
    ALTER TABLE "Dagsplan" DROP COLUMN IF EXISTS "parkingMapsUrl";
    ALTER TABLE "Dagsplan" DROP COLUMN IF EXISTS "parkingImageUrl";
  END IF;
END $$;
