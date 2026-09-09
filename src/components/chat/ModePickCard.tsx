import { useEffect, useRef, useState } from "react";

import { AppIcon } from "@/src/components/ui/app-icon";
import {
  IconArrowRight,
  IconAuto,
  IconChallenge,
  IconCheckCircle,
  IconFactCheck,
  IconFileText,
} from "@/src/lib/icons";
import { cn } from "@/src/lib/utils";
import { useLocale } from "@/src/lib/i18n";
import type { ModePickOption, WorkMode } from "@/src/types";

interface ModePickCardProps {
  title: string;
  reason: string;
  options: ModePickOption[];
  /** 用户选择了某个模式 → 以该模式重新发起任务 */
  onPick: (mode: Extract<WorkMode, "fact-check" | "challenge" | "investment-report">) => void;
}

const modeIconMap: Record<Extract<WorkMode, "fact-check" | "challenge" | "investment-report">, typeof IconAuto> = {
  "fact-check": IconFactCheck,
  challenge: IconChallenge,
  "investment-report": IconFileText,
};

export function ModePickCard({ title, reason, options, onPick }: ModePickCardProps) {
  const { locale } = useLocale();
  const [picked, setPicked] = useState<ModePickOption["mode"] | null>(null);
  const confirmationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (picked) confirmationRef.current?.focus();
  }, [picked]);

  if (picked) {
    return (
      <div
        ref={confirmationRef}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        tabIndex={-1}
        className="flex items-center gap-2.5 rounded-[var(--wz-radius-lg)] border border-[var(--wz-color-status-success)] bg-[var(--wz-color-status-success-subtle)] px-4 py-3 outline-none focus-visible:ring-2 focus-visible:ring-[var(--wz-color-focus-ring)]"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--wz-color-bg-surface)] text-[var(--wz-color-status-success)]">
          <AppIcon icon={IconCheckCircle} size={14} />
        </span>
        <p className="text-[length:var(--wz-font-size-body)] font-medium text-[var(--wz-color-text-primary)]">
          {locale === "en-US"
            ? `Selected “${options.find((o) => o.mode === picked)?.label}”. Redispatching the task…`
            : `已选择「${options.find((o) => o.mode === picked)?.label}」，正在重新分发任务…`}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[var(--wz-radius-lg)] border border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-surface)] shadow-[var(--wz-shadow-sm)]">
      <div className="px-5 pt-4 pb-3.5">
        <div className="flex items-center gap-1.5 text-[length:var(--wz-font-size-caption)] font-semibold text-[color:var(--wz-color-text-secondary)]">
          <AppIcon icon={IconAuto} size={11} />
          {locale === "en-US" ? "Smart routing · Confirmation required" : "智能路由 · 待确认"}
        </div>
        <h3 className="mt-2 text-[length:var(--wz-font-size-body)] font-semibold leading-snug text-[var(--wz-color-text-primary)]">{title}</h3>
        <p className="mt-1.5 text-[length:var(--wz-font-size-body)] leading-relaxed text-[color:var(--wz-color-text-secondary)]">{reason}</p>
      </div>

      <div className="space-y-2 border-t border-[var(--wz-color-border-subtle)] px-5 py-4">
        {options.map((opt) => {
          const Icon = modeIconMap[opt.mode];
          return (
            <button
              key={opt.mode}
              type="button"
              onClick={() => {
                setPicked(opt.mode);
                onPick(opt.mode);
              }}
              className={cn(
                "group flex w-full items-start gap-3 rounded-[var(--wz-radius-lg)] border bg-[var(--wz-color-bg-surface)] px-3.5 py-3 text-left outline-none transition-[border-color,box-shadow] [transition-duration:var(--wz-duration-normal)] [transition-timing-function:var(--wz-ease-standard)]",
                "hover:border-[var(--wz-color-border-strong)] hover:shadow-[var(--wz-shadow-md)] focus-visible:border-[var(--wz-color-border-focus)] focus-visible:shadow-[0_0_0_3px_var(--wz-color-focus-ring)]",
                opt.recommended
                  ? "border-[var(--wz-color-action-primary)]"
                  : "border-[var(--wz-color-border-default)]"
              )}
            >
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--wz-radius-lg)] transition-[background-color,color] [transition-duration:var(--wz-duration-fast)] [transition-timing-function:var(--wz-ease-standard)]",
                  opt.recommended
                    ? "bg-[var(--wz-color-action-primary)] text-[var(--wz-color-text-inverse)]"
                    : "bg-[var(--wz-color-bg-subtle)] text-[color:var(--wz-color-text-secondary)] group-hover:bg-[var(--wz-color-action-primary)] group-hover:text-[var(--wz-color-text-inverse)]"
                )}
              >
                <AppIcon icon={Icon} size={13} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[length:var(--wz-font-size-body)] font-semibold text-[var(--wz-color-text-primary)]">{opt.label}</span>
                  {opt.recommended && (
                    <span className="rounded-full bg-[var(--wz-color-action-primary)] px-1.5 py-0.5 text-[length:var(--wz-font-size-tag)] leading-[var(--wz-line-height-tag)] font-semibold text-[var(--wz-color-text-inverse)]">
                      {locale === "en-US" ? "Recommended" : "推荐"}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[length:var(--wz-font-size-caption)] leading-relaxed text-[color:var(--wz-color-text-secondary)]">{opt.desc}</p>
              </div>
              <AppIcon
                icon={IconArrowRight}
                size={12}
                className="mt-2.5 shrink-0 text-[color:var(--wz-color-text-tertiary)] transition-[color,transform] [transition-duration:var(--wz-duration-fast)] [transition-timing-function:var(--wz-ease-standard)] group-hover:translate-x-0.5 group-hover:text-[var(--wz-color-text-primary)]"
              />
            </button>
          );
        })}
      </div>

      <div className="border-t border-[var(--wz-color-border-subtle)] bg-[var(--wz-color-bg-subtle)] px-5 py-2.5">
        <p className="text-[length:var(--wz-font-size-caption)] text-[color:var(--wz-color-text-tertiary)]">
          {locale === "en-US" ? "After selection, the Agent will continue in the chosen mode without losing your original question." : "选择后 Agent 将以对应模式继续执行任务，不会丢失你当前的问题"}
        </p>
      </div>
    </div>
  );
}
