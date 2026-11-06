import Link from "next/link";
import { getAgenciesList } from "@/actions/agencies";
import { PublicLogoImg } from "@/components/public-logo-img";
import { PageHeader } from "@/components/page-header";
import { sanitizePublicImageUrl } from "@/lib/img-url";
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

      <div className="ap-table-wrap">
        {agencies.length ? (
          <table className="ap-table">
            <thead>
              <tr>
                <th>Byrå</th>
                <th>Org.nr</th>
                <th>Prosjekter</th>
              </tr>
            </thead>
            <tbody>
              {agencies.map((a) => (
                <tr key={a.id}>
                  <td>
                    <Link
                      href={`/byra/${a.id}`}
                      className="flex min-w-0 items-center gap-4 py-1"
                    >
                      {sanitizePublicImageUrl(a.logoUrl) ? (
                        <PublicLogoImg
                          src={a.logoUrl}
                          alt=""
                          className="h-10 w-[72px] shrink-0 border border-border bg-background object-contain object-center p-1"
                        />
                      ) : null}
                      <span className="font-medium">{a.name}</span>
                    </Link>
                  </td>
                  <td>
                    <span className="ap-code text-muted-foreground">
                      {a.orgNumber ?? "—"}
                    </span>
                  </td>
                  <td>
                    <span className="ap-code text-muted-foreground">
                      {a._count.projects}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="px-4 py-8 text-[13px] text-muted-foreground">
            Ingen byrå ennå. Opprett det første.
          </p>
        )}
      </div>
    </>
  );
}
