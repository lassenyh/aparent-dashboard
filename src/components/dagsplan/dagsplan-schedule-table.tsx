"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Anchor, Copy, GripVertical, Trash2, Truck } from "lucide-react";
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
  inferDurationMinutes,
  isScheduleCallTimeRow,
  isScheduleLunchRow,
  isScheduleUntimedRow,
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
import {
  normalizeScheduleColumnOrder,
  type ScheduleColumnId,
} from "@/lib/schedule-columns";

export type { ScheduleRow };

function SortableColumnHeader({
  id,
  order,
  className,
  title,
  children,
}: {
  id: ScheduleColumnId;
  order: number;
  className: string;
  title?: string;
  children: ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `column:${id}` });
  return (
    <th
      ref={setNodeRef}
      className={cn("relative shrink-0 p-0", className)}
      style={{
        order,
        transform: CSS.Translate.toString(transform),
        transition,
        zIndex: isDragging ? 20 : undefined,
        opacity: isDragging ? 0.75 : undefined,
      }}
      title={title}
    >
      <button
        type="button"
        className="flex min-h-11 w-full touch-none select-none items-center gap-1 pb-1.5 pr-1 text-left font-inherit text-inherit active:cursor-grabbing"
        aria-label={`Flytt kolonnen ${title ?? id}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
        {children}
      </button>
    </th>
  );
}

const SCHEDULE_TABLE_INPUT = "h-7 min-h-7 px-2 text-xs";
const SCHEDULE_TIME_INPUT =
  "!w-[68px] !min-w-[68px] !max-w-[68px] px-1.5 [appearance:textfield] [&::-webkit-calendar-picker-indicator]:hidden";

/** Må fylle cellen (w-full); fast kolonnebredd styres av <col> + td. */
const SCHEDULE_SELECT_TRIGGER =
  "h-7 min-h-7 w-full min-w-0 max-w-full gap-0 px-1 py-0 text-xs [&>svg]:h-3 [&>svg]:w-3 [&>svg]:shrink-0 [&>svg]:opacity-60";

const TEXT_COMMIT_DELAY_MS = 250;

function BufferedTextInput({
  value,
  onCommit,
  className,
  title,
}: {
  value: string;
  onCommit: (value: string) => void;
  className?: string;
  title?: string;
}) {
  const [draft, setDraft] = useState(value);
  const [editing, setEditing] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (draft === value) return;
    timeoutRef.current = window.setTimeout(() => {
      timeoutRef.current = null;
      onCommit(draft);
    }, TEXT_COMMIT_DELAY_MS);
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [draft, onCommit, value]);

  return (
    <Input
      className={className}
      value={editing ? draft : value}
      title={title}
      onFocus={() => {
        setDraft(value);
        setEditing(true);
      }}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        setEditing(false);
        if (timeoutRef.current !== null) {
          window.clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        if (draft !== value) onCommit(draft);
      }}
    />
  );
}

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

export function formatTotalScheduleMinutes(
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

function splitDurationMinutes(durationMinutes: number | null): {
  hours: number | null;
  minutes: number | null;
} {
  if (durationMinutes == null) return { hours: null, minutes: null };
  const total = Math.max(0, Math.floor(durationMinutes));
  return {
    hours: Math.floor(total / 60),
    minutes: total % 60,
  };
}

function formatDurationMinutes(
  durationMinutes: number | null,
  st: ScheduleTableT,
): string {
  if (durationMinutes == null) return "";
  const { hours, minutes } = splitDurationMinutes(durationMinutes);
  if (hours == null || minutes == null) return "";
  if (hours === 0) return `${minutes} ${st.min}`;
  if (minutes === 0) return `${hours} ${st.h}`;
  return `${hours} ${st.h} ${minutes} ${st.min}`;
}

function DurationInput({
  durationMinutes,
  st,
  isLunch,
  onChange,
}: {
  durationMinutes: number | null;
  st: ScheduleTableT;
  isLunch: boolean;
  onChange: (durationMinutes: number | null) => void;
}) {
  const { hours, minutes } = splitDurationMinutes(durationMinutes);

  function updatePart(part: "hours" | "minutes", rawValue: string) {
    if (rawValue === "") {
      if (part === "hours" && (minutes == null || minutes === 0)) {
        onChange(null);
        return;
      }
      if (part === "minutes" && (hours == null || hours === 0)) {
        onChange(null);
        return;
      }
    }

    const parsed = rawValue === "" ? 0 : Number(rawValue);
    if (!Number.isFinite(parsed)) return;
    const nextHours =
      part === "hours"
        ? Math.max(0, Math.floor(parsed))
        : Math.max(0, hours ?? 0);
    const nextMinutes =
      part === "minutes"
        ? Math.min(59, Math.max(0, Math.floor(parsed)))
        : Math.min(59, Math.max(0, minutes ?? 0));
    onChange(nextHours * 60 + nextMinutes);
  }

  return (
    <div
      className={cn(
        "flex h-7 w-[100px] items-center overflow-hidden border border-input bg-background text-xs tabular-nums",
        isLunch && "border-destructive/40 text-destructive",
      )}
    >
      <input
        type="number"
        min={0}
        step={1}
        inputMode="numeric"
        autoComplete="off"
        className="h-full w-7 min-w-0 bg-transparent px-1 text-right outline-none [appearance:textfield] focus:bg-muted/40 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        value={hours == null || hours === 0 ? "" : hours}
        onChange={(event) => updatePart("hours", event.target.value)}
        aria-label={`${st.durationMin}: ${st.h}`}
      />
      <span className="shrink-0 text-[10px] text-muted-foreground">
        {st.h}
      </span>
      <span className="mx-0.5 h-4 w-px shrink-0 bg-border" aria-hidden />
      <input
        type="number"
        min={0}
        max={59}
        step={1}
        inputMode="numeric"
        autoComplete="off"
        className="h-full w-7 min-w-0 bg-transparent px-1 text-right outline-none [appearance:textfield] focus:bg-muted/40 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        value={minutes == null || minutes === 0 ? "" : minutes}
        onChange={(event) => updatePart("minutes", event.target.value)}
        aria-label={`${st.durationMin}: ${st.min}`}
      />
      <span className="shrink-0 pr-1 text-[10px] text-muted-foreground">
        {st.min}
      </span>
    </div>
  );
}

function RowActions({
  onMoveUp,
  onMoveDown,
  disableUp,
  disableDown,
}: {
  onMoveUp: () => void;
  onMoveDown: () => void;
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
    </div>
  );
}

const SortableScheduleRow = memo(function SortableScheduleRow({
  projectId,
  imageAssets,
  onImageAssetCreated,
  row,
  index,
  total,
  showShotColumn,
  showInteriorExteriorColumn,
  showDayNightColumn,
  showActorColumn,
  showCostumeColumn,
  columnOrder,
  st,
  locale,
  shotStrings,
  onPatch,
  canSetAnchor,
  onSetAnchor,
  canDemoteAnchor,
  onDemoteAnchor,
  onMove,
  onRemove,
  onDuplicate,
}: {
  projectId: string;
  imageAssets: Array<{ id: string; url: string; name: string }>;
  onImageAssetCreated: (asset: { id: string; url: string; name: string }) => void;
  row: ScheduleRow;
  index: number;
  total: number;
  showShotColumn: boolean;
  showInteriorExteriorColumn: boolean;
  showDayNightColumn: boolean;
  showActorColumn: boolean;
  showCostumeColumn: boolean;
  st: ScheduleTableT;
  locale: DagsplanLocale;
  shotStrings: ShotDropzoneStrings;
  onPatch: (id: string, patch: Partial<ScheduleRow>) => void;
  canSetAnchor: boolean;
  onSetAnchor: (id: string) => void;
  canDemoteAnchor: boolean;
  onDemoteAnchor: (id: string) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onRemove: (index: number) => void;
  onDuplicate: (index: number) => void;
  columnOrder: ScheduleColumnId[];
}) {
  const columnPosition = (id: ScheduleColumnId) => columnOrder.indexOf(id);
  const lockCallTimeRow = index === 0 && isScheduleCallTimeRow(row);
  const isUntimed = isScheduleUntimedRow(row);
  const hideEndDurationRow =
    isScheduleCallTimeRow(row) || isScheduleWrapRow(row) || isUntimed;

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

  const editableStart = !isUntimed && (isFree || isAnchor);
  const editableEnd = !hideEndDurationRow;
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
        "flex w-full items-center border-b border-border/60",
        !hasCustomBg && isFree && "bg-amber-500/[0.06] dark:bg-amber-950/25",
        isAnchor && "border-l-2 border-primary/45",
        isLunch &&
          "text-destructive [&>td:first-child]:text-muted-foreground [&>td:last-child]:text-muted-foreground [&>td:last-child_button]:text-muted-foreground [&>td:last-child_button:hover]:text-foreground",
      )}
    >
      <td
        className="relative order-[-2] w-[6.5rem] shrink-0 self-stretch py-0.5 pr-0.5 align-middle"
      >
        <button
          type="button"
          className={cn(
            "flex touch-none items-center justify-center rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground",
            "mx-auto",
            lockCallTimeRow && "cursor-not-allowed opacity-50 hover:bg-transparent",
          )}
          aria-label={st.moveRow}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="absolute bottom-1 left-1 flex items-center gap-0.5">
          <ScheduleRowColorPopover
            value={row.rowBgColor}
            onChange={(hex) =>
              onPatch(row.id, {
                rowBgColor: normalizeScheduleRowBgColor(hex),
              })
            }
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 shrink-0 px-0 text-muted-foreground hover:text-foreground"
            onClick={() => onDuplicate(index)}
            title="Dupliser rad"
            aria-label="Dupliser rad under"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 shrink-0 px-0 text-muted-foreground hover:text-destructive"
            onClick={() => onRemove(index)}
            title="Slett rad"
            aria-label="Slett rad"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </td>
      <td className="order-[-1] w-14 shrink-0 py-0.5 pr-1 align-middle">
        {isUntimed ? (
          <span
            className="inline-flex h-7 min-w-[3.25rem] items-center justify-center rounded-md border border-border bg-muted/40 px-1.5 text-[10px] text-muted-foreground"
            aria-label={st.untimedRow}
          >
            {st.untimedRow}
          </span>
        ) : isFree ? (
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
              if (isAnchor) onDemoteAnchor(row.id);
              else onSetAnchor(row.id);
            }}
            disabled={isAnchor ? !canDemoteAnchor : !canSetAnchor}
            aria-label={
              isAnchor
                ? canDemoteAnchor
                  ? "Anker — bytt til auto (følg forrige rad før frifelt)"
                  : "Anker (kan ikke byttes her)"
                : canSetAnchor
                  ? "Auto — bytt til anker med egen starttid"
                  : "Auto"
            }
            title={
              isAnchor
                ? canDemoteAnchor
                  ? "Fjern anker — følg forrige rad i sekvensen (etter frifelt: fra siste rad før frifeltet)"
                  : "Kan ikke fjerne anker her (første rad, eller ingen timeplan-rad før fri rad å følge)"
                : canSetAnchor
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
      <td className="w-[72px] shrink-0 py-0.5 pr-1 align-middle" style={{ order: columnPosition("from") }}>
        {isUntimed ? (
          <span
            className="flex h-7 min-h-7 w-[68px] items-center px-1.5 text-xs text-muted-foreground"
            aria-hidden
          >
            —
          </span>
        ) : editableStart ? (
          <Input
            className={cn(
              SCHEDULE_TABLE_INPUT,
              SCHEDULE_TIME_INPUT,
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
              SCHEDULE_TABLE_INPUT,
              SCHEDULE_TIME_INPUT,
              "bg-muted/40",
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
      <td className="w-[72px] shrink-0 py-0.5 pr-1 align-middle" style={{ order: columnPosition("to") }}>
        {hideEndDurationRow ? (
          <span
            className="flex h-7 min-h-7 w-[68px] items-center px-1.5 text-xs text-muted-foreground"
            aria-hidden
          >
            —
          </span>
        ) : editableEnd ? (
          <Input
            className={cn(
              SCHEDULE_TABLE_INPUT,
              SCHEDULE_TIME_INPUT,
              isLunch && "text-destructive",
            )}
            type="time"
            value={row.endTime}
            onChange={(e) => {
              const endTime = e.target.value;
              onPatch(
                row.id,
                isFree
                  ? { endTime }
                  : {
                      endTime,
                      durationMinutes: inferDurationMinutes(
                        row.startTime,
                        endTime,
                      ),
                    },
              );
            }}
            aria-label={`${st.to}: ${row.info || st.info}`}
            title="Endre sluttid — varigheten oppdateres automatisk"
          />
        ) : (
          <Input
            className={cn(
              SCHEDULE_TABLE_INPUT,
              SCHEDULE_TIME_INPUT,
              "bg-muted/40",
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
      {showInteriorExteriorColumn ? (
      <td className="w-[3.5rem] min-w-[3.5rem] max-w-[3.5rem] shrink-0 p-0.5 align-middle" style={{ order: columnPosition("interiorExterior") }}>
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
      ) : null}
      {showDayNightColumn ? (
      <td className="w-[3.5rem] min-w-[3.5rem] max-w-[3.5rem] shrink-0 p-0.5 align-middle" style={{ order: columnPosition("dayNight") }}>
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
      ) : null}
      <td className="w-40 shrink-0 py-0.5 pr-1 align-middle" style={{ order: columnPosition("info") }}>
        <BufferedTextInput
          className={cn(
            SCHEDULE_TABLE_INPUT,
            "w-full min-w-0",
            isLunch && "text-destructive",
          )}
          value={row.info}
          onCommit={(value) => onPatch(row.id, { info: value })}
        />
      </td>
      <td className="w-[100px] shrink-0 py-0.5 pr-1 align-middle" style={{ order: columnPosition("duration") }}>
        {hideEndDurationRow ? (
          <span
            className="flex h-7 min-h-7 w-[72px] items-center px-2 text-xs text-muted-foreground"
            aria-hidden
          >
            —
          </span>
        ) : editableDuration ? (
          <DurationInput
            durationMinutes={row.durationMinutes}
            st={st}
            isLunch={isLunch}
            onChange={(durationMinutes) =>
              onPatch(row.id, { durationMinutes })
            }
          />
        ) : (
          <Input
            className={cn(
              `w-[100px] ${SCHEDULE_TABLE_INPUT} bg-muted/40 tabular-nums`,
              isLunch ? "text-destructive" : "text-muted-foreground",
            )}
            type="text"
            readOnly
            tabIndex={-1}
            value={formatDurationMinutes(row.durationMinutes, st)}
            aria-label={`${st.durationMin} (${st.from}–${st.to})`}
          />
        )}
      </td>
      {showShotColumn ? (
        <td className="w-[7.5rem] min-w-[7.5rem] max-w-[7.5rem] shrink-0 align-middle p-0.5" style={{ order: columnPosition("shot") }}>
          <ScheduleShotDropzone
            projectId={projectId}
            image={{
              assetId: row.shotImageAssetId,
              url: row.shotImageUrl,
              zoom: row.shotImageZoom,
              x: row.shotImagePositionX,
              y: row.shotImagePositionY,
              fit: row.shotImageFit,
            }}
            assets={imageAssets}
            locale={locale}
            strings={shotStrings}
            onAssetCreated={onImageAssetCreated}
            onChange={(patch) => onPatch(row.id, {
              shotImageAssetId: patch.assetId,
              shotImageUrl: patch.url,
              shotImageZoom: patch.zoom,
              shotImagePositionX: patch.x,
              shotImagePositionY: patch.y,
              shotImageFit: patch.fit,
            })}
          />
        </td>
      ) : null}
      <td className="w-[22rem] shrink-0 py-0.5 pr-1 align-middle" style={{ order: columnPosition("scene") }}>
        <BufferedTextInput
          className={cn(
            SCHEDULE_TABLE_INPUT,
            "w-full min-w-0",
            isLunch && "text-destructive",
          )}
          value={row.sceneSetting}
          onCommit={(value) => onPatch(row.id, { sceneSetting: value })}
          title={st.scene}
        />
      </td>
      {showActorColumn ? (
        <td className="min-w-[5rem] w-[5rem] max-w-[5rem] shrink-0 py-0.5 pr-0.5 align-middle" style={{ order: columnPosition("actors") }}>
          <BufferedTextInput
            className={cn(
              SCHEDULE_TABLE_INPUT,
              "w-full min-w-0 px-1 text-center tabular-nums",
              isLunch && "text-destructive",
            )}
            value={row.actorNumbers}
            onCommit={(value) => onPatch(row.id, { actorNumbers: value })}
            title={st.actors}
          />
        </td>
      ) : null}
      {showCostumeColumn ? (
        <td className="w-40 shrink-0 py-0.5 pr-1 align-middle" style={{ order: columnPosition("costume") }}>
          <BufferedTextInput
            className={cn(
              SCHEDULE_TABLE_INPUT,
              "w-full min-w-0",
              isLunch && "text-destructive",
            )}
            value={row.costume}
            onCommit={(value) => onPatch(row.id, { costume: value })}
            title={st.costume}
          />
        </td>
      ) : null}
      <td className="order-[99] w-16 max-w-16 shrink-0 py-0.5 pr-0.5 align-middle">
        <RowActions
          onMoveUp={() => onMove(index, -1)}
          onMoveDown={() => onMove(index, 1)}
          disableUp={index === 0}
          disableDown={index === total - 1 || lockCallTimeRow}
        />
      </td>
    </tr>
  );
});

function DagsplanScheduleTableComponent({
  projectId,
  imageAssets,
  onImageAssetCreated,
  shootDateIso,
  sunLocationName,
  sunLatitude,
  sunLongitude,
  sunriseTimeOverride,
  onSunriseTimeOverrideChange,
  sunsetTimeOverride,
  onSunsetTimeOverrideChange,
  showShotColumn,
  showInteriorExteriorColumn,
  showDayNightColumn,
  showActorColumn,
  showCostumeColumn,
  columnOrder,
  onColumnOrderChange,
  showTotal = true,
  locale = "no",
  rows,
  onRowsChange,
}: {
  projectId: string;
  imageAssets: Array<{ id: string; url: string; name: string }>;
  onImageAssetCreated: (asset: { id: string; url: string; name: string }) => void;
  shootDateIso: string;
  sunLocationName?: string;
  sunLatitude?: number | null;
  sunLongitude?: number | null;
  sunriseTimeOverride: string;
  onSunriseTimeOverrideChange: (value: string) => void;
  sunsetTimeOverride: string;
  onSunsetTimeOverrideChange: (value: string) => void;
  /** Kolonne mellom varighet og scene — storyboard/referansebilde (DnD). */
  showShotColumn: boolean;
  showInteriorExteriorColumn: boolean;
  showDayNightColumn: boolean;
  showActorColumn: boolean;
  showCostumeColumn: boolean;
  columnOrder: ScheduleColumnId[];
  onColumnOrderChange: (order: ScheduleColumnId[]) => void;
  /** Viser total planlagt tid under tabellen. */
  showTotal?: boolean;
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
  const columnSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const rowsRef = useRef(rows);
  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  const commit = useCallback((next: ScheduleRow[], recalc: boolean) => {
    const cleaned = normalizeCallTimeOnlyOnFirst(next);
    onRowsChange(recalc ? recalculateScheduleRows(cleaned) : cleaned);
  }, [onRowsChange]);

  const patch = useCallback((id: string, partial: Partial<ScheduleRow>) => {
    const currentRows = rowsRef.current;
    const next = currentRows.map((r) =>
      r.id === id ? { ...r, ...partial } : r,
    );
    const needsRecalc =
      partial.rowKind !== undefined ||
      partial.durationMinutes !== undefined ||
      partial.startTime !== undefined ||
      partial.endTime !== undefined;
    commit(next, needsRecalc);
  }, [commit]);

  const setAsAnchor = useCallback((id: string) => {
    const next = rowsRef.current.map((r) =>
      r.id === id && r.rowKind === "sequential"
        ? { ...r, rowKind: "anchor" as const }
        : r,
    );
    commit(next, true);
  }, [commit]);

  const demoteAnchor = useCallback((id: string) => {
    const next = rowsRef.current.map((r) =>
      r.id === id && r.rowKind === "anchor"
        ? { ...r, rowKind: "sequential" as const }
        : r,
    );
    commit(next, true);
  }, [commit]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const currentRows = rowsRef.current;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = currentRows.findIndex((r) => r.id === active.id);
    const newIndex = currentRows.findIndex((r) => r.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const moved = arrayMove(currentRows, oldIndex, newIndex);
    const withAnchor = applyReorderPreserveSchedule(currentRows, moved);
    commit(withAnchor, true);
  }, [commit]);

  const moveRow = useCallback((index: number, dir: -1 | 1) => {
    const currentRows = rowsRef.current;
    const j = index + dir;
    if (j < 0 || j >= currentRows.length) return;
    const moved = arrayMove(currentRows, index, j);
    const withAnchor = applyReorderPreserveSchedule(currentRows, moved);
    commit(withAnchor, true);
  }, [commit]);

  const removeRow = useCallback((index: number) => {
    const currentRows = rowsRef.current;
    const filtered = currentRows.filter((_, i) => i !== index);
    const withAnchor = applyRemovePreserveSchedule(currentRows, index, filtered);
    commit(withAnchor, true);
  }, [commit]);

  const duplicateRow = useCallback((index: number) => {
    const currentRows = rowsRef.current;
    const source = currentRows[index];
    if (!source) return;
    const duplicate: ScheduleRow = {
      ...source,
      id: crypto.randomUUID(),
      rowKind: isScheduleCallTimeRow(source) ? "sequential" : source.rowKind,
      info: isScheduleCallTimeRow(source) ? "" : source.info,
    };
    const next = [...currentRows];
    next.splice(index + 1, 0, duplicate);
    commit(next, true);
  }, [commit]);

  const ids = useMemo(() => rows.map((r) => r.id), [rows]);
  const normalizedColumnOrder = useMemo(
    () => normalizeScheduleColumnOrder(columnOrder),
    [columnOrder],
  );
  const columnPosition = useCallback(
    (id: ScheduleColumnId) => normalizedColumnOrder.indexOf(id),
    [normalizedColumnOrder],
  );
  const moveColumn = useCallback(
    (dragged: ScheduleColumnId, target: ScheduleColumnId) => {
      const from = normalizedColumnOrder.indexOf(dragged);
      const to = normalizedColumnOrder.indexOf(target);
      if (from < 0 || to < 0 || from === to) return;
      onColumnOrderChange(arrayMove(normalizedColumnOrder, from, to));
    },
    [normalizedColumnOrder, onColumnOrderChange],
  );
  const handleColumnDragEnd = useCallback(
    (event: DragEndEvent) => {
      if (!event.over || event.active.id === event.over.id) return;
      const dragged = String(event.active.id).replace("column:", "") as ScheduleColumnId;
      const target = String(event.over.id).replace("column:", "") as ScheduleColumnId;
      moveColumn(dragged, target);
    },
    [moveColumn],
  );

  const totalDurationMinutes = useMemo(
    () => sumScheduleDurationMinutes(rows),
    [rows],
  );

  const sunriseEffective = effectiveSunriseDisplay(
    shootDateIso,
    sunriseTimeOverride.trim() ? sunriseTimeOverride : null,
    sunLatitude,
    sunLongitude,
  );
  const sunsetEffective = effectiveSunsetDisplay(
    shootDateIso,
    sunsetTimeOverride.trim() ? sunsetTimeOverride : null,
    sunLatitude,
    sunLongitude,
  );
  const sunTimesManual =
    Boolean(sunriseTimeOverride.trim()) || Boolean(sunsetTimeOverride.trim());
  const automaticSunLocation = sunLocationName?.trim() || "Oslo";
  const tableMinWidth =
    900 +
    (showInteriorExteriorColumn ? 56 : 0) +
    (showDayNightColumn ? 56 : 0) +
    (showShotColumn ? 120 : 0) +
    (showActorColumn ? 80 : 0) +
    (showCostumeColumn ? 160 : 0);

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
              {st.sunTimesAutoBeforeDate.replace(
                "{location}",
                automaticSunLocation,
              )}
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
            className="w-full table-fixed border-collapse text-sm"
            style={{ minWidth: tableMinWidth }}
          >
            <thead>
              <DndContext
                id="dagsplan-schedule-columns-dnd"
                sensors={columnSensors}
                collisionDetection={closestCenter}
                onDragEnd={handleColumnDragEnd}
              >
              <SortableContext
                items={normalizedColumnOrder.map((id) => `column:${id}`)}
                strategy={horizontalListSortingStrategy}
              >
              <tr className="flex w-full border-b border-border text-left text-xs text-muted-foreground">
                <th className="order-[-2] w-[6.5rem] shrink-0 pb-1.5 pr-0.5 font-medium">
                  <span className="sr-only">{st.moveRow}</span>
                </th>
                <th className="order-[-1] w-14 shrink-0 pb-1.5 pr-1 font-medium">
                  <span className="sr-only">{st.anchorAuto}</span>
                </th>
                <SortableColumnHeader id="from" order={columnPosition("from")} className="w-[72px] font-medium" title={st.from}>{st.from}</SortableColumnHeader>
                <SortableColumnHeader id="to" order={columnPosition("to")} className="w-[72px] font-medium" title={st.to}>{st.to}</SortableColumnHeader>
                {showInteriorExteriorColumn ? (
                <SortableColumnHeader id="interiorExterior" order={columnPosition("interiorExterior")} className="w-[3.5rem] min-w-[3.5rem] max-w-[3.5rem] text-[10px] font-medium leading-none" title="Interiør / eksteriør">I/E</SortableColumnHeader>
                ) : null}
                {showDayNightColumn ? (
                <SortableColumnHeader id="dayNight" order={columnPosition("dayNight")} className="w-[3.5rem] min-w-[3.5rem] max-w-[3.5rem] text-[10px] font-medium leading-none" title="Dag / natt">D/N</SortableColumnHeader>
                ) : null}
                <SortableColumnHeader id="info" order={columnPosition("info")} className="w-40 font-medium" title={st.info}>{st.info}</SortableColumnHeader>
                <SortableColumnHeader id="duration" order={columnPosition("duration")} className="w-[100px] font-medium" title={st.durationMin}>
                  <span className="whitespace-nowrap">{st.durationMin}</span>{" "}
                  <span className="font-normal text-[10px] text-muted-foreground">
                    ({st.h} / {st.min})
                  </span>
                </SortableColumnHeader>
                {showShotColumn ? (
                  <SortableColumnHeader id="shot" order={columnPosition("shot")} className="w-[7.5rem] text-[10px] font-medium leading-none" title={st.shot}>{st.shot}</SortableColumnHeader>
                ) : null}
                <SortableColumnHeader id="scene" order={columnPosition("scene")} className="w-[22rem] font-medium" title={st.scene}>{st.scene}</SortableColumnHeader>
                {showActorColumn ? (
                  <SortableColumnHeader id="actors" order={columnPosition("actors")} className="min-w-[5rem] w-[5rem] text-[10px] font-medium leading-none whitespace-nowrap" title={st.actors}>{st.actors}</SortableColumnHeader>
                ) : null}
                {showCostumeColumn ? (
                  <SortableColumnHeader id="costume" order={columnPosition("costume")} className="w-40 font-medium" title={st.costume}>{st.costume}</SortableColumnHeader>
                ) : null}
                <th className="order-[99] w-16 max-w-16 shrink-0 pb-1.5 pr-0.5">
                  <span className="sr-only">{st.actions}</span>
                </th>
              </tr>
              </SortableContext>
              </DndContext>
            </thead>
            <tbody>
              <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                {rows.map((row, i) => (
                  <SortableScheduleRow
                    projectId={projectId}
                    imageAssets={imageAssets}
                    onImageAssetCreated={onImageAssetCreated}
                    key={row.id}
                    row={row}
                    index={i}
                    total={rows.length}
                    showShotColumn={showShotColumn}
                    showInteriorExteriorColumn={showInteriorExteriorColumn}
                    showDayNightColumn={showDayNightColumn}
                    showActorColumn={showActorColumn}
                    showCostumeColumn={showCostumeColumn}
                    columnOrder={columnOrder}
                    st={st}
                    locale={locale}
                    shotStrings={shotStrings}
                    onPatch={patch}
                    canSetAnchor={row.rowKind === "sequential"}
                    onSetAnchor={setAsAnchor}
                    canDemoteAnchor={canDemoteAnchorRow(rows, i)}
                    onDemoteAnchor={demoteAnchor}
                    onMove={moveRow}
                    onRemove={removeRow}
                    onDuplicate={duplicateRow}
                  />
                ))}
              </SortableContext>
            </tbody>
          </table>
        </DndContext>
      </div>
      {showTotal ? (
        <div className="flex flex-wrap items-baseline justify-start gap-x-2 gap-y-1 border-t border-border pt-3 text-sm">
          <span className="text-muted-foreground">{st.totalPlanned}</span>
          <span className="font-medium tabular-nums text-foreground">
            {formatTotalScheduleMinutes(totalDurationMinutes, st)}
          </span>
        </div>
      ) : null}
    </div>
  );
}

export const DagsplanScheduleTable = memo(DagsplanScheduleTableComponent);
