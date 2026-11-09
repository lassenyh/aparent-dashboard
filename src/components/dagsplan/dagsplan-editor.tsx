"use client";

import { LocationPlaceSearch } from "@/components/dagsplan/location-place-search";

import { useRouter } from "next/navigation";
import { ChevronDown, Eye, FileDown, GripVertical, Loader2, Plus, Save, Trash2 } from "lucide-react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  sortableKeyboardCoordinates,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { flushSync } from "react-dom";
import { toast } from "sonner";
import { WeatherIconKind } from "@/generated/prisma/enums";
import type { CrewDatabasePersonOption } from "@/actions/dagsplan";
import { fetchDagsplanWeather } from "@/actions/dagsplan-weather";
import {
  addDagsplanLocation,
  deleteDagsplan,
  duplicateDagsplan,
  removeDagsplanLogo,
  removeDagsplanLocation,
  saveDagsplan,
  saveDagsplanLocations,
  uploadDagsplanLogo,
} from "@/actions/dagsplan";
import { DagsplanWeatherCard } from "@/components/dagsplan/dagsplan-weather-card";
import { WEATHER_ICON_OPTIONS } from "@/lib/weather-icon";
import { APARENT_LOGO_PUBLIC_PATH } from "@/lib/dagsplan-defaults";
import {
  SCHEDULE_CALL_TIME_DEFAULT_ROW_BG,
  SCHEDULE_COMPANY_MOVE_DEFAULT_ROW_BG,
  SCHEDULE_PRERIGG_DEFAULT_ROW_BG,
  SCHEDULE_RECORDING_DEFAULT_ROW_BG,
  SCHEDULE_WRAP_DEFAULT_ROW_BG,
} from "@/lib/schedule-row-colors";
import {
  emptyScheduleRow,
  inferWorkHoursFromScheduleRows,
  isScheduleCallTimeRow,
  recalculateScheduleRows,
  rowKindForNewSequentialRow,
  sumScheduleDurationMinutes,
  SCHEDULE_CALL_TIME_INFO,
  SCHEDULE_INTERIOR_EXTERIOR_TRUCK,
  SCHEDULE_PRE_WRAP_INFO,
  SCHEDULE_WRAP_INFO,
} from "@/lib/schedule-rows";
import { buildGoogleMapsSearchUrl } from "@/lib/google-maps-url";
import { sortDagsplanCrewRowsByDepartmentOrder } from "@/lib/crew-department-order";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ParkingImageDropzone } from "@/components/dagsplan/parking-image-dropzone";
import {
  DagsplanScheduleTable,
  formatTotalScheduleMinutes,
  type ScheduleRow,
} from "@/components/dagsplan/dagsplan-schedule-table";
import { DagsplanLogoGrid } from "@/components/dagsplan/dagsplan-logo-grid";
import { DagsplanPdfLoading } from "@/components/dagsplan/dagsplan-pdf-loading";
import { PageBackLink } from "@/components/page-back-link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  normalizeScheduleColumnOrder,
  type ScheduleColumnId,
} from "@/lib/schedule-columns";
import {
  getDagsplanEditorStrings,
  getDagsplanLocationStrings,
  getScheduleTableStrings,
  translateCrewDepartmentTitle,
  type DagsplanLocale,
} from "@/lib/dagsplan-i18n";

export type CrewSuggestion = {
  projectCrewId: string;
  personId: string;
  departmentTitle: string;
  personName: string;
  mobile: string;
  email: string;
};

export type DagsplanLocationRowState = {
  id: string;
  /** Visningsnavn (adresse ligger i `locationText` og brukes til Maps-søk). */
  locationName: string;
  locationText: string;
  locationMapsUrl: string;
  latitude: number | null;
  longitude: number | null;
  parkingText: string;
  parkingMapsUrl: string;
  parkingImageUrl: string;
};

export type DagsplanEditorInitial = {
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  shootDate: string;
  agencyLogoUrl: string;
  clientLogoUrl: string;
  extraClientLogoUrl?: string;
  agencyLogoHidden: boolean;
  clientLogoHidden: boolean;
  locationRows: DagsplanLocationRowState[];
  infoText: string;
  weatherIcon: WeatherIconKind;
  weatherTempMin: string;
  weatherTempMax: string;
  weatherText: string;
  weatherLocationName: string;
  weatherLatitude: number | null;
  weatherLongitude: number | null;
  weatherFromMet: boolean;
  emergencyNumbersText: string;
  radioChannelsText: string;
  /** false = ekskludert fra utskrift (ikke vis tabell på utskrift). */
  printIncludeActors: boolean;
  printIncludeDepartmentInfo: boolean;
  /** false = timeplan-tabell ekskludert fra utskrift. */
  printIncludeSchedule: boolean;
  /** Arbeid fra/til (HH:mm) når timeplan ikke er med på print — ellers utledes fra timeplan ved lagring. */
  workStartTime: string;
  workEndTime: string;
  /** Tom = automatisk Oslo på opptaksdato; ellers manuell tid (HH:mm). */
  sunriseTimeOverride: string;
  sunsetTimeOverride: string;
  crewRows: Array<{
    departmentTitle: string;
    personName: string;
    mobile: string;
    email: string;
    onSetTime: string;
    linkedProjectCrewId: string | null;
    linkedPersonId: string | null;
  }>;
  actorRows: Array<{
    id: string;
    actorName: string;
    meetTime: string;
    readyOnSetTime: string;
  }>;
  scheduleRows: ScheduleRow[];
  imageAssets: Array<{ id: string; url: string; name: string }>;
  departmentRows: Array<{
    departmentName: string;
    info: string;
  }>;
  /** Kolonne «Shot» (bilde) mellom varighet og scene — skjules som standard. */
  showShotColumn: boolean;
  /** Valgfrie timeplankolonner; skjuling beholder alle radverdier. */
  showInteriorExteriorColumn: boolean;
  showDayNightColumn: boolean;
  showActorColumn: boolean;
  showCostumeColumn: boolean;
  scheduleColumnOrder: ScheduleColumnId[];
  /** UI og print: norsk eller engelsk. */
  displayLocale: DagsplanLocale;
  /** Fallback for visning når dagsplan-felt er tomt */
  projectAgencyLogoUrl: string | null;
  projectClientLogoUrl: string | null;
};

/** Én linje som standard; blir høyere når innholdet krever det (`field-sizing: content`). */
const DAGSPLAN_TEXTAREA_AUTO =
  "min-h-9 resize-none [field-sizing:content] max-h-[min(50vh,24rem)] overflow-y-auto";

/** Kompakte tabellfelt (oppmøte, aktører, avdeling). */
const DAGSPLAN_TABLE_INPUT = "h-7 min-h-7 px-2 text-xs";

const SCHEDULE_ADD_BUTTON_CLASS =
  "group gap-0 transition-[background,color,border-color,transform,box-shadow] duration-150 motion-safe:hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0 active:shadow-none";

function ScheduleAddButtonLabel({ children }: { children: ReactNode }) {
  return (
    <>
      <span
        aria-hidden="true"
        className="inline-flex w-0 overflow-hidden opacity-0 transition-[width,margin,opacity] duration-150 group-hover:mr-1.5 group-hover:w-3.5 group-hover:opacity-100"
      >
        <Plus className="h-3.5 w-3.5" />
      </span>
      <span>{children}</span>
    </>
  );
}

function parseTempInput(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const n = Number(t.replace(",", "."));
  if (!Number.isFinite(n)) return null;
  return Math.round(n);
}

function moveRow<T>(rows: T[], index: number, dir: -1 | 1): T[] {
  const j = index + dir;
  if (j < 0 || j >= rows.length) return rows;
  const next = [...rows];
  [next[index], next[j]] = [next[j], next[index]];
  return next;
}

function DagsplanLocationBlock({
  projectId,
  index,
  row,
  loc,
  onChange,
  onRemove,
  onSaveLocations,
  locationSaveDisabled,
  collapsibleOpen,
  onCollapsibleOpenChange,
}: {
  projectId: string;
  index: number;
  row: DagsplanLocationRowState;
  loc: ReturnType<typeof getDagsplanLocationStrings>;
  onChange: (patch: Partial<DagsplanLocationRowState>) => void;
  onRemove: () => void;
  onSaveLocations: () => void | Promise<void>;
  locationSaveDisabled: boolean;
  /** Kun når total > 1: kontrollert åpen/lukket for denne raden. */
  collapsibleOpen: boolean;
  onCollapsibleOpenChange: (open: boolean) => void;
}) {
  const mapsSearchHref = useMemo(
    () => buildGoogleMapsSearchUrl(row.locationText),
    [row.locationText],
  );
  const baseId = row.id;
  const summaryLabel = useMemo(() => {
    const name = row.locationName.trim();
    const addr = row.locationText.trim();
    if (name) return name;
    if (addr) return addr.length > 48 ? `${addr.slice(0, 45)}…` : addr;
    return "";
  }, [row.locationName, row.locationText]);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row.id });

  const fields = (
    <div className="grid max-w-3xl gap-4">
      <LocationPlaceSearch projectId={projectId} onSelect={onChange} />

      <div className="space-y-2">
        <Label htmlFor={`${baseId}-locationName`}>{loc.locationName}</Label>
        <Input
          id={`${baseId}-locationName`}
          value={row.locationName}
          onChange={(e) => onChange({ locationName: e.target.value })}
          placeholder={loc.locationNamePh}
        />
      </div>
      <div className="space-y-2">
        <div className="flex flex-nowrap items-center justify-between gap-2">
          <Label
            htmlFor={`${baseId}-locationText`}
            className="shrink-0 leading-none"
          >
            {loc.address}
          </Label>
          {mapsSearchHref ? (
            <Button
              variant="outline"
              size="sm"
              className="h-8 shrink-0 whitespace-nowrap"
              asChild
            >
              <a
                href={mapsSearchHref}
                target="_blank"
                rel="noopener noreferrer"
              >
                {loc.openInMaps}
              </a>
            </Button>
          ) : (
            <span className="min-w-0 truncate text-right text-xs text-muted-foreground">
              {loc.fillAddressForMaps}
            </span>
          )}
        </div>
        <Textarea
          id={`${baseId}-locationText`}
          rows={1}
          value={row.locationText}
          onChange={(e) =>
            onChange({
              locationText: e.target.value,
              latitude: null,
              longitude: null,
            })
          }
          placeholder={loc.addressPlaceholder}
          className={DAGSPLAN_TEXTAREA_AUTO}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${baseId}-locationMapsUrl`}>{loc.mapsLink}</Label>
        <Input
          id={`${baseId}-locationMapsUrl`}
          value={row.locationMapsUrl}
          onChange={(e) => onChange({ locationMapsUrl: e.target.value })}
          placeholder={loc.mapsLinkPh}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${baseId}-parkingText`}>{loc.parkingTransport}</Label>
        <Textarea
          id={`${baseId}-parkingText`}
          rows={1}
          value={row.parkingText}
          onChange={(e) => onChange({ parkingText: e.target.value })}
          placeholder={loc.parkingTransportPh}
          className={DAGSPLAN_TEXTAREA_AUTO}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${baseId}-parkingMapsUrl`}>{loc.parkingMapsLink}</Label>
        <Input
          id={`${baseId}-parkingMapsUrl`}
          value={row.parkingMapsUrl}
          onChange={(e) => onChange({ parkingMapsUrl: e.target.value })}
          placeholder={loc.parkingMapsLinkPh}
        />
      </div>
      <div className="space-y-2 border-t border-border/60 pt-4">
        <Label>{loc.parkingImage}</Label>
        <p className="text-xs text-muted-foreground">
          {loc.parkingImageHint}
        </p>
        <ParkingImageDropzone
          locationId={row.id}
          imageUrl={row.parkingImageUrl}
          onImageUrlChange={(parkingImageUrl) => onChange({ parkingImageUrl })}
        />
      </div>
      <div className="flex justify-end border-t border-border/60 pt-4">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={locationSaveDisabled}
          onClick={() => void onSaveLocations()}
        >
          {loc.save}
        </Button>
      </div>
    </div>
  );

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.55 : undefined,
      }}
      className="rounded-lg border border-border bg-muted/20 p-2 shadow-sm"
    >
      <Collapsible
        open={collapsibleOpen}
        onOpenChange={onCollapsibleOpenChange}
      >
        <div className="flex min-h-8 items-center gap-1.5">
          <button
            type="button"
            className="touch-none rounded-md p-1.5 text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Flytt location ${index + 1}`}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" aria-hidden />
          </button>
          <CollapsibleTrigger
            type="button"
            className={cn(
              "group flex h-8 min-h-8 min-w-0 flex-1 items-center justify-between gap-2 rounded-md px-2 text-left text-sm font-semibold leading-none text-foreground outline-none transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring",
            )}
          >
            <span className="flex min-w-0 items-center gap-2">
              <span className="shrink-0 rounded-full border border-border bg-background px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Location {index + 1}
              </span>
              {summaryLabel ? (
                <span className="truncate">{summaryLabel}</span>
              ) : null}
            </span>
            <span className="inline-flex shrink-0 items-center gap-1.5 border border-border px-2 py-1 text-xs font-normal text-muted-foreground">
              {collapsibleOpen ? loc.collapse : loc.expand}
              <ChevronDown aria-hidden="true" className="h-3.5 w-3.5 transition-transform duration-200 group-data-[state=open]:rotate-180" />
            </span>
          </CollapsibleTrigger>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 shrink-0 px-0 text-muted-foreground"
            onClick={onRemove}
            aria-label={`Slett location ${index + 1}`}
          >
            ×
          </Button>
        </div>
        <CollapsibleContent className="overflow-hidden">
          <div className="pt-3">{fields}</div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

export function DagsplanEditor({
  initial,
  crewSuggestions,
  crewDatabaseOptions,
}: {
  initial: DagsplanEditorInitial;
  crewSuggestions: CrewSuggestion[];
  crewDatabaseOptions: CrewDatabasePersonOption[];
}) {
  const router = useRouter();
  const [state, setState] = useState<DagsplanEditorInitial>(() => ({
    ...initial,
    printIncludeActors: initial.printIncludeActors ?? true,
    printIncludeDepartmentInfo: initial.printIncludeDepartmentInfo ?? true,
    printIncludeSchedule: initial.printIncludeSchedule ?? true,
    workStartTime: initial.workStartTime ?? "",
    workEndTime: initial.workEndTime ?? "",
    showShotColumn: initial.showShotColumn ?? false,
    showInteriorExteriorColumn: initial.showInteriorExteriorColumn ?? true,
    showDayNightColumn: initial.showDayNightColumn ?? true,
    showActorColumn: initial.showActorColumn ?? false,
    showCostumeColumn: initial.showCostumeColumn ?? false,
    scheduleColumnOrder: normalizeScheduleColumnOrder(initial.scheduleColumnOrder),
    displayLocale: initial.displayLocale ?? "no",
  }));
  const handleScheduleRowsChange = useCallback((scheduleRows: ScheduleRow[]) => {
    setState((current) => ({ ...current, scheduleRows }));
  }, []);
  const handleSunriseTimeOverrideChange = useCallback((value: string) => {
    setState((current) => ({ ...current, sunriseTimeOverride: value }));
  }, []);
  const handleSunsetTimeOverrideChange = useCallback((value: string) => {
    setState((current) => ({ ...current, sunsetTimeOverride: value }));
  }, []);
  const draftStorageKey = `wrapup:dagsplan-draft:${initial.id}`;
  const draftHydratedRef = useRef(false);
  const [draftReady, setDraftReady] = useState(false);
  const [crewOnSetTimeForAll, setCrewOnSetTimeForAll] = useState("");

  useEffect(() => {
    if (draftHydratedRef.current) return;
    draftHydratedRef.current = true;

    try {
      const rawDraft = window.sessionStorage.getItem(draftStorageKey);
      if (!rawDraft) return;
      const parsedDraft: unknown = JSON.parse(rawDraft);
      if (
        !parsedDraft ||
        typeof parsedDraft !== "object" ||
        !("id" in parsedDraft) ||
        parsedDraft.id !== initial.id ||
        !("scheduleRows" in parsedDraft) ||
        !Array.isArray(parsedDraft.scheduleRows)
      ) {
        window.sessionStorage.removeItem(draftStorageKey);
        return;
      }

      const restored = parsedDraft as DagsplanEditorInitial;
      const restoredCrewRows = Array.isArray(restored.crewRows)
        ? restored.crewRows
        : [];
      const restoredProjectCrewIds = new Set(
        restoredCrewRows.flatMap((row) =>
          row.linkedProjectCrewId ? [row.linkedProjectCrewId] : [],
        ),
      );
      const restoredPersonIds = new Set(
        restoredCrewRows.flatMap((row) =>
          row.linkedPersonId ? [row.linkedPersonId] : [],
        ),
      );
      const newlySyncedCrewRows = initial.crewRows.filter(
        (row) =>
          (!row.linkedProjectCrewId ||
            !restoredProjectCrewIds.has(row.linkedProjectCrewId)) &&
          (!row.linkedPersonId || !restoredPersonIds.has(row.linkedPersonId)),
      );
      setState({
        ...restored,
        crewRows: sortDagsplanCrewRowsByDepartmentOrder([
          ...restoredCrewRows,
          ...newlySyncedCrewRows,
        ]),
        imageAssets: Array.isArray(restored.imageAssets)
          ? restored.imageAssets
          : initial.imageAssets,
        scheduleRows: restored.scheduleRows.map((row) => ({
          ...row,
          shotImageAssetId: row.shotImageAssetId ?? "",
          shotImageZoom: row.shotImageZoom ?? 1,
          shotImagePositionX: row.shotImagePositionX ?? 50,
          shotImagePositionY: row.shotImagePositionY ?? 50,
          shotImageFit: row.shotImageFit === "cover" ? "cover" : "contain",
        })),
      });
      toast.info("Ulagrede endringer ble gjenopprettet.");
    } catch {
      window.sessionStorage.removeItem(draftStorageKey);
    } finally {
      setDraftReady(true);
    }
  }, [draftStorageKey, initial.crewRows, initial.id, initial.imageAssets]);

  const clearLocalDraft = useCallback(() => {
    try {
      window.sessionStorage.removeItem(draftStorageKey);
    } catch {
      // Ingen handling nødvendig når nettleserlagring er utilgjengelig.
    }
  }, [draftStorageKey]);

  const t = useMemo(
    () => getDagsplanEditorStrings(state.displayLocale),
    [state.displayLocale],
  );
  const locStrings = useMemo(
    () => getDagsplanLocationStrings(state.displayLocale),
    [state.displayLocale],
  );
  const scheduleStrings = useMemo(
    () => getScheduleTableStrings(state.displayLocale),
    [state.displayLocale],
  );
  const totalScheduleMinutes = useMemo(
    () => sumScheduleDurationMinutes(state.scheduleRows),
    [state.scheduleRows],
  );
  const [saveState, setSaveState] = useState<string | null>(null);
  const [autoSaveState, setAutoSaveState] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState<"agency" | "client" | "extraClient" | null>(null);
  const [locationSavePending, setLocationSavePending] = useState(false);
  const [weatherPending, setWeatherPending] = useState(false);
  const [weatherSuggestion, setWeatherSuggestion] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewLoadError, setPreviewLoadError] = useState(false);
  const [previewAttempt, setPreviewAttempt] = useState(0);
  const [pdfDownloadPending, setPdfDownloadPending] = useState(false);
  const [crewWarningOpen, setCrewWarningOpen] = useState(false);
  const [removingLogo, setRemovingLogo] = useState<"agency" | "client" | "extraClient" | null>(null);
  const locationSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  /** Hvilken location-rad som er utvidet. `null` = alle lukket (standard ved åpning av siden). */
  const [openLocationId, setOpenLocationId] = useState<string | null>(null);
  const [companyMoveOpen, setCompanyMoveOpen] = useState(false);
  const [companyMoveManualText, setCompanyMoveManualText] = useState("");

  const handleLocationDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setState((current) => {
      const oldIndex = current.locationRows.findIndex(
        (location) => location.id === active.id,
      );
      const newIndex = current.locationRows.findIndex(
        (location) => location.id === over.id,
      );
      if (oldIndex < 0 || newIndex < 0) return current;
      return {
        ...current,
        locationRows: arrayMove(current.locationRows, oldIndex, newIndex),
      };
    });
  }, []);

  useEffect(() => {
    if (
      openLocationId &&
      !state.locationRows.some((r) => r.id === openLocationId)
    ) {
      setOpenLocationId(null);
    }
  }, [state.locationRows, openLocationId]);

  /**
   * Opplastede URL-er (logo, parkering, shot) lagres på server ved egen action og `router.refresh()`,
   * men React state ble kun satt ved mount — «Lagre alle» ville da sende tom streng og slette DB-felt.
   * Synk kun disse feltene fra `initial` når serverdata endres.
   */
  const initialServerAssetKey = useMemo(
    () =>
      JSON.stringify({
        agencyLogoUrl: initial.agencyLogoUrl,
        clientLogoUrl: initial.clientLogoUrl,
        extraClientLogoUrl: initial.extraClientLogoUrl,
        agencyLogoHidden: initial.agencyLogoHidden,
        clientLogoHidden: initial.clientLogoHidden,
        locations: initial.locationRows.map((r) => ({
          id: r.id,
          parkingImageUrl: r.parkingImageUrl,
        })),
        schedule: initial.scheduleRows.map((r) => ({
          id: r.id,
          shotImageUrl: r.shotImageUrl,
          shotImageAssetId: r.shotImageAssetId || null,
          shotImageZoom: r.shotImageZoom,
          shotImagePositionX: r.shotImagePositionX,
          shotImagePositionY: r.shotImagePositionY,
          shotImageFit: r.shotImageFit,
        })),
      }),
    [
      initial.agencyLogoUrl,
      initial.clientLogoUrl,
      initial.extraClientLogoUrl,
      initial.agencyLogoHidden,
      initial.clientLogoHidden,
      initial.locationRows,
      initial.scheduleRows,
    ],
  );

  useEffect(() => {
    setState((s) => ({
      ...s,
      agencyLogoUrl: initial.agencyLogoUrl,
      clientLogoUrl: initial.clientLogoUrl,
      extraClientLogoUrl: initial.extraClientLogoUrl,
      agencyLogoHidden: initial.agencyLogoHidden,
      clientLogoHidden: initial.clientLogoHidden,
      locationRows: s.locationRows.map((row) => {
        const fresh = initial.locationRows.find((r) => r.id === row.id);
        if (!fresh) return row;
        return {
          ...row,
          parkingImageUrl: fresh.parkingImageUrl,
        };
      }),
      scheduleRows: s.scheduleRows.map((row) => {
        const fresh = initial.scheduleRows.find((r) => r.id === row.id);
        if (!fresh) return row;
        return {
          ...row,
          shotImageUrl: fresh.shotImageUrl,
          shotImageAssetId: fresh.shotImageAssetId,
          shotImageZoom: fresh.shotImageZoom,
          shotImagePositionX: fresh.shotImagePositionX,
          shotImagePositionY: fresh.shotImagePositionY,
          shotImageFit: fresh.shotImageFit,
        };
      }),
    }));
  }, [initialServerAssetKey]);

  const displayAgencyLogo = state.agencyLogoHidden
    ? ""
    : state.agencyLogoUrl.trim() || initial.projectAgencyLogoUrl || "";
  const displayClientLogo = state.clientLogoHidden
    ? ""
    : state.clientLogoUrl.trim() || initial.projectClientLogoUrl || "";

  const usedProjectCrewIds = useMemo(
    () =>
      new Set(
        state.crewRows
          .map((r) => r.linkedProjectCrewId)
          .filter((id): id is string => Boolean(id)),
      ),
    [state.crewRows],
  );
  const usedPersonIds = useMemo(
    () =>
      new Set(
        state.crewRows
          .map((r) => r.linkedPersonId)
          .filter((id): id is string => Boolean(id)),
      ),
    [state.crewRows],
  );

  const availableProjectCrew = useMemo(
    () =>
      crewSuggestions.filter(
        (c) =>
          !usedProjectCrewIds.has(c.projectCrewId) &&
          !usedPersonIds.has(c.personId),
      ),
    [crewSuggestions, usedProjectCrewIds, usedPersonIds],
  );
  const availableCrewDatabase = useMemo(
    () => crewDatabaseOptions.filter((c) => !usedPersonIds.has(c.personId)),
    [crewDatabaseOptions, usedPersonIds],
  );

  const workHoursFromSchedule = useMemo(
    () => inferWorkHoursFromScheduleRows(state.scheduleRows),
    [state.scheduleRows],
  );
  const workHoursManual = !state.printIncludeSchedule;

  /** mailto: med alle unike e-poster fra oppmøtetid-tabellen (To-felt). */
  const crewMeetMailtoHref = useMemo(() => {
    const seen = new Set<string>();
    const emails: string[] = [];
    for (const r of state.crewRows) {
      const e = r.email.trim();
      if (!e.includes("@")) continue;
      const key = e.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      emails.push(e);
    }
    if (emails.length === 0) return null;
    const subject = `${state.projectName} · ${state.title}`.trim();
    return `mailto:${emails.join(",")}?${new URLSearchParams({ subject }).toString()}`;
  }, [state.crewRows, state.projectName, state.title]);

  function appendCompanyMoveRow(address: string) {
    setCompanyMoveOpen(false);
    setCompanyMoveManualText("");
    setState((s) => {
      const id = crypto.randomUUID();
      const kind = rowKindForNewSequentialRow(
        s.scheduleRows[s.scheduleRows.length - 1],
      );
      const row = {
        ...emptyScheduleRow(id, kind),
        info: "Company move",
        interiorExterior: SCHEDULE_INTERIOR_EXTERIOR_TRUCK,
        sceneSetting: address.trim(),
        durationMinutes: 30,
        rowBgColor: SCHEDULE_COMPANY_MOVE_DEFAULT_ROW_BG,
      };
      return {
        ...s,
        scheduleRows: recalculateScheduleRows([...s.scheduleRows, row]),
      };
    });
  }

  function appendSchedulePresetRow(
    info: string,
    rowBgColor: string,
    durationMinutes = 30,
  ) {
    setState((s) => {
      const id = crypto.randomUUID();
      const kind = rowKindForNewSequentialRow(
        s.scheduleRows[s.scheduleRows.length - 1],
      );
      const row = {
        ...emptyScheduleRow(id, kind),
        info,
        durationMinutes,
        rowBgColor,
      };
      return {
        ...s,
        scheduleRows: recalculateScheduleRows([...s.scheduleRows, row]),
      };
    });
  }

  const payload = useMemo(() => {
    const crewRows = state.crewRows.map((r, i) => ({
      ...r,
      sortOrder: i,
      linkedProjectCrewId: r.linkedProjectCrewId || null,
      linkedPersonId: r.linkedPersonId || null,
    }));
    const actorRows = state.actorRows.map((r, i) => ({
      actorNumber: String(i + 1),
      actorName: r.actorName,
      meetTime: r.meetTime,
      readyOnSetTime: r.readyOnSetTime,
      sortOrder: i,
    }));
    const scheduleRows = state.scheduleRows.map((r, i) => ({
      id: r.id,
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
      shotImageUrl: r.shotImageUrl?.trim() || null,
      shotImageAssetId: r.shotImageAssetId || null,
      shotImageZoom: r.shotImageZoom,
      shotImagePositionX: r.shotImagePositionX,
      shotImagePositionY: r.shotImagePositionY,
      shotImageFit: r.shotImageFit,
      rowBgColor: r.rowBgColor?.trim() || null,
      sortOrder: i,
    }));
    const departmentRows = state.departmentRows.map((r, i) => ({
      ...r,
      sortOrder: i,
    }));
    const inferredWh = inferWorkHoursFromScheduleRows(state.scheduleRows);
    const workStartTimeSaved = state.printIncludeSchedule
      ? inferredWh.workStartTime || null
      : state.workStartTime.trim() || null;
    const workEndTimeSaved = state.printIncludeSchedule
      ? inferredWh.workEndTime || null
      : state.workEndTime.trim() || null;
    return {
      id: state.id,
      title: state.title,
      shootDate: state.shootDate,
      workStartTime: workStartTimeSaved,
      workEndTime: workEndTimeSaved,
      agencyLogoUrl: state.agencyLogoUrl || null,
      clientLogoUrl: state.clientLogoUrl || null,
      extraClientLogoUrl: state.extraClientLogoUrl || null,
      locationRows: state.locationRows.map((r, i) => ({
        id: r.id,
        locationName: r.locationName || null,
        locationText: r.locationText || null,
        locationMapsUrl: r.locationMapsUrl || null,
        latitude: r.latitude,
        longitude: r.longitude,
        parkingText: r.parkingText || null,
        parkingMapsUrl: r.parkingMapsUrl || null,
        parkingImageUrl: r.parkingImageUrl || null,
        sortOrder: i,
      })),
      infoText: state.infoText || null,
      weatherIcon: state.weatherIcon,
      weatherTempMin: parseTempInput(state.weatherTempMin),
      weatherTempMax: parseTempInput(state.weatherTempMax),
      weatherText: state.weatherText || null,
      weatherLocationName: state.weatherLocationName || null,
      weatherLatitude: state.weatherLatitude,
      weatherLongitude: state.weatherLongitude,
      weatherFromMet: state.weatherFromMet,
      emergencyNumbersText: state.emergencyNumbersText || null,
      radioChannelsText: state.radioChannelsText || null,
      printIncludeActors: state.printIncludeActors,
      printIncludeDepartmentInfo: state.printIncludeDepartmentInfo,
      printIncludeSchedule: state.printIncludeSchedule,
      showShotColumn: state.showShotColumn,
      showInteriorExteriorColumn: state.showInteriorExteriorColumn,
      showDayNightColumn: state.showDayNightColumn,
      showActorColumn: state.showActorColumn,
      showCostumeColumn: state.showCostumeColumn,
      scheduleColumnOrder: state.scheduleColumnOrder,
      displayLocale: state.displayLocale,
      sunriseTimeOverride: state.sunriseTimeOverride.trim() || null,
      sunsetTimeOverride: state.sunsetTimeOverride.trim() || null,
      crewRows,
      actorRows,
      scheduleRows,
      departmentRows,
    };
  }, [state]);
  const payloadFingerprint = useMemo(() => JSON.stringify(payload), [payload]);
  const latestPayloadRef = useRef(payload);
  const latestFingerprintRef = useRef(payloadFingerprint);
  const lastSavedFingerprintRef = useRef(payloadFingerprint);
  const [lastSavedFingerprint, setLastSavedFingerprint] = useState(
    payloadFingerprint,
  );
  const autosaveInFlightRef = useRef(false);
  const hasUnsavedChanges = payloadFingerprint !== lastSavedFingerprint;

  useEffect(() => {
    if (!draftReady) return;
    if (!hasUnsavedChanges) {
      clearLocalDraft();
      return;
    }
    const timeoutId = window.setTimeout(() => {
      try {
        window.sessionStorage.setItem(draftStorageKey, JSON.stringify(state));
      } catch {
        // Skjemaet fungerer fortsatt selv om nettleseren ikke tillater sessionStorage.
      }
    }, 400);

    return () => window.clearTimeout(timeoutId);
  }, [
    clearLocalDraft,
    draftReady,
    draftStorageKey,
    hasUnsavedChanges,
    state,
  ]);

  useEffect(() => {
    latestPayloadRef.current = payload;
    latestFingerprintRef.current = payloadFingerprint;
  }, [payload, payloadFingerprint]);

  useEffect(() => {
    if (!previewOpen || !previewLoading) return;

    const timeoutId = window.setTimeout(() => {
      setPreviewLoading(false);
      setPreviewLoadError(true);
    }, 20_000);

    return () => window.clearTimeout(timeoutId);
  }, [previewAttempt, previewOpen, previewLoading]);

  const save = useCallback(() => {
    setSaveState(null);
    setAutoSaveState(null);
    startTransition(async () => {
      try {
      const res = await saveDagsplan(null, payload);
      if (res?.error) {
        toast.error(res.error);
        setSaveState(res.error);
      } else {
        lastSavedFingerprintRef.current = payloadFingerprint;
        setLastSavedFingerprint(payloadFingerprint);
        clearLocalDraft();
        toast.success(t.toastSaved);
      }
      } catch {
        const message = "Kunne ikke lagre. Endringene er fortsatt i skjemaet. Prøv igjen.";
        toast.error(message);
        setSaveState(message);
      }
    });
  }, [clearLocalDraft, payload, payloadFingerprint, t]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (autosaveInFlightRef.current) return;
      if (pending || uploading !== null || locationSavePending) return;
      if (document.visibilityState !== "visible") return;
      if (latestFingerprintRef.current === lastSavedFingerprintRef.current) return;

      autosaveInFlightRef.current = true;
      void (async () => {
        const res = await saveDagsplan(null, latestPayloadRef.current);
        if (res?.error) {
          setAutoSaveState(`Autosave feilet: ${res.error}`);
        } else {
          lastSavedFingerprintRef.current = latestFingerprintRef.current;
          setLastSavedFingerprint(latestFingerprintRef.current);
          clearLocalDraft();
          setAutoSaveState(
            `Autosist lagret ${new Intl.DateTimeFormat("nb-NO", {
              hour: "2-digit",
              minute: "2-digit",
            }).format(new Date())}`,
          );
        }
      })().catch(() => {
        setAutoSaveState("Autosave feilet. Endringene er fortsatt i skjemaet. Prøv å lagre igjen.");
      }).finally(() => {
        autosaveInFlightRef.current = false;
      });
    }, 5 * 60 * 1000);

    return () => window.clearInterval(interval);
  }, [clearLocalDraft, locationSavePending, pending, uploading]);

  const saveLocations = useCallback(async () => {
    setLocationSavePending(true);
    try {
      const res = await saveDagsplanLocations({
        dagsplanId: state.id,
        locationRows: state.locationRows.map((r, i) => ({
          id: r.id,
          sortOrder: i,
          locationName: r.locationName,
          locationText: r.locationText,
          locationMapsUrl: r.locationMapsUrl,
          latitude: r.latitude,
          longitude: r.longitude,
          parkingText: r.parkingText,
          parkingMapsUrl: r.parkingMapsUrl,
          parkingImageUrl: r.parkingImageUrl,
        })),
      });
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      toast.success(t.toastLocationSaved);
      flushSync(() => {
        setOpenLocationId(null);
      });
    } catch {
      toast.error("Kunne ikke lagre location. Endringene er fortsatt i skjemaet. Prøv igjen.");
    } finally {
      setLocationSavePending(false);
    }
  }, [state.id, state.locationRows, t]);

  const fetchWeather = useCallback(async () => {
    if (state.weatherLatitude == null || state.weatherLongitude == null) {
      toast.error(t.weatherNeedLocation);
      return;
    }

    setWeatherPending(true);
    try {
      const result = await fetchDagsplanWeather({
        dagsplanId: state.id,
        shootDate: state.shootDate,
        latitude: state.weatherLatitude,
        longitude: state.weatherLongitude,
        workStartTime: state.printIncludeSchedule
          ? workHoursFromSchedule.workStartTime || null
          : state.workStartTime || null,
        workEndTime: state.printIncludeSchedule
          ? workHoursFromSchedule.workEndTime || null
          : state.workEndTime || null,
        locale: state.displayLocale,
      });
      if ("error" in result && result.error) {
        toast.error(result.error);
        return;
      }
      if ("forecast" in result && result.forecast) {
        const forecast = result.forecast;
        setState((current) => ({
          ...current,
          weatherIcon: forecast.weatherIcon,
          weatherTempMin: String(forecast.weatherTempMin),
          weatherTempMax: String(forecast.weatherTempMax),
          weatherFromMet: true,
        }));
        setWeatherSuggestion(forecast.weatherSuggestion);
        toast.success(t.weatherFetched);
      }
    } catch {
      toast.error(t.weatherFetchError);
    } finally {
      setWeatherPending(false);
    }
  }, [
    state.id,
    state.shootDate,
    state.printIncludeSchedule,
    state.workStartTime,
    state.workEndTime,
    state.displayLocale,
    state.weatherLatitude,
    state.weatherLongitude,
    t,
    workHoursFromSchedule,
  ]);

  async function handleLogoUpload(
    which: "agency" | "client" | "extraClient",
    formData: FormData,
  ) {
    setUploading(which);
    try {
      const r = await uploadDagsplanLogo(state.id, which, formData);
      if (r && "error" in r && r.error) {
        toast.error(r.error);
        return;
      }
      else {
        if (r && "publicPath" in r && r.publicPath) {
          setState((current) => ({
            ...current,
            ...(which === "agency"
              ? { agencyLogoUrl: r.publicPath, agencyLogoHidden: false }
              : which === "client"
                ? { clientLogoUrl: r.publicPath, clientLogoHidden: false }
                : { extraClientLogoUrl: r.publicPath }),
          }));
        }
        toast.success(t.toastLogoUploaded);
        router.refresh();
      }
    } finally {
      setUploading(null);
    }
  }

  async function handleLogoRemove(
    which: "agency" | "client" | "extraClient",
  ) {
    setRemovingLogo(which);
    try {
      const result = await removeDagsplanLogo(state.id, which);
      if (result && "error" in result && result.error) {
        toast.error(result.error);
        return;
      }
      setState((current) => ({
        ...current,
        ...(which === "agency"
          ? { agencyLogoUrl: "", agencyLogoHidden: true }
          : which === "client"
            ? { clientLogoUrl: "", clientLogoHidden: true }
            : { extraClientLogoUrl: "" }),
      }));
      toast.success(
        state.displayLocale === "en" ? "Logo removed" : "Logo fjernet",
      );
      router.refresh();
    } finally {
      setRemovingLogo(null);
    }
  }

  async function downloadPreviewPdf() {
    if (pdfDownloadPending) return;
    setPdfDownloadPending(true);
    try {
      const response = await fetch(`/api/dagsplan/${state.id}/pdf`);
      if (!response.ok) {
        let message = "Kunne ikke laste ned PDF. Prøv igjen.";
        try {
          const payload = (await response.json()) as { error?: string };
          if (payload.error) message = payload.error;
        } catch {
          // Behold generell feilmelding når svaret ikke er JSON.
        }
        throw new Error(message);
      }

      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") ?? "";
      const utf8Name = /filename\*=UTF-8''([^;]+)/i.exec(disposition)?.[1];
      const basicName = /filename="([^"]+)"/i.exec(disposition)?.[1];
      const filename = utf8Name
        ? decodeURIComponent(utf8Name)
        : basicName || "dagsplan.pdf";
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 1_000);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Kunne ikke laste ned PDF. Prøv igjen.",
      );
    } finally {
      setPdfDownloadPending(false);
    }
  }

  function requestPreviewPdfDownload() {
    if (availableProjectCrew.length > 0) {
      setCrewWarningOpen(true);
      return;
    }
    void downloadPreviewPdf();
  }

  function downloadPreviewPdfDespiteMissingCrew() {
    setCrewWarningOpen(false);
    void downloadPreviewPdf();
  }

  function addFromCrew(suggestion: CrewSuggestion) {
    setState((s) => ({
      ...s,
      crewRows: [
        ...s.crewRows,
        {
          departmentTitle: suggestion.departmentTitle,
          personName: suggestion.personName,
          mobile: suggestion.mobile,
          email: suggestion.email,
          onSetTime: "",
          linkedProjectCrewId: suggestion.projectCrewId,
          linkedPersonId: suggestion.personId,
        },
      ],
    }));
    toast.success(t.toastCrewRowAdded);
  }

  function addFromCrewDatabase(opt: CrewDatabasePersonOption) {
    setState((s) => {
      const newRow = {
        departmentTitle: opt.departmentTitle,
        personName: opt.personName,
        mobile: opt.mobile,
        email: opt.email,
        onSetTime: "",
        linkedProjectCrewId: null,
        linkedPersonId: opt.personId,
      };
      return {
        ...s,
        crewRows: sortDagsplanCrewRowsByDepartmentOrder([
          ...s.crewRows,
          newRow,
        ]),
      };
    });
    toast.success(t.toastCrewRowFromDb);
  }

  return (
    <>
      <div className="mb-6">
        <PageBackLink href={`/desk/projects/${state.projectId}`}>
          {state.projectName}
        </PageBackLink>
      </div>

      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="ap-kicker mb-1.5">Dagsplan</p>
          <h1 className="ap-page-title">
            {state.projectName} · {state.title}
          </h1>
          <p className="ap-code mt-1 text-muted-foreground">{state.shootDate}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="flex flex-wrap items-center gap-1 rounded-md border border-border bg-muted/30 px-2 py-1"
            role="group"
            aria-label={t.language}
          >
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {t.language}
            </span>
            <Button
              type="button"
              variant={state.displayLocale === "no" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() =>
                setState((s) => ({ ...s, displayLocale: "no" }))
              }
            >
              {t.langNo}
            </Button>
            <Button
              type="button"
              variant={state.displayLocale === "en" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() =>
                setState((s) => ({ ...s, displayLocale: "en" }))
              }
            >
              {t.langEn}
            </Button>
          </div>
          <form action={duplicateDagsplan.bind(null, state.id)}>
            <Button type="submit" variant="secondary" disabled={pending}>
              {t.duplicate}
            </Button>
          </form>
        </div>
      </header>

      {saveState ? (
        <p className="mb-3 text-sm text-destructive">{saveState}</p>
      ) : null}
      {autoSaveState ? (
        <p
          className={cn(
            "mb-3 text-sm",
            autoSaveState.startsWith("Autosave feilet")
              ? "text-destructive"
              : "text-muted-foreground",
          )}
        >
          {autoSaveState}
        </p>
      ) : null}

      <div className="pointer-events-none sticky top-4 z-40 mb-6 flex justify-end">
        <div className="pointer-events-auto flex items-center gap-2 rounded-lg border border-border bg-background/95 p-2 shadow-lg backdrop-blur">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setPreviewLoadError(false);
              setPreviewAttempt((attempt) => attempt + 1);
              setPreviewLoading(true);
              setPreviewOpen(true);
            }}
          >
            <Eye className="h-4 w-4" aria-hidden />
            {t.previewPrint}
          </Button>
          <Button
            type="button"
            disabled={pending}
            onClick={save}
            className={cn(
              "text-white [&_svg]:text-white",
              hasUnsavedChanges
                ? "border-blue-700 bg-blue-700 hover:bg-blue-800"
                : "border-seal bg-seal hover:bg-seal/90",
            )}
          >
            <Save className="h-4 w-4" aria-hidden />
            {pending ? t.saving : hasUnsavedChanges ? t.saveAll : t.save}
          </Button>
        </div>
      </div>

      <div className="space-y-10">
        <DagsplanEditorSection
          title={t.branding}
          collapseLabel={t.collapseSection}
          expandLabel={t.expandSection}
          defaultOpen={false}
          persistentSummary={
            <DagsplanLogoPreview
              agencyLogoUrl={displayAgencyLogo}
              clientLogoUrl={displayClientLogo}
              extraClientLogoUrl={state.extraClientLogoUrl}
              agencyAlt={t.agencyLogo}
              clientAlt={t.clientLogo}
            />
          }
        >
          <div className="flex flex-wrap gap-4">
            <form
              encType="multipart/form-data"
              className="flex flex-wrap items-end gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const fd = new FormData(form);
                await handleLogoUpload("agency", fd);
                form.reset();
              }}
            >
              <div className="space-y-1">
                <Label className="text-xs">{t.uploadAgencyLogo}</Label>
                <Input
                  name="logoFile"
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif"
                  disabled={uploading !== null}
                />
              </div>
              <Button
                type="submit"
                size="sm"
                variant="secondary"
                disabled={uploading !== null}
              >
                {uploading === "agency" ? t.uploadEllipsis : t.upload}
              </Button>
              {displayAgencyLogo ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  disabled={uploading !== null || removingLogo !== null}
                  onClick={() => void handleLogoRemove("agency")}
                >
                  {removingLogo === "agency" ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <Trash2 className="h-4 w-4" aria-hidden />
                  )}
                  {removingLogo === "agency" ? t.removingLogo : t.removeLogo}
                </Button>
              ) : null}
            </form>
            <form
              encType="multipart/form-data"
              className="flex flex-wrap items-end gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const fd = new FormData(form);
                await handleLogoUpload("client", fd);
                form.reset();
              }}
            >
              <div className="space-y-1">
                <Label className="text-xs">{t.uploadClientLogo}</Label>
                <Input
                  name="logoFile"
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif"
                  disabled={uploading !== null}
                />
              </div>
              <Button
                type="submit"
                size="sm"
                variant="secondary"
                disabled={uploading !== null}
              >
                {uploading === "client" ? t.uploadEllipsis : t.upload}
              </Button>
              {displayClientLogo ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  disabled={uploading !== null || removingLogo !== null}
                  onClick={() => void handleLogoRemove("client")}
                >
                  {removingLogo === "client" ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <Trash2 className="h-4 w-4" aria-hidden />
                  )}
                  {removingLogo === "client" ? t.removingLogo : t.removeLogo}
                </Button>
              ) : null}
            </form>
            <form
              encType="multipart/form-data"
              className="flex flex-wrap items-end gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const fd = new FormData(form);
                await handleLogoUpload("extraClient", fd);
                form.reset();
              }}
            >
              <div className="space-y-1">
                <Label className="text-xs">{state.displayLocale === "en" ? "Upload extra client logo (optional)" : "Last opp ekstra kundelogo (valgfritt)"}</Label>
                <Input
                  name="logoFile"
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif"
                  disabled={uploading !== null}
                />
              </div>
              <Button
                type="submit"
                size="sm"
                variant="secondary"
                disabled={uploading !== null}
              >
                {uploading === "extraClient" ? t.uploadEllipsis : t.upload}
              </Button>
              {state.extraClientLogoUrl ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  disabled={uploading !== null || removingLogo !== null}
                  onClick={() => void handleLogoRemove("extraClient")}
                >
                  {removingLogo === "extraClient" ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <Trash2 className="h-4 w-4" aria-hidden />
                  )}
                  {removingLogo === "extraClient" ? t.removingLogo : t.removeLogo}
                </Button>
              ) : null}
            </form>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {t.emptyLogoHint}
          </p>
        </DagsplanEditorSection>

        <DagsplanEditorSection
          title={t.planDetails}
          collapseLabel={t.collapseSection}
          expandLabel={t.expandSection}
        >
          <div className="grid max-w-xl gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">{t.title}</Label>
              <Input
                id="title"
                value={state.title}
                onChange={(e) =>
                  setState((s) => ({ ...s, title: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shootDate">{t.shootDate}</Label>
              <Input
                id="shootDate"
                type="date"
                value={state.shootDate}
                onChange={(e) =>
                  setState((s) => ({ ...s, shootDate: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="workStart">{t.workFrom}</Label>
                  <Input
                    id="workStart"
                    type="time"
                    readOnly={!workHoursManual}
                    tabIndex={workHoursManual ? 0 : -1}
                    value={
                      workHoursManual
                        ? state.workStartTime
                        : workHoursFromSchedule.workStartTime
                    }
                    onChange={
                      workHoursManual
                        ? (e) =>
                            setState((s) => ({
                              ...s,
                              workStartTime: e.target.value,
                            }))
                        : undefined
                    }
                    className={workHoursManual ? "" : "bg-muted/40"}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="workEnd">{t.workTo}</Label>
                  <Input
                    id="workEnd"
                    type="time"
                    readOnly={!workHoursManual}
                    tabIndex={workHoursManual ? 0 : -1}
                    value={
                      workHoursManual
                        ? state.workEndTime
                        : workHoursFromSchedule.workEndTime
                    }
                    onChange={
                      workHoursManual
                        ? (e) =>
                            setState((s) => ({
                              ...s,
                              workEndTime: e.target.value,
                            }))
                        : undefined
                    }
                    className={workHoursManual ? "" : "bg-muted/40"}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {workHoursManual ? t.workHoursManual : t.workHoursAuto}
              </p>
            </div>
          </div>
        </DagsplanEditorSection>

        <DagsplanEditorSection
          title={t.locations}
          collapseLabel={t.collapseSection}
          expandLabel={t.expandSection}
        >
          <div className="mb-4 flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => {
                const temporaryId = `new-${crypto.randomUUID()}`;
                const temporaryRow: DagsplanLocationRowState = {
                  id: temporaryId,
                  locationName: "",
                  locationText: "",
                  locationMapsUrl: "",
                  latitude: null,
                  longitude: null,
                  parkingText: "",
                  parkingMapsUrl: "",
                  parkingImageUrl: "",
                };
                setOpenLocationId(temporaryId);
                setState((current) => ({
                  ...current,
                  locationRows: [...current.locationRows, temporaryRow],
                }));
                const rollbackAdd = () => {
                  setState((current) => ({
                    ...current,
                    locationRows: current.locationRows.filter(
                      (location) => location.id !== temporaryId,
                    ),
                  }));
                  setOpenLocationId(null);
                };
                startTransition(async () => {
                  try {
                    const r = await addDagsplanLocation(state.id);
                    if ("error" in r && r.error) {
                      rollbackAdd();
                      toast.error(r.error);
                      return;
                    }
                    if ("id" in r) {
                      setOpenLocationId(r.id);
                      setState((current) => ({
                        ...current,
                        locationRows: current.locationRows.map((location) =>
                          location.id === temporaryId
                            ? { ...location, id: r.id }
                            : location,
                        ),
                      }));
                      toast.success(t.toastLocationAdded);
                    }
                  } catch {
                    rollbackAdd();
                    toast.error("Kunne ikke legge til location. Prøv igjen.");
                  }
                });
              }}
            >
              {t.newLocation}
            </Button>
          </div>
          <DndContext
            id="dagsplan-locations-dnd"
            sensors={locationSensors}
            collisionDetection={closestCenter}
            onDragEnd={handleLocationDragEnd}
          >
            <SortableContext
              items={state.locationRows.map((location) => location.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-6">
                {state.locationRows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {t.noLocationsHint}
                  </p>
                ) : null}
                {state.locationRows.map((row, i) => (
                  <DagsplanLocationBlock
                    projectId={state.projectId}
                    key={row.id}
                    index={i}
                    row={row}
                    loc={locStrings}
                    onChange={(patch) =>
                      setState((s) => {
                        const locationRows = [...s.locationRows];
                        locationRows[i] = { ...locationRows[i], ...patch };
                        return { ...s, locationRows };
                      })
                    }
                    onRemove={() => {
                  const removedRow = row;
                  const removedIndex = i;
                  const wasOpen = openLocationId === row.id;
                  setState((current) => ({
                    ...current,
                    locationRows: current.locationRows.filter(
                      (location) => location.id !== row.id,
                    ),
                  }));
                  if (wasOpen) setOpenLocationId(null);
                  const restoreRemovedRow = () => {
                    setState((current) => {
                      if (
                        current.locationRows.some(
                          (location) => location.id === removedRow.id,
                        )
                      ) {
                        return current;
                      }
                      const locationRows = [...current.locationRows];
                      locationRows.splice(
                        Math.min(removedIndex, locationRows.length),
                        0,
                        removedRow,
                      );
                      return { ...current, locationRows };
                    });
                    if (wasOpen) setOpenLocationId(removedRow.id);
                  };
                  startTransition(async () => {
                    try {
                      const r = await removeDagsplanLocation(row.id);
                      if ("error" in r && r.error) {
                        restoreRemovedRow();
                        toast.error(r.error);
                        return;
                      }
                      toast.success(t.toastLocationRemoved);
                    } catch {
                      restoreRemovedRow();
                      toast.error("Kunne ikke slette location. Prøv igjen.");
                    }
                  });
                    }}
                    onSaveLocations={saveLocations}
                    locationSaveDisabled={locationSavePending || pending}
                    collapsibleOpen={openLocationId === row.id}
                    onCollapsibleOpenChange={(open) =>
                      setOpenLocationId(open ? row.id : null)
                    }
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </DagsplanEditorSection>

        <DagsplanEditorSection
          title={t.infoWeather}
          collapseLabel={t.collapseSection}
          expandLabel={t.expandSection}
        >
          <div className="grid max-w-3xl gap-4">
            <div className="space-y-3 rounded-md border border-border bg-muted/20 p-4">
              <LocationPlaceSearch
                projectId={state.projectId}
                label={t.weatherForecastLocation}
                placeholder={t.weatherSearchPlaceholder}
                selectedMessage={t.weatherLocationSelected}
                action={
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-full"
                    disabled={
                      state.weatherLatitude == null ||
                      state.weatherLongitude == null ||
                      weatherPending
                    }
                    onClick={() => void fetchWeather()}
                  >
                    {weatherPending ? t.weatherFetching : t.weatherFetch}
                  </Button>
                }
                onSelect={(place) => {
                  setState((current) => ({
                    ...current,
                    weatherLocationName:
                      place.locationName.trim() || place.locationText.trim(),
                    weatherLatitude: place.latitude,
                    weatherLongitude: place.longitude,
                    weatherFromMet: false,
                  }));
                  setWeatherSuggestion(null);
                }}
              />
              <p className="text-sm">
                <span className="text-muted-foreground">
                  {t.weatherSelectedLocation}: {" "}
                </span>
                {state.weatherLocationName.trim() || t.weatherNoSelectedLocation}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="infoText">{t.generalInfo}</Label>
              <Textarea
                id="infoText"
                rows={1}
                value={state.infoText}
                onChange={(e) =>
                  setState((s) => ({ ...s, infoText: e.target.value }))
                }
                className={DAGSPLAN_TEXTAREA_AUTO}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weatherIcon">{t.weatherIcon}</Label>
              <Select
                value={state.weatherIcon}
                onValueChange={(v) =>
                  setState((s) => ({
                    ...s,
                    weatherIcon: v as WeatherIconKind,
                    weatherFromMet: false,
                  }))
                }
              >
                <SelectTrigger id="weatherIcon" className="max-w-md">
                  <SelectValue placeholder={t.pickIcon} />
                </SelectTrigger>
                <SelectContent>
                  {WEATHER_ICON_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid max-w-md grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="weatherTempMin">{t.minTemp}</Label>
                <Input
                  id="weatherTempMin"
                  inputMode="numeric"
                  value={state.weatherTempMin}
                  onChange={(e) =>
                    setState((s) => ({
                      ...s,
                      weatherTempMin: e.target.value,
                      weatherFromMet: false,
                    }))
                  }
                  placeholder="f.eks. 5"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weatherTempMax">{t.maxTemp}</Label>
                <Input
                  id="weatherTempMax"
                  inputMode="numeric"
                  value={state.weatherTempMax}
                  onChange={(e) =>
                    setState((s) => ({
                      ...s,
                      weatherTempMax: e.target.value,
                      weatherFromMet: false,
                    }))
                  }
                  placeholder="f.eks. 12"
                />
              </div>
            </div>
            {weatherSuggestion ? (
              <div className="flex flex-col gap-3 rounded-md border border-border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">
                    {t.weatherSuggestion}
                  </p>
                  <p className="text-sm">{weatherSuggestion}</p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  className="shrink-0"
                  onClick={() => {
                    setState((current) => ({
                      ...current,
                      weatherText: current.weatherText.trim()
                        ? `${current.weatherText.trim()}\n${weatherSuggestion}`
                        : weatherSuggestion,
                    }));
                    setWeatherSuggestion(null);
                    toast.success(t.weatherSuggestionAdded);
                  }}
                >
                  {t.weatherAddSuggestion}
                </Button>
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="weatherText">{t.weatherNotes}</Label>
              <Textarea
                id="weatherText"
                rows={1}
                value={state.weatherText}
                onChange={(e) =>
                  setState((s) => ({ ...s, weatherText: e.target.value }))
                }
                className={DAGSPLAN_TEXTAREA_AUTO}
              />
            </div>
            {state.weatherIcon !== WeatherIconKind.none ||
            parseTempInput(state.weatherTempMin) != null ||
            parseTempInput(state.weatherTempMax) != null ||
            state.weatherText.trim() ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  {t.weatherPreviewHint}
                </p>
                <DagsplanWeatherCard
                  weatherIcon={state.weatherIcon}
                  weatherTempMin={parseTempInput(state.weatherTempMin)}
                  weatherTempMax={parseTempInput(state.weatherTempMax)}
                  weatherText={state.weatherText}
                  weatherAttribution={
                    state.weatherFromMet ? t.weatherAttribution : undefined
                  }
                />
              </div>
            ) : null}
          </div>
        </DagsplanEditorSection>

        <DagsplanEditorSection
          title={t.crewMeet}
          collapseLabel={t.collapseSection}
          expandLabel={t.expandSection}
        >
          <div className="mb-4 flex flex-col gap-3">
            <p className="text-xs text-muted-foreground">
              {t.crewMeetIntro}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
              {availableCrewDatabase.length > 0 ? (
                <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:max-w-[min(100%,360px)]">
                  <span className="text-xs text-muted-foreground">
                    {t.addFromCrewDb}
                  </span>
                  <Select
                    key={`db-${availableCrewDatabase.length}-${state.crewRows.length}`}
                    onValueChange={(v) => {
                      const opt = crewDatabaseOptions.find((c) => c.personId === v);
                      if (opt) addFromCrewDatabase(opt);
                    }}
                  >
                    <SelectTrigger className="w-full bg-background">
                      <SelectValue placeholder={t.pickPerson} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCrewDatabase.map((c) => (
                        <SelectItem key={c.personId} value={c.personId}>
                          {c.personName}
                          {c.departmentTitle && c.departmentTitle !== "—"
                            ? ` · ${c.departmentTitle}`
                            : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              {availableProjectCrew.length > 0 ? (
                <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:max-w-[min(100%,360px)]">
                  <span className="text-xs text-muted-foreground">
                    {t.addFromProjectCrew}
                  </span>
                  <Select
                    key={`pc-${availableProjectCrew.length}-${state.crewRows.length}`}
                    onValueChange={(v) => {
                      const s = crewSuggestions.find((c) => c.projectCrewId === v);
                      if (s) addFromCrew(s);
                    }}
                  >
                    <SelectTrigger className="w-full bg-background">
                      <SelectValue placeholder={t.pick} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableProjectCrew.map((c) => (
                        <SelectItem key={c.projectCrewId} value={c.projectCrewId}>
                          {c.personName} · {c.departmentTitle}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </div>
            <div className="flex flex-wrap items-end gap-2 rounded-md border border-border/70 bg-muted/25 px-3 py-2.5">
              <div className="space-y-1">
                <Label htmlFor="crew-on-set-time-for-all" className="text-xs">
                  {t.crewOnSetAll}
                </Label>
                <Input
                  id="crew-on-set-time-for-all"
                  className="h-8 w-[7.25rem] tabular-nums"
                  type="time"
                  value={crewOnSetTimeForAll}
                  onChange={(event) => setCrewOnSetTimeForAll(event.target.value)}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                disabled={!crewOnSetTimeForAll || state.crewRows.length === 0}
                onClick={() => {
                  setState((current) => ({
                    ...current,
                    crewRows: current.crewRows.map((row) => ({
                      ...row,
                      onSetTime: crewOnSetTimeForAll,
                    })),
                  }));
                  toast.success(
                    state.displayLocale === "en"
                      ? `On-set time applied to ${state.crewRows.length} crew members.`
                      : `På sett-tid lagt inn på ${state.crewRows.length} personer.`,
                  );
                }}
              >
                {t.crewApplyOnSetAll}
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="pb-1.5 pr-2 font-medium">{t.crewFunction}</th>
                  <th className="pb-1.5 pr-2 font-medium">{t.crewName}</th>
                  <th className="pb-1.5 pr-2 font-medium">{t.crewMobile}</th>
                  <th className="pb-1.5 pr-2 font-medium">{t.crewEmail}</th>
                  <th className="pb-1.5 pr-2 font-medium">{t.crewOnSet}</th>
                  <th className="w-20 pb-1.5" />
                </tr>
              </thead>
              <tbody>
                {state.crewRows.map((row, i) => (
                  <tr key={i} className="border-b border-border/60">
                    <td className="py-0.5 pr-2 align-middle">
                      <Input
                        className={DAGSPLAN_TABLE_INPUT}
                        value={row.departmentTitle}
                        title={
                          state.displayLocale === "en"
                            ? translateCrewDepartmentTitle(
                                row.departmentTitle,
                                "en",
                              )
                            : undefined
                        }
                        onChange={(e) =>
                          setState((s) => {
                            const crewRows = [...s.crewRows];
                            crewRows[i] = {
                              ...crewRows[i],
                              departmentTitle: e.target.value,
                            };
                            return { ...s, crewRows };
                          })
                        }
                      />
                    </td>
                    <td className="py-0.5 pr-2 align-middle">
                      <Input
                        className={DAGSPLAN_TABLE_INPUT}
                        value={row.personName}
                        onChange={(e) =>
                          setState((s) => {
                            const crewRows = [...s.crewRows];
                            crewRows[i] = {
                              ...crewRows[i],
                              personName: e.target.value,
                            };
                            return { ...s, crewRows };
                          })
                        }
                      />
                    </td>
                    <td className="py-0.5 pr-2 align-middle">
                      <Input
                        className={DAGSPLAN_TABLE_INPUT}
                        value={row.mobile}
                        onChange={(e) =>
                          setState((s) => {
                            const crewRows = [...s.crewRows];
                            crewRows[i] = { ...crewRows[i], mobile: e.target.value };
                            return { ...s, crewRows };
                          })
                        }
                      />
                    </td>
                    <td className="py-0.5 pr-2 align-middle">
                      <Input
                        className={DAGSPLAN_TABLE_INPUT}
                        type="email"
                        autoComplete="off"
                        value={row.email}
                        onChange={(e) =>
                          setState((s) => {
                            const crewRows = [...s.crewRows];
                            crewRows[i] = { ...crewRows[i], email: e.target.value };
                            return { ...s, crewRows };
                          })
                        }
                      />
                    </td>
                    <td className="py-0.5 pr-2 align-middle">
                      <Input
                        className={DAGSPLAN_TABLE_INPUT}
                        type="time"
                        value={row.onSetTime}
                        onChange={(e) =>
                          setState((s) => {
                            const crewRows = [...s.crewRows];
                            crewRows[i] = {
                              ...crewRows[i],
                              onSetTime: e.target.value,
                            };
                            return { ...s, crewRows };
                          })
                        }
                      />
                    </td>
                    <td className="py-0.5 align-middle">
                      <RowActions
                        inline
                        onMoveUp={() =>
                          setState((s) => ({
                            ...s,
                            crewRows: moveRow(s.crewRows, i, -1),
                          }))
                        }
                        onMoveDown={() =>
                          setState((s) => ({
                            ...s,
                            crewRows: moveRow(s.crewRows, i, 1),
                          }))
                        }
                        onRemove={() =>
                          setState((s) => ({
                            ...s,
                            crewRows: s.crewRows.filter((_, j) => j !== i),
                          }))
                        }
                        disableUp={i === 0}
                        disableDown={i === state.crewRows.length - 1}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setState((s) => ({
                  ...s,
                  crewRows: [
                    ...s.crewRows,
                    {
                      departmentTitle: "",
                      personName: "",
                      mobile: "",
                      email: "",
                      onSetTime: "",
                      linkedProjectCrewId: null,
                      linkedPersonId: null,
                    },
                  ],
                }))
              }
            >
              {t.crewRow}
            </Button>
            {crewMeetMailtoHref ? (
              <Button asChild variant="outline" size="sm">
                <a href={crewMeetMailtoHref}>{t.sendCrewEmail}</a>
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled
                title={t.sendCrewEmailNeedAddresses}
              >
                {t.sendCrewEmail}
              </Button>
            )}
          </div>
        </DagsplanEditorSection>

        <DagsplanEditorSection
          title={t.actors}
          collapseLabel={t.collapseSection}
          expandLabel={t.expandSection}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="w-12 pb-1.5 pr-1 font-medium">{t.actorNr}</th>
                  <th className="pb-1.5 pr-1 font-medium">{t.actorName}</th>
                  <th className="pb-1.5 pr-1 font-medium">{t.actorMeet}</th>
                  <th className="pb-1.5 pr-1 font-medium">
                    {t.actorReadyOnSet}
                  </th>
                  <th className="w-20 pb-1.5" />
                </tr>
              </thead>
              <tbody>
                {state.actorRows.map((row, i) => (
                  <tr key={row.id} className="border-b border-border/60">
                    <td className="py-0.5 pr-1 align-middle">
                      <span className="inline-flex h-7 min-w-[1.5rem] items-center px-2 text-xs tabular-nums text-muted-foreground">
                        {i + 1}
                      </span>
                    </td>
                    {(["actorName", "meetTime", "readyOnSetTime"] as const).map(
                      (field) => (
                        <td key={field} className="py-0.5 pr-1 align-middle">
                          <Input
                            className={DAGSPLAN_TABLE_INPUT}
                            type={
                              field === "meetTime" || field === "readyOnSetTime"
                                ? "time"
                                : "text"
                            }
                            value={row[field]}
                            onChange={(e) =>
                              setState((s) => {
                                const actorRows = [...s.actorRows];
                                actorRows[i] = {
                                  ...actorRows[i],
                                  [field]: e.target.value,
                                };
                                return { ...s, actorRows };
                              })
                            }
                          />
                        </td>
                      ),
                    )}
                    <td className="py-0.5 align-middle">
                      <RowActions
                        inline
                        onMoveUp={() =>
                          setState((s) => ({
                            ...s,
                            actorRows: moveRow(s.actorRows, i, -1),
                          }))
                        }
                        onMoveDown={() =>
                          setState((s) => ({
                            ...s,
                            actorRows: moveRow(s.actorRows, i, 1),
                          }))
                        }
                        onRemove={() =>
                          setState((s) => ({
                            ...s,
                            actorRows: s.actorRows.filter((_, j) => j !== i),
                          }))
                        }
                        disableUp={i === 0}
                        disableDown={i === state.actorRows.length - 1}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setState((s) => ({
                  ...s,
                  actorRows: [
                    ...s.actorRows,
                    {
                      id: crypto.randomUUID(),
                      actorName: "",
                      meetTime: "",
                      readyOnSetTime: "",
                    },
                  ],
                }))
              }
            >
              {t.crewRow}
            </Button>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
              <Checkbox
                checked={state.printIncludeActors === false}
                onCheckedChange={(v) =>
                  setState((s) => ({
                    ...s,
                    printIncludeActors: v !== true,
                  }))
                }
              />
              <span>{t.excludeFromPrint}</span>
            </label>
          </div>
        </DagsplanEditorSection>

        <DagsplanEditorSection
          title={t.schedule}
          collapseLabel={t.collapseSection}
          expandLabel={t.expandSection}
        >
          <label className="mb-3 flex cursor-pointer items-center justify-end gap-2 text-sm text-muted-foreground">
            <Checkbox
              checked={state.printIncludeSchedule === false}
              onCheckedChange={(v) =>
                setState((s) => {
                  const excludeFromPrint = v === true;
                  if (!excludeFromPrint) {
                    return { ...s, printIncludeSchedule: true };
                  }
                  const inf = inferWorkHoursFromScheduleRows(s.scheduleRows);
                  return {
                    ...s,
                    printIncludeSchedule: false,
                    workStartTime: s.workStartTime.trim() || inf.workStartTime,
                    workEndTime: s.workEndTime.trim() || inf.workEndTime,
                  };
                })
              }
            />
            <span>{t.excludeFromPrint}</span>
          </label>
          <div
            className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-border/70 bg-muted/25 px-3 py-2.5"
            role="group"
            aria-labelledby="schedule-optional-columns-label"
          >
            <div className="min-w-0">
              <p
                id="schedule-optional-columns-label"
                className="text-xs font-medium text-foreground"
              >
                {t.optionalScheduleColumns}
              </p>
              <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                {t.optionalScheduleColumnsHint}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                <Checkbox
                  checked={state.showInteriorExteriorColumn}
                  onCheckedChange={(v) =>
                    setState((s) => ({
                      ...s,
                      showInteriorExteriorColumn: v === true,
                    }))
                  }
                />
                <span>{t.showInteriorExteriorColumn}</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                <Checkbox
                  checked={state.showDayNightColumn}
                  onCheckedChange={(v) =>
                    setState((s) => ({
                      ...s,
                      showDayNightColumn: v === true,
                    }))
                  }
                />
                <span>{t.showDayNightColumn}</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                <Checkbox
                  checked={state.showShotColumn}
                  onCheckedChange={(v) =>
                    setState((s) => ({
                      ...s,
                      showShotColumn: v === true,
                    }))
                  }
                />
                <span>{t.showShotColumn}</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                <Checkbox
                  checked={state.showActorColumn}
                  onCheckedChange={(v) =>
                    setState((s) => ({
                      ...s,
                      showActorColumn: v === true,
                    }))
                  }
                />
                <span>{t.showActorColumn}</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                <Checkbox
                  checked={state.showCostumeColumn}
                  onCheckedChange={(v) =>
                    setState((s) => ({
                      ...s,
                      showCostumeColumn: v === true,
                    }))
                  }
                />
                <span>{t.showCostumeColumn}</span>
              </label>
            </div>
          </div>
          <DagsplanScheduleTable
            shootDateIso={state.shootDate}
            projectId={state.projectId}
            imageAssets={state.imageAssets}
            onImageAssetCreated={(asset) =>
              setState((current) => ({
                ...current,
                imageAssets: current.imageAssets.some((item) => item.id === asset.id)
                  ? current.imageAssets
                  : [asset, ...current.imageAssets],
              }))
            }
            sunLocationName={state.weatherLocationName}
            sunLatitude={state.weatherLatitude}
            sunLongitude={state.weatherLongitude}
            sunriseTimeOverride={state.sunriseTimeOverride}
            onSunriseTimeOverrideChange={handleSunriseTimeOverrideChange}
            sunsetTimeOverride={state.sunsetTimeOverride}
            onSunsetTimeOverrideChange={handleSunsetTimeOverrideChange}
            showShotColumn={state.showShotColumn}
            showInteriorExteriorColumn={state.showInteriorExteriorColumn}
            showDayNightColumn={state.showDayNightColumn}
            showActorColumn={state.showActorColumn}
            showCostumeColumn={state.showCostumeColumn}
            columnOrder={state.scheduleColumnOrder}
            onColumnOrderChange={(scheduleColumnOrder) =>
              setState((current) => ({ ...current, scheduleColumnOrder }))
            }
            showTotal={false}
            locale={state.displayLocale}
            rows={state.scheduleRows}
            onRowsChange={handleScheduleRowsChange}
          />
          <div className="sticky bottom-3 z-30 mt-3 rounded-md border border-border/80 bg-background/95 p-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/85">
            <p className="text-xs font-medium text-muted-foreground">
              {t.addScheduleRows}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={SCHEDULE_ADD_BUTTON_CLASS}
              disabled={state.scheduleRows.some(isScheduleCallTimeRow)}
              style={{
                backgroundColor: SCHEDULE_CALL_TIME_DEFAULT_ROW_BG,
                borderColor: SCHEDULE_CALL_TIME_DEFAULT_ROW_BG,
              }}
              onClick={() =>
                setState((s) => {
                  const id = crypto.randomUUID();
                  const kind = rowKindForNewSequentialRow(
                    s.scheduleRows[s.scheduleRows.length - 1],
                  );
                  const row = {
                    ...emptyScheduleRow(id, kind),
                    info: SCHEDULE_CALL_TIME_INFO,
                    durationMinutes: 0,
                    rowBgColor: SCHEDULE_CALL_TIME_DEFAULT_ROW_BG,
                  };
                  return {
                    ...s,
                    scheduleRows: recalculateScheduleRows([...s.scheduleRows, row]),
                  };
                })
              }
            >
              <ScheduleAddButtonLabel>{t.addCallTime}</ScheduleAddButtonLabel>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={SCHEDULE_ADD_BUTTON_CLASS}
              style={{
                backgroundColor: SCHEDULE_PRERIGG_DEFAULT_ROW_BG,
                borderColor: SCHEDULE_PRERIGG_DEFAULT_ROW_BG,
              }}
              onClick={() =>
                appendSchedulePresetRow(
                  "Prerigg",
                  SCHEDULE_PRERIGG_DEFAULT_ROW_BG,
                )
              }
            >
              <ScheduleAddButtonLabel>{t.addPrerigg}</ScheduleAddButtonLabel>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={SCHEDULE_ADD_BUTTON_CLASS}
              style={{
                backgroundColor: SCHEDULE_RECORDING_DEFAULT_ROW_BG,
                borderColor: SCHEDULE_RECORDING_DEFAULT_ROW_BG,
              }}
              onClick={() =>
                appendSchedulePresetRow(
                  "Opptak",
                  SCHEDULE_RECORDING_DEFAULT_ROW_BG,
                )
              }
            >
              <ScheduleAddButtonLabel>{t.addRecording}</ScheduleAddButtonLabel>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(
                SCHEDULE_ADD_BUTTON_CLASS,
                "text-destructive hover:text-destructive",
              )}
              onClick={() =>
                setState((s) => {
                  const id = crypto.randomUUID();
                  const kind = rowKindForNewSequentialRow(
                    s.scheduleRows[s.scheduleRows.length - 1],
                  );
                  const row = {
                    ...emptyScheduleRow(id, kind),
                    info: "Lunsj",
                    durationMinutes: 30,
                  };
                  return {
                    ...s,
                    scheduleRows: recalculateScheduleRows([
                      ...s.scheduleRows,
                      row,
                    ]),
                  };
                })
              }
            >
              <ScheduleAddButtonLabel>{t.addLunch}</ScheduleAddButtonLabel>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={SCHEDULE_ADD_BUTTON_CLASS}
              onClick={() =>
                setState((s) => {
                  const id = crypto.randomUUID();
                  const kind = rowKindForNewSequentialRow(
                    s.scheduleRows[s.scheduleRows.length - 1],
                  );
                  return {
                    ...s,
                    scheduleRows: recalculateScheduleRows([
                      ...s.scheduleRows,
                      emptyScheduleRow(id, kind),
                    ]),
                  };
                })
              }
            >
              <ScheduleAddButtonLabel>{t.addRow}</ScheduleAddButtonLabel>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={SCHEDULE_ADD_BUTTON_CLASS}
              onClick={() =>
                setState((s) => {
                  const row = emptyScheduleRow(crypto.randomUUID(), "untimed");
                  return {
                    ...s,
                    scheduleRows: recalculateScheduleRows([
                      ...s.scheduleRows,
                      row,
                    ]),
                  };
                })
              }
            >
              <ScheduleAddButtonLabel>{t.addUntimedRow}</ScheduleAddButtonLabel>
            </Button>
            <Popover
              open={companyMoveOpen}
              onOpenChange={(open) => {
                setCompanyMoveOpen(open);
                if (!open) setCompanyMoveManualText("");
              }}
            >
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={SCHEDULE_ADD_BUTTON_CLASS}
                  style={{
                    backgroundColor: SCHEDULE_COMPANY_MOVE_DEFAULT_ROW_BG,
                    borderColor: SCHEDULE_COMPANY_MOVE_DEFAULT_ROW_BG,
                  }}
                >
                  <ScheduleAddButtonLabel>
                    {t.addCompanyMove}
                  </ScheduleAddButtonLabel>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-1" align="start">
                {state.locationRows.length > 0 ? (
                  <>
                    <p className="px-2 py-1.5 text-[11px] text-muted-foreground">
                      {t.locations}
                    </p>
                    <ul className="max-h-64 overflow-y-auto">
                      {state.locationRows.map((loc) => {
                        const addr =
                          loc.locationText?.trim() ||
                          loc.locationName?.trim() ||
                          "";
                        const primary =
                          loc.locationName?.trim() || addr || "—";
                        return (
                          <li key={loc.id}>
                            <button
                              type="button"
                              className="w-full rounded-sm px-2 py-2 text-left text-sm transition-colors hover:bg-muted"
                              onClick={() => appendCompanyMoveRow(addr)}
                            >
                              <span className="font-medium text-foreground">
                                {primary}
                              </span>
                              {loc.locationText?.trim() &&
                              loc.locationName?.trim() &&
                              loc.locationText.trim() !==
                                loc.locationName.trim() ? (
                                <span className="mt-0.5 block text-xs text-muted-foreground">
                                  {loc.locationText.trim()}
                                </span>
                              ) : null}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </>
                ) : null}
                <div className="space-y-2 border-border p-2 pt-3 [&:not(:first-child)]:border-t">
                  <p className="text-[11px] text-muted-foreground">
                    {state.locationRows.length > 0
                      ? t.companyMoveManualOr
                      : t.companyMoveManualHint}
                  </p>
                  <Input
                    className="h-9 text-sm"
                    placeholder={t.companyMoveManualPlaceholder}
                    value={companyMoveManualText}
                    onChange={(e) => setCompanyMoveManualText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        appendCompanyMoveRow(companyMoveManualText);
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    onClick={() => appendCompanyMoveRow(companyMoveManualText)}
                  >
                    {t.addCompanyMove}
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={SCHEDULE_ADD_BUTTON_CLASS}
              style={{
                backgroundColor: SCHEDULE_WRAP_DEFAULT_ROW_BG,
                borderColor: SCHEDULE_WRAP_DEFAULT_ROW_BG,
              }}
              onClick={() =>
                appendSchedulePresetRow(
                  SCHEDULE_PRE_WRAP_INFO,
                  SCHEDULE_WRAP_DEFAULT_ROW_BG,
                  0,
                )
              }
            >
              <ScheduleAddButtonLabel>{t.addPreWrap}</ScheduleAddButtonLabel>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={SCHEDULE_ADD_BUTTON_CLASS}
              style={{
                backgroundColor: SCHEDULE_WRAP_DEFAULT_ROW_BG,
                borderColor: SCHEDULE_WRAP_DEFAULT_ROW_BG,
              }}
              onClick={() =>
                setState((s) => {
                  const id = crypto.randomUUID();
                  const kind = rowKindForNewSequentialRow(
                    s.scheduleRows[s.scheduleRows.length - 1],
                  );
                  const row = {
                    ...emptyScheduleRow(id, kind),
                    info: SCHEDULE_WRAP_INFO,
                    durationMinutes: 0,
                    rowBgColor: SCHEDULE_WRAP_DEFAULT_ROW_BG,
                  };
                  return {
                    ...s,
                    scheduleRows: recalculateScheduleRows([
                      ...s.scheduleRows,
                      row,
                    ]),
                  };
                })
              }
            >
              <ScheduleAddButtonLabel>{t.addWrap}</ScheduleAddButtonLabel>
            </Button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-baseline justify-start gap-x-2 gap-y-1 border-t border-border pt-3 text-sm">
            <span className="text-muted-foreground">
              {scheduleStrings.totalPlanned}
            </span>
            <span className="font-medium tabular-nums text-foreground">
              {formatTotalScheduleMinutes(
                totalScheduleMinutes,
                scheduleStrings,
              )}
            </span>
          </div>
        </DagsplanEditorSection>

        <DagsplanEditorSection
          title={t.deptInfo}
          collapseLabel={t.collapseSection}
          expandLabel={t.expandSection}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="pb-1.5 pr-2 font-medium">{t.deptName}</th>
                  <th className="pb-1.5 pr-2 font-medium">{t.deptInfoCol}</th>
                  <th className="w-20 pb-1.5" />
                </tr>
              </thead>
              <tbody>
                {state.departmentRows.map((row, i) => (
                  <tr key={i} className="border-b border-border/60">
                    <td className="py-0.5 pr-2 align-middle">
                      <Input
                        className={DAGSPLAN_TABLE_INPUT}
                        value={row.departmentName}
                        onChange={(e) =>
                          setState((s) => {
                            const departmentRows = [...s.departmentRows];
                            departmentRows[i] = {
                              ...departmentRows[i],
                              departmentName: e.target.value,
                            };
                            return { ...s, departmentRows };
                          })
                        }
                      />
                    </td>
                    <td className="py-0.5 pr-2 align-middle">
                      <Input
                        className={DAGSPLAN_TABLE_INPUT}
                        value={row.info}
                        onChange={(e) =>
                          setState((s) => {
                            const departmentRows = [...s.departmentRows];
                            departmentRows[i] = {
                              ...departmentRows[i],
                              info: e.target.value,
                            };
                            return { ...s, departmentRows };
                          })
                        }
                      />
                    </td>
                    <td className="py-0.5 align-middle">
                      <RowActions
                        inline
                        onMoveUp={() =>
                          setState((s) => ({
                            ...s,
                            departmentRows: moveRow(s.departmentRows, i, -1),
                          }))
                        }
                        onMoveDown={() =>
                          setState((s) => ({
                            ...s,
                            departmentRows: moveRow(s.departmentRows, i, 1),
                          }))
                        }
                        onRemove={() =>
                          setState((s) => ({
                            ...s,
                            departmentRows: s.departmentRows.filter(
                              (_, j) => j !== i,
                            ),
                          }))
                        }
                        disableUp={i === 0}
                        disableDown={i === state.departmentRows.length - 1}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setState((s) => ({
                  ...s,
                  departmentRows: [
                    ...s.departmentRows,
                    { departmentName: "", info: "" },
                  ],
                }))
              }
            >
              {t.crewRow}
            </Button>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
              <Checkbox
                checked={state.printIncludeDepartmentInfo === false}
                onCheckedChange={(v) =>
                  setState((s) => ({
                    ...s,
                    printIncludeDepartmentInfo: v !== true,
                  }))
                }
              />
              <span>{t.excludeFromPrint}</span>
            </label>
          </div>
        </DagsplanEditorSection>

        <DagsplanEditorSection
          title={t.emergencyRadio}
          collapseLabel={t.collapseSection}
          expandLabel={t.expandSection}
          defaultOpen={false}
        >
          <div className="grid max-w-3xl gap-4">
            <div className="space-y-2">
              <Label htmlFor="emergency">{t.emergency}</Label>
              <Textarea
                id="emergency"
                rows={1}
                value={state.emergencyNumbersText}
                onChange={(e) =>
                  setState((s) => ({
                    ...s,
                    emergencyNumbersText: e.target.value,
                  }))
                }
                className={DAGSPLAN_TEXTAREA_AUTO}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="radio">{t.radio}</Label>
              <Textarea
                id="radio"
                rows={1}
                value={state.radioChannelsText}
                onChange={(e) =>
                  setState((s) => ({ ...s, radioChannelsText: e.target.value }))
                }
                className={DAGSPLAN_TEXTAREA_AUTO}
              />
            </div>
          </div>
        </DagsplanEditorSection>

        <div className="flex flex-wrap gap-3 border-t border-border pt-8">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-destructive"
            onClick={() => {
              if (
                typeof window !== "undefined" &&
                !window.confirm(t.confirmDeletePlan)
              )
                return;
              startTransition(async () => {
                await deleteDagsplan(state.id);
              });
            }}
          >
            {t.deletePlan}
          </Button>
        </div>
      </div>

      <Dialog
        open={previewOpen}
        onOpenChange={(open) => {
          setPreviewOpen(open);
          if (open) {
            setPreviewLoadError(false);
            setPreviewAttempt((attempt) => attempt + 1);
            setPreviewLoading(true);
          } else {
            setPreviewLoading(false);
            setPreviewLoadError(false);
          }
        }}
      >
        <DialogContent className="h-[92vh] max-w-[min(96vw,1200px)] grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b border-border px-5 py-4 pr-12">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1.5">
                <DialogTitle>{t.previewPrint}</DialogTitle>
                <DialogDescription>{t.previewDialogHint}</DialogDescription>
              </div>
              <Button
                type="button"
                className="shrink-0 self-start sm:self-center"
                disabled={pdfDownloadPending}
                onClick={requestPreviewPdfDownload}
              >
                {pdfDownloadPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <FileDown className="h-4 w-4" aria-hidden />
                )}
                {pdfDownloadPending
                  ? t.previewDownloadingPdf
                  : t.previewDownloadPdf}
              </Button>
            </div>
          </DialogHeader>
          {previewOpen ? (
            <div className="relative min-h-0 overflow-hidden bg-muted/40">
              {previewLoading ? (
                <DagsplanPdfLoading label={t.previewLoading} />
              ) : null}
              {previewLoadError ? (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-background px-6 text-center">
                  <p className="max-w-md text-sm text-muted-foreground">
                    {t.previewLoadError}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setPreviewLoadError(false);
                      setPreviewAttempt((attempt) => attempt + 1);
                      setPreviewLoading(true);
                    }}
                  >
                    {t.previewRetry}
                  </Button>
                </div>
              ) : null}
              <iframe
                key={previewAttempt}
                title={t.previewPrint}
                src={`/desk/dagsplaner/${state.id}/print?previewAttempt=${previewAttempt}`}
                onLoad={() => {
                  setPreviewLoadError(false);
                  setPreviewLoading(false);
                }}
                onError={() => {
                  setPreviewLoading(false);
                  setPreviewLoadError(true);
                }}
                className={cn(
                  "h-full min-h-0 w-full bg-white transition-opacity duration-200",
                  previewLoading || previewLoadError
                    ? "opacity-0"
                    : "opacity-100",
                )}
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={crewWarningOpen} onOpenChange={setCrewWarningOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {state.displayLocale === "en"
                ? "Project crew is missing"
                : "Prosjektcrew mangler i dagsplanen"}
            </DialogTitle>
            <DialogDescription>
              {state.displayLocale === "en"
                ? `${availableProjectCrew.length} ${availableProjectCrew.length === 1 ? "person is" : "people are"} not included in the crew list. The PDF can still be downloaded.`
                : `${availableProjectCrew.length} ${availableProjectCrew.length === 1 ? "person er" : "personer er"} ikke lagt til i stabslisten. PDF-en kan fortsatt lastes ned.`}
            </DialogDescription>
          </DialogHeader>
          <ul className="max-h-56 space-y-2 overflow-y-auto border-y border-border py-3 text-sm">
            {availableProjectCrew.map((crew) => (
              <li
                key={crew.projectCrewId}
                className="flex items-baseline justify-between gap-4"
              >
                <span className="font-medium text-foreground">
                  {crew.personName}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {translateCrewDepartmentTitle(
                    crew.departmentTitle,
                    state.displayLocale,
                  )}
                </span>
              </li>
            ))}
          </ul>
          <DialogFooter className="gap-2 sm:space-x-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCrewWarningOpen(false)}
            >
              {state.displayLocale === "en" ? "Cancel" : "Avbryt"}
            </Button>
            <Button type="button" onClick={downloadPreviewPdfDespiteMissingCrew}>
              <FileDown className="h-4 w-4" aria-hidden />
              {state.displayLocale === "en"
                ? "Download anyway"
                : "Last ned likevel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function DagsplanEditorSection({
  title,
  collapseLabel,
  expandLabel,
  defaultOpen = true,
  persistentSummary,
  children,
}: {
  title: string;
  collapseLabel: string;
  expandLabel: string;
  defaultOpen?: boolean;
  persistentSummary?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Collapsible
      asChild
      defaultOpen={defaultOpen}
      className="group/section rounded-lg border border-border bg-card shadow-sm"
    >
      <section>
        <h2 className="m-0">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
            >
              <span className="ap-section-title">{title}</span>
              <span className="flex shrink-0 items-center gap-2 text-xs font-normal text-muted-foreground">
                <span className="group-data-[state=open]/section:hidden">
                  {expandLabel}
                </span>
                <span className="group-data-[state=closed]/section:hidden">
                  {collapseLabel}
                </span>
                <ChevronDown
                  className="h-4 w-4 transition-transform group-data-[state=open]/section:rotate-180"
                  aria-hidden
                />
              </span>
            </button>
          </CollapsibleTrigger>
        </h2>
        {persistentSummary ? (
          <div className="px-6 pb-6">{persistentSummary}</div>
        ) : null}
        <CollapsibleContent className="px-6 pb-6">
          {children}
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
}

function DagsplanLogoPreview({
  agencyLogoUrl,
  clientLogoUrl,
  extraClientLogoUrl,
  agencyAlt,
  clientAlt,
}: {
  agencyLogoUrl: string;
  clientLogoUrl: string;
  extraClientLogoUrl?: string;
  agencyAlt: string;
  clientAlt: string;
}) {
  // Samme grid som print-siden/PDF-en, slik at forhåndsvisningen viser det som blir skrevet ut.
  return (
    <DagsplanLogoGrid
      logos={[
        { key: "agency", src: agencyLogoUrl, alt: agencyAlt },
        { key: "aparent", src: APARENT_LOGO_PUBLIC_PATH, alt: "Aparent" },
        { key: "client", src: clientLogoUrl, alt: clientAlt },
        { key: "extraClient", src: extraClientLogoUrl, alt: "" },
      ]}
    />
  );
}

function RowActions({
  inline = false,
  onMoveUp,
  onMoveDown,
  onRemove,
  disableUp,
  disableDown,
}: {
  inline?: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  disableUp: boolean;
  disableDown: boolean;
}) {
  const btnClass = inline
    ? "h-7 w-7 shrink-0 px-0 text-xs"
    : "h-7 px-1 text-xs";
  return (
    <div
      className={cn(
        inline
          ? "flex shrink-0 flex-row items-center gap-0.5"
          : "flex flex-col gap-0.5",
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={btnClass}
        disabled={disableUp}
        onClick={onMoveUp}
      >
        ↑
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={btnClass}
        disabled={disableDown}
        onClick={onMoveDown}
      >
        ↓
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn(btnClass, "text-muted-foreground")}
        onClick={onRemove}
      >
        ×
      </Button>
    </div>
  );
}
