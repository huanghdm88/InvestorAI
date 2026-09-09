import { useId, useState } from "react";

import { AppIcon } from "@/src/components/ui/app-icon";
import {
  IconChevronDown,
  IconChevronRight,
  IconFileText,
} from "@/src/lib/icons";
import { RISK_LEVEL_CONFIG } from "@/src/lib/risk-level";
import { cn } from "@/src/lib/utils";
import { useLocale } from "@/src/lib/i18n";
import {
  translateVerificationCategory,
  translateVerificationVerdict,
} from "@/src/lib/content-localization";
import type {
  SourceAnchor,
  VerificationCardItem,
  VerificationCategory,
  VerificationVerdict,
} from "@/src/types";

interface VerificationCardProps {
  item: VerificationCardItem;
  onViewSource: (anchor: SourceAnchor) => void;
}

const neutralTag = {
  wrap: "border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-subtle)] text-[color:var(--wz-color-text-secondary)]",
  dot: "bg-[var(--wz-color-text-tertiary)]",
};

/** 分类只承担文本识别，不再与状态色竞争。 */
const CATEGORY_STYLE: Record<
  VerificationCategory,
  { wrap: string; dot: string }
> = {
  财务数据: neutralTag,
  募资: neutralTag,
  融资数据: neutralTag,
  公司数据: neutralTag,
  法务合规: neutralTag,
  客户数据: neutralTag,
  业务数据: neutralTag,
  市场行业: neutralTag,
  团队治理: neutralTag,
  其他: neutralTag,
};

/** 4 种结论的胶囊样式（参考 HTML c-ok / c-partial / c-insufficient / c-bad） */
const VERDICT_STYLE: Record<
  VerificationVerdict,
  { wrap: string; label: string }
> = {
  一致: {
    wrap: "border-[var(--wz-color-status-success)] bg-[var(--wz-color-status-success-subtle)] text-[var(--wz-color-status-success)]",
    label: "一致",
  },
  部分一致: {
    wrap: "border-[var(--wz-color-status-info)] bg-[var(--wz-color-status-info-subtle)] text-[var(--wz-color-status-info)]",
    label: "部分一致",
  },
  不一致: {
    wrap: "border-[var(--wz-color-status-danger)] bg-[var(--wz-color-status-danger-subtle)] text-[var(--wz-color-status-danger)]",
    label: "不一致",
  },
  证据不足: {
    wrap: "border-[var(--wz-color-status-warning)] bg-[var(--wz-color-status-warning-subtle)] text-[var(--wz-color-status-warning)]",
    label: "证据不足",
  },
};

/**
 * 单条「主张 ⇄ 证据」对照卡片：
 *  ┌──────────────────────────────────────────────┐
 *  │ [分类]  [风险等级]                  [结论]   │
 *  ├────────────────────────┬─────────────────────┤
 *  │ #N 投资备忘录 主张      │ 证据摘要             │
 *  │ ...                     │ ...                  │
 *  │ 来源锚点                │             证据来源 ›│
 *  └────────────────────────┴─────────────────────┘
 */
export function VerificationCard({ item, onViewSource }: VerificationCardProps) {
  const { locale, t } = useLocale();
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const sourcesId = useId();
  const cat = CATEGORY_STYLE[item.category];
  const verdict = VERDICT_STYLE[item.verdict];
  const riskCfg = RISK_LEVEL_CONFIG[item.riskLevel];

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-surface)] shadow-[var(--wz-shadow-sm)]">
      {/* 顶部 chip 栏：纯白背景，左侧分类 + 风险等级；右侧结论 */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--wz-color-border-subtle)] bg-[var(--wz-color-bg-surface)] px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[length:var(--wz-font-size-tag)] leading-[var(--wz-line-height-tag)] font-medium",
              cat.wrap
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", cat.dot)} />
            {translateVerificationCategory(item.category, locale)}
          </span>
          <span
            className={cn(
              "inline-flex items-center rounded-full border border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-subtle)] px-2 py-0.5 text-[length:var(--wz-font-size-tag)] leading-[var(--wz-line-height-tag)] font-medium text-[color:var(--wz-color-text-secondary)]"
            )}
          >
            {t(`risk.${item.riskLevel}`)}
          </span>
        </div>
        <span
          className={cn(
            "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[length:var(--wz-font-size-tag)] leading-[var(--wz-line-height-tag)] font-semibold",
            verdict.wrap
          )}
        >
          {translateVerificationVerdict(verdict.label, locale)}
        </span>
      </div>

      {/* 主体：左右两栏（主张为「主角」，证据为辅证） */}
      <div className="grid grid-cols-1 divide-y divide-[var(--wz-color-border-subtle)] md:grid-cols-[1.05fr_1fr] md:divide-x md:divide-y-0">
        {/* 左：投资备忘录主张，以序号和加粗正文突出验证源头 */}
        <div className="bg-[var(--wz-color-bg-surface)] px-4 py-3.5">
          <p className="mb-2 flex items-center gap-1.5 text-[length:var(--wz-font-size-caption)] font-semibold text-[color:var(--wz-color-text-secondary)]">
            <span className="rounded-[var(--wz-radius-sm)] bg-[var(--wz-color-action-primary)] px-1.5 py-0.5 text-[length:var(--wz-font-size-tag)] leading-[var(--wz-line-height-tag)] font-semibold text-[var(--wz-color-text-inverse)]">
              #{item.index}
            </span>
            {locale === "en-US" ? "Investment memo · Claim" : "投资备忘录 · 主张"}
          </p>
          <p className="whitespace-pre-wrap text-[length:var(--wz-font-size-body)] font-medium leading-relaxed text-[var(--wz-color-text-primary)]">
            {item.claim}
          </p>
          {item.claimSources && item.claimSources.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1">
              {item.claimSources.map((a, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => onViewSource(a)}
                  className="inline-flex max-w-full items-center gap-1 rounded-[var(--wz-radius-md)] border border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-surface)] px-1.5 py-0.5 text-[length:var(--wz-font-size-tag)] leading-[var(--wz-line-height-tag)] text-[color:var(--wz-color-text-secondary)] outline-none transition-[border-color,color,box-shadow] [transition-duration:var(--wz-duration-fast)] [transition-timing-function:var(--wz-ease-standard)] hover:border-[var(--wz-color-border-strong)] hover:text-[var(--wz-color-text-primary)] focus-visible:shadow-[0_0_0_3px_var(--wz-color-focus-ring)]"
                  title={a.excerpt}
                >
                  <AppIcon icon={IconFileText} size={10} className="shrink-0" />
                  <span className="truncate">
                    {a.document} · P{a.page}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 右：证据摘要 —— 微灰底 + 常规字重，作为对照与支撑 */}
        <div className="flex flex-col bg-[var(--wz-color-bg-subtle)] px-4 py-3.5">
          <p className="mb-2 text-[length:var(--wz-font-size-caption)] font-medium text-[color:var(--wz-color-text-tertiary)]">
            {locale === "en-US" ? "Evidence summary" : "证据摘要"}
          </p>
          <p className="whitespace-pre-wrap text-[length:var(--wz-font-size-body)] leading-relaxed text-[color:var(--wz-color-text-secondary)]">
            {item.evidence}
          </p>
          {item.evidenceSources.length > 0 && (
            <div className="mt-3 flex flex-col items-end gap-1.5">
              <button
                type="button"
                onClick={() => setSourcesOpen((v) => !v)}
                className="inline-flex items-center gap-1 text-[length:var(--wz-font-size-caption)] font-medium text-[var(--wz-color-text-link)] outline-none transition-[color,box-shadow] [transition-duration:var(--wz-duration-fast)] [transition-timing-function:var(--wz-ease-standard)] hover:text-[var(--wz-color-action-accent-hover)] focus-visible:shadow-[0_0_0_3px_var(--wz-color-focus-ring)]"
                aria-expanded={sourcesOpen}
                aria-controls={sourcesId}
              >
                {locale === "en-US" ? "Evidence sources" : "证据来源"} · {item.evidenceSources.length}
                <AppIcon
                  icon={sourcesOpen ? IconChevronDown : IconChevronRight}
                  size={11}
                />
              </button>
              <div
                id={sourcesId}
                hidden={!sourcesOpen}
                className="flex w-full flex-col gap-1"
              >
                  {item.evidenceSources.map((a, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => onViewSource(a)}
                      className="group flex items-start gap-2 rounded-[var(--wz-radius-md)] border border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-surface)] px-2 py-1.5 text-left text-[length:var(--wz-font-size-tag)] leading-[var(--wz-line-height-tag)] text-[color:var(--wz-color-text-secondary)] outline-none transition-[background-color,border-color,color,box-shadow] [transition-duration:var(--wz-duration-fast)] [transition-timing-function:var(--wz-ease-standard)] hover:border-[var(--wz-color-border-strong)] hover:bg-[var(--wz-color-bg-subtle)] hover:text-[var(--wz-color-text-primary)] focus-visible:shadow-[0_0_0_3px_var(--wz-color-focus-ring)]"
                      title={a.excerpt}
                    >
                      <AppIcon
                        icon={IconFileText}
                        size={11}
                        className="mt-0.5 shrink-0 text-[color:var(--wz-color-text-tertiary)] group-hover:text-[color:var(--wz-color-text-secondary)]"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">
                          {a.document}
                        </span>
                        <span className="block text-[length:var(--wz-font-size-caption)] text-[color:var(--wz-color-text-tertiary)]">
                          P{a.page}
                          {a.paragraph && ` · ${a.paragraph}`}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
