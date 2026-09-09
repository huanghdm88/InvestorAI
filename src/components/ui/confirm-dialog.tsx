import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useRef, useState, type ReactNode } from "react";

import { Button } from "@/src/components/ui/button";
import { AppIcon } from "@/src/components/ui/app-icon";
import { useLocale } from "@/src/lib/i18n";
import { IconRefresh } from "@/src/lib/icons";
import { cn } from "@/src/lib/utils";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
}

function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  destructive = false,
  onConfirm,
}: ConfirmDialogProps) {
  const { t } = useLocale();
  const [pending, setPending] = useState(false);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const handleConfirm = async () => {
    setPending(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setPending(false);
    }
  };

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!pending) onOpenChange(nextOpen);
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="wz-confirm-overlay fixed inset-0 z-[var(--wz-z-overlay)] bg-[var(--wz-color-bg-overlay)]" />
        <DialogPrimitive.Content
          className={cn(
            "wz-confirm-content fixed left-1/2 top-1/2 z-[var(--wz-z-dialog)] w-[min(420px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 rounded-[var(--wz-radius-lg)] border border-[var(--wz-color-border-subtle)] bg-[var(--wz-color-bg-elevated)] p-[var(--wz-space-6)] text-[var(--wz-color-text-primary)] shadow-[var(--wz-shadow-lg)] outline-none"
          )}
          onEscapeKeyDown={(event) => {
            if (pending) event.preventDefault();
          }}
          onOpenAutoFocus={() => {
            if (document.activeElement instanceof HTMLElement) {
              returnFocusRef.current = document.activeElement;
            }
          }}
          onCloseAutoFocus={(event) => {
            if (!returnFocusRef.current?.isConnected) return;
            event.preventDefault();
            returnFocusRef.current.focus();
          }}
          onPointerDownOutside={(event) => {
            if (pending) event.preventDefault();
          }}
        >
          <DialogPrimitive.Title className="text-[length:var(--wz-font-size-lg)] font-semibold leading-[var(--wz-line-height-tight)]">
            {title}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-[var(--wz-space-2)] text-[length:var(--wz-font-size-md)] leading-[var(--wz-line-height-normal)] text-[color:var(--wz-color-text-secondary)]">
            {description}
          </DialogPrimitive.Description>

          <div className="mt-[var(--wz-space-6)] flex justify-end gap-[var(--wz-space-2)]">
            <DialogPrimitive.Close asChild>
              <Button type="button" variant="outline" disabled={pending}>
                {cancelLabel ?? t("common.cancel")}
              </Button>
            </DialogPrimitive.Close>
            <Button
              type="button"
              variant={destructive ? "destructive" : "default"}
              disabled={pending}
              onClick={handleConfirm}
              aria-busy={pending || undefined}
            >
              {pending && (
                <AppIcon
                  icon={IconRefresh}
                  size={12}
                  className="animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
              )}
              {pending ? t("dialog.processing") : (confirmLabel ?? t("common.confirm"))}
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export { ConfirmDialog };
export type { ConfirmDialogProps };
