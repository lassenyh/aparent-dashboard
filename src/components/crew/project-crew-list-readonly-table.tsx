import { cn } from "@/lib/utils";
import type { CrewListSharePayload } from "@/lib/crew-list-share-payload";

const th =
  "border border-neutral-300 bg-neutral-100 px-2.5 py-2 text-left text-[9px] font-semibold uppercase tracking-[0.08em] text-neutral-600 print:px-2 print:py-1.5 print:text-[8px]";

const td =
  "border border-neutral-300 px-2.5 py-2 align-top text-[11px] leading-snug text-neutral-900 print:px-2 print:py-1.5 print:text-[10px]";

const tableShell =
  "w-full table-fixed border-collapse border border-neutral-300 text-neutral-900";

export function ProjectCrewListReadonlyTable({
  rows,
}: {
  rows: CrewListSharePayload["rows"];
}) {
  const showDietaryColumn = rows.some((r) => r.dietaryAllergiesLine);
  const colCount = showDietaryColumn ? 5 : 4;

  return (
    <div className="overflow-x-auto">
      <table className={tableShell}>
        <colgroup>
          {showDietaryColumn ? (
            <>
              <col className="w-[18%]" />
              <col className="w-[20%]" />
              <col className="w-[18%]" />
              <col className="w-[14%]" />
              <col className="w-[30%]" />
            </>
          ) : (
            <>
              <col className="w-[22%]" />
              <col className="w-[26%]" />
              <col className="w-[18%]" />
              <col className="w-[34%]" />
            </>
          )}
        </colgroup>
        <thead>
          <tr>
            <th className={th}>Funksjon</th>
            <th className={th}>Navn</th>
            {showDietaryColumn ? (
              <th className={th}>Kosthold / allergier</th>
            ) : null}
            <th className={th}>Mobil</th>
            <th className={th}>E-post</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={colCount}
                className={cn(td, "py-8 text-center text-neutral-500")}
              >
                Ingen personer i standard crewliste ennå.
              </td>
            </tr>
          ) : null}
          {rows.map((row) => (
            <tr key={row.id} className="break-inside-avoid">
              <td className={td}>{row.role}</td>
              <td className={cn(td, "font-medium text-neutral-950")}>
                {row.fullName}
              </td>
              {showDietaryColumn ? (
                <td className={cn(td, "text-neutral-800")}>
                  {row.dietaryAllergiesLine ?? "—"}
                </td>
              ) : null}
              <td className={cn(td, "tabular-nums")}>{row.phone}</td>
              <td className={cn(td, "break-all")}>{row.email}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
