import { cn } from "@/src/lib/utils";
import { useLocale } from "@/src/lib/i18n";
import { AppIcon } from "@/src/components/ui/app-icon";
import { IconRefresh } from "@/src/lib/icons";

interface AnalyzingBadgeProps {
  label?: string;
  className?: string;
  /** sm：侧边栏；md：顶部 Header */
  size?: "sm" | "md";
  /** 仅主内容区的单一实例播报状态，侧栏镜像保持静默。 */
  announce?: boolean;
}

/**
 * 动态「解析中」徽章：使用统一的循环 loading 图标。
 * 侧边栏项目行有独立的状态点实现，以保留其紧凑布局。
 */
export function AnalyzingBadge({
  label,
  className,
  size = "sm",
  announce = false,
}: AnalyzingBadgeProps) {
  const { t } = useLocale();
  const resolvedLabel = label ?? t("common.analyzing");
  return (
    <span
      role={announce ? "status" : undefined}
      aria-live={announce ? "polite" : undefined}
      aria-atomic={announce ? "true" : undefined}
      aria-label={resolvedLabel}
      title={resolvedLabel}
      className={cn(
        "inline-flex select-none items-center gap-1 rounded-full border border-[var(--wz-color-border-default)] bg-[var(--wz-color-status-running-subtle)] font-medium text-[var(--wz-color-status-running)]",
        size === "sm" ? "px-1.5 py-0.5 text-[length:var(--wz-font-size-tag)] leading-[var(--wz-line-height-tag)]" : "px-2 py-0.5 text-[length:var(--wz-font-size-tag)] leading-[var(--wz-line-height-tag)]",
        className
      )}
    >
      <AppIcon
        icon={IconRefresh}
        size={size === "sm" ? 10 : 11}
        className="animate-spin motion-reduce:animate-none"
        aria-hidden="true"
      />
      {resolvedLabel}
    </span>
  );
}
