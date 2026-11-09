import { CrewLiveFilterForm } from "@/components/crew/crew-live-filter-form";
import Link from "next/link";
import { CheckCircle2, Plus } from "lucide-react";
import {
  deletePerson,
  getCrewList,
  getCrewFilterOptions,
  type CrewListParams,
} from "@/actions/crew";
import { ConfirmDeleteListItem } from "@/components/confirm-delete-list-item";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CrewSearchInput } from "@/components/crew/crew-search-input";
import { Label } from "@/components/ui/label";
import { formatRate } from "@/lib/utils";
import { rolesLabel } from "@/lib/person";
import { dietaryLabel } from "@/lib/dietary";
import { nativeSelectClassName } from "@/lib/form-classes";
import { requireInternalUser } from "@/lib/project-access";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CrewPage({ searchParams }: PageProps) {
  await requireInternalUser();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const role = typeof sp.role === "string" ? sp.role : "";
  const city = typeof sp.city === "string" ? sp.city : "";
  const active = (typeof sp.active === "string" ? sp.active : "all") as
    | "all"
    | "active"
    | "inactive";
  const sort = (typeof sp.sort === "string" ? sp.sort : "name") as
    | "lastUsed"
    | "name";

  const params: CrewListParams = {
    q,
    role: role || undefined,
    city: city || undefined,
    active,
    sort,
  };

  const [people, filterOptions] = await Promise.all([
    getCrewList(params),
    getCrewFilterOptions(),
  ]);

  const createdId = typeof sp.created === "string" ? sp.created : undefined;
  const updatedId = typeof sp.updated === "string" ? sp.updated : undefined;
  const savedPerson = people.find((person) => person.id === (createdId ?? updatedId));
  const displayedPeople = savedPerson
    ? [savedPerson, ...people.filter((person) => person.id !== savedPerson.id)]
    : people;

  const crewListReturnTo = (() => {
    const qs = new URLSearchParams();
    if (q) qs.set("q", q);
    if (role) qs.set("role", role);
    if (city) qs.set("city", city);
    if (active !== "all") qs.set("active", active);
    if (sort !== "name") qs.set("sort", sort);
    const s = qs.toString();
    return s ? `/desk/crew?${s}` : "/desk/crew";
  })();

  return (
    <>
      <PageHeader
        title="Crew-database"
        description="Søk og gjenbruk folk på tvers av prosjekter. Én profil per person."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href="/desk/crew/import">Importer fra PDF/tekst</Link>
            </Button>
            <Button variant="sidebar" asChild>
              <Link href="/desk/crew/new">
                <Plus className="h-4 w-4" />
                Ny person
              </Link>
            </Button>
          </div>
        }
      />

      {savedPerson ? (
        <div role="status" className="mb-6 flex flex-wrap items-center justify-between gap-4 border border-border border-l-4 border-l-emerald-600 bg-emerald-50/50 p-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 aria-hidden="true" className="h-5 w-5 shrink-0 text-emerald-700" />
            <div>
              <p className="font-medium">{createdId ? `${savedPerson.fullName} er opprettet` : `Endringene for ${savedPerson.fullName} er lagret`}</p>
              <p className="mt-1 text-sm text-muted-foreground">{createdId ? "Personen er lagt til i crewregisteret og vises øverst i listen." : "Profilen er oppdatert og vises øverst i listen."}</p>
            </div>
          </div>
        </div>
      ) : null}

      <CrewLiveFilterForm>
        <div className="flex min-w-[200px] flex-1 flex-col gap-2">
          <Label htmlFor="q">Søk</Label>
          <CrewSearchInput defaultValue={q} />
        </div>
        <div className="flex w-full min-w-[140px] flex-col gap-2 sm:w-auto">
          <Label htmlFor="role">Rolle</Label>
          <select
            id="role"
            name="role"
            defaultValue={role || ""}
            className={nativeSelectClassName}
          >
            <option value="">Alle roller</option>
            {filterOptions.roles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div className="flex w-full min-w-[140px] flex-col gap-2 sm:w-auto">
          <Label htmlFor="city">By</Label>
          <select
            id="city"
            name="city"
            defaultValue={city || ""}
            className={nativeSelectClassName}
          >
            <option value="">Alle byer</option>
            {filterOptions.cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="flex w-full min-w-[140px] flex-col gap-2 sm:w-auto">
          <Label htmlFor="active">Status</Label>
          <select
            id="active"
            name="active"
            defaultValue={active}
            className={nativeSelectClassName}
          >
            <option value="all">Alle</option>
            <option value="active">Aktive</option>
            <option value="inactive">Inaktive</option>
          </select>
        </div>
        <div className="flex w-full min-w-[140px] flex-col gap-2 sm:w-auto">
          <Label htmlFor="sort">Sorter</Label>
          <select
            id="sort"
            name="sort"
            defaultValue={sort}
            className={nativeSelectClassName}
          >
            <option value="name">Fornavn (A–Å)</option>
            <option value="lastUsed">Sist brukt</option>
          </select>
        </div>
        <div className="flex gap-2">
          <Button type="reset" variant="outline">Nullstill</Button>
        </div>
      </CrewLiveFilterForm>

      <div className="ap-table-wrap">
        {people.length ? (
          <table className="ap-table">
            <thead>
              <tr>
                <th>Navn</th>
                <th>Kontakt</th>
                <th>Sats</th>
                <th className="w-[72px]">
                  <span className="sr-only">Handlinger</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {displayedPeople.map((p) => (
                <tr key={p.id} className={p.id === savedPerson?.id ? "crew-created-highlight" : undefined}>
                  <td>
                    <Link href={`/desk/crew/${p.id}`} className="block py-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{p.fullName}</span>
                        {!p.isActive ? (
                          <Badge variant="secondary">Inaktiv</Badge>
                        ) : null}
                        {p.dietaryPreference !== "none" ? (
                          <Badge variant="outline">
                            {dietaryLabel(p.dietaryPreference)}
                          </Badge>
                        ) : null}
                      </span>
                      <span className="mt-0.5 block text-[12px] text-muted-foreground">
                        {rolesLabel(p)}
                        {p.city ? ` · ${p.city}` : ""}
                      </span>
                    </Link>
                  </td>
                  <td>
                    <span className="ap-code block text-muted-foreground">
                      {p.phone ?? "—"}
                    </span>
                    <span className="ap-code block text-muted-foreground">
                      {p.email ?? "—"}
                    </span>
                  </td>
                  <td>
                    <span className="ap-amount">
                      {formatRate(p.defaultRate, p.rateType)}
                    </span>
                  </td>
                  <td>
                    <div className="no-print">
                      <ConfirmDeleteListItem
                        title="Slette person?"
                        description={`«${p.fullName}» slettes permanent og kan ikke angres.`}
                        formAction={deletePerson.bind(null, p.id)}
                        hiddenFields={
                          <input
                            type="hidden"
                            name="returnTo"
                            value={crewListReturnTo}
                          />
                        }
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="px-4 py-8 text-center text-[13px] text-muted-foreground">
            Ingen treff. Juster filtre eller legg til en ny person.
          </p>
        )}
      </div>
    </>
  );
}
