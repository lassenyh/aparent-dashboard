"use server";

import { z } from "zod";
import { assertPermission, requireProjectAccess } from "@/lib/project-access";

const tokenSchema = z.string().uuid();
async function placesRequest(projectId: string, path: string, init?: RequestInit) {
  const { flags } = await requireProjectAccess(projectId);
  assertPermission(flags, "canEditDagsplan");
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) throw new Error("Stedsøk er ikke konfigurert ennå.");
  const response = await fetch(`https://places.googleapis.com/v1/${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key, ...init?.headers },
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error("Google Maps kunne ikke nås. Prøv igjen eller fyll inn manuelt.");
  return response.json();
}

export async function searchLocationPlaces(projectId: string, query: string, token: string) {
  const input = z.string().trim().min(3).max(200).parse(query);
  const sessionToken = tokenSchema.parse(token);
  try {
    const data = await placesRequest(projectId, "places:autocomplete", {
      method: "POST",
      body: JSON.stringify({ input, sessionToken, languageCode: "nb", regionCode: "no" }),
    });
    const suggestions: { placeId: string; label: string }[] = (data.suggestions ?? []).flatMap(
      (item: { placePrediction?: { placeId?: string; text?: { text?: string } } }) => {
        const p = item.placePrediction;
        return p?.placeId && p.text?.text ? [{ placeId: p.placeId, label: p.text.text }] : [];
      },
    );
    return { suggestions };
  } catch {
    return { error: "Stedsøket er utilgjengelig akkurat nå. Du kan fortsatt fylle inn manuelt." };
  }
}

export async function getLocationPlace(projectId: string, placeId: string, token: string) {
  const id = z.string().regex(/^[A-Za-z0-9_-]+$/).max(300).parse(placeId);
  const sessionToken = tokenSchema.parse(token);
  try {
    const data = await placesRequest(projectId, `places/${encodeURIComponent(id)}?languageCode=nb&sessionToken=${sessionToken}`, {
      headers: { "X-Goog-FieldMask": "displayName,formattedAddress,googleMapsUri,location" },
    });
    return { place: {
      locationName: String(data.displayName?.text ?? ""),
      locationText: String(data.formattedAddress ?? ""),
      locationMapsUrl: String(data.googleMapsUri ?? ""),
      latitude:
        typeof data.location?.latitude === "number"
          ? data.location.latitude
          : null,
      longitude:
        typeof data.location?.longitude === "number"
          ? data.location.longitude
          : null,
    } };
  } catch {
    return { error: "Kunne ikke hente adressen. Prøv igjen eller fyll inn manuelt." };
  }
}
