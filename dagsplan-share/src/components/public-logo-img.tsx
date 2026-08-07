import { resolvePublicImageSrcForImgTag } from "@/lib/img-url";

/** Kunde-/byrålogoer: Vercel Blob lastes via /api/public-image i Safari (direkte blob-URL blir ofte blokkert). */
export function PublicLogoImg({
  src,
  alt,
  className,
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
}) {
  const imgSrc = resolvePublicImageSrcForImgTag(src);
  if (!imgSrc) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- dynamiske logo-URL-er fra DB/Blob
    <img src={imgSrc} alt={alt} className={className} loading="eager" />
  );
}
