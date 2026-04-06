import type { WeatherIconKind } from "@prisma/client";

export function formatDagsplanWeatherTempLine(
  min: number | null,
  max: number | null,
): string | null {
  if (min == null && max == null) return null;
  if (min != null && max != null) return `${min}° / ${max}°`;
  if (min != null) return `Lav ${min}°`;
  return `Høy ${max}°`;
}

/** True når vær-blokken har noe å vise (samme logikk som i kortet). */
export function hasDagsplanWeatherContent(props: {
  weatherIcon: WeatherIconKind;
  weatherTempMin: number | null;
  weatherTempMax: number | null;
  weatherText: string | null | undefined;
}): boolean {
  const text = props.weatherText?.trim() ?? "";
  const tempLine = formatDagsplanWeatherTempLine(
    props.weatherTempMin,
    props.weatherTempMax,
  );
  const showIcon = props.weatherIcon !== "none";
  return showIcon || !!tempLine || !!text;
}
