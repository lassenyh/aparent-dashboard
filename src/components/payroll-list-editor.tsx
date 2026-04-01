"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  FileDown,
  FileUp,
  Trash2,
} from "lucide-react";
import { parsePayrollContractPdf } from "@/actions/payroll-contract-import";
import {
  createPersonForPayrollList,
  duplicatePayrollList,
  getPayrollSensitiveFieldsFromPerson,
  savePayrollRows,
  searchPeopleForPayroll,
  updatePayrollListSubmitted,
} from "@/actions/payroll";
import type { PersonClient } from "@/lib/serialize";
import { primaryRole } from "@/lib/person";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  formatNorwegianMobileFromRaw,
  formatPartialNorwegianMobile,
} from "@/lib/norwegian-mobile";
import type { PayrollContractExtract } from "@/lib/payroll-contract-pdf-parse";
import { validatePayrollRowsForSave } from "@/lib/payroll-row-validation";
import { dietaryLabel } from "@/lib/dietary";
import { cn } from "@/lib/utils";
import type { DietaryPreference } from "@prisma/client";
import { z } from "zod";

export type PayrollSegment = "crew" | "cast";

/** Gate, postnummer og poststed er påkrevd; land er valgfritt. */
function hasCompleteAddressParts(a: {
  addressLine?: string | null;
  postalCode?: string | null;
  city?: string | null;
  country?: string | null;
}) {
  return (
    !!(a.addressLine ?? "").trim() &&
    !!(a.postalCode ?? "").trim() &&
    !!(a.city ?? "").trim()
  );
}

export type PayrollCrewOption = {
  projectCrewId: string;
  personId: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  addressLine: string | null;
  postalCode: string | null;
  city: string | null;
  country: string | null;
  roleLine: string;
  honorar: number | null;
  dietaryPreference: DietaryPreference;
};

export type PayrollRowDraft = {
  key: string;
  isSectionHeader: boolean;
  sectionTitle: string | null;
  personId: string | null;
  fullName: string;
  projectLabel: string;
  addressLine: string | null;
  postalCode: string | null;
  city: string | null;
  country: string | null;
  honorar: number | null;
  includesHolidayPay: boolean;
  nationalId: string | null;
  bankAccount: string | null;
  mobile: string | null;
  email: string | null;
  /** Maskert visning i editor; klartekst lagres server-side / vises ved utskrift uten ?preview=1 */
  sensitiveFieldsMaskInUi: boolean;
  segment: PayrollSegment;
  /** Fra crew-database (Person); vises ikke lagret på rad. */
  dietaryPreference: DietaryPreference | null;
};

export type PayrollRowInput = Omit<PayrollRowDraft, "key"> & { id: string };

function rowFromServer(r: PayrollRowInput): PayrollRowDraft {
  return {
    key: r.id,
    isSectionHeader: r.isSectionHeader,
    sectionTitle: r.sectionTitle,
    personId: r.personId,
    fullName: r.fullName,
    projectLabel: r.projectLabel,
    addressLine: r.addressLine,
    postalCode: r.postalCode,
    city: r.city,
    country: r.country,
    honorar: r.honorar,
    includesHolidayPay: r.includesHolidayPay,
    nationalId: r.nationalId,
    bankAccount: r.bankAccount,
    mobile:
      formatNorwegianMobileFromRaw(r.mobile) ??
      (r.mobile?.trim() ? r.mobile : null),
    email: r.email,
    sensitiveFieldsMaskInUi: r.sensitiveFieldsMaskInUi,
    segment: r.segment,
    dietaryPreference: r.dietaryPreference ?? null,
  };
}

function splitInitialRows(rows: PayrollRowInput[]) {
  const crew: PayrollRowInput[] = [];
  const cast: PayrollRowInput[] = [];
  for (const r of rows) {
    if (r.segment === "cast") cast.push(r);
    else crew.push(r);
  }
  return { crew, cast };
}

function rowPayloadSnapshot(r: PayrollRowDraft, segment: PayrollSegment) {
  return {
    isSectionHeader: r.isSectionHeader,
    sectionTitle: r.sectionTitle,
    personId: r.personId,
    fullName: r.fullName,
    projectLabel: r.projectLabel,
    addressLine: r.addressLine,
    postalCode: r.postalCode,
    city: r.city,
    country: r.country,
    honorar: r.honorar,
    includesHolidayPay: r.includesHolidayPay,
    nationalId: r.nationalId,
    bankAccount: r.bankAccount,
    mobile: r.mobile,
    email: r.email,
    sensitiveFieldsMaskInUi: r.sensitiveFieldsMaskInUi,
    segment,
    dietaryPreference: r.dietaryPreference ?? null,
  };
}

function rowSnapshotFromInput(r: PayrollRowInput, segment: PayrollSegment) {
  return {
    isSectionHeader: r.isSectionHeader,
    sectionTitle: r.sectionTitle,
    personId: r.personId,
    fullName: r.fullName,
    projectLabel: r.projectLabel,
    addressLine: r.addressLine,
    postalCode: r.postalCode,
    city: r.city,
    country: r.country,
    honorar: r.honorar,
    includesHolidayPay: r.includesHolidayPay,
    nationalId: r.nationalId,
    bankAccount: r.bankAccount,
    mobile: r.mobile,
    email: r.email,
    sensitiveFieldsMaskInUi: r.sensitiveFieldsMaskInUi,
    segment,
    dietaryPreference: r.dietaryPreference ?? null,
  };
}

function buildSaveRowPayload(r: PayrollRowDraft, segment: PayrollSegment) {
  const honorar =
    r.honorar != null && typeof r.honorar === "string"
      ? Number(String(r.honorar).replace(",", ".").trim())
      : r.honorar;
  const honorarNorm =
    honorar != null && !Number.isNaN(honorar) ? honorar : null;

  return {
    isSectionHeader: Boolean(r.isSectionHeader),
    sectionTitle: r.sectionTitle,
    personId: r.personId,
    fullName: r.fullName,
    projectLabel: r.projectLabel,
    addressLine: r.addressLine?.trim() || null,
    postalCode: r.postalCode?.trim() || null,
    city: r.city?.trim() || null,
    country: r.country?.trim() || null,
    honorar: honorarNorm,
    includesHolidayPay: Boolean(r.includesHolidayPay),
    nationalId: r.sensitiveFieldsMaskInUi ? null : r.nationalId,
    bankAccount: r.sensitiveFieldsMaskInUi ? null : r.bankAccount,
    mobile: r.isSectionHeader
      ? null
      : formatNorwegianMobileFromRaw(r.mobile) ?? null,
    email: r.email,
    sensitiveFieldsMaskInUi: Boolean(r.sensitiveFieldsMaskInUi),
    segment,
  };
}

const inputInCard =
  "h-9 w-full max-w-full border-input bg-background text-sm shadow-sm";

export function PayrollListEditor({
  projectId,
  listId,
  initialTitle,
  initialSubmitted,
  defaultProjectLabel,
  initialRows,
  crew,
}: {
  projectId: string;
  listId: string;
  initialTitle: string;
  initialSubmitted: boolean;
  defaultProjectLabel: string;
  initialRows: PayrollRowInput[];
  crew: PayrollCrewOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [metaPending, startMetaTransition] = useTransition();
  const [createPersonPending, startCreatePerson] = useTransition();
  const [dupPending, startDup] = useTransition();
  const [sensitiveFetchPending, startSensitiveFetch] = useTransition();
  const [pdfImportPending, startPdfImport] = useTransition();
  const pdfPickSegmentRef = useRef<PayrollSegment>("crew");
  const payrollPdfInputRef = useRef<HTMLInputElement>(null);
  const [listTitle, setListTitle] = useState(initialTitle);
  const [submitted, setSubmitted] = useState(initialSubmitted);
  const [crewRows, setCrewRows] = useState<PayrollRowDraft[]>(() => {
    const { crew } = splitInitialRows(initialRows);
    return crew.map(rowFromServer);
  });
  const [castRows, setCastRows] = useState<PayrollRowDraft[]>(() => {
    const { cast } = splitInitialRows(initialRows);
    return cast.map(rowFromServer);
  });
  const [pickerOpenCrew, setPickerOpenCrew] = useState(false);
  const [pickerOpenCast, setPickerOpenCast] = useState(false);
  const [dbPickerOpenCrew, setDbPickerOpenCrew] = useState(false);
  const [dbPickerOpenCast, setDbPickerOpenCast] = useState(false);
  const [dbQuery, setDbQuery] = useState("");
  const [dbResults, setDbResults] = useState<PersonClient[]>([]);
  const [dbPending, startDbSearch] = useTransition();
  /** Kun én personrad utvidet om gangen (accordion). */
  const [expandedRowKey, setExpandedRowKey] = useState<string | null>(null);

  const initialRowsSerialized = useMemo(() => {
    const { crew, cast } = splitInitialRows(initialRows);
    return JSON.stringify([
      ...crew.map((r) => rowSnapshotFromInput(r, "crew")),
      ...cast.map((r) => rowSnapshotFromInput(r, "cast")),
    ]);
  }, [initialRows]);
  const rowsDirty =
    JSON.stringify([
      ...crewRows.map((r) => rowPayloadSnapshot(r, "crew")),
      ...castRows.map((r) => rowPayloadSnapshot(r, "cast")),
    ]) !== initialRowsSerialized;
  const titleDirty = listTitle.trim() !== initialTitle.trim();
  const dirty = rowsDirty || titleDirty;

  const allRowsCombined = useMemo(
    () => [...crewRows, ...castRows],
    [crewRows, castRows],
  );

  const crewAvailable = useMemo(() => {
    const taken = new Set(
      allRowsCombined.map((r) => r.personId).filter(Boolean) as string[],
    );
    return crew.filter((c) => !taken.has(c.personId));
  }, [crew, allRowsCombined]);

  const dbResultsVisible = useMemo(() => {
    const taken = new Set(
      allRowsCombined.map((r) => r.personId).filter(Boolean) as string[],
    );
    return dbResults.filter((p) => !taken.has(p.id));
  }, [dbResults, allRowsCombined]);

  useEffect(() => {
    const t = setTimeout(() => {
      startDbSearch(async () => {
        const r = await searchPeopleForPayroll(projectId, listId, dbQuery);
        setDbResults(r);
      });
    }, 160);
    return () => clearTimeout(t);
  }, [projectId, listId, dbQuery]);

  function updateRow(
    segment: PayrollSegment,
    key: string,
    patch: Partial<PayrollRowDraft>,
  ) {
    const setter = segment === "crew" ? setCrewRows : setCastRows;
    setter((prev) =>
      prev.map((r) => (r.key === key ? { ...r, ...patch } : r)),
    );
  }

  function removeRow(segment: PayrollSegment, key: string) {
    setExpandedRowKey((prev) => (prev === key ? null : prev));
    const setter = segment === "crew" ? setCrewRows : setCastRows;
    setter((prev) => prev.filter((r) => r.key !== key));
  }

  function moveRow(segment: PayrollSegment, key: string, dir: -1 | 1) {
    const setter = segment === "crew" ? setCrewRows : setCastRows;
    setter((prev) => {
      const i = prev.findIndex((r) => r.key === key);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  function addFromCrew(c: PayrollCrewOption, segment: PayrollSegment) {
    const mob = formatNorwegianMobileFromRaw(c.phone);
    if (!mob) {
      toast.error(
        "Telefonnummeret er ikke gyldig norsk mobil (8 siffer). Oppdater telefon under Crew først.",
      );
      return;
    }
    const em = (c.email ?? "").trim();
    if (!em) {
      toast.error("E-post mangler. Oppdater personen under Crew først.");
      return;
    }
    if (!z.string().email().safeParse(em).success) {
      toast.error(
        "Ugyldig e-postadresse i databasen. Oppdater under Crew først.",
      );
      return;
    }
    if (!hasCompleteAddressParts(c)) {
      toast.error(
        "Adresse mangler (gate, postnummer, poststed). Oppdater personen under Crew først.",
      );
      return;
    }
    if (c.honorar == null || Number.isNaN(c.honorar)) {
      toast.error(
        "Honorar mangler på prosjektcrew. Oppdater under Crew først.",
      );
      return;
    }
    const setter = segment === "crew" ? setCrewRows : setCastRows;
    const setPicker =
      segment === "crew" ? setPickerOpenCrew : setPickerOpenCast;
    startSensitiveFetch(async () => {
      const { bankAccount, nationalId } =
        await getPayrollSensitiveFieldsFromPerson(c.personId);
      setter((prev) => [
        ...prev,
        {
          key: crypto.randomUUID(),
          isSectionHeader: false,
          sectionTitle: null,
          personId: c.personId,
          fullName: c.fullName,
          projectLabel: defaultProjectLabel,
          addressLine: c.addressLine,
          postalCode: c.postalCode,
          city: c.city,
          country: c.country,
          honorar: c.honorar,
          includesHolidayPay: false,
          nationalId,
          bankAccount,
          mobile: mob,
          email: c.email,
          sensitiveFieldsMaskInUi: true,
          segment,
          dietaryPreference: c.dietaryPreference,
        },
      ]);
      setPicker(false);
      toast.success(`${c.fullName} lagt til`);
    });
  }

  function addFromDatabase(p: PersonClient, segment: PayrollSegment) {
    const taken = new Set(
      allRowsCombined.map((r) => r.personId).filter(Boolean) as string[],
    );
    if (taken.has(p.id)) {
      toast.error("Personen er allerede på listen");
      return;
    }
    const mob = formatNorwegianMobileFromRaw(p.phone);
    if (!mob) {
      toast.error(
        "Telefonnummeret er ikke gyldig norsk mobil (8 siffer). Oppdater telefon under Crew først.",
      );
      return;
    }
    const pem = (p.email ?? "").trim();
    if (!pem) {
      toast.error("E-post mangler. Oppdater personen under Crew først.");
      return;
    }
    if (!z.string().email().safeParse(pem).success) {
      toast.error(
        "Ugyldig e-postadresse i databasen. Oppdater under Crew først.",
      );
      return;
    }
    if (!hasCompleteAddressParts(p)) {
      toast.error(
        "Adresse mangler (gate, postnummer, poststed). Oppdater personen under Crew først.",
      );
      return;
    }
    const setter = segment === "crew" ? setCrewRows : setCastRows;
    const setDbPicker =
      segment === "crew" ? setDbPickerOpenCrew : setDbPickerOpenCast;
    startSensitiveFetch(async () => {
      const { bankAccount, nationalId } =
        await getPayrollSensitiveFieldsFromPerson(p.id);
      setter((prev) => [
        ...prev,
        {
          key: crypto.randomUUID(),
          isSectionHeader: false,
          sectionTitle: null,
          personId: p.id,
          fullName: p.fullName,
          projectLabel: defaultProjectLabel,
          addressLine: p.addressLine ?? null,
          postalCode: p.postalCode ?? null,
          city: p.city ?? null,
          country: p.country ?? null,
          honorar:
            p.defaultRate != null && !Number.isNaN(p.defaultRate)
              ? p.defaultRate
              : null,
          includesHolidayPay: false,
          nationalId,
          bankAccount,
          mobile: mob,
          email: p.email,
          sensitiveFieldsMaskInUi: true,
          segment,
          dietaryPreference: p.dietaryPreference ?? null,
        },
      ]);
      setDbPicker(false);
      setDbQuery("");
      toast.success(`${p.fullName} lagt til`);
    });
  }

  function addEmpty(segment: PayrollSegment) {
    const setter = segment === "crew" ? setCrewRows : setCastRows;
    setter((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        isSectionHeader: false,
        sectionTitle: null,
        personId: null,
        fullName: "",
        projectLabel: defaultProjectLabel,
        addressLine: null,
        postalCode: null,
        city: null,
        country: null,
        honorar: null,
        includesHolidayPay: false,
        nationalId: null,
        bankAccount: null,
        mobile: null,
        email: null,
        sensitiveFieldsMaskInUi: false,
        segment,
        dietaryPreference: null,
      },
    ]);
  }

  function addRowFromContractPdf(
    segment: PayrollSegment,
    d: PayrollContractExtract,
  ) {
    const setter = segment === "crew" ? setCrewRows : setCastRows;
    const mob =
      formatNorwegianMobileFromRaw(d.mobile) ??
      (d.mobile?.trim() ? d.mobile.trim() : null);
    setter((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        isSectionHeader: false,
        sectionTitle: null,
        personId: null,
        fullName: d.fullName ?? "",
        projectLabel: defaultProjectLabel,
        addressLine: d.addressLine,
        postalCode: d.postalCode,
        city: d.city,
        country: d.country,
        honorar: d.honorar,
        includesHolidayPay: d.includesHolidayPay === true,
        nationalId: d.nationalId,
        bankAccount: d.bankAccount,
        mobile: mob,
        email: d.email,
        sensitiveFieldsMaskInUi: false,
        segment,
        dietaryPreference: null,
      },
    ]);
  }

  function save() {
    if (!listTitle.trim()) {
      toast.error("Navn på liste mangler.");
      return;
    }
    const mergedForValidation = [
      ...crewRows.map((r) => ({ ...r, segment: "crew" as const })),
      ...castRows.map((r) => ({ ...r, segment: "cast" as const })),
    ];
    const pre = validatePayrollRowsForSave(mergedForValidation);
    if (!pre.ok) {
      toast.error(pre.error);
      return;
    }
    const payload = [
      ...crewRows.map((r) => buildSaveRowPayload(r, "crew")),
      ...castRows.map((r) => buildSaveRowPayload(r, "cast")),
    ];

    startTransition(async () => {
      const res = await savePayrollRows(projectId, listId, payload, {
        title: listTitle,
      });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Lønningsliste lagret");
      router.refresh();
    });
  }

  function onSubmittedChange(c: boolean) {
    startMetaTransition(async () => {
      const res = await updatePayrollListSubmitted(projectId, listId, c);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      setSubmitted(c);
      router.refresh();
    });
  }

  const locked = submitted;

  return (
    <div className="space-y-4">
      <input
        ref={payrollPdfInputRef}
        type="file"
        className="sr-only"
        accept="application/pdf,.pdf"
        aria-hidden
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          const seg = pdfPickSegmentRef.current;
          startPdfImport(async () => {
            const fd = new FormData();
            fd.append("pdf", file);
            const res = await parsePayrollContractPdf(fd);
            if (!res.ok) {
              toast.error(res.error);
              return;
            }
            addRowFromContractPdf(seg, res.data);
            const fields = res.data.matchedFields;
            toast.success(
              `Rad fra PDF (${fields.length} felt: ${fields.join(", ")}). Kontroller opplysningene.`,
            );
          });
        }}
      />
      {locked ? (
        <div className="no-print rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
          Denne listen er merket innsendt og kan ikke redigeres. Bruk{" "}
          <span className="font-medium">Dupliser liste</span> for å lage en kopi du
          kan endre.
        </div>
      ) : null}
      <div className="no-print rounded-lg border border-border bg-muted/10 px-4 py-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="payroll-list-title">Navn på liste (påkrevd)</Label>
            <Input
              id="payroll-list-title"
              value={listTitle}
              onChange={(e) => setListTitle(e.target.value)}
              className={inputInCard}
              placeholder="F.eks. Innspilling uke 12"
              readOnly={locked}
              required
              aria-required
            />
          </div>
          <div className="space-y-1.5">
            <span className="block text-sm font-medium leading-none">
              Innsendt
            </span>
            <div className="flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 shadow-sm">
              <Checkbox
                id="payroll-submitted"
                checked={submitted}
                disabled={locked || metaPending}
                onCheckedChange={(c) => onSubmittedChange(c === true)}
              />
              <Label
                htmlFor="payroll-submitted"
                className="cursor-pointer text-sm font-normal leading-none"
              >
                Innsendt til regnskapsfører
              </Label>
            </div>
          </div>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Prosjektfeltet fyller ut med «Prosjektnr - Kunde - Prosjektnavn» for dette
        prosjektet som standard — du kan endre det per rad før du sender til
        regnskapsfører. Listen er delt i <span className="font-medium">Crew</span>{" "}
        og <span className="font-medium">Cast</span>; begge deler følger med i PDF
        og utskrift. «Legg til fra PDF» leser tekst fra f.eks. statistkontrakt
        (tekstbasert PDF, ikke bare skann) og fyller inn det den gjenkjenner —
        kontroller alltid raden før lagring.
      </p>

      <div className="no-print space-y-8">
        {(["crew", "cast"] as const).map((segment) => {
          const rows = segment === "crew" ? crewRows : castRows;
          const pickerOpen =
            segment === "crew" ? pickerOpenCrew : pickerOpenCast;
          const setPickerOpen =
            segment === "crew" ? setPickerOpenCrew : setPickerOpenCast;
          const dbPickerOpenSeg =
            segment === "crew" ? dbPickerOpenCrew : dbPickerOpenCast;
          const setDbPickerOpenSeg =
            segment === "crew" ? setDbPickerOpenCrew : setDbPickerOpenCast;
          const heading = segment === "crew" ? "Crew" : "Cast";
          return (
            <div
              key={segment}
              className="space-y-3 rounded-lg border border-border bg-muted/20 p-4"
            >
              <h3 className="text-base font-semibold tracking-tight">
                {heading}
              </h3>
              <div className="no-print flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addEmpty(segment)}
                  disabled={locked}
                >
                  Legg til
                </Button>
                <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={locked || sensitiveFetchPending}
                    >
                      Legg til fra prosjekt
                      <ChevronDown className="h-4 w-4 opacity-70" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[min(100vw-2rem,360px)] p-0"
                    align="start"
                  >
                    <div className="max-h-64 overflow-y-auto p-1">
                      {crewAvailable.length ? (
                        crewAvailable.map((c) => (
                          <button
                            key={c.projectCrewId}
                            type="button"
                            onClick={() => addFromCrew(c, segment)}
                            disabled={sensitiveFetchPending}
                            className="flex w-full flex-col items-start gap-0.5 rounded-md px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted disabled:opacity-50"
                          >
                            <span className="font-medium text-foreground">
                              {c.fullName}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {c.roleLine}
                            </span>
                          </button>
                        ))
                      ) : (
                        <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                          {crew.length
                            ? "Alle i prosjektcrew er allerede på listen, eller ingen å legge til."
                            : "Ingen aktivt prosjektcrew. Legg til folk under Prosjektcrew først."}
                        </p>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
                <Popover open={dbPickerOpenSeg} onOpenChange={setDbPickerOpenSeg}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={locked || sensitiveFetchPending}
                    >
                      Legg til fra database
                      <ChevronDown className="h-4 w-4 opacity-70" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[min(100vw-2rem,380px)] border-border p-0 shadow-md"
                    align="start"
                  >
                    <div className="border-b border-border p-3">
                      <Label
                        className="sr-only"
                        htmlFor={`payroll-db-search-${segment}`}
                      >
                        Søk i crew-databasen
                      </Label>
                      <Input
                        id={`payroll-db-search-${segment}`}
                        placeholder="Søk navn, rolle, telefon…"
                        value={dbQuery}
                        onChange={(e) => setDbQuery(e.target.value)}
                        readOnly={locked}
                      />
                    </div>
                    <div className="max-h-64 overflow-y-auto p-1">
                      {dbPending && !dbResultsVisible.length ? (
                        <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                          Søker…
                        </p>
                      ) : null}
                      {dbResultsVisible.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => addFromDatabase(p, segment)}
                          disabled={dbPending || sensitiveFetchPending}
                          className="flex w-full flex-col items-start gap-0.5 rounded-md px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted disabled:opacity-50"
                        >
                          <span className="font-medium text-foreground">
                            {p.fullName}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {primaryRole(p)}
                            {p.phone ? ` · ${p.phone}` : ""}
                          </span>
                        </button>
                      ))}
                      {!dbPending && !dbResultsVisible.length ? (
                        <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                          {dbResults.length > 0
                            ? "Alle treff er allerede på listen."
                            : "Ingen treff. Opprett personen under Crew først."}
                        </p>
                      ) : null}
                    </div>
                  </PopoverContent>
                </Popover>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={locked || pdfImportPending}
                  onClick={() => {
                    pdfPickSegmentRef.current = segment;
                    payrollPdfInputRef.current?.click();
                  }}
                >
                  <FileUp className="mr-1.5 h-4 w-4 opacity-70" />
                  Legg til fra PDF
                </Button>
              </div>

              <div className="space-y-3">
        {rows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
            Ingen rader i {heading} ennå. Bruk «Legg til», «Legg til fra PDF»
            (f.eks. statistkontrakt), fra prosjekt eller database.
          </div>
        ) : null}
        {rows.map((row, idx) =>
          row.isSectionHeader ? (
            <div
              key={row.key}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/60 px-3 py-3"
            >
              <div className="min-w-0 flex-1 space-y-1.5">
                <Label htmlFor={`sec-${row.key}`}>
                  Seksjonstittel (påkrevd)
                </Label>
                <Input
                  id={`sec-${row.key}`}
                  value={row.sectionTitle ?? ""}
                  onChange={(e) =>
                    updateRow(segment, row.key, {
                      sectionTitle: e.target.value,
                    })
                  }
                  className={cn(inputInCard, "max-w-md font-semibold")}
                  placeholder="NYE:"
                  readOnly={locked}
                  required
                  aria-required
                />
              </div>
              <div className="no-print flex shrink-0 justify-end">
                <RowActions
                  onUp={() => moveRow(segment, row.key, -1)}
                  onDown={() => moveRow(segment, row.key, 1)}
                  onRemove={() => removeRow(segment, row.key)}
                  disableUp={idx === 0}
                  disableDown={idx === rows.length - 1}
                  disabled={locked}
                />
              </div>
            </div>
          ) : (
            <Collapsible
              key={row.key}
              open={expandedRowKey === row.key}
              onOpenChange={(open) => {
                if (open) setExpandedRowKey(row.key);
                else setExpandedRowKey(null);
              }}
              className="group rounded-lg border border-border bg-card shadow-sm"
            >
              <div className="flex flex-wrap items-start gap-2 px-3 py-3 sm:items-center">
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-start gap-2 rounded-md text-left outline-none ring-offset-background hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:items-center"
                  >
                    <ChevronDown
                      aria-hidden
                      className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180 sm:mt-0"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium leading-snug">
                        {row.fullName.trim() || "Tom rad"}
                      </span>
                      <span className="mt-0.5 block text-sm text-muted-foreground">
                        {row.projectLabel || defaultProjectLabel}
                        {" · "}
                        {row.honorar != null && !Number.isNaN(row.honorar)
                          ? `${row.honorar} kr`
                          : "—"}
                        {row.includesHolidayPay ? " · FP" : ""}
                        {row.dietaryPreference &&
                        row.dietaryPreference !== "none"
                          ? ` · ${dietaryLabel(row.dietaryPreference)}`
                          : ""}
                      </span>
                    </span>
                  </button>
                </CollapsibleTrigger>
                <div className="no-print flex shrink-0 justify-end">
                  <RowActions
                    onUp={() => moveRow(segment, row.key, -1)}
                    onDown={() => moveRow(segment, row.key, 1)}
                    onRemove={() => removeRow(segment, row.key)}
                    disableUp={idx === 0}
                    disableDown={idx === rows.length - 1}
                    disabled={locked}
                  />
                </div>
              </div>
              <CollapsibleContent className="overflow-hidden">
                <div className="border-t border-border px-4 pb-4 pt-1">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1 space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor={`name-${row.key}`}>Navn (påkrevd)</Label>
                        <Input
                          id={`name-${row.key}`}
                          value={row.fullName}
                          onChange={(e) =>
                            updateRow(segment, row.key, { fullName: e.target.value })
                          }
                          className={inputInCard}
                          placeholder="Navn"
                          autoComplete={segment === "cast" ? "off" : "name"}
                          readOnly={locked}
                          required
                          aria-required
                        />
                      </div>
                      {!row.personId && !locked ? (
                        <div className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-2.5">
                          <p className="mb-2 text-xs text-muted-foreground">
                            Ingen kobling til crew ennå. Oppretter ny person med
                            navn, e-post, mobil, full adresse og honorar fra
                            raden, og legger vedkommende på prosjektcrew. Husk å
                            lagre lønningslisten etterpå.
                          </p>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            disabled={
                              createPersonPending ||
                              row.fullName.trim().length < 2 ||
                              !formatNorwegianMobileFromRaw(row.mobile) ||
                              !(row.email ?? "").trim() ||
                              !z
                                .string()
                                .email()
                                .safeParse((row.email ?? "").trim()).success ||
                              !hasCompleteAddressParts(row) ||
                              row.honorar == null ||
                              Number.isNaN(row.honorar)
                            }
                            onClick={() => {
                              startCreatePerson(async () => {
                                const res = await createPersonForPayrollList(
                                  projectId,
                                  listId,
                                  {
                                    fullName: row.fullName,
                                    email: row.email,
                                    mobile: row.mobile,
                                    addressLine: row.addressLine,
                                    postalCode: row.postalCode,
                                    city: row.city,
                                    country: row.country,
                                    honorar: row.honorar,
                                  },
                                );
                                if (!res.ok) {
                                  toast.error(res.error);
                                  return;
                                }
                                updateRow(segment, row.key, {
                                  personId: res.personId,
                                  dietaryPreference: "none",
                                });
                                toast.success(
                                  "Person opprettet og lagt til prosjektcrew.",
                                );
                                router.refresh();
                              });
                            }}
                          >
                            {createPersonPending
                              ? "Oppretter…"
                              : "Opprett person i crew-database"}
                          </Button>
                        </div>
                      ) : null}
                      <div className="space-y-1.5">
                        <Label htmlFor={`proj-${row.key}`}>
                          Prosjekt (påkrevd)
                        </Label>
                        <Input
                          id={`proj-${row.key}`}
                          value={row.projectLabel}
                          onChange={(e) =>
                            updateRow(segment, row.key, {
                              projectLabel: e.target.value,
                            })
                          }
                          className={inputInCard}
                          placeholder={defaultProjectLabel}
                          autoComplete={segment === "cast" ? "off" : undefined}
                          readOnly={locked}
                          required
                          aria-required
                        />
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5 sm:col-span-2">
                          <Label htmlFor={`addr-line-${row.key}`}>
                            Adresse (påkrevd)
                          </Label>
                          <Input
                            id={`addr-line-${row.key}`}
                            value={row.addressLine ?? ""}
                            onChange={(e) =>
                              updateRow(segment, row.key, {
                                addressLine: e.target.value || null,
                              })
                            }
                            className={inputInCard}
                            placeholder="Gate og nummer"
                            autoComplete={
                              segment === "cast" ? "off" : "street-address"
                            }
                            readOnly={locked}
                            required
                            aria-required
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor={`postal-${row.key}`}>
                            Postnummer (påkrevd)
                          </Label>
                          <Input
                            id={`postal-${row.key}`}
                            value={row.postalCode ?? ""}
                            onChange={(e) =>
                              updateRow(segment, row.key, {
                                postalCode: e.target.value || null,
                              })
                            }
                            className={inputInCard}
                            placeholder="0000"
                            autoComplete={
                              segment === "cast" ? "off" : "postal-code"
                            }
                            readOnly={locked}
                            required
                            aria-required
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor={`city-${row.key}`}>
                            Poststed (påkrevd)
                          </Label>
                          <Input
                            id={`city-${row.key}`}
                            value={row.city ?? ""}
                            onChange={(e) =>
                              updateRow(segment, row.key, {
                                city: e.target.value || null,
                              })
                            }
                            className={inputInCard}
                            placeholder="Sted"
                            autoComplete={
                              segment === "cast" ? "off" : "address-level2"
                            }
                            readOnly={locked}
                            required
                            aria-required
                          />
                        </div>
                        <div className="space-y-1.5 sm:col-span-2">
                          <Label htmlFor={`country-${row.key}`}>
                            Land (valgfritt)
                          </Label>
                          <Input
                            id={`country-${row.key}`}
                            value={row.country ?? ""}
                            onChange={(e) =>
                              updateRow(segment, row.key, {
                                country: e.target.value || null,
                              })
                            }
                            className={inputInCard}
                            placeholder="Norge"
                            autoComplete={
                              segment === "cast" ? "off" : "country-name"
                            }
                            readOnly={locked}
                          />
                        </div>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label htmlFor={`hon-${row.key}`}>
                            Honorar (påkrevd)
                          </Label>
                          <Input
                            id={`hon-${row.key}`}
                            type="number"
                            inputMode="decimal"
                            value={row.honorar ?? ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              const n =
                                v === ""
                                  ? null
                                  : Number(
                                      String(v).replace(/\s/g, "").replace(",", "."),
                                    );
                              updateRow(segment, row.key, {
                                honorar:
                                  n == null || Number.isNaN(n) ? null : n,
                              });
                            }}
                            className={cn(inputInCard, "tabular-nums")}
                            placeholder="0"
                            autoComplete={segment === "cast" ? "off" : "transaction-amount"}
                            readOnly={locked}
                            required
                            aria-required
                          />
                        </div>
                        <div className="space-y-1.5">
                          <span className="block text-sm font-medium leading-none">Feriepenger</span>
                          <div className="flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 shadow-sm">
                            <Checkbox
                              id={`fp-${row.key}`}
                              checked={row.includesHolidayPay}
                              disabled={locked}
                              onCheckedChange={(c) =>
                                updateRow(segment, row.key, {
                                  includesHolidayPay: c === true,
                                })
                              }
                            />
                            <Label
                              htmlFor={`fp-${row.key}`}
                              className="cursor-pointer text-sm font-normal leading-none">
                              Inkl. FP
                            </Label>
                          </div>
                        </div>
                      </div>
                      {row.sensitiveFieldsMaskInUi ? (
                        <p className="text-xs text-muted-foreground">
                          Personnr. og kontonr. er maskert her. Full verdi vises
                          ved utskrift (uten forhåndsvisning) og når du laster ned
                          til datamaskin.
                        </p>
                      ) : null}
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label htmlFor={`pnr-${row.key}`}>
                            Personnr. (påkrevd)
                          </Label>
                          <Input
                            id={`pnr-${row.key}`}
                            value={row.nationalId ?? ""}
                            onChange={(e) =>
                              updateRow(segment, row.key, {
                                nationalId: e.target.value || null,
                              })
                            }
                            className={inputInCard}
                            placeholder="11 siffer"
                            autoComplete="off"
                            readOnly={locked || row.sensitiveFieldsMaskInUi}
                            required={!row.sensitiveFieldsMaskInUi}
                            aria-required={!row.sensitiveFieldsMaskInUi}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor={`bank-${row.key}`}>
                            Kontonr. (påkrevd)
                          </Label>
                          <Input
                            id={`bank-${row.key}`}
                            value={row.bankAccount ?? ""}
                            onChange={(e) =>
                              updateRow(segment, row.key, {
                                bankAccount: e.target.value || null,
                              })
                            }
                            className={inputInCard}
                            placeholder="11 siffer"
                            autoComplete="off"
                            readOnly={locked || row.sensitiveFieldsMaskInUi}
                            required={!row.sensitiveFieldsMaskInUi}
                            aria-required={!row.sensitiveFieldsMaskInUi}
                          />
                        </div>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label htmlFor={`mob-${row.key}`}>
                            Mobil (påkrevd, 8 siffer)
                          </Label>
                          <Input
                            id={`mob-${row.key}`}
                            value={row.mobile ?? ""}
                            onChange={(e) => {
                              const d = e.target.value
                                .replace(/\D/g, "")
                                .slice(0, 8);
                              updateRow(segment, row.key, {
                                mobile:
                                  d.length === 0
                                    ? null
                                    : formatPartialNorwegianMobile(d),
                              });
                            }}
                            onBlur={() => {
                              const setter =
                                segment === "crew" ? setCrewRows : setCastRows;
                              setter((prev) =>
                                prev.map((r) => {
                                  if (r.key !== row.key) return r;
                                  const m = formatNorwegianMobileFromRaw(
                                    r.mobile,
                                  );
                                  return m ? { ...r, mobile: m } : r;
                                }),
                              );
                            }}
                            className={inputInCard}
                            placeholder="412 34 567"
                            inputMode="numeric"
                            autoComplete={segment === "cast" ? "off" : "tel"}
                            readOnly={locked}
                            required
                            aria-required
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor={`em-${row.key}`}>
                            E-post (påkrevd)
                          </Label>
                          <Input
                            id={`em-${row.key}`}
                            type="email"
                            value={row.email ?? ""}
                            onChange={(e) =>
                              updateRow(segment, row.key, {
                                email: e.target.value || null,
                              })
                            }
                            className={inputInCard}
                            placeholder="navn@eksempel.no"
                            autoComplete={segment === "cast" ? "off" : "email"}
                            readOnly={locked}
                            required
                            aria-required
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          ),
        )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="no-print space-y-6 border-t border-border pt-6">
        <div className="flex flex-wrap gap-2">
          {!locked ? (
            <Button
              type="button"
              size="sm"
              disabled={pending || !dirty}
              onClick={save}
            >
              {pending ? "Lagrer…" : "Lagre"}
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant={locked ? "default" : "outline"}
            disabled={dupPending}
            onClick={() =>
              startDup(async () => {
                await duplicatePayrollList(projectId, listId);
              })
            }
          >
            {dupPending ? (
              "Dupliserer…"
            ) : (
              <>
                <Copy className="mr-1.5 h-4 w-4" />
                Dupliser liste
              </>
            )}
          </Button>
        </div>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link
                href={`/projects/${projectId}/lonningsliste/${listId}/print?preview=1`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Eye className="h-4 w-4" />
                Forhåndsvis PDF
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link
                href={`/api/projects/${projectId}/lonningsliste/${listId}/pdf`}
              >
                <FileDown className="h-4 w-4" />
                Last ned til datamaskin
              </Link>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            PDF viser <span className="font-medium">lagret</span> data.
            {!locked
              ? " Lagre endringer før du åpner forhåndsvisning eller laster ned."
              : null}{" "}
            Forhåndsvis åpner listen i en ny fane og maskerer personnr./kontonr.
            når raden er hentet fra crew med skjulte felt. «Last ned til
            datamaskin» laster ned PDF med fullt innhold; vanlig utskrift viser
            også fullt innhold.
          </p>
        </div>
      </div>
    </div>
  );
}

function RowActions({
  onUp,
  onDown,
  onRemove,
  disableUp,
  disableDown,
  disabled = false,
}: {
  onUp: () => void;
  onDown: () => void;
  onRemove: () => void;
  disableUp: boolean;
  disableDown: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="flex justify-end gap-0.5">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={onUp}
        disabled={disabled || disableUp}
        aria-label="Flytt opp"
      >
        <ChevronUp className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={onDown}
        disabled={disabled || disableDown}
        aria-label="Flytt ned"
      >
        <ChevronDown className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-destructive hover:text-destructive"
        onClick={onRemove}
        disabled={disabled}
        aria-label="Fjern rad"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
