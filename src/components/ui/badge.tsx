import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/src/lib/utils";

const badgeVariants = cva(
  "inline-flex min-h-[22px] w-fit items-center rounded-[var(--wz-radius-sm)] border border-transparent px-[var(--wz-space-2)] py-0.5 text-[length:var(--wz-font-size-tag)] font-medium leading-[var(--wz-line-height-tag)] transition-[background-color,border-color,color] duration-[var(--wz-duration-fast)] ease-[var(--wz-ease-standard)]",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--wz-color-bg-subtle)] text-[color:var(--wz-color-text-secondary)]",
        secondary:
          "bg-[var(--wz-color-bg-subtle)] text-[color:var(--wz-color-text-secondary)]",
        outline:
          "border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-surface)] text-[color:var(--wz-color-text-secondary)]",
        info:
          "bg-[var(--wz-color-status-info-subtle)] text-[var(--wz-color-status-info)]",
        success:
          "bg-[var(--wz-color-status-success-subtle)] text-[var(--wz-color-status-success)]",
        warning:
          "bg-[var(--wz-color-status-warning-subtle)] text-[var(--wz-color-status-warning)]",
        danger:
          "bg-[var(--wz-color-status-danger-subtle)] text-[var(--wz-color-status-danger)]",
        destructive:
          "bg-[var(--wz-color-status-danger-subtle)] text-[var(--wz-color-status-danger)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof badgeVariants>) {
  return (
    <div
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
