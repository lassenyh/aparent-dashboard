"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

const isDev = process.env.NODE_ENV === "development";

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
        og at du har redeployet etterpå. Etter deploy: kjør{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-xs">
          npx prisma migrate deploy
        </code>{" "}
        mot produksjonsdatabasen hvis tabeller/kolonner mangler.
      </p>
      <p className="text-sm text-muted-foreground">
        Feilsøk uten innlogging: åpne{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-xs">/api/health</code>{" "}
        på produksjonsdomenet         (skal vise{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-xs">
          healthPayloadVersion: 2
        </code>{" "}
        og{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-xs">
          prismaSchema: &quot;ok&quot;
        </code>
        — mangler du disse, er ikke siste deploy aktiv        ). I Vercel → Logs velg{" "}
        <span className="font-medium">Runtime</span> (ikke Build), last inn{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-xs">/api/health</code>{" "}
        og søk etter{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-xs">
          APARENT_HEALTH_OK
        </code>{" "}
        — da vet du at serverlogger vises. Deretter søk etter{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-xs">
          APARENT_PAYROLL
        </code>{" "}
        (f.eks.{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-xs">
          APARENT_PAYROLL_FETCH_FAILED
        </code>{" "}
        ved DB-feil,{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-xs">
          APARENT_PAYROLL_FETCH_OK
        </code>{" "}
        når lasting lykkes). Ser du{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-xs">
          FETCH_OK
        </code>{" "}
        men fortsatt feilside, ligger feilen sannsynligvis i nettleseren — åpne
        utviklerkonsollen (F12) → Console.
      </p>
      {error.digest ? (
        <p className="text-xs text-muted-foreground">
          Referanse (digest):{" "}
          <code className="rounded bg-muted px-1 py-0.5">{error.digest}</code>
        </p>
      ) : null}
      {isDev && error.message ? (
        <pre className="max-h-40 overflow-auto rounded-md border border-border bg-muted/50 p-3 text-left text-xs text-foreground">
          {error.message}
        </pre>
      ) : null}
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
