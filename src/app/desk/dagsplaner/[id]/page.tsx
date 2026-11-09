import type { Metadata } from "next";
import { cache } from "react";
import { WeatherIconKind } from "@/generated/prisma/client";
import { requireProjectAccess } from "@/lib/project-access";
import { notFound, redirect } from "next/navigation";
import {
  getCrewDatabaseForDagsplan,
  getDagsplanById,
  getProjectCrewForDagsplan,
  syncNewProjectCrewToDagsplan,
} from "@/actions/dagsplan";
import { DagsplanEditor, type DagsplanEditorInitial } from "@/components/dagsplan/dagsplan-editor";
import {
  inferDurationMinutes,
  inferWorkHoursFromScheduleRows,
  parseScheduleRowKind,
  recalculateScheduleRows,
} from "@/lib/schedule-rows";
import { parseDagsplanLocale } from "@/lib/dagsplan-i18n";
import { normalizeScheduleColumnOrder } from "@/lib/schedule-columns";

type PageProps = { params: Promise<{ id: string }> };

/** Deles mellom generateMetadata og siden, så dagsplanen bare hentes én gang per request. */
const loadDagsplan = cache(getDagsplanById);

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const d = await loadDagsplan(id);
  if (!d) return { title: "Dagsplan" };
  return {
    title: `${d.project.name} · ${d.title}`,
  };
}

type DagsplanLoaded = NonNullable<Awaited<ReturnType<typeof getDagsplanById>>>;

function mapToInitial(d: DagsplanLoaded): DagsplanEditorInitial {
  const scheduleRows = recalculateScheduleRows(
    d.scheduleEntries.map((r: DagsplanLoaded["scheduleEntries"][number], i) => {
      const rowKind = parseScheduleRowKind(r.rowKind, i);
      let durationMinutes = Math.max(0, r.durationMinutes ?? 30);
      if (rowKind === "untimed") {
        durationMinutes = 0;
      } else if (rowKind === "free" && r.startTime?.trim() && r.endTime?.trim()) {
        durationMinutes = inferDurationMinutes(r.startTime, r.endTime);
      } else if (
        rowKind !== "free" &&
        r.startTime?.trim() &&
        r.endTime?.trim()
      ) {
        durationMinutes = inferDurationMinutes(r.startTime, r.endTime);
      }
      return {
        id: r.id,
        rowKind,
        startTime: r.startTime ?? "",
        endTime: r.endTime ?? "",
        durationMinutes,
        interiorExterior: r.interiorExterior ?? "",
        dayNight: r.dayNight ?? "",
        sceneSetting: [r.sceneSetting, r.setting]
          .map((value) => value?.trim() ?? "")
          .filter(Boolean)
          .join(" / "),
        setting: "",
        info: r.info ?? "",
        actorNumbers: r.actorNumbers ?? "",
        costume: r.costume ?? "",
        shotImageUrl: r.shotImageUrl ?? "",
        shotImageAssetId: r.shotImageAssetId ?? "",
        shotImageZoom: r.shotImageZoom ?? 1,
        shotImagePositionX: r.shotImagePositionX ?? 50,
        shotImagePositionY: r.shotImagePositionY ?? 50,
        shotImageFit: r.shotImageFit === "cover" ? "cover" as const : "contain" as const,
        rowBgColor: r.rowBgColor ?? "",
      };
    }),
  );
  const inferredWh = inferWorkHoursFromScheduleRows(scheduleRows);
  const workStartTime =
    d.workStartTime?.trim() || inferredWh.workStartTime || "";
  const workEndTime = d.workEndTime?.trim() || inferredWh.workEndTime || "";

  return {
    id: d.id,
    projectId: d.projectId,
    projectName: d.project.name,
    title: d.title,
    shootDate: d.shootDate.toISOString().slice(0, 10),
    agencyLogoUrl: d.agencyLogoUrl ?? "",
    clientLogoUrl: d.clientLogoUrl ?? "",
    extraClientLogoUrl: d.extraClientLogoUrl ?? "",
    agencyLogoHidden: d.agencyLogoUrl === "",
    clientLogoHidden: d.clientLogoUrl === "",
    locationRows: d.locations.map((loc) => ({
      id: loc.id,
      locationName: loc.locationName ?? "",
      locationText: loc.locationText ?? "",
      locationMapsUrl: loc.locationMapsUrl ?? "",
      latitude: loc.latitude,
      longitude: loc.longitude,
      parkingText: loc.parkingText ?? "",
      parkingMapsUrl: loc.parkingMapsUrl ?? "",
      parkingImageUrl: loc.parkingImageUrl ?? "",
    })),
    infoText: d.infoText ?? "",
    weatherIcon: d.weatherIcon ?? WeatherIconKind.none,
    weatherTempMin:
      d.weatherTempMin != null ? String(d.weatherTempMin) : "",
    weatherTempMax:
      d.weatherTempMax != null ? String(d.weatherTempMax) : "",
    weatherText: d.weatherText ?? "",
    weatherLocationName: d.weatherLocationName ?? "",
    weatherLatitude: d.weatherLatitude,
    weatherLongitude: d.weatherLongitude,
    weatherFromMet: d.weatherFromMet ?? false,
    emergencyNumbersText: d.emergencyNumbersText ?? "",
    radioChannelsText: d.radioChannelsText ?? "",
    printIncludeActors: d.printIncludeActors ?? true,
    printIncludeDepartmentInfo: d.printIncludeDepartmentInfo ?? true,
    printIncludeSchedule: d.printIncludeSchedule ?? true,
    showShotColumn: d.showShotColumn ?? false,
    showInteriorExteriorColumn: d.showInteriorExteriorColumn ?? true,
    showDayNightColumn: d.showDayNightColumn ?? true,
    showActorColumn: d.showActorColumn ?? false,
    showCostumeColumn: d.showCostumeColumn ?? false,
    scheduleColumnOrder: normalizeScheduleColumnOrder(d.scheduleColumnOrder),
    displayLocale: parseDagsplanLocale(d.displayLocale),
    sunriseTimeOverride: d.sunriseTimeOverride ?? "",
    sunsetTimeOverride: d.sunsetTimeOverride ?? "",
    workStartTime,
    workEndTime,
    crewRows: d.crewEntries.map((r: DagsplanLoaded["crewEntries"][number]) => ({
      departmentTitle: r.departmentTitle,
      personName: r.personName,
      mobile: r.mobile ?? "",
      email: r.email ?? "",
      onSetTime: r.onSetTime ?? "",
      linkedProjectCrewId: r.linkedProjectCrewId,
      linkedPersonId: r.linkedPersonId,
    })),
    actorRows: d.actorEntries.map((r: DagsplanLoaded["actorEntries"][number]) => ({
      id: r.id,
      actorName: r.actorName,
      meetTime: r.meetTime ?? "",
      readyOnSetTime: r.readyOnSetTime ?? "",
    })),
    scheduleRows,
    imageAssets: d.project.dagsplanImageAssets.map((asset) => ({
      id: asset.id,
      url: asset.url,
      name: asset.name ?? "Bilde",
    })),
    departmentRows: d.departmentInfos.map((r: DagsplanLoaded["departmentInfos"][number]) => ({
      departmentName: r.departmentName,
      info: r.info ?? "",
    })),
    projectAgencyLogoUrl: d.project.agency?.logoUrl ?? null,
    projectClientLogoUrl: d.project.customer?.logoUrl ?? null,
  };
}

export default async function DagsplanEditorPage({ params }: PageProps) {
  const { id } = await params;
  let d = await loadDagsplan(id);
  if (!d) notFound();

  const { flags } = await requireProjectAccess(d.projectId);
  if (!flags.canEditDagsplan) redirect(`/desk/dagsplaner/${id}/print`);

  const [addedCrewCount, crewSuggestions, crewDatabaseOptions] = await Promise.all([
    syncNewProjectCrewToDagsplan(id),
    getProjectCrewForDagsplan(d.projectId),
    getCrewDatabaseForDagsplan(d.projectId),
  ]);
  if (addedCrewCount > 0) {
    d = await getDagsplanById(id);
    if (!d) notFound();
  }
  const initial = mapToInitial(d);

  return (
    <DagsplanEditor
      key={d.id}
      initial={initial}
      crewSuggestions={crewSuggestions}
      crewDatabaseOptions={crewDatabaseOptions}
    />
  );
}
