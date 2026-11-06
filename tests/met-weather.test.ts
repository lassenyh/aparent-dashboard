import assert from "node:assert/strict";
import test from "node:test";
import {
  mapMetSymbol,
  representativeMinute,
  summarizeMetForecast,
  type MetForecastItem,
} from "../src/lib/met-weather";

test("maps MET symbol codes to the existing dagsplan icon set", () => {
  assert.deepEqual(mapMetSymbol("partlycloudy_day", "no"), {
    icon: "partly_cloudy",
    label: "Delvis skyet",
  });
  assert.equal(mapMetSymbol("heavyrainandthunder", "no").icon, "thunder");
  assert.equal(mapMetSymbol("lightsleet", "en").icon, "snow");
  assert.equal(mapMetSymbol("fog", "en").label, "Fog");
});

test("uses the midpoint of the working day for the representative symbol", () => {
  assert.equal(representativeMinute("08:00", "18:00"), 13 * 60);
  assert.equal(representativeMinute("20:00", "02:00"), 23 * 60);
  assert.equal(representativeMinute("", ""), 12 * 60);
});

test("summarizes temperatures and the closest weather symbol for the shoot day", () => {
  const items: MetForecastItem[] = [
    {
      time: "2026-09-22T06:00:00Z",
      data: {
        instant: { details: { air_temperature: 4.2 } },
        next_6_hours: {
          summary: { symbol_code: "cloudy" },
          details: { air_temperature_min: 3.6, air_temperature_max: 10.2 },
        },
      },
    },
    {
      time: "2026-09-22T10:00:00Z",
      data: {
        instant: { details: { air_temperature: 9.1 } },
        next_1_hours: { summary: { symbol_code: "rainshowers_day" } },
      },
    },
    {
      time: "2026-09-22T14:00:00Z",
      data: {
        instant: { details: { air_temperature: 7 } },
        next_1_hours: { summary: { symbol_code: "partlycloudy_day" } },
      },
    },
  ];

  assert.deepEqual(
    summarizeMetForecast(items, "2026-09-22", "no", "08:00", "18:00"),
    {
      weatherIcon: "rain",
      weatherTempMin: 3,
      weatherTempMax: 11,
      weatherSuggestion:
        "Overskyet om morgenen og regnbyger på ettermiddagen. Temperatur 3–11 °C.",
      symbolCode: "rainshowers_day",
    },
  );
});

test("summarizes stable weather across the working day", () => {
  const items: MetForecastItem[] = [
    "2026-09-22T05:00:00Z",
    "2026-09-22T11:00:00Z",
    "2026-09-22T17:00:00Z",
  ].map((time, index) => ({
    time,
    data: {
      instant: { details: { air_temperature: 8 + index } },
      next_1_hours: { summary: { symbol_code: "cloudy" } },
    },
  }));

  const result = summarizeMetForecast(items, "2026-09-22", "no");
  assert.equal(
    result?.weatherSuggestion,
    "Stort sett overskyet gjennom dagen. Temperatur 8–10 °C.",
  );
});

test("returns null when the requested date is outside the forecast", () => {
  const items: MetForecastItem[] = [
    {
      time: "2026-09-22T10:00:00Z",
      data: { instant: { details: { air_temperature: 8 } } },
    },
  ];
  assert.equal(summarizeMetForecast(items, "2026-10-10", "no"), null);
});
