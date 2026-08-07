ALTER TABLE "Dagsplan" ADD COLUMN "showShotColumn" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DagsplanScheduleEntry" ADD COLUMN "shotImageUrl" TEXT;
