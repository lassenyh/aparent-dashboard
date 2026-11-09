"use client";

import { useEffect, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { HANDOFF_MS, LIVE_SERVICES, ServiceHandoff } from "@/components/service-switcher";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PRODUCT_SERVICE, SERVICE_META, type ProductService } from "@/lib/product";
import styles from "./app-launcher.module.css";

/** Startsiden nøytral blekkfarge: overgangen går fra den til appens farge. */
const NEUTRAL = "#17150f";

function hrefFor(service: ProductService): string {
  return service === PRODUCT_SERVICE ? "/desk" : (SERVICE_META[service].url ?? "/");
}

function Mark({ color, size }: { color: string; size: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges">
      <rect x="0" y="0" width="6" height="6" fill="#c4bca8" />
      <rect x="7" y="0" width="6" height="6" fill="#9a9484" />
      <rect x="0" y="7" width="6" height="6" fill="#5c574a" />
      <rect x="7" y="7" width="8" height="8" fill={color} />
    </svg>
  );
}

/**
 * Startsiden: ett ikon per WrapUp-app, som en hjemskjerm. Valg spiller samme
 * overgang som tjenestevelgeren. Cmd/Ctrl-klikk åpner i ny fane.
 */
export function AppLauncher({ userName }: { userName: string }) {
  const router = useRouter();
  const [handoff, setHandoff] = useState<ProductService | null>(null);

  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) setHandoff(null);
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  function open(service: ProductService, e: MouseEvent<HTMLAnchorElement>) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    const href = hrefFor(service);
    const internal = href.startsWith("/");
    if (internal) router.prefetch(href);
    setHandoff(service);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.setTimeout(() => {
      if (internal) router.push(href);
      else window.location.assign(href);
    }, reduce ? 200 : HANDOFF_MS);
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    window.location.assign("/login");
  }

  const initials = userName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";

  return (
    <div className="flex min-h-dvh flex-col bg-background px-4 py-6 text-foreground sm:px-10 sm:py-7">
      <header className="flex items-center justify-between">
        <span className="flex items-center gap-2">
          <Mark color={NEUTRAL} size={16} />
          <span className="text-base font-medium tracking-[-0.045em]">wrapup</span>
        </span>
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={`Konto: ${userName}`}
              className="flex size-11 items-center justify-center border border-border bg-card text-xs font-medium transition-colors hover:bg-muted sm:size-9"
            >
              {initials}
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-56 p-1.5">
            <p className="truncate px-2.5 py-2 text-sm font-medium">{userName}</p>
            <button
              type="button"
              onClick={() => void logout()}
              className="flex w-full items-center gap-2 px-2.5 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <LogOut aria-hidden className="size-4" /> Logg ut
            </button>
          </PopoverContent>
        </Popover>
      </header>

      <main className="flex flex-1 items-center justify-center py-10">
        <h1 className="sr-only">Velg app</h1>
        <nav aria-label="Apper" className="grid grid-cols-3 gap-5 sm:gap-14">
          {LIVE_SERVICES.map((service, index) => {
            const color = SERVICE_META[service].color;
            return (
              <a
                key={service}
                href={hrefFor(service)}
                onClick={(e) => open(service, e)}
                className={`${styles.app} group flex flex-col items-center gap-2.5 outline-none sm:gap-3.5`}
                style={{ "--i": index } as React.CSSProperties}
              >
                <span className="flex size-[88px] items-center justify-center border border-border bg-card transition-[border-color,transform] duration-200 group-hover:-translate-y-0.5 group-hover:border-foreground group-focus-visible:border-foreground sm:size-32">
                  <span className="sm:hidden"><Mark color={color} size={44} /></span>
                  <span className="hidden sm:block"><Mark color={color} size={64} /></span>
                </span>
                <span className="text-[15px] font-medium tracking-[-0.03em] sm:text-[17px]" style={{ color }}>
                  {service}
                </span>
                <span className="sr-only">{SERVICE_META[service].label}</span>
              </a>
            );
          })}
        </nav>
      </main>

      {handoff ? createPortal(<ServiceHandoff to={handoff} fromColor={NEUTRAL} />, document.body) : null}
    </div>
  );
}
