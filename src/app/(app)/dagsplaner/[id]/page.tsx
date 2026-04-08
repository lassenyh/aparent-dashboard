import type { Metadata } from "next";
import { WeatherIconKind } from "@prisma/client";
import { notFound } from "next/navigation";
import {
  getCrewDatabaseForDagsplan,
  getDagsplanById,
  getProjectCrewForDagsplan,
} from "@/actions/dagsplan";
import { DagsplanEditor, type DagsplanEditorInitial } from "@/components/dagsplan/dagsplan-editor";
import {
  inferDurationMinutes,
  inferWorkHoursFromScheduleRows,
  parseScheduleRowKind,
  recalculateScheduleRows,
} from "@/lib/schedule-rows";
import { parseDagsplanLocale } from "@/lib/dagsplan-i18n";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const d = await getDagsplanById(id);
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
      if (rowKind === "free" && r.startTime?.trim() && r.endTime?.trim()) {
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
        sceneSetting: r.sceneSetting ?? "",
        info: r.info ?? "",
        actorNumbers: r.actorNumbers ?? "",
        shotImageUrl: r.shotImageUrl ?? "",
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
    locationRows: d.locations.map((loc) => ({
      id: loc.id,
      locationName: loc.locationName ?? "",
      locationText: loc.locationText ?? "",
      locationMapsUrl: loc.locationMapsUrl ?? "",
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
    emergencyNumbersText: d.emergencyNumbersText ?? "",
    radioChannelsText: d.radioChannelsText ?? "",
    printIncludeActors: d.printIncludeActors ?? true,
    printIncludeDepartmentInfo: d.printIncludeDepartmentInfo ?? true,
    printIncludeSchedule: d.printIncludeSchedule ?? true,
    showShotColumn: d.showShotColumn ?? false,
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
  const d = await getDagsplanById(id);
  if (!d) notFound();

  const [crewSuggestions, crewDatabaseOptions] = await Promise.all([
    getProjectCrewForDagsplan(d.projectId),
    getCrewDatabaseForDagsplan(d.projectId),
  ]);
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
