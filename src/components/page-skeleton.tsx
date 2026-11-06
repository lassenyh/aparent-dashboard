import { cn } from "@/lib/utils";

/** Grå plassholderblokk. Pulserer bare når brukeren ikke har bedt om redusert bevegelse. */
function Bone({ className }: { className?: string }) {
  return <div className={cn("bg-muted motion-safe:animate-pulse", className)} />;
}

/**
 * Lasteskjelett for `loading.tsx`. Speiler sidestrukturen (tilbakelenke, tittel,
 * faner, liste) så navigasjon gir umiddelbar respons uten at innholdet hopper.
 */
export function PageSkeleton({
  backLink = false,
  tabs = 0,
  rows = 6,
}: {
  backLink?: boolean;
  tabs?: number;
  rows?: number;
}) {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Laster…</span>
      {backLink ? <Bone className="mb-6 h-4 w-24" /> : null}
      <header className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="min-w-0 space-y-2">
          <Bone className="h-7 w-64 max-w-full" />
          <Bone className="h-3.5 w-36" />
        </div>
        <Bone className="h-9 w-32" />
      </header>
      {tabs > 0 ? (
        <div className="mb-6 flex gap-4 border-b border-border pb-2.5">
          {Array.from({ length: tabs }, (_, i) => (
            <Bone key={i} className="h-3.5 w-16" />
          ))}
        </div>
      ) : null}
      <div className="divide-y divide-border">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center justify-between gap-4 py-3">
            <div className="space-y-1.5">
              <Bone className="h-4 w-40" />
              <Bone className="h-3 w-56 max-w-[60vw]" />
            </div>
            <Bone className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
