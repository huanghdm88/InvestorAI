import { CitationsFooter } from "@/src/components/chat/CitationsFooter";
import { CitedText } from "@/src/components/chat/CitedText";
import { AppIcon } from "@/src/components/ui/app-icon";
import { IconCalculator, IconTrendUp } from "@/src/lib/icons";
import { useLocale } from "@/src/lib/i18n";
import type { SourceAnchor } from "@/src/types";

interface ValuationCardProps {
  title: string;
  summary: string;
  methods: Array<{
    method: string;
    range: string;
    assumption: string;
    applicability: string;
  }>;
  conclusion: string;
  citations?: SourceAnchor[];
  onViewSource?: (anchor: SourceAnchor) => void;
}

const noop = () => undefined;

export function ValuationCard({
  title,
  summary,
  methods,
  conclusion,
  citations,
  onViewSource,
}: ValuationCardProps) {
  const { locale, t } = useLocale();
  const handleView = onViewSource ?? noop;

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-[var(--wz-radius-lg)] border border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-surface)] shadow-[var(--wz-shadow-sm)]">
        <div className="border-b border-[var(--wz-color-border-subtle)] bg-[var(--wz-color-bg-subtle)] px-5 py-3.5">
          <div className="flex items-center gap-2">
            <AppIcon icon={IconCalculator} size={14} className="text-[color:var(--wz-color-text-secondary)]" />
            <span className="text-[length:var(--wz-font-size-caption)] font-semibold uppercase tracking-normal text-[color:var(--wz-color-text-secondary)]">
              {t("report.valuation")}
            </span>
          </div>
          <h3 className="mt-1.5 text-base font-semibold text-[var(--wz-color-text-primary)]">{title}</h3>
          <p className="mt-1 text-xs leading-relaxed text-[color:var(--wz-color-text-secondary)]">
            <CitedText text={summary} citations={citations} onView={handleView} />
          </p>
        </div>

        <div className="grid grid-cols-1 divide-y divide-[var(--wz-color-border-subtle)]">
          {methods.map((m, i) => (
            <div key={i} className="grid min-w-0 grid-cols-1 gap-3 px-5 py-3.5 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[var(--wz-color-text-primary)]">{m.method}</p>
                <p className="mt-1 text-[length:var(--wz-font-size-caption)] uppercase tracking-normal text-[color:var(--wz-color-text-tertiary)]">
                  {locale === "en-US" ? "Independent Valuation Range" : "独立估值区间"}
                </p>
                <p className="mt-1 font-mono text-base font-semibold tabular-nums text-[var(--wz-color-text-primary)]">
                  {m.range}
                </p>
                <p className="mt-1.5 text-[length:var(--wz-font-size-caption)] text-[color:var(--wz-color-text-tertiary)]">
                  <CitedText text={m.applicability} citations={citations} onView={handleView} />
                </p>
              </div>
              <div className="min-w-0 flex items-start gap-2 rounded-[var(--wz-radius-lg)] bg-[var(--wz-color-bg-subtle)] px-3 py-2.5">
                <AppIcon icon={IconTrendUp} size={13} className="mt-0.5 text-[color:var(--wz-color-text-secondary)]" />
                <div className="min-w-0">
                  <p className="text-[length:var(--wz-font-size-caption)] font-semibold uppercase tracking-normal text-[color:var(--wz-color-text-tertiary)]">
                    {locale === "en-US" ? "Implied Assumptions" : "隐含假设"}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-[color:var(--wz-color-text-secondary)]">
                    <CitedText text={m.assumption} citations={citations} onView={handleView} />
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-[var(--wz-color-border-subtle)] bg-[var(--wz-color-status-warning-subtle)] px-5 py-3.5">
          <p className="text-[length:var(--wz-font-size-caption)] font-semibold uppercase tracking-normal text-[var(--wz-color-status-warning)]">
            {locale === "en-US" ? "Overall Valuation Range" : "综合估值区间"}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-[var(--wz-color-text-primary)]">
            <CitedText text={conclusion} citations={citations} onView={handleView} />
          </p>
        </div>
      </div>

      <CitationsFooter citations={citations} onView={handleView} />
    </div>
  );
}
