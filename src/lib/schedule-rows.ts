export type ScheduleRowKind = "anchor" | "sequential" | "free";

export type ScheduleRow = {
  id: string;
  rowKind: ScheduleRowKind;
  startTime: string;
  endTime: string;
  /** Internt planleggingsfelt — vises ikke på print. For fri rad: kan speile varighet. */
  durationMinutes: number;
  interiorExterior: string;
  dayNight: string;
  sceneSetting: string;
  info: string;
  actorNumbers: string;
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
  const base = normalizeScheduleRowKinds(rows);
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
        const dur = Math.max(0, Math.floor(row.durationMinutes ?? 0));
        const end = addMinutesToTimeString(start, dur);
        out[i] = { ...row, rowKind: "anchor", startTime: start, endTime: end };
        cur = end;
        continue;
      }
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

/** Velg kind for ny «+ Rad» ut fra siste rad. */
export function rowKindForNewSequentialRow(last: ScheduleRow | undefined): "anchor" | "sequential" {
  if (!last) return "anchor";
  if (last.rowKind === "free") return "anchor";
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
