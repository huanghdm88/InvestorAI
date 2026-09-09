import { useId, useState } from "react";

import { CitationsFooter } from "@/src/components/chat/CitationsFooter";
import { CitedText } from "@/src/components/chat/CitedText";
import { PriorityBadge } from "@/src/components/chat/PriorityBadge";
import { SourceAnchorList } from "@/src/components/chat/SourceAnchorList";
import { AppIcon } from "@/src/components/ui/app-icon";
import {
  IconArrowRight,
  IconChevronDown,
  IconChevronUp,
  IconFactCheck,
  IconTarget,
} from "@/src/lib/icons";
import { isHighRisk } from "@/src/lib/risk-level";
import { cn } from "@/src/lib/utils";
import { useLocale } from "@/src/lib/i18n";
import type { FactCompare, RiskLevel, SourceAnchor } from "@/src/types";

interface FactVerificationCardProps {
  title: string;
  level: RiskLevel;
  summary: string;
  compares: FactCompare[];
  anchors: SourceAnchor[];
  citations?: SourceAnchor[];
  onViewSource: (anchor: SourceAnchor) => void;
}

function deltaClass(delta?: string) {
  if (!delta) return "text-[color:var(--wz-color-text-tertiary)]";
  if (delta.includes("0%") && !delta.includes(".")) {
    return "text-[color:var(--wz-color-text-tertiary)]";
  }
  if (delta.startsWith("+")) return "text-[var(--wz-color-status-warning)]";
  if (delta.startsWith("-")) return "text-[var(--wz-color-status-success)]";
  return "text-[color:var(--wz-color-text-secondary)]";
}

function isZeroDelta(delta?: string) {
  if (!delta) return true;
  return /^0(\.0+)?%$/.test(delta.trim());
}

function levelBadgeClass(level: RiskLevel) {
  if (level === "R5" || level === "R4") {
    return "border-[var(--wz-color-status-danger)] bg-[var(--wz-color-status-danger-subtle)] text-[var(--wz-color-status-danger)]";
  }
  if (level === "R3") {
    return "border-[var(--wz-color-status-warning)] bg-[var(--wz-color-status-warning-subtle)] text-[var(--wz-color-status-warning)]";
  }
  return "border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-subtle)] text-[color:var(--wz-color-text-secondary)]";
}

/** 按 R 级风险映射语义状态：R5 / R4 危险，R3 警告，R1 / R2 中性。 */
function levelTone(level: RiskLevel, open: boolean) {
  if (level === "R5") {
    return {
      card: open
        ? "border-[var(--wz-color-status-danger)] bg-[var(--wz-color-status-danger-subtle)] shadow-[var(--wz-shadow-sm)]"
        : "border-[var(--wz-color-status-danger)] bg-[var(--wz-color-status-danger-subtle)]",
      toggleClosed:
        "bg-[var(--wz-color-status-danger-subtle)] text-[var(--wz-color-status-danger)] hover:bg-[var(--wz-color-bg-subtle)]",
      toggleOpen:
        "bg-[var(--wz-color-status-danger-subtle)] text-[var(--wz-color-status-danger)]",
      toggleIcon: "text-[var(--wz-color-status-danger)]",
      toggleChevron: "text-[var(--wz-color-status-danger)]",
      detailBg:
        "border-[var(--wz-color-border-default)] bg-[var(--wz-color-status-danger-subtle)]",
      detailLabel: "text-[var(--wz-color-status-danger)]",
    };
  }
  if (level === "R4") {
    return {
      card: open
        ? "border-[var(--wz-color-status-danger)] bg-[var(--wz-color-status-danger-subtle)] shadow-[var(--wz-shadow-sm)]"
        : "border-[var(--wz-color-status-danger)] bg-[var(--wz-color-status-danger-subtle)]",
      toggleClosed:
        "bg-[var(--wz-color-status-danger-subtle)] text-[var(--wz-color-status-danger)] hover:bg-[var(--wz-color-bg-subtle)]",
      toggleOpen:
        "bg-[var(--wz-color-status-danger-subtle)] text-[var(--wz-color-status-danger)]",
      toggleIcon: "text-[var(--wz-color-status-danger)]",
      toggleChevron: "text-[var(--wz-color-status-danger)]",
      detailBg:
        "border-[var(--wz-color-border-default)] bg-[var(--wz-color-status-danger-subtle)]",
      detailLabel: "text-[var(--wz-color-status-danger)]",
    };
  }
  if (level === "R3") {
    return {
      card: open
        ? "border-[var(--wz-color-status-warning)] bg-[var(--wz-color-status-warning-subtle)] shadow-[var(--wz-shadow-sm)]"
        : "border-[var(--wz-color-status-warning)] bg-[var(--wz-color-status-warning-subtle)]",
      toggleClosed:
        "bg-[var(--wz-color-status-warning-subtle)] text-[var(--wz-color-status-warning)] hover:bg-[var(--wz-color-bg-subtle)]",
      toggleOpen:
        "bg-[var(--wz-color-status-warning-subtle)] text-[var(--wz-color-status-warning)]",
      toggleIcon: "text-[var(--wz-color-status-warning)]",
      toggleChevron: "text-[var(--wz-color-status-warning)]",
      detailBg:
        "border-[var(--wz-color-border-default)] bg-[var(--wz-color-status-warning-subtle)]",
      detailLabel: "text-[var(--wz-color-status-warning)]",
    };
  }
  return {
    card: open
      ? "border-[var(--wz-color-border-strong)] shadow-[var(--wz-shadow-sm)]"
      : "border-[var(--wz-color-border-default)]",
    toggleClosed:
      "bg-[var(--wz-color-bg-surface)] text-[color:var(--wz-color-text-secondary)] hover:bg-[var(--wz-color-bg-subtle)] hover:text-[var(--wz-color-text-primary)]",
    toggleOpen:
      "bg-[var(--wz-color-bg-subtle)] text-[var(--wz-color-text-primary)]",
    toggleIcon: open
      ? "text-[color:var(--wz-color-text-secondary)]"
      : "text-[color:var(--wz-color-text-tertiary)]",
    toggleChevron: "text-[color:var(--wz-color-text-tertiary)]",
    detailBg:
      "border-[var(--wz-color-border-subtle)] bg-[var(--wz-color-bg-subtle)]",
    detailLabel: "text-[color:var(--wz-color-text-tertiary)]",
  };
}

export function FactVerificationCard({
  title,
  level,
  summary,
  compares,
  anchors,
  citations,
  onViewSource,
}: FactVerificationCardProps) {
  const { locale } = useLocale();
  const hasCitations = citations && citations.length > 0;
  const detailIdPrefix = useId();

  // 默认展开第一个 R4/R5 偏差，方便用户直接看到关键差异
  const initialOpen = compares.findIndex(
    (c) => !isZeroDelta(c.delta) && isHighRisk(c.level)
  );
  const [openIdx, setOpenIdx] = useState<number | null>(
    initialOpen >= 0 ? initialOpen : null
  );

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-[var(--wz-radius-lg)] border border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-surface)] shadow-[var(--wz-shadow-sm)]">
        <div className="border-b border-[var(--wz-color-border-subtle)] bg-[var(--wz-color-bg-subtle)] px-5 py-3.5">
          <div className="flex items-center gap-2">
            <AppIcon icon={IconFactCheck} size={14} className="text-[color:var(--wz-color-text-secondary)]" />
            <span className="text-[length:var(--wz-font-size-caption)] font-semibold uppercase tracking-normal text-[color:var(--wz-color-text-secondary)]">
              {locale === "en-US" ? "Cross Validation" : "事实交叉验证"}
            </span>
            <PriorityBadge level={level} size="sm" />
          </div>
          <h3 className="mt-1.5 text-base font-semibold text-[var(--wz-color-text-primary)]">{title}</h3>
          <p className="mt-1 text-xs leading-relaxed text-[color:var(--wz-color-text-secondary)]">
            <CitedText text={summary} citations={citations} onView={onViewSource} />
          </p>
        </div>

        <div className="px-5 py-4">
          <p className="mb-3 text-[length:var(--wz-font-size-caption)] font-semibold uppercase tracking-normal text-[color:var(--wz-color-text-tertiary)]">
            {locale === "en-US" ? "Evidence comparison" : "证据对比"}
          </p>
          <div className="space-y-2.5">
            {compares.map((c, idx) => {
              const zero = isZeroDelta(c.delta);
              const expandable = !zero && Boolean(c.deviationDetail);
              const open = openIdx === idx;
              const detailId = `${detailIdPrefix}-${idx}`;
              const highRisk = !zero && isHighRisk(c.level);
              const tone = levelTone(highRisk ? c.level : "R2", open);
              return (
                <div
                  key={idx}
                  className={cn(
                    "relative overflow-hidden rounded-[var(--wz-radius-lg)] border bg-[var(--wz-color-bg-surface)] transition-shadow [transition-duration:var(--wz-duration-normal)] [transition-timing-function:var(--wz-ease-standard)]",
                    tone.card
                  )}
                >
                  <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch gap-2 px-3 py-3">
                    <div className="min-w-0 flex flex-col">
                      <span className="text-[length:var(--wz-font-size-caption)] font-medium uppercase tracking-normal text-[color:var(--wz-color-text-tertiary)]">
                        {locale === "en-US" ? "Reported value" : "材料宣称值"}
                      </span>
                      <span className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-[var(--wz-color-text-primary)]">
                        {c.claim.value}
                      </span>
                      <span className="mt-1 text-[length:var(--wz-font-size-caption)] text-[color:var(--wz-color-text-tertiary)]">
                        <CitedText
                          text={c.claim.source}
                          citations={citations}
                          onView={onViewSource}
                        />
                      </span>
                    </div>

                    <div className="flex flex-col items-center justify-center gap-1 px-2">
                      <span className="text-[length:var(--wz-font-size-caption)] text-[color:var(--wz-color-text-tertiary)]">{c.label}</span>
                      <div
                        className={cn(
                          "flex items-center gap-1 rounded-full border px-2 py-0.5 text-[length:var(--wz-font-size-tag)] leading-[var(--wz-line-height-tag)] font-semibold tabular-nums",
                          levelBadgeClass(c.level)
                        )}
                      >
                        <AppIcon icon={IconArrowRight} size={10} />
                        <span className={cn("font-mono", deltaClass(c.delta))}>{c.delta ?? "—"}</span>
                      </div>
                    </div>

                    <div className="min-w-0 flex flex-col items-end text-right">
                      <span className="text-[length:var(--wz-font-size-caption)] font-medium uppercase tracking-normal text-[color:var(--wz-color-text-tertiary)]">
                        {locale === "en-US" ? "Verified value" : "实证 / 校验值"}
                      </span>
                      <span className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-[var(--wz-color-text-primary)]">
                        {c.reality.value}
                      </span>
                      <span className="mt-1 text-[length:var(--wz-font-size-caption)] text-[color:var(--wz-color-text-tertiary)]">
                        <CitedText
                          text={c.reality.source}
                          citations={citations}
                          onView={onViewSource}
                        />
                      </span>
                    </div>
                  </div>

                  {expandable && (
                    <button
                      type="button"
                      onClick={() => setOpenIdx(open ? null : idx)}
                      aria-expanded={open}
                      aria-controls={detailId}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 border-t border-[var(--wz-color-border-subtle)] px-3 py-2 text-[length:var(--wz-font-size-caption)] font-medium transition-colors [transition-duration:var(--wz-duration-fast)] [transition-timing-function:var(--wz-ease-standard)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--wz-color-focus-ring)]",
                        open ? tone.toggleOpen : tone.toggleClosed
                      )}
                    >
                      <span className="flex items-center gap-1.5">
                        <AppIcon icon={IconTarget} size={11} className={tone.toggleIcon} />
                        {locale === "en-US" ? "Discrepancy details · Cause / Impact / Action" : "偏差详情 · 成因 / 影响 / 处置建议"}
                      </span>
                      <AppIcon
                        icon={open ? IconChevronUp : IconChevronDown}
                        size={11}
                        className={tone.toggleChevron}
                      />
                    </button>
                  )}

                  {expandable && c.deviationDetail && (
                    <div
                      id={detailId}
                      hidden={!open}
                      className={cn(
                        "space-y-3 border-t px-4 py-3",
                        open && "animate-staged-reveal",
                        tone.detailBg
                      )}
                    >
                      <DeviationRow
                        label={locale === "en-US" ? "Cause" : "差异成因"}
                        text={c.deviationDetail.explanation}
                        labelClassName={highRisk ? tone.detailLabel : undefined}
                        citations={citations}
                        onViewSource={onViewSource}
                      />
                      <DeviationRow
                        label={locale === "en-US" ? "Business impact" : "业务影响"}
                        text={c.deviationDetail.impact}
                        tone="warning"
                        citations={citations}
                        onViewSource={onViewSource}
                      />
                      {c.deviationDetail.recommendation && (
                        <DeviationRow
                          label={locale === "en-US" ? "Recommended action" : "处置建议"}
                          text={c.deviationDetail.recommendation}
                          tone="action"
                          citations={citations}
                          onViewSource={onViewSource}
                        />
                      )}

                      {c.deviationDetail.evidence && c.deviationDetail.evidence.length > 0 && (
                        <div>
                          <p
                            className={cn(
                              "mb-1.5 text-[length:var(--wz-font-size-caption)] font-semibold uppercase tracking-normal",
                              highRisk
                                ? tone.detailLabel
                                : "text-[color:var(--wz-color-text-tertiary)]"
                            )}
                          >
                            {locale === "en-US" ? "Key evidence anchors" : "关键证据锚点"} · {c.deviationDetail.evidence.length}
                          </p>
                          <div className="space-y-1.5">
                            {c.deviationDetail.evidence.map((ev, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => onViewSource(ev)}
                                className="block w-full rounded-[var(--wz-radius-lg)] border border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-surface)] px-3 py-2 text-left transition-[background-color,border-color] [transition-duration:var(--wz-duration-fast)] [transition-timing-function:var(--wz-ease-standard)] hover:border-[var(--wz-color-border-strong)] hover:bg-[var(--wz-color-bg-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--wz-color-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--wz-color-bg-subtle)]"
                              >
                                <p className="line-clamp-2 text-xs leading-relaxed text-[color:var(--wz-color-text-secondary)]">
                                  {ev.excerpt}
                                </p>
                                <p className="mt-1 text-[length:var(--wz-font-size-caption)] text-[color:var(--wz-color-text-tertiary)]">
                                  {locale === "en-US" ? ev.document : `《${ev.document}》`} · P{ev.page}
                                  {ev.paragraph && ` · ${ev.paragraph}`}
                                </p>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 旧版「证据锚点」摘要：当未提供 citations 时退回展示，避免影响历史数据 */}
        {!hasCitations && anchors && anchors.length > 0 && (
          <div className="border-t border-[var(--wz-color-border-subtle)] bg-[var(--wz-color-bg-subtle)] px-5 py-3.5">
            <SourceAnchorList anchors={anchors} onView={onViewSource} compact />
          </div>
        )}
      </div>

      <CitationsFooter citations={citations} onView={onViewSource} />
    </div>
  );
}

function DeviationRow({
  label,
  text,
  tone = "default",
  labelClassName,
  citations,
  onViewSource,
}: {
  label: string;
  text: string;
  tone?: "default" | "warning" | "action";
  /** 当行需要随宿主 R 级风险高亮时由外层传入语义状态色。 */
  labelClassName?: string;
  citations?: SourceAnchor[];
  onViewSource: (anchor: SourceAnchor) => void;
}) {
  return (
    <div>
      <p
        className={cn(
          "mb-1 text-[length:var(--wz-font-size-caption)] font-semibold uppercase tracking-normal",
          tone === "warning" && "text-[var(--wz-color-status-warning)]",
          tone === "action" && "text-[var(--wz-color-status-success)]",
          tone === "default" &&
            (labelClassName ?? "text-[color:var(--wz-color-text-tertiary)]")
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          "text-[length:var(--wz-font-size-body)] leading-relaxed",
          tone === "warning" && "text-[var(--wz-color-text-primary)]",
          tone === "action" && "text-[var(--wz-color-text-primary)]",
          tone === "default" && "text-[color:var(--wz-color-text-secondary)]"
        )}
      >
        <CitedText text={text} citations={citations} onView={onViewSource} />
      </p>
    </div>
  );
}
