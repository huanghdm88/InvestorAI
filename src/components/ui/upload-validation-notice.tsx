import { AppIcon } from "@/src/components/ui/app-icon";
import { IconClose, IconShieldAlert } from "@/src/lib/icons";
import { cn } from "@/src/lib/utils";

interface UploadValidationNoticeProps {
  title: string;
  messages: readonly string[];
  dismissLabel: string;
  onDismiss: () => void;
  className?: string;
}

export function UploadValidationNotice({
  title,
  messages,
  dismissLabel,
  onDismiss,
  className,
}: UploadValidationNoticeProps) {
  if (messages.length === 0) return null;

  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-2 rounded-[var(--wz-radius-md)] border border-[var(--wz-color-status-danger)] bg-[var(--wz-color-status-danger-subtle)] px-3 py-2.5 text-left",
        className
      )}
    >
      <AppIcon
        icon={IconShieldAlert}
        size={13}
        className="mt-0.5 shrink-0 text-[var(--wz-color-status-danger)]"
      />
      <div className="min-w-0 flex-1">
        <p className="text-[length:var(--wz-font-size-body)] font-medium text-[var(--wz-color-text-primary)]">
          {title}
        </p>
        <ul className="mt-1 grid gap-0.5 text-[length:var(--wz-font-size-caption)] leading-5 text-[color:var(--wz-color-text-secondary)]">
          {messages.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label={dismissLabel}
        title={dismissLabel}
        className="wz-icon-button flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--wz-radius-sm)] text-[color:var(--wz-color-text-tertiary)] outline-none transition-colors hover:bg-[var(--wz-color-bg-surface)] hover:text-[var(--wz-color-text-primary)] focus-visible:shadow-[0_0_0_3px_var(--wz-color-focus-ring)]"
      >
        <AppIcon icon={IconClose} size={11} />
      </button>
    </div>
  );
}
