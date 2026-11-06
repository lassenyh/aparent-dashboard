import { cn } from "@/lib/utils";

/** Section title — Archivo, matching WrapUp Sign. */
export function SectionHeading({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2 className={cn("ap-section-title mb-4", className)}>
      {children}
    </h2>
  );
}
