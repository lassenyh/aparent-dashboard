import { cn } from "@/lib/utils";

const LOGO_SRC = "/aparent_logo/APARENT_DOUBLE_BLACK.png";

/** Aparent-logo fra `public/aparent_logo/`. Bruk `w-full` i en beholder med ønsket bredde. */
export function AparentLogo({
  className,
  alt = "Aparent",
}: {
  className?: string;
  /** Tom streng på innlogging når annen tekst beskriver siden. */
  alt?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- statisk PNG fra /public
    <img
      src={LOGO_SRC}
      alt={alt}
      className={cn(
        "h-[31.5px] w-full max-h-[37.8px] min-w-0 object-contain object-left",
        className,
      )}
    />
  );
}
