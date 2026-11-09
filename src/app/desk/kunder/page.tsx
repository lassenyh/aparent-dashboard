import Link from "next/link";
import { getCustomersList } from "@/actions/customers";
import { PublicLogoImg } from "@/components/public-logo-img";
import { PageHeader } from "@/components/page-header";
import { sanitizePublicImageUrl } from "@/lib/img-url";
import { Button } from "@/components/ui/button";
import { requireInternalUser } from "@/lib/project-access";

export default async function CustomersPage() {
  await requireInternalUser();
  const customers = await getCustomersList();

  return (
    <>
      <PageHeader
        title="Kunder"
        description="Kundenavn og logo på prosjekter og call sheet PDF."
        actions={
          <Button variant="sidebar" asChild>
            <Link href="/desk/kunder/new">Ny kunde</Link>
          </Button>
        }
      />

      <div className="ap-table-wrap">
        {customers.length ? (
          <table className="ap-table">
            <thead>
              <tr>
                <th>Kunde</th>
                <th>Prosjekter</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link
                      href={`/desk/kunder/${c.id}`}
                      className="flex min-w-0 items-center gap-4 py-1"
                    >
                      {sanitizePublicImageUrl(c.logoUrl) ? (
                        <PublicLogoImg
                          src={c.logoUrl}
                          alt=""
                          className="h-8 w-24 shrink-0 object-contain object-left"
                        />
                      ) : null}
                      <span className="font-medium">{c.name}</span>
                    </Link>
                  </td>
                  <td>
                    <span className="ap-code text-muted-foreground">
                      {c._count.projects}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="px-4 py-8 text-[13px] text-muted-foreground">
            Ingen kunder ennå. Opprett den første.
          </p>
        )}
      </div>
    </>
  );
}
