import { notFound } from "next/navigation";
import { getCallSheetById } from "@/actions/callsheets";
import { FEATURE_CALL_SHEETS_UI } from "@/lib/feature-flags";
import { PrintToolbar } from "@/components/print-toolbar";
import { formatDate, formatRate } from "@/lib/utils";
import { dietaryLabel } from "@/lib/dietary";

type PageProps = { params: Promise<{ id: string }> };

export default async function CallSheetPrintPage({ params }: PageProps) {
  if (!FEATURE_CALL_SHEETS_UI) notFound();
  const { id } = await params;
  const sheet = await getCallSheetById(id);
  if (!sheet) notFound();

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 print:max-w-none print:px-8 print:py-6">
      <PrintToolbar backHref={`/callsheets/${sheet.id}`} />

      <header className="mb-10 border-b border-neutral-200 pb-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="flex min-w-0 flex-wrap items-end gap-8">
            {sheet.project.customer?.logoUrl ? (
              <div className="space-y-1">
                <p className="text-[10px] font-medium uppercase tracking-wider text-neutral-500">
                  Kunde
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={sheet.project.customer.logoUrl}
                  alt=""
                  className="h-10 max-w-[180px] object-contain object-left"
                />
              </div>
            ) : null}
            {sheet.project.agency?.logoUrl ? (
              <div className="space-y-1">
                <p className="text-[10px] font-medium uppercase tracking-wider text-neutral-500">
                  Byrå
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={sheet.project.agency.logoUrl}
                  alt=""
                  className="h-10 max-w-[180px] object-contain object-left"
                />
              </div>
            ) : null}
          </div>
          {sheet.project.agency?.orgNumber ? (
            <p className="text-xs text-neutral-500">
              Org.nr {sheet.project.agency.orgNumber}
            </p>
          ) : null}
        </div>

        <p className="mt-6 text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">
          {sheet.project.name}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900 print:text-2xl">
          {sheet.name}
        </h1>
        <div className="mt-4 flex flex-wrap gap-6 text-sm text-neutral-600">
          <span>{formatDate(sheet.date)}</span>
          {sheet.location ? <span>{sheet.location}</span> : null}
          {sheet.generalCallTime ? (
            <span>Generell call {sheet.generalCallTime}</span>
          ) : null}
        </div>
        {sheet.notes ? (
          <p className="mt-6 max-w-2xl text-sm leading-relaxed text-neutral-700">
            {sheet.notes}
          </p>
        ) : null}
      </header>

      <section>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Crew
        </h2>
        <div className="overflow-x-auto rounded-xl border border-neutral-200 print:border-neutral-300">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50/80 print:bg-white">
                <th className="whitespace-nowrap px-4 py-3 font-medium text-neutral-700">
                  Call
                </th>
                <th className="px-4 py-3 font-medium text-neutral-700">Navn</th>
                <th className="px-4 py-3 font-medium text-neutral-700">Rolle</th>
                <th className="px-4 py-3 font-medium text-neutral-700">Telefon</th>
                <th className="px-4 py-3 font-medium text-neutral-700">Pickup</th>
                <th className="px-4 py-3 font-medium text-neutral-700">Notat</th>
              </tr>
            </thead>
            <tbody>
              {sheet.crew.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-neutral-100 last:border-0"
                >
                  <td className="whitespace-nowrap px-4 py-3 text-neutral-800">
                    {row.callTime ?? sheet.generalCallTime ?? "—"}
                  </td>
                  <td className="px-4 py-3 font-medium text-neutral-900">
                    {row.fullNameSnapshot}
                  </td>
                  <td className="px-4 py-3 text-neutral-800">{row.roleSnapshot}</td>
                  <td className="px-4 py-3 text-neutral-800">
                    {row.phoneSnapshot ?? "—"}
                  </td>
                  <td className="max-w-[140px] px-4 py-3 text-neutral-700">
                    {row.pickupInfo ?? "—"}
                  </td>
                  <td className="max-w-[180px] px-4 py-3 text-neutral-700">
                    {row.notes ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8 rounded-xl border border-dashed border-neutral-200 bg-neutral-50/50 px-4 py-3 text-xs text-neutral-600 print:border-neutral-300">
          <p className="font-medium text-neutral-800">Kosthold & allergier</p>
          <ul className="mt-2 space-y-1">
            {sheet.crew.map((row) => (
              <li key={row.id}>
                <span className="font-medium text-neutral-800">
                  {row.fullNameSnapshot}
                </span>
                {": "}
                {dietaryLabel(row.dietaryPreferenceSnapshot)}
                {row.allergiesSnapshot
                  ? ` · ${row.allergiesSnapshot}`
                  : ""}
                {" · "}
                {formatRate(row.rateSnapshot, row.rateTypeSnapshot)}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <footer className="mt-12 border-t border-neutral-100 pt-6 text-center text-xs text-neutral-400 print:mt-8">
        Aparent Crew · generert {new Date().toLocaleString("nb-NO")}
      </footer>
    </div>
  );
}
