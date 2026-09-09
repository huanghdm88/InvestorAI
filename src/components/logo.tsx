import { cn } from "@/src/lib/utils";
import { useLocale } from "@/src/lib/i18n";

export type LogoVariant = "brand" | "conversation";

type LogoProps = {
  className?: string;
  withText?: boolean;
  variant?: LogoVariant;
  markClassName?: string;
};

/** The brand and conversation marks share a blue gradient and white icon. */
export function Logo({
  className,
  withText = true,
  variant = "brand",
  markClassName,
}: LogoProps) {
  const { t } = useLocale();
  const isConversation = variant === "conversation";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className={cn(
          "relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden",
          isConversation
            ? "rounded-xl bg-gradient-to-br from-sky-400 via-blue-600 to-blue-800 text-white shadow-sm"
            : "rounded-[var(--wz-radius-lg)] bg-[var(--wz-color-bg-subtle)] shadow-sm",
          markClassName
        )}
      >
        {isConversation ? (
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
            <path d="M4 18 L9 12 L13 15 L20 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="20" cy="6" r="1.6" fill="currentColor" />
          </svg>
        ) : (
          <img
            src="/brand/investor-ai-mark.svg"
            alt=""
            aria-hidden="true"
            className="h-full w-full object-cover"
            draggable={false}
          />
        )}
      </div>
      {withText && (
        <span className="text-sm font-semibold leading-tight tracking-[0] text-[var(--wz-color-text-primary)]">
          {t("brand.name")}
        </span>
      )}
    </div>
  );
}
