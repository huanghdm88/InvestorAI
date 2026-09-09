import { CitationsFooter } from "@/src/components/chat/CitationsFooter";
import { CitedText } from "@/src/components/chat/CitedText";
import { PriorityBadge } from "@/src/components/chat/PriorityBadge";
import { AppIcon } from "@/src/components/ui/app-icon";
import { IconBuilding } from "@/src/lib/icons";
import { useLocale } from "@/src/lib/i18n";
import type { AssistantBlock, SourceAnchor } from "@/src/types";

type EnterpriseBlock = Extract<AssistantBlock, { kind: "enterprise-analysis" }>;

interface EnterpriseAnalysisCardProps {
  block: EnterpriseBlock;
  onViewSource: (anchor: SourceAnchor) => void;
}

export function EnterpriseAnalysisCard({
  block,
  onViewSource,
}: EnterpriseAnalysisCardProps) {
  const { locale, t } = useLocale();

  return (
    <div className="space-y-5">
      <div className="rounded-[var(--wz-radius-lg)] border border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-surface)] p-5 shadow-[var(--wz-shadow-sm)]">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--wz-radius-lg)] bg-[var(--wz-color-action-primary)] text-[var(--wz-color-text-inverse)]">
            <AppIcon icon={IconBuilding} size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[length:var(--wz-font-size-caption)] font-semibold text-[color:var(--wz-color-text-secondary)]">
                {block.reportLabel ?? t("report.enterpriseAnalysis")}
              </span>
            </div>
            <p className="mt-2 text-[length:var(--wz-font-size-body)] leading-relaxed text-[color:var(--wz-color-text-secondary)]">
              {block.citations && block.citations.length > 0 ? (
                <CitedText
                  text={block.summary}
                  citations={block.citations}
                  onView={onViewSource}
                />
              ) : (
                block.summary
              )}
            </p>
          </div>
        </div>
      </div>

      <section>
        <h3 className="mb-2.5 text-[length:var(--wz-font-size-caption)] font-semibold text-[color:var(--wz-color-text-tertiary)]">
          {locale === "en-US" ? "Assessment by Dimension" : "分维度评估"}
        </h3>
        <ul className="space-y-2">
          {block.dimensions.map((d) => (
            <li
              key={d.key}
              className="rounded-[var(--wz-radius-lg)] border border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-surface)] px-4 py-3.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[length:var(--wz-font-size-body)] font-semibold text-[var(--wz-color-text-primary)]">
                  {d.label}
                </span>
                <PriorityBadge level={d.level} size="sm" />
              </div>
              <p className="mt-2 text-[length:var(--wz-font-size-body)] leading-relaxed text-[color:var(--wz-color-text-secondary)]">
                {d.finding}
              </p>
              <p className="mt-2 rounded-[var(--wz-radius-lg)] bg-[var(--wz-color-bg-subtle)] px-3 py-2 text-[length:var(--wz-font-size-caption)] leading-relaxed text-[color:var(--wz-color-text-secondary)]">
                <span className="font-medium text-[var(--wz-color-text-primary)]">
                  {locale === "en-US" ? "Recommendation · " : "建议 · "}
                </span>
                {d.recommendation}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="mb-2.5 text-[length:var(--wz-font-size-caption)] font-semibold text-[color:var(--wz-color-text-tertiary)]">
          {t("report.keyFindings")}
        </h3>
        <ul className="space-y-1.5 rounded-[var(--wz-radius-lg)] border border-[var(--wz-color-status-warning)] bg-[var(--wz-color-status-warning-subtle)] px-4 py-3">
          {block.highlights.map((h, i) => (
            <li
              key={i}
              className="flex gap-2 text-[length:var(--wz-font-size-body)] leading-relaxed text-[var(--wz-color-text-primary)]"
            >
              <span className="shrink-0 font-semibold text-[var(--wz-color-status-warning)]">
                {i + 1}.
              </span>
              <span>{h}</span>
            </li>
          ))}
        </ul>
      </section>

      {block.citations && block.citations.length > 0 && (
        <CitationsFooter citations={block.citations} onView={onViewSource} />
      )}
    </div>
  );
}
