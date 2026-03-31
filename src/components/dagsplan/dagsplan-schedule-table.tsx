"use client";

import { useMemo } from "react";
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
import { Anchor, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  isScheduleLunchRow,
  recalculateScheduleRows,
  sumScheduleDurationMinutes,
  type ScheduleRow,
} from "@/lib/schedule-rows";
import { cn } from "@/lib/utils";

export type { ScheduleRow };

const SCHEDULE_TABLE_INPUT = "h-7 min-h-7 px-2 text-xs";

/** Må fylle cellen (w-full); fast kolonnebredd styres av <col> + td. */
const SCHEDULE_SELECT_TRIGGER =
  "h-7 min-h-7 w-full min-w-0 max-w-full gap-0 px-1 py-0 text-xs [&>svg]:h-3 [&>svg]:w-3 [&>svg]:shrink-0 [&>svg]:opacity-60";

function toIESelectValue(v: string): "I" | "E" | "_empty" {
  const t = v.trim();
  if (t === "I" || t === "i") return "I";
  if (t === "E" || t === "e") return "E";
  return "_empty";
}

function toDNSelectValue(v: string): "D" | "N" | "_empty" {
  const t = v.trim();
  if (t === "D" || t === "d") return "D";
  if (t === "N" || t === "n") return "N";
  return "_empty";
}

function formatTotalScheduleMinutes(total: number): string {
  if (total <= 0) return "0 min";
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} t`;
  return `${h} t ${m} min`;
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
  onPatch: (id: string, patch: Partial<ScheduleRow>) => void;
  onSetAnchor?: () => void;
  onDemoteAnchor?: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row.id });

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
  const editableDuration = !isFree;

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={cn(
        "border-b border-border/60",
        isFree && "bg-amber-500/[0.06] dark:bg-amber-950/25",
        isAnchor && "border-l-2 border-primary/45",
        isLunch &&
          "text-destructive [&>td:first-child]:text-muted-foreground [&>td:last-child]:text-muted-foreground [&>td:last-child_button]:text-muted-foreground [&>td:last-child_button:hover]:text-foreground",
      )}
    >
      <td className="w-9 py-0.5 pr-0.5 align-middle">
        <button
          type="button"
          className="touch-none rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Dra for å flytte rad"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </td>
      <td className="w-14 py-0.5 pr-1 align-middle">
        {isFree ? (
          <span
            className={cn(
              "inline-flex h-7 min-w-[3.25rem] items-center justify-center rounded-md border px-1.5 text-[10px] transition-colors",
              "border-border bg-background text-muted-foreground",
              isLunch && "border-destructive/40 text-destructive",
            )}
            aria-label="Frifelt"
          >
            Fri
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
        {editableEnd ? (
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
            className={cn(SCHEDULE_SELECT_TRIGGER, isLunch && "text-destructive")}
            title="Interiør / eksteriør"
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
        {editableDuration ? (
          <Input
            className={cn(
              `w-[72px] ${SCHEDULE_TABLE_INPUT}`,
              isLunch && "text-destructive",
            )}
            type="number"
            min={0}
            step={5}
            value={Number.isFinite(row.durationMinutes) ? row.durationMinutes : 0}
            onChange={(e) => {
              const n = Number(e.target.value);
              onPatch(row.id, {
                durationMinutes: Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0,
              });
            }}
            aria-label="Varighet i minutter"
          />
        ) : (
          <Input
            className={cn(
              `w-[72px] ${SCHEDULE_TABLE_INPUT} bg-muted/40`,
              isLunch ? "text-destructive" : "text-muted-foreground",
            )}
            type="number"
            readOnly
            tabIndex={-1}
            value={Number.isFinite(row.durationMinutes) ? row.durationMinutes : 0}
            aria-label="Varighet (fra–til)"
          />
        )}
      </td>
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
          title="Aktør(er)"
        />
      </td>
      <td className="w-[8rem] max-w-[8rem] shrink-0 py-0.5 pr-0.5 align-middle">
        <RowActions
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          onRemove={onRemove}
          disableUp={index === 0}
          disableDown={index === total - 1}
        />
      </td>
    </tr>
  );
}

export function DagsplanScheduleTable({
  rows,
  onRowsChange,
}: {
  rows: ScheduleRow[];
  onRowsChange: (rows: ScheduleRow[]) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function commit(next: ScheduleRow[], recalc: boolean) {
    onRowsChange(recalc ? recalculateScheduleRows(next) : next);
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

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <DndContext
          id="dagsplan-schedule-dnd"
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <table className="w-full min-w-[1008px] table-fixed border-collapse text-sm">
            <colgroup>
              <col className="w-9" />
              <col className="w-14" />
              <col className="w-[100px]" />
              <col className="w-[100px]" />
              <col className="w-[3.5rem]" />
              <col className="w-[3.5rem]" />
              <col className="w-[16%]" />
              <col className="w-[72px]" />
              <col className="w-[42%]" />
              <col className="w-[5rem]" />
              <col className="w-[8rem]" />
            </colgroup>
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="pb-1.5 pr-0.5 font-medium">
                  <span className="sr-only">Flytt</span>
                </th>
                <th className="pb-1.5 pr-1 font-medium">
                  <span className="sr-only">Anker eller auto</span>
                </th>
                <th className="pb-1.5 pr-1 font-medium">Fra</th>
                <th className="pb-1.5 pr-1 font-medium">Til</th>
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
                <th className="min-w-0 pb-1.5 pr-1 font-medium">Info</th>
                <th className="pb-1.5 pr-1 font-medium">
                  <span className="whitespace-nowrap">Varighet</span>{" "}
                  <span className="font-normal text-[10px] text-muted-foreground">
                    (min)
                  </span>
                </th>
                <th className="min-w-0 pb-1.5 pr-1 font-medium">
                  Scene / setting
                </th>
                <th
                  className="min-w-[5rem] w-[5rem] pb-1.5 pr-0.5 text-center text-[10px] font-medium leading-none whitespace-nowrap"
                  title="Aktør(er)"
                >
                  Aktør(er)
                </th>
                <th className="w-[8rem] max-w-[8rem] pb-1.5 pr-0.5">
                  <span className="sr-only">Handlinger</span>
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
        <span className="text-muted-foreground">Totalt planlagt</span>
        <span className="font-medium tabular-nums text-foreground">
          {formatTotalScheduleMinutes(totalDurationMinutes)}
        </span>
      </div>
    </div>
  );
}
