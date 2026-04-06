import type { Person, ProjectCrew } from "@prisma/client";
import { resolveRoleForProject } from "@/lib/snapshot";

/**
 * Standard rekkefølge for funksjoner (visningsnavn på norsk).
 * Engelske rolletitler håndteres i `departmentOrderRank` (samme prioritering når UI er på engelsk).
 */
export const CREW_DEPARTMENT_ORDER_LABELS = [
  "Produsent",
  "Regissør",
  "Produksjonsleder",
  "Innspillingsleder",
  "Foto",
  "B-foto",
  "Kamera-assistent",
  "Lysmester",
  "Lys-assistent",
  "MUA",
  "Kostyme",
  "Rekvisitør",
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

  /* B-foto før generell «foto» / DOP */
  if (
    t.includes("b-foto") ||
    t.includes("b-fotograf") ||
    t.includes("b foto") ||
    /\bb\s*foto\b/.test(t)
  ) {
    return 5;
  }

  /* Foto / DOP / DP (inkl. «Fotograf», director of photography) */
  if (
    t === "foto" ||
    t.includes("fotograf") ||
    /\bdp\b/.test(t) ||
    /\bdop\b/.test(t) ||
    t.includes("director of photography") ||
    (/\bdirector\b/.test(t) && t.includes("photography"))
  ) {
    return 4;
  }

  /* Regissør / Director — ikke photography (over) */
  if (
    t.includes("regissor") ||
    (/\bdirector\b/.test(t) && !t.includes("photography"))
  ) {
    return 1;
  }

  if (
    t.includes("produksjonsleder") ||
    /\bproduction manager\b/.test(t) ||
    /\bprod\.?\s*manager\b/.test(t)
  ) {
    return 2;
  }

  if (
    t.includes("innspillingsleder") ||
    /\b1st\s*ad\b/.test(t) ||
    /\bfirst\s*ad\b/.test(t) ||
    /\b1\.?\s*ad\b/.test(t) ||
    (/\b1\s*ad\b/.test(t) && !t.includes("kamera"))
  ) {
    return 3;
  }

  /* Ofte synonym med B-foto-linjen */
  if (/\b1st\s*ac\b/.test(t) || /\bfirst\s*ac\b/.test(t)) return 5;

  if (
    t.includes("kamera-assistent") ||
    t.includes("kamera assistent") ||
    t.includes("kameraassistent") ||
    /\b2nd\s*ac\b/.test(t) ||
    /\bsecond\s*ac\b/.test(t) ||
    (/\bac\b/.test(t) && !t.includes("regi"))
  ) {
    return 6;
  }

  if (t.includes("lysmester") || /\bgaffer\b/.test(t)) return 7;

  if (
    t.includes("lys-assistent") ||
    t.includes("lys assistent") ||
    /\bbest\s*boy\b/.test(t) ||
    t.includes("best-boy") ||
    t.includes("bestboy")
  ) {
    return 8;
  }

  if (
    t.includes("mua-assistent") ||
    t.includes("mua assistent") ||
    t.includes("makeup-artist")
  ) {
    return 17;
  }

  if (t === "mua" || /\bmua\b/.test(t)) return 9;

  if (
    t.includes("makeup") ||
    t.includes("make-up") ||
    t.includes("sminkør") ||
    t.includes("sminkor") ||
    t.includes("hair") ||
    t.includes("sminke")
  ) {
    return 9;
  }

  if (t.includes("kostyme") || t.includes("costume")) return 10;

  if (
    t.includes("rekvisit") ||
    t.includes("props master") ||
    (/\bprops\b/.test(t) && !t.includes("byra"))
  ) {
    return 11;
  }

  if (
    t.includes("produksjonsassistent") ||
    t.includes("produksjons assistent") ||
    /\bpa\b/.test(t) ||
    t.includes("production assistant")
  ) {
    return 12;
  }

  if (
    t.includes("regi-assistent") ||
    t.includes("regi assistent") ||
    t.includes("regiassistent")
  ) {
    return 16;
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
