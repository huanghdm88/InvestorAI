import { useEffect, useState } from "react";

import { ReportContent } from "@/src/components/chat/ReportContent";
import { Button } from "@/src/components/ui/button";
import { AppIcon } from "@/src/components/ui/app-icon";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/src/components/ui/sheet";
import type { ReportBlock } from "@/src/lib/project-reports";
import {
  IconBuilding,
  IconCalculator,
  IconClose,
  IconDownload,
  IconFactCheck,
  IconShieldAlert,
} from "@/src/lib/icons";
import { cn, formatRelative } from "@/src/lib/utils";
import { useLocale } from "@/src/lib/i18n";
import { getManagerTaskLabel } from "@/src/lib/manager-tasks";
import type { SourceAnchor } from "@/src/types";

export interface ReportDrawerMeta {
  sourceLabel?: string;
  createdAt?: string;
}

interface ReportDrawerProps {
  block: ReportBlock | null;
  meta?: ReportDrawerMeta | null;
  onClose: () => void;
  onViewSource: (anchor: SourceAnchor) => void;
  onDownload?: () => void;
  returnFocusTo?: HTMLElement | null;
}

const headerMeta = {
  "project-work-report": { eyebrow: "项目分析", icon: IconFactCheck, detailHint: "基于已有项目材料整理的演示产物，保留本次要求和来源，不代表新增核验。" },
  "question-report": { eyebrow: "关注问题专题", icon: IconFactCheck, detailHint: "保留本次追问、结论、条件路径与引用材料；演示内容不代表新增核验结果。" },
  "fact-verification": {
    eyebrow: "事实交叉验证 · Fact Verification",
    icon: IconFactCheck,
    detailHint:
      "完整报告包含多源数据对照表、R4/R5 级偏差展开说明与证据锚点，可点击引用跳转原文。",
  },
  "challenge-list": {
    eyebrow: "投资分析报告 · Investment Analysis",
    icon: IconBuilding,
    detailHint:
      "完整报告按 R1–R5 风险等级列出灵魂质询条目，含底层矛盾、证据底座与条款 / 对赌建议。",
  },
  valuation: {
    eyebrow: "估值平行测算 · Valuation",
    icon: IconCalculator,
    detailHint: "完整报告展示多种测算方法、关键假设与综合估值区间，不提供单一推荐值。",
  },
  "enterprise-analysis": {
    eyebrow: "企业分析评估 · Enterprise Assessment",
    icon: IconBuilding,
    detailHint:
      "基于最新企业信息、风险口径与知识库全量重算，输出分维度评估与关键结论。",
  },
  "diligence-report": {
    eyebrow: "尽调复核报告 · Diligence Review",
    icon: IconShieldAlert,
    detailHint:
      "对原始投决 / 尽调材料做独立复核：左侧目录可快捷跳转，章节可折叠，关键数字以可视化呈现，引用悬停看来源、点击跳转原文。",
  },
} as const;

export function ReportDrawer({
  block,
  meta,
  onClose,
  onViewSource,
  onDownload,
  returnFocusTo,
}: ReportDrawerProps) {
  const { locale } = useLocale();
  const open = block !== null;

  const [lastBlock, setLastBlock] = useState<ReportBlock | null>(null);
  const [lastMeta, setLastMeta] = useState<ReportDrawerMeta | null>(null);
  useEffect(() => {
    if (block) {
      setLastBlock(block);
      if (meta) setLastMeta(meta);
    }
  }, [block, meta]);

  const showable = block ?? lastBlock;
  const displayMeta = meta ?? lastMeta;
  const englishHeaderMeta = {
    "project-work-report": { eyebrow: "Project Analysis", detailHint: "Demo output using existing project materials; no new verification is implied." },
    "question-report": { eyebrow: "Question Review", detailHint: "The follow-up, conclusion, conditional paths and cited materials; no new verification is implied." },
    "fact-verification": { eyebrow: "Cross Validation", detailHint: "Compare reported values with independent evidence, expand material R4/R5 discrepancies, and open source anchors." },
    "challenge-list": { eyebrow: "Investment Analysis Report", detailHint: "Review the investment thesis, core tensions, evidence base, and proposed deal protections, prioritized by R1–R5 risk." },
    valuation: { eyebrow: "Parallel Valuation", detailHint: "Compare valuation methods, key assumptions, and the combined range without forcing a single recommended price." },
    "enterprise-analysis": { eyebrow: "Company Assessment", detailHint: "Review the latest company information, risk assumptions, knowledge-base evidence, and dimension-level conclusions." },
    "diligence-report": { eyebrow: "Diligence Review", detailHint: "Navigate the independent review by section, inspect key metrics, and open sentence-level source evidence." },
  } as const;
  const baseHeaderMeta = showable
    ? {
        ...headerMeta[showable.kind],
        ...(locale === "en-US" ? englishHeaderMeta[showable.kind] : null),
        ...(showable.kind === "project-work-report" ? { eyebrow: getManagerTaskLabel(showable.taskKind, showable.projectStage) } : null),
      }
    : null;
  const hm =
    showable?.kind === "enterprise-analysis" && showable.reportLabel
      ? {
          ...(baseHeaderMeta ?? headerMeta["enterprise-analysis"]),
          eyebrow: `${showable.reportLabel} · Investment Analysis`,
          detailHint:
            locale === "en-US"
              ? "Synthesize project materials, specialist Agent research, and Investor AI judgment into dimension-level findings, risk conditions, and an investment recommendation."
              : "基于项目材料、专业 Agent 研究与投资官AI聚合判断，输出分维度分析、风险条件和投资建议。",
        }
      : baseHeaderMeta;
  const hideChrome =
    showable?.kind === "diligence-report" && showable.hideChrome === true;

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
        className={cn(
          "max-w-[96vw] bg-[var(--wz-color-bg-surface)] p-0",
          showable?.kind === "diligence-report" ? "w-[1040px]" : "w-[760px]"
        )}
      >
        <SheetTitle className="sr-only">
          {showable?.title ?? (locale === "en-US" ? "Report details" : "报告详情")}
        </SheetTitle>
        <SheetDescription className="sr-only">
          {hm?.detailHint ?? (locale === "en-US" ? "View full report" : "查看完整报告")}
        </SheetDescription>
        {showable && hm && (
          <>
            <div className="flex items-start justify-between gap-4 border-b border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-surface)] px-6 py-4">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[length:var(--wz-font-size-xs)] font-medium text-[color:var(--wz-color-text-secondary)]">
                  <AppIcon icon={hm.icon} size={11} />
                  {hm.eyebrow}
                </div>
                <h2 className="mt-1.5 truncate text-[length:var(--wz-font-size-lg)] font-semibold leading-[var(--wz-line-height-tight)] text-[var(--wz-color-text-primary)]">
                  {showable.title}
                </h2>
                {!hideChrome && showable.summary && (
                  <p className="mt-1 line-clamp-2 text-[length:var(--wz-font-size-xs)] leading-[var(--wz-line-height-normal)] text-[color:var(--wz-color-text-secondary)]">
                    {showable.summary}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {onDownload && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={onDownload}
                    aria-label={locale === "en-US" ? "Export HTML" : "导出 HTML"}
                    title={locale === "en-US" ? "Export as HTML" : "导出为 HTML"}
                  >
                    <AppIcon icon={IconDownload} size={13} />
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={onClose}
                  aria-label={locale === "en-US" ? "Close" : "关闭"}
                  title={locale === "en-US" ? "Close (Esc)" : "关闭 (Esc)"}
                >
                  <AppIcon icon={IconClose} size={13} />
                </Button>
              </div>
            </div>

            <div className="thin-scroll min-h-0 flex-1 overflow-y-auto bg-[var(--wz-color-bg-subtle)] px-6 py-6">
              {!hideChrome && (
                <ReportDetailMeta
                  sourceLabel={displayMeta?.sourceLabel}
                  createdAt={displayMeta?.createdAt}
                />
              )}

              <ReportContent block={showable} onViewSource={onViewSource} />
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function ReportDetailMeta({
  sourceLabel,
  createdAt,
}: {
  sourceLabel?: string;
  createdAt?: string;
}) {
  const { locale } = useLocale();
  if (!sourceLabel && !createdAt) return null;
  return (
    <div className="mb-5">
      {(sourceLabel || createdAt) && (
        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-[length:var(--wz-font-size-xs)]">
          {sourceLabel && (
            <div>
              <dt className="text-[color:var(--wz-color-text-tertiary)]">{locale === "en-US" ? "Source" : "来源"}</dt>
              <dd className="font-medium text-[var(--wz-color-text-primary)]">{sourceLabel}</dd>
            </div>
          )}
          {createdAt && (
            <div>
              <dt className="text-[color:var(--wz-color-text-tertiary)]">{locale === "en-US" ? "Generated" : "生成时间"}</dt>
              <dd className="font-medium text-[var(--wz-color-text-primary)]">
                {formatRelative(createdAt, locale)}
              </dd>
            </div>
          )}
        </dl>
      )}
    </div>
  );
}
