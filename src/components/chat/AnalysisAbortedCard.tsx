import { useEffect, useRef, useState } from "react";

import { PriorityBadge } from "@/src/components/chat/PriorityBadge";
import { Button } from "@/src/components/ui/button";
import { AppIcon } from "@/src/components/ui/app-icon";
import {
  IconAbort,
  IconAttach,
  IconCheckCircle,
  IconRefresh,
  IconUpload,
} from "@/src/lib/icons";
import { cn } from "@/src/lib/utils";
import { useLocale } from "@/src/lib/i18n";
import { translateKnowledgeCategory } from "@/src/lib/content-localization";
import type { AssistantBlock } from "@/src/types";

type AnalysisAbortedBlock = Extract<AssistantBlock, { kind: "analysis-aborted" }>;

interface AnalysisAbortedCardProps {
  block: AnalysisAbortedBlock;
  /** 用户通过卡片快速补传文件时回调；上传逻辑由父组件接管 */
  onQuickUpload: (files: FileList) => void;
}

/**
 * 终止 / 重启 状态机：
 *  - idle     初始态，列出缺失项 + 提示用户补传
 *  - uploading 用户已选择文件，模拟解析中；卡片整体进入「正在重启分析」态
 *  - resolved  补传完成，卡片折叠为成功提示
 */
type Phase = "idle" | "uploading" | "resolved";

/** 上传 → 解析 → 重启分析 的本地动画总时长（毫秒） */
const SIMULATED_RESTART_MS = 2400;

export function AnalysisAbortedCard({
  block,
  onQuickUpload,
}: AnalysisAbortedCardProps) {
  const { locale } = useLocale();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [drag, setDrag] = useState(false);
  /** 用户本次实际上传的文件名，用于在 resolved 态回显 */
  const [acceptedNames, setAcceptedNames] = useState<string[]>([]);
  const resolvedStatusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (phase === "resolved") resolvedStatusRef.current?.focus();
  }, [phase]);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setAcceptedNames(Array.from(files).map((f) => f.name));
    setPhase("uploading");
    // 真正写入项目知识库 + 追加对话消息由父组件处理
    onQuickUpload(files);
    window.setTimeout(() => setPhase("resolved"), SIMULATED_RESTART_MS);
  };

  // —— 已重启分析的成功态：卡片折叠为单行成功提示，避免遮挡新生成的报告 ——
  if (phase === "resolved") {
    return (
      <div
        ref={resolvedStatusRef}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        tabIndex={-1}
        className="rounded-[var(--wz-radius-lg)] border border-[var(--wz-color-border-default)] bg-[var(--wz-color-status-success-subtle)] px-4 py-3 outline-none focus-visible:ring-2 focus-visible:ring-[var(--wz-color-focus-ring)]"
      >
        <div className="flex items-start gap-2.5">
          <AppIcon
            icon={IconCheckCircle}
            size={14}
            className="mt-0.5 shrink-0 text-[var(--wz-color-status-success)]"
          />
          <div className="min-w-0 flex-1">
            <p className="text-[length:var(--wz-font-size-body)] font-semibold text-[var(--wz-color-text-primary)]">
              {locale === "en-US"
                ? "Required materials received · Analysis restarted"
                : "资料已补齐 · Agent 已重启分析"}
            </p>
            <p className="mt-0.5 text-[length:var(--wz-font-size-caption)] leading-relaxed text-[color:var(--wz-color-text-secondary)]">
              {locale === "en-US"
                ? `${acceptedNames.length} new file${acceptedNames.length === 1 ? "" : "s"} added: `
                : `新追加 ${acceptedNames.length} 份资料：`}
              <span className="font-medium">
                {acceptedNames.slice(0, 2).join("、")}
                {acceptedNames.length > 2
                  ? locale === "en-US"
                    ? ` and ${acceptedNames.length - 2} more`
                    : ` 等 ${acceptedNames.length} 份`
                  : ""}
              </span>
              {locale === "en-US"
                ? ". Cross-validation and valuation analysis are available again."
                : "，事实交叉验证 / 估值平行测算等能力已恢复可用。"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[var(--wz-radius-lg)] border border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-surface)] shadow-[var(--wz-shadow-sm)]">
      {/* —— 顶部：醒目终止 banner —— */}
      <div className="flex items-start gap-3 border-b border-[var(--wz-color-border-default)] bg-[var(--wz-color-status-danger-subtle)] px-5 py-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--wz-radius-lg)] bg-[var(--wz-color-status-danger)] text-[var(--wz-color-text-inverse)] shadow-[var(--wz-shadow-sm)]">
          <AppIcon icon={IconAbort} size={15} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--wz-color-status-danger)] px-2 py-0.5 text-[length:var(--wz-font-size-tag)] leading-[var(--wz-line-height-tag)] font-semibold text-[var(--wz-color-text-inverse)]">
              ANALYSIS · ABORTED
            </span>
            {block.parsedSummary && (
              <span className="rounded-full bg-[var(--wz-color-bg-surface)] px-2 py-0.5 text-[length:var(--wz-font-size-tag)] leading-[var(--wz-line-height-tag)] font-medium text-[var(--wz-color-status-danger)]">
                {locale === "en-US" ? "Parsed" : "已解析"} {block.parsedSummary.parsed} / {block.parsedSummary.total}
              </span>
            )}
          </div>
          <h3 className="mt-1.5 text-[length:var(--wz-font-size-body)] font-semibold leading-snug text-[var(--wz-color-text-primary)]">
            {block.title}
          </h3>
          <p className="mt-1 text-[length:var(--wz-font-size-body)] leading-relaxed text-[color:var(--wz-color-text-secondary)]">
            {block.reason}
          </p>
        </div>
      </div>

      {/* —— 缺失关键信息点列表 —— */}
      <div className="px-5 py-4">
        <div className="mb-2 flex items-center gap-1.5 text-[length:var(--wz-font-size-caption)] font-semibold text-[color:var(--wz-color-text-tertiary)]">
          <AppIcon icon={IconAbort} size={10} className="text-[var(--wz-color-status-danger)]" />
          {locale === "en-US"
            ? `Missing critical information · ${block.missingItems.length} items`
            : `缺失关键信息 · ${block.missingItems.length} 项`}
        </div>
        <ul className="space-y-1.5">
          {block.missingItems.map((item) => (
            <li
              key={item.key}
              className="flex items-start gap-2.5 rounded-[var(--wz-radius-lg)] border border-[var(--wz-color-border-subtle)] bg-[var(--wz-color-bg-subtle)] px-3 py-2"
            >
              <PriorityBadge level={item.severity} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-[length:var(--wz-font-size-body)] font-medium text-[var(--wz-color-text-primary)]">
                  {item.label}
                  <span className="ml-1.5 text-[length:var(--wz-font-size-caption)] font-normal text-[color:var(--wz-color-text-tertiary)]">
                    · {translateKnowledgeCategory(item.requirement, locale)}
                  </span>
                </p>
                {item.hint && (
                  <p className="mt-0.5 text-[length:var(--wz-font-size-caption)] leading-relaxed text-[color:var(--wz-color-text-secondary)]">
                    {item.hint}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>

        {/* —— 处置建议（可选） —— */}
        {block.nextSteps && block.nextSteps.length > 0 && (
          <div className="mt-3 rounded-[var(--wz-radius-lg)] bg-[var(--wz-color-status-warning-subtle)] px-3 py-2.5">
            <p className="mb-1 text-[length:var(--wz-font-size-caption)] font-semibold text-[var(--wz-color-status-warning)]">
              {locale === "en-US" ? "Recommended Actions" : "处置建议"}
            </p>
            <ul className="space-y-0.5 text-[length:var(--wz-font-size-caption)] leading-relaxed text-[var(--wz-color-text-primary)]">
              {block.nextSteps.map((s, i) => (
                <li key={i} className="flex gap-1.5">
                  <span className="shrink-0 text-[var(--wz-color-status-warning)]">·</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* —— 底部：快速上传 dropzone —— */}
      <div className="border-t border-[var(--wz-color-border-subtle)] bg-[var(--wz-color-bg-subtle)] px-5 py-4">
        <div
          onDragOver={(e) => {
            if (phase !== "idle") return;
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            if (phase !== "idle") return;
            e.preventDefault();
            setDrag(false);
            handleFiles(e.dataTransfer.files);
          }}
          aria-busy={phase === "uploading"}
          className={cn(
            "flex flex-col items-stretch justify-between gap-3 rounded-[var(--wz-radius-lg)] border border-dashed px-4 py-3 transition-[background-color,border-color] [transition-duration:var(--wz-duration-fast)] [transition-timing-function:var(--wz-ease-standard)] sm:flex-row sm:items-center",
            phase === "uploading"
              ? "border-[var(--wz-color-status-running)] bg-[var(--wz-color-status-running-subtle)]"
              : drag
                ? "border-[var(--wz-color-border-strong)] bg-[var(--wz-color-bg-surface)]"
                : "border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-surface)] hover:border-[var(--wz-color-border-strong)]"
          )}
        >
          <div className="flex min-w-0 items-center gap-3">
            <div
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--wz-radius-lg)] shadow-[var(--wz-shadow-sm)]",
                phase === "uploading"
                  ? "bg-[var(--wz-color-status-running-subtle)] text-[var(--wz-color-status-running)]"
                  : "bg-[var(--wz-color-action-primary)] text-[var(--wz-color-text-inverse)]"
              )}
            >
              <AppIcon
                icon={phase === "uploading" ? IconRefresh : IconUpload}
                size={14}
                className={phase === "uploading" ? "animate-spin motion-reduce:animate-none" : ""}
              />
            </div>
            <div className="min-w-0">
              <p className="text-[length:var(--wz-font-size-body)] font-semibold text-[var(--wz-color-text-primary)]" aria-live="polite">
                {phase === "uploading"
                  ? locale === "en-US" ? "Uploading files and restarting analysis…" : "正在补传并重启解析…"
                  : locale === "en-US" ? "Upload missing materials" : "快速补传缺失资料"}
              </p>
              <p className="mt-0.5 text-[length:var(--wz-font-size-caption)] leading-relaxed text-[color:var(--wz-color-text-secondary)]">
                {phase === "uploading"
                  ? locale === "en-US"
                    ? `${acceptedNames.length} file${acceptedNames.length === 1 ? "" : "s"} received. Analysis will resume in 2–3 seconds.`
                    : `已接收 ${acceptedNames.length} 份文件，Agent 将在 2–3 秒后恢复分析。`
                  : locale === "en-US"
                    ? "Drag files here or browse (PDF / Word / PPT / Excel)"
                    : "支持拖拽到此处或点击右侧浏览（PDF / Word / PPT / Excel）"}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:justify-end">
            <Button
              variant="outline"
              size="sm"
              disabled={phase !== "idle"}
              onClick={() => fileInputRef.current?.click()}
              className="w-full sm:w-auto"
            >
              <AppIcon icon={IconAttach} size={11} />
              {locale === "en-US" ? "Upload files" : "上传文件"}
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv"
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
      </div>
    </div>
  );
}
