import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { Button } from "@/src/components/ui/button";
import { AppIcon } from "@/src/components/ui/app-icon";
import { UploadValidationNotice } from "@/src/components/ui/upload-validation-notice";
import { QuestionContextCard } from "@/src/components/chat/QuestionContextCard";
import {
  IconArrowUp,
  IconAttach,
  IconCheck,
  IconClose,
  IconDelete,
  IconRename,
  IconStop,
} from "@/src/lib/icons";
import { cn } from "@/src/lib/utils";
import { useLocale } from "@/src/lib/i18n";
import {
  inferUploadFileKind,
  UPLOAD_FILE_ACCEPT,
  uploadRejectionMessages,
  validateUploadFiles,
  type UploadRejection,
} from "@/src/lib/file-upload";
import type { AuthRole, FileKind, ProjectLifecycleStage, QuestionContext, QueuedChatPrompt, SourceAnchor } from "@/src/types";

type ComposerAttachment = { name: string; size: string; kind: FileKind };

function getAttachmentKey(attachment: ComposerAttachment) {
  return `${attachment.kind}:${attachment.name}:${attachment.size}`;
}

interface ChatComposerProps {
  onSend: (text: string, attachments: ComposerAttachment[]) => void | boolean;
  generating: boolean;
  onStop: () => void;
  queuedPrompts?: QueuedChatPrompt[];
  onEditQueuedPrompt?: (id: string, text: string) => void;
  onDeleteQueuedPrompt?: (id: string) => void;
  animatedPlaceholders?: readonly string[];
  /** 项目主页将附件与输入区作为同一块视觉区域，不显示中间分隔线。 */
  showAttachmentDivider?: boolean;
  /** 从项目知识库引用的资料，会被转成输入框附件 chip。 */
  referenceAttachment?: ComposerAttachment | null;
  /** 引用资料被输入框消费后清空上游请求，避免重复追加。 */
  onReferenceAttachmentConsumed?: () => void;
  /** 输入框附件变化时通知上层，用于同步引用按钮状态。 */
  onAttachmentsChange?: (attachments: ComposerAttachment[]) => void;
  /** 当前登录身份决定可用的任务入口。 */
  userRole?: AuthRole;
  projectStage?: ProjectLifecycleStage;
  decisionStage?: boolean;
  /** Project-context questions are drafts until the user sends them. */
  draftRequest?: { id: string; text: string } | null;
  onDraftConsumed?: () => void;
  /** Restored on mount; key the composer by conversation when switching. */
  initialDraft?: string;
  initialAttachments?: ComposerAttachment[];
  allowProjectMaterials?: boolean;
  allowQueueWhileGenerating?: boolean;
  /** Accepted deferred sends clear the composer; cancelled confirmation keeps it intact. */
  resetKey?: string;
  /** Persist unsent input in its conversation, including an empty value after send. */
  onDraftTextChange?: (text: string) => void;
  draftStorageKey?: string;
  /** The reading-first committee assistant does not need mode shortcuts. */
  compact?: boolean;
  /** Project-level actions share the mode shortcut row instead of a separate toolbar. */
  toolbarActions?: ReactNode;
  questionContext?: QuestionContext;
  onRemoveQuestionContext?: () => void;
  onViewSource?: (source: SourceAnchor) => void;
  className?: string;
}

const PLACEHOLDER_CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeToReducedMotion(onChange: () => void) {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return () => undefined;
  }
  const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);
  mediaQuery.addEventListener("change", onChange);
  return () => mediaQuery.removeEventListener("change", onChange);
}

function getReducedMotionPreference() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia(REDUCED_MOTION_QUERY).matches
  );
}

function useAnimatedPlaceholder(placeholders: readonly string[], paused: boolean) {
  const promptSequence = useMemo(
    () => placeholders.filter((placeholder) => placeholder.length > 0),
    [placeholders]
  );
  const [promptIndex, setPromptIndex] = useState(0);
  const [animatedText, setAnimatedText] = useState(promptSequence[0] ?? "");
  const prefersReducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionPreference,
    () => true
  );
  const characterSet = useMemo(() => Array.from(PLACEHOLDER_CHARACTERS), []);
  const currentPrompt = promptSequence.length
    ? (promptSequence[promptIndex % promptSequence.length] ?? "")
    : "";

  useEffect(() => {
    if (!currentPrompt) {
      setAnimatedText("");
      return undefined;
    }

    if (prefersReducedMotion || paused) {
      setAnimatedText(currentPrompt);
      return undefined;
    }

    const targetCharacters = Array.from(currentPrompt);
    let frame = 0;
    let holdTimer: number | undefined;
    const frameTimer = window.setInterval(() => {
      const revealedCharacters = Math.floor((frame += 1) / 1.6);
      setAnimatedText(
        targetCharacters
          .map((character, index) =>
            index < revealedCharacters || character === " "
              ? character
              : characterSet[Math.floor(Math.random() * characterSet.length)]
          )
          .join("")
      );

      if (revealedCharacters >= targetCharacters.length) {
        window.clearInterval(frameTimer);
        holdTimer = window.setTimeout(() => {
          setPromptIndex((currentIndex) =>
            (currentIndex + 1) % promptSequence.length
          );
        }, 2400);
      }
    }, 28);

    return () => {
      window.clearInterval(frameTimer);
      if (holdTimer !== undefined) window.clearTimeout(holdTimer);
    };
  }, [characterSet, currentPrompt, paused, prefersReducedMotion, promptSequence.length]);

  return animatedText;
}

/** 输入框可识别的快捷指令。完整命中时在输入框内以蓝色高亮显示。 */
const COMMANDS = [
  "@生成报告",
  "@交叉验证",
  "@投资分析",
  "@投资报告",
  "@cross-validation",
  "@investment-analysis",
  "@investment-report",
] as const;

/** split 用（带捕获组，保留分隔符） */
const COMMAND_SPLIT_REGEX = /(@交叉验证|@生成报告|@投资分析|@投资报告|@cross-validation|@investment-analysis|@investment-report)/g;

/** test 用（非全局，避免 lastIndex 状态问题） */
const COMMAND_TEST_REGEX = /@交叉验证|@生成报告|@投资分析|@投资报告|@cross-validation|@investment-analysis|@investment-report/;

export const reportComposerCommand = (locale: string, role: AuthRole) => locale === "zh-CN" ? role === "investment-director" ? "@生成报告" : "@投资分析" : "@investment-report";
export const replaceComposerCommand = (text: string, command: string) => `${command} ${text.replace(COMMAND_SPLIT_REGEX, "").replace(/^(?:模拟投委会|重大变化评估|生成投资报告|生成报告|交叉验证)[：:]?\s*/, "").trim()}`;

/**
 * 把输入文本拆分为「普通文本 / 指令」分段，供高亮叠层渲染。
 * 末尾换行追加零宽字符，保证叠层高度与 textarea 一致。
 */
function renderHighlighted(text: string) {
  const source = text.endsWith("\n") ? text + "\u200b" : text;
  const parts = source.split(COMMAND_SPLIT_REGEX);
  return parts.map((part, i) =>
    (COMMANDS as readonly string[]).includes(part) ? (
      <span
        key={i}
        className="rounded-[var(--wz-radius-sm)] font-medium text-[var(--wz-color-text-link)]"
      >
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export function ChatComposer({
  onSend,
  generating,
  onStop,
  queuedPrompts = [],
  onEditQueuedPrompt,
  onDeleteQueuedPrompt,
  animatedPlaceholders = [],
  showAttachmentDivider = true,
  referenceAttachment = null,
  onReferenceAttachmentConsumed,
  onAttachmentsChange,
  userRole = "investment-director",
  projectStage,
  decisionStage = projectStage === "decided",
  draftRequest = null,
  onDraftConsumed,
  initialDraft,
  initialAttachments = [],
  allowProjectMaterials = false,
  allowQueueWhileGenerating = false,
  resetKey,
  onDraftTextChange,
  draftStorageKey,
  compact = false,
  toolbarActions,
  questionContext,
  onRemoveQuestionContext,
  onViewSource,
  className,
}: ChatComposerProps) {
  const { locale, t } = useLocale();
  const [text, setText] = useState(() => {
    if (draftRequest) return draftRequest.text;
    if (initialDraft !== undefined) return initialDraft;
    if (!draftStorageKey) return "";
    try { return window.sessionStorage.getItem(draftStorageKey) ?? ""; }
    catch { return ""; }
  });
  const [attachments, setAttachments] = useState<ComposerAttachment[]>(initialAttachments);
  const [editingQueueId, setEditingQueueId] = useState<string | null>(null);
  const [editingQueueText, setEditingQueueText] = useState("");
  const [uploadRejections, setUploadRejections] = useState<UploadRejection[]>([]);
  const [referenceAnimationKey, setReferenceAnimationKey] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const consumedReferenceKeyRef = useRef<string | null>(null);
  const referenceAnimationTimerRef = useRef<number | null>(null);
  const previousAttachmentsRef = useRef(attachments);
  const consumedDraftId = useRef<string | null>(null);
  // 指令已激活但未传附件时，点击发送按钮弹出的上传提示
  const [hintOpen, setHintOpen] = useState(false);
  const hintTimer = useRef<number | null>(null);
  const animatedPlaceholder = useAnimatedPlaceholder(
    animatedPlaceholders,
    text.length > 0
  );
  const crossValidationCommand = locale === "zh-CN" ? "@交叉验证" : "@cross-validation";
  const investmentAnalysisCommand = reportComposerCommand(locale, userRole);
  const canCrossValidate = userRole !== "committee-lead";
  const canAnalyzeInvestment = true;
  const lastResetKey = useRef(resetKey);

  useEffect(() => {
    if (lastResetKey.current === resetKey) return;
    lastResetKey.current = resetKey;
    if (!resetKey) return;
    setText("");
    setAttachments([]);
    setUploadRejections([]);
  }, [resetKey]);

  useEffect(() => {
    if (!questionContext) return;
    const frame = window.requestAnimationFrame(() => taRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [questionContext?.questionId]);

  useEffect(() => {
    if (!draftRequest || consumedDraftId.current === draftRequest.id) return;
    consumedDraftId.current = draftRequest.id;
    setText(draftRequest.text);
    onDraftConsumed?.();
    window.requestAnimationFrame(() => {
      if (!taRef.current) return;
      taRef.current.style.height = "auto";
      taRef.current.style.height = `${Math.min(taRef.current.scrollHeight, 220)}px`;
      taRef.current.focus();
    });
  }, [draftRequest, onDraftConsumed]);

  useEffect(() => {
    onDraftTextChange?.(text);
  }, [text, onDraftTextChange]);

  useEffect(() => {
    if (!draftStorageKey) return;
    try {
      if (text) window.sessionStorage.setItem(draftStorageKey, text);
      else window.sessionStorage.removeItem(draftStorageKey);
    } catch { /* Draft editing remains available when session storage is blocked. */ }
  }, [draftStorageKey, text]);

  useEffect(() => {
    if (!referenceAttachment) {
      consumedReferenceKeyRef.current = null;
      return;
    }

    const referenceKey = `${referenceAttachment.kind}:${referenceAttachment.name}:${referenceAttachment.size}`;
    if (consumedReferenceKeyRef.current === referenceKey) return;
    consumedReferenceKeyRef.current = referenceKey;

    const alreadyAttached = attachments.some(
      (attachment) =>
        attachment.name === referenceAttachment.name &&
        attachment.kind === referenceAttachment.kind
    );
    if (!alreadyAttached) {
      setReferenceAnimationKey(referenceKey);
      if (referenceAnimationTimerRef.current !== null) {
        window.clearTimeout(referenceAnimationTimerRef.current);
      }
      referenceAnimationTimerRef.current = window.setTimeout(() => {
        setReferenceAnimationKey(null);
        referenceAnimationTimerRef.current = null;
      }, 520);
    }

    setAttachments((current) => {
      const alreadyAttached = current.some(
        (attachment) =>
          attachment.name === referenceAttachment.name &&
          attachment.kind === referenceAttachment.kind
      );
      return alreadyAttached ? current : [...current, referenceAttachment];
    });
    onReferenceAttachmentConsumed?.();
  }, [attachments, onReferenceAttachmentConsumed, referenceAttachment]);

  useEffect(
    () => () => {
      if (referenceAnimationTimerRef.current !== null) {
        window.clearTimeout(referenceAnimationTimerRef.current);
      }
    },
    []
  );

  useEffect(() => {
    if (previousAttachmentsRef.current === attachments) return;
    previousAttachmentsRef.current = attachments;
    onAttachmentsChange?.(attachments);
  }, [attachments, onAttachmentsChange]);

  /** 自适应高度 + 同步高亮叠层滚动 */
  const resize = (el: HTMLTextAreaElement) => {
    if (!el.getClientRects().length) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 220) + "px";
  };

  const syncScroll = () => {
    const ta = taRef.current;
    const bd = backdropRef.current;
    if (ta && bd) {
      bd.scrollTop = ta.scrollTop;
      bd.scrollLeft = ta.scrollLeft;
    }
  };

  // 包含恢复草稿时的高度调整，并同步叠层滚动位置。
  useLayoutEffect(() => {
    if (taRef.current) resize(taRef.current);
    syncScroll();
  }, [text]);

  // A collapsed composer stays mounted: measure again when it becomes visible
  // or changes width, without reacting to the height change caused by resize.
  useEffect(() => {
    const textarea = taRef.current;
    if (!textarea) return;
    let previousWidth = 0;
    let frame = 0;
    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width;
      if (width === previousWidth) return;
      previousWidth = width;
      window.cancelAnimationFrame(frame);
      if (width > 0) frame = window.requestAnimationFrame(() => { resize(textarea); syncScroll(); });
    });
    observer.observe(textarea);
    return () => { observer.disconnect(); window.cancelAnimationFrame(frame); };
  }, []);

  // —— 指令状态 ——
  const hasCommand = COMMAND_TEST_REGEX.test(text);
  // 指令之外没有其它正文时，在指令后展示上传提示占位
  const restEmpty = text.replace(COMMAND_SPLIT_REGEX, "").trim() === "";
  const showCommandHint = hasCommand && restEmpty && !allowProjectMaterials;
  // 激活指令后，必须先上传附件才能发送
  const requiresAttachment = hasCommand && !allowProjectMaterials;
  const canSend = requiresAttachment
    ? attachments.length > 0
    : questionContext ? text.trim().length > 0 : text.trim().length > 0 || attachments.length > 0;
  // 指令已激活但还没上传附件：发送按钮不可点击，但点击会提示上传
  const blockedNoAttachment = requiresAttachment && attachments.length === 0;

  /** 点击被禁用的发送按钮时，短暂弹出上传提示 */
  const triggerUploadHint = () => {
    setHintOpen(true);
    if (hintTimer.current) window.clearTimeout(hintTimer.current);
    hintTimer.current = window.setTimeout(() => setHintOpen(false), 2200);
  };

  const send = () => {
    if (!canSend) return;
    if (onSend(text.trim(), attachments) === false) return;
    setText("");
    setAttachments([]);
    setUploadRejections([]);
    if (taRef.current) taRef.current.style.height = "auto";
  };

  const beginQueueEdit = (item: QueuedChatPrompt) => {
    setEditingQueueId(item.id);
    setEditingQueueText(item.text);
  };

  const cancelQueueEdit = () => {
    setEditingQueueId(null);
    setEditingQueueText("");
  };

  const saveQueueEdit = () => {
    const nextText = editingQueueText.trim();
    if (editingQueueId && nextText) {
      onEditQueuedPrompt?.(editingQueueId, nextText);
    }
    cancelQueueEdit();
  };

  /**
   * 点击快捷按钮：输入框始终只保留一个指令。
   * 先剥离已有指令、保留其余正文，再把新指令放到最前。
   * 因此再次点击（同一或另一个）会替换现有指令，而非叠加。
   */
  const insertCommand = (cmd: string) => {
    const prefix = `${cmd} `;
    const next = replaceComposerCommand(text, cmd);
    setText(next);
    const caret = prefix.length;
    requestAnimationFrame(() => {
      const ta = taRef.current;
      if (!ta) return;
      ta.focus();
      ta.setSelectionRange(caret, caret);
      resize(ta);
      syncScroll();
    });
  };

  const addFiles = (files: FileList | File[] | null) => {
    if (!files) return;
    const { accepted, rejected } = validateUploadFiles(
      files,
      attachments.map((attachment) => attachment.name)
    );
    setUploadRejections(rejected);
    const list = accepted.map((f) => ({
      name: f.name,
      size: `${(f.size / 1024).toFixed(0)} KB`,
      kind: inferUploadFileKind(f.name),
    }));
    if (list.length > 0) {
      setAttachments((prev) => [...prev, ...list]);
    }
  };
  const handleAttach = (e: React.ChangeEvent<HTMLInputElement>) => { addFiles(e.target.files); e.target.value = ""; };

  const uploadErrorMessages = uploadRejectionMessages(uploadRejections, locale, t);

  return (
    <div className={cn("mx-auto w-full min-w-0 max-w-4xl px-3 pb-4 sm:px-5", className)}
      onDragOver={(event) => { if (event.dataTransfer.types.includes("Files")) { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; } }}
      onDrop={(event) => { if (event.dataTransfer.files.length) { event.preventDefault(); addFiles(event.dataTransfer.files); } }}>
      <div className="w-full min-w-0 max-w-full overflow-hidden rounded-[var(--wz-radius-lg)] border border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-surface)] shadow-[var(--wz-shadow-sm)] transition-[border-color,box-shadow] duration-[var(--wz-duration-normal)] ease-[var(--wz-ease-standard)] has-[textarea:focus-visible]:border-[var(--wz-color-border-focus)] has-[textarea:focus-visible]:shadow-[0_0_0_3px_var(--wz-color-focus-ring)]">
        {queuedPrompts.length > 0 && (
          <section
            aria-label={t("composer.queueTitle", { count: queuedPrompts.length })}
            className="border-b border-[var(--wz-color-border-subtle)] bg-[var(--wz-color-bg-subtle)] px-3 py-2.5"
          >
            <div className="min-w-0">
              <p className="truncate text-[length:var(--wz-font-size-body)] font-medium text-[var(--wz-color-text-primary)]">
                {t("composer.queueTitle", { count: queuedPrompts.length })}
              </p>
              <p className="truncate text-[length:var(--wz-font-size-caption)] text-[color:var(--wz-color-text-tertiary)]">
                {t("composer.queueHint")}
              </p>
            </div>

            <ol className="thin-scroll mt-2 grid max-h-44 gap-1.5 overflow-y-auto overscroll-contain pr-1" aria-label={t("composer.queueTitle", { count: queuedPrompts.length })}>
              {queuedPrompts.map((item, index) => {
                const isEditing = editingQueueId === item.id;
                return (
                  <li
                    key={item.id}
                    className="flex min-w-0 items-center gap-2 rounded-[var(--wz-radius-md)] border border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-surface)] px-2 py-1.5"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--wz-color-bg-subtle)] font-mono text-[length:var(--wz-font-size-caption)] font-normal tabular-nums text-[color:var(--wz-color-text-tertiary)]">
                      {index + 1}
                    </span>
                    {isEditing ? (
                      <input
                        value={editingQueueText}
                        onChange={(event) => setEditingQueueText(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            saveQueueEdit();
                          }
                          if (event.key === "Escape") {
                            event.preventDefault();
                            event.stopPropagation();
                            cancelQueueEdit();
                          }
                        }}
                        aria-label={t("composer.queueEdit")}
                        className="h-8 min-w-0 flex-1 rounded-[var(--wz-radius-sm)] border border-[var(--wz-color-border-focus)] bg-[var(--wz-color-bg-surface)] px-2 text-[length:var(--wz-font-size-body)] text-[var(--wz-color-text-primary)] outline-none focus-visible:shadow-[0_0_0_3px_var(--wz-color-focus-ring)]"
                        autoFocus
                      />
                    ) : (
                      <span className="min-w-0 flex-1 truncate text-[length:var(--wz-font-size-body)] text-[var(--wz-color-text-primary)]" title={item.text}>
                        {item.text}
                      </span>
                    )}
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          onClick={saveQueueEdit}
                          disabled={!editingQueueText.trim()}
                          aria-label={t("composer.queueSave")}
                          title={t("composer.queueSave")}
                          className="wz-icon-button flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--wz-radius-sm)] text-[var(--wz-color-status-success)] outline-none transition-colors hover:bg-[var(--wz-color-status-success-subtle)] focus-visible:shadow-[0_0_0_3px_var(--wz-color-focus-ring)] disabled:opacity-50"
                        >
                          <AppIcon icon={IconCheck} size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={cancelQueueEdit}
                          aria-label={t("composer.queueCancelEdit")}
                          title={t("composer.queueCancelEdit")}
                          className="wz-icon-button flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--wz-radius-sm)] text-[color:var(--wz-color-text-tertiary)] outline-none transition-colors hover:bg-[var(--wz-color-border-default)] hover:text-[var(--wz-color-text-primary)] focus-visible:shadow-[0_0_0_3px_var(--wz-color-focus-ring)]"
                        >
                          <AppIcon icon={IconClose} size={12} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => beginQueueEdit(item)}
                          aria-label={t("composer.queueEdit")}
                          title={t("composer.queueEdit")}
                          className="wz-icon-button flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--wz-radius-sm)] text-[color:var(--wz-color-text-tertiary)] outline-none transition-colors hover:bg-[var(--wz-color-bg-subtle)] hover:text-[var(--wz-color-text-primary)] focus-visible:shadow-[0_0_0_3px_var(--wz-color-focus-ring)]"
                        >
                          <AppIcon icon={IconRename} size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (editingQueueId === item.id) cancelQueueEdit();
                            onDeleteQueuedPrompt?.(item.id);
                          }}
                          aria-label={t("composer.queueDelete")}
                          title={t("composer.queueDelete")}
                          className="wz-icon-button flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--wz-radius-sm)] text-[color:var(--wz-color-text-tertiary)] outline-none transition-colors hover:bg-[var(--wz-color-status-danger-subtle)] hover:text-[var(--wz-color-status-danger)] focus-visible:shadow-[0_0_0_3px_var(--wz-color-focus-ring)]"
                        >
                          <AppIcon icon={IconDelete} size={12} />
                        </button>
                      </>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        )}

        {questionContext && <div className="px-3 pt-3 pb-1">
          <QuestionContextCard context={questionContext} onRemove={onRemoveQuestionContext ? () => {
            onRemoveQuestionContext();
            window.requestAnimationFrame(() => taRef.current?.focus());
          } : undefined} onViewSource={onViewSource} />
        </div>}

        {attachments.length > 0 && (
          <div
            className={cn(
              "flex min-w-0 flex-wrap gap-2 overflow-hidden px-3 py-2",
              showAttachmentDivider &&
                "border-b border-[var(--wz-color-border-subtle)]"
            )}
          >
            {attachments.map((a, i) => (
              <div
                key={`${a.name}-${i}`}
                className={cn(
                  "inline-flex min-w-0 max-w-full items-center gap-2 rounded-[var(--wz-radius-md)] border border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-subtle)] py-0.5 pl-2 text-[length:var(--wz-font-size-xs)]",
                  referenceAnimationKey === getAttachmentKey(a) &&
                    "composer-reference-attachment-in"
                )}
              >
                <AppIcon
                  icon={IconAttach}
                  size={12}
                  className="text-[color:var(--wz-color-text-tertiary)]"
                />
                <span className="min-w-0 truncate font-medium text-[color:var(--wz-color-text-secondary)]">
                  {a.name}
                </span>
                <span className="shrink-0 text-[color:var(--wz-color-text-tertiary)]">
                  {a.size}
                </span>
                <button
                  type="button"
                  className="wz-icon-button inline-flex h-[var(--wz-control-height-sm)] w-[var(--wz-control-height-sm)] shrink-0 items-center justify-center rounded-[var(--wz-radius-md)] text-[color:var(--wz-color-text-tertiary)] outline-none transition-[background-color,color,box-shadow] duration-[var(--wz-duration-fast)] ease-[var(--wz-ease-standard)] hover:bg-[var(--wz-color-border-default)] hover:text-[var(--wz-color-text-primary)] focus-visible:shadow-[0_0_0_3px_var(--wz-color-focus-ring)]"
                  onClick={() => setAttachments(attachments.filter((_, idx) => idx !== i))}
                  aria-label={t("composer.removeAttachment", { name: a.name })}
                  title={t("composer.removeAttachment", { name: a.name })}
                >
                  <AppIcon icon={IconClose} size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        <UploadValidationNotice
          title={t("upload.rejectedTitle")}
          messages={uploadErrorMessages}
          dismissLabel={t("common.close")}
          onDismiss={() => setUploadRejections([])}
          className="mx-3 mt-2"
        />

        {!compact && <div className="composer-controls flex min-w-0 flex-wrap items-center gap-2 px-3 pt-2.5">
          <div className="composer-shortcuts flex min-w-0 flex-wrap items-center gap-2">
          {canCrossValidate && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => insertCommand(crossValidationCommand)}
              aria-pressed={text.includes("@交叉验证") || text.includes("@cross-validation")}
              className="aria-pressed:border-[var(--wz-color-border-strong)] aria-pressed:bg-[var(--wz-color-bg-subtle)]"
            >
              {t("composer.crossValidation")}
            </Button>
          )}
          {canAnalyzeInvestment && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => insertCommand(investmentAnalysisCommand)}
              aria-pressed={
                text.includes("@投资分析") ||
                text.includes("@生成报告") ||
                text.includes("@投资报告") ||
                text.includes("@investment-analysis") ||
                text.includes("@investment-report")
              }
              className="aria-pressed:border-[var(--wz-color-border-strong)] aria-pressed:bg-[var(--wz-color-bg-subtle)]"
            >
              {userRole === "investment-director" ? "生成报告" : t("composer.investmentAnalysis")}
            </Button>
          )}
          {userRole === "investment-director" && !decisionStage && <Button type="button" variant="outline" size="sm" onClick={() => {
            const rest = text.replace(COMMAND_SPLIT_REGEX, "").replace(/^模拟投委会[：:]?\s*/, "").trim();
            setText(`模拟投委会：${rest}`); taRef.current?.focus();
          }}>模拟投委会</Button>}
          {userRole === "investment-director" && projectStage === "diligence" && !decisionStage && (
            <Button type="button" variant="outline" size="sm" title="功能建设中">财法分析</Button>
          )}
          {userRole === "investment-director" && decisionStage && <>
            <Button type="button" variant="outline" size="sm" title="功能建设中">投决纪要</Button>
            <Button type="button" variant="outline" size="sm" title="功能建设中">交割条件</Button>
          </>}
          </div>
          {toolbarActions && <div className="composer-toolbar-actions">{toolbarActions}</div>}
        </div>}

        <div className="flex min-w-0 max-w-full items-start gap-2 px-3 py-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label={t("composer.uploadFile")}
            title={t("composer.temporaryAttachment")}
            className="wz-icon-button mt-1.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-[var(--wz-radius-md)] text-[color:var(--wz-color-text-secondary)] outline-none transition-[background-color,color,box-shadow] duration-[var(--wz-duration-fast)] ease-[var(--wz-ease-standard)] hover:bg-[var(--wz-color-bg-subtle)] hover:text-[var(--wz-color-text-primary)] focus-visible:shadow-[0_0_0_3px_var(--wz-color-focus-ring)]"
          >
            <AppIcon icon={IconAttach} size={16} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={UPLOAD_FILE_ACCEPT}
            className="hidden"
            onChange={handleAttach}
          />

          <div className="relative flex min-h-[var(--wz-control-height-md)] min-w-0 flex-1 items-center overflow-hidden leading-none">
            {/* 高亮叠层：镜像文本，指令以蓝色显示；与 textarea 完全对齐 */}
            <div
              ref={backdropRef}
              aria-hidden
              className={cn(
                "thin-scroll pointer-events-none absolute inset-0 max-h-[220px] overflow-auto whitespace-pre-wrap break-words px-1 py-1.5 text-[length:var(--wz-font-size-md)] leading-6 text-[var(--wz-color-text-primary)]",
                showCommandHint && "overflow-hidden whitespace-nowrap"
              )}
            >
              {showCommandHint && (
                <span className="block max-w-full overflow-hidden text-ellipsis whitespace-nowrap">
                  {renderHighlighted(text)}
                  <span className="text-[color:var(--wz-color-text-tertiary)]">
                    {(text.endsWith(" ") ? "" : " ") + t("composer.uploadRequired")}
                  </span>
                </span>
              )}
              {!showCommandHint && Boolean(text) && renderHighlighted(text)}
              {!text && animatedPlaceholder && !showCommandHint && (
                <span
                  aria-hidden="true"
                  className="block max-w-full truncate whitespace-nowrap text-[color:var(--wz-color-text-tertiary)]"
                >
                  {animatedPlaceholder}
                </span>
              )}
            </div>
            <textarea
              ref={taRef}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                resize(e.currentTarget);
              }}
              onScroll={syncScroll}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder={
                showCommandHint
                  ? t("composer.uploadRequired")
                  : questionContext ? "输入你想继续追问的问题…" : decisionStage ? "核对决议要求，或上传需要复核的材料…" : animatedPlaceholders[0] ?? t("composer.ask")
              }
              aria-label={questionContext ? "输入你想继续追问的问题" : t("composer.ask")}
              rows={1}
              className={cn(
                "thin-scroll relative block h-[var(--wz-control-height-md)] max-h-[220px] min-h-[var(--wz-control-height-md)] w-full resize-none bg-transparent px-1 py-1.5 text-[length:var(--wz-font-size-md)] leading-6 text-transparent caret-[var(--wz-color-text-primary)] outline-none focus-visible:outline-none",
                animatedPlaceholders.length > 0
                  ? "placeholder:text-transparent"
                  : "placeholder:text-[color:var(--wz-color-text-tertiary)]"
              )}
            />
          </div>

          {generating && !allowQueueWhileGenerating ? (
            <Button variant="outline" size="icon" className="rounded-full" onClick={onStop} aria-label={t("composer.stop")} title={t("composer.stop")}>
              <AppIcon icon={IconStop} size={13} />
            </Button>
          ) : (
            <div className="relative self-start">
              <Button
                variant="default"
                size="icon"
                className="rounded-full transition-[background-color,box-shadow,transform] active:scale-95 motion-reduce:transform-none"
                disabled={!canSend}
                onClick={send}
                aria-label={t("composer.send")}
                title={t("composer.send")}
              >
                <AppIcon icon={IconArrowUp} size={14} />
              </Button>
              {/* 指令已激活但未传附件：发送按钮保持禁用，叠加透明层捕获点击以弹出提示 */}
              {blockedNoAttachment && (
                <button
                  type="button"
                  aria-label={t("composer.uploadRequired")}
                  aria-describedby={hintOpen ? "composer-upload-hint" : undefined}
                  title={t("composer.uploadRequired")}
                  onClick={triggerUploadHint}
                  className="absolute inset-0 cursor-not-allowed rounded-full outline-none focus-visible:shadow-[0_0_0_3px_var(--wz-color-focus-ring)]"
                />
              )}
              {hintOpen && (
                <div
                  id="composer-upload-hint"
                  role="tooltip"
                  aria-live="polite"
                  className="wz-tooltip-content absolute bottom-full right-0 z-[var(--wz-z-dropdown)] mb-2 whitespace-nowrap rounded-[var(--wz-radius-sm)] bg-[var(--wz-color-action-primary)] px-2.5 py-1.5 text-[length:var(--wz-font-size-xs)] text-[var(--wz-color-text-inverse)] shadow-[var(--wz-shadow-md)]"
                >
                  {t("composer.uploadRequired")}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
