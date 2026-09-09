import { useId, useState } from "react";

import { AppIcon } from "@/src/components/ui/app-icon";
import {
  IconArrowRight,
  IconChecklist,
  IconChevronDown,
  IconChevronUp,
  IconClose,
} from "@/src/lib/icons";
import { cn } from "@/src/lib/utils";
import { useLocale } from "@/src/lib/i18n";
import type { ValidationFollowUpTask } from "@/src/types";

interface ValidationFollowUpTaskCardProps {
  task: ValidationFollowUpTask;
  onClose: (taskId: string) => void;
}

function verdictTone(verdict?: string) {
  if (verdict === "存在偏差" || verdict === "不一致" || verdict === "Discrepancy found" || verdict === "Inconsistent") {
    return "bg-[var(--wz-color-status-danger-subtle)] text-[var(--wz-color-status-danger)]";
  }
  if (verdict === "证据不足" || verdict === "Insufficient evidence") {
    return "bg-[var(--wz-color-status-warning-subtle)] text-[var(--wz-color-status-warning)]";
  }
  return "bg-[var(--wz-color-status-info-subtle)] text-[var(--wz-color-status-info)]";
}

export function ValidationFollowUpTaskCard({
  task,
  onClose,
}: ValidationFollowUpTaskCardProps) {
  const { locale } = useLocale();
  const [expanded, setExpanded] = useState(true);
  const detailId = useId();

  return (
    <article className="group relative overflow-hidden rounded-[var(--wz-radius-lg)] border border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-surface)] shadow-[var(--wz-shadow-sm)] transition-[border-color,box-shadow] [transition-duration:var(--wz-duration-normal)] [transition-timing-function:var(--wz-ease-standard)] hover:border-[var(--wz-color-border-strong)] hover:shadow-[var(--wz-shadow-md)]">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        aria-controls={detailId}
        aria-label={locale === "en-US" ? `${expanded ? "Collapse" : "View"} task details: ${task.title}` : `${expanded ? "收起" : "查看"}任务详情：${task.title}`}
        className="block w-full px-3 py-2.5 pr-9 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--wz-color-focus-ring)]"
      >
        <span className="flex min-w-0 items-start gap-2.5">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-[var(--wz-radius-md)] bg-[var(--wz-color-bg-subtle)] text-[color:var(--wz-color-text-secondary)]">
            <AppIcon icon={IconChecklist} size={11} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[length:var(--wz-font-size-body)] font-semibold leading-5 text-[var(--wz-color-text-primary)]">
              {task.title}
            </span>
            <span className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5">
              <span
                className={cn(
                  "rounded-[var(--wz-radius-sm)] px-1.5 py-0.5 text-[length:var(--wz-font-size-tag)] leading-[var(--wz-line-height-tag)] font-semibold",
                  verdictTone(task.compare.delta)
                )}
                title={locale === "en-US" ? `${task.compare.level} risk · ${task.compare.delta}` : `${task.compare.level} 风险 · ${task.compare.delta}`}
              >
                {task.compare.level} · {task.compare.delta}
              </span>
              <span className="ml-auto inline-flex items-center gap-1 text-[length:var(--wz-font-size-caption)] font-medium text-[color:var(--wz-color-text-tertiary)]">
                {locale === "en-US" ? "Follow-up required" : "待跟进"}
                <AppIcon
                  icon={expanded ? IconChevronUp : IconChevronDown}
                  size={9}
                />
              </span>
            </span>
          </span>
        </span>
      </button>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onClose(task.id);
        }}
        aria-label={locale === "en-US" ? `Close task: ${task.title}` : `关闭任务：${task.title}`}
        title={locale === "en-US" ? "Close task" : "关闭任务"}
        className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-[var(--wz-radius-md)] text-[color:var(--wz-color-text-tertiary)] opacity-100 transition-[background-color,color,opacity] [transition-duration:var(--wz-duration-fast)] [transition-timing-function:var(--wz-ease-standard)] hover:bg-[var(--wz-color-status-danger-subtle)] hover:text-[var(--wz-color-status-danger)] focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--wz-color-focus-ring)] sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
      >
        <AppIcon icon={IconClose} size={11} />
      </button>

      <div
        id={detailId}
        aria-hidden={!expanded}
        inert={expanded ? undefined : true}
        className={cn(
          "grid transition-[grid-template-rows,opacity] [transition-duration:var(--wz-duration-normal)] [transition-timing-function:var(--wz-ease-standard)] motion-reduce:transition-none",
          expanded
            ? "grid-rows-[1fr] opacity-100"
            : "pointer-events-none grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="space-y-2 px-3 pb-3 text-[length:var(--wz-font-size-caption)] leading-4">
            <div className="flex min-w-0 items-center gap-2 text-[color:var(--wz-color-text-secondary)]">
              <span className="min-w-0 flex-1 truncate">
                <span className="mr-1 text-[color:var(--wz-color-text-tertiary)]">{locale === "en-US" ? "Report" : "报告"}</span>
                {task.compare.claim.value}
              </span>
              <AppIcon
                icon={IconArrowRight}
                size={9}
                className="shrink-0 text-[color:var(--wz-color-text-tertiary)]"
              />
              <span className="min-w-0 flex-1 truncate">
                <span className="mr-1 text-[color:var(--wz-color-text-tertiary)]">{locale === "en-US" ? "Verified" : "核验"}</span>
                {task.compare.reality.value}
              </span>
            </div>
            <p className="text-[color:var(--wz-color-text-secondary)]">
              <span className="mr-1 text-[color:var(--wz-color-text-tertiary)]">{locale === "en-US" ? "Action" : "处置"}</span>
              {task.recommendation}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}
