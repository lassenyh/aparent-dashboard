"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { flushSync } from "react-dom";
import { toast } from "sonner";
import { WeatherIconKind } from "@prisma/client";
import type { CrewDatabasePersonOption } from "@/actions/dagsplan";
import {
  addDagsplanLocation,
  deleteDagsplan,
  duplicateDagsplan,
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
  SCHEDULE_WRAP_DEFAULT_ROW_BG,
} from "@/lib/schedule-row-colors";
import {
  emptyScheduleRow,
  inferWorkHoursFromScheduleRows,
  recalculateScheduleRows,
  rowKindForNewSequentialRow,
  SCHEDULE_CALL_TIME_INFO,
  SCHEDULE_INTERIOR_EXTERIOR_TRUCK,
  SCHEDULE_WRAP_INFO,
  scheduleHasCallTimeFirstRow,
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
  type ScheduleRow,
} from "@/components/dagsplan/dagsplan-schedule-table";
import { PublicLogoImg } from "@/components/public-logo-img";
import { SectionHeading } from "@/components/section-heading";
import { sanitizePublicImageUrl } from "@/lib/img-url";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  getDagsplanEditorStrings,
  getDagsplanLocationStrings,
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
  locationRows: DagsplanLocationRowState[];
  infoText: string;
  weatherIcon: WeatherIconKind;
  weatherTempMin: string;
  weatherTempMax: string;
  weatherText: string;
  emergencyNumbersText: string;
  radioChannelsText: string;
  /** false = ekskludert fra utskrift (ikke vis tabell på utskrift). */
  printIncludeActors: boolean;
  printIncludeDepartmentInfo: boolean;
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
    actorNumber: string;
    actorName: string;
    phone: string;
    film: string;
    meetTime: string;
    readyOnSetTime: string;
  }>;
  scheduleRows: ScheduleRow[];
  departmentRows: Array<{
    departmentName: string;
    info: string;
  }>;
  /** Kolonne «Shot» (bilde) mellom varighet og scene — skjules som standard. */
  showShotColumn: boolean;
  /** UI og print: norsk eller engelsk. */
  displayLocale: DagsplanLocale;
  /** Fallback for visning når dagsplan-felt er tomt */
  projectAgencyLogoUrl: string | null;
  projectClientLogoUrl: string | null;
};

/** Én linje som standard; blir høyere når innholdet krever det (`field-sizing: content`). */
const DAGSPLAN_TEXTAREA_AUTO =
  "[field-sizing:content] max-h-[min(50vh,24rem)] overflow-y-auto";

/** Kompakte tabellfelt (oppmøte, aktører, avdeling). */
const DAGSPLAN_TABLE_INPUT = "h-7 min-h-7 px-2 text-xs";

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
  index,
  total,
  row,
  loc,
  onChange,
  onMoveUp,
  onMoveDown,
  onRemove,
  disableUp,
  disableDown,
  onSaveLocations,
  locationSaveDisabled,
  collapsibleOpen,
  onCollapsibleOpenChange,
}: {
  index: number;
  total: number;
  row: DagsplanLocationRowState;
  loc: ReturnType<typeof getDagsplanLocationStrings>;
  onChange: (patch: Partial<DagsplanLocationRowState>) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  disableUp: boolean;
  disableDown: boolean;
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
  const labelSuffix = total > 1 ? ` ${index + 1}` : "";
  const baseId = row.id;
  const summaryLabel = useMemo(() => {
    const name = row.locationName.trim();
    const addr = row.locationText.trim();
    if (name) return name;
    if (addr) return addr.length > 48 ? `${addr.slice(0, 45)}…` : addr;
    return `Location${labelSuffix}`;
  }, [row.locationName, row.locationText, labelSuffix]);

  const fields = (
    <div className="grid max-w-3xl gap-4">
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
          onChange={(e) => onChange({ locationText: e.target.value })}
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
    <div className="rounded-lg border border-border bg-muted/20 p-2 shadow-sm">
      <Collapsible
        open={collapsibleOpen}
        onOpenChange={onCollapsibleOpenChange}
      >
        <div className="flex min-h-8 items-center gap-1.5">
          <CollapsibleTrigger
            type="button"
            className={cn(
              "group flex h-8 min-h-8 min-w-0 flex-1 items-center justify-between gap-2 rounded-md px-2 text-left text-sm font-semibold leading-none text-foreground outline-none transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring",
            )}
          >
            <span className="truncate">{summaryLabel}</span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </CollapsibleTrigger>
          <RowActions
            inline
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
            onRemove={onRemove}
            disableUp={disableUp}
            disableDown={disableDown}
          />
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
    showShotColumn: initial.showShotColumn ?? false,
    displayLocale: initial.displayLocale ?? "no",
  }));

  const t = useMemo(
    () => getDagsplanEditorStrings(state.displayLocale),
    [state.displayLocale],
  );
  const locStrings = useMemo(
    () => getDagsplanLocationStrings(state.displayLocale),
    [state.displayLocale],
  );
  const [saveState, setSaveState] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState<"agency" | "client" | null>(null);
  const [locationSavePending, setLocationSavePending] = useState(false);
  /** Hvilken location-rad som er utvidet. `null` = alle lukket (standard ved åpning av siden). */
  const [openLocationId, setOpenLocationId] = useState<string | null>(null);
  const [companyMoveOpen, setCompanyMoveOpen] = useState(false);
  const [companyMoveManualText, setCompanyMoveManualText] = useState("");

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
        locations: initial.locationRows.map((r) => ({
          id: r.id,
          parkingImageUrl: r.parkingImageUrl,
        })),
        schedule: initial.scheduleRows.map((r) => ({
          id: r.id,
          shotImageUrl: r.shotImageUrl,
        })),
      }),
    [
      initial.agencyLogoUrl,
      initial.clientLogoUrl,
      initial.locationRows,
      initial.scheduleRows,
    ],
  );

  useEffect(() => {
    setState((s) => ({
      ...s,
      agencyLogoUrl: initial.agencyLogoUrl,
      clientLogoUrl: initial.clientLogoUrl,
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
        };
      }),
    }));
  }, [initialServerAssetKey]);

  const displayAgencyLogo =
    state.agencyLogoUrl.trim() ||
    initial.agencyLogoUrl.trim() ||
    initial.projectAgencyLogoUrl ||
    "";
  const displayClientLogo =
    state.clientLogoUrl.trim() ||
    initial.clientLogoUrl.trim() ||
    initial.projectClientLogoUrl ||
    "";

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

  const payload = useMemo(() => {
    const crewRows = state.crewRows.map((r, i) => ({
      ...r,
      sortOrder: i,
      linkedProjectCrewId: r.linkedProjectCrewId || null,
      linkedPersonId: r.linkedPersonId || null,
    }));
    const actorRows = state.actorRows.map((r, i) => ({
      ...r,
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
      info: r.info,
      actorNumbers: r.actorNumbers,
      shotImageUrl: r.shotImageUrl?.trim() || null,
      rowBgColor: r.rowBgColor?.trim() || null,
      sortOrder: i,
    }));
    const departmentRows = state.departmentRows.map((r, i) => ({
      ...r,
      sortOrder: i,
    }));
    return {
      id: state.id,
      title: state.title,
      shootDate: state.shootDate,
      workStartTime: workHoursFromSchedule.workStartTime || null,
      workEndTime: workHoursFromSchedule.workEndTime || null,
      agencyLogoUrl: state.agencyLogoUrl || null,
      clientLogoUrl: state.clientLogoUrl || null,
      locationRows: state.locationRows.map((r, i) => ({
        id: r.id,
        locationName: r.locationName || null,
        locationText: r.locationText || null,
        locationMapsUrl: r.locationMapsUrl || null,
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
      emergencyNumbersText: state.emergencyNumbersText || null,
      radioChannelsText: state.radioChannelsText || null,
      printIncludeActors: state.printIncludeActors,
      printIncludeDepartmentInfo: state.printIncludeDepartmentInfo,
      showShotColumn: state.showShotColumn,
      displayLocale: state.displayLocale,
      sunriseTimeOverride: state.sunriseTimeOverride.trim() || null,
      sunsetTimeOverride: state.sunsetTimeOverride.trim() || null,
      crewRows,
      actorRows,
      scheduleRows,
      departmentRows,
    };
  }, [state]);

  const save = useCallback(() => {
    setSaveState(null);
    startTransition(async () => {
      const res = await saveDagsplan(null, payload);
      if (res?.error) {
        toast.error(res.error);
        setSaveState(res.error);
      } else {
        toast.success(t.toastSaved);
        router.refresh();
      }
    });
  }, [payload, router, t]);

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
    } finally {
      setLocationSavePending(false);
    }
  }, [state.id, state.locationRows, t]);

  async function handleLogoUpload(
    which: "agency" | "client",
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
        toast.success(t.toastLogoUploaded);
        router.refresh();
      }
    } finally {
      setUploading(null);
    }
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
        <PageBackLink href={`/projects/${state.projectId}`}>
          {state.projectName}
        </PageBackLink>
      </div>

      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            {state.projectName} · {state.title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{state.shootDate}</p>
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
          <Button variant="outline" asChild>
            <Link href={`/dagsplaner/${state.id}/print`} target="_blank">
              {t.previewPrint}
            </Link>
          </Button>
          <form action={duplicateDagsplan.bind(null, state.id)}>
            <Button type="submit" variant="secondary" disabled={pending}>
              {t.duplicate}
            </Button>
          </form>
          <Button type="button" disabled={pending} onClick={save}>
            {pending ? t.saving : t.saveAll}
          </Button>
        </div>
      </header>

      {saveState ? (
        <p className="mb-3 text-sm text-destructive">{saveState}</p>
      ) : null}

      <div className="space-y-10">
        <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <SectionHeading className="mb-4">{t.branding}</SectionHeading>
          <div className="mb-6 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4 sm:gap-6">
            <div className="flex min-h-[56px] items-center justify-center">
              {sanitizePublicImageUrl(displayAgencyLogo) ? (
                <PublicLogoImg
                  src={displayAgencyLogo}
                  alt=""
                  className="max-h-14 max-w-full object-contain"
                />
              ) : (
                <span className="text-xs text-muted-foreground">
                  {t.agencyLogo}
                </span>
              )}
            </div>
            <div className="flex shrink-0 items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={APARENT_LOGO_PUBLIC_PATH}
                alt=""
                className="h-9 w-auto object-contain"
              />
            </div>
            <div className="flex min-h-[56px] items-center justify-center">
              {sanitizePublicImageUrl(displayClientLogo) ? (
                <PublicLogoImg
                  src={displayClientLogo}
                  alt=""
                  className="max-h-14 max-w-full object-contain"
                />
              ) : (
                <span className="text-xs text-muted-foreground">
                  {t.clientLogo}
                </span>
              )}
            </div>
          </div>
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
            </form>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {t.emptyLogoHint}
          </p>
          <div className="mt-6 grid max-w-xl gap-4 sm:grid-cols-2">
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
                    readOnly
                    tabIndex={-1}
                    value={workHoursFromSchedule.workStartTime}
                    className="bg-muted/40"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="workEnd">{t.workTo}</Label>
                  <Input
                    id="workEnd"
                    type="time"
                    readOnly
                    tabIndex={-1}
                    value={workHoursFromSchedule.workEndTime}
                    className="bg-muted/40"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{t.workHoursAuto}</p>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <SectionHeading className="mb-0">{t.locations}</SectionHeading>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  const r = await addDagsplanLocation(state.id);
                  if ("error" in r && r.error) {
                    toast.error(r.error);
                    return;
                  }
                  if ("id" in r) {
                    setOpenLocationId(r.id);
                    setState((s) => ({
                      ...s,
                      locationRows: [
                        ...s.locationRows,
                        {
                          id: r.id,
                          locationName: "",
                          locationText: "",
                          locationMapsUrl: "",
                          parkingText: "",
                          parkingMapsUrl: "",
                          parkingImageUrl: "",
                        },
                      ],
                    }));
                    toast.success(t.toastLocationAdded);
                  }
                });
              }}
            >
              {t.newLocation}
            </Button>
          </div>
          <div className="space-y-6">
            {state.locationRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t.noLocationsHint}
              </p>
            ) : null}
            {state.locationRows.map((row, i) => (
              <DagsplanLocationBlock
                key={row.id}
                index={i}
                total={state.locationRows.length}
                row={row}
                loc={locStrings}
                onChange={(patch) =>
                  setState((s) => {
                    const locationRows = [...s.locationRows];
                    locationRows[i] = { ...locationRows[i], ...patch };
                    return { ...s, locationRows };
                  })
                }
                onMoveUp={() =>
                  setState((s) => ({
                    ...s,
                    locationRows: moveRow(s.locationRows, i, -1),
                  }))
                }
                onMoveDown={() =>
                  setState((s) => ({
                    ...s,
                    locationRows: moveRow(s.locationRows, i, 1),
                  }))
                }
                onRemove={() => {
                  startTransition(async () => {
                    const r = await removeDagsplanLocation(row.id);
                    if ("error" in r && r.error) {
                      toast.error(r.error);
                      return;
                    }
                    setState((s) => ({
                      ...s,
                      locationRows: s.locationRows.filter((_, j) => j !== i),
                    }));
                    toast.success(t.toastLocationRemoved);
                  });
                }}
                disableUp={i === 0}
                disableDown={i === state.locationRows.length - 1}
                onSaveLocations={saveLocations}
                locationSaveDisabled={locationSavePending || pending}
                collapsibleOpen={openLocationId === row.id}
                onCollapsibleOpenChange={(open) =>
                  setOpenLocationId(open ? row.id : null)
                }
              />
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <SectionHeading className="mb-4">{t.infoWeather}</SectionHeading>
          <div className="grid max-w-3xl gap-4">
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
                    }))
                  }
                  placeholder="f.eks. 12"
                />
              </div>
            </div>
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
                />
              </div>
            ) : null}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <div className="mb-4 flex flex-col gap-3">
            <SectionHeading className="mb-0">{t.crewMeet}</SectionHeading>
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
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
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
        </section>

        <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <div className="mb-4">
            <SectionHeading className="mb-0">{t.actors}</SectionHeading>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="pb-1.5 pr-1 font-medium">{t.actorNr}</th>
                  <th className="pb-1.5 pr-1 font-medium">{t.actorName}</th>
                  <th className="pb-1.5 pr-1 font-medium">{t.actorPhone}</th>
                  <th className="pb-1.5 pr-1 font-medium">{t.actorFilm}</th>
                  <th className="pb-1.5 pr-1 font-medium">{t.actorMeet}</th>
                  <th className="pb-1.5 pr-1 font-medium">
                    {t.actorReadyOnSet}
                  </th>
                  <th className="w-20 pb-1.5" />
                </tr>
              </thead>
              <tbody>
                {state.actorRows.map((row, i) => (
                  <tr key={i} className="border-b border-border/60">
                    {(
                      [
                        "actorNumber",
                        "actorName",
                        "phone",
                        "film",
                        "meetTime",
                        "readyOnSetTime",
                      ] as const
                    ).map((field) => (
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
                    ))}
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
                      actorNumber: "",
                      actorName: "",
                      phone: "",
                      film: "",
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
        </section>

        <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <div className="mb-4">
            <SectionHeading className="mb-0">{t.schedule}</SectionHeading>
          </div>
          <DagsplanScheduleTable
            shootDateIso={state.shootDate}
            sunriseTimeOverride={state.sunriseTimeOverride}
            onSunriseTimeOverrideChange={(v) =>
              setState((s) => ({ ...s, sunriseTimeOverride: v }))
            }
            sunsetTimeOverride={state.sunsetTimeOverride}
            onSunsetTimeOverrideChange={(v) =>
              setState((s) => ({ ...s, sunsetTimeOverride: v }))
            }
            showShotColumn={state.showShotColumn}
            locale={state.displayLocale}
            rows={state.scheduleRows}
            onRowsChange={(scheduleRows) =>
              setState((s) => ({ ...s, scheduleRows }))
            }
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {!scheduleHasCallTimeFirstRow(state.scheduleRows) ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setState((s) => {
                    const id = crypto.randomUUID();
                    const callRow = {
                      ...emptyScheduleRow(id, "anchor"),
                      info: SCHEDULE_CALL_TIME_INFO,
                      durationMinutes: 0,
                      rowBgColor: SCHEDULE_CALL_TIME_DEFAULT_ROW_BG,
                    };
                    const rest = s.scheduleRows.map((r, i) => {
                      if (i !== 0) return r;
                      if (r.rowKind === "free") return r;
                      if (r.rowKind === "anchor") {
                        return { ...r, rowKind: "sequential" as const };
                      }
                      return r;
                    });
                    return {
                      ...s,
                      scheduleRows: recalculateScheduleRows([callRow, ...rest]),
                    };
                  })
                }
              >
                {t.addCallTime}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
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
              {t.addRow}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
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
              {t.addLunch}
            </Button>
            <Popover
              open={companyMoveOpen}
              onOpenChange={(open) => {
                setCompanyMoveOpen(open);
                if (!open) setCompanyMoveManualText("");
              }}
            >
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" size="sm">
                  {t.addCompanyMove}
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
              {t.addWrap}
            </Button>
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
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <div className="mb-4">
            <SectionHeading className="mb-0">{t.deptInfo}</SectionHeading>
          </div>
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
        </section>

        <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <SectionHeading className="mb-4">{t.emergencyRadio}</SectionHeading>
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
        </section>

        <div className="flex flex-wrap gap-3 border-t border-border pt-8">
          <Button variant="outline" asChild>
            <Link href={`/dagsplaner/${state.id}/print`} target="_blank">
              {t.previewPrint}
            </Link>
          </Button>
          <Button type="button" disabled={pending} onClick={save}>
            {pending ? t.saving : t.saveAll}
          </Button>
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
    </>
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
