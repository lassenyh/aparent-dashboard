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
  emptyScheduleRow,
  recalculateScheduleRows,
  rowKindForNewSequentialRow,
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
import { SectionHeading } from "@/components/section-heading";
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
import { cn } from "@/lib/utils";

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
  workStartTime: string;
  workEndTime: string;
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
        <Label htmlFor={`${baseId}-locationName`}>Navn på location</Label>
        <Input
          id={`${baseId}-locationName`}
          value={row.locationName}
          onChange={(e) => onChange({ locationName: e.target.value })}
          placeholder="F.eks. Studio, hovedlokasjon"
        />
      </div>
      <div className="space-y-2">
        <div className="flex flex-nowrap items-center justify-between gap-2">
          <Label
            htmlFor={`${baseId}-locationText`}
            className="shrink-0 leading-none"
          >
            Adresse
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
                Open in Google Maps
              </a>
            </Button>
          ) : (
            <span className="min-w-0 truncate text-right text-xs text-muted-foreground">
              Fyll inn adresse for å søke i Maps
            </span>
          )}
        </div>
        <Textarea
          id={`${baseId}-locationText`}
          rows={1}
          value={row.locationText}
          onChange={(e) => onChange({ locationText: e.target.value })}
          placeholder="Adresse eller sted (brukes til Google Maps-søk)"
          className={DAGSPLAN_TEXTAREA_AUTO}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${baseId}-locationMapsUrl`}>Google Maps link</Label>
        <Input
          id={`${baseId}-locationMapsUrl`}
          value={row.locationMapsUrl}
          onChange={(e) => onChange({ locationMapsUrl: e.target.value })}
          placeholder="https://maps.google.com/…"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${baseId}-parkingText`}>Parking / transport</Label>
        <Textarea
          id={`${baseId}-parkingText`}
          rows={1}
          value={row.parkingText}
          onChange={(e) => onChange({ parkingText: e.target.value })}
          placeholder="Directions, gate codes, shuttle…"
          className={DAGSPLAN_TEXTAREA_AUTO}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${baseId}-parkingMapsUrl`}>Parking maps link</Label>
        <Input
          id={`${baseId}-parkingMapsUrl`}
          value={row.parkingMapsUrl}
          onChange={(e) => onChange({ parkingMapsUrl: e.target.value })}
          placeholder="https://…"
        />
      </div>
      <div className="space-y-2 border-t border-border/60 pt-4">
        <Label>Parking image (print attachment)</Label>
        <p className="text-xs text-muted-foreground">
          Map, sketch or photo. Prints as a separate page when filled.
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
          Lagre
        </Button>
      </div>
    </div>
  );

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-muted/20 shadow-sm",
        total > 1 ? "p-2" : "p-4",
      )}
    >
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
            inline={total > 1}
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
  }));
  const [saveState, setSaveState] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState<"agency" | "client" | null>(null);
  const [locationSavePending, setLocationSavePending] = useState(false);
  /** Hvilken location-rad som er utvidet. `null` = alle lukket (standard ved åpning av siden). */
  const [openLocationId, setOpenLocationId] = useState<string | null>(null);

  useEffect(() => {
    if (
      openLocationId &&
      !state.locationRows.some((r) => r.id === openLocationId)
    ) {
      setOpenLocationId(null);
    }
  }, [state.locationRows, openLocationId]);

  const displayAgencyLogo =
    state.agencyLogoUrl.trim() || initial.projectAgencyLogoUrl || "";
  const displayClientLogo =
    state.clientLogoUrl.trim() || initial.projectClientLogoUrl || "";

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
      startTime: r.startTime,
      endTime: r.endTime,
      durationMinutes: r.durationMinutes,
      rowKind: r.rowKind,
      interiorExterior: r.interiorExterior,
      dayNight: r.dayNight,
      sceneSetting: r.sceneSetting,
      info: r.info,
      actorNumbers: r.actorNumbers,
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
      workStartTime: state.workStartTime || null,
      workEndTime: state.workEndTime || null,
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
        toast.success("Lagret");
        router.refresh();
      }
    });
  }, [payload, router]);

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
      toast.success("Lagret");
      flushSync(() => {
        setOpenLocationId(null);
      });
    } finally {
      setLocationSavePending(false);
    }
  }, [state.id, state.locationRows]);

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
        toast.success("Logo lastet opp");
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
    toast.success("Rad lagt til");
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
    toast.success("Rad lagt til fra crew-database");
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
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href={`/dagsplaner/${state.id}/print`} target="_blank">
              Forhåndsvisning / print
            </Link>
          </Button>
          <form action={duplicateDagsplan.bind(null, state.id)}>
            <Button type="submit" variant="secondary" disabled={pending}>
              Dupliser
            </Button>
          </form>
          <Button type="button" disabled={pending} onClick={save}>
            {pending ? "Lagrer…" : "Lagre alle endringer"}
          </Button>
        </div>
      </header>

      {saveState ? (
        <p className="mb-3 text-sm text-destructive">{saveState}</p>
      ) : null}

      <div className="space-y-10">
        <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <SectionHeading className="mb-4">Branding</SectionHeading>
          <div className="mb-6 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4 sm:gap-6">
            <div className="flex min-h-[56px] items-center justify-center">
              {displayAgencyLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={displayAgencyLogo}
                  alt=""
                  className="max-h-14 max-w-full object-contain"
                />
              ) : (
                <span className="text-xs text-muted-foreground">Byrålogo</span>
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
              {displayClientLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={displayClientLogo}
                  alt=""
                  className="max-h-14 max-w-full object-contain"
                />
              ) : (
                <span className="text-xs text-muted-foreground">Kundelogo</span>
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
                <Label className="text-xs">Last opp byrålogo</Label>
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
                {uploading === "agency" ? "…" : "Last opp"}
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
                <Label className="text-xs">Last opp kundelogo</Label>
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
                {uploading === "client" ? "…" : "Last opp"}
              </Button>
            </form>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Tom visning bruker prosjektets byrå-/kundelogo som forslag.
          </p>
          <div className="mt-6 grid max-w-xl gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">Tittel</Label>
              <Input
                id="title"
                value={state.title}
                onChange={(e) =>
                  setState((s) => ({ ...s, title: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shootDate">Innspillingsdato</Label>
              <Input
                id="shootDate"
                type="date"
                value={state.shootDate}
                onChange={(e) =>
                  setState((s) => ({ ...s, shootDate: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="workStart">Arbeid fra</Label>
              <Input
                id="workStart"
                type="time"
                value={state.workStartTime}
                onChange={(e) =>
                  setState((s) => ({ ...s, workStartTime: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="workEnd">Arbeid til</Label>
              <Input
                id="workEnd"
                type="time"
                value={state.workEndTime}
                onChange={(e) =>
                  setState((s) => ({ ...s, workEndTime: e.target.value }))
                }
              />
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <SectionHeading className="mb-0">Locations</SectionHeading>
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
                    toast.success("Location lagt til");
                  }
                });
              }}
            >
              + Ny location
            </Button>
          </div>
          <div className="space-y-6">
            {state.locationRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Ingen locations ennå. Bruk «Ny location» for å legge til adresse,
                kart, parkering og parkeringsbilde.
              </p>
            ) : null}
            {state.locationRows.map((row, i) => (
              <DagsplanLocationBlock
                key={row.id}
                index={i}
                total={state.locationRows.length}
                row={row}
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
                    toast.success("Location fjernet");
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
          <SectionHeading className="mb-4">Info og vær</SectionHeading>
          <div className="grid max-w-3xl gap-4">
            <div className="space-y-2">
              <Label htmlFor="infoText">Generell info</Label>
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
              <Label htmlFor="weatherIcon">Vær (ikon)</Label>
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
                  <SelectValue placeholder="Velg ikon" />
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
                <Label htmlFor="weatherTempMin">Min temp (°C)</Label>
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
                <Label htmlFor="weatherTempMax">Max temp (°C)</Label>
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
              <Label htmlFor="weatherText">Vær / merknader (fritekst)</Label>
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
                  Forhåndsvisning (som på print)
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
            <SectionHeading className="mb-0">Oppmøtetid</SectionHeading>
            <p className="text-xs text-muted-foreground">
              Stabsliste: funksjon, navn, mobil og e-post (som ved import). Velg
              fra crew-database eller fra prosjektcrew — eller fyll inn for
              hånd.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
              {availableCrewDatabase.length > 0 ? (
                <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:max-w-[min(100%,360px)]">
                  <span className="text-xs text-muted-foreground">
                    Legg til fra crew-database
                  </span>
                  <Select
                    key={`db-${availableCrewDatabase.length}-${state.crewRows.length}`}
                    onValueChange={(v) => {
                      const opt = crewDatabaseOptions.find((c) => c.personId === v);
                      if (opt) addFromCrewDatabase(opt);
                    }}
                  >
                    <SelectTrigger className="w-full bg-background">
                      <SelectValue placeholder="Velg person…" />
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
                    Legg til fra prosjektcrew
                  </span>
                  <Select
                    key={`pc-${availableProjectCrew.length}-${state.crewRows.length}`}
                    onValueChange={(v) => {
                      const s = crewSuggestions.find((c) => c.projectCrewId === v);
                      if (s) addFromCrew(s);
                    }}
                  >
                    <SelectTrigger className="w-full bg-background">
                      <SelectValue placeholder="Velg…" />
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
                  <th className="pb-1.5 pr-2 font-medium">Funksjon</th>
                  <th className="pb-1.5 pr-2 font-medium">Navn</th>
                  <th className="pb-1.5 pr-2 font-medium">Mobil</th>
                  <th className="pb-1.5 pr-2 font-medium">E-post</th>
                  <th className="pb-1.5 pr-2 font-medium">På sett</th>
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
            + Rad
          </Button>
        </section>

        <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <SectionHeading className="mb-0">Aktører</SectionHeading>
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
              <span>Ekskluder fra utskrift</span>
            </label>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="pb-1.5 pr-1 font-medium">Nr</th>
                  <th className="pb-1.5 pr-1 font-medium">Navn</th>
                  <th className="pb-1.5 pr-1 font-medium">Tlf</th>
                  <th className="pb-1.5 pr-1 font-medium">Film</th>
                  <th className="pb-1.5 pr-1 font-medium">Oppmøte</th>
                  <th className="pb-1.5 pr-1 font-medium">Klar på sett</th>
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
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
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
            + Rad
          </Button>
        </section>

        <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <SectionHeading className="mb-4">Timeplan</SectionHeading>
          <DagsplanScheduleTable
            rows={state.scheduleRows}
            onRowsChange={(scheduleRows) =>
              setState((s) => ({ ...s, scheduleRows }))
            }
          />
          <div className="mt-3 flex flex-wrap gap-2">
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
              + Rad
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setState((s) => ({
                  ...s,
                  scheduleRows: recalculateScheduleRows([
                    ...s.scheduleRows,
                    emptyScheduleRow(crypto.randomUUID(), "free"),
                  ]),
                }))
              }
            >
              + Fri rad
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
              + Lunsj
            </Button>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <SectionHeading className="mb-0">Avdelingsinfo</SectionHeading>
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
              <span>Ekskluder fra utskrift</span>
            </label>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="pb-1.5 pr-2 font-medium">Avdeling</th>
                  <th className="pb-1.5 pr-2 font-medium">Info</th>
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
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
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
            + Rad
          </Button>
        </section>

        <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <SectionHeading className="mb-4">Nødnummer og radio</SectionHeading>
          <div className="grid max-w-3xl gap-4">
            <div className="space-y-2">
              <Label htmlFor="emergency">Nødnummer</Label>
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
              <Label htmlFor="radio">Radiokanaler</Label>
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
              Forhåndsvisning / print
            </Link>
          </Button>
          <Button type="button" disabled={pending} onClick={save}>
            {pending ? "Lagrer…" : "Lagre alle endringer"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-destructive"
            onClick={() => {
              if (
                typeof window !== "undefined" &&
                !window.confirm("Slette denne dagsplanen?")
              )
                return;
              startTransition(async () => {
                await deleteDagsplan(state.id);
              });
            }}
          >
            Slett dagsplan
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
