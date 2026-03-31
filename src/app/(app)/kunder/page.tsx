import Link from "next/link";
import { getCustomersList } from "@/actions/customers";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";

export default async function CustomersPage() {
  const customers = await getCustomersList();

  return (
    <>
      <PageHeader
        title="Kunder"
        description="Kundenavn og logo på prosjekter og call sheet PDF."
        actions={
          <Button asChild>
            <Link href="/kunder/new">Ny kunde</Link>
          </Button>
        }
      />

      <div className="divide-y divide-border rounded-md border border-border">
        {customers.map((c) => (
          <Link
            key={c.id}
            href={`/kunder/${c.id}`}
            className="flex min-h-[48px] items-center justify-between gap-4 px-4 py-3 transition-colors first:rounded-t-md last:rounded-b-md hover:bg-muted/40"
          >
            <div className="flex min-w-0 flex-1 items-center gap-4">
              {c.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={c.logoUrl}
                  alt=""
                  className="h-8 w-24 shrink-0 object-contain object-left"
                />
              ) : null}
              <div className="min-w-0">
                <p className="font-semibold text-foreground">{c.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {c._count.projects} prosjekt
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
      {!customers.length ? (
        <p className="py-4 text-sm text-muted-foreground">
          Ingen kunder ennå. Opprett den første.
        </p>
      ) : null}
    </>
  );
}
