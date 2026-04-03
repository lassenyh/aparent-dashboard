import { sanitizePublicImageUrl } from "@/lib/img-url";

/** Kunde-/byrålogoer: samme visning for alle brukere; sikrer HTTPS for Safari. */
export function PublicLogoImg({
  src,
  alt,
  className,
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
}) {
  const safe = sanitizePublicImageUrl(src);
  if (!safe) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- dynamiske logo-URL-er fra DB/Blob
    <img src={safe} alt={alt} className={className} />
  );
}
