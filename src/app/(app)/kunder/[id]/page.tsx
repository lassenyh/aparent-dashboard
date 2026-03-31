import { notFound } from "next/navigation";
import { deleteCustomer, getCustomerById } from "@/actions/customers";
import { PageHeader } from "@/components/page-header";
import { PageBackLink } from "@/components/page-back-link";
import { CustomerEditForm } from "@/components/forms/customer-edit-form";
import { Button } from "@/components/ui/button";

type PageProps = { params: Promise<{ id: string }> };

export default async function CustomerDetailPage({ params }: PageProps) {
  const { id } = await params;
  const customer = await getCustomerById(id);
  if (!customer) notFound();

  return (
    <>
      <div className="mb-6">
        <PageBackLink href="/kunder">Kunder</PageBackLink>
      </div>
      <PageHeader
        title={customer.name}
        description={`${customer._count.projects} prosjekt`}
      />
      <CustomerEditForm customer={customer} />
      <form
        action={deleteCustomer.bind(null, customer.id)}
        className="mt-10 max-w-lg border-t border-border pt-8"
      >
        <p className="mb-3 text-sm text-muted-foreground">
          Sletter kunden. Prosjekter beholder data, men mister kobling til
          kunde.
        </p>
        <Button type="submit" variant="destructive" size="sm">
          Slett kunde
        </Button>
      </form>
    </>
  );
}
