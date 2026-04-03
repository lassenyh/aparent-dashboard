import Link from "next/link";
import { getAgenciesList } from "@/actions/agencies";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { requireInternalUser } from "@/lib/project-access";

export default async function AgenciesPage() {
  await requireInternalUser();
  const agencies = await getAgenciesList();

  return (
    <>
      <PageHeader
        title="Byrå"
        actions={
          <Button variant="sidebar" asChild>
            <Link href="/byra/new">Nytt byrå</Link>
          </Button>
        }
      />

      <div className="divide-y divide-border rounded-md border border-border">
        {agencies.map((a) => (
          <Link
            key={a.id}
            href={`/byra/${a.id}`}
            className="flex min-h-[48px] items-center justify-between gap-4 px-4 py-3 transition-colors first:rounded-t-md last:rounded-b-md hover:bg-muted/40"
          >
            <div className="flex min-w-0 flex-1 items-center gap-4">
              {a.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={a.logoUrl}
                  alt=""
                  className="h-10 w-[72px] shrink-0 rounded-md border border-border bg-background object-contain object-center p-1"
                />
              ) : null}
              <div className="min-w-0">
                <p className="font-semibold text-foreground">{a.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {a.orgNumber ? `Org.nr ${a.orgNumber}` : "—"}
                  {" · "}
                  {a._count.projects} prosjekt
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
      {!agencies.length ? (
        <p className="py-4 text-sm text-muted-foreground">
          Ingen byrå ennå. Opprett det første.
        </p>
      ) : null}
    </>
  );
}
