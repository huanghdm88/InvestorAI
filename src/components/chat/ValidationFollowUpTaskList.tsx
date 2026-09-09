import { useMemo } from "react";

import { AppIcon } from "@/src/components/ui/app-icon";
import { Button } from "@/src/components/ui/button";
import {
  IconArrowRight,
  IconCheckCircle,
  IconPlus,
} from "@/src/lib/icons";
import { cn } from "@/src/lib/utils";
import { useLocale } from "@/src/lib/i18n";
import type {
  FactCompare,
  ValidationFollowUpTaskInput,
} from "@/src/types";

interface ValidationFollowUpTaskListProps {
  compares: FactCompare[];
  sourceMessageId: string;
  sourceBlockIndex: number;
  claimedTaskIdsBySourceKey: ReadonlyMap<string, string>;
  onAddTask: (task: ValidationFollowUpTaskInput) => void;
  onRemoveTask: (taskId: string) => void;
}

function isDifference(compare: FactCompare) {
  const delta = compare.delta?.trim();
  if (!delta || delta === "一致" || delta === "Consistent") return false;
  return !/^0(?:\.0+)?%$/.test(delta);
}

export function hasValidationFollowUpTasks(compares: FactCompare[]) {
  return compares.some(isDifference);
}

export function getValidationFollowUpSourceKey(
  sourceMessageId: string,
  sourceBlockIndex: number,
  sourceCompareIndex: number
) {
  return `validation-follow-up:${sourceMessageId}:${sourceBlockIndex}:${sourceCompareIndex}`;
}

function verdictTone(delta?: string) {
  if (delta === "存在偏差" || delta === "不一致" || delta === "Discrepancy found" || delta === "Inconsistent") {
    return "border-[var(--wz-color-status-danger)] bg-[var(--wz-color-status-danger-subtle)] text-[var(--wz-color-status-danger)]";
  }
  if (delta === "证据不足" || delta === "Insufficient evidence") {
    return "border-[var(--wz-color-status-warning)] bg-[var(--wz-color-status-warning-subtle)] text-[var(--wz-color-status-warning)]";
  }
  return "border-[var(--wz-color-status-info)] bg-[var(--wz-color-status-info-subtle)] text-[var(--wz-color-status-info)]";
}

export function ValidationFollowUpTaskList({
  compares,
  sourceMessageId,
  sourceBlockIndex,
  claimedTaskIdsBySourceKey,
  onAddTask,
  onRemoveTask,
}: ValidationFollowUpTaskListProps) {
  const { locale } = useLocale();
  const tasks = useMemo(
    () =>
      compares
        .map((compare, sourceCompareIndex) => ({
          compare,
          sourceCompareIndex,
          sourceKey: getValidationFollowUpSourceKey(
            sourceMessageId,
            sourceBlockIndex,
            sourceCompareIndex
          ),
        }))
        .filter(({ compare }) => isDifference(compare)),
    [compares, sourceBlockIndex, sourceMessageId]
  );

  if (tasks.length === 0) return null;

  return (
    <div
      className="grid gap-[var(--wz-space-3)] bg-[var(--wz-color-bg-subtle)] p-[var(--wz-space-3)] sm:p-[var(--wz-space-4)]"
      role="list"
      aria-label={locale === "en-US" ? "Cross-validation follow-up tasks" : "交叉验证差异跟进任务"}
    >
      {tasks.map(({ compare: task, sourceCompareIndex, sourceKey }) => {
        const claimedTaskId = claimedTaskIdsBySourceKey.get(sourceKey);
        const claimed = Boolean(claimedTaskId);
        const recommendation =
          task.deviationDetail?.recommendation ??
          (locale === "en-US"
            ? `Add evidence from ${task.reality.source}, re-verify “${task.label}”, and update the report.`
            : `补充${task.reality.source}，重新核验“${task.label}”并更新报告口径。`);

        return (
          <article
            key={sourceKey}
            role="listitem"
            className="group min-w-0 rounded-[var(--wz-radius-lg)] border border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-surface)] px-4 py-3 transition-[border-color,box-shadow] [transition-duration:var(--wz-duration-normal)] [transition-timing-function:var(--wz-ease-standard)] hover:border-[var(--wz-color-border-strong)] hover:shadow-[var(--wz-shadow-sm)]"
          >
            <div className="flex min-w-0 items-center gap-3">
              <h4 className="min-w-0 flex-1 truncate text-[length:var(--wz-font-size-body)] font-semibold leading-5 text-[var(--wz-color-text-primary)]">
                {locale === "en-US" ? `${task.label} follow-up` : `${task.label}核验跟进`}
              </h4>
              <span
                className={cn(
                  "inline-flex h-8 shrink-0 items-center rounded-md border px-2 text-[length:var(--wz-font-size-tag)] leading-[var(--wz-line-height-tag)] font-semibold",
                  verdictTone(task.delta)
                )}
                title={locale === "en-US" ? `${task.level} risk · ${task.delta}` : `${task.level} 风险 · ${task.delta}`}
              >
                {task.level} · {task.delta}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  if (claimedTaskId) {
                    onRemoveTask(claimedTaskId);
                    return;
                  }
                  onAddTask({
                    sourceKey,
                    sourceMessageId,
                    sourceBlockIndex,
                    sourceCompareIndex,
                    title: locale === "en-US" ? `${task.label} follow-up` : `${task.label}核验跟进`,
                    compare: task,
                    recommendation,
                  });
                }}
                className={cn(
                  "ml-auto h-8 w-[88px] shrink-0 justify-center gap-1.5 px-2 text-[length:var(--wz-font-size-caption)]",
                  claimed &&
                    "border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-subtle)] text-[color:var(--wz-color-text-secondary)]"
                )}
                aria-label={
                  claimed
                    ? locale === "en-US" ? `Remove ${task.label} from this topic` : `从当前话题任务中移除${task.label}`
                    : locale === "en-US" ? `Add ${task.label} to tasks` : `将${task.label}添加到任务`
                }
                aria-pressed={claimed}
              >
                <AppIcon icon={claimed ? IconCheckCircle : IconPlus} size={10} />
                <span>{claimed ? (locale === "en-US" ? "Added" : "已添加") : (locale === "en-US" ? "Add to tasks" : "添加到任务")}</span>
              </Button>
            </div>

            <div className="mt-3 flex min-w-0 items-center gap-3 text-[length:var(--wz-font-size-body)] leading-5">
              <span className="min-w-0 flex-1 truncate text-[color:var(--wz-color-text-secondary)]">
                <span className="mr-1 text-[color:var(--wz-color-text-tertiary)]">{locale === "en-US" ? "Report" : "报告"}</span>
                <span className="font-medium text-[color:var(--wz-color-text-secondary)]">{task.claim.value}</span>
              </span>
              <AppIcon icon={IconArrowRight} size={10} className="shrink-0 text-[color:var(--wz-color-text-tertiary)]" />
              <span className="min-w-0 flex-1 truncate text-[color:var(--wz-color-text-secondary)]">
                <span className="mr-1 text-[color:var(--wz-color-text-tertiary)]">{locale === "en-US" ? "Verified" : "核验"}</span>
                <span className="font-medium text-[color:var(--wz-color-text-secondary)]">{task.reality.value}</span>
              </span>
            </div>

            <p className="mt-2 truncate text-[length:var(--wz-font-size-body)] leading-5 text-[color:var(--wz-color-text-secondary)]" title={recommendation}>
              <span className="mr-1 text-[color:var(--wz-color-text-tertiary)]">{locale === "en-US" ? "Action" : "处置"}</span>
              {recommendation}
            </p>
          </article>
        );
      })}
    </div>
  );
}
