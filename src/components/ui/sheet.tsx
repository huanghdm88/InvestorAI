import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";

import { AppIcon } from "@/src/components/ui/app-icon";
import { IconClose } from "@/src/lib/icons";
import { useLocale } from "@/src/lib/i18n";
import { cn } from "@/src/lib/utils";

const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;
const SheetPortal = DialogPrimitive.Portal;

function SheetOverlay({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn(
        "wz-sheet-overlay fixed inset-0 z-[var(--wz-z-overlay)] bg-[var(--wz-color-bg-overlay)]",
        className
      )}
      {...props}
    />
  );
}

function SheetContent({
  className,
  children,
  side = "right",
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  side?: "left" | "right";
  showCloseButton?: boolean;
}) {
  const { t } = useLocale();
  return (
    <SheetPortal>
      <SheetOverlay />
      <DialogPrimitive.Content
        data-slot="sheet-content"
        data-side={side}
        className={cn(
          "wz-sheet-content fixed inset-y-0 z-[var(--wz-z-dialog)] flex h-dvh w-[min(640px,calc(100vw-16px))] flex-col overflow-hidden border-[var(--wz-color-border-subtle)] bg-[var(--wz-color-bg-elevated)] text-[var(--wz-color-text-primary)] shadow-[var(--wz-shadow-lg)] outline-none",
          side === "right" ? "right-0 border-l" : "left-0 border-r",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            className="absolute right-[var(--wz-space-4)] top-[var(--wz-space-4)] inline-flex h-[var(--wz-control-height-sm)] w-[var(--wz-control-height-sm)] items-center justify-center rounded-[var(--wz-radius-md)] text-[color:var(--wz-color-text-tertiary)] outline-none transition-[background-color,color,box-shadow] duration-[var(--wz-duration-fast)] ease-[var(--wz-ease-standard)] hover:bg-[var(--wz-color-bg-subtle)] hover:text-[var(--wz-color-text-primary)] focus-visible:shadow-[0_0_0_3px_var(--wz-color-focus-ring)]"
            aria-label={t("common.close")}
          >
            <AppIcon icon={IconClose} size={14} />
            <span className="sr-only">{t("common.close")}</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </SheetPortal>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn(
        "flex flex-col gap-[var(--wz-space-2)] border-b border-[var(--wz-color-border-subtle)] px-[var(--wz-space-6)] py-[var(--wz-space-5)] pr-16",
        className
      )}
      {...props}
    />
  );
}

function SheetTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="sheet-title"
      className={cn(
        "text-[length:var(--wz-font-size-lg)] font-semibold leading-[var(--wz-line-height-tight)] text-[var(--wz-color-text-primary)]",
        className
      )}
      {...props}
    />
  );
}

function SheetDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="sheet-description"
      className={cn(
        "text-[length:var(--wz-font-size-md)] leading-[var(--wz-line-height-normal)] text-[color:var(--wz-color-text-secondary)]",
        className
      )}
      {...props}
    />
  );
}

export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetDescription };
