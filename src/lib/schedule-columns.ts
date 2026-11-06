export const SCHEDULE_COLUMN_IDS = [
  "from",
  "to",
  "interiorExterior",
  "dayNight",
  "info",
  "duration",
  "shot",
  "scene",
  "actors",
  "costume",
] as const;

export type ScheduleColumnId = (typeof SCHEDULE_COLUMN_IDS)[number];

export const DEFAULT_SCHEDULE_COLUMN_ORDER: ScheduleColumnId[] = [
  ...SCHEDULE_COLUMN_IDS,
];

const scheduleColumnIdSet = new Set<string>(SCHEDULE_COLUMN_IDS);

export function normalizeScheduleColumnOrder(
  value: readonly string[] | null | undefined,
): ScheduleColumnId[] {
  const seen = new Set<string>();
  const normalized = (value ?? []).filter((id): id is ScheduleColumnId => {
    if (!scheduleColumnIdSet.has(id) || seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  for (const id of SCHEDULE_COLUMN_IDS) {
    if (!seen.has(id)) normalized.push(id);
  }
  return normalized;
}
