import { Tooltip, TooltipContent, TooltipTrigger } from "@/src/components/ui/tooltip";
import { AppIcon } from "@/src/components/ui/app-icon";
import { IconFileText } from "@/src/lib/icons";
import { useLocale } from "@/src/lib/i18n";
import { cn } from "@/src/lib/utils";
import type { SourceAnchor } from "@/src/types";

interface CitationRefProps {
  /** 1-based 引用序号 */
  index: number;
  anchor: SourceAnchor;
  onView: (anchor: SourceAnchor) => void;
  className?: string;
}

/** 高亮 excerpt 中的命中关键字（与 QuoteViewer 一致的轻量实现） */
function renderHighlighted(text: string, highlight?: string[]) {
  if (!highlight || highlight.length === 0) return text;
  const escaped = highlight.map((h) => h.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&"));
  const re = new RegExp(`(${escaped.join("|")})`, "g");
  const parts = text.split(re);
  return parts.map((part, i) =>
    escaped.some((e) => new RegExp(`^${e}$`).test(part)) ? (
      <mark
        key={i}
        className="rounded-[var(--wz-radius-sm)] bg-[var(--wz-color-status-warning-subtle)] px-0.5 font-medium text-[var(--wz-color-text-inverse)]"
      >
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

/**
 * 内联引用标识符 — 视觉上类似上标 [N]，悬停展开 tooltip，点击打开 QuoteViewer 看完整原文。
 * 颗粒度到一句话，excerpt 即引用片段。
 */
export function CitationRef({ index, anchor, onView, className }: CitationRefProps) {
  const { locale } = useLocale();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onView(anchor);
          }}
          aria-label={locale === "en-US"
            ? `Citation ${index}: ${anchor.document}, page ${anchor.page}`
            : `引用 ${index}：《${anchor.document}》P${anchor.page}`}
          className={cn(
            "mx-0.5 -translate-y-0.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[var(--wz-radius-sm)] border px-1 align-text-top text-[length:var(--wz-font-size-tag)] leading-[var(--wz-line-height-tag)] font-semibold tabular-nums transition-[background-color,border-color,color] [transition-duration:var(--wz-duration-fast)] [transition-timing-function:var(--wz-ease-standard)]",
            "border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-subtle)] text-[color:var(--wz-color-text-secondary)]",
            "hover:border-[var(--wz-color-action-primary)] hover:bg-[var(--wz-color-action-primary)] hover:text-[var(--wz-color-text-inverse)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--wz-color-focus-ring)]",
            className
          )}
        >
          {index}
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        align="center"
        sideOffset={4}
        className="z-50 max-w-[360px] overflow-hidden rounded-[var(--wz-radius-lg)] border border-[var(--wz-color-border-strong)] bg-[var(--wz-color-action-primary)] p-0 text-[var(--wz-color-text-inverse)] shadow-[var(--wz-shadow-md)]"
      >
        <div className="flex items-start gap-2 border-b border-[var(--wz-color-border-strong)] px-3 py-2">
          <span className="mt-0.5 inline-flex h-[18px] min-w-[22px] shrink-0 items-center justify-center rounded-[var(--wz-radius-sm)] bg-[var(--wz-color-text-inverse)] px-1 text-[length:var(--wz-font-size-tag)] leading-[var(--wz-line-height-tag)] font-semibold text-[var(--wz-color-action-primary)]">
            {index}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1 text-[length:var(--wz-font-size-caption)] font-semibold uppercase tracking-normal text-[var(--wz-color-text-inverse)] opacity-60">
              <AppIcon icon={IconFileText} size={10} />
              {locale === "en-US" ? "Knowledge Base citation" : "知识库引用"}
            </div>
            <p className="mt-0.5 truncate text-[length:var(--wz-font-size-body)] font-semibold text-[var(--wz-color-text-inverse)]">
              {locale === "en-US" ? anchor.document : `《${anchor.document}》`}
            </p>
            <p className="text-[length:var(--wz-font-size-caption)] text-[var(--wz-color-text-inverse)] opacity-60">
              P{anchor.page}
              {anchor.paragraph && ` · ${anchor.paragraph}`}
            </p>
          </div>
        </div>
        <div className="px-3 py-2.5">
          <p className="text-[length:var(--wz-font-size-body)] leading-relaxed text-[var(--wz-color-text-inverse)]">
            {locale === "en-US" ? (
              <>“{renderHighlighted(anchor.excerpt, anchor.highlight)}”</>
            ) : (
              <>「{renderHighlighted(anchor.excerpt, anchor.highlight)}」</>
            )}
          </p>
          <p className="mt-2 text-[length:var(--wz-font-size-caption)] text-[var(--wz-color-text-inverse)] opacity-50">
            {locale === "en-US" ? "Select to view the full source passage" : "点击查看完整原文片段"}
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
