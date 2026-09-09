import { lazy, Suspense, useEffect, useId, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import { Button } from "@/src/components/ui/button";
import { QuestionContextCard } from "@/src/components/chat/QuestionContextCard";
import { AnalysisAbortedCard } from "@/src/components/chat/AnalysisAbortedCard";
import { ClarificationCard } from "@/src/components/chat/ClarificationCard";
import { ModePickCard } from "@/src/components/chat/ModePickCard";
import { ReportProcessCard } from "@/src/components/chat/ReportProcessCard";
import { ReportSummaryCard } from "@/src/components/chat/ReportSummaryCard";
import {
  hasValidationFollowUpTasks,
  ValidationFollowUpTaskList,
} from "@/src/components/chat/ValidationFollowUpTaskList";
import { Logo } from "@/src/components/logo";
import { AppIcon } from "@/src/components/ui/app-icon";
import {
  IconAuto,
  IconChallenge,
  IconChevronDown,
  IconChevronUp,
  IconDownload,
  IconExternalLink,
  IconFactCheck,
  IconFile,
  IconFileCheck,
  IconFileSpreadsheet,
  IconFileText,
  IconRefresh,
  IconThumbDown,
  IconThumbUp,
  IconUser,
} from "@/src/lib/icons";
import type { FileKind } from "@/src/types";
import { isReportBlock } from "@/src/lib/project-reports";
import { isYaojuDemoKind } from "@/src/data/yaoju-validation-demo";
import { cn } from "@/src/lib/utils";
import { useLocale } from "@/src/lib/i18n";
import type {
  AssistantBlock,
  ChatMessage,
  RunningTask,
  SourceAnchor,
  ValidationFollowUpTask,
  ValidationFollowUpTaskInput,
  ValidationDemoDetail,
  WorkMode,
} from "@/src/types";

// The six-stage validation canvas is intentionally loaded on demand. It is a
// rich demo surface and should not inflate the first workspace render for
// projects that only contain ordinary chat and report cards.
const CrossValidationDemoCard = lazy(() =>
  import("@/src/components/chat/CrossValidationDemoCard").then((module) => ({
    default: module.CrossValidationDemoCard,
  }))
);

function ValidationDemoFallback() {
  const { locale } = useLocale();
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-20 items-center gap-2 rounded-[var(--wz-radius-lg)] border border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-surface)] px-4 text-[length:var(--wz-font-size-body)] text-[color:var(--wz-color-text-secondary)]"
    >
      <AppIcon
        icon={IconRefresh}
        size={12}
        className="shrink-0 animate-spin text-[var(--wz-color-status-running)] motion-reduce:animate-none"
        aria-hidden="true"
      />
      {locale === "en-US" ? "Loading validation flow…" : "正在加载验证流程…"}
    </div>
  );
}

interface MessageListProps {
  messages: ChatMessage[];
  generating: boolean;
  /** 当前对话内正在执行的长任务；报告类任务会在对话流中实时展示六阶段过程。 */
  runningTasks?: RunningTask[];
  /** 当前对话中已领取或已关闭的交叉验证跟进任务。 */
  validationFollowUpTasks?: ValidationFollowUpTask[];
  onAddValidationFollowUpTask?: (task: ValidationFollowUpTaskInput) => void;
  onCloseValidationFollowUpTask?: (taskId: string) => void;
  onViewSource: (anchor: SourceAnchor) => void;
  onClarificationSubmit: (
    msgId: string,
    values: Record<string, string>,
    followUp?: AssistantBlock[]
  ) => void;
  onExport: (block: AssistantBlock) => void;
  /** 点击报告汇总卡片，在右侧 Canvas 抽屉中展开完整报告 */
  onOpenReport: (block: AssistantBlock) => void;
  /** 智能路由分歧时，用户选择具体模式继续执行 */
  onModePick: (
    msgId: string,
    mode: Extract<WorkMode, "fact-check" | "challenge" | "investment-report">,
    originalQuery: string,
    attachments?: Extract<AssistantBlock, { kind: "mode-pick" }>["attachments"]
  ) => void;
  /** 当前项目知识库为空时的提示 */
  hasKnowledge?: boolean;
  /** 由长任务刚刚注入到对话流的 assistant 消息 id 集合：报告卡片会按报告类型播放一次入场高亮 */
  newReportMessageIds?: Set<string>;
  /** 入场高亮完成的回调；MessageList 会把 id 上抛，确保动画只播放一次 */
  onReportAnimated?: (msgId: string) => void;
  /** 用户在 analysis-aborted 卡片里通过快速上传补传文件时触发，由父级写入项目知识库并追加重启分析消息 */
  onQuickUpload?: (msgId: string, files: FileList) => void;
  /** 打开曜矩智造演示的证据工作台；运行态会附带任务以同步实时进度。 */
  onOpenValidationDetail?: (
    detail: ValidationDemoDetail,
    task?: RunningTask,
    block?: Extract<AssistantBlock, { kind: "validation-demo" }>
  ) => void;
  /** 动态任务进入主张地图阶段后自动展开详情，阶段结束时关闭。 */
  onAutoCloseValidationDetail?: (taskId?: string) => void;
}

const modeIconMap: Record<WorkMode, typeof IconAuto> = {
  auto: IconAuto,
  "fact-check": IconFactCheck,
  challenge: IconChallenge,
  "investment-report": IconFileCheck,
};

const fileKindIconMap: Record<FileKind, typeof IconFile> = {
  pdf: IconFileText,
  word: IconFileText,
  ppt: IconFileText,
  excel: IconFileSpreadsheet,
  other: IconFile,
};

/**
 * 把 assistant 文本中的 http(s) 链接自动渲染成可点击的蓝色超链接。
 * 兼容中文/全角空白前后的 URL；不修改其余文字。
 */
const URL_REGEX = /https?:\/\/[^\s\u3000\u4e00-\u9fa5]+[^\s\u3000\u4e00-\u9fa5\p{P}]/gu;

function AutoLinkText({ text }: { text: string }) {
  const parts: Array<{ type: "text" | "link"; value: string }> = [];
  let lastIndex = 0;
  for (const match of text.matchAll(URL_REGEX)) {
    const start = match.index ?? 0;
    if (start > lastIndex) parts.push({ type: "text", value: text.slice(lastIndex, start) });
    parts.push({ type: "link", value: match[0] });
    lastIndex = start + match[0].length;
  }
  if (lastIndex < text.length) parts.push({ type: "text", value: text.slice(lastIndex) });
  if (parts.length === 0) return <>{text}</>;
  return (
    <>
      {parts.map((p, i) =>
        p.type === "link" ? (
          <a
            key={i}
            href={p.value}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all text-[var(--wz-color-text-link)] underline decoration-current/40 underline-offset-2 transition-colors [transition-duration:var(--wz-duration-fast)] [transition-timing-function:var(--wz-ease-standard)] hover:text-[var(--wz-color-action-accent-hover)] focus-visible:rounded-[var(--wz-radius-sm)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--wz-color-focus-ring)]"
          >
            {p.value}
            <AppIcon icon={IconExternalLink} size={11} className="ml-0.5 inline-block align-[-2px]" />
          </a>
        ) : (
          <span key={i}>{p.value}</span>
        )
      )}
    </>
  );
}

function TypewriterText({
  text,
  enabled,
  onComplete,
}: {
  text: string;
  enabled: boolean;
  onComplete?: () => void;
}) {
  const characters = useMemo(() => Array.from(text), [text]);
  const [reduceMotion, setReduceMotion] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false
  );
  const [visibleCount, setVisibleCount] = useState(() =>
    enabled && !reduceMotion ? 0 : characters.length
  );
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = (event: MediaQueryListEvent) => {
      setReduceMotion(event.matches);
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    let frameId: number | undefined;
    let completionFrameId: number | undefined;
    let completed = false;

    const complete = () => {
      if (completed) return;
      completed = true;
      onCompleteRef.current?.();
    };

    if (!enabled || reduceMotion || characters.length === 0) {
      setVisibleCount(characters.length);
      completionFrameId = window.requestAnimationFrame(complete);
      return () => {
        if (completionFrameId !== undefined) {
          window.cancelAnimationFrame(completionFrameId);
        }
      };
    }

    setVisibleCount(0);
    const durationMs = Math.min(2600, Math.max(900, characters.length * 22));
    const startedAt = window.performance.now();

    const typeNext = (now: number) => {
      const elapsed = now - startedAt;
      const nextCount = Math.min(
        characters.length,
        Math.max(1, Math.floor((elapsed / durationMs) * characters.length))
      );
      setVisibleCount(nextCount);

      if (nextCount < characters.length) {
        frameId = window.requestAnimationFrame(typeNext);
        return;
      }

      completionFrameId = window.requestAnimationFrame(complete);
    };

    frameId = window.requestAnimationFrame(typeNext);
    return () => {
      if (frameId !== undefined) window.cancelAnimationFrame(frameId);
      if (completionFrameId !== undefined) {
        window.cancelAnimationFrame(completionFrameId);
      }
    };
  }, [characters, enabled, reduceMotion]);

  const visibleText = characters.slice(0, visibleCount).join("");
  const isTyping = enabled && !reduceMotion && visibleCount < characters.length;

  if (!isTyping) return <AutoLinkText text={visibleText} />;

  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        <AutoLinkText text={visibleText} />
        <span className="message-typewriter-caret" />
      </span>
    </>
  );
}

/** 用户消息下方的附件标签条：单个直接展示；超过 3 个时收起 + 「+N」展开 */
function UserAttachmentTags({
  attachments,
}: {
  attachments: NonNullable<ChatMessage["attachments"]>;
}) {
  const { t } = useLocale();
  const [expanded, setExpanded] = useState(false);
  const attachmentListId = useId();
  const overflow = attachments.length > 3;
  const visible = !overflow || expanded ? attachments : attachments.slice(0, 3);
  const hiddenCount = overflow && !expanded ? attachments.length - 3 : 0;

  return (
    <div className="flex max-w-full flex-wrap justify-end gap-1.5">
      <div id={attachmentListId} className="contents">
        {visible.map((a, i) => {
          const Icon = fileKindIconMap[a.kind] ?? IconFile;
          return (
            <div
              key={`${a.name}-${i}`}
              className="inline-flex max-w-[220px] items-center gap-1.5 rounded-[var(--wz-radius-lg)] border border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-surface)] px-2 py-1 text-[length:var(--wz-font-size-tag)] leading-[var(--wz-line-height-tag)] shadow-[var(--wz-shadow-sm)]"
              title={`${a.name} · ${a.size}`}
            >
              <AppIcon
                icon={Icon}
                size={12}
                className="shrink-0 text-[color:var(--wz-color-text-tertiary)]"
              />
              <span className="truncate font-medium text-[color:var(--wz-color-text-secondary)]">
                {a.name}
              </span>
            </div>
          );
        })}
      </div>
      {overflow && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex shrink-0 items-center gap-1 rounded-[var(--wz-radius-lg)] border border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-surface)] px-2 py-1 text-[length:var(--wz-font-size-tag)] leading-[var(--wz-line-height-tag)] font-medium text-[color:var(--wz-color-text-secondary)] shadow-[var(--wz-shadow-sm)] transition-[border-color,color,box-shadow] [transition-duration:var(--wz-duration-fast)] [transition-timing-function:var(--wz-ease-standard)] hover:border-[var(--wz-color-border-strong)] hover:text-[var(--wz-color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--wz-color-focus-ring)]"
          aria-label={
            expanded
              ? t("message.collapseAttachments")
              : t("message.expandAttachments", { count: hiddenCount })
          }
          aria-expanded={expanded}
          aria-controls={attachmentListId}
        >
          {expanded ? (
            <>
              {t("common.collapse")} <AppIcon icon={IconChevronUp} size={10} />
            </>
          ) : (
            <>
              +{hiddenCount} <AppIcon icon={IconChevronDown} size={10} />
            </>
          )}
        </button>
      )}
    </div>
  );
}

function DeferredReportReveal({
  children,
  visible,
  onReveal,
}: {
  children: ReactNode;
  visible: boolean;
  onReveal?: () => void;
}) {
  const onRevealRef = useRef(onReveal);

  useEffect(() => {
    onRevealRef.current = onReveal;
  }, [onReveal]);

  useEffect(() => {
    if (!visible) return;
    const frameId = window.requestAnimationFrame(() => onRevealRef.current?.());
    return () => window.cancelAnimationFrame(frameId);
  }, [visible]);

  if (!visible) return null;

  return <div className="animate-staged-reveal space-y-3">{children}</div>;
}

function MessageActions({
  reportBlock,
  onExport,
}: {
  reportBlock?: AssistantBlock;
  onExport: (block: AssistantBlock) => void;
}) {
  const { t } = useLocale();
  const [feedback, setFeedback] = useState<"helpful" | "inaccurate" | null>(null);

  const chooseFeedback = (next: "helpful" | "inaccurate") => {
    setFeedback((current) => (current === next ? null : next));
  };

  return (
    <div className="flex items-center gap-1 pl-1">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t("message.helpful")}
        aria-pressed={feedback === "helpful"}
        title={t("message.helpful")}
        onClick={() => chooseFeedback("helpful")}
      >
        <AppIcon
          icon={IconThumbUp}
          size={13}
          className={cn(
            feedback === "helpful"
              ? "text-[var(--wz-color-status-success)]"
              : "text-[color:var(--wz-color-text-tertiary)]"
          )}
        />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t("message.inaccurate")}
        aria-pressed={feedback === "inaccurate"}
        title={t("message.inaccurate")}
        onClick={() => chooseFeedback("inaccurate")}
      >
        <AppIcon
          icon={IconThumbDown}
          size={13}
          className={cn(
            feedback === "inaccurate"
              ? "text-[var(--wz-color-status-danger)]"
              : "text-[color:var(--wz-color-text-tertiary)]"
          )}
        />
      </Button>
      {reportBlock && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 text-[length:var(--wz-font-size-caption)] text-[color:var(--wz-color-text-tertiary)] hover:text-[var(--wz-color-text-primary)]"
          onClick={() => onExport(reportBlock)}
        >
          <AppIcon icon={IconDownload} size={11} />
          {t("message.exportHtml")}
        </Button>
      )}
    </div>
  );
}

export function MessageList({
  messages,
  generating,
  runningTasks = [],
  validationFollowUpTasks = [],
  onAddValidationFollowUpTask,
  onCloseValidationFollowUpTask,
  onViewSource,
  onClarificationSubmit,
  onExport,
  onOpenReport,
  onModePick,
  hasKnowledge = true,
  newReportMessageIds,
  onReportAnimated,
  onQuickUpload,
  onOpenValidationDetail,
  onAutoCloseValidationDetail,
}: MessageListProps) {
  const { locale, t } = useLocale();
  const modeLabel: Record<WorkMode, string> = {
    auto: t("message.modeAuto"),
    "fact-check": t("message.modeFact"),
    challenge: t("message.modeChallenge"),
    "investment-report": t("message.modeInvestment"),
  };
  const scrollRef = useRef<HTMLDivElement>(null);
  const followProgressRef = useRef(true);
  const previousMessageCountRef = useRef(messages.length);
  const [typedCompletionMessageIds, setTypedCompletionMessageIds] = useState<Set<string>>(
    () => new Set()
  );
  const claimedFollowUpTaskIdsBySourceKey = useMemo(
    () =>
      new Map(
        validationFollowUpTasks
          .filter((task) => task.status === "open")
          .map((task) => [task.sourceKey, task.id] as const)
      ),
    [validationFollowUpTasks]
  );
  const runningProgressKey = runningTasks
    .map((task) => `${task.id}:${Math.round(task.progress)}`)
    .join("|");
  const autoClaimMapTaskId = runningTasks.find(
    (task) => task.demoKind === "yaoju-investment-analysis"
  )?.id;

  const scrollBehavior = () =>
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth";

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const latestMessage = messages[messages.length - 1];
    const messageAdded = messages.length > previousMessageCountRef.current;
    const userJustSent = messageAdded && latestMessage?.role === "user";
    if (followProgressRef.current || userJustSent) {
      el.scrollTo({ top: el.scrollHeight, behavior: scrollBehavior() });
    }
    previousMessageCountRef.current = messages.length;
  }, [messages, generating, runningTasks.length]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !followProgressRef.current) return;
    el.scrollTo({ top: el.scrollHeight, behavior: scrollBehavior() });
  }, [runningProgressKey]);

  return (
    <div
      ref={scrollRef}
      onScroll={(event) => {
        const el = event.currentTarget;
        followProgressRef.current =
          el.scrollHeight - el.scrollTop - el.clientHeight < 120;
      }}
      className="scrollbar-hidden min-h-0 w-full min-w-0 max-w-full flex-1 overflow-x-hidden overflow-y-auto px-3 py-4 sm:px-5 sm:py-6"
    >
      <div className="mx-auto w-full min-w-0 max-w-4xl space-y-6">
        {!hasKnowledge && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-[var(--wz-radius-lg)] bg-[var(--wz-color-bg-subtle)] text-[color:var(--wz-color-text-tertiary)]">
              <Logo withText={false} />
            </div>
            <h2 className="mt-3 text-[length:var(--wz-font-size-body)] font-semibold text-[var(--wz-color-text-primary)]">
              {t("message.emptyKnowledge")}
            </h2>
            <p className="mt-1.5 max-w-md text-[length:var(--wz-font-size-body)] leading-relaxed text-[color:var(--wz-color-text-tertiary)]">
              {t("message.emptyKnowledgeHint")}
            </p>
          </div>
        )}
        {messages.map((msg) => {
          if (msg.role === "user") {
            const ModeIcon = msg.mode ? modeIconMap[msg.mode] : null;
            return (
              <div key={msg.id} className="flex justify-end">
                <div className="flex max-w-[78%] items-start gap-3">
                  <div className="flex flex-col items-end gap-1.5">
                    {msg.mode && (
                      <div className="inline-flex items-center gap-1 rounded-[var(--wz-radius-md)] bg-[var(--wz-color-bg-subtle)] px-1.5 py-0.5 text-[length:var(--wz-font-size-tag)] leading-[var(--wz-line-height-tag)] font-medium text-[color:var(--wz-color-text-secondary)]">
                        {ModeIcon && <AppIcon icon={ModeIcon} size={10} />}
                        {modeLabel[msg.mode]}
                      </div>
                    )}
                    {msg.questionContext && <QuestionContextCard context={msg.questionContext} onViewSource={onViewSource} />}
                    {msg.text && (
                      <div className="rounded-[var(--wz-radius-lg)] bg-[var(--wz-color-action-primary)] px-4 py-2.5 text-sm text-[var(--wz-color-text-inverse)] shadow-[var(--wz-shadow-sm)]">
                        {msg.text}
                      </div>
                    )}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <UserAttachmentTags attachments={msg.attachments} />
                    )}
                  </div>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--wz-color-bg-subtle)] text-[color:var(--wz-color-text-tertiary)]">
                    <AppIcon icon={IconUser} size={14} />
                  </div>
                </div>
              </div>
            );
          }

          const reportBlock = msg.blocks?.find((b) => isReportBlock(b));
          const hasReportBlock = Boolean(reportBlock);
          const isNewReport = newReportMessageIds?.has(msg.id) ?? false;
          const shouldDeferValidationReport =
            isNewReport &&
            Boolean(
              msg.blocks?.some(
                (block, index) =>
                  isReportBlock(block) &&
                  index >= 2 &&
                  msg.blocks?.[index - 1]?.kind === "text" &&
                  msg.blocks?.[index - 2]?.kind === "validation-demo"
              )
            );

          return (
            <div key={msg.id} className="flex w-full min-w-0 max-w-full items-start gap-3">
              <div className="shrink-0">
                <Logo withText={false} variant="conversation" />
              </div>
              <div className="min-w-0 flex-1 space-y-3">
                {msg.blocks?.map((block, i) => {
                  const followsValidationDemo =
                    i > 0 && msg.blocks?.[i - 1]?.kind === "validation-demo";
                  const nextBlock = msg.blocks?.[i + 1];
                  const precedesReport = Boolean(nextBlock && isReportBlock(nextBlock));
                  switch (block.kind) {
                    case "text":
                      if (followsValidationDemo) {
                        return (
                          <div
                            key={i}
                            className="whitespace-pre-wrap px-1 pt-6 text-sm leading-relaxed text-[var(--wz-color-text-primary)]"
                          >
                            <TypewriterText
                              text={block.text}
                              enabled={isNewReport && precedesReport}
                              onComplete={() => {
                                if (!isNewReport || !precedesReport) return;
                                setTypedCompletionMessageIds((current) => {
                                  if (current.has(msg.id)) return current;
                                  const next = new Set(current);
                                  next.add(msg.id);
                                  return next;
                                });
                              }}
                            />
                          </div>
                        );
                      }
                      return (
                        <div
                          key={i}
                          className="whitespace-pre-wrap px-1 text-sm leading-relaxed text-[var(--wz-color-text-primary)]"
                        >
                          <AutoLinkText text={block.text} />
                        </div>
                      );
                    case "clarification":
                      return (
                        <ClarificationCard
                          key={i}
                          title={block.title}
                          reason={block.reason}
                          fields={block.fields}
                          onSubmit={(v) =>
                            onClarificationSubmit(msg.id, v, block.followUp)
                          }
                        />
                      );
                    case "mode-pick":
                      return (
                        <ModePickCard
                          key={i}
                          title={block.title}
                          reason={block.reason}
                          options={block.options}
                          onPick={(mode) =>
                            onModePick(msg.id, mode, block.originalQuery, block.attachments)
                          }
                        />
                      );
                    case "analysis-aborted":
                      return (
                        <AnalysisAbortedCard
                          key={i}
                          block={block}
                          onQuickUpload={(files) =>
                            onQuickUpload?.(msg.id, files)
                          }
                        />
                      );
                    case "report-process":
                      return <ReportProcessCard key={i} block={block} />;
                    case "validation-demo":
                      return (
                        <Suspense key={i} fallback={<ValidationDemoFallback />}>
                          <CrossValidationDemoCard
                            block={block}
                            onOpenDetail={(detail) =>
                              onOpenValidationDetail?.(detail, undefined, block)
                            }
                          />
                        </Suspense>
                      );
                    case "fact-verification":
                    case "challenge-list":
                    case "valuation":
                    case "enterprise-analysis":
                    case "question-report":
                    case "project-work-report":
                    case "diligence-report": {
                      const followsValidationCompletion =
                        i >= 2 &&
                        msg.blocks?.[i - 1]?.kind === "text" &&
                        msg.blocks?.[i - 2]?.kind === "validation-demo";
                      const hasFollowUpContent =
                        block.kind === "fact-verification" &&
                        Boolean(onAddValidationFollowUpTask) &&
                        Boolean(onCloseValidationFollowUpTask) &&
                        hasValidationFollowUpTasks(block.compares);
                      const reportCard = (
                        <ReportSummaryCard
                          block={block}
                          onOpen={() => onOpenReport(block)}
                          surface="conversation"
                          isNew={isNewReport}
                          onAnimated={() => onReportAnimated?.(msg.id)}
                          followUpContent={
                            block.kind === "fact-verification" &&
                            hasFollowUpContent &&
                            onAddValidationFollowUpTask &&
                            onCloseValidationFollowUpTask ? (
                              <ValidationFollowUpTaskList
                                compares={block.compares}
                                sourceMessageId={msg.id}
                                sourceBlockIndex={i}
                                claimedTaskIdsBySourceKey={claimedFollowUpTaskIdsBySourceKey}
                                onAddTask={onAddValidationFollowUpTask}
                                onRemoveTask={onCloseValidationFollowUpTask}
                              />
                            ) : undefined
                          }
                        />
                      );
                      if (isNewReport && followsValidationCompletion) {
                        return (
                          <DeferredReportReveal
                            key={i}
                            visible={typedCompletionMessageIds.has(msg.id)}
                            onReveal={() => {
                              const el = scrollRef.current;
                              if (el && followProgressRef.current) {
                                el.scrollTo({
                                  top: el.scrollHeight,
                                  behavior: scrollBehavior(),
                                });
                              }
                            }}
                          >
                            {reportCard}
                            <MessageActions
                              reportBlock={block}
                              onExport={onExport}
                            />
                          </DeferredReportReveal>
                        );
                      }

                      return (
                        <div key={i}>{reportCard}</div>
                      );
                    }
                    default:
                      return null;
                  }
                })}

                {!shouldDeferValidationReport && (
                  <MessageActions
                    reportBlock={reportBlock}
                    onExport={onExport}
                  />
                )}
              </div>
            </div>
          );
        })}

        {runningTasks
          .filter((task) => task.process || task.demoKind)
          .map((task) => (
            <div
              key={task.id}
              className="animate-task-expand-from-sidebar flex w-full min-w-0 max-w-full items-start gap-3"
            >
              <div className="shrink-0">
                <Logo withText={false} variant="conversation" />
              </div>
              <div className="min-w-0 flex-1">
                {isYaojuDemoKind(task.demoKind) ? (
                  <Suspense fallback={<ValidationDemoFallback />}>
                    <CrossValidationDemoCard
                      block={{
                        kind: "validation-demo",
                        progress: task.progress,
                        status: "running",
                        mode:
                          task.demoKind === "yaoju-cross-validation"
                            ? "cross-validation"
                            : "investment-analysis",
                        agentIds: task.demoAgentIds,
                        reworkAgentId: task.demoReworkAgentId,
                      }}
                      onOpenDetail={(detail) =>
                        onOpenValidationDetail?.(detail, task)
                      }
                      onAutoCloseDetail={onAutoCloseValidationDetail}
                      taskId={task.id}
                      autoOpenClaimMap={task.id === autoClaimMapTaskId}
                    />
                  </Suspense>
                ) : (
                  <ReportProcessCard
                    block={{
                      kind: "report-process",
                      process: task.process!,
                      progress: task.progress,
                      status: "running",
                    }}
                  />
                )}
              </div>
            </div>
          ))}

        {generating && (
          <div className="flex items-start gap-3">
            <Logo withText={false} variant="conversation" />
            <AppIcon
              icon={IconRefresh}
              size={13}
              className="mt-1.5 shrink-0 animate-spin text-[var(--wz-color-status-running)] motion-reduce:animate-none"
              aria-hidden="true"
            />
            <span className="thinking-shimmer-text px-1 text-sm font-medium leading-relaxed">
              {locale === "en-US" ? "Investor AI is analyzing…" : "投资官AI正在解析中…"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
