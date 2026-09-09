import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

import { cn } from "@/src/lib/utils";

const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

function TooltipContent({
  className,
  sideOffset = 6,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        sideOffset={sideOffset}
        data-slot="tooltip-content"
        className={cn(
          "wz-tooltip-content z-[var(--wz-z-dropdown)] max-w-72 overflow-hidden rounded-[var(--wz-radius-sm)] bg-[var(--wz-color-action-primary)] px-[var(--wz-space-2)] py-1.5 text-[length:var(--wz-font-size-xs)] leading-[var(--wz-line-height-normal)] text-[var(--wz-color-text-inverse)] shadow-[var(--wz-shadow-md)]",
          className
        )}
        {...props}
      />
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
