"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { Upload } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  batchImportCrewListRows,
  parseCrewListPdf,
  parseCrewListPastedText,
} from "@/actions/crew-list-import";
import type { CrewImportDraftRow } from "@/lib/crew-list-import-parse";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export function CrewListImportClient() {
  const router = useRouter();
  const [parseState, parseAction, parsePending] = useActionState(
    parseCrewListPdf,
    null,
  );
  const [pasteText, setPasteText] = useState("");
  const [rows, setRows] = useState<CrewImportDraftRow[]>([]);
  const [textPreview, setTextPreview] = useState<string | null>(null);
  const [importPending, startImportTransition] = useTransition();
  const [pastePending, startPasteTransition] = useTransition();
  const [pdfDragging, setPdfDragging] = useState(false);
  const pdfFormRef = useRef<HTMLFormElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const submitPdfFile = useCallback((file: File) => {
    const okType =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");
    if (!okType) {
      toast.error("Velg en PDF-fil.");
      return;
    }
    const input = pdfInputRef.current;
    const form = pdfFormRef.current;
    if (!input || !form) return;
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    form.requestSubmit();
  }, []);

  useEffect(() => {
    if (!parseState) return;
    if (parseState.ok) {
      setRows(parseState.rows);
      setTextPreview(parseState.textPreview);
      toast.success(
        `Fant ${parseState.rows.length} rad${parseState.rows.length === 1 ? "" : "er"}. Gå gjennom før import.`,
      );
    } else {
      toast.error(parseState.error);
    }
  }, [parseState]);

  const runPasteParse = useCallback(() => {
    startPasteTransition(async () => {
      const r = await parseCrewListPastedText(pasteText);
      if (r.ok) {
        setRows(r.rows);
        setTextPreview(r.textPreview);
        toast.success(
          `Fant ${r.rows.length} rad${r.rows.length === 1 ? "" : "er"}. Gå gjennom før import.`,
        );
      } else {
        toast.error(r.error);
      }
    });
  }, [pasteText]);

  const updateRow = useCallback(
    (id: string, patch: Partial<CrewImportDraftRow>) => {
      setRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...patch } : r)),
      );
    },
    [],
  );

  const toggleAll = useCallback((checked: boolean) => {
    setRows((prev) => prev.map((r) => ({ ...r, selected: checked })));
  }, []);

  const selectedCount = rows.filter((r) => r.selected).length;

  const runImport = useCallback(() => {
    startImportTransition(async () => {
      const payload = rows.map((r) => ({
        firstName: r.firstName ?? "",
        lastName: r.lastName ?? "",
        email: r.email ?? "",
        phone: r.phone ?? "",
        roles: r.roles ?? "",
        selected: Boolean(r.selected),
      }));
      const res = await batchImportCrewListRows(payload);
      if (res.errors.length) {
        for (const e of res.errors.slice(0, 5)) toast.error(e);
        if (res.errors.length > 5) {
          toast.error(`… og ${res.errors.length - 5} flere feil.`);
        }
      }
      if (res.created > 0) {
        toast.success(
          `Opprettet ${res.created} person${res.created === 1 ? "" : "er"}.` +
            (res.skippedDuplicates
              ? ` Hoppet over ${res.skippedDuplicates} duplikat(er).`
              : ""),
        );
        router.push("/crew");
        router.refresh();
      } else if (!res.errors.length) {
        toast.message(
          res.skippedDuplicates
            ? `Alle valgte var allerede i databasen (${res.skippedDuplicates} duplikat).`
            : "Ingen rader å importere (ingen avkrysset eller tomme).",
        );
      }
    });
  }, [rows, router]);

  const tableShell =
    "w-full min-w-[640px] border-collapse border border-border text-sm";

  return (
    <div className="space-y-10">
      <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <h2 className="text-base font-semibold text-foreground">
          1. Hent tekst fra PDF eller lim inn
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          PDF-er med innlimt tekst (ikke bare skannede bilder) fungerer best. I
          «CREW INFO» (dagsplan) hentes avdelingstype, navn og mobilnummer — ikke
          e-post. Tabulator-rader tolkes som stabsliste: kolonne 1 = funksjon, kolonne 2
          = navn (første ord fornavn, resten etternavn), deretter telefon og e-post. Du
          kan også lime inn fra Excel eller Notater.
        </p>

        <div className="mt-6 grid gap-8 lg:grid-cols-2">
          <div className="space-y-3">
            <Label htmlFor="pdf-upload-input">Last opp PDF</Label>
            <form ref={pdfFormRef} action={parseAction} className="space-y-2">
              <input
                ref={pdfInputRef}
                id="pdf-upload-input"
                name="pdf"
                type="file"
                accept="application/pdf,.pdf"
                disabled={parsePending}
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) e.currentTarget.form?.requestSubmit();
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                disabled={parsePending}
                aria-label="Last opp PDF — dra og slipp eller klikk for å velge fil"
                onClick={() => pdfInputRef.current?.click()}
                onDragEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setPdfDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setPdfDragging(false);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.dataTransfer.dropEffect = "copy";
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setPdfDragging(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) submitPdfFile(f);
                }}
                className={cn(
                  "flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors",
                  parsePending
                    ? "cursor-not-allowed opacity-60"
                    : "cursor-pointer hover:bg-muted/50",
                  pdfDragging
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border bg-muted/20 text-muted-foreground",
                )}
              >
                <span className="pointer-events-none flex flex-col items-center gap-2">
                  <Upload
                    className={cn(
                      "size-8 shrink-0",
                      pdfDragging ? "text-primary" : "text-muted-foreground",
                    )}
                    aria-hidden
                  />
                  <span className="text-sm font-medium text-foreground">
                    {parsePending
                      ? "Leser PDF…"
                      : pdfDragging
                        ? "Slipp PDF her"
                        : "Dra og slipp PDF her"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    eller klikk for å velge fil · maks ca. 5 MB
                  </span>
                </span>
              </button>
              <p className="text-xs text-muted-foreground">
                Filen sendes til serveren og teksten trekkes ut der.
              </p>
            </form>
          </div>

          <div className="space-y-3">
            <Label htmlFor="paste">Lim inn tekst</Label>
            <Textarea
              id="paste"
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Lim inn rader fra crewliste…"
              rows={6}
              disabled={pastePending}
              className="font-mono text-xs"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={pastePending || !pasteText.trim()}
              onClick={runPasteParse}
            >
              {pastePending ? "Tolker…" : "Tolker limt tekst"}
            </Button>
          </div>
        </div>
      </section>

      {rows.length > 0 ? (
        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                2. Gå gjennom og importer
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {rows.length} rad(er). Kryss av hvem som skal opprettes. Duplikater
                (samme e-post eller fullt navn som finnes) hoppes over automatisk.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="select-all"
                  checked={rows.length > 0 && rows.every((r) => r.selected)}
                  onCheckedChange={(v) => toggleAll(v === true)}
                />
                <Label htmlFor="select-all" className="text-sm font-normal">
                  Velg alle
                </Label>
              </div>
              <Button
                type="button"
                disabled={importPending || selectedCount === 0}
                onClick={runImport}
              >
                {importPending
                  ? "Importerer…"
                  : `Importer ${selectedCount} person${selectedCount === 1 ? "" : "er"}`}
              </Button>
            </div>
          </div>

          <ScrollArea className="h-[min(60vh,520px)] rounded-md border border-border">
            <table className={cn(tableShell, "bg-card")}>
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <th className="w-10 border-r border-border px-2 py-2"> </th>
                  <th className="min-w-[120px] border-r border-border px-2 py-2">
                    Fornavn
                  </th>
                  <th className="min-w-[120px] border-r border-border px-2 py-2">
                    Etternavn
                  </th>
                  <th className="min-w-[160px] border-r border-border px-2 py-2">
                    E-post
                  </th>
                  <th className="min-w-[120px] border-r border-border px-2 py-2">
                    Telefon
                  </th>
                  <th className="min-w-[140px] border-r border-border px-2 py-2">
                    Roller
                  </th>
                  <th className="min-w-[140px] px-2 py-2">Varsel</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-border align-top hover:bg-muted/20"
                  >
                    <td className="border-r border-border px-2 py-1.5">
                      <Checkbox
                        checked={row.selected}
                        onCheckedChange={(v) =>
                          updateRow(row.id, { selected: v === true })
                        }
                      />
                    </td>
                    <td className="border-r border-border p-1">
                      <Input
                        className="h-8 min-w-[100px] border-0 bg-transparent px-1 text-sm shadow-none focus-visible:ring-1"
                        value={row.firstName}
                        onChange={(e) =>
                          updateRow(row.id, { firstName: e.target.value })
                        }
                      />
                    </td>
                    <td className="border-r border-border p-1">
                      <Input
                        className="h-8 min-w-[100px] border-0 bg-transparent px-1 text-sm shadow-none focus-visible:ring-1"
                        value={row.lastName}
                        onChange={(e) =>
                          updateRow(row.id, { lastName: e.target.value })
                        }
                      />
                    </td>
                    <td className="border-r border-border p-1">
                      <Input
                        className="h-8 min-w-[140px] border-0 bg-transparent px-1 text-sm shadow-none focus-visible:ring-1"
                        value={row.email}
                        onChange={(e) =>
                          updateRow(row.id, { email: e.target.value })
                        }
                      />
                    </td>
                    <td className="border-r border-border p-1">
                      <Input
                        className="h-8 min-w-[100px] border-0 bg-transparent px-1 text-sm shadow-none focus-visible:ring-1"
                        value={row.phone}
                        onChange={(e) =>
                          updateRow(row.id, { phone: e.target.value })
                        }
                      />
                    </td>
                    <td className="border-r border-border p-1">
                      <Input
                        className="h-8 min-w-[120px] border-0 bg-transparent px-1 text-sm shadow-none focus-visible:ring-1"
                        value={row.roles}
                        onChange={(e) =>
                          updateRow(row.id, { roles: e.target.value })
                        }
                      />
                    </td>
                    <td className="p-1 align-middle">
                      {row.warnings.length ? (
                        <span className="text-[10px] leading-snug text-amber-800">
                          {row.warnings.join(" ")}
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>

          {textPreview ? (
            <details className="rounded-md border border-border bg-muted/20 p-3 text-xs">
              <summary className="cursor-pointer font-medium text-foreground">
                Forhåndsvisning av uttrekket tekst (første del)
              </summary>
              <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap font-mono text-muted-foreground">
                {textPreview}
              </pre>
            </details>
          ) : null}
        </section>
      ) : null}

      <div className="flex gap-3">
        <Button variant="outline" asChild>
          <Link href="/crew">Tilbake til crew</Link>
        </Button>
      </div>
    </div>
  );
}
