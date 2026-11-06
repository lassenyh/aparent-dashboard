"use client";

import { useOptimistic } from "react";
import { ProjectCrewPicker } from "@/components/project-crew-picker";
import { ProjectCrewList } from "@/components/project-crew-list";
import { primaryRole } from "@/lib/person";
import type { PersonClient, ProjectCrewRowClient } from "@/lib/serialize";
import { cn, formatRate } from "@/lib/utils";

/** Midlertidige rader (før serveren har svart) har id med dette prefikset. */
export const OPTIMISTIC_ROW_PREFIX = "optimistic-";

type CrewAction =
  | { type: "add"; row: ProjectCrewRowClient }
  | { type: "remove"; id: string };

function optimisticRowFromPerson(person: PersonClient): ProjectCrewRowClient {
  return {
    id: `${OPTIMISTIC_ROW_PREFIX}${person.id}`,
    roleOverride: null,
    rateOverride: null,
    rateTypeOverride: null,
    notes: null,
    person,
    effectiveRole: primaryRole(person),
    effectiveRateLabel: formatRate(person.defaultRate, person.rateType),
    effectiveRateSource: person.defaultRate != null ? "person" : "none",
    suggestedRolePrimary: primaryRole(person),
  };
}

/**
 * Crew-fanen: velger + liste med optimistisk oppdatering. Personen vises (eller forsvinner)
 * med en gang; når server-handlingen er ferdig, erstattes lista av serverens versjon.
 * Feiler handlingen, rulles endringen automatisk tilbake.
 */
export function ProjectCrewSection({
  projectId,
  rows,
  canAdd,
  canEdit,
  canEditRates,
  canOpenProfile,
}: {
  projectId: string;
  rows: ProjectCrewRowClient[];
  canAdd: boolean;
  canEdit: boolean;
  canEditRates: boolean;
  canOpenProfile: boolean;
}) {
  const [optimisticRows, applyOptimistic] = useOptimistic(
    rows,
    (state, action: CrewAction) =>
      action.type === "add"
        ? [...state, action.row]
        : state.filter((row) => row.id !== action.id),
  );

  return (
    <>
      <div
        className={cn(
          "mb-3 flex flex-wrap items-center gap-2",
          optimisticRows.length > 0 && "border-b border-border pb-3",
        )}
      >
        {canAdd ? (
          <ProjectCrewPicker
            projectId={projectId}
            onOptimisticAdd={(person) =>
              applyOptimistic({ type: "add", row: optimisticRowFromPerson(person) })
            }
          />
        ) : null}
      </div>
      <ProjectCrewList
        canEdit={canEdit}
        canEditRates={canEditRates}
        canOpenProfile={canOpenProfile}
        rows={optimisticRows}
        onOptimisticRemove={(id) => applyOptimistic({ type: "remove", id })}
      />
      {!optimisticRows.length ? (
        <p className="py-4 text-sm text-muted-foreground">
          Ingen crew ennå.
          {canEdit ? " Bruk «Legg til fra database» over." : ""}
        </p>
      ) : null}
    </>
  );
}
