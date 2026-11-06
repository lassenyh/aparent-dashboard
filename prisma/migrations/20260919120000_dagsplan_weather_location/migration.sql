ALTER TABLE "Dagsplan"
ADD COLUMN "weatherLocationName" TEXT,
ADD COLUMN "weatherLatitude" DOUBLE PRECISION,
ADD COLUMN "weatherLongitude" DOUBLE PRECISION,
ADD COLUMN "weatherFromMet" BOOLEAN NOT NULL DEFAULT false;
