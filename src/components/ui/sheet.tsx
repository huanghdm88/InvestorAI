import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";

import { AppIcon } from "@/src/components/ui/app-icon";
import { IconClose } from "@/src/lib/icons";
import { useLocale } from "@/src/lib/i18n";
import { cn } from "@/src/lib/utils";

const SheetContext = React.createContext({ open: false, modal: true });

function Sheet({ open, defaultOpen = false, onOpenChange, modal = true, children, ...props }: React.ComponentProps<typeof DialogPrimitive.Root>) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const isOpen = open ?? uncontrolledOpen;
  return <SheetContext.Provider value={{ open: isOpen, modal }}>
    <DialogPrimitive.Root {...props} modal={modal} open={isOpen} onOpenChange={(value) => {
      setUncontrolledOpen(value);
      onOpenChange?.(value);
    }}>{children}</DialogPrimitive.Root>
  </SheetContext.Provider>;
}
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;
const SheetPortal = DialogPrimitive.Portal;

function SheetOverlay({ ref }: React.ComponentPropsWithRef<"div">) {
  const { open, modal } = React.useContext(SheetContext);
  const className = cn(
    "wz-sheet-overlay fixed inset-0 z-[var(--wz-z-overlay)] bg-[var(--wz-color-bg-overlay)]",
    !open && "pointer-events-none",
  );
  // Radix omits non-modal overlays; retain the backdrop for workspace drawers.
  // Closed backdrops must not stay hittable: browsers retarget those clicks to the focused control.
  if (!modal) {
    if (!open) return null;
    return <div ref={ref} data-slot="sheet-overlay" data-state="open" className={className} />;
  }
  return (
    <DialogPrimitive.Overlay
      ref={ref}
      data-slot="sheet-overlay"
      className={className}
    />
  );
}

function SheetContent({
  className,
  children,
  side = "right",
  showCloseButton = true,
  onInteractOutside,
  onCloseAutoFocus,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  side?: "left" | "right";
  showCloseButton?: boolean;
}) {
  const { t } = useLocale();
  const { modal } = React.useContext(SheetContext);
  const isWorkspaceLayerTarget = (target: EventTarget | null) => target instanceof Element
    && Boolean(target.closest("#project-floating-composer, .composer-launcher-position, [data-slot=\"sheet-content\"]"));
  return (
    <SheetPortal>
      <SheetOverlay />
      <DialogPrimitive.Content
        data-slot="sheet-content"
        data-side={side}
        data-workspace-sheet={!modal || undefined}
        className={cn(
          "wz-sheet-content fixed inset-y-0 z-[var(--wz-z-dialog)] flex h-dvh w-[min(640px,calc(100vw-16px))] flex-col overflow-hidden border-[var(--wz-color-border-subtle)] bg-[var(--wz-color-bg-elevated)] text-[var(--wz-color-text-primary)] shadow-[var(--wz-shadow-lg)] outline-none",
          side === "right" ? "right-0 border-l" : "left-0 border-r",
          className
        )}
        {...props}
        onInteractOutside={(event) => {
          if (!modal && isWorkspaceLayerTarget(event.detail.originalEvent.target)) {
            event.preventDefault();
            return;
          }
          onInteractOutside?.(event);
        }}
        onCloseAutoFocus={(event) => {
          if (!modal && isWorkspaceLayerTarget(document.activeElement)) event.preventDefault();
          onCloseAutoFocus?.(event);
        }}
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
