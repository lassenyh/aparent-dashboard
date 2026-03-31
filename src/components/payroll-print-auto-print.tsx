"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

/** Åpner utskriftsvinduet når URL har `?autoPrint=1` (Lagre som PDF i nettleseren). */
export function PayrollPrintAutoPrint() {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("autoPrint") !== "1") return;
    const t = window.setTimeout(() => window.print(), 400);
    return () => window.clearTimeout(t);
  }, [searchParams]);

  return null;
}
