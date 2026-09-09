import type { RiskLevel } from "@/src/types";

export const RISK_LEVEL_CONFIG: Record<
  RiskLevel,
  { label: string; shortLabel: string; className: string; description: string }
> = {
  R1: {
    label: "R1 低风险",
    shortLabel: "R1",
    className:
      "border-[var(--wz-color-border-default)] bg-[var(--wz-color-status-success-subtle)] text-[var(--wz-color-status-success)]",
    description: "本金基本无损失，收益稳定（如货币基金、保本理财）",
  },
  R2: {
    label: "R2 中低风险",
    shortLabel: "R2",
    className:
      "border-[var(--wz-color-border-default)] bg-[var(--wz-color-status-info-subtle)] text-[var(--wz-color-status-info)]",
    description: "波动极小，本金亏损概率低（如纯债基金、稳健型固收+）",
  },
  R3: {
    label: "R3 中风险",
    shortLabel: "R3",
    className:
      "border-[var(--wz-color-border-default)] bg-[var(--wz-color-status-warning-subtle)] text-[var(--wz-color-status-warning)]",
    description: "有一定波动，可能出现本金亏损（如偏债混合基金、大部分指数基金）",
  },
  R4: {
    label: "R4 中高风险",
    shortLabel: "R4",
    className:
      "border-[var(--wz-color-border-strong)] bg-[var(--wz-color-status-warning-subtle)] text-[var(--wz-color-status-warning)]",
    description: "波动较大，本金存在较大亏损可能（如股票型基金、行业主题基金）",
  },
  R5: {
    label: "R5 高风险",
    shortLabel: "R5",
    className:
      "border-[var(--wz-color-border-strong)] bg-[var(--wz-color-status-danger-subtle)] text-[var(--wz-color-status-danger)]",
    description: "可能损失全部本金甚至超出本金，结构复杂（如衍生品、杠杆基金）",
  },
};

/** R4 / R5：需优先关注、默认展开 */
export function isHighRisk(level: RiskLevel): boolean {
  return level === "R4" || level === "R5";
}

/** R3 及以上：需纳入投决重点 */
export function isElevatedRisk(level: RiskLevel): boolean {
  return level === "R3" || isHighRisk(level);
}
