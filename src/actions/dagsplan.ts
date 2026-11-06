"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { after } from "next/server";
import { WeatherIconKind } from "@prisma/client";
import { z } from "zod";
import { getSessionDashboardUser } from "@/lib/auth-session";
import { prisma } from "@/lib/db";
import {
  assertPermission,
  getProjectAccessForUser,
  requireProjectAccess,
} from "@/lib/project-access";
import {
  DEFAULT_DAGSPLAN_EMERGENCY,
  DEFAULT_DAGSPLAN_RADIO,
} from "@/lib/dagsplan-defaults";
import {
  isPublicUploadPath,
  removePublicUploadFile,
  saveUploadedLogo,
} from "@/lib/logo-upload";
import {
  MAX_PARKING_IMAGE_BYTES,
  MAX_SCHEDULE_SHOT_IMAGE_BYTES,
} from "@/lib/upload-limits";
import { normalizeScheduleRowBgColor } from "@/lib/schedule-row-colors";
import { sortProjectCrewByDepartmentOrder } from "@/lib/crew-department-order";
import { primaryRole } from "@/lib/person";
import { resolveRoleForProject } from "@/lib/snapshot";

function parseShootDate(s: string): Date {
  const d = new Date(`${s.trim()}T12:00:00`);
  if (Number.isNaN(d.getTime())) throw new Error("Ugyldig dato");
  return d;
}

const crewRowSchema = z.object({
  departmentTitle: z.string(),
  personName: z.string(),
  mobile: z.string().optional().default(""),
  email: z.string().optional().default(""),
  onSetTime: z.string().optional().default(""),
  sortOrder: z.number(),
  linkedProjectCrewId: z.string().nullable().optional(),
  linkedPersonId: z.string().nullable().optional(),
});

const actorRowSchema = z.object({
  /** Settes fra listeindeks ved lagring (1, 2, …). */
  actorNumber: z.string(),
  actorName: z.string(),
  meetTime: z.string().optional().default(""),
  readyOnSetTime: z.string().optional().default(""),
  sortOrder: z.number(),
});

const scheduleRowSchema = z.object({
  id: z.string().min(1),
  startTime: z.string().optional().default(""),
  endTime: z.string().optional().default(""),
  durationMinutes: z
    .union([
      z.number().int().min(0).max(24 * 60),
      z.null(),
    ])
    .optional()
    .default(30),
  rowKind: z
    .enum(["anchor", "sequential", "free", "untimed"])
    .optional()
    .default("sequential"),
  interiorExterior: z.string().optional().default(""),
  dayNight: z.string().optional().default(""),
  sceneSetting: z.string().optional().default(""),
  setting: z.string().optional().default(""),
  info: z.string().optional().default(""),
  actorNumbers: z.string().optional().default(""),
  costume: z.string().optional().default(""),
  shotImageUrl: z.string().nullable().optional(),
  shotImageAssetId: z.string().nullable().optional(),
  shotImageZoom: z.number().min(1).max(3).optional().default(1),
  shotImagePositionX: z.number().min(0).max(100).optional().default(50),
  shotImagePositionY: z.number().min(0).max(100).optional().default(50),
  shotImageFit: z.enum(["contain", "cover"]).optional().default("contain"),
  rowBgColor: z.string().nullable().optional(),
  sortOrder: z.number(),
});

const deptRowSchema = z.object({
  departmentName: z.string(),
  info: z.string().optional().default(""),
  sortOrder: z.number(),
});

const locationRowSchema = z.object({
  id: z.string(),
  locationName: z.string().nullable().optional(),
  locationText: z.string().nullable().optional(),
  locationMapsUrl: z.string().nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  parkingText: z.string().nullable().optional(),
  parkingMapsUrl: z.string().nullable().optional(),
  parkingImageUrl: z.string().nullable().optional(),
  sortOrder: z.number(),
});

const dagsplanSaveSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  shootDate: z.string().min(1),
  workStartTime: z.string().nullable().optional(),
  workEndTime: z.string().nullable().optional(),
  agencyLogoUrl: z.string().nullable().optional(),
  clientLogoUrl: z.string().nullable().optional(),
  extraClientLogoUrl: z.string().nullable().optional(),
  locationRows: z.array(locationRowSchema),
  infoText: z.string().nullable().optional(),
  weatherIcon: z.nativeEnum(WeatherIconKind).optional().default(WeatherIconKind.none),
  weatherTempMin: z.number().int().nullable().optional(),
  weatherTempMax: z.number().int().nullable().optional(),
  weatherText: z.string().nullable().optional(),
  weatherLocationName: z.string().nullable().optional(),
  weatherLatitude: z.number().min(-90).max(90).nullable().optional(),
  weatherLongitude: z.number().min(-180).max(180).nullable().optional(),
  weatherFromMet: z.boolean().optional().default(false),
  emergencyNumbersText: z.string().nullable().optional(),
  radioChannelsText: z.string().nullable().optional(),
  printIncludeActors: z.boolean().optional().default(true),
  printIncludeDepartmentInfo: z.boolean().optional().default(true),
  printIncludeSchedule: z.boolean().optional().default(true),
  showShotColumn: z.boolean().optional().default(false),
  showInteriorExteriorColumn: z.boolean().optional().default(true),
  showDayNightColumn: z.boolean().optional().default(true),
  showActorColumn: z.boolean().optional().default(false),
  showCostumeColumn: z.boolean().optional().default(false),
  scheduleColumnOrder: z.array(z.string()).optional().default([]),
  displayLocale: z.enum(["no", "en"]).optional().default("no"),
  /** Tom = automatisk Oslo på opptaksdato */
  sunriseTimeOverride: z.string().nullable().optional(),
  sunsetTimeOverride: z.string().nullable().optional(),
  crewRows: z.array(crewRowSchema),
  actorRows: z.array(actorRowSchema),
  scheduleRows: z.array(scheduleRowSchema),
  departmentRows: z.array(deptRowSchema),
});

export async function getDagsplanById(id: string) {
  const sessionUser = await getSessionDashboardUser();
  if (!sessionUser) notFound();

  const row = await prisma.dagsplan.findUnique({
    where: { id },
    include: {
      project: {
        include: {
          agency: true,
          customer: true,
          dagsplanImageAssets: { orderBy: { createdAt: "desc" } },
        },
      },
      locations: { orderBy: { sortOrder: "asc" } },
      crewEntries: { orderBy: { sortOrder: "asc" } },
      actorEntries: { orderBy: { sortOrder: "asc" } },
      scheduleEntries: { orderBy: { sortOrder: "asc" } },
      departmentInfos: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!row) return null;
  const flags = await getProjectAccessForUser(sessionUser, row.projectId);
  if (!flags?.canViewDagsplan) notFound();
  return row;
}

export async function getProjectCrewForDagsplan(projectId: string) {
  const sessionUser = await getSessionDashboardUser();
  if (!sessionUser) notFound();
  const flags = await getProjectAccessForUser(sessionUser, projectId);
  if (!flags?.canViewDagsplan) notFound();

  const rows = await prisma.projectCrew.findMany({
    where: { projectId, isActive: true },
    include: { person: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  const sorted = sortProjectCrewByDepartmentOrder(rows);
  return sorted.map((pc) => ({
    projectCrewId: pc.id,
    personId: pc.personId,
    departmentTitle: resolveRoleForProject(pc),
    personName: pc.person.fullName,
    mobile: pc.person.phone ?? "",
    email: pc.person.email ?? "",
  }));
}

/**
 * Add project crew created since the last dagsplan sync.
 *
 * Claiming the cursor inside the transaction prevents simultaneous page opens
 * from adding the same person twice. A person removed after being synced stays
 * removed because their ProjectCrew.createdAt is behind the cursor.
 */
export async function syncNewProjectCrewToDagsplan(
  dagsplanId: string,
): Promise<number> {
  const dagsplan = await prisma.dagsplan.findUnique({
    where: { id: dagsplanId },
    select: { projectId: true, crewSyncedAt: true },
  });
  if (!dagsplan) notFound();

  const { flags } = await requireProjectAccess(dagsplan.projectId);
  assertPermission(flags, "canEditDagsplan");

  // Rask sjekk utenfor transaksjon: ingen nytt crew siden sist → ingen skriving ved sidevisning.
  const newCrewCount = await prisma.projectCrew.count({
    where: {
      projectId: dagsplan.projectId,
      isActive: true,
      createdAt: { gt: dagsplan.crewSyncedAt },
    },
  });
  if (newCrewCount === 0) return 0;

  const syncStartedAt = new Date();
  return prisma.$transaction(async (tx) => {
    const claim = await tx.dagsplan.updateMany({
      where: { id: dagsplanId, crewSyncedAt: dagsplan.crewSyncedAt },
      data: { crewSyncedAt: syncStartedAt },
    });
    if (claim.count === 0) return 0;

    const [projectCrewRows, existingRows, maxSortOrder] = await Promise.all([
      tx.projectCrew.findMany({
        where: {
          projectId: dagsplan.projectId,
          isActive: true,
          createdAt: { gt: dagsplan.crewSyncedAt, lte: syncStartedAt },
        },
        include: { person: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      }),
      tx.dagsplanCrewEntry.findMany({
        where: { dagsplanId },
        select: { linkedProjectCrewId: true, linkedPersonId: true },
      }),
      tx.dagsplanCrewEntry.aggregate({
        where: { dagsplanId },
        _max: { sortOrder: true },
      }),
    ]);

    const linkedProjectCrewIds = new Set(
      existingRows.flatMap((row) =>
        row.linkedProjectCrewId ? [row.linkedProjectCrewId] : [],
      ),
    );
    const linkedPersonIds = new Set(
      existingRows.flatMap((row) =>
        row.linkedPersonId ? [row.linkedPersonId] : [],
      ),
    );
    const missingRows = sortProjectCrewByDepartmentOrder(projectCrewRows).filter(
      (row) =>
        !linkedProjectCrewIds.has(row.id) &&
        !linkedPersonIds.has(row.personId),
    );

    if (missingRows.length > 0) {
      const firstSortOrder = (maxSortOrder._max.sortOrder ?? -1) + 1;
      await tx.dagsplanCrewEntry.createMany({
        data: missingRows.map((row, index) => ({
          dagsplanId,
          departmentTitle: resolveRoleForProject(row),
          personName: row.person.fullName,
          mobile: row.person.phone?.trim() || null,
          email: row.person.email?.trim() || null,
          onSetTime: null,
          sortOrder: firstSortOrder + index,
          linkedProjectCrewId: row.id,
          linkedPersonId: row.personId,
        })),
      });
    }

    return missingRows.length;
  });
}

export type CrewDatabasePersonOption = {
  personId: string;
  departmentTitle: string;
  personName: string;
  mobile: string;
  email: string;
};

/** Aktive personer i crew-databasen — til «Oppmøtetid» (stabsliste-lignende felt). */
export async function getCrewDatabaseForDagsplan(
  projectId: string,
): Promise<CrewDatabasePersonOption[]> {
  const { user, flags } = await requireProjectAccess(projectId);
  if (!flags.canEditDagsplan) {
    return [];
  }

  const people = await prisma.person.findMany({
    where: { isActive: true, ...(user.isInternal ? {} : { projectCrews: { some: { projectId, isActive: true } } }) },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }, { id: "asc" }],
    select: { id: true, fullName: true, phone: true, email: true, roles: true },
  });
  return people.map((p) => ({
    personId: p.id,
    departmentTitle: primaryRole(p),
    personName: p.fullName,
    mobile: p.phone ?? "",
    email: p.email ?? "",
  }));
}

export async function createDagsplan(
  projectId: string,
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const title = String(formData.get("title") ?? "").trim() || "Ny dagsplan";
  const shootDateRaw = String(formData.get("shootDate") ?? "").trim();
  if (!shootDateRaw) {
    return { error: "Velg dato" };
  }
  let shootDate: Date;
  try {
    shootDate = parseShootDate(shootDateRaw);
  } catch {
    return { error: "Ugyldig dato" };
  }

  const { flags } = await requireProjectAccess(projectId);
  assertPermission(flags, "canEditDagsplan");

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { agency: true, customer: true },
  });
  if (!project) return { error: "Prosjekt ikke funnet" };

  const projectCrewRows = sortProjectCrewByDepartmentOrder(
    await prisma.projectCrew.findMany({
      where: { projectId, isActive: true },
      include: { person: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
  );

  const d = await prisma.$transaction(async (tx) => {
    const created = await tx.dagsplan.create({
      data: {
        projectId,
        title,
        shootDate,
        agencyLogoUrl: project.agency?.logoUrl ?? null,
        clientLogoUrl: project.customer?.logoUrl ?? null,
        extraClientLogoUrl: null,
        emergencyNumbersText: DEFAULT_DAGSPLAN_EMERGENCY,
        radioChannelsText: DEFAULT_DAGSPLAN_RADIO,
      },
    });

    if (projectCrewRows.length > 0) {
      await tx.dagsplanCrewEntry.createMany({
        data: projectCrewRows.map((pc, i) => ({
          dagsplanId: created.id,
          departmentTitle: resolveRoleForProject(pc),
          personName: pc.person.fullName,
          mobile: pc.person.phone?.trim() || null,
          email: pc.person.email?.trim() || null,
          onSetTime: null,
          sortOrder: i,
          linkedProjectCrewId: pc.id,
          linkedPersonId: pc.personId,
        })),
      });
    }

    return created;
  });

  revalidatePath(`/projects/${projectId}`);
  redirect(`/dagsplaner/${d.id}`);
}

export async function saveDagsplan(
  _prev: { error?: string } | null,
  payload: unknown,
): Promise<{ error?: string } | null> {
  const parsed = dagsplanSaveSchema.safeParse(payload);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ugyldig data" };
  }
  const d = parsed.data;
  let shootDate: Date;
  try {
    shootDate = parseShootDate(d.shootDate);
  } catch {
    return { error: "Ugyldig dato" };
  }

  const existing = await prisma.dagsplan.findUnique({
    where: { id: d.id },
    select: { projectId: true },
  });
  if (!existing) return { error: "Dagsplan ikke funnet" };

  const { flags } = await requireProjectAccess(existing.projectId);
  assertPermission(flags, "canEditDagsplan");

  await prisma.$transaction(async (tx) => {
    await tx.dagsplan.update({
      where: { id: d.id },
      data: {
        title: d.title.trim(),
        shootDate,
        workStartTime: d.workStartTime?.trim() || null,
        workEndTime: d.workEndTime?.trim() || null,
        infoText: d.infoText?.trim() || null,
        weatherIcon: d.weatherIcon,
        weatherTempMin: d.weatherTempMin ?? null,
        weatherTempMax: d.weatherTempMax ?? null,
        weatherText: d.weatherText?.trim() || null,
        weatherLocationName: d.weatherLocationName?.trim() || null,
        weatherLatitude: d.weatherLatitude ?? null,
        weatherLongitude: d.weatherLongitude ?? null,
        weatherFromMet: d.weatherFromMet,
        emergencyNumbersText: d.emergencyNumbersText?.trim() || null,
        radioChannelsText: d.radioChannelsText?.trim() || null,
        printIncludeActors: d.printIncludeActors,
        printIncludeDepartmentInfo: d.printIncludeDepartmentInfo,
        printIncludeSchedule: d.printIncludeSchedule,
        showShotColumn: d.showShotColumn,
        showInteriorExteriorColumn: d.showInteriorExteriorColumn,
        showDayNightColumn: d.showDayNightColumn,
        showActorColumn: d.showActorColumn,
        showCostumeColumn: d.showCostumeColumn,
        scheduleColumnOrder: d.scheduleColumnOrder,
        displayLocale: d.displayLocale,
        sunriseTimeOverride: d.sunriseTimeOverride?.trim() || null,
        sunsetTimeOverride: d.sunsetTimeOverride?.trim() || null,
      },
    });

    const allowedLocationIds = new Set(
      (
        await tx.dagsplanLocation.findMany({
          where: { dagsplanId: d.id },
          select: { id: true },
        })
      ).map((x) => x.id),
    );
    for (let i = 0; i < d.locationRows.length; i++) {
      const r = d.locationRows[i];
      if (!allowedLocationIds.has(r.id)) continue;
      await tx.dagsplanLocation.update({
        where: { id: r.id },
        data: {
          sortOrder: i,
          locationName: r.locationName?.trim() || null,
          locationText: r.locationText?.trim() || null,
          locationMapsUrl: r.locationMapsUrl?.trim() || null,
          latitude: r.latitude ?? null,
          longitude: r.longitude ?? null,
          parkingText: r.parkingText?.trim() || null,
          parkingMapsUrl: r.parkingMapsUrl?.trim() || null,
        },
      });
    }

    await tx.dagsplanCrewEntry.deleteMany({ where: { dagsplanId: d.id } });
    await tx.dagsplanActorEntry.deleteMany({ where: { dagsplanId: d.id } });
    await tx.dagsplanScheduleEntry.deleteMany({ where: { dagsplanId: d.id } });
    await tx.dagsplanDepartmentInfoEntry.deleteMany({
      where: { dagsplanId: d.id },
    });

    if (d.crewRows.length) {
      await tx.dagsplanCrewEntry.createMany({
        data: d.crewRows.map((r) => ({
          dagsplanId: d.id,
          departmentTitle: r.departmentTitle,
          personName: r.personName,
          mobile: r.mobile || null,
          email: r.email?.trim() || null,
          onSetTime: r.onSetTime || null,
          sortOrder: r.sortOrder,
          linkedProjectCrewId: r.linkedProjectCrewId ?? null,
          linkedPersonId: r.linkedPersonId ?? null,
        })),
      });
    }
    if (d.actorRows.length) {
      await tx.dagsplanActorEntry.createMany({
        data: d.actorRows.map((r) => ({
          dagsplanId: d.id,
          actorNumber: r.actorNumber,
          actorName: r.actorName,
          meetTime: r.meetTime || null,
          readyOnSetTime: r.readyOnSetTime || null,
          sortOrder: r.sortOrder,
        })),
      });
    }
    if (d.scheduleRows.length) {
      await tx.dagsplanScheduleEntry.createMany({
        data: d.scheduleRows.map((r) => ({
          id: r.id,
          dagsplanId: d.id,
          startTime: r.startTime || null,
          endTime: r.endTime || null,
          durationMinutes: r.durationMinutes == null ? 0 : r.durationMinutes,
          rowKind: r.rowKind ?? "sequential",
          interiorExterior: r.interiorExterior || null,
          dayNight: r.dayNight || null,
          sceneSetting: r.sceneSetting || null,
          setting: r.setting || null,
          info: r.info || null,
          actorNumbers: r.actorNumbers || null,
          costume: r.costume || null,
          shotImageUrl: r.shotImageUrl?.trim() || null,
          shotImageAssetId: r.shotImageAssetId || null,
          shotImageZoom: r.shotImageZoom,
          shotImagePositionX: r.shotImagePositionX,
          shotImagePositionY: r.shotImagePositionY,
          shotImageFit: r.shotImageFit,
          rowBgColor: normalizeScheduleRowBgColor(r.rowBgColor ?? "") || null,
          sortOrder: r.sortOrder,
        })),
      });
    }
    if (d.departmentRows.length) {
      await tx.dagsplanDepartmentInfoEntry.createMany({
        data: d.departmentRows.map((r) => ({
          dagsplanId: d.id,
          departmentName: r.departmentName,
          info: r.info || null,
          sortOrder: r.sortOrder,
        })),
      });
    }
  });

  revalidatePath(`/projects/${existing.projectId}`);
  revalidatePath(`/dagsplaner/${d.id}`);
  revalidatePath(`/dagsplaner/${d.id}/print`);
  return null;
}

export async function duplicateDagsplan(id: string, _formData?: FormData) {
  void _formData;
  const src = await prisma.dagsplan.findUnique({
    where: { id },
    include: {
      locations: { orderBy: { sortOrder: "asc" } },
      crewEntries: { orderBy: { sortOrder: "asc" } },
      actorEntries: { orderBy: { sortOrder: "asc" } },
      scheduleEntries: { orderBy: { sortOrder: "asc" } },
      departmentInfos: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!src) throw new Error("Dagsplan ikke funnet");

  const created = await prisma.$transaction(async (tx) => {
    const d = await tx.dagsplan.create({
      data: {
        projectId: src.projectId,
        title: `${src.title} (kopi)`,
        shootDate: src.shootDate,
        workStartTime: src.workStartTime,
        workEndTime: src.workEndTime,
        agencyLogoUrl: src.agencyLogoUrl,
        clientLogoUrl: src.clientLogoUrl,
        extraClientLogoUrl: src.extraClientLogoUrl,
        infoText: src.infoText,
        weatherIcon: src.weatherIcon,
        weatherTempMin: src.weatherTempMin,
        weatherTempMax: src.weatherTempMax,
        weatherText: src.weatherText,
        weatherLocationName: src.weatherLocationName,
        weatherLatitude: src.weatherLatitude,
        weatherLongitude: src.weatherLongitude,
        weatherFromMet: src.weatherFromMet,
        emergencyNumbersText: src.emergencyNumbersText,
        radioChannelsText: src.radioChannelsText,
        printIncludeActors: src.printIncludeActors,
        printIncludeDepartmentInfo: src.printIncludeDepartmentInfo,
        printIncludeSchedule: src.printIncludeSchedule,
        showShotColumn: src.showShotColumn,
        showInteriorExteriorColumn: src.showInteriorExteriorColumn,
        showDayNightColumn: src.showDayNightColumn,
        showActorColumn: src.showActorColumn,
        showCostumeColumn: src.showCostumeColumn,
        scheduleColumnOrder: src.scheduleColumnOrder,
        displayLocale: src.displayLocale,
        sunriseTimeOverride: src.sunriseTimeOverride,
        sunsetTimeOverride: src.sunsetTimeOverride,
      },
    });

    if (src.locations.length) {
      await tx.dagsplanLocation.createMany({
        data: src.locations.map((loc) => ({
          dagsplanId: d.id,
          sortOrder: loc.sortOrder,
          locationName: loc.locationName,
          locationText: loc.locationText,
          locationMapsUrl: loc.locationMapsUrl,
          latitude: loc.latitude,
          longitude: loc.longitude,
          parkingText: loc.parkingText,
          parkingMapsUrl: loc.parkingMapsUrl,
          parkingImageUrl: loc.parkingImageUrl,
        })),
      });
    }

    if (src.crewEntries.length) {
      await tx.dagsplanCrewEntry.createMany({
        data: src.crewEntries.map((r) => ({
          dagsplanId: d.id,
          departmentTitle: r.departmentTitle,
          personName: r.personName,
          mobile: r.mobile,
          email: r.email,
          onSetTime: r.onSetTime,
          sortOrder: r.sortOrder,
          linkedProjectCrewId: r.linkedProjectCrewId,
          linkedPersonId: r.linkedPersonId,
        })),
      });
    }
    if (src.actorEntries.length) {
      await tx.dagsplanActorEntry.createMany({
        data: src.actorEntries.map((r, i) => ({
          dagsplanId: d.id,
          actorNumber: String(i + 1),
          actorName: r.actorName,
          meetTime: r.meetTime,
          readyOnSetTime: r.readyOnSetTime,
          sortOrder: r.sortOrder,
        })),
      });
    }
    if (src.scheduleEntries.length) {
      await tx.dagsplanScheduleEntry.createMany({
        data: src.scheduleEntries.map((r) => ({
          dagsplanId: d.id,
          startTime: r.startTime,
          endTime: r.endTime,
          durationMinutes: r.durationMinutes,
          rowKind: r.rowKind,
          interiorExterior: r.interiorExterior,
          dayNight: r.dayNight,
          sceneSetting: r.sceneSetting,
          setting: r.setting,
          info: r.info,
          actorNumbers: r.actorNumbers,
          costume: r.costume,
          shotImageUrl: r.shotImageUrl,
          shotImageAssetId: r.shotImageAssetId,
          shotImageZoom: r.shotImageZoom,
          shotImagePositionX: r.shotImagePositionX,
          shotImagePositionY: r.shotImagePositionY,
          shotImageFit: r.shotImageFit,
          rowBgColor: r.rowBgColor,
          sortOrder: r.sortOrder,
        })),
      });
    }
    if (src.departmentInfos.length) {
      await tx.dagsplanDepartmentInfoEntry.createMany({
        data: src.departmentInfos.map((r) => ({
          dagsplanId: d.id,
          departmentName: r.departmentName,
          info: r.info,
          sortOrder: r.sortOrder,
        })),
      });
    }

    return d;
  });

  revalidatePath(`/projects/${src.projectId}`);
  redirect(`/dagsplaner/${created.id}`);
}

export async function deleteDagsplan(id: string, _formData?: FormData) {
  void _formData;
  const row = await prisma.dagsplan.findUnique({
    where: { id },
    select: {
      projectId: true,
      agencyLogoUrl: true,
      clientLogoUrl: true,
      extraClientLogoUrl: true,
      locations: { select: { parkingImageUrl: true } },
    },
  });
  if (!row) return;

  const { flags } = await requireProjectAccess(row.projectId);
  assertPermission(flags, "canEditDagsplan");

  if (isPublicUploadPath(row.agencyLogoUrl)) {
    await removePublicUploadFile(row.agencyLogoUrl);
  }
  if (isPublicUploadPath(row.clientLogoUrl)) {
    await removePublicUploadFile(row.clientLogoUrl);
  }
  if (isPublicUploadPath(row.extraClientLogoUrl)) {
    await removePublicUploadFile(row.extraClientLogoUrl);
  }
  for (const loc of row.locations) {
    if (isPublicUploadPath(loc.parkingImageUrl)) {
      await removePublicUploadFile(loc.parkingImageUrl);
    }
  }
  await prisma.dagsplan.delete({ where: { id } });
  revalidatePath(`/projects/${row.projectId}`);
  redirect(`/projects/${row.projectId}`);
}

export async function uploadDagsplanLogo(
  dagsplanId: string,
  which: "agency" | "client" | "extraClient",
  formData: FormData,
) {
  const file = formData.get("logoFile");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Velg en fil" };
  }
  const d = await prisma.dagsplan.findUnique({
    where: { id: dagsplanId },
    select: { id: true, agencyLogoUrl: true, clientLogoUrl: true, extraClientLogoUrl: true, projectId: true },
  });
  if (!d) return { error: "Ikke funnet" };

  const { flags } = await requireProjectAccess(d.projectId);
  assertPermission(flags, "canEditDagsplan");

  const entity = which === "agency" ? "dagsplanAgency" : "dagsplanClient";
  const saved = await saveUploadedLogo(file, entity, d.id);
  if (!saved.ok) return { error: saved.error };

  const prev = which === "agency" ? d.agencyLogoUrl : which === "client" ? d.clientLogoUrl : d.extraClientLogoUrl;
  if (isPublicUploadPath(prev)) await removePublicUploadFile(prev);

  await prisma.dagsplan.update({
    where: { id: dagsplanId },
    data:
      which === "agency"
        ? { agencyLogoUrl: saved.publicPath }
        : which === "client" ? { clientLogoUrl: saved.publicPath } : { extraClientLogoUrl: saved.publicPath },
  });

  revalidatePath(`/dagsplaner/${dagsplanId}`);
  revalidatePath(`/dagsplaner/${dagsplanId}/print`);
  revalidatePath(`/projects/${d.projectId}`);
  return { ok: true as const, publicPath: saved.publicPath };
}

export async function removeDagsplanLogo(
  dagsplanId: string,
  which: "agency" | "client" | "extraClient",
) {
  const d = await prisma.dagsplan.findUnique({
    where: { id: dagsplanId },
    select: {
      agencyLogoUrl: true,
      clientLogoUrl: true,
      extraClientLogoUrl: true,
      projectId: true,
    },
  });
  if (!d) return { error: "Ikke funnet" };

  const { flags } = await requireProjectAccess(d.projectId);
  assertPermission(flags, "canEditDagsplan");

  const previous =
    which === "agency"
      ? d.agencyLogoUrl
      : which === "client"
        ? d.clientLogoUrl
        : d.extraClientLogoUrl;
  if (isPublicUploadPath(previous)) {
    await removePublicUploadFile(previous);
  }

  await prisma.dagsplan.update({
    where: { id: dagsplanId },
    data:
      which === "agency"
        ? { agencyLogoUrl: "" }
        : which === "client"
          ? { clientLogoUrl: "" }
          : { extraClientLogoUrl: null },
  });

  revalidatePath(`/dagsplaner/${dagsplanId}`);
  revalidatePath(`/dagsplaner/${dagsplanId}/print`);
  revalidatePath(`/projects/${d.projectId}`);
  return { ok: true as const };
}

export async function uploadDagsplanLocationParkingImage(
  locationId: string,
  formData: FormData,
) {
  const file = formData.get("parkingImage");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Velg en fil" };
  }
  const loc = await prisma.dagsplanLocation.findUnique({
    where: { id: locationId },
    select: {
      id: true,
      parkingImageUrl: true,
      dagsplanId: true,
      dagsplan: { select: { projectId: true } },
    },
  });
  if (!loc) return { error: "Ikke funnet" };

  const { flags } = await requireProjectAccess(loc.dagsplan.projectId);
  assertPermission(flags, "canEditDagsplan");

  const saved = await saveUploadedLogo(file, "dagsplanParking", loc.id, {
    maxBytes: MAX_PARKING_IMAGE_BYTES,
  });
  if (!saved.ok) return { error: saved.error };

  if (isPublicUploadPath(loc.parkingImageUrl)) {
    await removePublicUploadFile(loc.parkingImageUrl);
  }

  await prisma.$transaction([
    prisma.dagsplanLocation.update({
      where: { id: locationId },
      data: { parkingImageUrl: saved.publicPath },
    }),
    prisma.dagsplan.update({
      where: { id: loc.dagsplanId },
      data: { updatedAt: new Date() },
    }),
  ]);

  revalidatePath(`/dagsplaner/${loc.dagsplanId}`);
  revalidatePath(`/dagsplaner/${loc.dagsplanId}/print`);
  revalidatePath(`/projects/${loc.dagsplan.projectId}`);
  return { ok: true as const, publicPath: saved.publicPath };
}

export async function removeDagsplanLocationParkingImage(locationId: string) {
  const loc = await prisma.dagsplanLocation.findUnique({
    where: { id: locationId },
    select: {
      parkingImageUrl: true,
      dagsplanId: true,
      dagsplan: { select: { projectId: true } },
    },
  });
  if (!loc) return { error: "Ikke funnet" };

  const { flags } = await requireProjectAccess(loc.dagsplan.projectId);
  assertPermission(flags, "canEditDagsplan");

  if (isPublicUploadPath(loc.parkingImageUrl)) {
    await removePublicUploadFile(loc.parkingImageUrl);
  }
  await prisma.$transaction([
    prisma.dagsplanLocation.update({
      where: { id: locationId },
      data: { parkingImageUrl: null },
    }),
    prisma.dagsplan.update({
      where: { id: loc.dagsplanId },
      data: { updatedAt: new Date() },
    }),
  ]);
  revalidatePath(`/dagsplaner/${loc.dagsplanId}`);
  revalidatePath(`/dagsplaner/${loc.dagsplanId}/print`);
  revalidatePath(`/projects/${loc.dagsplan.projectId}`);
  return { ok: true as const };
}

export async function uploadDagsplanImageAsset(
  projectId: string,
  formData: FormData,
) {
  const file = formData.get("shotImage");
  if (!(file instanceof File) || file.size === 0) return { error: "Velg en fil" };
  const { flags } = await requireProjectAccess(projectId);
  assertPermission(flags, "canEditDagsplan");
  const saved = await saveUploadedLogo(file, "dagsplanScheduleShot", projectId, {
    maxBytes: MAX_SCHEDULE_SHOT_IMAGE_BYTES,
  });
  if (!saved.ok) return { error: saved.error };
  const asset = await prisma.dagsplanImageAsset.upsert({
    where: { projectId_url: { projectId, url: saved.publicPath } },
    create: { projectId, url: saved.publicPath, name: file.name },
    update: { name: file.name },
    select: { id: true, url: true, name: true },
  });
  revalidatePath(`/projects/${projectId}`);
  return { ok: true as const, asset };
}

export async function uploadDagsplanScheduleShot(
  scheduleEntryId: string,
  formData: FormData,
) {
  const file = formData.get("shotImage");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Velg en fil" };
  }
  const row = await prisma.dagsplanScheduleEntry.findUnique({
    where: { id: scheduleEntryId },
    select: {
      id: true,
      shotImageUrl: true,
      dagsplanId: true,
      dagsplan: { select: { projectId: true } },
    },
  });
  if (!row) return { error: "Ikke funnet" };

  const { flags } = await requireProjectAccess(row.dagsplan.projectId);
  assertPermission(flags, "canEditDagsplan");

  const saved = await saveUploadedLogo(file, "dagsplanScheduleShot", row.id, {
    maxBytes: MAX_SCHEDULE_SHOT_IMAGE_BYTES,
  });
  if (!saved.ok) return { error: saved.error };

  if (isPublicUploadPath(row.shotImageUrl)) {
    await removePublicUploadFile(row.shotImageUrl);
  }

  await prisma.$transaction([
    prisma.dagsplanScheduleEntry.update({
      where: { id: scheduleEntryId },
      data: { shotImageUrl: saved.publicPath },
    }),
    prisma.dagsplan.update({
      where: { id: row.dagsplanId },
      data: { updatedAt: new Date() },
    }),
  ]);

  revalidatePath(`/dagsplaner/${row.dagsplanId}`);
  revalidatePath(`/dagsplaner/${row.dagsplanId}/print`);
  revalidatePath(`/projects/${row.dagsplan.projectId}`);
  return { ok: true as const, publicPath: saved.publicPath };
}

export async function removeDagsplanScheduleShot(scheduleEntryId: string) {
  const row = await prisma.dagsplanScheduleEntry.findUnique({
    where: { id: scheduleEntryId },
    select: {
      shotImageUrl: true,
      dagsplanId: true,
      dagsplan: { select: { projectId: true } },
    },
  });
  if (!row) return { error: "Ikke funnet" };

  const { flags } = await requireProjectAccess(row.dagsplan.projectId);
  assertPermission(flags, "canEditDagsplan");

  if (isPublicUploadPath(row.shotImageUrl)) {
    await removePublicUploadFile(row.shotImageUrl);
  }
  await prisma.$transaction([
    prisma.dagsplanScheduleEntry.update({
      where: { id: scheduleEntryId },
      data: { shotImageUrl: null },
    }),
    prisma.dagsplan.update({
      where: { id: row.dagsplanId },
      data: { updatedAt: new Date() },
    }),
  ]);
  revalidatePath(`/dagsplaner/${row.dagsplanId}`);
  revalidatePath(`/dagsplaner/${row.dagsplanId}/print`);
  revalidatePath(`/projects/${row.dagsplan.projectId}`);
  return { ok: true as const };
}

const saveDagsplanLocationsSchema = z.object({
  dagsplanId: z.string(),
  locationRows: z.array(locationRowSchema),
});

/** Lagrer alle locations for en dagsplan (felt + rekkefølge). Brukes fra «Lagre» under hver lokasjon. */
export async function saveDagsplanLocations(
  payload: unknown,
): Promise<{ error?: string } | null> {
  const parsed = saveDagsplanLocationsSchema.safeParse(payload);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ugyldig data" };
  }
  const { dagsplanId, locationRows } = parsed.data;

  const dp = await prisma.dagsplan.findUnique({
    where: { id: dagsplanId },
    select: { id: true, projectId: true },
  });
  if (!dp) return { error: "Dagsplan ikke funnet" };

  const { flags } = await requireProjectAccess(dp.projectId);
  assertPermission(flags, "canEditDagsplan");

  const allowedLocationIds = new Set(
    (
      await prisma.dagsplanLocation.findMany({
        where: { dagsplanId },
        select: { id: true },
      })
    ).map((x) => x.id),
  );

  for (const r of locationRows) {
    if (!allowedLocationIds.has(r.id)) {
      return { error: "Ugyldig location" };
    }
  }

  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < locationRows.length; i++) {
      const r = locationRows[i];
      await tx.dagsplanLocation.update({
        where: { id: r.id },
        data: {
          sortOrder: i,
          locationName: r.locationName?.trim() || null,
          locationText: r.locationText?.trim() || null,
          locationMapsUrl: r.locationMapsUrl?.trim() || null,
          latitude: r.latitude ?? null,
          longitude: r.longitude ?? null,
          parkingText: r.parkingText?.trim() || null,
          parkingMapsUrl: r.parkingMapsUrl?.trim() || null,
        },
      });
    }
    await tx.dagsplan.update({
      where: { id: dagsplanId },
      data: { updatedAt: new Date() },
    });
  });

  revalidatePath(`/projects/${dp.projectId}`);
  revalidatePath(`/dagsplaner/${dagsplanId}`);
  revalidatePath(`/dagsplaner/${dagsplanId}/print`);
  return null;
}

export async function addDagsplanLocation(dagsplanId: string) {
  const dp = await prisma.dagsplan.findUnique({
    where: { id: dagsplanId },
    select: {
      id: true,
      projectId: true,
      locations: {
        orderBy: { sortOrder: "desc" },
        take: 1,
        select: { sortOrder: true },
      },
    },
  });
  if (!dp) return { error: "Ikke funnet" as const };

  const { flags } = await requireProjectAccess(dp.projectId);
  assertPermission(flags, "canEditDagsplan");

  const sortOrder = (dp.locations[0]?.sortOrder ?? -1) + 1;
  const created = await prisma.$transaction(async (tx) => {
    const loc = await tx.dagsplanLocation.create({
      data: { dagsplanId, sortOrder },
    });
    await tx.dagsplan.update({
      where: { id: dagsplanId },
      data: { updatedAt: new Date() },
    });
    return loc;
  });
  revalidatePath(`/dagsplaner/${dagsplanId}`);
  revalidatePath(`/dagsplaner/${dagsplanId}/print`);
  revalidatePath(`/projects/${dp.projectId}`);
  return { id: created.id };
}

export async function removeDagsplanLocation(locationId: string) {
  const loc = await prisma.dagsplanLocation.findUnique({
    where: { id: locationId },
    select: {
      parkingImageUrl: true,
      dagsplanId: true,
      dagsplan: { select: { projectId: true } },
    },
  });
  if (!loc) return { error: "Ikke funnet" as const };

  const { flags } = await requireProjectAccess(loc.dagsplan.projectId);
  assertPermission(flags, "canEditDagsplan");

  await prisma.$transaction([
    prisma.dagsplanLocation.delete({ where: { id: locationId } }),
    prisma.dagsplan.update({
      where: { id: loc.dagsplanId },
      data: { updatedAt: new Date() },
    }),
  ]);
  revalidatePath(`/dagsplaner/${loc.dagsplanId}`);
  revalidatePath(`/dagsplaner/${loc.dagsplanId}/print`);
  revalidatePath(`/projects/${loc.dagsplan.projectId}`);
  if (isPublicUploadPath(loc.parkingImageUrl)) {
    const parkingImageUrl = loc.parkingImageUrl;
    after(async () => {
      try {
        await removePublicUploadFile(parkingImageUrl);
      } catch (error) {
        console.error("Kunne ikke rydde parkeringsbildet etter sletting", error);
      }
    });
  }
  return { ok: true as const };
}
