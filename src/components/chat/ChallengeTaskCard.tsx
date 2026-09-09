import { useEffect, useRef, useState } from "react";

import { AppIcon } from "@/src/components/ui/app-icon";
import {
  IconCalculator,
  IconChallenge,
  IconClose,
  IconFactCheck,
  IconFileCheck,
} from "@/src/lib/icons";
import { getReportProcessPhaseIndex } from "@/src/lib/report-process";
import {
  getYaojuCrossValidationStageIndex,
  getYaojuDemoStageIndex,
} from "@/src/data/yaoju-validation-demo";
import { cn } from "@/src/lib/utils";
import { useLocale } from "@/src/lib/i18n";
import { PROCESS_PROGRESS_FILL_CLASS } from "@/src/components/chat/process-card-styles";
import type { RunningTask, RunningTaskKind } from "@/src/types";

/** 模块加载时刻：之前已存在的任务（startedAt < 此值）不再播放进场动画 */
const MODULE_LOADED_AT = Date.now();

interface ChallengeTaskCardProps {
  task: RunningTask;
  /** 任务所在项目的名称（卡片标题展示） */
  projectName?: string;
  /** 点击卡片可跳转到对应对话查看上下文 */
  onOpen?: () => void;
  /** 用户在二次确认后取消该任务（移除任务 + 在对话中提示「任务已取消」） */
  onCancel?: (task: RunningTask) => void;
  className?: string;
}

const KIND_META: Record<
  RunningTaskKind,
  { label: string; tone: string; icon: typeof IconChallenge }
> = {
  challenge: {
    label: "挑战质询任务",
    tone: "border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-surface)]",
    icon: IconChallenge,
  },
  "fact-check": {
    label: "事实交叉验证任务",
    tone: "border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-surface)]",
    icon: IconFactCheck,
  },
  valuation: {
    label: "估值平行测算任务",
    tone: "border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-surface)]",
    icon: IconCalculator,
  },
  "investment-report": {
    label: "投资分析报告",
    tone: "border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-surface)]",
    icon: IconFileCheck,
  },
};

/** 每种任务的分阶段描述，根据当前 progress 切换 */
const TASK_PHASES: Record<RunningTaskKind, Array<{ min: number; text: string }>> = {
  challenge: [
    { min: 0, text: "正在从知识库召回相关材料…" },
    { min: 25, text: "正在比对议案、BP 与 FDD 的关键假设…" },
    { min: 55, text: "正在生成核心矛盾与风险维度…" },
    { min: 80, text: "正在按当前风险口径整理质询清单与条款建议…" },
  ],
  "fact-check": [
    { min: 0, text: "正在召回议案 / BP / FDD / 审计报告…" },
    { min: 25, text: "正在抽取关键数据字段（营收 / 现金流 / 客户）…" },
    { min: 55, text: "正在做多源交叉比对，定位偏差点…" },
    { min: 80, text: "正在生成差异清单与处置建议…" },
  ],
  valuation: [
    { min: 0, text: "正在加载 NTM 营收与对标公司清单…" },
    { min: 25, text: "正在执行 VC 倒算法…" },
    { min: 55, text: "正在跑 PS 对比与 PTA 三种方法…" },
    { min: 80, text: "正在合并结论区间…" },
  ],
  "investment-report": [
    { min: 0, text: "正在读取项目与交易材料…" },
    { min: 20, text: "正在形成投资问题与初步判断…" },
    { min: 40, text: "正在建立独立估值区间…" },
    { min: 60, text: "正在并行开展外部研究…" },
    { min: 80, text: "正在做压力测试并生成报告…" },
  ],
};

const EN_KIND_LABELS: Record<RunningTaskKind, string> = {
  challenge: "Challenge Review",
  "fact-check": "Cross-Validation",
  valuation: "Parallel Valuation",
  "investment-report": "Investment Analysis Report",
};

const EN_TASK_PHASES: Record<RunningTaskKind, Array<{ min: number; text: string }>> = {
  challenge: [
    { min: 0, text: "Retrieving relevant materials from the knowledge base…" },
    { min: 25, text: "Comparing key assumptions across the memo, business plan, and FDD…" },
    { min: 55, text: "Identifying core tensions and risk dimensions…" },
    { min: 80, text: "Drafting challenge questions and deal protections for the selected risk standard…" },
  ],
  "fact-check": [
    { min: 0, text: "Retrieving the investment memo, business plan, FDD, and audit report…" },
    { min: 25, text: "Extracting revenue, cash flow, and customer data…" },
    { min: 55, text: "Cross-checking sources and identifying discrepancies…" },
    { min: 80, text: "Drafting the discrepancy list and recommended actions…" },
  ],
  valuation: [
    { min: 0, text: "Loading NTM revenue and the comparable-company set…" },
    { min: 25, text: "Running the venture-capital backsolve…" },
    { min: 55, text: "Running PS comparables and PTA analyses…" },
    { min: 80, text: "Consolidating the valuation ranges…" },
  ],
  "investment-report": [
    { min: 0, text: "Reading project and transaction materials…" },
    { min: 20, text: "Defining the investment questions and preliminary view…" },
    { min: 40, text: "Building an independent valuation range…" },
    { min: 60, text: "Running external research in parallel…" },
    { min: 80, text: "Stress-testing assumptions and generating the report…" },
  ],
};

function getPhaseText(
  kind: RunningTaskKind,
  progress: number,
  english: boolean
): string {
  const phases = english ? EN_TASK_PHASES[kind] : TASK_PHASES[kind];
  let current = phases[0].text;
  for (const p of phases) {
    if (progress >= p.min) current = p.text;
  }
  return current;
}

function formatElapsed(startedAt: string, nowMs: number) {
  const startMs = new Date(startedAt).getTime();
  const sec = Math.max(0, Math.round((nowMs - startMs) / 1000));
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  const rest = sec - min * 60;
  return `${min}m ${rest}s`;
}

export function ChallengeTaskCard({
  task,
  projectName,
  onOpen,
  onCancel,
  className,
}: ChallengeTaskCardProps) {
  const { locale } = useLocale();
  const [now, setNow] = useState<number>(() => Date.now());
  const [shouldAnimate] = useState(
    () => new Date(task.startedAt).getTime() >= MODULE_LOADED_AT - 1500
  );
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const cancelTriggerRef = useRef<HTMLButtonElement>(null);
  const keepTaskRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (confirmingCancel) keepTaskRef.current?.focus();
  }, [confirmingCancel]);

  const closeCancelConfirmation = () => {
    setConfirmingCancel(false);
    window.requestAnimationFrame(() => cancelTriggerRef.current?.focus());
  };

  const meta = KIND_META[task.kind];
  const Icon = meta.icon;
  const elapsed = formatElapsed(task.startedAt, now);
  const pct = Math.min(100, Math.max(0, Math.round(task.progress)));
  const isReportTask = Boolean(task.process);
  const processPhase = task.process
    ? task.process.phases[
        task.demoKind === "yaoju-cross-validation"
          ? getYaojuCrossValidationStageIndex(pct)
          : task.demoKind === "yaoju-investment-analysis"
            ? getYaojuDemoStageIndex(pct)
            : getReportProcessPhaseIndex(pct, task.process.phases.length)
      ]
    : null;
  const phase = processPhase?.activeText ?? getPhaseText(task.kind, pct, locale === "en-US");
  const kindLabel = locale === "en-US" ? EN_KIND_LABELS[task.kind] : meta.label;
  const heading = projectName ? `${projectName} · ${kindLabel}` : kindLabel;

  return (
    <div
      className={cn(
        "group relative w-full rounded-[var(--wz-radius-lg)] border px-3 py-2.5 text-left shadow-[var(--wz-shadow-sm)] transition-[border-color,box-shadow] [transition-duration:var(--wz-duration-normal)] [transition-timing-function:var(--wz-ease-standard)] hover:border-[var(--wz-color-border-strong)] hover:shadow-[var(--wz-shadow-md)]",
        meta.tone,
        shouldAnimate && "animate-task-card-reveal",
        className
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        className="block w-full rounded-[var(--wz-radius-md)] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--wz-color-focus-ring)]"
        aria-label={locale === "en-US"
          ? `Open task conversation: ${heading}. Current progress ${pct}%`
          : `查看任务对话：${heading}，当前进度 ${pct}%`}
      >
        <span className="flex items-center justify-between gap-2">
          {/* 标题区：右侧预留 6 / hover 时让出 14 空间给 ✕ 按钮，避免与百分比/取消按钮重叠 */}
          <span
            className={cn(
              "inline-flex min-w-0 items-center gap-1 truncate text-[length:var(--wz-font-size-body)] font-semibold text-[var(--wz-color-text-primary)]",
              onCancel ? "pr-1 group-hover:pr-6 group-focus-within:pr-6" : "pr-1"
            )}
          >
            <AppIcon
              icon={Icon}
              size={12}
              className="shrink-0 text-[color:var(--wz-color-text-secondary)]"
            />
            <span className="truncate">{heading}</span>
          </span>
          {/* 百分比常态展示在右上角；hover 时被 ✕ 按钮覆盖（淡出避免重叠） */}
          <span
            className={cn(
              "shrink-0 text-[length:var(--wz-font-size-caption)] font-medium tabular-nums transition-opacity [transition-duration:var(--wz-duration-fast)] [transition-timing-function:var(--wz-ease-standard)]",
              "text-[var(--wz-color-status-running)]",
              onCancel && "group-hover:opacity-0 group-focus-within:opacity-0"
            )}
          >
            {pct}%
          </span>
        </span>

        <span className="mt-1.5 block min-w-0 text-[length:var(--wz-font-size-caption)] leading-relaxed text-[color:var(--wz-color-text-secondary)]">
          <span className="line-clamp-1">{phase}</span>
        </span>

        <span
          aria-hidden
          className="mt-2 block h-1.5 w-full overflow-hidden rounded-full bg-[var(--wz-color-border-default)]"
        >
          <span
            className={cn(
              "demo-progress-flow block",
              PROCESS_PROGRESS_FILL_CLASS,
              isReportTask
                ? "bg-[var(--invest-progress-report)]"
                : "task-progress-flow bg-[var(--wz-color-status-running)]"
            )}
            style={{ transform: `scaleX(${pct / 100})` }}
          />
        </span>

        <span className="mt-1.5 block text-[length:var(--wz-font-size-caption)] text-[color:var(--wz-color-text-tertiary)]">
          {locale === "en-US" ? "Elapsed" : "已运行"} {elapsed}
        </span>
      </button>

      {onCancel && !confirmingCancel && (
        <button
          ref={cancelTriggerRef}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setConfirmingCancel(true);
          }}
          className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-[var(--wz-radius-md)] text-[color:var(--wz-color-text-tertiary)] opacity-0 transition-[background-color,color,opacity] [transition-duration:var(--wz-duration-fast)] [transition-timing-function:var(--wz-ease-standard)] hover:bg-[var(--wz-color-status-danger-subtle)] hover:text-[var(--wz-color-status-danger)] focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--wz-color-focus-ring)] group-hover:opacity-100"
          aria-label={locale === "en-US" ? "Cancel task" : "取消任务"}
          title={locale === "en-US" ? "Cancel task" : "取消任务"}
        >
          <AppIcon icon={IconClose} size={12} />
        </button>
      )}

      {confirmingCancel && (
        <div
          className="mt-2.5 flex items-center justify-between gap-2 rounded-[var(--wz-radius-lg)] border border-[var(--wz-color-status-danger)] bg-[var(--wz-color-status-danger-subtle)] px-2.5 py-1.5 text-[length:var(--wz-font-size-caption)] text-[var(--wz-color-status-danger)]"
          role="group"
          aria-label={locale === "en-US" ? "Confirm task cancellation" : "取消任务确认"}
          onKeyDown={(event) => {
            if (event.key === "Escape") closeCancelConfirmation();
          }}
        >
          <span className="line-clamp-1">
            {locale === "en-US" ? "Cancel this task?" : "确认取消该任务？"}
          </span>
          <div className="flex shrink-0 items-center gap-1">
            <button
              ref={keepTaskRef}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                closeCancelConfirmation();
              }}
              className="h-6 rounded-[var(--wz-radius-md)] border border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-surface)] px-2 text-[length:var(--wz-font-size-caption)] font-medium text-[color:var(--wz-color-text-secondary)] transition-colors [transition-duration:var(--wz-duration-fast)] hover:bg-[var(--wz-color-bg-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--wz-color-focus-ring)]"
            >
              {locale === "en-US" ? "Keep" : "保留"}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCancel?.(task);
              }}
              className="h-6 rounded-[var(--wz-radius-md)] bg-[var(--wz-color-status-danger)] px-2 text-[length:var(--wz-font-size-caption)] font-medium text-[var(--wz-color-text-inverse)] transition-[filter] [transition-duration:var(--wz-duration-fast)] hover:brightness-[0.92] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--wz-color-focus-ring)]"
            >
              {locale === "en-US" ? "Cancel task" : "确认取消"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
