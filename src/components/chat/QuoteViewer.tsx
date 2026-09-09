import { useEffect, useState } from "react";

import { Button } from "@/src/components/ui/button";
import { AppIcon } from "@/src/components/ui/app-icon";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/src/components/ui/sheet";
import { IconClose, IconFileText } from "@/src/lib/icons";
import { useLocale } from "@/src/lib/i18n";
import type { SourceAnchor } from "@/src/types";

interface QuoteViewerProps {
  anchor: SourceAnchor | null;
  onClose: () => void;
  returnFocusTo?: HTMLElement | null;
}

export function QuoteViewer({ anchor, onClose, returnFocusTo }: QuoteViewerProps) {
  const { locale } = useLocale();
  const open = anchor !== null;
  const [lastAnchor, setLastAnchor] = useState<SourceAnchor | null>(anchor);

  useEffect(() => {
    if (anchor) setLastAnchor(anchor);
  }, [anchor]);

  const showable = anchor ?? lastAnchor;
  if (!showable) return null;

  const renderExcerpt = () => {
    const text = showable.excerpt;
    if (!showable.highlight || showable.highlight.length === 0) return text;
    const escaped = showable.highlight.map((h) => h.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&"));
    const re = new RegExp(`(${escaped.join("|")})`, "g");
    const parts = text.split(re);
    return parts.map((part, i) =>
      escaped.some((e) => new RegExp(`^${e}$`).test(part)) ? (
        <mark key={i} className="evidence-highlight">
          {part}
        </mark>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <SheetContent
        side="right"
        showCloseButton={false}
        onCloseAutoFocus={(event) => {
          if (!returnFocusTo?.isConnected) return;
          event.preventDefault();
          returnFocusTo.focus();
        }}
        className="w-full max-w-md bg-[var(--wz-color-bg-surface)] p-0"
      >
        <SheetTitle className="sr-only">
          {locale === "en-US" ? `Source quote: ${showable.document}` : `引文查看：${showable.document}`}
        </SheetTitle>
        <SheetDescription className="sr-only">
          {locale === "en-US" ? `View the source passage on page ${showable.page}` : `查看第 ${showable.page} 页的原始引文片段`}
        </SheetDescription>
        <div className="flex items-start justify-between gap-3 border-b border-[var(--wz-color-border-default)] px-5 py-4">
          <div className="min-w-0 flex-1">
            <p className="text-[length:var(--wz-font-size-xs)] font-medium text-[color:var(--wz-color-text-tertiary)]">{locale === "en-US" ? "Source quote" : "引文查看"}</p>
            <div className="mt-1 flex items-center gap-2">
              <AppIcon icon={IconFileText} size={14} className="shrink-0 text-[color:var(--wz-color-text-secondary)]" />
              <p className="line-clamp-1 text-[length:var(--wz-font-size-md)] font-semibold text-[var(--wz-color-text-primary)]">{locale === "en-US" ? showable.document : `《${showable.document}》`}</p>
            </div>
            <p className="mt-1 text-[length:var(--wz-font-size-xs)] text-[color:var(--wz-color-text-secondary)]">
              P{showable.page} {showable.paragraph && `· ${showable.paragraph}`}
            </p>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label={locale === "en-US" ? "Close" : "关闭"}>
            <AppIcon icon={IconClose} size={14} />
          </Button>
        </div>

        <div className="thin-scroll flex-1 overflow-y-auto px-5 py-5">
          <div className="rounded-[var(--wz-radius-lg)] border border-[var(--wz-color-border-default)] bg-[var(--wz-color-status-warning-subtle)] px-4 py-3.5">
            <p className="text-[length:var(--wz-font-size-xs)] font-medium text-[var(--wz-color-status-warning)]">{locale === "en-US" ? "Source passage" : "原始引文片段"}</p>
            <p className="mt-2 whitespace-pre-wrap text-[length:var(--wz-font-size-md)] leading-7 text-[var(--wz-color-text-primary)]">{renderExcerpt()}</p>
          </div>

        </div>
      </SheetContent>
    </Sheet>
  );
}
