"use client";

import { useMemo } from "react";
import {
  getScheduleTableStrings,
  getShotDropzoneStringsFull,
  type DagsplanLocale,
  type ScheduleTableT,
  type ShotDropzoneStrings,
} from "@/lib/dagsplan-i18n";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Anchor, GripVertical, Truck } from "lucide-react";
import { ScheduleRowColorPopover } from "@/components/dagsplan/schedule-row-color-popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  applyRemovePreserveSchedule,
  applyReorderPreserveSchedule,
  canDemoteAnchorRow,
  isScheduleCallTimeRow,
  isScheduleLunchRow,
  isScheduleWrapRow,
  normalizeCallTimeOnlyOnFirst,
  recalculateScheduleRows,
  SCHEDULE_INTERIOR_EXTERIOR_TRUCK,
  sumScheduleDurationMinutes,
  type ScheduleRow,
} from "@/lib/schedule-rows";
import {
  effectiveSunriseDisplay,
  effectiveSunsetDisplay,
} from "@/lib/sunrise-oslo";
import { cn } from "@/lib/utils";
import { ScheduleShotDropzone } from "@/components/dagsplan/schedule-shot-dropzone";
import { normalizeScheduleRowBgColor } from "@/lib/schedule-row-colors";

export type { ScheduleRow };

const SCHEDULE_TABLE_INPUT = "h-7 min-h-7 px-2 text-xs";

/** Må fylle cellen (w-full); fast kolonnebredd styres av <col> + td. */
const SCHEDULE_SELECT_TRIGGER =
  "h-7 min-h-7 w-full min-w-0 max-w-full gap-0 px-1 py-0 text-xs [&>svg]:h-3 [&>svg]:w-3 [&>svg]:shrink-0 [&>svg]:opacity-60";

function toIESelectValue(v: string): "I" | "E" | "truck" | "_empty" {
  const t = v.trim();
  if (t === "I" || t === "i") return "I";
  if (t === "E" || t === "e") return "E";
  if (t.toLowerCase() === SCHEDULE_INTERIOR_EXTERIOR_TRUCK) return "truck";
  return "_empty";
}

function toDNSelectValue(v: string): "D" | "N" | "_empty" {
  const t = v.trim();
  if (t === "D" || t === "d") return "D";
  if (t === "N" || t === "n") return "N";
  return "_empty";
}

function formatTotalScheduleMinutes(
  total: number,
  st: ScheduleTableT,
): string {
  if (total <= 0) return `0 ${st.min}`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} ${st.min}`;
  if (m === 0) return `${h} ${st.h}`;
  return `${h} ${st.h} ${m} ${st.min}`;
}

/** Verdi til <input type="time" /> (HH:mm). */
function toTimeInputValue(display: string): string {
  const t = display.trim();
  if (!t || t === "—") return "";
  const m = t.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return "";
  const h = Math.min(23, Math.max(0, parseInt(m[1], 10)));
  const min = Math.min(59, Math.max(0, parseInt(m[2], 10)));
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function RowActions({
  onMoveUp,
  onMoveDown,
  onRemove,
  disableUp,
  disableDown,
}: {
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  disableUp: boolean;
  disableDown: boolean;
}) {
  return (
    <div className="flex shrink-0 flex-row flex-wrap items-center justify-end gap-0.5">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 w-7 shrink-0 px-0 text-xs"
        disabled={disableUp}
        onClick={onMoveUp}
      >
        ↑
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 w-7 shrink-0 px-0 text-xs"
        disabled={disableDown}
        onClick={onMoveDown}
      >
        ↓
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 w-7 shrink-0 px-0 text-xs text-muted-foreground"
        onClick={onRemove}
      >
        ×
      </Button>
    </div>
  );
}

function SortableScheduleRow({
  row,
  index,
  total,
  showShotColumn,
  st,
  locale,
  shotStrings,
  onPatch,
  onSetAnchor,
  onDemoteAnchor,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  row: ScheduleRow;
  index: number;
  total: number;
  showShotColumn: boolean;
  st: ScheduleTableT;
  locale: DagsplanLocale;
  shotStrings: ShotDropzoneStrings;
  onPatch: (id: string, patch: Partial<ScheduleRow>) => void;
  onSetAnchor?: () => void;
  onDemoteAnchor?: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}) {
  const lockCallTimeRow = index === 0 && isScheduleCallTimeRow(row);
  const hideEndDurationRow = lockCallTimeRow || isScheduleWrapRow(row);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row.id, disabled: lockCallTimeRow });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : undefined,
  };

  const isFree = row.rowKind === "free";
  const isAnchor = row.rowKind === "anchor";
  const isLunch = isScheduleLunchRow(row);

  const editableStart = isFree || isAnchor;
  const editableEnd = isFree;
  /** Call time / Wrap: kun fra-tid, ingen varighet. */
  const editableDuration = !isFree && !hideEndDurationRow;

  const rowBg = normalizeScheduleRowBgColor(row.rowBgColor);
  const hasCustomBg = Boolean(rowBg);

  return (
    <tr
      ref={setNodeRef}
      style={{
        ...style,
        ...(hasCustomBg ? { backgroundColor: rowBg } : {}),
      }}
      className={cn(
        "border-b border-border/60",
        !hasCustomBg && isFree && "bg-amber-500/[0.06] dark:bg-amber-950/25",
        isAnchor && "border-l-2 border-primary/45",
        isLunch &&
          "text-destructive [&>td:first-child]:text-muted-foreground [&>td:last-child]:text-muted-foreground [&>td:last-child_button]:text-muted-foreground [&>td:last-child_button:hover]:text-foreground",
      )}
    >
      <td className="w-10 py-0.5 pr-0.5 align-middle">
        <div className="flex flex-col items-center gap-1">
        <button
          type="button"
          className={cn(
            "touch-none rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground",
            lockCallTimeRow && "cursor-not-allowed opacity-50 hover:bg-transparent",
          )}
          aria-label={st.moveRow}
          {...attributes}
          {...listeners}
        >
            <GripVertical className="h-4 w-4" />
          </button>
          <ScheduleRowColorPopover
            value={row.rowBgColor}
            onChange={(hex) =>
              onPatch(row.id, {
                rowBgColor: normalizeScheduleRowBgColor(hex),
              })
            }
          />
        </div>
      </td>
      <td className="w-14 py-0.5 pr-1 align-middle">
        {isFree ? (
          <span
            className={cn(
              "inline-flex h-7 min-w-[3.25rem] items-center justify-center rounded-md border px-1.5 text-[10px] transition-colors",
              "border-border bg-background text-muted-foreground",
              isLunch && "border-destructive/40 text-destructive",
            )}
            aria-label={st.freeRow}
          >
            {st.freeRowShort}
          </span>
        ) : (
          <button
            type="button"
            onClick={() => {
              if (isAnchor) onDemoteAnchor?.();
              else onSetAnchor?.();
            }}
            disabled={
              (isAnchor && !onDemoteAnchor) || (!isAnchor && !onSetAnchor)
            }
            aria-label={
              isAnchor
                ? onDemoteAnchor
                  ? "Anker — bytt til auto (følg forrige rad før frifelt)"
                  : "Anker (kan ikke byttes her)"
                : onSetAnchor
                  ? "Auto — bytt til anker med egen starttid"
                  : "Auto"
            }
            title={
              isAnchor
                ? onDemoteAnchor
                  ? "Fjern anker — følg forrige rad i sekvensen (etter frifelt: fra siste rad før frifeltet)"
                  : "Kan ikke fjerne anker her (første rad, eller ingen timeplan-rad før fri rad å følge)"
                : onSetAnchor
                  ? "Gjør til anker (egen starttid)"
                  : "Auto"
            }
            onPointerDown={(e) => e.stopPropagation()}
            className={cn(
              "inline-flex h-7 min-w-[3.25rem] items-center justify-center rounded-md border px-1.5 text-[10px] transition-colors",
              "hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "disabled:pointer-events-none disabled:opacity-50",
              isAnchor
                ? "border-primary/40 bg-primary/5 text-foreground"
                : "border-border bg-background text-muted-foreground",
              isLunch && "border-destructive/40 text-destructive",
            )}
          >
            {isAnchor ? (
              <Anchor className="h-3.5 w-3.5 shrink-0" aria-hidden />
            ) : (
              <span>Auto</span>
            )}
          </button>
        )}
      </td>
      <td className="py-0.5 pr-1 align-middle">
        {editableStart ? (
          <Input
            className={cn(
              `w-[100px] ${SCHEDULE_TABLE_INPUT}`,
              isLunch && "text-destructive",
            )}
            type="time"
            value={row.startTime}
            onChange={(e) =>
              onPatch(row.id, { startTime: e.target.value })
            }
          />
        ) : (
          <Input
            className={cn(
              `w-[100px] ${SCHEDULE_TABLE_INPUT} bg-muted/40`,
              isLunch ? "text-destructive" : "text-muted-foreground",
            )}
            type="time"
            value={row.startTime}
            readOnly
            tabIndex={-1}
            aria-readonly
          />
        )}
      </td>
      <td className="py-0.5 pr-1 align-middle">
        {hideEndDurationRow ? (
          <span
            className="flex h-7 min-h-7 w-[100px] items-center px-2 text-xs text-muted-foreground"
            aria-hidden
          >
            —
          </span>
        ) : editableEnd ? (
          <Input
            className={cn(
              `w-[100px] ${SCHEDULE_TABLE_INPUT}`,
              isLunch && "text-destructive",
            )}
            type="time"
            value={row.endTime}
            onChange={(e) => onPatch(row.id, { endTime: e.target.value })}
          />
        ) : (
          <Input
            className={cn(
              `w-[100px] ${SCHEDULE_TABLE_INPUT} bg-muted/40`,
              isLunch ? "text-destructive" : "text-muted-foreground",
            )}
            type="time"
            value={row.endTime}
            readOnly
            tabIndex={-1}
            aria-readonly
          />
        )}
      </td>
      <td className="w-[3.5rem] min-w-[3.5rem] max-w-[3.5rem] p-0.5 align-middle">
        <Select
          value={toIESelectValue(row.interiorExterior)}
          onValueChange={(v) =>
            onPatch(row.id, {
              interiorExterior: v === "_empty" ? "" : v,
            })
          }
        >
          <SelectTrigger
            className={cn(
              SCHEDULE_SELECT_TRIGGER,
              isLunch && "text-destructive",
              toIESelectValue(row.interiorExterior) === "truck" &&
                "[&>span:first-child]:flex [&>span:first-child]:min-w-0 [&>span:first-child]:flex-1 [&>span:first-child]:justify-center",
            )}
            title="Interiør / eksteriør"
            aria-label={
              toIESelectValue(row.interiorExterior) === "truck"
                ? "Company move (truck)"
                : undefined
            }
            onPointerDown={(e) => e.stopPropagation()}
          >
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_empty" className="py-1.5 pl-8 pr-2 text-xs">
              —
            </SelectItem>
            <SelectItem value="I" className="py-1.5 pl-8 pr-2 text-xs">
              I
            </SelectItem>
            <SelectItem value="E" className="py-1.5 pl-8 pr-2 text-xs">
              E
            </SelectItem>
            <SelectItem
              value={SCHEDULE_INTERIOR_EXTERIOR_TRUCK}
              className="py-1.5 pl-8 pr-2 text-xs"
            >
              <span className="inline-flex items-center gap-1.5">
                <Truck className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="sr-only">Company move</span>
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
      </td>
      <td className="w-[3.5rem] min-w-[3.5rem] max-w-[3.5rem] p-0.5 align-middle">
        <Select
          value={toDNSelectValue(row.dayNight)}
          onValueChange={(v) =>
            onPatch(row.id, {
              dayNight: v === "_empty" ? "" : v,
            })
          }
        >
          <SelectTrigger
            className={cn(SCHEDULE_SELECT_TRIGGER, isLunch && "text-destructive")}
            title="Dag / natt"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_empty" className="py-1.5 pl-8 pr-2 text-xs">
              —
            </SelectItem>
            <SelectItem value="D" className="py-1.5 pl-8 pr-2 text-xs">
              D
            </SelectItem>
            <SelectItem value="N" className="py-1.5 pl-8 pr-2 text-xs">
              N
            </SelectItem>
          </SelectContent>
        </Select>
      </td>
      <td className="min-w-0 py-0.5 pr-1 align-middle">
        <Input
          className={cn(
            SCHEDULE_TABLE_INPUT,
            "w-full min-w-0",
            isLunch && "text-destructive",
          )}
          value={row.info}
          onChange={(e) => onPatch(row.id, { info: e.target.value })}
        />
      </td>
      <td className="py-0.5 pr-1 align-middle">
        {hideEndDurationRow ? (
          <span
            className="flex h-7 min-h-7 w-[72px] items-center px-2 text-xs text-muted-foreground"
            aria-hidden
          >
            —
          </span>
        ) : editableDuration ? (
          <Input
            className={cn(
              `w-[72px] ${SCHEDULE_TABLE_INPUT} tabular-nums`,
              isLunch && "text-destructive",
            )}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={
              row.durationMinutes == null
                ? ""
                : String(Math.max(0, Math.floor(row.durationMinutes)))
            }
            onChange={(e) => {
              const s = e.target.value.trim();
              if (s === "") {
                onPatch(row.id, { durationMinutes: null });
                return;
              }
              const n = Number(s);
              if (!Number.isFinite(n)) return;
              onPatch(row.id, {
                durationMinutes: Math.max(0, Math.floor(n)),
              });
            }}
            aria-label={`${st.durationMin} (min)`}
          />
        ) : (
          <Input
            className={cn(
              `w-[72px] ${SCHEDULE_TABLE_INPUT} bg-muted/40 tabular-nums`,
              isLunch ? "text-destructive" : "text-muted-foreground",
            )}
            type="text"
            readOnly
            tabIndex={-1}
            value={
              row.durationMinutes == null
                ? ""
                : String(Math.max(0, Math.floor(row.durationMinutes)))
            }
            aria-label={`${st.durationMin} (${st.from}–${st.to})`}
          />
        )}
      </td>
      {showShotColumn ? (
        <td className="w-[7.5rem] min-w-[7.5rem] max-w-[7.5rem] align-middle p-0.5">
          <ScheduleShotDropzone
            scheduleEntryId={row.id}
            imageUrl={row.shotImageUrl}
            locale={locale}
            strings={shotStrings}
            onImageUrlChange={(url) => onPatch(row.id, { shotImageUrl: url })}
          />
        </td>
      ) : null}
      <td className="min-w-0 py-0.5 pr-1 align-middle">
        <Input
          className={cn(
            SCHEDULE_TABLE_INPUT,
            "w-full min-w-0",
            isLunch && "text-destructive",
          )}
          value={row.sceneSetting}
          onChange={(e) => onPatch(row.id, { sceneSetting: e.target.value })}
        />
      </td>
      <td className="min-w-[5rem] w-[5rem] max-w-[5rem] py-0.5 pr-0.5 align-middle">
        <Input
          className={cn(
            SCHEDULE_TABLE_INPUT,
            "w-full min-w-0 px-1 text-center tabular-nums",
            isLunch && "text-destructive",
          )}
          value={row.actorNumbers}
          onChange={(e) => onPatch(row.id, { actorNumbers: e.target.value })}
          title={st.actors}
        />
      </td>
      <td className="w-[8rem] max-w-[8rem] shrink-0 py-0.5 pr-0.5 align-middle">
        <RowActions
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          onRemove={onRemove}
          disableUp={index === 0}
          disableDown={index === total - 1 || lockCallTimeRow}
        />
      </td>
    </tr>
  );
}

export function DagsplanScheduleTable({
  shootDateIso,
  sunriseTimeOverride,
  onSunriseTimeOverrideChange,
  sunsetTimeOverride,
  onSunsetTimeOverrideChange,
  showShotColumn,
  locale = "no",
  rows,
  onRowsChange,
}: {
  shootDateIso: string;
  sunriseTimeOverride: string;
  onSunriseTimeOverrideChange: (value: string) => void;
  sunsetTimeOverride: string;
  onSunsetTimeOverrideChange: (value: string) => void;
  /** Kolonne mellom varighet og scene — storyboard/referansebilde (DnD). */
  showShotColumn: boolean;
  /** UI-språk for tabelltekster */
  locale?: DagsplanLocale;
  rows: ScheduleRow[];
  onRowsChange: (rows: ScheduleRow[]) => void;
}) {
  const st = useMemo(() => getScheduleTableStrings(locale), [locale]);
  const shotStrings = useMemo(
    () => getShotDropzoneStringsFull(locale),
    [locale],
  );
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function commit(next: ScheduleRow[], recalc: boolean) {
    const cleaned = normalizeCallTimeOnlyOnFirst(next);
    onRowsChange(recalc ? recalculateScheduleRows(cleaned) : cleaned);
  }

  function patch(id: string, partial: Partial<ScheduleRow>) {
    const next = rows.map((r) => (r.id === id ? { ...r, ...partial } : r));
    const needsRecalc =
      partial.rowKind !== undefined ||
      partial.durationMinutes !== undefined ||
      partial.startTime !== undefined ||
      partial.endTime !== undefined;
    commit(next, needsRecalc);
  }

  function setAsAnchor(id: string) {
    const next = rows.map((r) =>
      r.id === id && r.rowKind === "sequential"
        ? { ...r, rowKind: "anchor" as const }
        : r,
    );
    commit(next, true);
  }

  function demoteAnchor(id: string) {
    const next = rows.map((r) =>
      r.id === id && r.rowKind === "anchor"
        ? { ...r, rowKind: "sequential" as const }
        : r,
    );
    commit(next, true);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = rows.findIndex((r) => r.id === active.id);
    const newIndex = rows.findIndex((r) => r.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const moved = arrayMove(rows, oldIndex, newIndex);
    const withAnchor = applyReorderPreserveSchedule(rows, moved);
    commit(withAnchor, true);
  }

  function moveRow(index: number, dir: -1 | 1) {
    const j = index + dir;
    if (j < 0 || j >= rows.length) return;
    const moved = arrayMove(rows, index, j);
    const withAnchor = applyReorderPreserveSchedule(rows, moved);
    commit(withAnchor, true);
  }

  function removeRow(index: number) {
    const filtered = rows.filter((_, i) => i !== index);
    const withAnchor = applyRemovePreserveSchedule(rows, index, filtered);
    commit(withAnchor, true);
  }

  const ids = rows.map((r) => r.id);

  const totalDurationMinutes = useMemo(
    () => sumScheduleDurationMinutes(rows),
    [rows],
  );

  const sunriseEffective = effectiveSunriseDisplay(
    shootDateIso,
    sunriseTimeOverride.trim() ? sunriseTimeOverride : null,
  );
  const sunsetEffective = effectiveSunsetDisplay(
    shootDateIso,
    sunsetTimeOverride.trim() ? sunsetTimeOverride : null,
  );
  const sunTimesManual =
    Boolean(sunriseTimeOverride.trim()) || Boolean(sunsetTimeOverride.trim());

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3 rounded-md border border-border/70 bg-muted/25 px-3 py-2.5">
        <div className="min-w-[10rem] space-y-1">
          <Label htmlFor="dagsplan-sunrise-time" className="text-xs">
            {st.sunrise}
          </Label>
          <Input
            id="dagsplan-sunrise-time"
            type="time"
            step={60}
            className="h-8 w-[7.25rem] tabular-nums"
            value={toTimeInputValue(sunriseEffective)}
            onChange={(e) => onSunriseTimeOverrideChange(e.target.value)}
            title={st.osloHint}
          />
        </div>
        <div className="min-w-[10rem] space-y-1">
          <Label htmlFor="dagsplan-sunset-time" className="text-xs">
            {st.sunset}
          </Label>
          <Input
            id="dagsplan-sunset-time"
            type="time"
            step={60}
            className="h-8 w-[7.25rem] tabular-nums"
            value={toTimeInputValue(sunsetEffective)}
            onChange={(e) => onSunsetTimeOverrideChange(e.target.value)}
            title={st.osloHint}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 shrink-0 text-xs"
          disabled={!sunTimesManual}
          onClick={() => {
            onSunriseTimeOverrideChange("");
            onSunsetTimeOverrideChange("");
          }}
        >
          {st.useOsloAuto}
        </Button>
        <p className="max-w-md pb-0.5 text-[11px] leading-snug text-muted-foreground">
          {sunTimesManual ? (
            <>{st.sunTimesManual}</>
          ) : (
            <>
              {st.sunTimesAutoBeforeDate}
              <span className="tabular-nums">{shootDateIso}</span>
              {st.sunTimesAutoAfterDate}
            </>
          )}
        </p>
      </div>
      <div className="overflow-x-auto">
        <DndContext
          id="dagsplan-schedule-dnd"
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <table
            className={cn(
              "w-full table-fixed border-collapse text-sm",
              showShotColumn ? "min-w-[1112px]" : "min-w-[1008px]",
            )}
          >
            <colgroup>
              <col className="w-10" />
              <col className="w-14" />
              <col className="w-[100px]" />
              <col className="w-[100px]" />
              <col className="w-[3.5rem]" />
              <col className="w-[3.5rem]" />
              <col className="w-[16%]" />
              <col className="w-[72px]" />
              {showShotColumn ? <col className="w-[7.5rem]" /> : null}
              <col className={showShotColumn ? "w-[34%]" : "w-[42%]"} />
              <col className="w-[5rem]" />
              <col className="w-[8rem]" />
            </colgroup>
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="pb-1.5 pr-0.5 font-medium">
                  <span className="sr-only">{st.moveRow}</span>
                </th>
                <th className="pb-1.5 pr-1 font-medium">
                  <span className="sr-only">{st.anchorAuto}</span>
                </th>
                <th className="pb-1.5 pr-1 font-medium">{st.from}</th>
                <th className="pb-1.5 pr-1 font-medium">{st.to}</th>
                <th
                  className="w-[3.5rem] min-w-[3.5rem] max-w-[3.5rem] pb-1.5 pr-0.5 text-center text-[10px] font-medium leading-none"
                  title="Interiør / eksteriør"
                >
                  I/E
                </th>
                <th
                  className="w-[3.5rem] min-w-[3.5rem] max-w-[3.5rem] pb-1.5 pr-0.5 text-center text-[10px] font-medium leading-none"
                  title="Dag / natt"
                >
                  D/N
                </th>
                <th className="min-w-0 pb-1.5 pr-1 font-medium">{st.info}</th>
                <th className="pb-1.5 pr-1 font-medium">
                  <span className="whitespace-nowrap">{st.durationMin}</span>{" "}
                  <span className="font-normal text-[10px] text-muted-foreground">
                    (min)
                  </span>
                </th>
                {showShotColumn ? (
                  <th className="pb-1.5 pr-0.5 text-center text-[10px] font-medium leading-none">
                    {st.shot}
                  </th>
                ) : null}
                <th className="min-w-0 pb-1.5 pr-1 font-medium">
                  {st.sceneSetting}
                </th>
                <th
                  className="min-w-[5rem] w-[5rem] pb-1.5 pr-0.5 text-center text-[10px] font-medium leading-none whitespace-nowrap"
                  title={st.actors}
                >
                  {st.actors}
                </th>
                <th className="w-[8rem] max-w-[8rem] pb-1.5 pr-0.5">
                  <span className="sr-only">{st.actions}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                {rows.map((row, i) => (
                  <SortableScheduleRow
                    key={row.id}
                    row={row}
                    index={i}
                    total={rows.length}
                    showShotColumn={showShotColumn}
                    st={st}
                    locale={locale}
                    shotStrings={shotStrings}
                    onPatch={patch}
                    onSetAnchor={
                      row.rowKind === "sequential"
                        ? () => setAsAnchor(row.id)
                        : undefined
                    }
                    onDemoteAnchor={
                      canDemoteAnchorRow(rows, i)
                        ? () => demoteAnchor(row.id)
                        : undefined
                    }
                    onMoveUp={() => moveRow(i, -1)}
                    onMoveDown={() => moveRow(i, 1)}
                    onRemove={() => removeRow(i)}
                  />
                ))}
              </SortableContext>
            </tbody>
          </table>
        </DndContext>
      </div>
      <div className="flex flex-wrap items-baseline justify-start gap-x-2 gap-y-1 border-t border-border pt-3 text-sm">
        <span className="text-muted-foreground">{st.totalPlanned}</span>
        <span className="font-medium tabular-nums text-foreground">
          {formatTotalScheduleMinutes(totalDurationMinutes, st)}
        </span>
      </div>
    </div>
  );
}
