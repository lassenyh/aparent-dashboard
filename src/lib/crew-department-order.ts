import type { Person, ProjectCrew } from "@prisma/client";
import { resolveRoleForProject } from "@/lib/snapshot";

/** Tvungen avdelingsrekkefølge ved import fra prosjektcrew; ukjente titler sist. */
export const CREW_DEPARTMENT_ORDER_LABELS = [
  "Produsent",
  "Regissør",
  "Regi-assistent",
  "Innspillingsleder",
  "Fotograf",
  "B-foto",
  "Kamera-assistent",
  "Lysmester",
  "Lys-assistent",
  "MUA",
  "Makeup-artist",
  "MUA-assistent",
  "Produksjonsassistent",
  "Lyd",
  "Kunde",
  "Byrå",
] as const;

const UNKNOWN_RANK = 1000;

function normalizeDeptTitle(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "o")
    .replace(/å/g, "a")
    .replace(/\s+/g, " ");
}

/**
 * Lavere tall = tidligere i listen. Ukjent avdeling får samme «bak»-rang
 * og sorteres videre med tie-break (f.eks. prosjektets sortOrder).
 */
export function departmentOrderRank(title: string): number {
  const t = normalizeDeptTitle(title);

  if (t.includes("produsent") || /\bproducer\b/.test(t)) return 0;

  if (
    t.includes("regi-assistent") ||
    t.includes("regi assistent") ||
    t.includes("regiassistent")
  ) {
    return 2;
  }

  if (
    t.includes("innspillingsleder") ||
    t.includes("1st ad") ||
    t.includes("1. ad") ||
    t.includes("1 ad") ||
    /\b1st\b.*\bad\b/.test(t)
  ) {
    return 3;
  }

  if (
    t.includes("b-foto") ||
    t.includes("b-fotograf") ||
    t.includes("b foto") ||
    t.includes("bfoto") ||
    /\bb\s*foto\b/.test(t)
  ) {
    return 5;
  }
  if (
    t.includes("fotograf") ||
    /\bdp\b/.test(t) ||
    /\bdop\b/.test(t) ||
    t.includes("director of photography") ||
    (/\bdirector\b/.test(t) && t.includes("photography"))
  ) {
    return 4;
  }

  if (
    t.includes("regissor") ||
    (/\bdirector\b/.test(t) && !t.includes("photography"))
  ) {
    return 1;
  }

  if (
    t.includes("kamera-assistent") ||
    t.includes("kamera assistent") ||
    t.includes("kameraassistent") ||
    /\b1st ac\b/.test(t) ||
    /\b2nd ac\b/.test(t) ||
    (/\bac\b/.test(t) && !t.includes("regi"))
  ) {
    return 6;
  }

  if (t.includes("lysmester") || t.includes("gaffer")) return 7;

  if (t.includes("lys-assistent") || t.includes("lys assistent")) return 8;

  if (t.includes("mua-assistent") || t.includes("mua assistent")) return 11;

  if (
    t.includes("makeup") ||
    t.includes("make-up") ||
    t.includes("sminkør") ||
    t.includes("sminkor") ||
    t.includes("hair") ||
    t.includes("sminke")
  ) {
    return 10;
  }

  if (t === "mua" || /\bmua\b/.test(t)) return 9;

  if (
    t.includes("produksjonsassistent") ||
    t.includes("produksjons assistent") ||
    /\bpa\b/.test(t) ||
    t.includes("production assistant")
  ) {
    return 12;
  }

  if (
    /\b(sound|lyd)\b/.test(t) ||
    t.includes("lydtekniker") ||
    t.includes("boom") ||
    t.includes("mixer")
  ) {
    return 13;
  }

  if (t.includes("kunde") || t.includes("client")) return 14;

  if (t.includes("byra") || t.includes("agency")) return 15;

  return UNKNOWN_RANK;
}

/** Sorter prosjektcrew-rader: avdelingsrekkefølge, deretter prosjekt sortOrder, deretter opprettet. */
export function compareCrewDepartmentOrder(
  departmentTitleA: string,
  departmentTitleB: string,
  projectSortOrderA: number,
  projectSortOrderB: number,
  createdAtA: number,
  createdAtB: number,
): number {
  const ra = departmentOrderRank(departmentTitleA);
  const rb = departmentOrderRank(departmentTitleB);
  if (ra !== rb) return ra - rb;
  if (projectSortOrderA !== projectSortOrderB) {
    return projectSortOrderA - projectSortOrderB;
  }
  return createdAtA - createdAtB;
}

type ProjectCrewWithPerson = ProjectCrew & { person: Person };

/** Sorter aktivt prosjektcrew etter avdelingsrekkefølge (og deretter prosjektets egen orden). */
export function sortProjectCrewByDepartmentOrder(
  rows: ProjectCrewWithPerson[],
): ProjectCrewWithPerson[] {
  return [...rows].sort((a, b) =>
    compareCrewDepartmentOrder(
      resolveRoleForProject(a),
      resolveRoleForProject(b),
      a.sortOrder ?? 0,
      b.sortOrder ?? 0,
      a.createdAt.getTime(),
      b.createdAt.getTime(),
    ),
  );
}

/**
 * Dagsplan oppmøtetid-rader: samme avdelingsrekkefølge som import/prosjektcrew.
 * Ved lik rang: behold eksisterende rekkefølge (indeks som tie-break).
 */
export function sortDagsplanCrewRowsByDepartmentOrder<
  T extends { departmentTitle: string },
>(rows: T[]): T[] {
  return [...rows]
    .map((row, index) => ({ row, index }))
    .sort((a, b) =>
      compareCrewDepartmentOrder(
        a.row.departmentTitle,
        b.row.departmentTitle,
        a.index,
        b.index,
        a.index,
        b.index,
      ),
    )
    .map(({ row }) => row);
}
