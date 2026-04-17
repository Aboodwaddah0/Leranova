import { cva } from "class-variance-authority";

import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em]",
  {
    variants: {
      variant: {
        subtle: "bg-[var(--accent-soft)] text-[var(--accent-strong)]",
        neutral: "bg-[var(--surface-3)] text-[var(--muted)]",
        inverse: "bg-[var(--accent-strong)] text-white",
      },
    },
    defaultVariants: {
      variant: "subtle",
    },
  },
);

function Badge({ className, variant, ...props }) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}

export { Badge, badgeVariants };
