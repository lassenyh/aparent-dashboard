import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center border px-2 py-0.5 text-[10.5px] font-medium tracking-[0.04em] uppercase",
  {
    variants: {
      variant: {
        default: "border-transparent bg-foreground text-background",
        secondary: "border-transparent bg-muted text-muted-foreground",
        outline: "border-border text-muted-foreground",
        muted: "border-transparent bg-muted/80 text-muted-foreground",
        success: "border-transparent bg-lamp-positive/15 text-lamp-positive",
        warning: "border-transparent bg-lamp-attention/15 text-lamp-attention",
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
