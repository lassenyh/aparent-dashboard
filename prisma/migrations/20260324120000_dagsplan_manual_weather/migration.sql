-- CreateEnum
CREATE TYPE "WeatherIconKind" AS ENUM ('none', 'sun', 'partly_cloudy', 'cloudy', 'rain', 'snow', 'thunder', 'fog', 'wind');

-- AlterTable
ALTER TABLE "Dagsplan" DROP COLUMN IF EXISTS "weatherYrUrl";
ALTER TABLE "Dagsplan" DROP COLUMN IF EXISTS "weatherForecastCache";

ALTER TABLE "Dagsplan" ADD COLUMN "weatherIcon" "WeatherIconKind" NOT NULL DEFAULT 'none';
ALTER TABLE "Dagsplan" ADD COLUMN "weatherTempMin" INTEGER;
ALTER TABLE "Dagsplan" ADD COLUMN "weatherTempMax" INTEGER;
