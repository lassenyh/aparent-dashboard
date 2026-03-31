import { cn } from "@/lib/utils";

/** Section title — medium emphasis, consistent across app */
export function SectionHeading({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={cn(
        "mb-4 text-[13px] font-medium uppercase tracking-[0.06em] text-muted-foreground",
        className,
      )}
    >
      {children}
    </h2>
  );
}
