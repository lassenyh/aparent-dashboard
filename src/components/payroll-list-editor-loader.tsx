"use client";

import dynamic from "next/dynamic";
import type { PayrollCrewOption, PayrollRowInput } from "@/components/payroll-list-editor";

export type PayrollListEditorLoaderProps = {
  projectId: string;
  listId: string;
  initialTitle: string;
  initialSubmitted: boolean;
  defaultProjectLabel: string;
  initialRows: PayrollRowInput[];
  crew: PayrollCrewOption[];
};

const PayrollListEditor = dynamic(
  () =>
    import("@/components/payroll-list-editor").then((m) => m.PayrollListEditor),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-lg border border-border bg-muted/20 px-4 py-12 text-center text-sm text-muted-foreground">
        Laster lønningsliste…
      </div>
    ),
  },
);

/** Server henter data; denne laster den tunge editoren kun på klient (unngår SSR-feil mot error.tsx). */
export function PayrollListEditorLoader(props: PayrollListEditorLoaderProps) {
  return <PayrollListEditor {...props} />;
}
