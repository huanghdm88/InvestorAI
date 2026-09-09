import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";

import { AppIcon } from "@/src/components/ui/app-icon";
import { Button } from "@/src/components/ui/button";
import {
  YAOJU_CLAIMS,
  YAOJU_CROSS_VALIDATION_TIMELINE,
  YAOJU_DEMO_TIMELINE,
  YAOJU_REPORT_META,
  getYaojuCrossValidationStageIndex,
  getYaojuDemoStageIndex,
  getYaojuDemoAgents,
  getYaojuAgentRuntime,
  type YaojuDemoAgent,
} from "@/src/data/yaoju-validation-demo";
import { YaojuAgentAvatar } from "@/src/components/chat/YaojuAgentAvatar";
import {
  FRAMEWORK_SUBTASK_CARD_CLASS,
  FRAMEWORK_SUBTASK_DESCRIPTION_CLASS,
  FRAMEWORK_SUBTASK_INNER_CARD_CLASS,
  FRAMEWORK_SUBTASK_TITLE_CLASS,
  PROCESS_COLLAPSE_BUTTON_CLASS,
  PROCESS_HEADER_CLASS,
  PROCESS_HEADER_ICON_CLASS,
  PROCESS_KICKER_CLASS,
  PROCESS_PROGRESS_FILL_CLASS,
  PROCESS_PROGRESS_TRACK_CLASS,
  PROCESS_SHELL_CLASS,
} from "@/src/components/chat/process-card-styles";
import {
  ProcessStageStatusBadge,
  ProcessStageTracker,
  type ProcessStageState,
} from "@/src/components/chat/process-stage-primitives";
import {
  IconAuto,
  IconCheck,
  IconCheckCircle,
  IconChevronDown,
  IconDatabase,
  IconFactCheck,
  IconRefresh,
  IconStop,
  IconTree,
} from "@/src/lib/icons";
import { cn } from "@/src/lib/utils";
import { useLocale } from "@/src/lib/i18n";
import {
  localizeYaojuAgents,
  localizeYaojuClaims,
  localizeYaojuRuntime,
  translateContentText,
  translateVerificationVerdict,
} from "@/src/lib/content-localization";
import type {
  AssistantBlock,
  ValidationDemoDetail,
} from "@/src/types";

type DemoBlock = Extract<AssistantBlock, { kind: "validation-demo" }>;

interface CrossValidationDemoCardProps {
  block: DemoBlock;
  onOpenDetail?: (detail: ValidationDemoDetail) => void;
  onAutoCloseDetail?: (taskId?: string) => void;
  taskId?: string;
  autoOpenClaimMap?: boolean;
  className?: string;
}

type DemoStageState = ProcessStageState;

const INVESTMENT_STAGES = [
  { title: "理解报告" },
  { title: "主张地图" },
  { title: "编排策略" },
  { title: "Agent 执行" },
  { title: "聚合报告" },
] as const;

const VALIDATION_STAGES = [
  { title: "理解报告" },
  { title: "主张地图" },
  { title: "知识库比对" },
  { title: "生成报告" },
] as const;

// The claim map is the live workspace anchor. Keep its detail visible while
// allowing the other process stages to retain their independent collapse state.
const ALWAYS_OPEN_STAGE_INDEX = 1;

function getVisibleClaimCount(progress: number, completed: boolean) {
  if (completed || progress >= YAOJU_DEMO_TIMELINE.claimsEnd) return YAOJU_CLAIMS.length;
  if (progress <= YAOJU_DEMO_TIMELINE.intentEnd) return 0;
  return Math.min(
    YAOJU_CLAIMS.length,
    Math.ceil(
      ((progress - YAOJU_DEMO_TIMELINE.intentEnd) /
        (YAOJU_DEMO_TIMELINE.claimsEnd - YAOJU_DEMO_TIMELINE.intentEnd)) *
        YAOJU_CLAIMS.length
    )
  );
}

const STRATEGY_STEPS = [
  {
    title: "为每条路径设定证据底线",
    detail: "原报告只能作为线索，结论至少需要独立材料或重新计算支撑。",
  },
  {
    title: "先处理会改变交易结论的主张",
    detail: "优先核验收入真实性、IP 权属和估值回报三个决策敏感项。",
  },
  {
    title: "统一质量门与交付标准",
    detail: "所有结果都需要标明来源、统一口径，并给出可供投资官AI聚合的明确结论。",
  },
] as const;

function StrategyScene({
  progress,
  state,
}: {
  progress: number;
  state: DemoStageState;
}) {
  const { locale } = useLocale();
  const strategySteps =
    locale === "en-US"
      ? [
          {
            title: "Set an evidence threshold for every workstream",
            detail: "Treat the source report as a lead; require independent evidence or recalculation for each conclusion.",
          },
          {
            title: "Prioritize claims that can change the deal decision",
            detail: "Validate revenue authenticity, IP ownership, valuation, and returns first.",
          },
          {
            title: "Use one quality gate and delivery standard",
            detail: "Every result must cite sources, use consistent definitions, and provide a clear synthesis input.",
          },
        ]
      : STRATEGY_STEPS;
  const localProgress = Math.max(0, progress - YAOJU_DEMO_TIMELINE.claimsEnd);
  const visibleStrategyCount = Math.min(
    strategySteps.length,
    Math.max(1, Math.ceil(localProgress / 2.2))
  );

  return (
    <div className={FRAMEWORK_SUBTASK_CARD_CLASS}>
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn("min-w-0", FRAMEWORK_SUBTASK_TITLE_CLASS)}>
            {locale === "en-US" ? "Investor AI · Investment Analysis Strategy" : "投资官AI · 投资分析策略"}
          </p>
          <ProcessStageStatusBadge state={state} />
        </div>
        <p className={FRAMEWORK_SUBTASK_DESCRIPTION_CLASS}>
          {locale === "en-US" ? "Set evidence standards, priorities, and a consistent delivery format" : "先设定证据标准、分析优先级与统一交付口径"}
        </p>

        <ol className="mt-2.5 grid gap-2">
          {strategySteps.slice(0, visibleStrategyCount).map((step, index) => {
            return (
              <li
                key={step.title}
                className={cn(
                  FRAMEWORK_SUBTASK_INNER_CARD_CLASS,
                  "flex gap-3 !pl-1 animate-task-card-reveal motion-reduce:animate-none"
                )}
              >
                <span className="w-5 shrink-0 pt-px text-right font-mono text-[length:var(--wz-font-size-caption)] font-medium tabular-nums text-[color:var(--wz-color-text-tertiary)]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0">
                  <span className="block text-[length:var(--wz-font-size-body)] font-semibold leading-5 text-[var(--wz-color-text-primary)]">{step.title}</span>
                  <span className="mt-1 block text-[length:var(--wz-font-size-body)] leading-5 text-[color:var(--wz-color-text-secondary)]">{step.detail}</span>
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

function IntentScene({
  mode,
  state,
  onOpenDetail,
}: Pick<CrossValidationDemoCardProps, "onOpenDetail"> & {
  mode: "investment-analysis" | "cross-validation";
  state: DemoStageState;
}) {
  const { locale } = useLocale();
  const intentText =
    mode === "cross-validation"
      ? locale === "en-US"
        ? "Test whether the report's key claims support proceeding with conditions, and identify evidence gaps that could change valuation or deal terms."
        : YAOJU_REPORT_META.inferredIntent
      : locale === "en-US"
        ? "Form an independent investment view from the uploaded materials, focusing on growth quality, product moat, valuation returns, and risks that could change the deal decision."
        : "基于上传材料形成独立投资判断，重点分析增长质量、产品壁垒、估值回报和会改变交易结论的风险条件。";
  return (
    <button
      type="button"
      onClick={() => onOpenDetail?.({ view: "document" })}
      className={cn(
        FRAMEWORK_SUBTASK_CARD_CLASS,
        "group block min-w-0 outline-none transition-[border-color,box-shadow] [transition-duration:var(--wz-duration-normal)] [transition-timing-function:var(--wz-ease-standard)] hover:border-[var(--wz-color-border-default)] focus-visible:shadow-[0_0_0_3px_var(--wz-color-focus-ring)] motion-reduce:transition-none"
      )}
    >
      <span className="min-w-0">
        <span className="flex items-start justify-between gap-2">
          <span className={cn("min-w-0", FRAMEWORK_SUBTASK_TITLE_CLASS)}>
            {locale === "en-US" ? "Investor AI · Task Understanding" : "投资官AI · 任务理解"}
          </span>
          <ProcessStageStatusBadge state={state} />
        </span>
        <span className={FRAMEWORK_SUBTASK_DESCRIPTION_CLASS}>
          {intentText}
        </span>
      </span>
    </button>
  );
}

function ClaimScene({
  visibleCount,
  state,
  onOpenDetail,
}: {
  visibleCount: number;
  state: DemoStageState;
  onOpenDetail?: CrossValidationDemoCardProps["onOpenDetail"];
}) {
  const { locale } = useLocale();
  // Keep the visual state authoritative even when a caller has not yet
  // refreshed the derived `generating` prop during a progress tick.
  const processing = state === "active";
  const title =
    state === "completed"
      ? locale === "en-US"
        ? "Claim map extracted information from the source"
        : "主张地图已从原文提取信息"
      : state === "stopped"
        ? locale === "en-US"
          ? "Claim map extraction stopped"
          : "主张地图已停止提取信息"
        : locale === "en-US"
          ? "Claim map extracting information from the source"
          : "主张地图正在从原文提取信息";

  return (
    <div
      className={cn(
        FRAMEWORK_SUBTASK_CARD_CLASS,
        onOpenDetail &&
          "cursor-pointer outline-none transition-[border-color,box-shadow] [transition-duration:var(--wz-duration-normal)] [transition-timing-function:var(--wz-ease-standard)] hover:border-[var(--wz-color-border-default)] focus-visible:shadow-[0_0_0_3px_var(--wz-color-focus-ring)] motion-reduce:transition-none"
      )}
      role={onOpenDetail ? "button" : undefined}
      tabIndex={onOpenDetail ? 0 : undefined}
      onClick={onOpenDetail ? () => onOpenDetail({ view: "claim-map" }) : undefined}
      onKeyDown={
        onOpenDetail
          ? (event) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              onOpenDetail({ view: "claim-map" });
            }
          : undefined
      }
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <p className={cn("flex min-w-0 flex-1 flex-wrap items-center gap-2", FRAMEWORK_SUBTASK_TITLE_CLASS)}>
              {title}
              {visibleCount > 0 && (
                <span className="rounded-[var(--wz-radius-sm)] bg-[var(--wz-color-bg-subtle)] px-1.5 py-0.5 text-[length:var(--wz-font-size-tag)] leading-[var(--wz-line-height-tag)] font-medium tabular-nums text-[color:var(--wz-color-text-tertiary)]">
                  {locale === "en-US" ? `${visibleCount} nodes` : `${visibleCount} 个节点`}
                </span>
              )}
              <ProcessStageStatusBadge state={state} />
            </p>
          </div>
          <p className={FRAMEWORK_SUBTASK_DESCRIPTION_CLASS}>
            {state === "stopped"
              ? locale === "en-US"
                ? "The claim map was stopped before all source claims could be organized"
                : "主张地图在全部原文主张整理完成前已停止"
              : visibleCount === 0
              ? locale === "en-US" ? "Identifying the first verifiable claims; top-level branches will appear as the analysis progresses" : "正在识别首批可验证信息，一级分类将随 AI 洞察逐步形成"
              : processing
                ? locale === "en-US" ? "Extracting and organizing verifiable claims from the source material" : "正在从原文中持续提取并组织可验证主张"
                : locale === "en-US" ? "Verifiable claims have been extracted and organized from the source material" : "已完成从原文中提取和组织可验证主张"}
          </p>
        </div>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onOpenDetail?.({ view: "claim-map" });
          }}
          aria-busy={processing || undefined}
          aria-label={locale === "en-US" ? (processing ? "Open claim map; extracting information from the source" : "Open claim map") : (processing ? "打开主张地图，主张地图正在从原文提取信息" : "打开主张地图")}
          className={cn(
            "inline-flex h-7 shrink-0 self-center items-center gap-1.5 rounded-[var(--wz-radius-md)] border px-2 text-[length:var(--wz-font-size-tag)] leading-[var(--wz-line-height-tag)] font-medium outline-none transition-[background-color,border-color,box-shadow] [transition-duration:var(--wz-duration-fast)] [transition-timing-function:var(--wz-ease-standard)] focus-visible:shadow-[0_0_0_3px_var(--wz-color-focus-ring)]",
            processing
              ? "border-[var(--wz-color-action-accent)] bg-[var(--wz-color-bg-surface)] text-[var(--wz-color-action-accent)] hover:border-[var(--wz-color-action-accent-hover)] hover:bg-[var(--wz-color-status-info-subtle)] hover:text-[var(--wz-color-action-accent-hover)]"
              : "border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-surface)] text-[color:var(--wz-color-text-secondary)] hover:border-[var(--wz-color-border-strong)] hover:bg-[var(--wz-color-bg-subtle)]"
          )}
        >
          <AppIcon
            icon={processing ? IconRefresh : IconTree}
            size={10}
            className={processing ? "animate-spin motion-reduce:animate-none" : ""}
            aria-hidden="true"
          />
          {locale === "en-US" ? "Claim map" : "主张地图"}
        </button>
      </div>

      {visibleCount === 0 && state === "active" && (
        <div
          className={cn(
            FRAMEWORK_SUBTASK_INNER_CARD_CLASS,
            "mt-2.5 flex items-center gap-2 text-[length:var(--wz-font-size-caption)] text-[color:var(--wz-color-text-secondary)]"
          )}
        >
          <AppIcon
            icon={IconRefresh}
            size={11}
            className="animate-spin text-[var(--wz-color-status-running)] motion-reduce:animate-none"
            aria-hidden="true"
          />
          {locale === "en-US" ? "Reading the source text and mapping relationships between claims" : "正在阅读原文并归纳主张之间的关系"}
        </div>
      )}
    </div>
  );
}

type StepStatus = "waiting" | "running" | "completed" | "failed";

function getStepStatus(runtime: ReturnType<typeof getYaojuAgentRuntime>): StepStatus {
  if ((runtime.status as string) === "failed") return "failed";
  if (runtime.status === "complete") return "completed";
  if (runtime.status === "running" || runtime.status === "review" || runtime.status === "rework") return "running";
  return "waiting";
}

function getAgentLiveSubtitle(
  runtime: ReturnType<typeof getYaojuAgentRuntime>,
  locale: "zh-CN" | "en-US"
) {
  if (runtime.status === "queued") {
    return locale === "en-US"
      ? `Waiting for dispatch · ${runtime.currentTask}`
      : `等待分派 · ${runtime.currentTask}`;
  }
  if (runtime.status === "review") {
    return locale === "en-US"
      ? `Pending review · ${runtime.currentTask}`
      : `待验收 · ${runtime.currentTask}`;
  }
  if (runtime.status === "rework") {
    return locale === "en-US"
      ? `Reworking · ${runtime.currentTask}`
      : `返工中 · ${runtime.currentTask}`;
  }
  if (runtime.status === "complete") {
    return locale === "en-US"
      ? `Conclusion returned · ${runtime.currentTask}`
      : `结论已回流 · ${runtime.currentTask}`;
  }
  return locale === "en-US"
    ? `Working · ${runtime.currentTask}`
    : `执行中 · ${runtime.currentTask}`;
}

function StepItem({
  agent,
  runtime,
  itemRef,
  onOpenDetail,
  showStatus = true,
}: {
  agent: YaojuDemoAgent;
  runtime: ReturnType<typeof getYaojuAgentRuntime>;
  itemRef: (node: HTMLDivElement | null) => void;
  onOpenDetail?: CrossValidationDemoCardProps["onOpenDetail"];
  /** Hide per-Agent status labels once the overall workflow is complete. */
  showStatus?: boolean;
}) {
  const { locale } = useLocale();
  const status = getStepStatus(runtime);
  const liveSubtitle = getAgentLiveSubtitle(runtime, locale);
  const statusLabel = status === "completed"
    ? locale === "en-US" ? "Completed" : "已完成"
    : status === "running"
      ? locale === "en-US" ? "Running" : "执行中"
      : status === "failed"
        ? locale === "en-US" ? "Failed" : "失败"
        : locale === "en-US" ? "Waiting" : "等待中";
  const statusTone = status === "completed"
    ? "text-[var(--wz-color-status-success)]"
    : status === "running"
      ? "text-[var(--wz-color-status-info)]"
      : status === "failed"
        ? "text-[var(--wz-color-status-danger)]"
        : "text-[color:var(--wz-color-text-tertiary)]";
  const rowClassName =
    "group flex w-full min-w-0 items-center gap-2 px-2.5 py-2 text-left outline-none transition-colors";
  const rowContent = (
    <>
      <YaojuAgentAvatar agentId={agent.id} name={agent.name} size="md" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[length:var(--wz-font-size-body)] font-semibold leading-5 text-[var(--wz-color-text-primary)]">{agent.name}</span>
        <span
          className="mt-0.5 flex min-w-0 items-center gap-1 text-[length:var(--wz-font-size-caption)] leading-4 text-[color:var(--wz-color-text-tertiary)]"
          title={liveSubtitle}
        >
          <span className="min-w-0 truncate">{liveSubtitle}</span>
        </span>
      </span>
      {showStatus && (
        <span className="flex shrink-0 items-center text-[length:var(--wz-font-size-tag)] leading-[var(--wz-line-height-tag)]">
          <span
            className={cn("inline-flex items-center gap-1 font-medium", statusTone)}
            aria-label={status === "completed" ? statusLabel : undefined}
            title={statusLabel}
          >
            {status === "completed" ? (
              <AppIcon icon={IconCheck} size={11} />
            ) : (
              <>
                {status === "running" && (
                  <AppIcon
                    icon={IconRefresh}
                    size={11}
                    className="animate-spin motion-reduce:animate-none"
                    aria-hidden="true"
                  />
                )}
                {statusLabel}
              </>
            )}
          </span>
        </span>
      )}
    </>
  );

  return (
    <div
      ref={itemRef}
      role="listitem"
      className={cn(
        "min-w-0 rounded-[var(--wz-radius-sm)] border border-[var(--wz-color-border-subtle)] bg-[var(--wz-color-bg-subtle)] transition-colors duration-200 ease-out",
        status === "failed" && "border-[var(--wz-color-status-danger)]"
      )}
    >
      {(status === "completed" || status === "running") && onOpenDetail ? (
        <button
          type="button"
          onClick={() => onOpenDetail({ view: "agent", agentId: agent.id })}
          aria-label={locale === "en-US" ? `View ${agent.name} work details` : `查看${agent.name}工作详情`}
          className={cn(
            rowClassName,
            "cursor-pointer hover:bg-[var(--wz-color-border-subtle)] focus-visible:shadow-[inset_0_0_0_2px_var(--wz-color-focus-ring)]"
          )}
        >
          {rowContent}
        </button>
      ) : (
        <div className={rowClassName}>{rowContent}</div>
      )}
    </div>
  );
}

function AgentScene({
  progress,
  agents,
  state,
  onOpenDetail,
  showStatus = true,
}: {
  progress: number;
  agents: YaojuDemoAgent[];
  state: DemoStageState;
  onOpenDetail?: CrossValidationDemoCardProps["onOpenDetail"];
  showStatus?: boolean;
}) {
  const { locale } = useLocale();
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);
  const runtimes = agents.map((agent) => ({ agent, runtime: localizeYaojuRuntime(getYaojuAgentRuntime(agent.id, progress), locale) }));
  const activeAgentId = runtimes.find(({ runtime }) => getStepStatus(runtime) === "running")?.agent.id ?? null;

  useEffect(() => {
    if (!activeAgentId) return;
    const activeIndex = runtimes.findIndex(({ agent }) => agent.id === activeAgentId);
    const target = itemRefs.current[activeIndex];
    if (!target) return;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.requestAnimationFrame(() => target.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "center" }));
  }, [activeAgentId]);

  return (
    <div className={FRAMEWORK_SUBTASK_CARD_CLASS}>
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn("min-w-0", FRAMEWORK_SUBTASK_TITLE_CLASS)}>
            {locale === "en-US" ? "Investor AI · Agent Selection and Dispatch" : "投资官AI · Agent 选择与派遣"}
          </p>
          <ProcessStageStatusBadge state={state} />
        </div>
        <p className={FRAMEWORK_SUBTASK_DESCRIPTION_CLASS}>{locale === "en-US" ? `${agents.length} specialist Agents are working in parallel; status updates in real time.` : `已按主张领域派遣 ${agents.length} 个专业 Agent 并行执行，状态实时更新。`}</p>
      </div>
      <div className="demo-parallel-agent-grid mt-[var(--wz-space-element)] grid items-start gap-[var(--wz-space-compact)]" role="list" aria-label={locale === "en-US" ? "Parallel Agent execution steps" : "并行 Agent 执行步骤"}>
        {runtimes.map(({ agent, runtime }, index) => (
          <StepItem
            key={agent.id}
            agent={agent}
            runtime={runtime}
            itemRef={(node) => { itemRefs.current[index] = node; }}
            onOpenDetail={onOpenDetail}
            showStatus={showStatus}
          />
        ))}
      </div>
    </div>
  );
}

const INVESTMENT_AGGREGATION_STEPS = [
  {
    title: "证据分级",
    detail: "按来源独立性与可追溯性区分强证据、弱证据和证据缺口。",
  },
  {
    title: "冲突消解",
    detail: "对齐财务、客户与市场材料的统计口径，保留无法消除的分歧。",
  },
  {
    title: "风险重排",
    detail: "按对交易结论的影响程度，重新排序关键风险与交割条件。",
  },
  {
    title: "报告重写",
    detail: "将专业判断合并为投资结论、核心依据和后续行动建议。",
  },
] as const;

function AggregationSummaryCard({
  state,
  title,
  activeText,
  completedText,
  stoppedText,
  onOpen,
  children,
}: {
  state: DemoStageState;
  title: string;
  activeText: string;
  completedText: string;
  stoppedText: string;
  onOpen?: () => void;
  children?: ReactNode;
}) {
  const { locale } = useLocale();
  const completed = state === "completed";
  const processing = state === "active";
  const cardClassName = cn(
    "block transition-[border-color,box-shadow] [transition-duration:var(--wz-duration-normal)] [transition-timing-function:var(--wz-ease-standard)] motion-reduce:transition-none",
    FRAMEWORK_SUBTASK_CARD_CLASS,
    onOpen &&
      "hover:border-[var(--wz-color-border-default)] focus-within:shadow-[0_0_0_3px_var(--wz-color-focus-ring)]"
  );
  const summaryContent = (
    <span className="min-w-0">
      <span className="flex items-center justify-between gap-2">
        <span className={cn("min-w-0", FRAMEWORK_SUBTASK_TITLE_CLASS)}>
          {title}
        </span>
        <ProcessStageStatusBadge state={state} />
      </span>
      <span className={FRAMEWORK_SUBTASK_DESCRIPTION_CLASS}>
        {completed ? completedText : processing ? activeText : stoppedText}
      </span>
    </span>
  );

  return (
    <div className={cardClassName}>
      {onOpen ? (
        <button
          type="button"
          onClick={onOpen}
          className="block w-full rounded-[var(--wz-radius-sm)] text-left outline-none"
        >
          {summaryContent}
        </button>
      ) : (
        summaryContent
      )}
      {children}
    </div>
  );
}

function AggregationScene({
  progress,
  state,
  onOpenDetail,
}: {
  progress: number;
  state: DemoStageState;
  onOpenDetail?: CrossValidationDemoCardProps["onOpenDetail"];
}) {
  const { locale } = useLocale();
  const completed = state === "completed";
  const processing = state === "active";
  const aggregationProgress = Math.max(
    0,
    Math.min(1, (progress - YAOJU_DEMO_TIMELINE.agentsEnd) / (100 - YAOJU_DEMO_TIMELINE.agentsEnd))
  );
  const aggregationSteps = locale === "en-US"
    ? [
        { title: "Evidence grading", detail: "Separate strong evidence, weak evidence, and gaps by independence and traceability." },
        { title: "Conflict resolution", detail: "Align financial, customer, and market definitions while preserving unresolved differences." },
        { title: "Risk reprioritization", detail: "Rank key risks and closing conditions by their impact on the deal decision." },
        { title: "Report rewrite", detail: "Combine specialist judgment into the conclusion, supporting rationale, and next actions." },
      ]
    : INVESTMENT_AGGREGATION_STEPS;
  const visibleStepCount = completed
    ? aggregationSteps.length
    : Math.max(
        1,
        Math.min(
          aggregationSteps.length,
          Math.ceil(aggregationProgress * aggregationSteps.length)
        )
      );
  const currentStepIndex = Math.max(
    0,
    Math.min(aggregationSteps.length - 1, visibleStepCount - 1)
  );
  return (
    <div>
      <div className="relative flex w-full flex-col items-center">
        <AggregationSummaryCard
          state={state}
          title={locale === "en-US" ? "Investor AI · Evidence Synthesis and Conclusion Rewrite" : "投资官AI · 证据聚合与结论重写"}
          activeText={locale === "en-US" ? "Combining supporting evidence, counter-evidence, gaps, and specialist judgment." : "正在合并支持证据、反证、证据缺口与专业判断。"}
          completedText={locale === "en-US" ? "Specialist analysis and risk assessment are complete; the investment analysis report is ready." : "专业分析与风险判断已完成，投资分析报告已生成。"}
          stoppedText={locale === "en-US" ? "The task stopped. Evidence synthesis completed before the stop has been preserved." : "任务已停止，保留停止前完成的证据聚合结果。"}
          onOpen={
            onOpenDetail
              ? () => onOpenDetail({ view: "aggregation" })
              : undefined
          }
        >
          <span
            className="demo-aggregation-step-grid mt-[var(--wz-space-element)] grid gap-2"
            role="list"
            aria-label={locale === "en-US" ? "Aggregation tasks" : "聚合任务"}
          >
            {aggregationSteps.slice(0, visibleStepCount).map((step, index) => {
              const done = completed || index < currentStepIndex;
              const active = processing && index === currentStepIndex;
              const stoppedAtStep = !completed && !processing && index === currentStepIndex;
              return (
                <span
                  key={step.title}
                  role="listitem"
                  aria-current={active ? "step" : undefined}
                  className={cn(
                    "flex min-w-0 items-start gap-2 rounded-[var(--wz-radius-sm)] border p-3 !pl-1 transition-[background-color,border-color] [transition-duration:var(--wz-duration-normal)] [transition-timing-function:var(--wz-ease-standard)] motion-reduce:transition-none",
                    active
                      ? "border-[var(--wz-color-status-running)] bg-[var(--wz-color-status-running-subtle)]"
                      : stoppedAtStep
                        ? "border-[var(--wz-color-status-danger)] bg-[var(--wz-color-status-danger-subtle)]"
                        : "border-transparent bg-[var(--wz-color-bg-subtle)]"
                  )}
                >
                  <span className="w-5 shrink-0 pt-px text-right font-mono text-[length:var(--wz-font-size-caption)] font-medium tabular-nums text-[color:var(--wz-color-text-tertiary)]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-3">
                      <span className="min-w-0 text-[length:var(--wz-font-size-caption)] font-normal">{step.title}</span>
                      {!done && (
                        <span
                          role={active ? "status" : undefined}
                          aria-live={active ? "polite" : undefined}
                          aria-atomic={active ? "true" : undefined}
                          className={cn(
                            "inline-flex shrink-0 items-center gap-1 text-[length:var(--wz-font-size-tag)] leading-[var(--wz-line-height-tag)] font-medium",
                            active
                              ? "text-[var(--wz-color-status-running)]"
                              : stoppedAtStep
                                ? "text-[var(--wz-color-status-danger)]"
                                : "text-[var(--wz-color-text-disabled)]"
                          )}
                        >
                          {active && (
                            <AppIcon
                              icon={IconRefresh}
                              size={7}
                              className="animate-spin motion-reduce:animate-none"
                            />
                          )}
                          {stoppedAtStep && <AppIcon icon={IconStop} size={7} />}
                          {locale === "en-US"
                            ? active ? "Processing" : stoppedAtStep ? "Stopped" : "Pending"
                            : active ? "处理中" : stoppedAtStep ? "已停止" : "待处理"}
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-[length:var(--wz-font-size-caption)] leading-4 text-[color:var(--wz-color-text-secondary)]">
                      {step.detail}
                    </span>
                  </span>
                </span>
              );
            })}
          </span>
        </AggregationSummaryCard>
      </div>
    </div>
  );
}

const VALIDATION_FLOW_LINES = [
  { top: "10%", rotate: "-12deg", delay: "-1.54s", duration: "1.8s" },
  { top: "23%", rotate: "-8deg", delay: "-1.16s", duration: "1.95s" },
  { top: "36%", rotate: "-4deg", delay: "-0.78s", duration: "1.72s" },
  { top: "50%", rotate: "0deg", delay: "-0.4s", duration: "1.88s" },
  { top: "64%", rotate: "4deg", delay: "-1.38s", duration: "1.76s" },
  { top: "77%", rotate: "8deg", delay: "-1s", duration: "1.92s" },
  { top: "90%", rotate: "12deg", delay: "-0.62s", duration: "1.82s" },
] as const;

function KnowledgeComparisonScene({
  progress,
  state,
}: {
  progress: number;
  state: DemoStageState;
}) {
  const { locale } = useLocale();
  const completed = state === "completed";
  const processing = state === "active";
  const claims = localizeYaojuClaims(YAOJU_CLAIMS, locale);
  const comparisonProgress = Math.max(
    0,
    Math.min(
      1,
      (progress - YAOJU_CROSS_VALIDATION_TIMELINE.claimsEnd) /
        (YAOJU_CROSS_VALIDATION_TIMELINE.comparisonEnd -
          YAOJU_CROSS_VALIDATION_TIMELINE.claimsEnd)
    )
  );
  const completedCount = completed
    ? claims.length
    : Math.min(claims.length, Math.floor(comparisonProgress * claims.length));
  const currentIndex = completed
    ? claims.length - 1
    : Math.min(claims.length - 1, completedCount);
  const currentClaim = claims[currentIndex] ?? claims[0];
  const currentOrdinal = completed
    ? claims.length
    : processing
      ? Math.min(claims.length, completedCount + 1)
      : Math.max(1, completedCount);
  const claimStatusText = completed
    ? locale === "en-US"
      ? "All comparisons complete"
      : "已完成全部比对"
    : processing
      ? currentClaim.claim
      : locale === "en-US"
        ? "Cross-validation stopped"
        : "交叉验证已停止";

  return (
    <div className={FRAMEWORK_SUBTASK_CARD_CLASS}>
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn("min-w-0", FRAMEWORK_SUBTASK_TITLE_CLASS)}>
            {locale === "en-US" ? "Investor AI · Knowledge Base Comparison" : "投资官AI · 项目知识库逐项比对"}
          </p>
          <ProcessStageStatusBadge state={state} />
        </div>
        <p className={FRAMEWORK_SUBTASK_DESCRIPTION_CLASS}>
          {locale === "en-US" ? "Retrieve financial, legal, customer, technology, and industry evidence for each claim without dispatching specialist Agents" : "按主张顺序检索财务、法务、客户、技术和行业材料，不召唤子 Agent"}
        </p>
      </div>

      <div
        className={cn(
          "demo-validation-comparison mt-4 grid items-stretch transition-[grid-template-columns,gap] [transition-duration:var(--wz-duration-normal)] [transition-timing-function:var(--wz-ease-standard)] motion-reduce:transition-none",
          completed && "demo-validation-comparison-complete"
        )}
        role="group"
        aria-label={locale === "en-US" ? "Claim map and project knowledge base comparison" : "主张地图与项目知识库对照"}
      >
        <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {completed
            ? locale === "en-US"
              ? "All comparisons complete"
              : "已完成全部比对"
            : processing
              ? locale === "en-US"
                ? `Cross-validating claim ${currentOrdinal} of ${claims.length}`
                : `正在校验第 ${currentOrdinal} 个主张，共 ${claims.length} 个`
              : locale === "en-US"
                ? "Cross-validation stopped"
                : "交叉验证已停止"}
        </span>
        <div
          role="group"
          aria-label={`${claimStatusText}${locale === "en-US" ? ", " : "，"}${currentOrdinal} / ${claims.length}`}
          className={cn(
            FRAMEWORK_SUBTASK_INNER_CARD_CLASS,
            "flex min-h-[88px] min-w-0 items-center gap-3",
            processing && "demo-validation-card--processing",
            completed && "bg-[var(--wz-color-status-success-subtle)]"
          )}
        >
          <span
            className={cn(
              "flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[var(--wz-radius-md)]",
              completed
                ? "bg-[var(--wz-color-bg-surface)] text-[var(--wz-color-status-success)]"
                : processing
                  ? "bg-[var(--wz-color-status-running-subtle)] text-[var(--wz-color-status-running)]"
                  : "bg-[var(--wz-color-status-danger-subtle)] text-[var(--wz-color-status-danger)]"
            )}
          >
            <AppIcon icon={IconTree} size={21} />
          </span>
          <span
            className={cn(
              "min-w-0 flex-1 text-[length:var(--wz-font-size-caption)] font-medium leading-4 text-[var(--wz-color-text-primary)]",
              processing && "line-clamp-2"
            )}
            title={claimStatusText}
          >
            {claimStatusText}
          </span>
          <span
            className={cn(
              "shrink-0 text-[length:var(--wz-font-size-caption)] font-medium tabular-nums text-[color:var(--wz-color-text-secondary)]",
              completed && "text-[var(--wz-color-status-success)]"
            )}
          >
            {currentOrdinal} / {claims.length}
          </span>
        </div>

        <div
          className={cn(
            "demo-validation-flow relative flex items-center justify-center overflow-hidden text-[var(--wz-color-status-running)]",
            processing ? "min-h-[48px]" : "h-2 min-h-0",
            completed && "text-[var(--wz-color-status-success)]",
            !processing && !completed && "text-[var(--wz-color-status-danger)]",
            !processing && "demo-validation-flow-inactive"
          )}
          aria-hidden="true"
        >
          {processing && VALIDATION_FLOW_LINES.map((line) => (
            <span
              key={line.top}
              className="demo-validation-flow-line"
              style={{
                top: line.top,
                rotate: line.rotate,
                animationDelay: line.delay,
                animationDuration: line.duration,
                height: 4,
                opacity: 0.95,
              }}
            />
          ))}
        </div>

        <div
          className={cn(
            FRAMEWORK_SUBTASK_INNER_CARD_CLASS,
            "flex min-h-[88px] min-w-0 items-center gap-3",
            processing && "demo-validation-card--processing"
          )}
        >
          <span className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[var(--wz-radius-md)] bg-[var(--wz-color-status-success-subtle)] text-[var(--wz-color-status-success)]">
            <AppIcon icon={IconDatabase} size={21} />
          </span>
          <span className="min-w-0">
            <span className={cn("block", FRAMEWORK_SUBTASK_TITLE_CLASS)}>
              {locale === "en-US" ? "Project Knowledge Base" : "项目知识库"}
            </span>
          </span>
        </div>
      </div>

    </div>
  );
}

const VALIDATION_REPORT_RESULTS = [
  {
    label: "一致",
    value: 5,
    tone: "text-[var(--wz-color-status-success)]",
  },
  {
    label: "部分一致",
    value: 6,
    tone: "text-[var(--wz-color-status-info)]",
  },
  {
    label: "证据不足",
    value: 4,
    tone: "text-[var(--wz-color-status-warning)]",
  },
  {
    label: "存在偏差",
    value: 1,
    tone: "text-[var(--wz-color-status-danger)]",
  },
] as const;

function ValidationReportScene({
  state,
  onOpenDetail,
}: {
  state: DemoStageState;
  onOpenDetail?: CrossValidationDemoCardProps["onOpenDetail"];
}) {
  const { locale } = useLocale();
  const completed = state === "completed";
  return (
    <div>
      <AggregationSummaryCard
        state={state}
        title={locale === "en-US" ? "Investor AI · Cross-Validation Synthesis and Report" : "投资官AI · 交叉验证汇总与报告生成"}
        activeText={locale === "en-US" ? "Organizing claim-level results, material discrepancies, and investment impact into the report." : "正在把逐项比对结果、关键偏差与风险影响整理为报告。"}
        completedText={locale === "en-US" ? "Claim-level comparison and risk-impact assessment are complete; the report is ready." : "逐项比对与风险影响判断已完成，交叉验证报告已生成。"}
        stoppedText={locale === "en-US" ? "The task stopped. Completed claim comparisons have been preserved." : "任务已停止，保留停止前完成的逐项比对结果。"}
        onOpen={
          onOpenDetail
            ? () => onOpenDetail({ view: "aggregation" })
            : undefined
        }
      >
        {completed && (
          <span className="demo-validation-result-grid mt-3 grid gap-2">
            {VALIDATION_REPORT_RESULTS.map((result) => (
              <span
                key={result.label}
                className={cn(
                  FRAMEWORK_SUBTASK_INNER_CARD_CLASS,
                  "flex min-w-0 items-start gap-2"
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                    result.tone
                  )}
                >
                  <AppIcon icon={IconCheckCircle} size={24} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[length:var(--wz-font-size-caption)] font-normal text-[var(--wz-color-text-primary)]">
                    {translateVerificationVerdict(result.label, locale)}
                  </span>
                  <span className="mt-0.5 block text-[length:var(--wz-font-size-caption)] leading-4 text-[color:var(--wz-color-text-secondary)]">
                    {locale === "en-US"
                      ? `${result.value} ${result.value === 1 ? "claim" : "claims"}`
                      : `${result.value} 项主张`}
                  </span>
                </span>
              </span>
            ))}
          </span>
        )}
      </AggregationSummaryCard>
    </div>
  );
}

export function CrossValidationDemoCard({
  block,
  onOpenDetail,
  onAutoCloseDetail,
  taskId,
  autoOpenClaimMap,
  className,
}: CrossValidationDemoCardProps) {
  const { locale } = useLocale();
  const pct = Math.min(100, Math.max(0, Math.round(block.progress)));
  const isCrossValidation = block.mode === "cross-validation";
  const rawStages = isCrossValidation ? VALIDATION_STAGES : INVESTMENT_STAGES;
  const stageEnglish = isCrossValidation
    ? [
        "Understand Report",
        "Claim Map",
        "Knowledge Base Comparison",
        "Generate Report",
      ]
    : [
        "Understand Report",
        "Claim Map",
        "Research Strategy",
        "Agent Execution",
        "Aggregate Report",
      ];
  const stages = locale === "en-US"
    ? rawStages.map((stage, index) => ({
        ...stage,
        title: stageEnglish[index] ?? stage.title,
      }))
    : rawStages;
  const agents = localizeYaojuAgents(getYaojuDemoAgents(block.agentIds), locale);
  const stageIndex =
    block.status === "completed"
      ? stages.length - 1
      : isCrossValidation
        ? getYaojuCrossValidationStageIndex(pct)
        : getYaojuDemoStageIndex(pct);
  const [selectedStageIndex, setSelectedStageIndex] = useState(stageIndex);
  const collapseStorageKey = `invest-wise:collapse-process:${isCrossValidation ? "cross-validation" : "investment-analysis"}`;
  const [collapsed, setCollapsed] = useState(() => {
    if (block.status !== "completed" || typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(collapseStorageKey) === "true";
    } catch {
      return false;
    }
  });
  const [scrollRequest, setScrollRequest] = useState<{
    index: number;
    afterExpand: boolean;
  } | null>(null);
  const stageStorageKey = `invest-wise:open-stages:${isCrossValidation ? "cross-validation" : "investment-analysis"}`;
  const [openStageIds, setOpenStageIds] = useState<Set<number>>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = window.localStorage.getItem(stageStorageKey);
        if (stored) return new Set(JSON.parse(stored) as number[]);
      } catch {
        // Ignore malformed or unavailable local storage and use the default view.
      }
    }
    return new Set(Array.from({ length: stageIndex + 1 }, (_, index) => index));
  });
  const processId = useId().replace(/:/g, "");
  const stageSectionRefs = useRef<Array<HTMLElement | null>>([]);
  const previousStageIndexRef = useRef(stageIndex);
  const previousBlockStatusRef = useRef(block.status);
  const claimMapAutoOpenedRef = useRef(false);

  useEffect(() => {
    if (isCrossValidation || !onOpenDetail) {
      claimMapAutoOpenedRef.current = false;
      return;
    }

    const claimMapActive = block.status === "running" && stageIndex === 1;
    if (autoOpenClaimMap && claimMapActive && !claimMapAutoOpenedRef.current) {
      claimMapAutoOpenedRef.current = true;
      onOpenDetail({ view: "claim-map" });
      return;
    }

    // Keep ownership of an already-open detail even if another running task
    // becomes the first task in the list. The owner closes it only after its
    // own claim-map stage ends.
    if ((!claimMapActive || !autoOpenClaimMap) && claimMapAutoOpenedRef.current) {
      claimMapAutoOpenedRef.current = false;
      onAutoCloseDetail?.(taskId);
    }
  }, [
    autoOpenClaimMap,
    block.status,
    isCrossValidation,
    onAutoCloseDetail,
    onOpenDetail,
    stageIndex,
    taskId,
  ]);

  useEffect(() => {
    try {
      window.localStorage.setItem(collapseStorageKey, String(collapsed));
    } catch {
      // Persistence is best effort in private browsing and embedded previews.
    }
  }, [collapsed, collapseStorageKey]);

  useEffect(() => {
    try {
      window.localStorage.setItem(stageStorageKey, JSON.stringify(Array.from(openStageIds)));
    } catch {
      // Persistence is best effort in private browsing and embedded previews.
    }
  }, [openStageIds, stageStorageKey]);

  useEffect(() => {
    if (block.status === "running" && stageIndex !== ALWAYS_OPEN_STAGE_INDEX) {
      setOpenStageIds((previous) => {
        if (previous.has(stageIndex)) return previous;
        const next = new Set(previous);
        next.add(stageIndex);
        return next;
      });
    }
    if (stageIndex <= previousStageIndexRef.current) return;
    previousStageIndexRef.current = stageIndex;
    if (stageIndex === ALWAYS_OPEN_STAGE_INDEX) return;
    setOpenStageIds((previous) => {
      const next = new Set(previous);
      next.add(stageIndex);
      return next;
    });
  }, [stageIndex, block.status]);

  useEffect(() => {
    if (block.status !== "running") return;
    setSelectedStageIndex(stageIndex);
    setScrollRequest({ index: stageIndex, afterExpand: false });
  }, [stageIndex, block.status, isCrossValidation]);

  useEffect(() => {
    const previousStatus = previousBlockStatusRef.current;
    previousBlockStatusRef.current = block.status;
    if (previousStatus === "completed" || block.status !== "completed") return;

    // A newly completed task expands once to reveal its result. Reports that
    // mount already completed keep the user's persisted collapsed preference.
    setSelectedStageIndex(stages.length - 1);
    setCollapsed(false);
  }, [block.status, stages.length]);

  useEffect(() => {
    if (!scrollRequest || collapsed) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const delay = scrollRequest.afterExpand && !prefersReducedMotion ? 200 : 0;
    let frame = 0;
    const timer = window.setTimeout(() => {
      frame = window.requestAnimationFrame(() => {
        const target = stageSectionRefs.current[scrollRequest.index];
        if (target) {
          target.scrollIntoView({
            behavior: prefersReducedMotion ? "auto" : "smooth",
            block: "center",
          });
        }
        setScrollRequest(null);
      });
    }, delay);

    return () => {
      window.clearTimeout(timer);
      window.cancelAnimationFrame(frame);
    };
  }, [collapsed, scrollRequest]);

  const visibleClaimCount = getVisibleClaimCount(pct, block.status === "completed");
  const statusLabel =
    locale === "en-US"
      ? block.status === "completed"
        ? "Report ready"
        : block.status === "cancelled"
          ? "Task stopped"
          : "In progress"
      : block.status === "completed"
        ? "报告已生成"
        : block.status === "cancelled"
          ? "任务已停止"
          : "进行中";

  const getStageState = (index: number): DemoStageState => {
    if (block.status === "completed" || index < stageIndex) return "completed";
    return block.status === "cancelled" ? "stopped" : "active";
  };

  const handleSelectStage = (index: number) => {
    setSelectedStageIndex(index);
    if (index !== ALWAYS_OPEN_STAGE_INDEX) {
      setOpenStageIds((previous) => {
        if (previous.has(index)) return previous;
        const next = new Set(previous);
        next.add(index);
        return next;
      });
    }
    const afterExpand = collapsed;
    if (afterExpand) setCollapsed(false);
    setScrollRequest({ index, afterExpand });
  };

  const handleToggleStage = (index: number) => {
    if (index === ALWAYS_OPEN_STAGE_INDEX) return;
    setOpenStageIds((previous) => {
      const next = new Set(previous);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleToggleCollapsed = () => {
    if (collapsed) {
      setCollapsed(false);
      setScrollRequest({ index: selectedStageIndex, afterExpand: true });
      return;
    }
    setCollapsed(true);
  };

  const renderStageScene = (index: number, state: DemoStageState) => {
    const stage = stages[index];
    if (!stage) return null;

    if (index === 0) {
      return (
        <IntentScene
          mode={isCrossValidation ? "cross-validation" : "investment-analysis"}
          state={state}
          onOpenDetail={onOpenDetail}
        />
      );
    }
    if (index === 1) {
      return (
        <ClaimScene
          visibleCount={visibleClaimCount}
          state={state}
          onOpenDetail={onOpenDetail}
        />
      );
    }
    if (isCrossValidation) {
      if (index === 2) {
        return (
          <KnowledgeComparisonScene
            progress={pct}
            state={state}
          />
        );
      }
      if (index === 3) {
        return (
          <ValidationReportScene
            state={state}
            onOpenDetail={onOpenDetail}
          />
        );
      }
      return null;
    }
    if (index === 2) {
      return <StrategyScene progress={pct} state={state} />;
    }
    if (index === 3) {
      return (
        <AgentScene
          progress={pct}
          agents={agents}
          state={state}
          // Every Agent row is inspectable while it is running or completed.
          onOpenDetail={onOpenDetail}
          showStatus={state !== "completed"}
        />
      );
    }
    if (index === 4) {
      return (
        <AggregationScene
          progress={pct}
          state={state}
          onOpenDetail={onOpenDetail}
        />
      );
    }
    return null;
  };

  return (
    <section
      className={cn(
        "validation-process-shell",
        PROCESS_SHELL_CLASS,
        className
      )}
      aria-label={locale === "en-US" ? (isCrossValidation ? "Yaoju Manufacturing cross-validation process" : "Yaoju Manufacturing investment analysis process") : (isCrossValidation ? "曜矩智造交叉验证生成过程" : "曜矩智造投资分析报告生成过程")}
    >
      <header
        className={cn(
          PROCESS_HEADER_CLASS,
          "border-b transition-[border-color] [transition-duration:var(--wz-duration-normal)] [transition-timing-function:var(--wz-ease-standard)] motion-reduce:transition-none",
          collapsed
            ? "border-transparent"
            : "border-[var(--wz-color-border-default)]"
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2.5">
            <span className={PROCESS_HEADER_ICON_CLASS}>
              <AppIcon icon={IconAuto} size={16} />
            </span>
            <div className="min-w-0">
              <div className={cn("flex items-center gap-1.5", PROCESS_KICKER_CLASS)}>
                <AppIcon icon={isCrossValidation ? IconFactCheck : IconAuto} size={10} />
                {isCrossValidation
                  ? locale === "en-US" ? "Investor AI · Cross-Validation" : "投资官AI · 交叉验证"
                  : locale === "en-US" ? "Investor AI · Investment Analysis" : "投资官AI · 投资分析编排"}
              </div>
              <h3 className="mt-1 text-[length:var(--wz-font-size-section)] font-semibold leading-6 text-[var(--wz-color-text-primary)]">
                {isCrossValidation
                  ? locale === "en-US" ? "Yaoju Manufacturing · Project Knowledge Base Cross-Validation" : "曜矩智造 · 项目知识库交叉验证"
                  : locale === "en-US" ? "Yaoju Manufacturing · Pre-Investment Analysis Report" : "曜矩智造 · 投前投资分析报告生成"}
              </h3>
              <span
                role="status"
                aria-live="polite"
                aria-atomic="true"
                className="sr-only"
              >
                {statusLabel}
              </span>
            </div>
          </div>
          <span className="flex shrink-0 items-center gap-1.5">
            {onOpenDetail && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenDetail({ view: "document" })}
                aria-label={locale === "en-US" ? "Open task details sidebar" : "打开任务详情侧栏"}
                title={locale === "en-US" ? "Open task details sidebar" : "打开任务详情侧栏"}
                className="shrink-0 px-2.5 text-[length:var(--wz-font-size-caption)] text-[color:var(--wz-color-text-secondary)]"
              >
                <span>{locale === "en-US" ? "Task details" : "任务详情"}</span>
              </Button>
            )}
            {block.status === "completed" && (
              <button
                type="button"
                onClick={handleToggleCollapsed}
                aria-expanded={!collapsed}
                aria-controls={`${processId}-content`}
                aria-label={locale === "en-US" ? (collapsed ? "Expand generation process" : "Collapse generation process") : (collapsed ? "展开生成过程" : "收起生成过程")}
                title={locale === "en-US" ? (collapsed ? "Expand generation process" : "Collapse generation process") : (collapsed ? "展开生成过程" : "收起生成过程")}
                className={PROCESS_COLLAPSE_BUTTON_CLASS}
              >
                <AppIcon
                  icon={IconChevronDown}
                  size={11}
                  className={cn(
                    "transition-transform [transition-duration:var(--wz-duration-normal)] [transition-timing-function:var(--wz-ease-standard)] motion-reduce:transition-none",
                    !collapsed && "rotate-180"
                  )}
                />
              </button>
            )}
          </span>
        </div>

        {block.status !== "completed" && (
          <div className="mt-3 flex items-center gap-2">
            <div
              role="progressbar"
              aria-label={locale === "en-US" ? (isCrossValidation ? "Cross-validation report generation progress" : "Investment analysis report generation progress") : (isCrossValidation ? "交叉验证报告生成进度" : "投资分析报告生成进度")}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={pct}
              className={PROCESS_PROGRESS_TRACK_CLASS}
            >
              <div
                aria-hidden="true"
                className={cn(
                  PROCESS_PROGRESS_FILL_CLASS,
                  "bg-[var(--invest-progress-report)]",
                  block.status === "running" && "demo-progress-flow"
                )}
                style={{ transform: `scaleX(${pct / 100})` }}
              />
            </div>
            <span className="w-8 text-right font-mono text-[length:var(--wz-font-size-caption)] text-[color:var(--wz-color-text-secondary)]">{pct}%</span>
          </div>
        )}
      </header>

      <ProcessStageTracker
        activeIndex={stageIndex}
        selectedIndex={collapsed ? null : selectedStageIndex}
        stages={stages}
        completed={block.status === "completed"}
        stopped={block.status === "cancelled"}
        sectionIdPrefix={processId}
        onSelect={handleSelectStage}
      />

      <div
        id={`${processId}-content`}
        aria-hidden={collapsed}
        inert={collapsed ? true : undefined}
        className={cn(
          "grid transition-[grid-template-rows,opacity] [transition-duration:var(--wz-duration-normal)] [transition-timing-function:var(--wz-ease-standard)] motion-reduce:transition-none",
          collapsed
            ? "pointer-events-none grid-rows-[0fr] opacity-0"
            : "grid-rows-[1fr] opacity-100"
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="demo-stage-content relative">
            <div className="relative space-y-[var(--wz-space-module)]">
              {stages.slice(0, stageIndex + 1).map((stage, index) => {
                const state = getStageState(index);
                const stageOpen =
                  index === ALWAYS_OPEN_STAGE_INDEX || openStageIds.has(index);
                return (
                  <section
                    key={stage.title}
                    id={`${processId}-stage-${index}`}
                ref={(node) => {
                  stageSectionRefs.current[index] = node;
                }}
                    aria-labelledby={`${processId}-stage-${index}-title`}
                    className="relative"
                  >
                    {index < stageIndex && (
                      <span
                        aria-hidden="true"
                        className="absolute bottom-[-24px] left-[13.5px] top-7 z-[1] w-px bg-[var(--wz-color-border-default)]"
                      />
                    )}
                    <div className="relative z-[2] mb-3 flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        {index === ALWAYS_OPEN_STAGE_INDEX ? (
                          <span aria-hidden="true" className="h-7 w-7 shrink-0" />
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleToggleStage(index)}
                            aria-expanded={stageOpen}
                            aria-controls={`${processId}-stage-${index}-detail`}
                            aria-label={locale === "en-US" ? (stageOpen ? `Collapse ${stage.title}` : `Expand ${stage.title}`) : (stageOpen ? `收起${stage.title}` : `展开${stage.title}`)}
                            title={locale === "en-US" ? (stageOpen ? "Collapse step" : "Expand step") : (stageOpen ? "收起步骤" : "展开步骤")}
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-surface)] text-[color:var(--wz-color-text-tertiary)] outline-none transition-[background-color,border-color,color,box-shadow] duration-200 hover:border-[var(--wz-color-border-strong)] hover:bg-[var(--wz-color-bg-subtle)] hover:text-[var(--wz-color-text-primary)] focus-visible:shadow-[0_0_0_3px_var(--wz-color-focus-ring)]"
                          >
                            <AppIcon icon={IconChevronDown} size={11} className={cn("transition-transform duration-200", stageOpen && "rotate-180")} />
                          </button>
                        )}
                        <h4
                          id={`${processId}-stage-${index}-title`}
                          className="line-clamp-2 min-w-0 text-[length:var(--wz-font-size-section)] font-semibold leading-6 text-[var(--wz-color-text-primary)]"
                        >
                          {stage.title}
                        </h4>
                      </div>
                    </div>
                    <div
                      id={`${processId}-stage-${index}-detail`}
                      aria-hidden={!stageOpen}
                      inert={!stageOpen ? true : undefined}
                      className={cn("relative z-[2] pl-7 sm:pl-[38px] demo-stage-detail", !stageOpen && "demo-stage-detail--collapsed")}
                    >
                      {renderStageScene(index, state)}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
