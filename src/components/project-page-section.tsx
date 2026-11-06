"use client";

import { ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

export function ProjectPageSection({
  title,
  defaultOpen = false,
  collapsible = true,
  headerRight,
  children,
  className,
}: {
  title: string;
  defaultOpen?: boolean;
  collapsible?: boolean;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  if (!collapsible) {
    return (
      <section className={className} aria-label={title}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="ap-section-title">{title}</h2>
          {headerRight ? <div className="flex flex-wrap items-center gap-2">{headerRight}</div> : null}
        </div>
        {children}
      </section>
    );
  }
  return (
    <Collapsible
      defaultOpen={defaultOpen}
      className={cn("group border border-border bg-card", className)}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex min-w-0 max-w-full flex-1 items-center gap-2 text-left outline-none hover:bg-muted/50"
          >
            <ChevronDown
              aria-hidden
              className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180"
            />
            <span className="ap-kicker">
              {title}
            </span>
          </button>
        </CollapsibleTrigger>
        {headerRight ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{headerRight}</div>
        ) : null}
      </div>
      <CollapsibleContent className="overflow-hidden">
        <div className="border-t border-border px-4 pb-4 pt-1">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}
