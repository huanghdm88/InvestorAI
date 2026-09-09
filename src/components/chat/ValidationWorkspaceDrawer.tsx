import { useEffect, useMemo, useRef, useState } from "react";

import { AppIcon } from "@/src/components/ui/app-icon";
import { YaojuAgentAvatar } from "@/src/components/chat/YaojuAgentAvatar";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/src/components/ui/sheet";
import {
  YAOJU_CLAIMS,
  YAOJU_CROSS_VALIDATION_TIMELINE,
  YAOJU_DEMO_DOCUMENT_NAME,
  YAOJU_DEMO_TIMELINE,
  YAOJU_REPORT_META,
  getYaojuDemoAgents,
  getYaojuAgentCollaborations,
  getYaojuAgentRuntime,
  type YaojuDemoAgent,
} from "@/src/data/yaoju-validation-demo";
import {
  IconAuto,
  IconBranches,
  IconCheckCircle,
  IconClose,
  IconChevronLeft,
  IconChevronRight,
  IconChevronDown,
  IconChevronUp,
  IconFileSearch,
  IconFileText,
  IconMerge,
  IconRefresh,
  IconSearch,
  IconStop,
  IconTree,
} from "@/src/lib/icons";
import { cn } from "@/src/lib/utils";
import { useLocale } from "@/src/lib/i18n";
import {
  localizeYaojuAgents,
  localizeYaojuClaims,
  localizeYaojuDocumentName,
  localizeYaojuRuntime,
} from "@/src/lib/content-localization";
import type { AssistantBlock, ValidationDemoDetail, ValidationDemoMode } from "@/src/types";

type ValidationDemoStatus = Extract<
  Extract<AssistantBlock, { kind: "validation-demo" }>,
  { status: string }
>["status"];

interface ValidationWorkspaceDrawerProps {
  detail: ValidationDemoDetail | null;
  progress: number;
  /** 生命周期状态来自任务/消息，而不是由进度百分比猜测。 */
  status?: ValidationDemoStatus;
  agentIds?: string[];
  reworkAgentId?: string;
  mode?: ValidationDemoMode;
  onClose: () => void;
  onChangeDetail: (detail: ValidationDemoDetail) => void;
  returnFocusTo?: HTMLElement | null;
}

const VIEW_META = {
  document: { label: "理解报告", title: "理解报告与分析目标", icon: IconFileSearch },
  "claim-map": { label: "主张地图", title: "从原文片段建立可验证主张", icon: IconTree },
  agent: { label: "Agent 执行", title: "子领域 Agent 工作详情", icon: IconBranches },
  aggregation: { label: "聚合报告", title: "证据回流与结论重组", icon: IconMerge },
} as const;

const PAGE_ASSETS: Record<number, string> = {
  2: "/demo/yaoju/page-02.png",
  4: "/demo/yaoju/page-04.png",
  5: "/demo/yaoju/page-05.png",
  6: "/demo/yaoju/page-06.png",
  8: "/demo/yaoju/page-08.png",
  9: "/demo/yaoju/page-09.png",
  11: "/demo/yaoju/page-11.png",
  13: "/demo/yaoju/page-13.png",
  14: "/demo/yaoju/page-14.png",
  15: "/demo/yaoju/page-15.png",
};

type AgentWorkItemStatus = "queued" | "running" | "review" | "completed" | "failed";

interface AgentTaskWorkItem {
  kind: "task" | "result";
  id: string;
  title: string;
  detail: string;
  status: AgentWorkItemStatus;
}

interface AgentCollaborationWorkItem {
  kind: "collaboration";
  id: string;
  title: string;
  detail: string;
  status: "running" | "completed";
  rounds: readonly AgentCollaborationRound[];
  participants: readonly [
    { id: string; name: string },
    { id: string; name: string },
  ];
}

interface AgentCollaborationRound {
  id: string;
  label: string;
  detail: string;
}

type AgentWorkItem = AgentTaskWorkItem | AgentCollaborationWorkItem;

/** Keep the detail feed focused on the event itself, without round numbering. */
function getCollaborationEventLabel(label: string) {
  return label
    .replace(/^\s*(?:第\s*[0-9０-９一二三四五六七八九十百]+\s*轮|Round\s*[0-9０-９]+)\s*[·•:：-]?\s*/i, "")
    .trim();
}

const WORK_DETAIL_COPY = [
  {
    zh: "读取相关材料，确认本项核验的范围与证据边界。",
    en: "Read the relevant material and set the evidence boundary for this check.",
  },
  {
    zh: "逐项对齐原文与底稿，记录可追溯的来源锚点。",
    en: "Trace the source passage against the working papers and capture source anchors.",
  },
  {
    zh: "复算关键指标，标记口径差异与仍待补齐的证据。",
    en: "Recalculate the key metric and flag definition gaps or missing evidence.",
  },
  {
    zh: "把结果整理成可验收结论，准备回流投资官AI。",
    en: "Turn the findings into an auditable conclusion for Investor AI.",
  },
] as const;

function getWorkItemStatus(
  runtime: ReturnType<typeof getYaojuAgentRuntime>,
  index: number
): AgentWorkItemStatus {
  if (runtime.status === "complete" || index < runtime.completedStepCount) {
    return "completed";
  }
  if (
    index === runtime.activeStep &&
    (runtime.status === "running" || runtime.status === "review" || runtime.status === "rework")
  ) {
    return runtime.status === "review" ? "review" : "running";
  }
  return "queued";
}

function isRuntimeWorking(runtime: ReturnType<typeof getYaojuAgentRuntime>) {
  return runtime.status === "running" || runtime.status === "review" || runtime.status === "rework";
}

function isWorkItemActive(status: AgentWorkItemStatus) {
  return status === "running" || status === "review";
}

/**
 * Progress alone cannot describe a cancelled workflow: the runtime helper
 * would otherwise keep its current item in a running state after the task is
 * removed from the live-task list.
 */
function getWorkflowAgentRuntime(
  agentId: string,
  progress: number,
  status: ValidationDemoStatus
) {
  const runtime = getYaojuAgentRuntime(agentId, progress);
  if (status === "cancelled") {
    return {
      ...runtime,
      status: "queued" as const,
      statusLabel: "任务已停止",
    };
  }
  if (status === "completed" && runtime.status !== "complete") {
    return {
      ...runtime,
      progress: 100,
      status: "complete" as const,
      statusLabel: "已完成 · 已验收",
      activeStep: Math.max(0, runtime.totalSteps - 1),
      completedStepCount: runtime.totalSteps,
    };
  }
  return runtime;
}

function hasRuntimeStartedStep(
  runtime: ReturnType<typeof getYaojuAgentRuntime>,
  stepIndex: number
) {
  return (
    runtime.status === "complete" ||
    runtime.completedStepCount > stepIndex ||
    (isRuntimeWorking(runtime) && runtime.activeStep === stepIndex)
  );
}

function hasRuntimeCompletedStep(
  runtime: ReturnType<typeof getYaojuAgentRuntime>,
  stepIndex: number
) {
  return runtime.status === "complete" || runtime.completedStepCount > stepIndex;
}

function buildCollaborationRounds({
  interactionId,
  agentName,
  partnerName,
  detail,
  locale,
  completed,
}: {
  interactionId: string;
  agentName: string;
  partnerName: string;
  detail: string;
  locale: "zh-CN" | "en-US";
  completed: boolean;
}): AgentCollaborationRound[] {
  if (locale === "en-US") {
    return [
      {
        id: `${interactionId}-scope`,
        label: `${agentName} · Evidence boundary shared`,
        detail: `${agentName} shared the current evidence boundary and opened the cross-Agent check.`,
      },
      {
        id: `${interactionId}-response`,
        label: `${partnerName} · Cross-check feedback returned`,
        detail: `${partnerName} responded: ${detail}`,
      },
      {
        id: `${interactionId}-handoff`,
        label: completed ? "Joint confirmation completed" : "Joint confirmation in progress",
        detail: completed
          ? "Both Agents confirmed the handling decision and prepared the reconciled finding for Investor AI."
          : "Both Agents are confirming the handling decision before returning the reconciled finding to Investor AI.",
      },
    ];
  }

  return [
    {
      id: `${interactionId}-scope`,
      label: `${agentName} · 提交证据边界`,
      detail: `${agentName} 提交当前证据边界，发起跨 Agent 对齐。`,
    },
    {
      id: `${interactionId}-response`,
      label: `${partnerName} · 反馈核验意见`,
      detail: `${partnerName} 反馈：${detail}`,
    },
    {
      id: `${interactionId}-handoff`,
      label: completed ? "双方确认处理方式" : "双方确认处理方式中",
      detail: completed
        ? "双方确认处理方式与回流条件，协同结论已准备好。"
        : "双方正在确认处理方式与回流条件，随后回流投资官AI。",
    },
  ];
}

function getAgentWorkItems(
  agent: YaojuDemoAgent,
  runtime: ReturnType<typeof getYaojuAgentRuntime>,
  locale: "zh-CN" | "en-US",
  dispatchedAgentIds: Set<string>,
  progress: number,
  workflowStatus: ValidationDemoStatus
): AgentWorkItem[] {
  const isEnglish = locale === "en-US";
  // 只把当前批次实际派遣的 Agent 纳入协同关系，避免静态目录造成误导。
  const agentDirectory = localizeYaojuAgents(getYaojuDemoAgents(), locale);
  const items: AgentWorkItem[] = [];

  agent.steps.forEach((step, index) => {
    const status = getWorkItemStatus(runtime, index);
    if (status === "queued") return;

    items.push({
      kind: "task",
      id: `${agent.id}-work-${index}`,
      title: step,
      detail: WORK_DETAIL_COPY[index][isEnglish ? "en" : "zh"],
      status,
    });

    getYaojuAgentCollaborations(agent.id, index).forEach((collaboration) => {
      if (!dispatchedAgentIds.has(collaboration.partnerId)) return;
      const partner = agentDirectory.find(
        (item) => item.id === collaboration.partnerId
      );
      if (!partner) return;

      // Apply the same lifecycle override to both participants. In
      // particular, a cancelled workflow must not leave a partner looking
      // like it is still collaborating just because the last progress tick
      // was emitted while its runtime was active.
      const partnerRuntime = getWorkflowAgentRuntime(
        partner.id,
        progress,
        workflowStatus
      );
      const bothStarted =
        hasRuntimeStartedStep(runtime, collaboration.agentStep) &&
        hasRuntimeStartedStep(partnerRuntime, collaboration.partnerStep);
      if (!bothStarted) return;

      const bothCompleted =
        hasRuntimeCompletedStep(runtime, collaboration.agentStep) &&
        hasRuntimeCompletedStep(partnerRuntime, collaboration.partnerStep);
      items.push({
        kind: "collaboration",
        id: `${agent.id}-collaboration-${collaboration.interactionId}`,
        title: isEnglish
          ? `Collaborating with ${partner.name}`
          : `与 ${partner.name} 协同`,
        detail: collaboration[isEnglish ? "en" : "zh"],
        status: bothCompleted ? "completed" : "running",
        rounds: buildCollaborationRounds({
          interactionId: collaboration.interactionId,
          agentName: agent.name,
          partnerName: partner.name,
          detail: collaboration[isEnglish ? "en" : "zh"],
          locale,
          completed: bothCompleted,
        }),
        participants: [
          { id: agent.id, name: agent.name },
          { id: partner.id, name: partner.name },
        ],
      });
    });
  });

  if (runtime.status === "complete") {
    items.push({
      kind: "result",
      id: `${agent.id}-work-result`,
      title: isEnglish ? "Result returned to Investor AI" : "结论已回流投资官AI",
      detail: agent.output,
      status: "completed",
    });
  }
  return items;
}

function visibleClaimCount(progress: number) {
  if (progress >= YAOJU_DEMO_TIMELINE.claimsEnd) return YAOJU_CLAIMS.length;
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

function nearestPageAsset(page: number) {
  if (PAGE_ASSETS[page]) return page;
  if (page <= 3) return 2;
  if (page <= 4) return 4;
  if (page <= 5) return 5;
  if (page <= 7) return 6;
  if (page <= 8) return 8;
  if (page <= 10) return 9;
  if (page <= 12) return 11;
  if (page <= 13) return 13;
  if (page <= 14) return 14;
  return 15;
}

function PdfPreview({
  page,
  scanning = false,
  caption,
}: {
  page: number;
  scanning?: boolean;
  caption?: string;
}) {
  const { locale } = useLocale();
  const assetPage = nearestPageAsset(page);
  const documentName = localizeYaojuDocumentName(locale);
  return (
    <div className="flex h-[390px] min-h-0 flex-col bg-[var(--wz-color-bg-subtle)] p-3 sm:p-4 md:h-full md:min-h-[420px]">
      <div className="mb-3 flex items-center justify-between gap-3 text-[length:var(--wz-font-size-caption)] text-[color:var(--wz-color-text-secondary)]">
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <AppIcon icon={IconFileText} size={11} className="text-[color:var(--wz-color-text-secondary)]" />
          <span className="truncate">{documentName}</span>
        </span>
        <span className="shrink-0 font-mono">P.{page} / 15</span>
      </div>
      <div className="relative min-h-0 flex-1 overflow-hidden border border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-surface)] shadow-[var(--wz-shadow-sm)]">
        {locale === "en-US" ? (
          <div className="h-full overflow-hidden bg-white px-8 py-7 text-neutral-900">
            <p className="text-[length:var(--wz-font-size-caption)] font-semibold uppercase text-neutral-400">Yaoju Manufacturing · Confidential</p>
            <h4 className="mt-4 text-xl font-semibold">Pre-Investment Analysis</h4>
            <p className="mt-1 text-xs text-neutral-500">Independent review · Page {page}</p>
            <div className="mt-7 grid grid-cols-3 gap-3">
              {["2026E Revenue", "Signed Backlog", "Pre-Money"].map((label, index) => (
                <div key={label} className="border-t-2 border-neutral-900 pt-2">
                  <p className="text-[length:var(--wz-font-size-caption)] text-neutral-500">{label}</p>
                  <p className="mt-1 text-sm font-semibold">{["RMB 222M", "RMB 96M", "RMB 680M"][index]}</p>
                </div>
              ))}
            </div>
            <div className="mt-7 space-y-4">
              <div><p className="text-xs font-semibold">Investment conclusion</p><p className="mt-1 text-[length:var(--wz-font-size-caption)] leading-5 text-neutral-600">Proceed with conditions, subject to revenue verification, IP ownership, and data authorization.</p></div>
              <div><p className="text-xs font-semibold">Key evidence</p><p className="mt-1 text-[length:var(--wz-font-size-caption)] leading-5 text-neutral-600">Customer retention, backlog coverage, deployment efficiency, and valuation returns require independent reconciliation.</p></div>
            </div>
          </div>
        ) : (
          <img
            src={PAGE_ASSETS[assetPage]}
            alt={`${YAOJU_DEMO_DOCUMENT_NAME} 第 ${page} 页预览`}
            className="h-full w-full object-contain object-top"
          />
        )}
        {scanning && (
          <>
            <span className="demo-document-scan pointer-events-none absolute inset-x-0 h-px bg-[var(--wz-color-status-running)] shadow-[0_0_12px_2px_rgba(255,141,39,0.35)]" />
            <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-[var(--wz-radius-sm)] bg-[var(--wz-color-action-primary)] px-2 py-1 text-[length:var(--wz-font-size-tag)] leading-[var(--wz-line-height-tag)] font-medium text-[var(--wz-color-text-inverse)]">
              <AppIcon icon={IconSearch} size={9} className="animate-pulse motion-reduce:animate-none" />
              {locale === "en-US" ? "Locating verifiable passages" : "正在定位可验证片段"}
            </span>
          </>
        )}
      </div>
      {caption && <p className="mt-2 text-[length:var(--wz-font-size-caption)] leading-relaxed text-[color:var(--wz-color-text-secondary)]">{caption}</p>}
    </div>
  );
}

function DocumentView({
  progress,
  mode,
  status,
}: {
  progress: number;
  mode: ValidationDemoMode;
  status: ValidationDemoStatus;
}) {
  const { locale } = useLocale();
  const isCrossValidation = mode === "cross-validation";
  return (
    <div className="thin-scroll h-full overflow-y-auto md:grid md:grid-cols-[minmax(220px,0.8fr)_minmax(280px,1fr)] md:overflow-hidden">
      <PdfPreview
        page={2}
        scanning={
          status === "running" && progress < YAOJU_DEMO_TIMELINE.intentEnd
        }
        caption={locale === "en-US" ? "Executive summary, key metrics, and the stated investment conclusion identified. Every downstream claim retains a page anchor." : "已识别执行摘要、关键指标和原始投资结论，所有后续节点将保留页码锚点。"}
      />
      <div className="thin-scroll px-5 py-5 sm:px-7 sm:py-6 md:overflow-y-auto">
        <h3 className="text-[length:var(--wz-font-size-section)] font-semibold text-[var(--wz-color-text-primary)]">
          {locale === "en-US" ? (isCrossValidation ? "First understand why the user needs validation" : "First understand the investment objective") : (isCrossValidation ? "先理解用户为什么要验证" : "先理解用户为什么要分析")}
        </h3>

        <dl className="mt-6 divide-y divide-[var(--wz-color-border-subtle)] border-y border-[var(--wz-color-border-subtle)] text-[length:var(--wz-font-size-body)]">
          <div className="grid grid-cols-[88px_1fr] gap-4 py-3">
            <dt className="text-[color:var(--wz-color-text-tertiary)]">{locale === "en-US" ? "Report" : "报告对象"}</dt>
            <dd className="font-medium text-[var(--wz-color-text-primary)]">{locale === "en-US" ? "Yaoju Manufacturing · Pre-Investment Analysis Report" : `${YAOJU_REPORT_META.company} · 投前投资分析报告`}</dd>
          </div>
          <div className="grid grid-cols-[88px_1fr] gap-4 py-3">
            <dt className="text-[color:var(--wz-color-text-tertiary)]">{locale === "en-US" ? "Structure" : "文档结构"}</dt>
            <dd className="text-[color:var(--wz-color-text-secondary)]">{locale === "en-US" ? "15 pages · 14 sections · 3 key data tables" : "15 页 · 14 个章节 · 3 张核心数据表"}</dd>
          </div>
          <div className="grid grid-cols-[88px_1fr] gap-4 py-3">
            <dt className="text-[color:var(--wz-color-text-tertiary)]">{locale === "en-US" ? "Stated decision" : "原始结论"}</dt>
            <dd><span className="font-semibold text-[var(--wz-color-text-primary)]">{locale === "en-US" ? "Proceed with conditions" : "有条件推进"}</span></dd>
          </div>
        </dl>

        <section className="mt-6 rounded-[var(--wz-radius-md)] border border-[var(--wz-color-border-default)] bg-[var(--wz-color-status-info-subtle)] px-4 py-3">
          <div className="flex items-center gap-2 text-[length:var(--wz-font-size-caption)] font-semibold text-[var(--wz-color-status-info)]">
            <AppIcon icon={IconAuto} size={12} />
            {locale === "en-US" ? "Investment objective" : "用户动机判断"}
          </div>
          <p className="mt-1.5 text-[length:var(--wz-font-size-body)] leading-6 text-[color:var(--wz-color-text-secondary)]">
            {isCrossValidation
              ? locale === "en-US" ? "Test whether the key claims support proceeding with conditions, and identify evidence gaps that could change valuation or deal terms." : YAOJU_REPORT_META.inferredIntent
              : locale === "en-US" ? "Form an independent investment view focused on growth quality, product moat, valuation returns, and risks that could change the deal decision." : "基于上传材料形成独立投资判断，重点分析增长质量、产品壁垒、估值回报和会改变交易结论的风险条件。"}
          </p>
        </section>

        <div className="mt-6">
          <p className="text-[length:var(--wz-font-size-caption)] font-semibold text-[var(--wz-color-text-primary)]">{locale === "en-US" ? "Four decision questions" : "需要拆开的四类问题"}</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {(locale === "en-US" ? ["Is growth real and sustainable?", "Is the product moat verifiable?", "Are valuation and return definitions consistent?", "Are deal-breaker issues fully resolved?"] : ["增长是否真实可持续", "产品壁垒是否可核验", "估值回报是否口径一致", "一票否决项是否闭环"]).map((item, index) => (
              <div key={item} className="flex items-center gap-2 border border-[var(--wz-color-border-subtle)] bg-[var(--wz-color-bg-subtle)] px-3 py-2 text-[length:var(--wz-font-size-caption)] text-[color:var(--wz-color-text-secondary)]">
                <span className="font-mono text-[length:var(--wz-font-size-caption)] text-[color:var(--wz-color-text-tertiary)]">0{index + 1}</span>
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ClaimMapScanCard({
  scanning,
  stopped = false,
}: {
  scanning: boolean;
  stopped?: boolean;
}) {
  const { locale } = useLocale();
  const documentName = localizeYaojuDocumentName(locale);
  return (
    <div className="shrink-0 border-b border-[var(--wz-color-border-subtle)] bg-[var(--wz-color-bg-subtle)] px-4 py-3 sm:px-6 sm:py-4">
      <div className="relative overflow-hidden rounded-[var(--wz-radius-md)] border border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-surface)] shadow-[var(--wz-shadow-sm)]">
        {scanning && (
          <span
            aria-hidden
            className="demo-document-scan-horizontal pointer-events-none absolute inset-y-0 z-10 w-px bg-[var(--wz-color-status-running)] shadow-[0_0_18px_6px_rgba(255,141,39,0.16)]"
          />
        )}

        <div className="relative flex min-w-0 items-center gap-3 px-3.5 py-3 sm:px-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--wz-radius-md)] bg-[var(--wz-color-action-primary)] text-[var(--wz-color-text-inverse)]">
            <AppIcon icon={IconFileText} size={14} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[length:var(--wz-font-size-body)] font-semibold text-[var(--wz-color-text-primary)]">
              {documentName}
            </span>
            <span className="mt-0.5 flex items-center gap-1.5 text-[length:var(--wz-font-size-caption)] text-[color:var(--wz-color-text-secondary)]">
              <AppIcon
                icon={scanning ? IconRefresh : stopped ? IconStop : IconCheckCircle}
                size={9}
                className={
                  scanning
                    ? "animate-spin motion-reduce:animate-none text-[var(--wz-color-status-running)]"
                    : stopped
                      ? "text-[var(--wz-color-status-danger)]"
                      : "text-[var(--wz-color-status-success)]"
                }
              />
              {locale === "en-US"
                ? scanning
                  ? "Scanning and building verifiable claims"
                  : stopped
                    ? "Document scan stopped"
                    : "Document scan complete"
                : scanning
                  ? "正在扫描并建立可验证主张"
                  : stopped
                    ? "文档扫描已停止"
                    : "文档扫描完成"}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

function ClaimMapView({
  progress,
  status,
}: {
  progress: number;
  status: ValidationDemoStatus;
}) {
  const { locale } = useLocale();
  const localizedClaims = useMemo(
    () => localizeYaojuClaims(YAOJU_CLAIMS, locale),
    [locale]
  );
  const count =
    status === "completed" ? localizedClaims.length : visibleClaimCount(progress);
  const claimMapComplete =
    status === "completed" || progress >= YAOJU_DEMO_TIMELINE.claimsEnd;
  const claimMapStopped = status === "cancelled" && !claimMapComplete;
  const scanning =
    status === "running" && progress < YAOJU_DEMO_TIMELINE.claimsEnd;
  const visible = localizedClaims.slice(0, count);
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  const treeScrollRef = useRef<HTMLDivElement>(null);
  const selected = localizedClaims.find((claim) => claim.id === selectedClaimId) ?? visible.at(-1);
  const branches = locale === "en-US"
    ? ["Commercial Growth", "Product Moat", "Financials & Valuation", "Risk & Deal Terms"]
    : ["商业增长", "产品壁垒", "财务估值", "风险交易"];
  const visibleBranches = branches.filter((branch) =>
    visible.some((claim) => claim.branch === branch)
  );

  useEffect(() => {
    const latest = localizedClaims[count - 1];
    if (!latest) return;
    setSelectedClaimId(latest.id);
    const frame = window.requestAnimationFrame(() => {
      const node = treeScrollRef.current?.querySelector<HTMLElement>(
        `[data-claim-id="${latest.id}"]`
      );
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      node?.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "center",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [count, localizedClaims]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <ClaimMapScanCard
        scanning={scanning}
        stopped={claimMapStopped}
      />
      <div
        ref={treeScrollRef}
        className="thin-scroll min-h-0 flex-1 scroll-smooth overflow-y-auto px-4 py-5 sm:px-6"
      >
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--wz-color-border-subtle)] pb-4">
          <div>
            <h3 className="inline-flex items-center gap-2 text-[length:var(--wz-font-size-section)] font-semibold text-[var(--wz-color-text-primary)]">
              {scanning && (
                <AppIcon
                  icon={IconRefresh}
                  size={13}
                  className="animate-spin text-[var(--wz-color-status-running)] motion-reduce:animate-none"
                  aria-hidden="true"
                />
              )}
              {claimMapComplete
                ? locale === "en-US"
                  ? "Claim map extracted information from the source"
                  : "主张地图已从原文提取信息"
                : claimMapStopped
                  ? locale === "en-US"
                    ? "Claim map extraction stopped"
                    : "主张地图已停止提取信息"
                  : locale === "en-US"
                    ? "Claim map extracting information from the source"
                    : "主张地图正在从原文提取信息"}
            </h3>
          </div>
          <span className="font-mono text-[length:var(--wz-font-size-body)] font-semibold text-[var(--wz-color-status-info)]">
            {claimMapComplete ? `${count} / ${localizedClaims.length}` : locale === "en-US" ? `${count} identified` : `${count} 已识别`}
          </span>
        </div>

        <div className="mt-5">
          {visibleBranches.length === 0 ? (
            <div className="ml-5 mt-3 inline-flex items-center gap-2 text-[length:var(--wz-font-size-body)] text-[color:var(--wz-color-text-secondary)]">
              {scanning && (
                <AppIcon
                  icon={IconRefresh}
                  size={11}
                  className="animate-spin text-[var(--wz-color-status-running)] motion-reduce:animate-none"
                  aria-hidden="true"
                />
              )}
              {claimMapStopped
                ? locale === "en-US"
                  ? "No additional claim branches were organized before the task stopped"
                  : "任务停止前未完成更多主张分支整理"
                : locale === "en-US"
                  ? "Reading the source and mapping relationships between claims"
                  : "正在阅读原文并归纳主张之间的关系"}
            </div>
          ) : (
            <div className="ml-5 border-l border-[var(--wz-color-border-strong)] pl-5 pt-3">
            {visibleBranches.map((branch) => {
              const claims = visible.filter((claim) => claim.branch === branch);
              const total = localizedClaims.filter((claim) => claim.branch === branch).length;
              return (
                <section key={branch} className="demo-claim-node relative mb-4 last:mb-0">
                  <span
                    aria-hidden="true"
                    className="demo-claim-connector demo-claim-connector--branch -left-5 top-3 h-px w-5"
                  />
                  <div className="flex items-center gap-2 text-[length:var(--wz-font-size-body)] font-semibold text-[var(--wz-color-text-primary)]">
                    <span className="flex h-6 w-6 items-center justify-center border border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-subtle)] text-[color:var(--wz-color-text-secondary)]">
                      <AppIcon icon={IconBranches} size={10} />
                    </span>
                    {branch}
                    <span className="font-mono text-[length:var(--wz-font-size-caption)] font-normal text-[color:var(--wz-color-text-tertiary)]">
                      {claimMapComplete ? `${claims.length}/${total}` : locale === "en-US" ? `${claims.length} nodes` : `${claims.length} 个节点`}
                    </span>
                  </div>
                  <div className="ml-3 border-l border-[var(--wz-color-border-default)] pl-4 pt-2">
                    {claims.map((claim, index) => (
                        <button
                          key={claim.id}
                          data-claim-id={claim.id}
                          type="button"
                          onClick={() => setSelectedClaimId(claim.id)}
                          className={cn(
                            "demo-claim-node relative mb-1.5 flex w-full items-start gap-2 border px-2.5 py-2 text-left transition-colors last:mb-0",
                            "outline-none transition-[background-color,border-color,box-shadow] [transition-duration:var(--wz-duration-fast)] [transition-timing-function:var(--wz-ease-standard)] focus-visible:shadow-[0_0_0_3px_var(--wz-color-focus-ring)]",
                            selected?.id === claim.id
                              ? "border-[var(--wz-color-status-info)] bg-[var(--wz-color-status-info-subtle)]"
                              : "border-[var(--wz-color-border-subtle)] bg-[var(--wz-color-bg-surface)] hover:border-[var(--wz-color-border-default)] hover:bg-[var(--wz-color-bg-subtle)]"
                          )}
                          style={{ animationDelay: `${index * 70}ms` }}
                        >
                          <span
                            aria-hidden="true"
                            className="demo-claim-connector demo-claim-connector--claim -left-[17px] top-4 h-px w-4"
                          />
                          <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", ["核心", "Critical"].includes(String(claim.priority)) ? "bg-[var(--wz-color-action-primary)]" : "bg-[var(--wz-color-status-info)]")} />
                          <span className="min-w-0 flex-1">
                            <span className="block text-[length:var(--wz-font-size-body)] leading-5 text-[color:var(--wz-color-text-secondary)]">{claim.claim}</span>
                            <span className="mt-1 block font-mono text-[length:var(--wz-font-size-caption)] text-[color:var(--wz-color-text-tertiary)]">P.{claim.page} · {claim.priority} · {claim.agentId.toUpperCase()}</span>
                          </span>
                        </button>
                      ))}
                  </div>
                </section>
              );
            })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AgentView({
  progress,
  status,
  agents,
  selectedAgentId,
  onSelect,
}: {
  progress: number;
  status: ValidationDemoStatus;
  agents: YaojuDemoAgent[];
  selectedAgentId?: string;
  onSelect: (agentId: string) => void;
}) {
  const { locale } = useLocale();
  const agent = agents.find((item) => item.id === selectedAgentId) ?? agents[0];
  const runtime = localizeYaojuRuntime(
    getWorkflowAgentRuntime(agent.id, progress, status),
    locale
  );
  const workflowStopped = status === "cancelled";
  const assignedClaims = localizeYaojuClaims(YAOJU_CLAIMS, locale).filter(
    (claim) => claim.agentId === agent.id
  );
  const workItems = getAgentWorkItems(
    agent,
    runtime,
    locale,
    new Set(agents.map((item) => item.id)),
    progress,
    status
  );
  const activeWorkItem =
    workItems.find(
      (item) => item.kind === "collaboration" && item.status === "running"
    ) ??
    workItems.find(
      (item) => item.status === "running" || item.status === "review"
    );
  const activeWorkRef = useRef<HTMLLIElement | null>(null);
  // Collaboration events are useful context, so they open by default. Keep a
  // collapsed set instead of an expanded set so newly surfaced events inherit
  // the default without resetting a user's explicit collapse choice.
  const [collapsedCollaborationIds, setCollapsedCollaborationIds] = useState<Set<string>>(
    () => new Set()
  );

  useEffect(() => {
    setCollapsedCollaborationIds(new Set());
  }, [agent.id]);

  const toggleCollaboration = (itemId: string) => {
    setCollapsedCollaborationIds((current) => {
      const next = new Set(current);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  useEffect(() => {
    if (!activeWorkItem) return;
    const frame = window.requestAnimationFrame(() => {
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
      activeWorkRef.current?.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "center",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeWorkItem?.id, agent.id]);

  const statusLabel =
    workflowStopped
      ? locale === "en-US" ? "Stopped" : "已停止"
      : runtime.status === "complete"
        ? locale === "en-US" ? "Completed" : "已完成"
        : runtime.status === "rework"
          ? locale === "en-US" ? "Reworking" : "返工中"
        : runtime.status === "review"
          ? locale === "en-US" ? "Pending review" : "待验收"
          : runtime.status === "running"
            ? locale === "en-US" ? "Working" : "执行中"
            : locale === "en-US" ? "Awaiting dispatch" : "等待派遣";
  const statusTone =
    workflowStopped
      ? "border-[var(--wz-color-status-danger)] bg-[var(--wz-color-status-danger-subtle)] text-[var(--wz-color-status-danger)]"
      : runtime.status === "complete"
        ? "border-[var(--wz-color-status-success)] bg-[var(--wz-color-status-success-subtle)] text-[var(--wz-color-status-success)]"
        : runtime.status === "rework"
          ? "border-[var(--wz-color-status-running)] bg-[var(--wz-color-status-running-subtle)] text-[var(--wz-color-status-running)]"
        : runtime.status === "review"
          ? "border-[var(--wz-color-status-warning)] bg-[var(--wz-color-status-warning-subtle)] text-[var(--wz-color-status-warning)]"
          : runtime.status === "running"
            ? "border-[var(--wz-color-status-running)] bg-[var(--wz-color-status-running-subtle)] text-[var(--wz-color-status-running)]"
            : "border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-subtle)] text-[color:var(--wz-color-text-secondary)]";

  return (
    <div className="thin-scroll h-full overflow-y-auto md:grid md:grid-cols-[minmax(176px,0.24fr)_minmax(0,1fr)] md:overflow-hidden">
      <nav
        aria-label={locale === "en-US" ? "Specialist Agent list" : "专业 Agent 列表"}
        className="border-b border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-surface)] p-3 md:border-b-0 md:border-r"
      >
        <p className="px-2 pb-2 text-[length:var(--wz-font-size-caption)] font-semibold text-[color:var(--wz-color-text-secondary)]">
          {locale === "en-US" ? "Specialist Agents" : "专业 Agent"}
        </p>
        <div className="grid grid-cols-1 gap-1.5">
          {agents.map((item) => {
            const itemRuntime = localizeYaojuRuntime(
              getWorkflowAgentRuntime(item.id, progress, status),
              locale
            );
            const selected = item.id === agent.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item.id)}
                aria-current={selected ? "page" : undefined}
                className={cn(
                  "flex min-w-0 items-center gap-2.5 rounded-[var(--wz-radius-md)] px-2 py-2 text-left outline-none transition-[background-color,color,box-shadow] [transition-duration:var(--wz-duration-fast)] [transition-timing-function:var(--wz-ease-standard)] focus-visible:shadow-[0_0_0_3px_var(--wz-color-focus-ring)]",
                  selected
                    ? "bg-[var(--wz-color-bg-subtle)] text-[var(--wz-color-text-primary)]"
                    : "text-[color:var(--wz-color-text-secondary)] hover:bg-[var(--wz-color-bg-subtle)] hover:text-[var(--wz-color-text-primary)]"
                )}
              >
                <YaojuAgentAvatar agentId={item.id} name={item.name} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-[length:var(--wz-font-size-caption)] font-semibold text-[var(--wz-color-text-primary)]">
                      {item.name}
                    </span>
                    {status === "running" &&
                      (itemRuntime.status === "running" ||
                      itemRuntime.status === "review" ||
                      itemRuntime.status === "rework") && (
                      <AppIcon
                        icon={IconRefresh}
                        size={11}
                        className={cn(
                          "animate-spin motion-reduce:animate-none",
                          itemRuntime.status === "review"
                            ? "text-[var(--wz-color-status-warning)]"
                            : "text-[var(--wz-color-status-running)]"
                        )}
                        title={itemRuntime.statusLabel}
                        aria-label={itemRuntime.statusLabel}
                      />
                    )}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      <div className="thin-scroll min-w-0 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6 md:overflow-y-auto">
        <div className="sticky top-0 z-10 -mx-5 border-b border-[var(--wz-color-border-subtle)] bg-[var(--wz-color-bg-surface)] px-5 pb-4 sm:-mx-7 sm:px-7">
          <div className="flex min-w-0 items-start gap-3">
            <YaojuAgentAvatar agentId={agent.id} name={agent.name} size="lg" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-2.5">
                <div className="min-w-0">
                  <h3 className="truncate text-[length:var(--wz-font-size-title)] font-semibold leading-6 text-[var(--wz-color-text-primary)]">
                    {agent.name}
                  </h3>
                  <p className="mt-0.5 text-[length:var(--wz-font-size-caption)] text-[color:var(--wz-color-text-secondary)]">
                    {agent.role}
                  </p>
                </div>
                {status === "completed" && (
                  <span
                    className={cn(
                      "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[length:var(--wz-font-size-tag)] font-semibold leading-[var(--wz-line-height-tag)]",
                      statusTone
                    )}
                  >
                    {isRuntimeWorking(runtime) ? (
                      <AppIcon
                        icon={IconRefresh}
                        size={10}
                        className="animate-spin motion-reduce:animate-none"
                        aria-hidden="true"
                      />
                    ) : (
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          runtime.status === "complete" && "bg-[var(--wz-color-status-success)]",
                          runtime.status === "queued" && "bg-[var(--wz-color-text-tertiary)]"
                        )}
                        aria-hidden="true"
                      />
                    )}
                    {statusLabel}
                  </span>
                )}
              </div>
              <p className="mt-2 max-w-2xl text-[length:var(--wz-font-size-body)] leading-5 text-[color:var(--wz-color-text-secondary)]">
                {agent.assignment}
              </p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-[length:var(--wz-font-size-tag)] leading-[var(--wz-line-height-tag)]">
            <span className="inline-flex items-center gap-1.5 rounded-[var(--wz-radius-sm)] bg-[var(--wz-color-bg-subtle)] px-2 py-1 text-[color:var(--wz-color-text-secondary)]">
              {locale === "en-US" ? `${assignedClaims.length} assigned claims` : `负责 ${assignedClaims.length} 项主张`}
            </span>
            <span className="inline-flex min-w-0 items-center rounded-[var(--wz-radius-sm)] bg-[var(--wz-color-bg-subtle)] px-2 py-1 text-[color:var(--wz-color-text-tertiary)]">
              <span className="truncate" title={agent.evidenceGoal}>
                {locale === "en-US" ? "Acceptance: " : "验收："}
                {agent.evidenceGoal}
              </span>
            </span>
          </div>
        </div>

        <section className="mt-5 pb-2" aria-labelledby="agent-work-feed-title">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h4
                id="agent-work-feed-title"
                className="text-[length:var(--wz-font-size-subtitle)] font-semibold leading-5 text-[var(--wz-color-text-primary)]"
              >
                {locale === "en-US" ? "Work items" : "工作项"}
              </h4>
              <p
                aria-live="polite"
                className="mt-0.5 text-[length:var(--wz-font-size-caption)] text-[color:var(--wz-color-text-tertiary)]"
              >
                {locale === "en-US"
                  ? `${runtime.completedStepCount} of ${agent.steps.length} work items completed`
                  : `已完成 ${runtime.completedStepCount} / ${agent.steps.length} 项工作`}
              </p>
            </div>
            <span className="font-mono text-[length:var(--wz-font-size-body)] font-semibold tabular-nums text-[color:var(--wz-color-text-secondary)]">
              {Math.round(runtime.progress)}%
            </span>
          </div>

          <div
            className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--wz-color-border-subtle)]"
            role="progressbar"
            aria-label={locale === "en-US" ? `${agent.name} execution progress` : `${agent.name}执行进度`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(runtime.progress)}
          >
            <div
              className={cn(
                "h-full origin-left rounded-full transition-[width] duration-[var(--wz-duration-normal)] ease-[var(--wz-ease-standard)] motion-reduce:transition-none",
                "bg-[var(--wz-color-action-primary)]"
              )}
              style={{
                width: `${Math.max(0, Math.min(100, runtime.progress))}%`,
              }}
            />
          </div>

          <ol
            className="relative mt-4 space-y-3"
            aria-label={locale === "en-US" ? "Agent live work items" : "Agent 实时工作项"}
          >
            <li
              aria-hidden="true"
              className="pointer-events-none absolute bottom-5 left-3.5 top-5 list-none w-px bg-[var(--wz-color-border-default)]"
            />
            {workItems.length === 0 ? (
              <li
                className="relative flex items-center gap-2 rounded-[var(--wz-radius-md)] border border-[var(--wz-color-border-subtle)] bg-[var(--wz-color-bg-subtle)] px-3.5 py-3 text-[length:var(--wz-font-size-body)] text-[color:var(--wz-color-text-secondary)]"
                role="status"
                aria-live="polite"
              >
                {isRuntimeWorking(runtime) ? (
                  <AppIcon
                    icon={IconRefresh}
                    size={11}
                    className="animate-spin text-[var(--wz-color-status-running)] motion-reduce:animate-none"
                    aria-hidden="true"
                  />
                ) : null}
                {workflowStopped
                  ? locale === "en-US"
                    ? "No work item was recorded before the task stopped"
                    : "任务停止前尚未记录工作项"
                  : locale === "en-US"
                    ? "Waiting for this Agent to start"
                    : "等待该 Agent 开始执行"}
              </li>
            ) : workItems.map((item) => {
              const isActive = item.id === activeWorkItem?.id;
              const itemStatusLabel = item.kind === "collaboration"
                ? item.status === "completed"
                  ? locale === "en-US" ? "Collaboration complete" : "协同完成"
                  : locale === "en-US" ? "Collaborating" : "协同中"
                : item.status === "completed"
                  ? locale === "en-US" ? "Completed" : "已完成"
                  : item.status === "review"
                    ? locale === "en-US" ? "Pending review" : "待验收"
                    : item.status === "running"
                      ? locale === "en-US" ? "Working" : "执行中"
                      : item.status === "failed"
                        ? locale === "en-US" ? "Failed" : "失败"
                        : locale === "en-US" ? "Queued" : "等待中";
              const itemTone =
                item.status === "completed"
                  ? "border-[var(--wz-color-border-subtle)] bg-[var(--wz-color-bg-subtle)]"
                  : item.status === "review"
                    ? "border-[var(--wz-color-status-warning)] bg-[var(--wz-color-status-warning-subtle)]"
                    : item.status === "running"
                      ? "border-[var(--wz-color-border-strong)] bg-[var(--wz-color-bg-surface)]"
                      : item.status === "failed"
                        ? "border-[var(--wz-color-status-danger)] bg-[var(--wz-color-status-danger-subtle)]"
                        : "border-[var(--wz-color-border-subtle)] bg-[var(--wz-color-bg-surface)] opacity-70";
              const collaborationExpanded =
                item.kind === "collaboration" && !collapsedCollaborationIds.has(item.id);
              const collaborationDetailsId = `${item.id}-details`;
              const showItemStatus = status === "running";
              const showCollaborationToggle = item.kind === "collaboration";
              return (
                <li
                  key={item.id}
                  ref={isActive ? activeWorkRef : undefined}
                  role={item.kind === "collaboration" ? "button" : undefined}
                  tabIndex={item.kind === "collaboration" ? 0 : undefined}
                  aria-expanded={item.kind === "collaboration" ? collaborationExpanded : undefined}
                  aria-controls={item.kind === "collaboration" ? collaborationDetailsId : undefined}
                  onClick={item.kind === "collaboration" ? () => toggleCollaboration(item.id) : undefined}
                  onKeyDown={
                    item.kind === "collaboration"
                      ? (event) => {
                          if (event.key !== "Enter" && event.key !== " ") return;
                          event.preventDefault();
                          toggleCollaboration(item.id);
                        }
                      : undefined
                  }
                  className={cn(
                    "relative ml-0 min-w-0 rounded-[var(--wz-radius-md)] border px-3.5 py-3 transition-[border-color,background-color,box-shadow,opacity] duration-[var(--wz-duration-normal)] ease-[var(--wz-ease-standard)]",
                    itemTone,
                    item.kind === "collaboration" &&
                      "cursor-pointer outline-none hover:border-[var(--wz-color-border-strong)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--wz-color-focus-ring)]",
                    isActive && "animate-task-card-reveal motion-reduce:animate-none"
                  )}
                >
                  <div className="flex min-w-0 items-start gap-3">
                    {item.kind === "collaboration" ? (
                      <span
                        className="relative z-[1] mt-0.5 flex h-7 w-12 shrink-0 -space-x-2"
                        aria-label={locale === "en-US" ? "Collaborating Agents" : "协同 Agent"}
                      >
                        {item.participants.map((participant, index) => (
                          <YaojuAgentAvatar
                            key={participant.id}
                            agentId={participant.id}
                            name={participant.name}
                            size="xs"
                            className={cn(
                              "ring-2 ring-[var(--wz-color-bg-surface)]",
                              index === 0 && "relative z-[1]"
                            )}
                          />
                        ))}
                      </span>
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <h5 className="min-w-0 flex-1 text-[length:var(--wz-font-size-subtitle)] font-semibold leading-5 text-[var(--wz-color-text-primary)]">
                          {item.title}
                        </h5>
                        {(showItemStatus || showCollaborationToggle) && (
                          <span
                            className={cn(
                              "inline-flex shrink-0 items-center gap-1 rounded-[var(--wz-radius-sm)] text-[length:var(--wz-font-size-tag)] font-medium leading-[var(--wz-line-height-tag)]",
                              showItemStatus && "px-2 py-0.5",
                              showItemStatus && item.status === "completed" && "bg-[var(--wz-color-status-success-subtle)] text-[var(--wz-color-status-success)]",
                              showItemStatus && item.status === "review" && "bg-[var(--wz-color-status-warning-subtle)] text-[var(--wz-color-status-warning)]",
                              showItemStatus && item.status === "running" && "bg-[var(--wz-color-status-running-subtle)] text-[var(--wz-color-status-running)]",
                              showItemStatus && item.status === "failed" && "bg-[var(--wz-color-status-danger-subtle)] text-[var(--wz-color-status-danger)]",
                              showItemStatus && item.status === "queued" && "bg-[var(--wz-color-border-subtle)] text-[color:var(--wz-color-text-tertiary)]",
                              !showItemStatus && "text-[color:var(--wz-color-text-tertiary)]"
                            )}
                          >
                            {showItemStatus && isWorkItemActive(item.status) && (
                              <AppIcon
                                icon={IconRefresh}
                                size={9}
                                className="animate-spin motion-reduce:animate-none"
                                aria-hidden="true"
                              />
                            )}
                            {showItemStatus && itemStatusLabel}
                            {showCollaborationToggle && (
                              <AppIcon
                                icon={collaborationExpanded ? IconChevronUp : IconChevronDown}
                                size={9}
                                aria-hidden="true"
                              />
                            )}
                          </span>
                        )}
                      </div>
                      <p className="mt-1.5 text-[length:var(--wz-font-size-body)] leading-5 text-[color:var(--wz-color-text-secondary)]">
                        {item.detail}
                      </p>
                    </div>
                  </div>
                  {item.kind === "collaboration" && (
                    <div
                      id={collaborationDetailsId}
                      aria-hidden={!collaborationExpanded}
                      inert={collaborationExpanded ? undefined : true}
                      className={cn(
                        "grid transition-[grid-template-rows,opacity] [transition-duration:var(--wz-duration-normal)] [transition-timing-function:var(--wz-ease-standard)] motion-reduce:transition-none",
                        collaborationExpanded
                          ? "grid-rows-[1fr] opacity-100"
                          : "pointer-events-none grid-rows-[0fr] opacity-0"
                      )}
                    >
                      <div className="min-h-0 overflow-hidden">
                        <ol className="ml-[3.75rem] space-y-2 border-l border-[var(--wz-color-border-default)] pl-3 pt-3">
                          {item.rounds.map((round) => (
                            <li key={round.id} className="relative">
                              <span
                                aria-hidden="true"
                                className="absolute -left-[17px] top-1.5 h-1.5 w-1.5 rounded-full bg-[var(--wz-color-status-info)]"
                              />
                              <p className="text-[length:var(--wz-font-size-tag)] font-semibold leading-[var(--wz-line-height-tag)] text-[color:var(--wz-color-text-secondary)]">
                                {getCollaborationEventLabel(round.label)}
                              </p>
                              <p className="mt-0.5 text-[length:var(--wz-font-size-caption)] leading-4 text-[color:var(--wz-color-text-tertiary)]">
                                {round.detail}
                              </p>
                            </li>
                          ))}
                        </ol>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      </div>
    </div>
  );
}

function AggregationView({
  progress,
  status,
}: {
  progress: number;
  status: ValidationDemoStatus;
}) {
  const { locale } = useLocale();
  const completed =
    status === "completed" || (status !== "cancelled" && progress >= 100);
  const stopped = status === "cancelled" && !completed;
  const processing = !completed && !stopped;
  return (
    <div className="thin-scroll min-h-full overflow-y-auto px-5 py-6 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="text-center">
          <h3 className="inline-flex items-center gap-2 text-[length:var(--wz-font-size-title)] font-semibold text-[var(--wz-color-text-primary)]">
            {processing && (
              <AppIcon
                icon={IconRefresh}
                size={14}
                className="animate-spin text-[var(--wz-color-status-running)] motion-reduce:animate-none"
                aria-hidden="true"
              />
            )}
            {completed
              ? locale === "en-US" ? "Investor AI synthesized the full analysis" : "投资官AI已完成整体分析"
              : stopped
                ? locale === "en-US" ? "Investor AI stopped the full analysis" : "投资官AI已停止整体分析"
                : locale === "en-US" ? "Investor AI is synthesizing the full analysis" : "投资官AI正在整体分析"}
          </h3>
          <p className="mt-1 text-[length:var(--wz-font-size-caption)] text-[color:var(--wz-color-text-secondary)]">{locale === "en-US" ? "Supporting evidence, counter-evidence, definition gaps, and specialist judgment are converging into one decision matrix." : "支持证据、反证、口径差异和专业判断正在汇入同一张决策矩阵。"}</p>
        </div>

        <div className="mx-auto mt-7 flex max-w-md items-center gap-3 border-2 border-[var(--wz-color-action-primary)] bg-[var(--wz-color-action-primary)] px-4 py-3 text-[var(--wz-color-text-inverse)] shadow-[var(--wz-shadow-lg)]">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--wz-color-bg-surface)] text-[var(--wz-color-action-primary)]">
            <AppIcon icon={IconAuto} size={17} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[length:var(--wz-font-size-body)] font-semibold">{locale === "en-US" ? "Investor AI · Evidence Synthesizer" : "投资官AI · 证据聚合器"}</p>
            <p className="mt-0.5 text-[length:var(--wz-font-size-caption)] text-[var(--wz-color-text-inverse)] opacity-70">
              {locale === "en-US"
                ? completed
                  ? "16 claims graded; final report generated"
                  : stopped
                    ? "The task stopped before the final report was generated"
                    : "Resolving evidence conflicts and rewriting the investment conclusion"
                : completed
                  ? "16 项主张已分级，最终报告已生成"
                  : stopped
                    ? "任务停止前未生成最终报告"
                    : "正在消解证据冲突并重写投资结论"}
            </p>
          </div>
        </div>

        <section
          className={cn(
            "mt-7 rounded-[var(--wz-radius-md)] border border-[var(--wz-color-border-default)] px-4 py-3",
            completed || stopped
              ? "bg-[var(--wz-color-status-danger-subtle)]"
              : "bg-[var(--wz-color-status-running-subtle)]"
          )}
        >
          <p className={cn("inline-flex items-center gap-1.5 text-[length:var(--wz-font-size-caption)] font-semibold", completed || stopped ? "text-[var(--wz-color-status-danger)]" : "text-[var(--wz-color-status-running)]")}>
            {processing && (
              <AppIcon
                icon={IconRefresh}
                size={10}
                className="animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
            )}
            {locale === "en-US"
              ? completed
                ? "Synthesized investment view"
                : stopped
                  ? "Analysis stopped"
                  : "Analysis in progress"
              : completed
                ? "聚合后的核心判断"
                : stopped
                  ? "分析已停止"
                  : "整体分析中"}
          </p>
          <p className="mt-1.5 text-[length:var(--wz-font-size-body)] leading-5 text-[color:var(--wz-color-text-secondary)]">
            {completed
              ? locale === "en-US" ? "The direction to proceed with conditions remains supportable, but 2025A revenue authenticity, former-employee code ownership, and training-data rights must close before funding. Otherwise, reprice or terminate the transaction." : "原报告“有条件推进”方向可保留，但 2025A 收入真实性、两名前员工代码权属和训练数据授权必须在交割前闭环；否则重新定价或终止交易。"
              : stopped
                ? locale === "en-US" ? "The task stopped before the cross-Agent conflict matrix was complete." : "任务在跨 Agent 冲突矩阵完成前已停止。"
                : locale === "en-US" ? "Building a cross-Agent conflict matrix, normalizing revenue, market boundaries, and valuation definitions, and identifying gaps that could change the decision." : "正在建立跨 Agent 冲突矩阵，统一收入基数、市场边界和估值口径，并判断哪些证据缺口会改变原投资结论。"}
          </p>
        </section>
      </div>
    </div>
  );
}

function ValidationAggregationView({
  progress,
  status,
}: {
  progress: number;
  status: ValidationDemoStatus;
}) {
  const { locale } = useLocale();
  const completed =
    status === "completed" || (status !== "cancelled" && progress >= 100);
  const stopped = status === "cancelled" && !completed;
  const processing = !completed && !stopped;

  return (
    <div className="thin-scroll min-h-full overflow-y-auto px-5 py-6 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <h3 className="inline-flex items-center gap-2 text-[length:var(--wz-font-size-title)] font-semibold text-[var(--wz-color-text-primary)]">
            {processing && (
              <AppIcon
                icon={IconRefresh}
                size={14}
                className="animate-spin text-[var(--wz-color-status-running)] motion-reduce:animate-none"
                aria-hidden="true"
              />
            )}
            {completed
              ? locale === "en-US" ? "All 16 claims compared with the Project Knowledge Base" : "16 项主张已完成项目知识库比对"
              : stopped
                ? locale === "en-US" ? "Cross-validation stopped" : "交叉验证已停止"
                : locale === "en-US" ? "Investor AI is organizing claim-level results" : "投资官AI正在整理逐项比对结果"}
          </h3>
          <p className="mt-1 text-[length:var(--wz-font-size-caption)] text-[color:var(--wz-color-text-secondary)]">{locale === "en-US" ? "Every conclusion retains its source node, knowledge-base evidence, and comparison status." : "所有结论均保留原文节点、知识库材料与比对状态。"}</p>
        </div>

        {completed && (
          <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(locale === "en-US" ? [
              ["Consistent", "5"],
              ["Partially consistent", "6"],
              ["Insufficient evidence", "4"],
              ["Discrepancy found", "1"],
            ] : [
              ["一致", "5"],
              ["部分一致", "6"],
              ["证据不足", "4"],
              ["存在偏差", "1"],
            ]).map(([label, value]) => (
              <div key={label} className="border border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-subtle)] px-3 py-3 text-center">
                <p className="font-mono text-[length:var(--wz-font-size-section)] font-semibold text-[var(--wz-color-text-primary)]">{value}</p>
                <p className="mt-0.5 text-[length:var(--wz-font-size-caption)] text-[color:var(--wz-color-text-secondary)]">{label}</p>
              </div>
            ))}
          </div>
        )}

        <div className="mx-auto mt-7 max-w-lg border-2 border-[var(--wz-color-action-primary)] bg-[var(--wz-color-action-primary)] px-4 py-4 text-[var(--wz-color-text-inverse)] shadow-[var(--wz-shadow-lg)]">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--wz-color-bg-surface)] text-[var(--wz-color-action-primary)]">
              <AppIcon
                icon={completed ? IconCheckCircle : stopped ? IconStop : IconAuto}
                size={16}
              />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[length:var(--wz-font-size-body)] font-semibold">{locale === "en-US" ? "Investor AI · Cross-Validation Synthesis" : "投资官AI · 交叉验证汇总"}</p>
              <p className="mt-0.5 text-[length:var(--wz-font-size-caption)] text-[var(--wz-color-text-inverse)] opacity-70">
                {locale === "en-US"
                  ? completed
                    ? "Cross-validation report generated"
                    : stopped
                      ? "The task stopped before the report was generated"
                      : "Grading evidence strength and flagging material discrepancies"
                  : completed
                    ? "交叉验证报告已生成"
                    : stopped
                      ? "任务停止前未生成交叉验证报告"
                      : "正在归类证据强度并标记关键偏差"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ValidationWorkspaceDrawer({
  detail,
  progress,
  status,
  agentIds,
  mode = "investment-analysis",
  onClose,
  onChangeDetail,
  returnFocusTo,
}: ValidationWorkspaceDrawerProps) {
  const { locale } = useLocale();
  const open = detail !== null;
  const [lastDetail, setLastDetail] = useState<ValidationDemoDetail>({ view: "document" });
  const navRef = useRef<HTMLElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    if (detail) setLastDetail(detail);
  }, [detail]);

  const isCrossValidation = mode === "cross-validation";
  const pct = Math.min(100, Math.max(0, Math.round(progress)));
  // A task briefly remains in the live list at 100% before its result block is
  // injected. Treat that transition as complete, while keeping an explicit
  // cancelled status authoritative even if the last progress tick was 100.
  const workflowStatus: ValidationDemoStatus =
    status === "cancelled"
      ? "cancelled"
      : status === "completed" || pct >= 100
        ? "completed"
        : "running";
  const agents = localizeYaojuAgents(getYaojuDemoAgents(agentIds), locale);
  const requestedDetail = detail ?? lastDetail;
  // The unified workflow exposes Agent details as soon as the execution
  // stage starts, including while individual Agents are still running.
  const agentDetailsAvailable =
    !isCrossValidation &&
    pct >= YAOJU_DEMO_TIMELINE.strategyEnd;

  const isViewAvailable = (view: keyof typeof VIEW_META) => {
    if (workflowStatus === "completed" || pct >= 100) return true;
    if (view === "document") return true;
    if (view === "claim-map") return pct >= YAOJU_DEMO_TIMELINE.intentEnd;
    if (view === "agent") return agentDetailsAvailable;
    return pct >= (
      isCrossValidation
        ? YAOJU_CROSS_VALIDATION_TIMELINE.comparisonEnd
        : YAOJU_DEMO_TIMELINE.agentsEnd
    );
  };

  const fallbackView: ValidationDemoDetail = isViewAvailable("claim-map")
    ? { view: "claim-map" }
    : { view: "document" };
  const activeDetail = isViewAvailable(requestedDetail.view)
    ? requestedDetail
    : fallbackView;
  const meta = VIEW_META[activeDetail.view];
  const HeaderIcon = meta.icon;
  const selectedAgentId = agents.some((agent) => agent.id === activeDetail.agentId)
    ? activeDetail.agentId
    : agents[0].id;
  const localizedMeta = locale === "en-US"
    ? {
        document: { title: "Understand the Report and Analysis Objective" },
        "claim-map": { title: "Build Verifiable Claims from Source Passages" },
        agent: { title: "Specialist Agent Work Details" },
        aggregation: { title: "Evidence Synthesis and Conclusion Rewrite" },
      }[activeDetail.view]
    : meta;
  const progressLabel =
    locale === "en-US"
      ? workflowStatus === "completed"
        ? "Analysis complete"
        : workflowStatus === "cancelled"
          ? "Task stopped"
          : "Analysis in progress"
      : workflowStatus === "completed"
        ? "分析完成"
        : workflowStatus === "cancelled"
          ? "任务已停止"
          : "分析中";
  const showAgentDetailsTab = agentDetailsAvailable;

  const navItems = useMemo(() => {
    const items = isCrossValidation
      ? locale === "en-US"
        ? [
            { view: "document" as const, label: "Understand Report" },
            { view: "claim-map" as const, label: "Claim Map" },
            { view: "aggregation" as const, label: "Generate Report" },
          ]
        : [
            { view: "document" as const, label: "理解报告" },
            { view: "claim-map" as const, label: "主张地图" },
            { view: "aggregation" as const, label: "生成报告" },
          ]
      : locale === "en-US"
        ? [
            { view: "document" as const, label: "Understand Report" },
            { view: "claim-map" as const, label: "Claim Map" },
            { view: "agent" as const, label: "Agent Execution" },
            { view: "aggregation" as const, label: "Aggregate Report" },
          ]
        : [
            { view: "document" as const, label: "理解报告" },
            { view: "claim-map" as const, label: "主张地图" },
            { view: "agent" as const, label: "Agent 执行" },
            { view: "aggregation" as const, label: "聚合报告" },
          ];
    // Do not advertise work that has not entered the workflow yet. The
    // conversation card follows the same rule, so the drawer should not show
    // a disabled future tab that can never contain useful detail at this point.
    const visibleItems = isCrossValidation || !showAgentDetailsTab
      ? items.filter((item) => item.view !== "agent")
      : items;
    return visibleItems.filter((item) => isViewAvailable(item.view));
  }, [
    isCrossValidation,
    locale,
    showAgentDetailsTab,
    workflowStatus,
    pct,
  ]);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const updateScrollAffordance = () => {
      const maxScroll = Math.max(0, nav.scrollWidth - nav.clientWidth);
      setCanScrollLeft(nav.scrollLeft > 2);
      setCanScrollRight(maxScroll - nav.scrollLeft > 2);
    };

    updateScrollAffordance();
    nav.addEventListener("scroll", updateScrollAffordance, { passive: true });
    const observer = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(updateScrollAffordance)
      : null;
    observer?.observe(nav);

    return () => {
      nav.removeEventListener("scroll", updateScrollAffordance);
      observer?.disconnect();
    };
  }, [navItems.length, open]);

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
        className="!w-[min(900px,calc(100vw-24px))] max-w-none bg-[var(--wz-color-bg-surface)] p-0"
      >
        <SheetTitle className="sr-only">
          {locale === "en-US"
            ? isCrossValidation
              ? "Yaoju Manufacturing Cross-Validation Evidence Workspace"
              : "Yaoju Manufacturing Investment Analysis Evidence Workspace"
            : isCrossValidation
              ? "曜矩智造交叉验证证据工作台"
              : "曜矩智造投资分析证据工作台"}
        </SheetTitle>
        <SheetDescription className="sr-only">
          {locale === "en-US"
            ? isCrossValidation
              ? "Review the Understand Report, Claim Map, and Generate Report stages"
              : "Review the Understand Report, Claim Map, Agent Execution, and Aggregate Report stages"
            : isCrossValidation
              ? "查看理解报告、主张地图和生成报告过程"
              : "查看理解报告、主张地图、Agent 执行和聚合报告过程"}
        </SheetDescription>
        <header className="border-b border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-surface)] px-4 py-3 sm:px-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--wz-radius-md)] bg-[var(--wz-color-action-primary)] text-[var(--wz-color-text-inverse)]">
                <AppIcon icon={HeaderIcon} size={15} />
              </span>
              <div className="min-w-0">
                <div className="inline-flex items-center gap-1.5 text-[length:var(--wz-font-size-caption)] font-semibold text-[color:var(--wz-color-text-tertiary)]">
                  {workflowStatus === "running" && (
                    <AppIcon
                      icon={IconRefresh}
                      size={10}
                      className="animate-spin text-[var(--wz-color-status-running)] motion-reduce:animate-none"
                      aria-hidden="true"
                    />
                  )}
                  {progressLabel}
                </div>
                <h2 className="mt-0.5 truncate text-[length:var(--wz-font-size-subtitle)] font-semibold text-[var(--wz-color-text-primary)] sm:text-[length:var(--wz-font-size-section)]">{localizedMeta.title}</h2>
              </div>
            </div>
            <button type="button" onClick={onClose} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--wz-radius-md)] border border-[var(--wz-color-border-default)] text-[color:var(--wz-color-text-secondary)] outline-none transition-[background-color,color,box-shadow] [transition-duration:var(--wz-duration-fast)] [transition-timing-function:var(--wz-ease-standard)] hover:bg-[var(--wz-color-bg-subtle)] hover:text-[var(--wz-color-text-primary)] focus-visible:shadow-[0_0_0_3px_var(--wz-color-focus-ring)]" aria-label={locale === "en-US" ? "Close" : "关闭"} title={locale === "en-US" ? "Close (Esc)" : "关闭 (Esc)"}>
              <AppIcon icon={IconClose} size={13} />
            </button>
          </div>

          <div className="relative mt-3 min-w-0">
            <nav
              ref={navRef}
              className="thin-scroll flex min-w-0 gap-1 overflow-x-auto overscroll-x-contain pr-2"
              aria-label={locale === "en-US" ? "Evidence workspace views" : "证据工作台视图"}
            >
              {navItems.map((item) => {
                const active = activeDetail.view === item.view;
                const locked = !isViewAvailable(item.view);
                return (
                  <button
                    key={item.view}
                    type="button"
                    disabled={locked}
                    aria-current={active ? "page" : undefined}
                    title={locked ? (locale === "en-US" ? "This view has not started yet" : "该视图尚未开始") : undefined}
                    onClick={() => {
                      if (locked) return;
                      onChangeDetail(item.view === "agent" ? { view: "agent", agentId: selectedAgentId } : { view: item.view });
                    }}
                    className={cn(
                      "inline-flex h-11 min-h-11 shrink-0 items-center border-b-2 px-2.5 text-[length:var(--wz-font-size-caption)] font-medium outline-none transition-[border-color,color,box-shadow] [transition-duration:var(--wz-duration-fast)] [transition-timing-function:var(--wz-ease-standard)] focus-visible:shadow-[0_0_0_3px_var(--wz-color-focus-ring)] sm:h-8 sm:min-h-8",
                      active && "border-[var(--wz-color-status-info)] text-[var(--wz-color-status-info)]",
                      !active && !locked && "border-transparent text-[color:var(--wz-color-text-secondary)] hover:text-[var(--wz-color-text-primary)]",
                      locked && "cursor-not-allowed border-transparent text-[var(--wz-color-text-disabled)]"
                    )}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>
            {canScrollLeft && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 left-0 z-10 flex w-6 items-center justify-start bg-gradient-to-r from-[var(--wz-color-bg-surface)] via-[var(--wz-color-bg-surface)]/90 to-transparent sm:hidden"
              >
                <AppIcon icon={IconChevronLeft} size={11} className="text-[color:var(--wz-color-text-tertiary)]" />
              </span>
            )}
            {canScrollRight && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 right-0 z-10 flex w-7 items-center justify-end bg-gradient-to-l from-[var(--wz-color-bg-surface)] via-[var(--wz-color-bg-surface)]/90 to-transparent sm:hidden"
              >
                <AppIcon icon={IconChevronRight} size={11} className="text-[color:var(--wz-color-text-tertiary)]" />
              </span>
            )}
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-hidden bg-[var(--wz-color-bg-surface)]">
          {activeDetail.view === "document" && (
            <DocumentView progress={pct} mode={mode} status={workflowStatus} />
          )}
          {activeDetail.view === "claim-map" && (
            <ClaimMapView progress={pct} status={workflowStatus} />
          )}
          {!isCrossValidation && activeDetail.view === "agent" && (
            <AgentView
              progress={pct}
              status={workflowStatus}
              agents={agents}
              selectedAgentId={selectedAgentId}
              onSelect={(agentId) => onChangeDetail({ view: "agent", agentId })}
            />
          )}
          {activeDetail.view === "aggregation" &&
            (isCrossValidation ? (
              <ValidationAggregationView progress={pct} status={workflowStatus} />
            ) : (
              <AggregationView progress={pct} status={workflowStatus} />
            ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
