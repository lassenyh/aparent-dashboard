import { resolvePublicImageSrcForImgTag } from "@/lib/img-url";

/** Kunde-/byrålogoer: Vercel Blob lastes via /api/public-image i Safari (direkte blob-URL blir ofte blokkert). */
export function PublicLogoImg({
  src,
  alt,
  className,
  compressForPdf = false,
  style,
  draggable,
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  compressForPdf?: boolean;
  style?: React.CSSProperties;
  draggable?: boolean;
}) {
  const imgSrc = resolvePublicImageSrcForImgTag(src);
  if (!imgSrc) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- dynamiske logo-URL-er fra DB/Blob
    <img
      src={imgSrc}
      alt={alt}
      className={className}
      loading="eager"
      data-pdf-compress={compressForPdf ? "" : undefined}
      style={style}
      draggable={draggable}
    />
  );
}
