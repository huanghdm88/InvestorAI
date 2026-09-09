import { AppIcon } from "@/src/components/ui/app-icon";
import { IconFileText } from "@/src/lib/icons";
import { cn } from "@/src/lib/utils";
import { useLocale } from "@/src/lib/i18n";
import type { SourceAnchor } from "@/src/types";

interface SourceAnchorListProps {
  anchors: SourceAnchor[];
  onView: (anchor: SourceAnchor) => void;
  compact?: boolean;
}

export function SourceAnchorList({ anchors, onView, compact = false }: SourceAnchorListProps) {
  const { locale } = useLocale();
  if (!anchors || anchors.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <p
        className={cn(
          "text-[length:var(--wz-font-size-xs)] font-semibold tracking-[0] text-[color:var(--wz-color-text-tertiary)]",
          compact && "mb-1"
        )}
      >
        {locale === "en-US" ? "Evidence anchors" : "证据锚点"} · {anchors.length}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {anchors.map((a, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onView(a)}
            className="group inline-flex items-center gap-1.5 rounded-[var(--wz-radius-md)] border border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-surface)] px-2 py-1 text-[length:var(--wz-font-size-tag)] leading-[var(--wz-line-height-tag)] text-[color:var(--wz-color-text-secondary)] outline-none transition-[background-color,border-color,color,box-shadow] duration-[var(--wz-duration-fast)] ease-[var(--wz-ease-standard)] hover:border-[var(--wz-color-border-strong)] hover:bg-[var(--wz-color-bg-subtle)] hover:text-[var(--wz-color-text-primary)] focus-visible:shadow-[0_0_0_3px_var(--wz-color-focus-ring)] motion-reduce:transition-none"
            title={locale === "en-US" ? "View source passage" : "查看原文片段"}
          >
            <AppIcon
              icon={IconFileText}
              size={11}
              className="text-[color:var(--wz-color-text-tertiary)] group-hover:text-[color:var(--wz-color-text-secondary)]"
            />
            <span className="font-medium">{locale === "en-US" ? a.document : `《${a.document}》`}</span>
            <span className="text-[color:var(--wz-color-text-tertiary)]">P{a.page}{a.paragraph && ` · ${a.paragraph}`}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
