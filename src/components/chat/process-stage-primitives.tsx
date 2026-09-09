import { cn } from "@/src/lib/utils";
import { useLocale } from "@/src/lib/i18n";
import { AppIcon } from "@/src/components/ui/app-icon";
import { IconRefresh } from "@/src/lib/icons";

export type ProcessStageState = "active" | "completed" | "stopped";

export interface ProcessStageItem {
  id?: string;
  title: string;
}

export function ProcessStageStatusBadge({
  state,
  className,
}: {
  state: ProcessStageState;
  className?: string;
}) {
  const { locale } = useLocale();

  if (state === "active") {
    return (
      <span
        role="status"
        aria-live="polite"
        aria-atomic="true"
        aria-busy="true"
        className={cn(
          "inline-flex shrink-0 items-center gap-1 text-[length:var(--wz-font-size-tag)] leading-[var(--wz-line-height-tag)] font-medium text-[var(--wz-color-status-info)]",
          className
        )}
      >
        <AppIcon
          icon={IconRefresh}
          size={10}
          className="animate-spin motion-reduce:animate-none"
          aria-hidden="true"
        />
        {locale === "en-US" ? "Running" : "执行中"}
      </span>
    );
  }

  return (
    <span
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={cn(
        "inline-flex shrink-0 items-center rounded-[var(--wz-radius-sm)] px-2 py-0.5 text-[length:var(--wz-font-size-tag)] leading-[var(--wz-line-height-tag)] font-semibold",
        state === "completed"
          ? "bg-[var(--wz-color-bg-subtle)] text-[color:var(--wz-color-text-tertiary)]"
          : "bg-[var(--wz-color-status-danger-subtle)] text-[var(--wz-color-status-danger)]",
        className
      )}
    >
      {locale === "en-US"
        ? state === "completed"
          ? "Completed"
          : "Stopped"
        : state === "completed"
          ? "已完成"
          : "已停止"}
    </span>
  );
}

export function ProcessStageTracker({
  activeIndex,
  selectedIndex,
  stages,
  completed,
  stopped,
  sectionIdPrefix,
  onSelect,
}: {
  activeIndex: number;
  selectedIndex: number | null;
  stages: readonly ProcessStageItem[];
  completed: boolean;
  stopped: boolean;
  sectionIdPrefix: string;
  onSelect: (index: number) => void;
}) {
  const { locale } = useLocale();

  return (
    <nav
      aria-label={locale === "en-US" ? "Generation process navigation" : "生成过程目录"}
      className="grid border-b border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-surface)] px-2 sm:px-4"
      style={{ gridTemplateColumns: `repeat(${stages.length}, minmax(0, 1fr))` }}
    >
      {stages.map((stage, index) => {
        const active = !completed && index === activeIndex;
        const available = completed || index <= activeIndex;
        const selected = available && index === selectedIndex;
        const stageStopped = stopped && active;

        return (
          <button
            type="button"
            key={stage.id ?? stage.title}
            disabled={!available}
            onClick={() => onSelect(index)}
            aria-current={selected ? "location" : undefined}
            aria-controls={available ? `${sectionIdPrefix}-stage-${index}` : undefined}
            title={
              locale === "en-US"
                ? available
                  ? `Go to ${stage.title}`
                  : `${stage.title} has not started`
                : available
                  ? `定位到${stage.title}`
                  : `${stage.title}尚未开始`
            }
            className={cn(
              "relative flex min-w-0 items-center justify-center border-b-2 border-transparent px-1 py-3 text-[length:var(--wz-font-size-caption)] font-medium text-[color:var(--wz-color-text-secondary)] outline-none transition-[background-color,border-color,color,box-shadow] [transition-duration:var(--wz-duration-fast)] [transition-timing-function:var(--wz-ease-standard)]",
              available &&
                "cursor-pointer hover:bg-[var(--wz-color-bg-subtle)] hover:text-[var(--wz-color-text-primary)] active:bg-[var(--wz-color-border-subtle)] focus-visible:z-10 focus-visible:shadow-[inset_0_0_0_2px_var(--wz-color-border-focus)]",
              !available && "cursor-default text-[var(--wz-color-text-disabled)]",
              active && "font-semibold",
              stageStopped && "text-[var(--wz-color-status-danger)]",
              selected &&
                "border-[var(--wz-color-status-info)] text-[var(--wz-color-text-primary)]"
            )}
          >
            <span className="min-w-0 truncate">{stage.title}</span>
          </button>
        );
      })}
    </nav>
  );
}
