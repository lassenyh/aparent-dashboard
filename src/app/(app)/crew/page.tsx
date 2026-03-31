import Link from "next/link";
import { Plus } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatRate } from "@/lib/utils";
import { rolesLabel } from "@/lib/person";
import { dietaryLabel } from "@/lib/dietary";
import { nativeSelectClassName } from "@/lib/form-classes";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CrewPage({ searchParams }: PageProps) {
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

  const crewListReturnTo = (() => {
    const qs = new URLSearchParams();
    if (q) qs.set("q", q);
    if (role) qs.set("role", role);
    if (city) qs.set("city", city);
    if (active !== "all") qs.set("active", active);
    if (sort !== "name") qs.set("sort", sort);
    const s = qs.toString();
    return s ? `/crew?${s}` : "/crew";
  })();

  return (
    <>
      <PageHeader
        title="Crew-database"
        description="Søk og gjenbruk folk på tvers av prosjekter. Én profil per person."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href="/crew/import">Importer fra PDF/tekst</Link>
            </Button>
            <Button asChild>
              <Link href="/crew/new">
                <Plus className="h-4 w-4" />
                Ny person
              </Link>
            </Button>
          </div>
        }
      />

      <form
        method="get"
        className="mb-8 flex flex-col gap-4 border-b border-border pb-8 lg:flex-row lg:flex-wrap lg:items-end"
      >
        <div className="flex min-w-[200px] flex-1 flex-col gap-2">
          <Label htmlFor="q" className="text-xs text-muted-foreground">
            Søk
          </Label>
          <Input
            id="q"
            name="q"
            defaultValue={q}
            placeholder="Navn, e-post, telefon, rolle, by…"
          />
        </div>
        <div className="flex w-full min-w-[140px] flex-col gap-2 sm:w-auto">
          <Label htmlFor="role" className="text-xs text-muted-foreground">
            Rolle
          </Label>
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
          <Label htmlFor="city" className="text-xs text-muted-foreground">
            By
          </Label>
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
          <Label htmlFor="active" className="text-xs text-muted-foreground">
            Status
          </Label>
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
          <Label htmlFor="sort" className="text-xs text-muted-foreground">
            Sorter
          </Label>
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
          <Button type="submit">Filtrer</Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/crew">Nullstill</Link>
          </Button>
        </div>
      </form>

      <div className="divide-y divide-border">
        {people.map((p) => (
          <div
            key={p.id}
            className="flex min-h-[56px] items-start gap-2 py-4 first:pt-0 sm:items-center"
          >
            <Link
              href={`/crew/${p.id}`}
              className="flex min-w-0 flex-1 flex-col gap-3 rounded-md px-2 py-1 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between sm:py-2"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-foreground">{p.fullName}</span>
                  {!p.isActive ? (
                    <Badge variant="secondary">Inaktiv</Badge>
                  ) : null}
                  {p.dietaryPreference !== "none" ? (
                    <Badge variant="outline">{dietaryLabel(p.dietaryPreference)}</Badge>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {rolesLabel(p)}
                  {p.city ? ` · ${p.city}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-0.5 text-right text-sm sm:min-w-[200px]">
                <span className="text-muted-foreground">{p.phone ?? "—"}</span>
                <span className="text-muted-foreground">{p.email ?? "—"}</span>
                <span className="font-medium text-foreground">
                  {formatRate(p.defaultRate, p.rateType)}
                </span>
              </div>
            </Link>
            <div className="no-print shrink-0 pt-1 sm:pt-0">
              <ConfirmDeleteListItem
                title="Slette person?"
                description={`«${p.fullName}» slettes permanent og kan ikke angres.`}
                formAction={deletePerson.bind(null, p.id)}
                hiddenFields={
                  <input type="hidden" name="returnTo" value={crewListReturnTo} />
                }
              />
            </div>
          </div>
        ))}
      </div>
      {!people.length ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Ingen treff. Juster filtre eller legg til en ny person.
        </p>
      ) : null}
    </>
  );
}
