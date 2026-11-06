import SunCalc from "suncalc";

/** Omtrentlig sentrum Oslo — fallback når dagsplanen ikke har en værlokasjon. */
const OSLO_LAT = 59.9139;
const OSLO_LON = 10.7522;

function validCoordinate(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function getTimesForDay(
  isoDateYyyyMmDd: string,
  latitude?: number | null,
  longitude?: number | null,
) {
  const parts = isoDateYyyyMmDd.trim().split("-").map(Number);
  const y = parts[0];
  const m = parts[1];
  const d = parts[2];
  if (!y || !m || !d) return null;
  const noonUtc = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return SunCalc.getTimes(
    noonUtc,
    validCoordinate(latitude) ? latitude : OSLO_LAT,
    validCoordinate(longitude) ? longitude : OSLO_LON,
  );
}

function formatSunTime(d: Date | undefined | null): string {
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
  const times = getTimesForDay(isoDateYyyyMmDd);
  if (!times) return "—";
  return formatSunTime(times.sunrise);
}

/**
 * Solnedgang i Oslo som klokkeslett (Europe/Oslo) for kalenderdagen `YYYY-MM-DD`.
 */
export function formatOsloSunsetTime(isoDateYyyyMmDd: string): string {
  const times = getTimesForDay(isoDateYyyyMmDd);
  if (!times) return "—";
  return formatSunTime(times.sunset);
}

export function formatSunriseTime(
  isoDateYyyyMmDd: string,
  latitude?: number | null,
  longitude?: number | null,
): string {
  const times = getTimesForDay(isoDateYyyyMmDd, latitude, longitude);
  if (!times) return "—";
  return formatSunTime(times.sunrise);
}

export function formatSunsetTime(
  isoDateYyyyMmDd: string,
  latitude?: number | null,
  longitude?: number | null,
): string {
  const times = getTimesForDay(isoDateYyyyMmDd, latitude, longitude);
  if (!times) return "—";
  return formatSunTime(times.sunset);
}

/**
 * Visningsverdi: manuell overstyring, ellers Oslo på opptaksdato.
 */
export function effectiveSunriseDisplay(
  shootDateIsoYyyyMmDd: string,
  sunriseTimeOverride: string | null | undefined,
  latitude?: number | null,
  longitude?: number | null,
): string {
  const manual = sunriseTimeOverride?.trim();
  if (manual) return manual;
  return formatSunriseTime(shootDateIsoYyyyMmDd, latitude, longitude);
}

export function effectiveSunsetDisplay(
  shootDateIsoYyyyMmDd: string,
  sunsetTimeOverride: string | null | undefined,
  latitude?: number | null,
  longitude?: number | null,
): string {
  const manual = sunsetTimeOverride?.trim();
  if (manual) return manual;
  return formatSunsetTime(shootDateIsoYyyyMmDd, latitude, longitude);
}
