-- AlterTable
ALTER TABLE "Dagsplan" ADD COLUMN IF NOT EXISTS "weatherYrUrl" TEXT;
ALTER TABLE "Dagsplan" ADD COLUMN IF NOT EXISTS "weatherForecastCache" TEXT;
