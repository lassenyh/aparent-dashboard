import type { CSSProperties } from "react";
import { PublicLogoImg } from "@/components/public-logo-img";
import { sanitizePublicImageUrl } from "@/lib/img-url";
import { cn } from "@/lib/utils";

export type DagsplanHeaderLogo = {
  key: string;
  src: string | null | undefined;
  alt: string;
};

/**
 * Logo-rad øverst i dagsplanen. Brukes av både editor-forhåndsvisningen og print-siden
 * (som PDF-en rendres fra), slik at skjerm, print og PDF får samme oppsett.
 *
 * Fast grid: én kolonne per logo, like brede kolonner og fast mellomrom. Hver logo
 * skaleres inn i en boks med lik høyde og maksbredde (`object-fit: contain`), sentrert
 * både horisontalt og vertikalt. Boksen (`--logo-w`) er smalere enn kolonnen
 * (`--logo-cell-max`), slik at det alltid er luft mellom logoene. Logoer uten URL utelates, så rutenettet tilpasser seg
 * 1–4 logoer. Gridet får maksbredde = antall kolonner × maks cellebredde, slik at
 * to logoer ikke dyttes helt ut til kantene.
 */
export function DagsplanLogoGrid({
  logos,
  className,
}: {
  logos: DagsplanHeaderLogo[];
  className?: string;
}) {
  const visible = logos.filter((l) => sanitizePublicImageUrl(l.src));
  const count = visible.length;
  if (count === 0) return null;

  const style = {
    "--logo-count": count,
    gridTemplateColumns: "repeat(var(--logo-count), minmax(0, 1fr))",
    maxWidth:
      "calc(var(--logo-count) * var(--logo-cell-max) + (var(--logo-count) - 1) * var(--logo-gap))",
  } as CSSProperties;

  return (
    <div
      className={cn(
        "dagsplan-logo-grid mx-auto grid w-full items-center [--logo-cell-max:12rem] [--logo-gap:2.5rem] [--logo-h:2.25rem] [--logo-w:9rem] gap-x-(--logo-gap)",
        className,
      )}
      style={style}
    >
      {visible.map((logo) => (
        <div
          key={logo.key}
          className="flex h-(--logo-h) min-w-0 items-center justify-center"
        >
          <PublicLogoImg
            src={logo.src}
            alt={logo.alt}
            className="block h-full w-full max-w-(--logo-w) object-contain object-center"
          />
        </div>
      ))}
    </div>
  );
}
