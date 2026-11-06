import type { WeatherIconKind } from "@prisma/client";

type MetPeriod = {
  summary?: { symbol_code?: string };
  details?: {
    air_temperature_min?: number;
    air_temperature_max?: number;
  };
};

export type MetForecastItem = {
  time: string;
  data: {
    instant?: { details?: { air_temperature?: number } };
    next_1_hours?: MetPeriod;
    next_6_hours?: MetPeriod;
    next_12_hours?: MetPeriod;
  };
};

export type DagsplanWeatherForecast = {
  weatherIcon: WeatherIconKind;
  weatherTempMin: number;
  weatherTempMax: number;
  weatherSuggestion: string;
  symbolCode: string | null;
};

const OSLO_TIME_ZONE = "Europe/Oslo";

function localParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: OSLO_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    dateKey: `${values.year}-${values.month}-${values.day}`,
    minuteOfDay: Number(values.hour) * 60 + Number(values.minute),
  };
}

function parseTimeMinutes(value: string | null | undefined): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value?.trim() ?? "");
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
}

export function representativeMinute(
  workStartTime: string | null | undefined,
  workEndTime: string | null | undefined,
): number {
  const start = parseTimeMinutes(workStartTime);
  const end = parseTimeMinutes(workEndTime);
  if (start == null || end == null) return 12 * 60;
  const adjustedEnd = end < start ? end + 24 * 60 : end;
  return Math.round((start + adjustedEnd) / 2) % (24 * 60);
}

function normalizeSymbol(symbolCode: string): string {
  return symbolCode.replace(/_(day|night|polartwilight)$/, "");
}

export function mapMetSymbol(
  symbolCode: string | null,
  locale: "no" | "en",
): { icon: WeatherIconKind; label: string } {
  const code = normalizeSymbol(symbolCode ?? "");
  const no = locale === "no";

  if (code.includes("thunder")) {
    return { icon: "thunder", label: no ? "Torden" : "Thunderstorms" };
  }
  if (code.includes("sleet")) {
    return { icon: "snow", label: no ? "Sludd" : "Sleet" };
  }
  if (code.includes("snowshowers")) {
    return { icon: "snow", label: no ? "Snøbyger" : "Snow showers" };
  }
  if (code.includes("snow")) {
    return { icon: "snow", label: no ? "Snø" : "Snow" };
  }
  if (code.includes("rainshowers")) {
    return { icon: "rain", label: no ? "Regnbyger" : "Rain showers" };
  }
  if (code.includes("rain") || code.includes("drizzle")) {
    return { icon: "rain", label: no ? "Regn" : "Rain" };
  }
  if (code.includes("fog")) {
    return { icon: "fog", label: no ? "Tåke" : "Fog" };
  }
  if (code.includes("partlycloudy") || code.includes("fair")) {
    return {
      icon: "partly_cloudy",
      label: no ? "Delvis skyet" : "Partly cloudy",
    };
  }
  if (code.includes("cloudy")) {
    return { icon: "cloudy", label: no ? "Overskyet" : "Cloudy" };
  }
  if (code.includes("clearsky")) {
    return { icon: "sun", label: no ? "Klarvær" : "Clear sky" };
  }
  return { icon: "none", label: no ? "Værvarsel" : "Weather forecast" };
}

function symbolForItem(item: MetForecastItem): string | null {
  return (
    item.data.next_1_hours?.summary?.symbol_code ??
    item.data.next_6_hours?.summary?.symbol_code ??
    item.data.next_12_hours?.summary?.symbol_code ??
    null
  );
}

type WeatherSample = {
  minuteOfDay: number;
  symbolCode: string;
};

function weatherSeverity(symbolCode: string): number {
  const icon = mapMetSymbol(symbolCode, "no").icon;
  return {
    none: 0,
    sun: 1,
    partly_cloudy: 2,
    cloudy: 3,
    fog: 4,
    wind: 4,
    rain: 5,
    snow: 6,
    thunder: 7,
  }[icon];
}

function dominantSymbol(samples: WeatherSample[]): string | null {
  const counts = new Map<string, { count: number; original: string }>();
  for (const sample of samples) {
    const normalized = normalizeSymbol(sample.symbolCode);
    const current = counts.get(normalized);
    counts.set(normalized, {
      count: (current?.count ?? 0) + 1,
      original: current?.original ?? sample.symbolCode,
    });
  }

  return (
    [...counts.values()].sort(
      (a, b) =>
        b.count - a.count ||
        weatherSeverity(b.original) - weatherSeverity(a.original),
    )[0]?.original ?? null
  );
}

function lowerFirst(value: string): string {
  return value ? value[0].toLocaleLowerCase() + value.slice(1) : value;
}

function summarizeWeatherSamples(
  samples: WeatherSample[],
  locale: "no" | "en",
): string | null {
  if (samples.length === 0) return null;

  const periods = [
    {
      from: 0,
      to: 6 * 60,
      no: "om natten",
      en: "overnight",
    },
    {
      from: 6 * 60,
      to: 12 * 60,
      no: "om morgenen",
      en: "in the morning",
    },
    {
      from: 12 * 60,
      to: 18 * 60,
      no: "på ettermiddagen",
      en: "in the afternoon",
    },
    {
      from: 18 * 60,
      to: 24 * 60,
      no: "om kvelden",
      en: "in the evening",
    },
  ] as const;

  const summaries = periods.flatMap((period) => {
    const symbolCode = dominantSymbol(
      samples.filter(
        (sample) =>
          sample.minuteOfDay >= period.from && sample.minuteOfDay < period.to,
      ),
    );
    if (!symbolCode) return [];
    return [{
      symbolCode,
      label: mapMetSymbol(symbolCode, locale).label,
      period: locale === "no" ? period.no : period.en,
    }];
  });
  if (summaries.length === 0) return null;

  const uniqueSymbols = new Set(
    summaries.map((summary) => normalizeSymbol(summary.symbolCode)),
  );
  if (uniqueSymbols.size === 1 && summaries.length > 1) {
    const label = lowerFirst(summaries[0].label);
    return locale === "no"
      ? `Stort sett ${label} gjennom dagen.`
      : `Mostly ${label} throughout the day.`;
  }

  const phrases = summaries.map((summary, index) => {
    const label = index === 0 ? summary.label : lowerFirst(summary.label);
    return `${label} ${summary.period}`;
  });
  const finalPhrase = phrases.pop();
  if (!finalPhrase) return null;
  const joined =
    phrases.length === 0
      ? finalPhrase
      : `${phrases.join(", ")} ${locale === "no" ? "og" : "and"} ${lowerFirst(finalPhrase)}`;
  return `${joined}.`;
}

export function summarizeMetForecast(
  items: MetForecastItem[],
  targetDate: string,
  locale: "no" | "en",
  workStartTime?: string | null,
  workEndTime?: string | null,
): DagsplanWeatherForecast | null {
  const dayItems = items.flatMap((item) => {
    const date = new Date(item.time);
    if (Number.isNaN(date.getTime())) return [];
    const local = localParts(date);
    return local.dateKey === targetDate ? [{ item, date, local }] : [];
  });
  if (dayItems.length === 0) return null;

  const temperatures: number[] = [];
  for (const { item, date } of dayItems) {
    const instant = item.data.instant?.details?.air_temperature;
    if (Number.isFinite(instant)) temperatures.push(instant as number);

    const sixHours = item.data.next_6_hours?.details;
    const periodEnd = new Date(date.getTime() + 6 * 60 * 60 * 1000);
    if (sixHours && localParts(new Date(periodEnd.getTime() - 1)).dateKey === targetDate) {
      if (Number.isFinite(sixHours.air_temperature_min)) {
        temperatures.push(sixHours.air_temperature_min as number);
      }
      if (Number.isFinite(sixHours.air_temperature_max)) {
        temperatures.push(sixHours.air_temperature_max as number);
      }
    }
  }
  if (temperatures.length === 0) return null;

  const targetMinute = representativeMinute(workStartTime, workEndTime);
  const workStartMinute = parseTimeMinutes(workStartTime) ?? 6 * 60;
  const workEndMinute = parseTimeMinutes(workEndTime) ?? 22 * 60;
  const weatherSamples = dayItems.flatMap(({ item, local }) => {
    const symbolCode = symbolForItem(item);
    if (!symbolCode) return [];
    const insideWorkPeriod =
      workEndMinute >= workStartMinute
        ? local.minuteOfDay >= workStartMinute &&
          local.minuteOfDay <= workEndMinute
        : local.minuteOfDay >= workStartMinute ||
          local.minuteOfDay <= workEndMinute;
    return insideWorkPeriod
      ? [{ minuteOfDay: local.minuteOfDay, symbolCode }]
      : [];
  });
  const symbolItem = dayItems
    .filter(({ item }) => symbolForItem(item) != null)
    .sort(
      (a, b) =>
        Math.abs(a.local.minuteOfDay - targetMinute) -
        Math.abs(b.local.minuteOfDay - targetMinute),
    )[0];
  const symbolCode = symbolItem ? symbolForItem(symbolItem.item) : null;
  const mapped = mapMetSymbol(symbolCode, locale);
  const weatherTempMin = Math.floor(Math.min(...temperatures));
  const weatherTempMax = Math.ceil(Math.max(...temperatures));
  const daySummary = summarizeWeatherSamples(weatherSamples, locale);
  const weatherSuggestion =
    locale === "no"
      ? `${daySummary ?? `${mapped.label}.`} Temperatur ${weatherTempMin}–${weatherTempMax} °C.`
      : `${daySummary ?? `${mapped.label}.`} Temperature ${weatherTempMin}–${weatherTempMax} °C.`;

  return {
    weatherIcon: mapped.icon,
    weatherTempMin,
    weatherTempMax,
    weatherSuggestion,
    symbolCode,
  };
}
