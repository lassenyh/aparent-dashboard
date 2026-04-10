import { notFound } from "next/navigation";
import { getPayrollPageData } from "@/actions/payroll";
import { AparentLogo } from "@/components/aparent-logo";
import { PrintToolbar } from "@/components/print-toolbar";
import { formatNorwegianAddressLine } from "@/lib/address";
import { expandPayrollRowsForDisplay } from "@/lib/payroll-export-display";
import { formatNorwegianMobileFromRaw } from "@/lib/norwegian-mobile";
import { cn, formatDate, formatPayrollProjectLabel } from "@/lib/utils";

type PageProps = {
  params: Promise<{ id: string; listId: string }>;
  searchParams: Promise<{ preview?: string }>;
};

function fmtHonorar(n: number | null) {
  if (n == null || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("nb-NO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

const th =
  "border-b border-neutral-300 bg-neutral-100 px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-neutral-700 print:bg-neutral-100 print:px-1.5 print:py-1.5 print:text-[9px]";

const td =
  "border-b border-neutral-200 px-2 py-2 text-sm text-neutral-900 print:px-1.5 print:py-1.5 print:text-[10px]";

export default async function PayrollPrintPage({
  params,
  searchParams,
}: PageProps) {
  const { id, listId } = await params;
  const sp = await searchParams;
  const maskPreview = sp.preview === "1";
  const data = await getPayrollPageData(id, listId, {
    maskSensitiveForUi: maskPreview,
  });
  if (!data) notFound();

  const projectLine = `${formatPayrollProjectLabel(data.project)}${
    data.submitted ? " · Innsendt" : ""
  }`;

  const displayRows = expandPayrollRowsForDisplay(data.rows);

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-10 print:max-w-none print:px-4 print:py-4">
      <PrintToolbar
        backHref={`/projects/${id}/lonningsliste/${listId}`}
        exportHref={`/api/projects/${id}/lonningsliste/${listId}/pdf`}
        printHint={
          maskPreview
            ? "Forhåndsvisning viser maskert personnr./kontonr. der det gjelder. Bruk «Last ned til datamaskin» for å laste ned PDF med fullt innhold."
            : "«Last ned til datamaskin» laster ned PDF med fullt innhold. Liggende A4 (landskap)."
        }
      />

      {maskPreview ? (
        <p className="no-print mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
          Forhåndsvisning: personnr. og kontonr. er maskert der det gjelder. Bruk
          «Last ned til datamaskin» over for fullt innhold og nedlasting som PDF.
        </p>
      ) : null}

      <header className="mb-8 flex flex-col gap-4 border-b border-neutral-200 pb-6 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-500">
            Lønningsliste
          </p>
          <h1 className="mt-2 text-xl font-semibold leading-snug tracking-tight text-neutral-900 print:text-lg sm:text-2xl">
            {projectLine}
          </h1>
          {data.documentSavedAt ? (
            <p className="mt-3 text-sm text-neutral-600 print:text-xs">
              Dato: {formatDate(data.documentSavedAt)}
            </p>
          ) : null}
        </div>
        <div className="ml-auto flex h-10 w-[148px] shrink-0 justify-end sm:ml-0 sm:h-11 sm:w-[160px] print:h-9 print:w-[140px]">
          <AparentLogo className="h-full w-full max-h-none object-contain object-right" />
        </div>
      </header>

      <div className="overflow-x-auto rounded-lg border border-neutral-200 print:border-neutral-300">
        <table className="w-full min-w-[940px] table-fixed border-collapse text-left print:min-w-0 print:w-full">
          <thead>
            <tr>
              <th className={cn(th, "w-[16%]")}>Navn</th>
              <th className={cn(th, "w-[23%]")}>Adresse</th>
              <th className={th}>Honorar</th>
              <th className={cn(th, "w-16 text-center")}>Inkl. FP</th>
              <th className={th}>Personnr.</th>
              <th className={th}>Kontonr.</th>
              <th className={th}>Mobil</th>
              <th className={cn(th, "w-[18%]")}>E-post</th>
            </tr>
          </thead>
          <tbody>
            {displayRows.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className={cn(td, "py-8 text-center text-neutral-500")}
                >
                  Ingen rader lagret ennå.
                </td>
              </tr>
            ) : null}
            {displayRows.map((item) =>
              item.kind === "banner" ? (
                <tr
                  key={item.id}
                  className="bg-neutral-100/90 print:bg-neutral-100"
                >
                  <td
                    colSpan={8}
                    className="border-b border-neutral-300 px-3 py-2 text-xs font-bold uppercase tracking-wide text-neutral-700"
                  >
                    {item.segment === "crew" ? "Crew" : "Cast"}
                  </td>
                </tr>
              ) : item.row.isSectionHeader ? (
                <tr key={item.row.id} className="bg-sky-50/90 print:bg-sky-50">
                  <td
                    colSpan={8}
                    className="border-b border-neutral-200 px-3 py-2 font-semibold text-neutral-900"
                  >
                    {item.row.sectionTitle?.trim() || "—"}
                  </td>
                </tr>
              ) : (
                <tr key={item.row.id} className="break-inside-avoid">
                  <td className={cn(td, "whitespace-nowrap")}>
                    <span className="block truncate">
                      {item.row.fullName.trim() || "—"}
                    </span>
                  </td>
                  <td className={cn(td, "whitespace-nowrap")}>
                    <span className="block truncate">
                      {formatNorwegianAddressLine({
                        addressLine: item.row.addressLine,
                        postalCode: item.row.postalCode,
                        city: item.row.city,
                        country: item.row.country,
                      }).trim() || "—"}
                    </span>
                  </td>
                  <td className={cn(td, "tabular-nums")}>
                    {fmtHonorar(item.row.honorar)}
                  </td>
                  <td className={cn(td, "text-center")}>
                    {item.row.includesHolidayPay ? "Ja" : "Nei"}
                  </td>
                  <td className={td}>{item.row.nationalId?.trim() || "—"}</td>
                  <td className={td}>{item.row.bankAccount?.trim() || "—"}</td>
                  <td className={td}>
                    {formatNorwegianMobileFromRaw(item.row.mobile) ??
                      item.row.mobile?.trim() ??
                      "—"}
                  </td>
                  <td className={cn(td, "whitespace-nowrap")}>
                    <span className="block truncate">
                      {item.row.email?.trim() || "—"}
                    </span>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
