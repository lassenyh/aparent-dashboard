"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { assertPermission, requireProjectAccess } from "@/lib/project-access";
import {
  summarizeMetForecast,
  type MetForecastItem,
} from "@/lib/met-weather";

const requestSchema = z.object({
  dagsplanId: z.string().min(1),
  shootDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  workStartTime: z.string().nullable().optional(),
  workEndTime: z.string().nullable().optional(),
  locale: z.enum(["no", "en"]),
});

function calendarDayDifference(from: string, to: string): number {
  const fromMs = Date.parse(`${from}T12:00:00Z`);
  const toMs = Date.parse(`${to}T12:00:00Z`);
  return Math.round((toMs - fromMs) / (24 * 60 * 60 * 1000));
}

function osloDateKey(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Oslo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export async function fetchDagsplanWeather(payload: unknown) {
  const parsed = requestSchema.safeParse(payload);
  if (!parsed.success) return { error: "Ugyldig lokasjon eller dato." };
  const request = parsed.data;

  const dagsplan = await prisma.dagsplan.findUnique({
    where: { id: request.dagsplanId },
    select: { projectId: true },
  });
  if (!dagsplan) return { error: "Dagsplanen ble ikke funnet." };

  const { flags } = await requireProjectAccess(dagsplan.projectId);
  assertPermission(flags, "canEditDagsplan");

  const daysAhead = calendarDayDifference(osloDateKey(), request.shootDate);
  if (daysAhead < 0) {
    return { error: "MET Norway tilbyr ikke værvarsel for tidligere datoer." };
  }
  if (daysAhead > 9) {
    return {
      error:
        request.locale === "no"
          ? "Værvarselet blir tilgjengelig omtrent 9 dager før opptaksdatoen."
          : "The forecast becomes available about 9 days before the shoot date.",
    };
  }

  const url = new URL(
    "https://api.met.no/weatherapi/locationforecast/2.0/compact",
  );
  url.searchParams.set("lat", request.latitude.toFixed(4));
  url.searchParams.set("lon", request.longitude.toFixed(4));

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent":
          process.env.MET_WEATHER_USER_AGENT ??
          "WrapupDesk/1.0 https://aparent.tv",
      },
      next: { revalidate: 30 * 60 },
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return { error: "Kunne ikke kontakte MET Norway. Prøv igjen senere." };
  }

  if (!response.ok) {
    return {
      error:
        response.status === 429
          ? "Værtjenesten er midlertidig opptatt. Prøv igjen senere."
          : "Kunne ikke hente værvarselet fra MET Norway.",
    };
  }

  const json = (await response.json()) as {
    properties?: { timeseries?: MetForecastItem[] };
  };
  const forecast = summarizeMetForecast(
    json.properties?.timeseries ?? [],
    request.shootDate,
    request.locale,
    request.workStartTime,
    request.workEndTime,
  );
  if (!forecast) {
    return {
      error:
        request.locale === "no"
          ? "Det finnes ikke værdata for denne datoen ennå."
          : "Weather data is not available for this date yet.",
    };
  }

  return { forecast };
}
