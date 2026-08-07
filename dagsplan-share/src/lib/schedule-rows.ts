export type ScheduleRowKind = "anchor" | "sequential" | "free";

/** Lagret i `interiorExterior` — company move-rad (bil-ikon i I/E). */
export const SCHEDULE_INTERIOR_EXTERIOR_TRUCK = "truck";

export type ScheduleRow = {
  id: string;
  rowKind: ScheduleRowKind;
  startTime: string;
  endTime: string;
  /** Internt planleggingsfelt — vises ikke på print. `null` = tom celle under redigering (lagres som 0). */
  durationMinutes: number | null;
  interiorExterior: string;
  dayNight: string;
  sceneSetting: string;
  info: string;
  actorNumbers: string;
  /** Storyboard / referansebilde (én per rad). */
  shotImageUrl: string;
  /** Bakgrunnsfarge for raden (#RRGGBB), tom = standard. */
  rowBgColor: string;
};

/** Parse "HH:mm" to minutes from midnight (local semantics). */
export function parseTimeToMinutes(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(t);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min)) return null;
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

function formatMinutesAsHHmm(m: number): string {
  const h = Math.floor(m / 60) % 24;
  const min = m % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

/**
 * Minste starttid og største sluttid på tvers av timeplanrader (gyldige fra–til).
 * Brukes til «Arbeid fra / til» på dagsplan.
 */
export function inferWorkHoursFromScheduleRows(
  rows: ScheduleRow[],
): { workStartTime: string; workEndTime: string } {
  let minStart: number | null = null;
  let maxEnd: number | null = null;
  for (const r of rows) {
    const startM = parseTimeToMinutes(r.startTime);
    const endM = parseTimeToMinutes(r.endTime);
    if (startM != null) {
      minStart = minStart == null ? startM : Math.min(minStart, startM);
    }
    if (endM != null) {
      maxEnd = maxEnd == null ? endM : Math.max(maxEnd, endM);
    }
  }
  return {
    workStartTime: minStart != null ? formatMinutesAsHHmm(minStart) : "",
    workEndTime: maxEnd != null ? formatMinutesAsHHmm(maxEnd) : "",
  };
}

/** Add minutes to an "HH:mm" time string (handles day rollover in Date). */
export function addMinutesToTimeString(time: string, deltaMin: number): string {
  const t = time.trim();
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return "";
  const d = new Date(2000, 0, 1, h, m, 0);
  d.setMinutes(d.getMinutes() + Math.max(0, deltaMin));
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Infer duration from start/end for legacy rows (best effort). */
export function inferDurationMinutes(
  start: string | null | undefined,
  end: string | null | undefined,
): number {
  const a = parseTimeToMinutes(start ?? "");
  const b = parseTimeToMinutes(end ?? "");
  if (a == null || b == null) return 30;
  let diff = b - a;
  if (diff < 0) diff += 24 * 60;
  return Math.max(0, Math.min(diff, 24 * 60));
}

function isRowKind(s: string | null | undefined): s is ScheduleRowKind {
  return s === "anchor" || s === "sequential" || s === "free";
}

/** Les lagret verdi (inkl. eldre rader uten felt). */
export function parseScheduleRowKind(
  raw: string | null | undefined,
  sortIndex: number,
): ScheduleRowKind {
  if (isRowKind(raw)) return raw;
  return sortIndex === 0 ? "anchor" : "sequential";
}

/**
 * Første rad kan ikke være sequential (blir anker).
 * Etter frifelt kan neste rad være anker eller auto (sequential); begge er gyldige.
 */
export function normalizeScheduleRowKinds(rows: ScheduleRow[]): ScheduleRow[] {
  if (rows.length === 0) return [];
  const out = rows.map((r) => ({ ...r }));
  if (out[0].rowKind === "sequential") {
    out[0] = { ...out[0], rowKind: "anchor" };
  }
  return out;
}

/**
 * Blokkvis sekvens: fri rad bryter kjede; anker starter ny blokk med egen start;
 * sequential følger forrige slutt. Etter frifelt kan sequential bruke sluttid fra
 * siste rad *før* frifeltet (ikke fra frifeltets tider).
 */
export function recalculateScheduleRows(rows: ScheduleRow[]): ScheduleRow[] {
  if (rows.length === 0) return [];
  const base = ensureAnchorRowAfterCallTime(normalizeScheduleRowKinds(rows));
  const out = base.map((r) => ({ ...r }));
  let cur: string | null = null;
  /** Sluttid fra siste anker/sekvens før et frifelt — for «auto» rett etter fri rad. */
  let chainEndBeforeFree: string | null = null;

  for (let i = 0; i < out.length; i++) {
    const row = out[i];
    if (row.rowKind === "free") {
      const dur = inferDurationMinutes(row.startTime, row.endTime);
      out[i] = { ...row, durationMinutes: dur };
      if (cur != null) {
        chainEndBeforeFree = cur;
      }
      cur = null;
      continue;
    }

    if (row.rowKind === "anchor") {
      chainEndBeforeFree = null;
      const start = row.startTime.trim();
      if (!start) {
        out[i] = { ...row, endTime: "" };
        cur = null;
        continue;
      }
      /** Call time: kun oppmøtetid — ingen varighet. Første rad starter ikke kjeden. */
      if (isScheduleCallTimeRow(row)) {
        out[i] = {
          ...row,
          startTime: start,
          endTime: start,
          durationMinutes: 0,
        };
        cur = i === 0 ? null : start;
        continue;
      }
      /** Wrap (anker): kun fra-tid — markør, ingen varighet. */
      if (isScheduleWrapRow(row)) {
        out[i] = {
          ...row,
          startTime: start,
          endTime: start,
          durationMinutes: 0,
        };
        cur = start;
        continue;
      }
      const dur = Math.max(0, Math.floor(row.durationMinutes ?? 0));
      const end = addMinutesToTimeString(start, dur);
      out[i] = { ...row, startTime: start, endTime: end };
      cur = end;
      continue;
    }

    // sequential
    if (!cur) {
      if (chainEndBeforeFree) {
        cur = chainEndBeforeFree;
        chainEndBeforeFree = null;
      } else {
        const start = row.startTime.trim();
        if (!start) {
          out[i] = { ...row, endTime: "" };
          cur = null;
          continue;
        }
        if (isScheduleWrapRow(row)) {
          out[i] = {
            ...row,
            rowKind: "anchor",
            startTime: start,
            endTime: start,
            durationMinutes: 0,
          };
          cur = start;
          continue;
        }
        const dur = Math.max(0, Math.floor(row.durationMinutes ?? 0));
        const end = addMinutesToTimeString(start, dur);
        out[i] = { ...row, rowKind: "anchor", startTime: start, endTime: end };
        cur = end;
        continue;
      }
    }
    if (isScheduleWrapRow(row)) {
      out[i] = {
        ...row,
        startTime: cur,
        endTime: cur,
        durationMinutes: 0,
      };
      continue;
    }
    const dur = Math.max(0, Math.floor(row.durationMinutes ?? 0));
    const end = addMinutesToTimeString(cur, dur);
    out[i] = { ...row, startTime: cur, endTime: end };
    cur = end;
  }
  return out;
}

/** Sum planlagt tid: sekvensrader bruker varighet; frie rader bruker fra–til. */
export function sumScheduleDurationMinutes(rows: ScheduleRow[]): number {
  let acc = 0;
  for (const r of rows) {
    if (r.rowKind === "free") {
      const a = parseTimeToMinutes(r.startTime);
      const b = parseTimeToMinutes(r.endTime);
      if (a != null && b != null) {
        acc += inferDurationMinutes(r.startTime, r.endTime);
      }
      continue;
    }
    acc += Math.max(0, Math.floor(Number(r.durationMinutes) || 0));
  }
  return acc;
}

/** Når øverste rad byttes ved omrokering: behold dagens start for ikke-frie rader. */
export function applyReorderPreserveSchedule(
  previous: ScheduleRow[],
  reordered: ScheduleRow[],
): ScheduleRow[] {
  if (reordered.length === 0) return reordered;
  const prevFirst = previous[0];
  const newFirst = reordered[0];
  if (!prevFirst || !newFirst || newFirst.id === prevFirst.id) return reordered;

  const prevTime = prevFirst.startTime?.trim() ?? "";
  if (!prevTime) return reordered;
  if (newFirst.rowKind === "free") return reordered;

  let nf: ScheduleRow = { ...newFirst };
  if (nf.rowKind === "sequential") {
    nf = { ...nf, rowKind: "anchor" };
  }
  return [{ ...nf, startTime: prevTime }, ...reordered.slice(1)];
}

/** Etter sletting av øverste rad: la neste rad arve starttid (når ikke fri). */
export function applyRemovePreserveSchedule(
  rowsBefore: ScheduleRow[],
  removedIndex: number,
  filtered: ScheduleRow[],
): ScheduleRow[] {
  if (removedIndex !== 0 || filtered.length === 0) return filtered;
  const anchorTime = rowsBefore[0]?.startTime?.trim();
  if (!anchorTime) return filtered;
  const nf = filtered[0];
  if (nf.rowKind === "free") return filtered;
  const promoted =
    nf.rowKind === "sequential" ? { ...nf, rowKind: "anchor" as const } : nf;
  return [{ ...promoted, startTime: anchorTime }, ...filtered.slice(1)];
}

export function emptyScheduleRow(
  id: string,
  kind: "sequential" | "anchor" | "free",
): ScheduleRow {
  return {
    id,
    rowKind: kind,
    startTime: "",
    endTime: "",
    durationMinutes: kind === "free" ? 0 : 30,
    interiorExterior: "",
    dayNight: "",
    sceneSetting: "",
    info: "",
    actorNumbers: "",
    shotImageUrl: "",
    rowBgColor: "",
  };
}

/** Info (eldre rader: scene/setting) «Lunsj» — rød markering i tabell og print. */
export function isScheduleLunchRow(row: {
  info?: string | null;
  sceneSetting?: string | null;
}): boolean {
  const t = row.info?.trim().toLowerCase();
  if (t === "lunsj") return true;
  return row.sceneSetting?.trim().toLowerCase() === "lunsj";
}

/** Info «Call time» — markør med kun starttid (ingen varighet). */
export const SCHEDULE_CALL_TIME_INFO = "Call time";

export function isScheduleCallTimeRow(row: { info?: string | null }): boolean {
  return row.info?.trim() === SCHEDULE_CALL_TIME_INFO;
}

/** Info «Wrap» — kun starttid (markør), samme kjede-logikk som call time uten posisjonskrav. */
export const SCHEDULE_WRAP_INFO = "Wrap";
export const SCHEDULE_PRE_WRAP_INFO = "Pre-wrap";

export function isScheduleWrapRow(row: { info?: string | null }): boolean {
  const info = row.info?.trim();
  return info === SCHEDULE_WRAP_INFO || info === SCHEDULE_PRE_WRAP_INFO;
}

/** Etter «Call time» (rad 0) skal neste rad være anker med egen fra-tid (ikke kopiert fra call time). */
function ensureAnchorRowAfterCallTime(rows: ScheduleRow[]): ScheduleRow[] {
  if (rows.length < 2) return rows;
  if (!isScheduleCallTimeRow(rows[0])) return rows;
  const out = rows.map((r) => ({ ...r }));
  if (out[1].rowKind === "free") return out;
  out[1] = { ...out[1], rowKind: "anchor" };
  return out;
}

export function scheduleHasCallTimeFirstRow(rows: ScheduleRow[]): boolean {
  return rows.length > 0 && isScheduleCallTimeRow(rows[0]);
}

/** Beholder signatur av bakoverkompatibilitet; call time er nå tillatt på flere rader. */
export function normalizeCallTimeOnlyOnFirst(rows: ScheduleRow[]): ScheduleRow[] {
  return rows;
}

/** Velg kind for ny «+ Rad» ut fra siste rad. */
export function rowKindForNewSequentialRow(last: ScheduleRow | undefined): "anchor" | "sequential" {
  if (!last) return "anchor";
  if (last.rowKind === "free") return "anchor";
  /** Første rad etter «Call time» er anker med egen starttid. */
  if (isScheduleCallTimeRow(last)) return "anchor";
  return "sequential";
}

/**
 * Finnes det en ikke-fri rad før fri-blokken som ender rett før `index`?
 * Da kan rad `index` (anker etter fri) gjøres om til auto som følger den kjeden.
 */
export function hasChainBeforeFreeBlock(
  rows: ScheduleRow[],
  indexAfterFreeBlock: number,
): boolean {
  if (indexAfterFreeBlock <= 0) return false;
  let j = indexAfterFreeBlock - 1;
  while (j >= 0 && rows[j].rowKind === "free") j--;
  if (j < 0) return false;
  const kind = rows[j].rowKind;
  return kind === "anchor" || kind === "sequential";
}

/**
 * Anker kan gjøres om til auto (følger forrige rad) når det finnes en rad å følge.
 * Etter frifelt: kun når det finnes en timeplan-rad før fri-blokken å koble til.
 */
export function canDemoteAnchorRow(rows: ScheduleRow[], index: number): boolean {
  if (index <= 0) return false;
  if (rows[index]?.rowKind !== "anchor") return false;
  if (rows[index - 1]?.rowKind === "free") {
    return hasChainBeforeFreeBlock(rows, index);
  }
  return true;
}
