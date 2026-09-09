import { useEffect, useId, useRef, useState } from "react";

import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { AppIcon } from "@/src/components/ui/app-icon";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/src/components/ui/tooltip";
import { IconCheckCircle, IconInfo } from "@/src/lib/icons";
import { useLocale } from "@/src/lib/i18n";
import type { ClarificationField } from "@/src/types";

interface ClarificationCardProps {
  title: string;
  reason: string;
  fields: ClarificationField[];
  onSubmit: (values: Record<string, string>) => void;
}

const fieldInputClass =
  "h-10 bg-[var(--wz-color-bg-surface)] shadow-none";

export function ClarificationCard({ title, reason, fields, onSubmit }: ClarificationCardProps) {
  const { locale } = useLocale();
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const formId = useId();
  const confirmationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (submitted) confirmationRef.current?.focus();
  }, [submitted]);

  const allRequiredFilled = fields
    .filter((f) => f.required)
    .every((f) => (values[f.key] ?? "").trim() !== "");

  if (submitted) {
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
          {locale === "en-US" ? "Submitted. The Agent will continue using the additional data." : "已提交，Agent 将基于补充数据继续推算"}
        </p>
      </div>
    );
  }

  return (
    <form
      className="overflow-hidden rounded-[var(--wz-radius-lg)] border border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-surface)] shadow-[var(--wz-shadow-sm)]"
      onSubmit={(event) => {
        event.preventDefault();
        if (!allRequiredFilled) return;
        onSubmit(values);
        setSubmitted(true);
      }}
    >
      <div className="px-5 py-4">
        <div className="flex items-start gap-1.5">
          <h3 className="min-w-0 text-[length:var(--wz-font-size-body)] font-semibold leading-snug text-[var(--wz-color-text-primary)]">
            {title}
          </h3>
          <TooltipProvider delayDuration={250}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-[var(--wz-radius-sm)] text-[color:var(--wz-color-text-tertiary)] outline-none transition-colors hover:bg-[var(--wz-color-bg-subtle)] hover:text-[var(--wz-color-text-primary)] focus-visible:shadow-[0_0_0_3px_var(--wz-color-focus-ring)]"
                  aria-label={locale === "en-US" ? "Why this information is required" : "为什么需要补充此信息"}
                >
                  <AppIcon icon={IconInfo} size={13} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" align="start">
                {reason}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <div className="space-y-3.5 border-t border-[var(--wz-color-border-subtle)] px-5 py-4">
        {fields.map((f) => {
          const inputId = `${formId}-${f.key}`;
          const hintId = `${inputId}-hint`;

          return (
            <div key={f.key} className="space-y-1.5">
              <label
                htmlFor={inputId}
                className="flex items-center gap-1 text-[length:var(--wz-font-size-body)] font-medium text-[var(--wz-color-text-primary)]"
              >
                {f.label}
                {f.required && (
                  <span className="text-[var(--wz-color-status-danger)]" aria-hidden="true">
                    *
                  </span>
                )}
              </label>
              <Input
                id={inputId}
                type={f.type === "number" ? "number" : "text"}
                value={values[f.key] ?? ""}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    [f.key]: event.target.value,
                  }))
                }
                placeholder={f.hint || (locale === "en-US" ? `Enter ${f.label}` : `请输入${f.label}`)}
                className={fieldInputClass}
                required={f.required}
                aria-describedby={f.hint ? hintId : undefined}
              />
              {f.hint && (
                <p
                  id={hintId}
                  className="text-[length:var(--wz-font-size-caption)] leading-relaxed text-[color:var(--wz-color-text-tertiary)]"
                >
                  {f.hint}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-end border-t border-[var(--wz-color-border-subtle)] bg-[var(--wz-color-bg-subtle)] px-5 py-3">
        <Button
          type="submit"
          variant="default"
          size="sm"
          disabled={!allRequiredFilled}
          className="min-w-[88px]"
        >
          {locale === "en-US" ? "Submit" : "提交"}
        </Button>
      </div>
    </form>
  );
}
