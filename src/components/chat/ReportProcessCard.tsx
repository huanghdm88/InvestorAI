import { useEffect, useId, useRef, useState } from "react";

import { AppIcon } from "@/src/components/ui/app-icon";
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
  IconCalculator,
  IconCheckCircle,
  IconChallenge,
  IconChevronDown,
  IconFactCheck,
  IconFileCheck,
  IconRefresh,
  IconShieldAlert,
} from "@/src/lib/icons";
import { getReportProcessPhaseIndex } from "@/src/lib/report-process";
import { cn } from "@/src/lib/utils";
import { useLocale } from "@/src/lib/i18n";
import type {
  AssistantBlock,
  ReportProcessMetric,
  ReportProcessPhase,
  ReportProcessWorkstream,
  ReportProcessKind,
} from "@/src/types";

type ReportProcessBlock = Extract<AssistantBlock, { kind: "report-process" }>;

interface ReportProcessCardProps {
  block: ReportProcessBlock;
  className?: string;
}

type PhaseState = "complete" | "running" | "queued" | "cancelled";

const METRIC_TONE: Record<NonNullable<ReportProcessMetric["tone"]>, string> = {
  positive: "text-[var(--wz-color-text-primary)]",
  warning: "text-[var(--wz-color-status-warning)]",
  danger: "text-[var(--wz-color-status-danger)]",
  neutral: "text-[color:var(--wz-color-text-secondary)]",
};

const WORKSTREAM_META: Record<
  ReportProcessWorkstream["status"],
  { className: string }
> = {
  complete: { className: "text-[var(--wz-color-text-primary)]" },
  running: { className: "text-[var(--wz-color-status-running)]" },
  queued: { className: "text-[color:var(--wz-color-text-tertiary)]" },
  attention: { className: "text-[var(--wz-color-status-danger)]" },
};

const PROCESS_KIND_META: Record<
  ReportProcessKind,
  {
    icon: typeof IconFileCheck;
    zhLabel: string;
    enLabel: string;
    zhCompleted: string;
    enCompleted: string;
    zhStopped: string;
    enStopped: string;
    zhRunning: string;
    enRunning: string;
  }
> = {
  "cross-validation": {
    icon: IconFactCheck,
    zhLabel: "交叉验证报告",
    enLabel: "Cross-Validation Report",
    zhCompleted: "报告已生成",
    enCompleted: "Report ready",
    zhStopped: "生成已停止",
    enStopped: "Generation stopped",
    zhRunning: "生成中",
    enRunning: "Generating",
  },
  "investment-report": {
    icon: IconFileCheck,
    zhLabel: "投资分析报告",
    enLabel: "Investment Analysis Report",
    zhCompleted: "报告已生成",
    enCompleted: "Report ready",
    zhStopped: "生成已停止",
    enStopped: "Generation stopped",
    zhRunning: "生成中",
    enRunning: "Generating",
  },
  challenge: {
    icon: IconChallenge,
    zhLabel: "挑战质询",
    enLabel: "Challenge Review",
    zhCompleted: "质询清单已生成",
    enCompleted: "Challenge list ready",
    zhStopped: "质询已停止",
    enStopped: "Challenge stopped",
    zhRunning: "质询中",
    enRunning: "Reviewing",
  },
  valuation: {
    icon: IconCalculator,
    zhLabel: "估值平行测算",
    enLabel: "Parallel Valuation",
    zhCompleted: "估值区间已生成",
    enCompleted: "Valuation range ready",
    zhStopped: "测算已停止",
    enStopped: "Valuation stopped",
    zhRunning: "测算中",
    enRunning: "Calculating",
  },
};

function getPhaseState(
  index: number,
  activeIndex: number,
  status: ReportProcessBlock["status"],
): PhaseState {
  if (status === "completed") return "complete";
  if (index < activeIndex) return "complete";
  if (index > activeIndex) return "queued";
  return status === "cancelled" ? "cancelled" : "running";
}

function toStageState(state: PhaseState): ProcessStageState {
  return state === "complete"
    ? "completed"
    : state === "cancelled"
      ? "stopped"
      : "active";
}

function phaseSummary(
  phase: ReportProcessPhase,
  state: PhaseState,
  stoppedSummary: string,
) {
  if (state === "complete") return phase.completedText;
  if (state === "cancelled") return stoppedSummary;
  if (state === "running") return phase.activeText;
  return phase.description;
}

export function ReportProcessCard({
  block,
  className,
}: ReportProcessCardProps) {
  const { t, locale } = useLocale();
  const { process } = block;
  const processId = useId().replace(/:/g, "");
  const contentId = `${processId}-content`;
  const pct = Math.min(100, Math.max(0, Math.round(block.progress)));
  const activeIndex = getReportProcessPhaseIndex(pct, process.phases.length);
  const processMeta = PROCESS_KIND_META[process.kind];
  const headerLabel = locale === "en-US" ? processMeta.enLabel : processMeta.zhLabel;
  const statusLabel =
    block.status === "completed"
      ? locale === "en-US"
        ? processMeta.enCompleted
        : processMeta.zhCompleted
      : block.status === "cancelled"
        ? locale === "en-US"
          ? processMeta.enStopped
          : processMeta.zhStopped
        : locale === "en-US"
          ? processMeta.enRunning
          : processMeta.zhRunning;
  const collapseStorageKey = `invest-wise:collapse-report-process:${process.kind}`;
  const stageStorageKey = `invest-wise:open-stages:${process.kind}`;
  const [collapsed, setCollapsed] = useState(() => {
    if (block.status !== "completed" || typeof window === "undefined") {
      return false;
    }
    try {
      return window.localStorage.getItem(collapseStorageKey) === "true";
    } catch {
      return false;
    }
  });
  const [selectedStageIndex, setSelectedStageIndex] = useState(activeIndex);
  const [openStageIds, setOpenStageIds] = useState<Set<number>>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = window.localStorage.getItem(stageStorageKey);
        if (stored) {
          const parsed = JSON.parse(stored) as unknown;
          if (Array.isArray(parsed)) {
            return new Set(
              parsed.filter(
                (value): value is number =>
                  typeof value === "number" &&
                  Number.isInteger(value) &&
                  value >= 0 &&
                  value < process.phases.length,
              ),
            );
          }
        }
      } catch {
        // Persistence is best effort in private browsing and embedded previews.
      }
    }
    return new Set(
      Array.from({ length: activeIndex + 1 }, (_, index) => index),
    );
  });
  const [scrollRequest, setScrollRequest] = useState<{
    index: number;
    afterExpand: boolean;
  } | null>(null);
  const stageSectionRefs = useRef<Array<HTMLElement | null>>([]);
  const previousStageIndexRef = useRef(activeIndex);
  const previousBlockStatusRef = useRef(block.status);

  const stages = process.phases.map((phase) => ({
    id: phase.id,
    title: phase.title,
  }));
  const visiblePhases = process.phases.slice(
    0,
    block.status === "completed" ? process.phases.length : activeIndex + 1,
  );

  useEffect(() => {
    try {
      window.localStorage.setItem(collapseStorageKey, String(collapsed));
    } catch {
      // Persistence is best effort in private browsing and embedded previews.
    }
  }, [collapsed, collapseStorageKey]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        stageStorageKey,
        JSON.stringify(Array.from(openStageIds)),
      );
    } catch {
      // Persistence is best effort in private browsing and embedded previews.
    }
  }, [openStageIds, stageStorageKey]);

  useEffect(() => {
    if (block.status === "running") {
      setOpenStageIds((previous) => {
        if (previous.has(activeIndex)) return previous;
        const next = new Set(previous);
        next.add(activeIndex);
        return next;
      });
    }
    if (activeIndex <= previousStageIndexRef.current) return;
    previousStageIndexRef.current = activeIndex;
    setOpenStageIds((previous) => {
      const next = new Set(previous);
      next.add(activeIndex);
      return next;
    });
  }, [activeIndex, block.status]);

  useEffect(() => {
    if (block.status !== "running") return;
    setSelectedStageIndex(activeIndex);
    setScrollRequest({ index: activeIndex, afterExpand: false });
  }, [activeIndex, block.status]);

  useEffect(() => {
    const previousStatus = previousBlockStatusRef.current;
    previousBlockStatusRef.current = block.status;
    if (previousStatus === "completed" || block.status !== "completed") return;

    // Reveal the final result once when a live process finishes. A process
    // mounted already complete still respects the persisted collapse choice.
    setSelectedStageIndex(process.phases.length - 1);
    setOpenStageIds((previous) => {
      const next = new Set(previous);
      next.add(process.phases.length - 1);
      return next;
    });
    setCollapsed(false);
  }, [block.status, process.phases.length]);

  useEffect(() => {
    if (!scrollRequest || collapsed) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
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

  const getStageState = (index: number): ProcessStageState =>
    toStageState(getPhaseState(index, activeIndex, block.status));

  const handleSelectStage = (index: number) => {
    // ProcessStageTracker only emits available stages, but retain this guard
    // for keyboard/programmatic callers and future changes to the primitive.
    if (index > activeIndex && block.status !== "completed") return;
    setSelectedStageIndex(index);
    setOpenStageIds((previous) => {
      if (previous.has(index)) return previous;
      const next = new Set(previous);
      next.add(index);
      return next;
    });
    const afterExpand = collapsed;
    if (afterExpand) setCollapsed(false);
    setScrollRequest({ index, afterExpand });
  };

  const handleToggleStage = (index: number) => {
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

  const phaseStateLabel = (state: PhaseState) =>
    state === "complete"
      ? t("process.complete")
      : state === "running"
        ? t("process.running")
        : state === "cancelled"
          ? t("process.stopped")
          : t("process.queued");
  const workstreamStatusLabel = (status: ReportProcessWorkstream["status"]) =>
    status === "complete"
      ? t("process.complete")
      : status === "running"
        ? t("process.processing")
        : status === "attention"
          ? t("process.attention")
          : t("process.queued");

  return (
    <section
      className={cn("report-process-shell", PROCESS_SHELL_CLASS, className)}
      aria-label={t("process.generationProcessLabel", { name: headerLabel })}
    >
      <header
        className={cn(
          PROCESS_HEADER_CLASS,
          "border-b transition-[border-color] [transition-duration:var(--wz-duration-normal)] [transition-timing-function:var(--wz-ease-standard)] motion-reduce:transition-none",
          collapsed
            ? "border-transparent"
            : "border-[var(--wz-color-border-default)]",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2.5">
            <div className={PROCESS_HEADER_ICON_CLASS} aria-hidden="true">
              <AppIcon icon={processMeta.icon} size={15} />
            </div>
            <div className="min-w-0">
              <div className={PROCESS_KICKER_CLASS}>
                {t("process.generationProcess", { name: headerLabel })}
              </div>
              <h3 className="mt-1 text-[length:var(--wz-font-size-section)] font-semibold leading-6 text-[var(--wz-color-text-primary)]">
                {process.title}
              </h3>
              <span
                role="status"
                aria-live="polite"
                aria-atomic="true"
                className="sr-only"
              >
                {`${statusLabel} · ${process.phases[activeIndex]?.title ?? ""} · ${phaseStateLabel(
                  getPhaseState(activeIndex, activeIndex, block.status),
                )}`}
              </span>
            </div>
          </div>
          {block.status === "completed" && (
            <button
              type="button"
              onClick={handleToggleCollapsed}
              aria-expanded={!collapsed}
              aria-controls={contentId}
              aria-label={
                collapsed ? t("process.expand") : t("process.collapse")
              }
              title={collapsed ? t("process.expand") : t("process.collapse")}
              className={PROCESS_COLLAPSE_BUTTON_CLASS}
            >
              <AppIcon
                icon={IconChevronDown}
                size={11}
                className={cn(
                  "transition-transform [transition-duration:var(--wz-duration-normal)] [transition-timing-function:var(--wz-ease-standard)]",
                  !collapsed && "rotate-180",
                )}
              />
            </button>
          )}
        </div>

        {!collapsed && (
          <p className="mt-2 text-[length:var(--wz-font-size-body)] leading-relaxed text-[color:var(--wz-color-text-secondary)]">
            {process.objective}
          </p>
        )}

        {block.status !== "completed" && (
          <div className="mt-3 flex items-center gap-2">
            <div
              role="progressbar"
              aria-label={t("process.progress", { name: headerLabel })}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={pct}
              className={PROCESS_PROGRESS_TRACK_CLASS}
            >
              <div
                aria-hidden="true"
                className={cn(
                  PROCESS_PROGRESS_FILL_CLASS,
                  block.status === "cancelled"
                    ? "bg-[var(--wz-color-status-danger)]"
                    : "bg-[var(--invest-progress-report)]",
                  block.status === "running" && "demo-progress-flow",
                )}
                style={{ transform: `scaleX(${pct / 100})` }}
              />
            </div>
            <span className="w-8 text-right font-mono text-[length:var(--wz-font-size-caption)] text-[color:var(--wz-color-text-secondary)]">
              {pct}%
            </span>
          </div>
        )}
      </header>

      <ProcessStageTracker
        activeIndex={activeIndex}
        selectedIndex={collapsed ? null : selectedStageIndex}
        stages={stages}
        completed={block.status === "completed"}
        stopped={block.status === "cancelled"}
        sectionIdPrefix={processId}
        onSelect={handleSelectStage}
      />

      <div
        id={contentId}
        aria-hidden={collapsed}
        inert={collapsed ? true : undefined}
        className={cn(
          "grid transition-[grid-template-rows,opacity] [transition-duration:var(--wz-duration-normal)] [transition-timing-function:var(--wz-ease-standard)] motion-reduce:transition-none",
          collapsed
            ? "pointer-events-none grid-rows-[0fr] opacity-0"
            : "grid-rows-[1fr] opacity-100",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="demo-stage-content relative pb-1">
            <div className="relative space-y-[var(--wz-space-module)]">
              {visiblePhases.map((phase, index) => {
                const phaseState = getPhaseState(
                  index,
                  activeIndex,
                  block.status,
                );
                const state = getStageState(index);
                const stageOpen = openStageIds.has(index);
                const detailId = `${processId}-stage-${index}-detail`;
                const titleId = `${processId}-stage-${index}-title`;
                const summary = phaseSummary(
                  phase,
                  phaseState,
                  t("process.stoppedSummary"),
                );
                const visibleWorkstreams = phase.workstreams?.filter(
                  (workstream) =>
                    block.status === "completed" ||
                    workstream.status !== "queued",
                );

                return (
                  <section
                    key={phase.id}
                    id={`${processId}-stage-${index}`}
                    ref={(node) => {
                      stageSectionRefs.current[index] = node;
                    }}
                    aria-labelledby={titleId}
                    className="relative"
                  >
                    {index < visiblePhases.length - 1 && (
                      <span
                        aria-hidden="true"
                        className="absolute bottom-[-24px] left-[13.5px] top-7 z-[1] w-px bg-[var(--wz-color-border-default)]"
                      />
                    )}
                    <div className="relative z-[2] mb-3 flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => handleToggleStage(index)}
                        aria-expanded={stageOpen}
                        aria-controls={detailId}
                        aria-label={
                          locale === "en-US"
                            ? stageOpen
                              ? `Collapse ${phase.title}`
                              : `Expand ${phase.title}`
                            : stageOpen
                              ? `收起${phase.title}`
                              : `展开${phase.title}`
                        }
                        title={
                          locale === "en-US"
                            ? stageOpen
                              ? "Collapse step"
                              : "Expand step"
                            : stageOpen
                              ? "收起步骤"
                              : "展开步骤"
                        }
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-surface)] text-[color:var(--wz-color-text-tertiary)] outline-none transition-[background-color,border-color,color,box-shadow] duration-200 hover:border-[var(--wz-color-border-strong)] hover:bg-[var(--wz-color-bg-subtle)] hover:text-[var(--wz-color-text-primary)] focus-visible:shadow-[0_0_0_3px_var(--wz-color-focus-ring)]"
                      >
                        <AppIcon
                          icon={IconChevronDown}
                          size={11}
                          className={cn(
                            "transition-transform duration-200",
                            stageOpen && "rotate-180",
                          )}
                        />
                      </button>
                      <h4
                        id={titleId}
                        className="line-clamp-2 min-w-0 text-[length:var(--wz-font-size-section)] font-semibold leading-6 text-[var(--wz-color-text-primary)]"
                      >
                        {phase.title}
                      </h4>
                    </div>

                    <div
                      id={detailId}
                      aria-hidden={!stageOpen}
                      inert={!stageOpen ? true : undefined}
                      className={cn(
                        "demo-stage-detail relative z-[2] pl-7 sm:pl-[38px]",
                        !stageOpen && "demo-stage-detail--collapsed",
                      )}
                    >
                      <div className={FRAMEWORK_SUBTASK_CARD_CLASS}>
                        <div className="min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p
                              className={cn(
                                "min-w-0",
                                FRAMEWORK_SUBTASK_TITLE_CLASS,
                              )}
                            >
                              <span className="min-w-0 truncate">
                                {locale === "en-US"
                                  ? `Investor AI · ${phase.title}`
                                  : `投资官AI · ${phase.title}`}
                              </span>
                            </p>
                            <ProcessStageStatusBadge state={state} />
                          </div>
                          <p className={FRAMEWORK_SUBTASK_DESCRIPTION_CLASS}>
                            {summary}
                          </p>

                          {stageOpen &&
                            phase.metrics &&
                            phase.metrics.length > 0 && (
                              <div
                                className={cn(
                                  FRAMEWORK_SUBTASK_INNER_CARD_CLASS,
                                  "report-process-metrics mt-2.5 grid !rounded-[var(--wz-radius-lg)] !p-2.5",
                                )}
                              >
                                {phase.metrics.map((metric) => (
                                  <div
                                    key={metric.label}
                                    className="min-w-0 border-l border-[var(--wz-color-border-default)] px-2 first:border-l-0 first:pl-0"
                                  >
                                    <div className="text-[length:var(--wz-font-size-tag)] leading-[var(--wz-line-height-tag)] text-[color:var(--wz-color-text-tertiary)]">
                                      {metric.label}
                                    </div>
                                    <div
                                      className={cn(
                                        "mt-0.5 truncate text-[length:var(--wz-font-size-body)] font-semibold tabular-nums text-[var(--wz-color-text-primary)]",
                                        metric.tone && METRIC_TONE[metric.tone],
                                      )}
                                      title={metric.value}
                                    >
                                      {metric.value}
                                    </div>
                                    {metric.note && (
                                      <div className="mt-0.5 text-[length:var(--wz-font-size-caption)] leading-4 text-[color:var(--wz-color-text-tertiary)]">
                                        {metric.note}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                          {stageOpen &&
                            visibleWorkstreams &&
                            visibleWorkstreams.length > 0 && (
                              <div
                                className={cn(
                                  FRAMEWORK_SUBTASK_INNER_CARD_CLASS,
                                  "mt-2.5 divide-y divide-[var(--wz-color-border-default)] !rounded-[var(--wz-radius-lg)] !px-2.5 !py-0",
                                )}
                              >
                                {visibleWorkstreams.map((workstream) => {
                                  const meta =
                                    WORKSTREAM_META[workstream.status];
                                  const displayClass =
                                    block.status === "completed" &&
                                    workstream.status !== "attention"
                                      ? "text-[color:var(--wz-color-text-secondary)]"
                                      : meta.className;
                                  const displayStatus =
                                    block.status === "completed"
                                      ? workstream.result
                                      : (workstream.result ??
                                        workstreamStatusLabel(
                                          workstream.status,
                                        ));
                                  return (
                                    <div
                                      key={workstream.label}
                                      className="report-process-workstream flex justify-between py-2 text-[length:var(--wz-font-size-tag)] leading-[var(--wz-line-height-tag)]"
                                    >
                                      <div className="flex min-w-0 items-start gap-1.5 text-[color:var(--wz-color-text-secondary)]">
                                        {block.status !== "completed" && (
                                          <AppIcon
                                            icon={
                                              workstream.status === "attention"
                                                ? IconShieldAlert
                                                : workstream.status ===
                                                    "complete"
                                                  ? IconCheckCircle
                                                  : IconRefresh
                                            }
                                            size={10}
                                            className={cn(
                                              "mt-0.5 shrink-0",
                                              displayClass,
                                              workstream.status === "running" &&
                                                "animate-spin motion-reduce:animate-none",
                                            )}
                                          />
                                        )}
                                        <span className="leading-snug">
                                          {workstream.label}
                                        </span>
                                      </div>
                                      {displayStatus && (
                                        <span
                                          className={cn(
                                            "inline-flex shrink-0 items-center text-[length:var(--wz-font-size-tag)] leading-[var(--wz-line-height-tag)]",
                                            displayClass,
                                          )}
                                        >
                                          {displayStatus}
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                          {!stageOpen && (
                            <span className="sr-only">
                              {phaseStateLabel(phaseState)}
                            </span>
                          )}
                        </div>
                      </div>
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
