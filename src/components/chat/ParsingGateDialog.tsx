import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useRef } from "react";

import { Button } from "@/src/components/ui/button";
import { AppIcon } from "@/src/components/ui/app-icon";
import { IconAbort, IconRefresh } from "@/src/lib/icons";
import { useLocale } from "@/src/lib/i18n";

interface ParsingGateDialogProps {
  open: boolean;
  /** 触发任务的种类：用来定制弹窗文案 */
  taskKind: "challenge" | "fact-check" | "investment-report";
  /** 项目名（仅用于文案上下文，可选） */
  projectName?: string;
  onCancel: () => void;
  onContinue: () => void;
}

/**
 * 当项目知识库仍在解析中时，用户发起挑战质询 / 事实交叉验证前的二次确认。
 * 强调「结论置信度可能受影响」，并提供「继续执行」和「等待解析完成」两个出口。
 */
export function ParsingGateDialog({
  open,
  taskKind,
  projectName,
  onCancel,
  onContinue,
}: ParsingGateDialogProps) {
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const { locale, t } = useLocale();
  const taskLabel =
    taskKind === "challenge"
      ? t("message.modeChallenge")
      : taskKind === "investment-report"
        ? t("process.investmentReport")
        : t("report.factValidation");
  const projectLabel = projectName
    ? locale === "en-US"
      ? projectName
      : `「${projectName}」`
    : t("parsingGate.currentProject");

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onCancel();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="wz-confirm-overlay fixed inset-0 z-[var(--wz-z-overlay)] bg-[var(--wz-color-bg-overlay)]" />
        <DialogPrimitive.Content
          className="wz-confirm-content fixed left-1/2 top-1/2 z-[var(--wz-z-dialog)] w-[min(420px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 rounded-[var(--wz-radius-lg)] border border-[var(--wz-color-border-subtle)] bg-[var(--wz-color-bg-elevated)] p-[var(--wz-space-6)] text-[var(--wz-color-text-primary)] shadow-[var(--wz-shadow-lg)] outline-none"
          onOpenAutoFocus={() => {
            if (document.activeElement instanceof HTMLElement) {
              returnFocusRef.current = document.activeElement;
            }
          }}
          onCloseAutoFocus={(event) => {
            if (!returnFocusRef.current?.isConnected) return;
            event.preventDefault();
            returnFocusRef.current.focus();
          }}
        >
          <div className="flex items-start gap-3">
            <div className="flex h-[var(--wz-control-height-md)] w-[var(--wz-control-height-md)] shrink-0 items-center justify-center rounded-[var(--wz-radius-md)] bg-[var(--wz-color-status-running-subtle)] text-[var(--wz-color-status-running)]">
              <AppIcon icon={IconAbort} size={14} />
            </div>
            <div className="min-w-0 flex-1">
              <DialogPrimitive.Title className="text-[length:var(--wz-font-size-lg)] font-semibold leading-[var(--wz-line-height-tight)]">
                {t("parsingGate.title")}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="mt-[var(--wz-space-2)] text-[length:var(--wz-font-size-md)] leading-[var(--wz-line-height-normal)] text-[color:var(--wz-color-text-secondary)]">
                {t("parsingGate.description", {
                  project: projectLabel,
                  task: taskLabel,
                })}
              </DialogPrimitive.Description>
            </div>
          </div>

          <div className="mt-[var(--wz-space-4)] flex items-center gap-2 rounded-[var(--wz-radius-md)] bg-[var(--wz-color-bg-subtle)] px-3 py-2 text-[length:var(--wz-font-size-xs)] text-[color:var(--wz-color-text-secondary)]">
            <AppIcon
              icon={IconRefresh}
              size={12}
              className="animate-spin text-[var(--wz-color-status-running)] motion-reduce:animate-none"
            />
            <span>{t("parsingGate.duration")}</span>
          </div>

          <div className="mt-[var(--wz-space-6)] flex flex-wrap justify-end gap-[var(--wz-space-2)]">
            <DialogPrimitive.Close asChild>
              <Button type="button" variant="outline">
                {t("parsingGate.wait")}
              </Button>
            </DialogPrimitive.Close>
            <Button type="button" variant="default" onClick={onContinue}>
              {t("parsingGate.continue")}
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
