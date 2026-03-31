"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { WeatherIconKind } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  DEFAULT_DAGSPLAN_EMERGENCY,
  DEFAULT_DAGSPLAN_RADIO,
} from "@/lib/dagsplan-defaults";
import {
  isPublicUploadPath,
  removePublicUploadFile,
  saveUploadedLogo,
} from "@/lib/logo-upload";
import { MAX_PARKING_IMAGE_BYTES } from "@/lib/upload-limits";
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
  actorNumber: z.string(),
  actorName: z.string(),
  phone: z.string().optional().default(""),
  film: z.string().optional().default(""),
  meetTime: z.string().optional().default(""),
  readyOnSetTime: z.string().optional().default(""),
  sortOrder: z.number(),
});

const scheduleRowSchema = z.object({
  startTime: z.string().optional().default(""),
  endTime: z.string().optional().default(""),
  durationMinutes: z.number().int().min(0).max(24 * 60).optional().default(30),
  rowKind: z
    .enum(["anchor", "sequential", "free"])
    .optional()
    .default("sequential"),
  interiorExterior: z.string().optional().default(""),
  dayNight: z.string().optional().default(""),
  sceneSetting: z.string().optional().default(""),
  info: z.string().optional().default(""),
  actorNumbers: z.string().optional().default(""),
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
  locationRows: z.array(locationRowSchema),
  infoText: z.string().nullable().optional(),
  weatherIcon: z.nativeEnum(WeatherIconKind).optional().default(WeatherIconKind.none),
  weatherTempMin: z.number().int().nullable().optional(),
  weatherTempMax: z.number().int().nullable().optional(),
  weatherText: z.string().nullable().optional(),
  emergencyNumbersText: z.string().nullable().optional(),
  radioChannelsText: z.string().nullable().optional(),
  printIncludeActors: z.boolean().optional().default(true),
  printIncludeDepartmentInfo: z.boolean().optional().default(true),
  crewRows: z.array(crewRowSchema),
  actorRows: z.array(actorRowSchema),
  scheduleRows: z.array(scheduleRowSchema),
  departmentRows: z.array(deptRowSchema),
});

export async function getDagsplanById(id: string) {
  return prisma.dagsplan.findUnique({
    where: { id },
    include: {
      project: {
        include: {
          agency: true,
          customer: true,
        },
      },
      locations: { orderBy: { sortOrder: "asc" } },
      crewEntries: { orderBy: { sortOrder: "asc" } },
      actorEntries: { orderBy: { sortOrder: "asc" } },
      scheduleEntries: { orderBy: { sortOrder: "asc" } },
      departmentInfos: { orderBy: { sortOrder: "asc" } },
    },
  });
}

export async function getProjectCrewForDagsplan(projectId: string) {
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

export type CrewDatabasePersonOption = {
  personId: string;
  departmentTitle: string;
  personName: string;
  mobile: string;
  email: string;
};

/** Aktive personer i crew-databasen — til «Oppmøtetid» (stabsliste-lignende felt). */
export async function getCrewDatabaseForDagsplan(): Promise<
  CrewDatabasePersonOption[]
> {
  const people = await prisma.person.findMany({
    where: { isActive: true },
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

  await prisma.$transaction(async (tx) => {
    await tx.dagsplan.update({
      where: { id: d.id },
      data: {
        title: d.title.trim(),
        shootDate,
        workStartTime: d.workStartTime?.trim() || null,
        workEndTime: d.workEndTime?.trim() || null,
        agencyLogoUrl: d.agencyLogoUrl?.trim() || null,
        clientLogoUrl: d.clientLogoUrl?.trim() || null,
        infoText: d.infoText?.trim() || null,
        weatherIcon: d.weatherIcon,
        weatherTempMin: d.weatherTempMin ?? null,
        weatherTempMax: d.weatherTempMax ?? null,
        weatherText: d.weatherText?.trim() || null,
        emergencyNumbersText: d.emergencyNumbersText?.trim() || null,
        radioChannelsText: d.radioChannelsText?.trim() || null,
        printIncludeActors: d.printIncludeActors,
        printIncludeDepartmentInfo: d.printIncludeDepartmentInfo,
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
          parkingText: r.parkingText?.trim() || null,
          parkingMapsUrl: r.parkingMapsUrl?.trim() || null,
          parkingImageUrl: r.parkingImageUrl?.trim() || null,
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
          phone: r.phone || null,
          film: r.film || null,
          meetTime: r.meetTime || null,
          readyOnSetTime: r.readyOnSetTime || null,
          sortOrder: r.sortOrder,
        })),
      });
    }
    if (d.scheduleRows.length) {
      await tx.dagsplanScheduleEntry.createMany({
        data: d.scheduleRows.map((r) => ({
          dagsplanId: d.id,
          startTime: r.startTime || null,
          endTime: r.endTime || null,
          durationMinutes: r.durationMinutes ?? 30,
          rowKind: r.rowKind ?? "sequential",
          interiorExterior: r.interiorExterior || null,
          dayNight: r.dayNight || null,
          sceneSetting: r.sceneSetting || null,
          info: r.info || null,
          actorNumbers: r.actorNumbers || null,
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
        infoText: src.infoText,
        weatherIcon: src.weatherIcon,
        weatherTempMin: src.weatherTempMin,
        weatherTempMax: src.weatherTempMax,
        weatherText: src.weatherText,
        emergencyNumbersText: src.emergencyNumbersText,
        radioChannelsText: src.radioChannelsText,
        printIncludeActors: src.printIncludeActors,
        printIncludeDepartmentInfo: src.printIncludeDepartmentInfo,
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
        data: src.actorEntries.map((r) => ({
          dagsplanId: d.id,
          actorNumber: r.actorNumber,
          actorName: r.actorName,
          phone: r.phone,
          film: r.film,
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
          info: r.info,
          actorNumbers: r.actorNumbers,
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
      locations: { select: { parkingImageUrl: true } },
    },
  });
  if (!row) return;
  if (isPublicUploadPath(row.agencyLogoUrl)) {
    await removePublicUploadFile(row.agencyLogoUrl);
  }
  if (isPublicUploadPath(row.clientLogoUrl)) {
    await removePublicUploadFile(row.clientLogoUrl);
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
  which: "agency" | "client",
  formData: FormData,
) {
  const file = formData.get("logoFile");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Velg en fil" };
  }
  const d = await prisma.dagsplan.findUnique({
    where: { id: dagsplanId },
    select: { id: true, agencyLogoUrl: true, clientLogoUrl: true, projectId: true },
  });
  if (!d) return { error: "Ikke funnet" };

  const entity = which === "agency" ? "dagsplanAgency" : "dagsplanClient";
  const saved = await saveUploadedLogo(file, entity, d.id);
  if (!saved.ok) return { error: saved.error };

  const prev = which === "agency" ? d.agencyLogoUrl : d.clientLogoUrl;
  if (isPublicUploadPath(prev)) await removePublicUploadFile(prev);

  await prisma.dagsplan.update({
    where: { id: dagsplanId },
    data:
      which === "agency"
        ? { agencyLogoUrl: saved.publicPath }
        : { clientLogoUrl: saved.publicPath },
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
  return { ok: true as const };
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
          parkingText: r.parkingText?.trim() || null,
          parkingMapsUrl: r.parkingMapsUrl?.trim() || null,
          parkingImageUrl: r.parkingImageUrl?.trim() || null,
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
    select: { id: true, projectId: true },
  });
  if (!dp) return { error: "Ikke funnet" as const };
  const agg = await prisma.dagsplanLocation.aggregate({
    where: { dagsplanId },
    _max: { sortOrder: true },
  });
  const sortOrder = (agg._max.sortOrder ?? -1) + 1;
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
  if (isPublicUploadPath(loc.parkingImageUrl)) {
    await removePublicUploadFile(loc.parkingImageUrl);
  }
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
  return { ok: true as const };
}
