import { AparentLogo } from "@/components/aparent-logo";
import type { CrewListSharePayload } from "@/lib/crew-list-share-payload";

export function ProjectCrewListWeb({ data }: { data: CrewListSharePayload }) {
  const showDietary = data.rows.some((row) => row.dietaryAllergiesLine);
  const columns = showDietary
    ? "lg:grid-cols-[1fr_1.3fr_1fr_1.5fr_1fr]"
    : "lg:grid-cols-[1fr_1.3fr_1fr_1.5fr]";

  return <section aria-label="Crewliste" className="border border-border bg-card">
    <header className="flex flex-wrap items-start justify-between gap-6 border-b border-border p-5 sm:p-8">
      <div className="min-w-0">
        <p className="ap-kicker mb-2">{data.project.internalTitle ? `Prosjekt ${data.project.internalTitle}` : "Prosjekt"}</p>
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{[data.project.customerName, data.project.name].filter(Boolean).join(" · ")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{data.rows.length} {data.rows.length === 1 ? "person" : "personer"}</p>
      </div>
      <AparentLogo className="w-[120px] shrink-0 object-right" />
    </header>
    <div className={`hidden gap-4 border-b border-border bg-muted/30 px-8 py-3 lg:grid ${columns}`} aria-hidden="true">
      {["Funksjon", "Navn", "Mobil", "E-post", ...(showDietary ? ["Kosthold / allergier"] : [])].map((label) => <span key={label} className="ap-kicker">{label}</span>)}
    </div>
    <div className="divide-y divide-border">
      {data.rows.map((row) => <article key={row.id} aria-label={row.fullName} className={`grid gap-3 p-5 sm:px-8 lg:items-baseline lg:gap-4 lg:py-5 ${columns}`}>
        <p className="text-sm text-muted-foreground">{row.role}</p>
        <h3 className="font-medium">{row.fullName}</h3>
        <div className="min-w-0 text-sm">
          {row.phone !== "—" ? <a href={`tel:${row.phone.replace(/[^+\d]/g, "")}`} className="underline-offset-4 hover:underline">{row.phone}</a> : <span className="text-muted-foreground">—</span>}
        </div>
        <div className="min-w-0 break-words text-sm">
          {row.email !== "—" ? <a href={`mailto:${row.email}`} className="underline-offset-4 hover:underline">{row.email}</a> : <span className="text-muted-foreground">—</span>}
        </div>
        {showDietary ? <p className="text-sm text-muted-foreground"><span className="mr-2 lg:hidden">Kosthold / allergier:</span>{row.dietaryAllergiesLine ?? "—"}</p> : null}
      </article>)}
      {data.rows.length === 0 ? <p className="p-8 text-sm text-muted-foreground">Ingen personer i crewlisten ennå.</p> : null}
    </div>
  </section>;
}
