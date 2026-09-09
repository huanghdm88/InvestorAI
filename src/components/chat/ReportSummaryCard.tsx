import type { ReactNode } from "react";
import { getManagerTaskLabel } from "@/src/lib/manager-tasks";

import { AppIcon } from "@/src/components/ui/app-icon";
import {
  IconArrowRight,
  IconBuilding,
  IconCalculator,
  IconChecklist,
  IconFactCheck,
  IconFileCheck,
} from "@/src/lib/icons";
import { cn, formatRelative } from "@/src/lib/utils";
import { isElevatedRisk, isHighRisk } from "@/src/lib/risk-level";
import { useLocale } from "@/src/lib/i18n";
import type { AssistantBlock, RiskLevel, VerificationCardItem } from "@/src/types";

/** 从 diligence-report 的章节内容中汇总 verification-cards 的风险等级分布 */
function summarizeVerificationCards(
  block: Extract<AssistantBlock, { kind: "diligence-report" }>
): {
  total: number;
  byRisk: Record<RiskLevel, number>;
} | null {
  const byRisk: Record<RiskLevel, number> = { R1: 0, R2: 0, R3: 0, R4: 0, R5: 0 };
  let total = 0;
  for (const section of block.sections) {
    for (const blk of section.content) {
      if (blk.type === "verification-cards") {
        for (const item of blk.items as VerificationCardItem[]) {
          byRisk[item.riskLevel] = (byRisk[item.riskLevel] ?? 0) + 1;
          total += 1;
        }
      }
    }
  }
  return total > 0 ? { total, byRisk } : null;
}

type ReportBlock = Extract<
  AssistantBlock,
  {
    kind:
      | "fact-verification"
      | "challenge-list"
      | "valuation"
      | "enterprise-analysis"
      | "question-report"
      | "project-work-report"
      | "diligence-report";
  }
>;

interface ReportSummaryCardProps {
  block: ReportBlock;
  onOpen: () => void;
  /** 显式区分对话流和项目主页，避免两处报告卡片互相影响。 */
  surface?: "default" | "conversation";
  /** 来源（仅项目主页历史报告：显示在卡片右上角） */
  sourceLabel?: string;
  /** 生成时间（仅项目主页历史报告：显示在标题下方） */
  createdAt?: string;
  /** 新报告按类型播放一次入场高亮 */
  isNew?: boolean;
  onAnimated?: () => void;
  /** 对话流中的报告附加内容；与报告打开按钮同处一个卡片外壳。 */
  followUpContent?: ReactNode;
}

interface SummaryConfig {
  eyebrow: string;
  icon: typeof IconFactCheck;
  accent: string; // tailwind classes for eyebrow accent
  stats: Array<{
    label: string;
    value: string;
    tone?: "default" | "high" | "medium" | "neutral";
  }>;
  variant?: "validation" | "analysis";
}

const featureVariantMeta = {
  validation: {
    band: "report-summary-band-validation",
    foreground: "text-[var(--wz-palette-black)]",
    badge:
      "bg-black/5 text-[var(--wz-palette-black)] ring-black/10",
  },
  analysis: {
    band: "report-summary-band-analysis",
    foreground: "text-[var(--wz-palette-black)]",
    badge:
      "bg-black/5 text-[var(--wz-palette-black)] ring-black/10",
  },
} as const;

function buildRiskStats(byRisk: Record<RiskLevel, number>): SummaryConfig["stats"] {
  return (["R5", "R4", "R3", "R2", "R1"] as const).flatMap((level) => {
    const count = byRisk[level] ?? 0;
    if (count === 0) return [];
    return [
      {
        label: level,
        value: String(count),
        tone:
          level === "R5" || level === "R4"
            ? ("high" as const)
            : level === "R3"
              ? ("medium" as const)
              : ("neutral" as const),
      },
    ];
  });
}

type Translator = ReturnType<typeof useLocale>["t"];

function buildConfig(block: ReportBlock, t: Translator): SummaryConfig {
  if (block.kind === "project-work-report") return { eyebrow: getManagerTaskLabel(block.taskKind, block.projectStage), icon: IconChecklist, accent: "text-neutral-700", stats: [], variant: "analysis" };
  if (block.kind === "question-report") {
    return { eyebrow: "关注问题专题", icon: IconChecklist, accent: "text-neutral-700", stats: [], variant: "analysis" };
  }
  if (block.kind === "fact-verification") {
    const byRisk: Record<RiskLevel, number> = { R1: 0, R2: 0, R3: 0, R4: 0, R5: 0 };
    block.compares.forEach((item) => {
      byRisk[item.level] = (byRisk[item.level] ?? 0) + 1;
    });
    return {
      eyebrow: t("report.factValidation"),
      icon: IconFactCheck,
      accent: "text-[var(--wz-color-status-info)]",
      stats: [
        { label: t("report.executionChecks"), value: String(block.compares.length) },
        ...buildRiskStats(byRisk),
      ],
      variant: "validation",
    };
  }

  if (block.kind === "challenge-list") {
    const high = block.items.filter((i) => isHighRisk(i.riskLevel)).length;
    const medium = block.items.filter((i) => i.riskLevel === "R3").length;
    return {
      eyebrow: t("report.investmentAnalysis"),
      icon: IconBuilding,
      accent: "text-[var(--wz-color-status-success)]",
      stats: [
        { label: t("report.challengeCount"), value: t("report.itemCount", { count: block.items.length }) },
        { label: "R4/R5", value: t("report.itemCount", { count: high }), tone: high > 0 ? "high" : "neutral" },
        { label: "R3", value: t("report.itemCount", { count: medium }), tone: "medium" },
      ],
      variant: "analysis",
    };
  }

  if (block.kind === "enterprise-analysis") {
    const elevated = block.dimensions.filter((d) => isElevatedRisk(d.level)).length;
    return {
      eyebrow: block.reportLabel ?? t("report.enterpriseAnalysis"),
      icon: IconBuilding,
      accent: "text-[var(--wz-color-status-success)]",
      stats: [
        { label: t("report.dimensions"), value: String(block.dimensions.length) },
        {
          label: t("report.r3Plus"),
          value: String(elevated),
          tone: elevated > 0 ? "high" : "neutral",
        },
        { label: t("report.keyFindings"), value: String(block.highlights.length) },
      ],
      variant: "analysis",
    };
  }

  if (block.kind === "diligence-report") {
    const verSummary = summarizeVerificationCards(block);
    if (verSummary) {
      const { total, byRisk } = verSummary;
      return {
        eyebrow: t("report.investmentValidation"),
        icon: IconFactCheck,
        accent: "text-[var(--wz-color-status-info)]",
        stats: [
          { label: t("report.executionChecks"), value: String(total) },
          ...buildRiskStats(byRisk),
        ],
        variant: "validation",
      };
    }
    return {
      eyebrow: t("report.diligenceReview"),
      icon: IconFileCheck,
      accent: "text-[var(--wz-color-status-success)]",
      stats: [
        { label: t("report.reviewSections"), value: String(block.sections.length) },
        { label: t("report.finalRecommendation"), value: block.verdict.recommendation, tone: "high" },
        { label: t("report.citedSources"), value: String(block.citations.length) },
      ],
      variant: "analysis",
    };
  }

  // valuation
  return {
    eyebrow: t("report.valuation"),
    icon: IconCalculator,
    accent: "text-[var(--wz-color-status-warning)]",
    stats: [
      { label: t("report.methods"), value: t("report.methodCount", { count: block.methods.length }) },
      { label: t("report.range"), value: extractRange(block.conclusion) ?? "—" },
    ],
  };
}

/** 从结论文案中粗略截取「9.4 – 12.1 亿元」这类区间字符串 */
function extractRange(conclusion: string): string | null {
  const match = conclusion.match(/([\d.]+\s*[–\-~至]\s*[\d.]+\s*(?:亿|万)?元?)/);
  return match ? match[1].replace(/\s+/g, "") : null;
}

const toneClass: Record<NonNullable<SummaryConfig["stats"][number]["tone"]>, string> = {
  default: "text-[var(--wz-color-text-primary)]",
  neutral: "text-[color:var(--wz-color-text-tertiary)]",
  high: "text-[var(--wz-color-status-danger)]",
  medium: "text-[var(--wz-color-status-warning)]",
};

export function ReportSummaryCard({
  block,
  onOpen,
  surface = "default",
  sourceLabel,
  createdAt,
  isNew,
  onAnimated,
  followUpContent,
}: ReportSummaryCardProps) {
  const { locale, t } = useLocale();
  const cfg = buildConfig(block, t);
  const showHistoryMeta = Boolean(sourceLabel || createdAt);
  const hideReportExcerpt =
    block.kind === "fact-verification" ||
    block.kind === "enterprise-analysis" ||
    block.kind === "diligence-report";
  const isFeatureReport = Boolean(cfg.variant);
  const featureMeta = cfg.variant ? featureVariantMeta[cfg.variant] : null;
  const primaryStat = cfg.stats[0];
  const tagStats = cfg.stats.slice(1);
  const hasFollowUpContent = followUpContent != null;
  const isConversationFeatureReport = surface === "conversation" && isFeatureReport;

  return (
    <div
      data-report-card={cfg.variant ?? "standard"}
      data-report-surface={surface}
      className={cn(
        "relative",
        isConversationFeatureReport && "w-full max-w-[680px]",
        isNew && "animate-report-card-ring",
        isNew && cfg.variant === "validation" && "report-card-ring-validation",
        isNew && cfg.variant === "analysis" && "report-card-ring-analysis",
        isNew && !cfg.variant && "report-card-ring-standard",
        hasFollowUpContent &&
          "overflow-hidden rounded-[var(--wz-radius-lg)] border border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-surface)] shadow-[var(--wz-shadow-sm)]",
        hasFollowUpContent &&
          isConversationFeatureReport &&
          "transition-[border-color,box-shadow] [transition-duration:var(--wz-duration-normal)] [transition-timing-function:var(--wz-ease-standard)] hover:border-[var(--wz-color-border-strong)] hover:shadow-[var(--wz-shadow-md)] motion-reduce:transition-none"
      )}
      onAnimationEnd={(e) => {
        if (isNew && e.animationName === "report-card-ring") {
          onAnimated?.();
        }
      }}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label={t("report.viewLabel", { title: block.title })}
        className={cn(
          "group w-full cursor-pointer overflow-hidden text-left transition-[background-color,border-color,box-shadow] [transition-duration:var(--wz-duration-normal)] [transition-timing-function:var(--wz-ease-standard)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--wz-color-focus-ring)] motion-reduce:transition-none",
          hasFollowUpContent
            ? isConversationFeatureReport
              ? "rounded-none border-0 bg-transparent focus-visible:ring-inset"
              : "rounded-none border-0 border-b border-b-transparent bg-[var(--wz-color-bg-surface)] hover:border-b-[var(--wz-color-border-strong)] hover:bg-[var(--wz-color-bg-subtle)] focus-visible:ring-inset"
            : isConversationFeatureReport
              ? "rounded-[var(--wz-radius-lg)] border border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-surface)] shadow-[var(--wz-shadow-sm)] hover:border-[var(--wz-color-border-strong)] hover:shadow-[var(--wz-shadow-md)] focus-visible:ring-offset-2"
              : "rounded-[var(--wz-radius-lg)] border border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-surface)] shadow-[var(--wz-shadow-sm)] hover:border-[var(--wz-color-border-strong)] hover:bg-[var(--wz-color-bg-subtle)] hover:shadow-[var(--wz-shadow-md)] focus-visible:ring-offset-2"
        )}
      >
        {isConversationFeatureReport ? (
          <>
            <div
              className={cn(
                "flex h-16 items-center justify-between gap-4 px-4 sm:px-5",
                featureMeta?.band,
                featureMeta?.foreground
              )}
            >
              <span className="flex min-w-0 items-center gap-3">
                <AppIcon icon={cfg.icon} size={24} className="shrink-0" />
                <span className="truncate text-[length:var(--wz-font-size-subtitle)] font-semibold leading-5">
                  {cfg.eyebrow}
                </span>
              </span>

            </div>

            <div className="relative -mt-2 min-h-[76px] rounded-t-[var(--wz-radius-lg)] bg-[var(--wz-color-bg-surface)] px-4 pb-2 pt-4 sm:min-h-[92px] sm:px-5">
              <h3 className="line-clamp-2 text-[length:var(--wz-font-size-section)] font-semibold leading-[26px] text-[var(--wz-color-text-primary)]">
                {block.title}
              </h3>
              {"summary" in block && block.summary && (
                <p className="mt-1 line-clamp-1 text-[length:var(--wz-font-size-body)] leading-5 text-[color:var(--wz-color-text-tertiary)]">
                  {block.summary}
                </p>
              )}
            </div>

            <div className="flex min-h-14 flex-col items-stretch gap-3 bg-[var(--wz-color-bg-surface)] px-4 pb-4 pt-2 sm:flex-row sm:items-center sm:justify-between sm:gap-5 sm:px-5">
              <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-4 gap-y-2">
                {cfg.stats.map((stat) => (
                  <span key={stat.label} className="inline-flex items-baseline gap-1.5">
                    <span className="text-[length:var(--wz-font-size-caption)] font-medium text-[color:var(--wz-color-text-tertiary)]">
                      {stat.label}
                    </span>
                    <span className="text-[length:var(--wz-font-size-body)] font-semibold tabular-nums text-[var(--wz-color-text-primary)]">
                      {stat.value}
                    </span>
                  </span>
                ))}
              </span>

              <span className="inline-flex h-8 w-full shrink-0 items-center justify-center gap-1.5 rounded-[var(--wz-radius-md)] border border-[var(--wz-color-border-default)] bg-transparent px-3.5 text-[length:var(--wz-font-size-body)] font-medium text-[color:var(--wz-color-text-secondary)] transition-[background-color,border-color,color] [transition-duration:var(--wz-duration-fast)] [transition-timing-function:var(--wz-ease-standard)] group-hover:border-[var(--wz-color-border-strong)] group-hover:bg-[var(--wz-color-bg-subtle)] group-hover:text-[var(--wz-color-text-primary)] group-focus-visible:border-[var(--wz-color-border-strong)] group-focus-visible:bg-[var(--wz-color-bg-subtle)] group-focus-visible:text-[var(--wz-color-text-primary)] motion-reduce:transition-none sm:w-auto">
                {t("report.view")}
                <AppIcon
                  icon={IconArrowRight}
                  size={12}
                  className="transition-transform [transition-duration:var(--wz-duration-normal)] [transition-timing-function:var(--wz-ease-standard)] group-hover:translate-x-0.5 group-focus-visible:translate-x-0.5 motion-reduce:transition-none"
                />
              </span>
            </div>
          </>
        ) : isFeatureReport ? (
          <>
            <div
              className={cn(
                "px-4 pb-5 pt-3.5 sm:px-5",
                featureMeta?.band,
                featureMeta?.foreground
              )}
            >
              <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <span className="flex min-w-0 items-center gap-2.5">
                  <AppIcon icon={cfg.icon} size={18} className="shrink-0" />
                  <span className="truncate text-[length:var(--wz-font-size-body)] font-semibold leading-5">
                    {cfg.eyebrow}
                  </span>
                </span>

                <span className="flex shrink-0 items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-[length:var(--wz-font-size-caption)] font-medium text-current opacity-80 transition-opacity [transition-duration:var(--wz-duration-normal)] [transition-timing-function:var(--wz-ease-standard)] group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none">
                    {t("report.view")}
                    <AppIcon
                      icon={IconArrowRight}
                      size={11}
                      className="transition-transform [transition-duration:var(--wz-duration-normal)] [transition-timing-function:var(--wz-ease-standard)] group-hover:translate-x-0.5 group-focus-visible:translate-x-0.5 motion-reduce:transition-none"
                    />
                  </span>
                </span>
              </div>
            </div>

            <div className="relative -mt-2 rounded-t-[var(--wz-radius-lg)] bg-transparent px-4 pb-4 pt-4 sm:px-5">
              <h3 className="line-clamp-2 text-[length:var(--wz-font-size-subtitle)] font-semibold leading-6 text-[var(--wz-color-text-primary)]">
                {block.title}
              </h3>
              {(sourceLabel || createdAt) && (
                <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[length:var(--wz-font-size-caption)] text-[color:var(--wz-color-text-tertiary)]">
                  {sourceLabel && (
                    <span className="max-w-full truncate" title={sourceLabel}>
                      {sourceLabel}
                    </span>
                  )}
                  {sourceLabel && createdAt && <span aria-hidden>·</span>}
                  {createdAt && <span>{formatRelative(createdAt, locale)}</span>}
                </div>
              )}

              <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2">
                {primaryStat && (
                  <span className="inline-flex items-baseline gap-1.5 pr-1 text-[color:var(--wz-color-text-tertiary)]">
                    <span className="text-[length:var(--wz-font-size-caption)] font-medium">{primaryStat.label}</span>
                    <span className="text-[length:var(--wz-font-size-body)] font-semibold tabular-nums text-[var(--wz-color-text-primary)]">
                      {primaryStat.value}
                    </span>
                  </span>
                )}
                {tagStats.map((stat) => (
                  <span
                    key={stat.label}
                    className="inline-flex items-center gap-1 rounded-[var(--wz-radius-md)] bg-[var(--wz-color-bg-subtle)] px-2 py-1 text-[length:var(--wz-font-size-tag)] leading-[var(--wz-line-height-tag)] font-medium text-[color:var(--wz-color-text-secondary)] ring-1 ring-inset ring-[var(--wz-color-border-default)]"
                  >
                    <span>{stat.label}</span>
                    <span className="font-semibold tabular-nums">{stat.value}</span>
                  </span>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="bg-transparent px-5 py-4">
              <div
                className={cn(
                  "flex gap-3",
                  showHistoryMeta ? "items-start justify-between" : "items-center"
                )}
              >
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                  <AppIcon icon={cfg.icon} size={12} className={cfg.accent} />
                  <span className={cn("text-[length:var(--wz-font-size-caption)] font-semibold", cfg.accent)}>
                    {cfg.eyebrow}
                  </span>
                </div>
                {sourceLabel && (
                  <span
                    className="max-w-[42%] shrink-0 truncate text-right text-[length:var(--wz-font-size-caption)] font-medium text-[color:var(--wz-color-text-tertiary)]"
                    title={sourceLabel}
                  >
                    {sourceLabel}
                  </span>
                )}
              </div>
              <h3 className="mt-2 text-[length:var(--wz-font-size-subtitle)] font-semibold leading-snug text-[var(--wz-color-text-primary)]">
                {block.title}
              </h3>
              {createdAt && (
                <p className="mt-1 text-[length:var(--wz-font-size-caption)] text-[color:var(--wz-color-text-tertiary)]">
                  {formatRelative(createdAt, locale)}
                </p>
              )}
              {!hideReportExcerpt && (
                <p className="mt-1.5 line-clamp-2 text-[length:var(--wz-font-size-body)] leading-relaxed text-[color:var(--wz-color-text-secondary)]">
                  {"summary" in block ? block.summary : ""}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 px-5 py-3">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
                {cfg.stats.map((stat) => (
                  <div key={stat.label} className="flex items-baseline gap-1.5">
                    <span className="text-[length:var(--wz-font-size-caption)] text-[color:var(--wz-color-text-tertiary)]">
                      {stat.label}
                    </span>
                    <span
                      className={cn(
                        "text-[length:var(--wz-font-size-body)] font-semibold tabular-nums",
                        toneClass[stat.tone ?? "default"]
                      )}
                    >
                      {stat.value}
                    </span>
                  </div>
                ))}
              </div>

              <span className="inline-flex shrink-0 items-center gap-1 text-[length:var(--wz-font-size-caption)] font-medium text-[color:var(--wz-color-text-tertiary)] transition-colors [transition-duration:var(--wz-duration-normal)] [transition-timing-function:var(--wz-ease-standard)] group-hover:text-[var(--wz-color-text-primary)] group-focus-visible:text-[var(--wz-color-text-primary)] motion-reduce:transition-none">
                {t("report.viewFull")}
                <AppIcon
                  icon={IconArrowRight}
                  size={11}
                  className="transition-transform [transition-duration:var(--wz-duration-normal)] [transition-timing-function:var(--wz-ease-standard)] group-hover:translate-x-0.5 group-focus-visible:translate-x-0.5 motion-reduce:transition-none"
                />
              </span>
            </div>
          </>
        )}
      </button>
      {hasFollowUpContent && followUpContent}
      {isNew && (
        <span
          aria-hidden
          className="animate-report-card-overlay pointer-events-none absolute inset-0 rounded-[var(--wz-radius-lg)]"
        />
      )}
    </div>
  );
}
