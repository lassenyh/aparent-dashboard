import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap border border-transparent text-[13px] font-medium transition-[background,color,border-color] duration-150 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary-hover",
        destructive:
          "bg-transparent font-medium text-destructive hover:bg-destructive/10",
        outline:
          "border-border bg-transparent font-medium text-foreground hover:bg-muted",
        secondary:
          "bg-secondary font-medium text-secondary-foreground hover:bg-accent",
        ghost:
          "font-medium text-muted-foreground hover:bg-muted hover:text-foreground",
        /** Tidligere mørk sidemeny-knapp — samme blekk som `default`. */
        sidebar: "bg-primary text-primary-foreground hover:bg-primary-hover",
        link: "font-medium text-foreground underline-offset-4 hover:underline",
      },
      size: {
        default: "h-[38px] px-3.5",
        sm: "h-8 px-2.5 text-[12px]",
        lg: "h-10 px-4",
        icon: "size-[38px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        data-slot="button"
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
