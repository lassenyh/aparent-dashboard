"use client";

import dynamic from "next/dynamic";

/** Rendres kun i nettleseren, slik at lagret utkast (localStorage) kan leses ved første render. */
export const BefaringMailBuilderLoader = dynamic(
  () => import("@/components/befaring/befaring-mail-builder").then((m) => m.BefaringMailBuilder),
  {
    ssr: false,
    loading: () => <div className="h-96 animate-pulse border border-border bg-muted/30" aria-busy="true" />,
  },
);
