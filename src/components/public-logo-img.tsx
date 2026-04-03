import { sanitizePublicImageUrl } from "@/lib/img-url";

/** Eksterne logo-URL-er (Blob, CDN): Safari kan sende en annen Referer enn Chrome; full URL hjelper der host sjekker referrer/hotlink. */
const ABSOLUTE_HTTP_URL = /^https?:\/\//i;

/** Kunde-/byrålogoer: samme visning for alle brukere; HTTPS + referrer for Safari/Chrome-paritet. */
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
  const isRemote = ABSOLUTE_HTTP_URL.test(safe);
  return (
    // eslint-disable-next-line @next/next/no-img-element -- dynamiske logo-URL-er fra DB/Blob
    <img
      src={safe}
      alt={alt}
      className={className}
      loading="eager"
      referrerPolicy={isRemote ? "unsafe-url" : undefined}
    />
  );
}
