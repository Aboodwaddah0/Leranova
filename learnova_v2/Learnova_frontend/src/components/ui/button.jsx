import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";

import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-strong)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60",
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--accent-strong)] text-white shadow-[0_12px_32px_-8px_rgba(0,92,192,0.45)] hover:brightness-110",
        secondary:
          "bg-[var(--surface-2)] text-[var(--accent-strong)] border border-[var(--border)] hover:bg-[var(--surface-3)]",
        ghost: "bg-transparent text-[var(--muted)] hover:text-[var(--accent-strong)]",
        outline:
          "bg-transparent text-[var(--accent-strong)] border border-[var(--accent-strong)] hover:bg-[var(--accent-soft)]",
      },
      size: {
        sm: "h-9 px-4",
        md: "h-11 px-6",
        lg: "h-12 px-7 text-base",
        xl: "h-14 px-10 text-base",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

function Button({ className, variant, size, asChild = false, ...props }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />
  );
}

export { Button, buttonVariants };
