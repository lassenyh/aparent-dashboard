"use client";

import { useEffect, useState, type CSSProperties, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { ArrowUpRight, ChevronsUpDown } from "lucide-react";
import { ProductLockup } from "@/components/product-mark";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  PRODUCT_SERVICE,
  PRODUCT_SERVICES,
  SERVICE_META,
  type ProductService,
} from "@/lib/product";
import { cn } from "@/lib/utils";
import styles from "./service-handoff.module.css";

const HANDOFF_MS = 1400;

/** Bare lanserte tjenester vises i velgeren. */
const LIVE_SERVICES = PRODUCT_SERVICES.filter((s) => SERVICE_META[s].status === "live");

const accentStyle = (service: ProductService) =>
  ({ "--mark-accent": SERVICE_META[service].color }) as CSSProperties;

/**
 * Låsen (wrapup | desk) som tjenestevelger. Musepeker over en annen tjeneste
 * farger firkanten og ordet i låsen som en forhåndsvisning; valg spiller
 * overgangen der firkanten skifter farge, og åpner tjenesten.
 * Cmd/Ctrl-klikk åpner i ny fane uten overgang.
 */
export function ServiceSwitcher({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<ProductService | null>(null);
  const [handoff, setHandoff] = useState<ProductService | null>(null);

  /* Tilbake-knappen kan vise siden fra bfcache med overgangen fortsatt på. */
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) setHandoff(null);
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  function go(service: ProductService, e: MouseEvent<HTMLAnchorElement>) {
    const url = SERVICE_META[service].url;
    if (!url || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    setOpen(false);
    setPreview(null);
    setHandoff(service);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.setTimeout(() => window.location.assign(url), reduce ? 200 : HANDOFF_MS);
  }

  return (
    <>
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setPreview(null);
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Bytt WrapUp-tjeneste"
            className={cn(
              styles.trigger,
              "group -mx-1.5 flex min-w-0 items-center gap-1 rounded-sm px-1.5 py-1 transition-colors hover:bg-muted data-[state=open]:bg-muted",
              className,
            )}
            style={preview ? accentStyle(preview) : undefined}
          >
            <ProductLockup size="sm" />
            <ChevronsUpDown
              aria-hidden
              className="size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 group-data-[state=open]:opacity-100"
            />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" sideOffset={8} className="w-[260px] p-1.5">
          <p className="ap-kicker px-2.5 pb-2 pt-1.5">Tjenester i WrapUp</p>
          <ul className="space-y-0.5">
            {LIVE_SERVICES.map((service, index) => {
              const meta = SERVICE_META[service];
              const current = service === PRODUCT_SERVICE;
              const body = (
                <>
                  <span className="flex min-w-0 flex-col gap-1.5">
                    <ProductLockup service={service} size="sm" />
                    <span className="truncate text-xs text-muted-foreground">{meta.label}</span>
                  </span>
                  {current ? null : meta.url ? (
                    <ArrowUpRight
                      aria-hidden
                      className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                    />
                  ) : (
                    <span className="shrink-0 text-[11px] text-muted-foreground">Kommer</span>
                  )}
                </>
              );
              const rowClass = "flex items-center justify-between gap-3 px-2.5 py-2.5";
              return (
                <li
                  key={service}
                  className={styles.row}
                  style={{ ...accentStyle(service), "--i": index } as CSSProperties}
                >
                  {current ? (
                    <div aria-current="true" className={cn(rowClass, "bg-accent")}>{body}</div>
                  ) : meta.url ? (
                    <a
                      href={meta.url}
                      className={cn(rowClass, "group outline-none transition-colors hover:bg-muted focus-visible:bg-muted")}
                      onClick={(e) => go(service, e)}
                      onMouseEnter={() => setPreview(service)}
                      onMouseLeave={() => setPreview(null)}
                      onFocus={() => setPreview(service)}
                      onBlur={() => setPreview(null)}
                    >
                      {body}
                    </a>
                  ) : (
                    <div aria-disabled="true" className={cn(rowClass, "opacity-55")}>{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </PopoverContent>
      </Popover>

      {handoff
        ? createPortal(<ServiceHandoff to={handoff} />, document.body)
        : null}
    </>
  );
}

/** Fullskjerm-overgangen: merket tar én runde og firkanten bytter til neste tjenestes farge. */
function ServiceHandoff({ to }: { to: ProductService }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={styles.overlay}
      style={
        {
          "--handoff-from": SERVICE_META[PRODUCT_SERVICE].color,
          "--handoff-to": SERVICE_META[to].color,
          "--handoff-duration": `${HANDOFF_MS}ms`,
        } as CSSProperties
      }
    >
      <div className={styles.rotor} aria-hidden="true">
        <span className={styles.l1} />
        <span className={styles.l2} />
        <span className={styles.l3} />
        <span className={styles.accent} />
      </div>
      <div className={styles.caption} style={accentStyle(to)}>
        <ProductLockup service={to} size="lg" />
        <span className="text-xs text-muted-foreground">Åpner WrapUp {to[0].toUpperCase() + to.slice(1)} …</span>
      </div>
    </div>
  );
}
