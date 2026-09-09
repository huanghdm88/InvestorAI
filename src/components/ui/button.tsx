import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/src/lib/utils";

const buttonVariants = cva(
  "inline-flex min-w-0 touch-manipulation items-center justify-center gap-[var(--wz-space-2)] whitespace-nowrap rounded-[var(--wz-radius-md)] border border-transparent px-[var(--wz-control-padding-inline)] font-medium leading-none outline-none transition-[background-color,border-color,color,box-shadow] duration-[var(--wz-duration-fast)] ease-[var(--wz-ease-standard)] focus-visible:shadow-[0_0_0_3px_var(--wz-color-focus-ring)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-[var(--wz-opacity-disabled)] aria-disabled:pointer-events-none aria-disabled:opacity-[var(--wz-opacity-disabled)]",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--wz-color-action-primary)] text-[color:var(--wz-color-text-inverse)] hover:bg-[var(--wz-color-action-primary-hover)] active:bg-[var(--wz-color-action-primary-pressed)]",
        secondary:
          "bg-[var(--wz-color-bg-subtle)] text-[color:var(--wz-color-text-primary)] hover:bg-[var(--wz-color-border-default)]",
        outline:
          "border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-surface)] text-[color:var(--wz-color-text-primary)] hover:border-[var(--wz-color-border-strong)] hover:bg-[var(--wz-color-bg-subtle)]",
        ghost:
          "bg-transparent text-[color:var(--wz-color-text-secondary)] hover:bg-[var(--wz-color-bg-subtle)] hover:text-[color:var(--wz-color-text-primary)]",
        brand:
          "bg-[var(--wz-color-action-primary)] text-[color:var(--wz-color-text-inverse)] hover:bg-[var(--wz-color-action-primary-hover)] active:bg-[var(--wz-color-action-primary-pressed)]",
        destructive:
          "bg-[var(--wz-color-status-danger)] text-[color:var(--wz-color-text-inverse)] hover:brightness-[0.92]",
      },
      size: {
        default: "h-[var(--wz-control-height-md)] text-[length:var(--wz-font-size-md)]",
        sm: "h-[var(--wz-control-height-sm)] text-[length:var(--wz-font-size-sm)]",
        lg: "h-[var(--wz-control-height-lg)] px-[var(--wz-space-4)] text-[length:var(--wz-font-size-lg)]",
        icon: "h-[var(--wz-control-height-md)] w-[var(--wz-control-height-md)] p-0",
        "icon-sm": "h-[var(--wz-control-height-sm)] w-[var(--wz-control-height-sm)] p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      data-button-size={size ?? "default"}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
