import { AppIcon } from "@/src/components/ui/app-icon";
import { IconFileText } from "@/src/lib/icons";
import { cn } from "@/src/lib/utils";
import { useLocale } from "@/src/lib/i18n";
import type { SourceAnchor } from "@/src/types";

interface CitationsFooterProps {
  citations?: SourceAnchor[];
  onView: (anchor: SourceAnchor) => void;
  /** 折叠成更紧凑的样式（默认 false，详情抽屉用展开版） */
  compact?: boolean;
  className?: string;
}

/**
 * 报告详情抽屉里的「知识库引用」聚合区。
 * 1-based 序号与正文里的 [N] 一一对应；点击任意一条打开 QuoteViewer 看完整原文。
 */
export function CitationsFooter({
  citations,
  onView,
  compact = false,
  className,
}: CitationsFooterProps) {
  const { locale } = useLocale();
  if (!citations || citations.length === 0) return null;

  return (
    <section
      aria-label={locale === "en-US" ? "Knowledge Base citations" : "知识库引用列表"}
      className={cn(
        "rounded-[var(--wz-radius-lg)] border border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-surface)]",
        className
      )}
    >
      <header className="flex items-center justify-between border-b border-[var(--wz-color-border-subtle)] px-4 py-2.5">
        <div className="flex items-center gap-1.5 text-[length:var(--wz-font-size-caption)] font-semibold uppercase tracking-normal text-[color:var(--wz-color-text-secondary)]">
          <AppIcon icon={IconFileText} size={11} />
          {locale === "en-US" ? "Knowledge Base citations" : "知识库引用"} · {citations.length}
        </div>
        <span className="text-[length:var(--wz-font-size-caption)] text-[color:var(--wz-color-text-tertiary)]">
          {locale === "en-US" ? "Sentence-level evidence · Select to view source" : "颗粒度到句 · 点击查看完整原文"}
        </span>
      </header>
      <ul
        className={cn(
          "divide-y divide-[var(--wz-color-border-subtle)]",
          compact ? "" : ""
        )}
      >
        {citations.map((c, i) => {
          const refNum = i + 1;
          return (
            <li key={i}>
              <button
                type="button"
                onClick={() => onView(c)}
                className="group flex w-full items-start gap-3 px-4 py-3 text-left transition-colors [transition-duration:var(--wz-duration-fast)] [transition-timing-function:var(--wz-ease-standard)] hover:bg-[var(--wz-color-bg-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--wz-color-focus-ring)]"
              >
                <span className="mt-0.5 inline-flex h-[20px] min-w-[24px] shrink-0 items-center justify-center rounded-[var(--wz-radius-md)] border border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-subtle)] px-1 text-[length:var(--wz-font-size-tag)] leading-[var(--wz-line-height-tag)] font-semibold tabular-nums text-[color:var(--wz-color-text-secondary)] transition-[background-color,border-color,color] [transition-duration:var(--wz-duration-fast)] [transition-timing-function:var(--wz-ease-standard)] group-hover:border-[var(--wz-color-action-primary)] group-hover:bg-[var(--wz-color-action-primary)] group-hover:text-[var(--wz-color-text-inverse)]">
                  {refNum}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <AppIcon icon={IconFileText} size={11} className="shrink-0 text-[color:var(--wz-color-text-tertiary)]" />
                    <p className="truncate text-[length:var(--wz-font-size-body)] font-semibold text-[var(--wz-color-text-primary)]">
                      {locale === "en-US" ? c.document : `《${c.document}》`}
                    </p>
                    <span className="shrink-0 rounded-[var(--wz-radius-sm)] bg-[var(--wz-color-bg-subtle)] px-1.5 py-0.5 text-[length:var(--wz-font-size-tag)] leading-[var(--wz-line-height-tag)] tabular-nums text-[color:var(--wz-color-text-secondary)]">
                      P{c.page}
                    </span>
                    {c.paragraph && (
                      <span className="truncate text-[length:var(--wz-font-size-caption)] text-[color:var(--wz-color-text-tertiary)]">
                        · {c.paragraph}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 line-clamp-2 text-[length:var(--wz-font-size-body)] leading-relaxed text-[color:var(--wz-color-text-secondary)]">
                    {locale === "en-US" ? c.excerpt : `「${c.excerpt}」`}
                  </p>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
