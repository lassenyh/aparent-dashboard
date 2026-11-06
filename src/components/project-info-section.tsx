"use client";

import { useCallback, useState } from "react";
import { ProjectEditForm } from "@/components/forms/project-edit-form";
import { Button } from "@/components/ui/button";
import { PublicLogoImg } from "@/components/public-logo-img";
import { Pencil } from "lucide-react";
import type { ProjectFormClient } from "@/lib/serialize";
import { formatDateShort } from "@/lib/utils";

import type { LeadPerson, ProjectLeads } from "@/lib/project-leads";

type Opt = { id: string; name: string };

function infoCard(label: string, value: string) {
  return (
    <div className="min-w-0">
      <p className="ap-kicker">
        {label}
      </p>
      <p className="mt-1 text-[13px] text-foreground">{value}</p>
    </div>
  );
}

function ProjectInfoStatic({
  project,
  customerName,
  customerLogoUrl,
  agencyName,
  leads,
  onEdit,
}: {
  project: ProjectFormClient;
  customerName: string | null;
  customerLogoUrl?: string | null;
  agencyName: string | null;
  leads: ProjectLeads;
  onEdit?: () => void;
}) {
  const period =
    project.startDate || project.endDate
      ? [
          project.startDate ? formatDateShort(project.startDate) : "—",
          project.endDate ? formatDateShort(project.endDate) : "—",
        ].join(" – ")
      : "—";

  const internal = project.internalTitle?.trim() || "—";

  return (
    <div className="max-w-3xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <h2 className="ap-section-title">
          {project.name}
        </h2>
        {onEdit ? (
          <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={onEdit}>
            <Pencil className="size-3.5" aria-hidden="true" />
            Rediger
          </Button>
        ) : null}
      </div>

      <div className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2">
        <div className="flex min-w-0 items-center gap-3">
          {customerLogoUrl ? (
            <PublicLogoImg
              src={customerLogoUrl}
              alt=""
              className="h-14 w-20 shrink-0 border border-border bg-background object-contain p-2"
            />
          ) : null}
          {infoCard("Kunde", customerName ?? "—")}
        </div>
        {infoCard("Byrå", agencyName ?? "—")}
        {infoCard("Prosjektnummer", internal)}
        {infoCard("Periode", period)}
        {infoCard("Produsent", leads.producerName)}
        {infoCard("Regissør", leads.directorName)}
      </div>
    </div>
  );
}

export function ProjectInfoSection({
  project,
  customerName,
  customerLogoUrl,
  agencyName,
  leads,
  canEdit,
  canEditLeads = false,
  agencies,
  customers,
  people,
}: {
  project: ProjectFormClient;
  customerName: string | null;
  customerLogoUrl?: string | null;
  agencyName: string | null;
  leads: ProjectLeads;
  canEdit: boolean;
  canEditLeads?: boolean;
  agencies: Opt[];
  customers: Opt[];
  people: LeadPerson[];
}) {
  const [editing, setEditing] = useState(false);
  const [formKey, setFormKey] = useState(0);

  const onSaved = useCallback(() => {
    setEditing(false);
  }, []);

  if (!canEdit) {
    return (
      <ProjectInfoStatic
        project={project}
        customerName={customerName}
        customerLogoUrl={customerLogoUrl}
        agencyName={agencyName}
        leads={leads}
      />
    );
  }

  return (
    <div className="space-y-3">
      {!editing ? (
        <ProjectInfoStatic
          project={project}
          customerName={customerName}
          customerLogoUrl={customerLogoUrl}
          agencyName={agencyName}
          leads={leads}
          onEdit={() => {
            setFormKey((k) => k + 1);
            setEditing(true);
          }}
        />
      ) : (
        <ProjectEditForm
          key={formKey}
          canEditLeads={canEditLeads}
          project={project}
          agencies={agencies}
          customers={customers}
          people={people}
          leads={leads}
          onSuccess={onSaved}
          onCancel={() => setEditing(false)}
        />
      )}
    </div>
  );
}
