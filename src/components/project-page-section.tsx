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
  headerRight,
  children,
  className,
}: {
  title: string;
  defaultOpen?: boolean;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Collapsible
      defaultOpen={defaultOpen}
      className={cn("group rounded-lg border border-border", className)}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex min-w-0 max-w-full flex-1 items-center gap-2 rounded-md text-left outline-none ring-offset-background hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <ChevronDown
              aria-hidden
              className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180"
            />
            <span className="text-[13px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
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
