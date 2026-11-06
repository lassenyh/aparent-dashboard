ALTER TABLE "Dagsplan"
ADD COLUMN "showInteriorExteriorColumn" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "showDayNightColumn" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "showActorColumn" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "showCostumeColumn" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "DagsplanScheduleEntry"
ADD COLUMN "setting" TEXT,
ADD COLUMN "costume" TEXT;
