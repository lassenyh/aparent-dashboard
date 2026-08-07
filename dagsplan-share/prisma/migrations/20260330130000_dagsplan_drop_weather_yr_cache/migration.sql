-- Skjemaet bruker ikke lenger Yr-URL / forecast-cache på Dagsplan (kun manuelt vær).
-- Fjerner kolonner som ble lagt til i 20260327000000_weather_yr.
ALTER TABLE "Dagsplan" DROP COLUMN IF EXISTS "weatherYrUrl";
ALTER TABLE "Dagsplan" DROP COLUMN IF EXISTS "weatherForecastCache";
