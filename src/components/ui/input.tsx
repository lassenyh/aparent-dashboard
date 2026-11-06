import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        data-slot="input"
        className={cn(
          "flex h-[38px] w-full min-w-0 border border-input bg-card px-3 py-1 text-[13px] transition-[border-color,background] duration-150 outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-faint focus-visible:border-foreground disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:opacity-80",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
