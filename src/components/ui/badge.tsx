import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "border-transparent bg-amber-500 text-black",
        secondary: "border-transparent bg-white/5 text-zinc-500",
        outline: "border-border text-muted-foreground",
        muted: "border-transparent bg-white/5 text-muted-foreground",
        success: "border-transparent bg-emerald-500/10 text-emerald-400",
        warning: "border-transparent bg-orange-500/10 text-orange-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
