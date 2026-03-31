"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 py-16 text-center">
      <h1 className="text-lg font-semibold text-foreground">
        Noe gikk galt ved lasting av siden
      </h1>
      <p className="text-sm text-muted-foreground">
        Ofte skyldes dette at miljøvariabler mangler på serveren (Vercel), eller at
        databasen ikke kan nås. Sjekk at{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-xs">
          DATABASE_URL
        </code>
        ,{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-xs">DIRECT_URL</code>{" "}
        og{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-xs">
          ENCRYPTION_KEY
        </code>{" "}
        er lagt inn under Vercel → Settings → Environment Variables (Production),
        og at du har redeployet etterpå.
      </p>
      <p className="text-sm text-muted-foreground">
        Feilsøk uten innlogging: åpne{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-xs">/api/health</code>{" "}
        på produksjonsdomenet.
      </p>
      <div className="flex justify-center gap-2">
        <Button type="button" variant="default" onClick={() => reset()}>
          Prøv igjen
        </Button>
        <Button type="button" variant="outline" onClick={() => window.location.reload()}>
          Last siden på nytt
        </Button>
      </div>
    </div>
  );
}
