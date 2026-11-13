"use client";

import dynamic from "next/dynamic";

/** Rendres kun i nettleseren, slik at redigert mailtekst (localStorage) kan leses ved første render. */
export const OppgjorMailBuilderLoader = dynamic(
  () => import("@/components/oppgjor/oppgjor-mail-builder").then((m) => m.OppgjorMailBuilder),
  {
    ssr: false,
    loading: () => <div className="h-96 animate-pulse border border-border bg-muted/30" aria-busy="true" />,
  },
);
