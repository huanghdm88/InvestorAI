import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "@/src/lib/utils";

const Tabs = TabsPrimitive.Root;

function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "inline-flex min-h-[var(--wz-control-height-md)] items-center justify-center gap-[var(--wz-space-6)] border-b border-[var(--wz-color-border-subtle)] text-[color:var(--wz-color-text-tertiary)]",
        className
      )}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "relative -mb-px inline-flex min-h-[var(--wz-control-height-md)] items-center justify-center gap-[var(--wz-space-2)] whitespace-nowrap border-b border-transparent px-0 text-[length:var(--wz-font-size-md)] font-normal text-[color:var(--wz-color-text-tertiary)] outline-none transition-[border-color,color,box-shadow] duration-[var(--wz-duration-fast)] ease-[var(--wz-ease-standard)] after:pointer-events-none after:absolute after:inset-x-0 after:bottom-[-1px] after:h-0.5 after:origin-left after:scale-x-0 after:bg-[var(--wz-color-action-primary)] after:transition-transform after:duration-[var(--wz-duration-fast)] after:ease-[var(--wz-ease-standard)] hover:text-[var(--wz-color-text-primary)] focus-visible:rounded-[var(--wz-radius-sm)] focus-visible:shadow-[0_0_0_3px_var(--wz-color-focus-ring)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:text-[var(--wz-color-text-disabled)] data-[state=active]:font-medium data-[state=active]:text-[var(--wz-color-text-primary)] data-[state=active]:after:scale-x-100 motion-reduce:after:transition-none",
        className
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn(
        "mt-[var(--wz-space-4)] text-[var(--wz-color-text-primary)] focus-visible:outline-none",
        className
      )}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
