import SunCalc from "suncalc";

/** Omtrentlig sentrum Oslo — brukes til automatisk soloppgang/solnedgang. */
const OSLO_LAT = 59.9139;
const OSLO_LON = 10.7522;

function getTimesForOsloDay(isoDateYyyyMmDd: string) {
  const parts = isoDateYyyyMmDd.trim().split("-").map(Number);
  const y = parts[0];
  const m = parts[1];
  const d = parts[2];
  if (!y || !m || !d) return null;
  const noonUtc = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return SunCalc.getTimes(noonUtc, OSLO_LAT, OSLO_LON);
}

function formatOsloTime(d: Date | undefined | null): string {
  if (!d || Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("nb-NO", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/Oslo",
  }).format(d);
}

/**
 * Soloppgang i Oslo som klokkeslett (Europe/Oslo) for kalenderdagen `YYYY-MM-DD`.
 */
export function formatOsloSunriseTime(isoDateYyyyMmDd: string): string {
  const times = getTimesForOsloDay(isoDateYyyyMmDd);
  if (!times) return "—";
  return formatOsloTime(times.sunrise);
}

/**
 * Solnedgang i Oslo som klokkeslett (Europe/Oslo) for kalenderdagen `YYYY-MM-DD`.
 */
export function formatOsloSunsetTime(isoDateYyyyMmDd: string): string {
  const times = getTimesForOsloDay(isoDateYyyyMmDd);
  if (!times) return "—";
  return formatOsloTime(times.sunset);
}

/**
 * Visningsverdi: manuell overstyring, ellers Oslo på opptaksdato.
 */
export function effectiveSunriseDisplay(
  shootDateIsoYyyyMmDd: string,
  sunriseTimeOverride: string | null | undefined,
): string {
  const manual = sunriseTimeOverride?.trim();
  if (manual) return manual;
  return formatOsloSunriseTime(shootDateIsoYyyyMmDd);
}

export function effectiveSunsetDisplay(
  shootDateIsoYyyyMmDd: string,
  sunsetTimeOverride: string | null | undefined,
): string {
  const manual = sunsetTimeOverride?.trim();
  if (manual) return manual;
  return formatOsloSunsetTime(shootDateIsoYyyyMmDd);
}
