import { useId, useState } from "react";

import { CitationsFooter } from "@/src/components/chat/CitationsFooter";
import { CitedText } from "@/src/components/chat/CitedText";
import { PriorityBadge } from "@/src/components/chat/PriorityBadge";
import { AppIcon } from "@/src/components/ui/app-icon";
import { IconChecklist, IconChevronDown, IconChevronUp, IconTarget } from "@/src/lib/icons";
import { cn } from "@/src/lib/utils";
import { useLocale } from "@/src/lib/i18n";
import { translateContentText } from "@/src/lib/content-localization";
import type { ChallengeItem, SourceAnchor } from "@/src/types";

interface ChallengeListCardProps {
  title: string;
  summary: string;
  items: ChallengeItem[];
  citations?: SourceAnchor[];
  onViewSource: (anchor: SourceAnchor) => void;
}

const neutralCategoryClass =
  "border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-subtle)] text-[color:var(--wz-color-text-secondary)]";

const categoryClass: Record<ChallengeItem["category"], string> = {
  行业: neutralCategoryClass,
  团队: neutralCategoryClass,
  产品: neutralCategoryClass,
  财务: neutralCategoryClass,
  合规: neutralCategoryClass,
  估值: neutralCategoryClass,
};

export function ChallengeListCard({
  title,
  summary,
  items,
  citations,
  onViewSource,
}: ChallengeListCardProps) {
  const { locale } = useLocale();
  const [openId, setOpenId] = useState<string | null>(items[0]?.id ?? null);
  const detailIdPrefix = useId();

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-[var(--wz-radius-lg)] border border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-surface)] shadow-[var(--wz-shadow-sm)]">
        <div className="border-b border-[var(--wz-color-border-subtle)] bg-[var(--wz-color-bg-subtle)] px-5 py-4">
          <div className="flex items-center gap-2">
            <AppIcon icon={IconChecklist} size={14} className="text-[color:var(--wz-color-text-secondary)]" />
            <span className="text-[length:var(--wz-font-size-caption)] font-semibold uppercase tracking-normal text-[color:var(--wz-color-text-secondary)]">
              {locale === "en-US" ? "Challenge Review" : "挑战质询清单"}
            </span>
          </div>
          <h3 className="mt-1.5 text-base font-semibold text-[var(--wz-color-text-primary)]">{title}</h3>
          <p className="mt-1 text-xs leading-relaxed text-[color:var(--wz-color-text-secondary)]">
            <CitedText text={summary} citations={citations} onView={onViewSource} />
          </p>
        </div>

        <ul className="divide-y divide-[var(--wz-color-border-subtle)]">
          {items.map((item, idx) => {
            const open = openId === item.id;
            const detailId = `${detailIdPrefix}-${idx}`;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : item.id)}
                  className={cn(
                    "flex w-full items-start gap-3 px-5 py-4 text-left transition-colors [transition-duration:var(--wz-duration-fast)] [transition-timing-function:var(--wz-ease-standard)] hover:bg-[var(--wz-color-bg-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--wz-color-focus-ring)]",
                    open && "bg-[var(--wz-color-bg-subtle)]"
                  )}
                  aria-expanded={open}
                  aria-controls={detailId}
                >
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-[var(--wz-radius-md)] bg-[var(--wz-color-action-primary)] text-[length:var(--wz-font-size-caption)] font-semibold text-[var(--wz-color-text-inverse)]">
                    {idx + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <PriorityBadge level={item.riskLevel} size="sm" />
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full border px-2 py-0.5 text-[length:var(--wz-font-size-tag)] leading-[var(--wz-line-height-tag)] font-medium",
                          categoryClass[item.category]
                        )}
                      >
                        {translateContentText(item.category, locale)}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm font-semibold text-[var(--wz-color-text-primary)]">{item.title}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[color:var(--wz-color-text-secondary)]">
                      <CitedText
                        text={item.coreLogic}
                        onView={onViewSource}
                      />
                    </p>
                  </div>
                  <div className="mt-1.5 shrink-0 text-[color:var(--wz-color-text-tertiary)]">
                    <AppIcon icon={open ? IconChevronUp : IconChevronDown} size={13} />
                  </div>
                </button>

                <div
                  id={detailId}
                  hidden={!open}
                  className={cn(
                    "space-y-4 border-t border-[var(--wz-color-border-subtle)] bg-[var(--wz-color-bg-subtle)] px-5 py-4 pl-14",
                    open && "animate-staged-reveal"
                  )}
                >
                    <div>
                      <p className="text-[length:var(--wz-font-size-caption)] font-semibold uppercase tracking-normal text-[color:var(--wz-color-text-tertiary)]">
                        {locale === "en-US" ? "Core tension" : "核心矛盾"}
                      </p>
                      <p className="mt-1 text-sm font-semibold leading-relaxed text-[var(--wz-color-text-primary)]">
                        <CitedText
                          text={item.coreLogic}
                          citations={citations}
                          onView={onViewSource}
                        />
                      </p>
                    </div>

                    <div>
                      <p className="text-[length:var(--wz-font-size-caption)] font-semibold uppercase tracking-normal text-[color:var(--wz-color-text-tertiary)]">
                        {locale === "en-US" ? "Evidence base" : "事实底座"} · {item.evidence.length}
                      </p>
                      <div className="mt-1.5 space-y-1.5">
                        {item.evidence.map((ev, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => onViewSource(ev)}
                            className="block w-full rounded-[var(--wz-radius-lg)] border border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-surface)] px-3 py-2.5 text-left transition-[background-color,border-color,box-shadow] [transition-duration:var(--wz-duration-fast)] [transition-timing-function:var(--wz-ease-standard)] hover:border-[var(--wz-color-border-strong)] hover:bg-[var(--wz-color-bg-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--wz-color-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--wz-color-bg-subtle)]"
                          >
                            <p className="line-clamp-2 text-xs leading-relaxed text-[color:var(--wz-color-text-secondary)]">
                              {ev.excerpt}
                            </p>
                            <p className="mt-1 text-[length:var(--wz-font-size-caption)] text-[color:var(--wz-color-text-tertiary)]">
                              {locale === "en-US" ? ev.document : `《${ev.document}》`} · P{ev.page}
                              {ev.paragraph && ` · ${ev.paragraph}`}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-[var(--wz-radius-lg)] border border-[var(--wz-color-action-primary)] bg-[var(--wz-color-action-primary)] px-4 py-3 text-[var(--wz-color-text-inverse)]">
                      <div className="flex items-center gap-1.5">
                        <AppIcon icon={IconTarget} size={12} />
                        <p className="text-[length:var(--wz-font-size-caption)] font-semibold uppercase tracking-normal">
                          {locale === "en-US" ? "Agent deal-term recommendations" : "Agent 条款建议"}
                        </p>
                      </div>
                      <ul className="mt-2 space-y-1">
                        {item.actionAdvice.map((a, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs leading-relaxed">
                            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--wz-color-text-inverse)] opacity-60" />
                            <span>{a}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
              </li>
            );
          })}
        </ul>
      </div>

      <CitationsFooter citations={citations} onView={onViewSource} />
    </div>
  );
}
