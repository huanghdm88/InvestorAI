import * as React from "react";

import { cn } from "@/src/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-[64px] w-full rounded-[var(--wz-radius-md)] border border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-surface)] px-[var(--wz-control-padding-inline)] py-[var(--wz-space-2)] text-[length:var(--wz-font-size-md)] leading-[var(--wz-line-height-normal)] text-[var(--wz-color-text-primary)] outline-none transition-[border-color,box-shadow] duration-[var(--wz-duration-fast)] ease-[var(--wz-ease-standard)] placeholder:text-[color:var(--wz-color-text-tertiary)] hover:border-[var(--wz-color-border-strong)] focus-visible:border-[var(--wz-color-border-focus)] focus-visible:shadow-[0_0_0_3px_var(--wz-color-focus-ring)] aria-[invalid=true]:border-[var(--wz-color-status-danger)] disabled:cursor-not-allowed disabled:bg-[var(--wz-color-bg-subtle)] disabled:text-[var(--wz-color-text-disabled)] disabled:opacity-[var(--wz-opacity-disabled)]",
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
