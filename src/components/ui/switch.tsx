import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";

import { cn } from "@/src/lib/utils";

function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer inline-flex h-5 w-9 shrink-0 touch-manipulation cursor-pointer items-center rounded-[var(--wz-radius-full)] border-2 border-transparent outline-none transition-[background-color,box-shadow] duration-[var(--wz-duration-fast)] ease-[var(--wz-ease-standard)] focus-visible:shadow-[0_0_0_3px_var(--wz-color-focus-ring)] disabled:cursor-not-allowed disabled:opacity-[var(--wz-opacity-disabled)] data-[state=checked]:bg-[var(--wz-color-action-primary)] data-[state=unchecked]:bg-[var(--wz-color-border-strong)]",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "pointer-events-none block h-4 w-4 rounded-[var(--wz-radius-full)] bg-[var(--wz-color-bg-surface)] shadow-[var(--wz-shadow-sm)] ring-0 transition-transform duration-[var(--wz-duration-fast)] ease-[var(--wz-ease-standard)] data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0"
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
