import { cn } from "@/lib/utils";
import { PRODUCT_SERVICE, type ProductService } from "@/lib/product";

type Size = "sm" | "md" | "lg";

const WORD: Record<Size, string> = {
  sm: "text-[15px]",
  md: "text-[17px]",
  lg: "text-[26px]",
};

/**
 * Delelinjen: omtrent versalhøyde, bunnstilt mot grunnlinjen. w-px er
 * påkrevd — et tomt <span> uten bredde-klasse blir 0 px bredt og forsvinner,
 * selv med bg-border og en satt høyde.
 */
const RULE: Record<Size, string> = {
  sm: "w-px h-[12px] mx-[5px]",
  md: "w-px h-[14px] mx-[6px]",
  lg: "w-px h-[21px] mx-[8px]",
};

const LINK: Record<Size, { open: string; filled: string; gap: string }> = {
  sm: { open: "size-[2px]", filled: "size-[4px]", gap: "gap-[1.5px]" },
  md: { open: "size-[2.5px]", filled: "size-[5px]", gap: "gap-[2px]" },
  lg: { open: "size-[3.5px]", filled: "size-[7px]", gap: "gap-[3px]" },
};

const MARK: Record<Size, { className: string; px: number }> = {
  sm: { className: "size-4", px: 16 },
  md: { className: "size-[18px]", px: 18 },
  lg: { className: "size-6", px: 24 },
};

/**
 * Merket som inline SVG (samme geometri som favicon.svg), slik at firkanten
 * som stikker ut kan bytte farge: `--mark-accent` på en forelder overstyrer
 * tjenestefargen (brukes av tjenestevelgeren for forhåndsvisning).
 */
function MarkIcon({ size }: { size: Size }) {
  const mark = MARK[size];
  return (
    <svg
      viewBox="0 0 16 16"
      width={mark.px}
      height={mark.px}
      shapeRendering="crispEdges"
      className={cn("shrink-0", mark.className)}
      aria-hidden="true"
    >
      <rect x="0" y="0" width="6" height="6" fill="#c4bca8" />
      <rect x="7" y="0" width="6" height="6" fill="#9a9484" />
      <rect x="0" y="7" width="6" height="6" fill="#5c574a" />
      <rect
        x="7"
        y="7"
        width="8"
        height="8"
        style={{ fill: "var(--mark-accent, var(--seal))", transition: "fill 220ms ease" }}
      />
    </svg>
  );
}

/** Sekvensen: tre åpne ledd og ett fylt — rekken som lukkes. */
function Sequence({ size }: { size: Size }) {
  const link = LINK[size];
  return (
    <span className={cn("inline-flex items-end", link.gap)} aria-hidden="true">
      <span className={cn(link.open, "bg-faint/45")} />
      <span className={cn(link.open, "bg-faint/70")} />
      <span className={cn(link.open, "bg-muted-foreground")} />
      <span className={cn(link.filled, "bg-[var(--mark-accent,var(--seal))] transition-colors duration-200")} />
    </span>
  );
}

/**
 * Ordmerket alene: «wrapup» + sekvensen. Brukes der plattformen skal stå
 * uten tjenestenavn, og når wrapup-temaet er av.
 */
export function ProductWordmark({
  size = "md",
  className,
}: {
  size?: Size;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center",
        size === "lg" ? "gap-2.5" : "gap-2",
        className,
      )}
    >
      <MarkIcon size={size} />
      <span
        className={cn(
          "inline-flex items-baseline",
          size === "lg" ? "gap-[7px]" : "gap-[5px]",
        )}
      >
        <span
          className={cn(
            "font-medium leading-[0.88] tracking-[-0.045em] text-foreground",
            WORD[size],
          )}
        >
          wrapup
        </span>
        <Sequence size={size} />
      </span>
    </span>
  );
}

/**
 * Låsen: wrapup | desk ····.
 *
 * Plattform og tjeneste står i samme skrift og samme grad — det er fargen,
 * ikke størrelsen, som skiller dem. Delelinjen er en hårlinje i kantfargen
 * mellom dem; sekvensen (rekken som lukkes) står etter tjenestenavnet.
 */
export function ProductLockup({
  service = PRODUCT_SERVICE,
  size = "md",
  className,
}: {
  service?: ProductService;
  size?: Size;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center",
        size === "lg" ? "gap-2.5" : "gap-2",
        className,
      )}
    >
      <MarkIcon size={size} />
      <span
        className={cn(
          "inline-flex items-baseline",
          size === "lg" ? "gap-[7px]" : "gap-[5px]",
        )}
      >
        <span
          className={cn(
            "font-medium leading-[0.88] tracking-[-0.045em] text-foreground",
            WORD[size],
          )}
        >
          wrapup
        </span>
        <span className={cn("shrink-0 bg-border", RULE[size])} aria-hidden="true" />
        <span
          className={cn(
            "font-medium leading-[0.88] tracking-[-0.045em] text-[color:var(--mark-accent,var(--wrapup-word))] transition-colors duration-200",
            WORD[size],
          )}
        >
          {service}
        </span>
        <Sequence size={size} />
      </span>
    </span>
  );
}

/**
 * Frittstående mark for trange flater (favicon-parallell, avatar).
 * Under 20 px faller det tredje åpne leddet bort.
 */
export function ProductMark({
  size = "md",
  className,
}: {
  size?: "sm" | "md";
  className?: string;
}) {
  const compact = size === "sm";
  return (
    <span
      className={cn(
        "inline-flex items-end",
        compact ? "gap-[2px]" : "gap-[2.5px]",
        className,
      )}
      aria-hidden="true"
    >
      <span className={cn(compact ? "size-[3px]" : "size-[4px]", "bg-faint/70")} />
      {compact ? null : <span className="size-[4px] bg-muted-foreground" />}
      <span
        className={cn(
          compact ? "size-[3px]" : "size-[4px]",
          "bg-muted-foreground",
        )}
      />
      <span className={cn(compact ? "size-[6px]" : "size-[8px]", "bg-seal")} />
    </span>
  );
}
