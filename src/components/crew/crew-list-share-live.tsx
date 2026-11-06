"use client";

import Link from "next/link";
import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectCrewListWeb } from "@/components/crew/project-crew-list-web";
import { Suspense } from "react";
import type { CrewListSharePayload } from "@/lib/crew-list-share-payload";
import { PayrollPrintAutoPrint } from "@/components/payroll-print-auto-print";
import { PrintToolbar } from "@/components/print-toolbar";
import { ProjectCrewListDocument } from "@/components/crew/project-crew-list-document";

/** Viser snapshot fra server ved lasting; ingen bakgrunnsoppdatering (oppdater siden for nyeste data). */
export function CrewListShareLive({ initial, pdf = false }: { initial: CrewListSharePayload; pdf?: boolean }) {
  const data = initial;

  if (!pdf) return <main className="min-h-screen bg-background px-4 py-8 sm:px-8 sm:py-12">
    <div className="mx-auto max-w-6xl">
      <header className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Crewliste</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sist oppdatert: <time dateTime={data.crewListUpdatedAt}>{new Intl.DateTimeFormat("nb-NO", {
              dateStyle: "medium",
              timeStyle: "short",
              timeZone: "Europe/Oslo",
            }).format(new Date(data.crewListUpdatedAt))}</time>
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="?format=pdf&autoPrint=1" target="_blank" rel="noopener noreferrer"><FileDown className="h-4 w-4" />Last ned</Link>
        </Button>
      </header>
      <ProjectCrewListWeb data={data} />
    </div>
  </main>;

  return (
    <div className="mx-auto max-w-[210mm] bg-white px-6 py-10 text-neutral-900 antialiased print:max-w-none print:px-8 print:py-6">
      <Suspense fallback={null}>
        <PayrollPrintAutoPrint />
      </Suspense>

      <PrintToolbar />

      <ProjectCrewListDocument data={data} />
    </div>
  );
}
