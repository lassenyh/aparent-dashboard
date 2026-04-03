"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { ProjectEditForm } from "@/components/forms/project-edit-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ProjectFormClient } from "@/lib/serialize";
import { formatDateShort } from "@/lib/utils";

type Opt = { id: string; name: string };

function infoCard(label: string, value: string) {
  return (
    <div className="rounded-lg border border-border/50 bg-background/90 px-2.5 py-2 shadow-sm ring-1 ring-black/[0.03] dark:ring-white/[0.06]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium leading-tight text-foreground">{value}</p>
    </div>
  );
}

function ProjectInfoStatic({
  project,
  customerName,
  agencyName,
}: {
  project: ProjectFormClient;
  customerName: string | null;
  agencyName: string | null;
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
    <div className="max-w-xl overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-muted/40 via-background to-muted/25 p-3.5 shadow-sm sm:p-4">
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <h2 className="text-balance text-lg font-semibold leading-tight tracking-tight text-foreground sm:text-xl">
          {project.name}
        </h2>
        <Badge
          className="w-fit shrink-0 text-[10px] sm:mt-0"
          variant={project.status === "archived" ? "secondary" : "default"}
        >
          {project.status === "archived" ? "Arkivert" : "Aktiv"}
        </Badge>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 sm:mt-3.5">
        {infoCard("Kunde", customerName ?? "—")}
        {infoCard("Byrå", agencyName ?? "—")}
        {infoCard("Internt navn", internal)}
        {infoCard("Periode", period)}
      </div>
    </div>
  );
}

export function ProjectInfoSection({
  project,
  customerName,
  agencyName,
  canEdit,
  agencies,
  customers,
}: {
  project: ProjectFormClient;
  customerName: string | null;
  agencyName: string | null;
  canEdit: boolean;
  agencies: Opt[];
  customers: Opt[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [formKey, setFormKey] = useState(0);

  const onSaved = useCallback(() => {
    setEditing(false);
    router.refresh();
  }, [router]);

  if (!canEdit) {
    return (
      <ProjectInfoStatic
        project={project}
        customerName={customerName}
        agencyName={agencyName}
      />
    );
  }

  return (
    <div className="space-y-3">
      {!editing ? (
        <>
          <ProjectInfoStatic
            project={project}
            customerName={customerName}
            agencyName={agencyName}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setFormKey((k) => k + 1);
              setEditing(true);
            }}
          >
            Rediger
          </Button>
        </>
      ) : (
        <ProjectEditForm
          key={formKey}
          project={project}
          agencies={agencies}
          customers={customers}
          onSuccess={onSaved}
          onCancel={() => setEditing(false)}
        />
      )}
    </div>
  );
}
