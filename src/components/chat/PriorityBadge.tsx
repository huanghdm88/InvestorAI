import { cn } from "@/src/lib/utils";
import { RISK_LEVEL_CONFIG } from "@/src/lib/risk-level";
import { useLocale } from "@/src/lib/i18n";
import type { RiskLevel } from "@/src/types";

export function PriorityBadge({
  level,
  showDescription = false,
  size = "default",
}: {
  level: RiskLevel;
  showDescription?: boolean;
  size?: "default" | "sm";
}) {
  const { t } = useLocale();
  const cfg = RISK_LEVEL_CONFIG[level];
  const label = {
    R1: t("risk.R1"),
    R2: t("risk.R2"),
    R3: t("risk.R3"),
    R4: t("risk.R4"),
    R5: t("risk.R5"),
  }[level];
  const description = {
    R1: t("risk.R1Description"),
    R2: t("risk.R2Description"),
    R3: t("risk.R3Description"),
    R4: t("risk.R4Description"),
    R5: t("risk.R5Description"),
  }[level];
  return (
    <div className="inline-flex items-center gap-2">
      <span
        className={cn(
          "inline-flex items-center rounded-full border font-semibold",
          cfg.className,
          size === "sm" ? "px-2 py-0.5 text-[length:var(--wz-font-size-tag)] leading-[var(--wz-line-height-tag)]" : "px-2.5 py-0.5 text-[length:var(--wz-font-size-tag)] leading-[var(--wz-line-height-tag)]"
        )}
      >
        {label}
      </span>
      {showDescription && (
        <span className="text-[length:var(--wz-font-size-caption)] text-[color:var(--wz-color-text-secondary)]">{description}</span>
      )}
    </div>
  );
}

export const riskLevelMeta = RISK_LEVEL_CONFIG;
