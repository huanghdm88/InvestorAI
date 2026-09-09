import { useEffect, useRef, useState } from "react";

import { Button } from "@/src/components/ui/button";
import { ConfirmDialog } from "@/src/components/ui/confirm-dialog";
import { AppIcon } from "@/src/components/ui/app-icon";
import { UploadValidationNotice } from "@/src/components/ui/upload-validation-notice";
import {
  IconCheckCircle,
  IconAttach,
  IconDelete,
  IconFile,
  IconFileSpreadsheet,
  IconFileText,
  IconPlus,
  IconRefresh,
  IconUpload,
} from "@/src/lib/icons";
import { cn, uid } from "@/src/lib/utils";
import { useLocale, type Locale } from "@/src/lib/i18n";
import { translateKnowledgeCategory } from "@/src/lib/content-localization";
import {
  inferUploadFileKind,
  UPLOAD_FILE_ACCEPT,
  uploadRejectionMessages,
  validateUploadFiles,
  type UploadRejection,
} from "@/src/lib/file-upload";
import type { FileKind, FileStatus, KnowledgeFile } from "@/src/types";

interface KnowledgePanelProps {
  files: KnowledgeFile[];
  onUpdateFiles: (files: KnowledgeFile[]) => void;
  /** 将已索引资料引用到当前项目输入框。 */
  onReferenceFile?: (file: KnowledgeFile) => void;
  /** 当前已加入输入框的项目文件，避免重复引用。 */
  referencedFileIds?: ReadonlySet<string>;
  /** 紧凑模式：用于右侧栏，移除一些 dropzone 说明 */
  compact?: boolean;
  /** 文件变动通知（如 SettingsPanel 用来打 dirty 标） */
  onDirty?: () => void;
  className?: string;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function kindIcon(kind: FileKind) {
  if (kind === "excel") return IconFileSpreadsheet;
  if (kind === "pdf" || kind === "word") return IconFileText;
  return IconFile;
}

/** 抽取自原 SettingsPanel 的「项目知识库」模块，供右侧栏与项目主页复用 */
export function KnowledgePanel({
  files,
  onUpdateFiles,
  onReferenceFile,
  referencedFileIds,
  compact = false,
  onDirty,
  className,
}: KnowledgePanelProps) {
  const { locale, t } = useLocale();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const filesRef = useRef(files);
  const timersRef = useRef<Set<number>>(new Set());
  const [drag, setDrag] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<KnowledgeFile | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [uploadRejections, setUploadRejections] = useState<UploadRejection[]>([]);

  filesRef.current = files;

  useEffect(
    () => () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
      timersRef.current.clear();
    },
    []
  );

  const schedule = (callback: () => void, delay: number) => {
    const timer = window.setTimeout(() => {
      timersRef.current.delete(timer);
      callback();
    }, delay);
    timersRef.current.add(timer);
  };

  const updateFiles = (nextFiles: KnowledgeFile[]) => {
    filesRef.current = nextFiles;
    onUpdateFiles(nextFiles);
  };

  const markDirty = () => onDirty?.();

  const addFiles = (incoming: FileList | null) => {
    if (!incoming || incoming.length === 0) return;
    const { accepted, rejected } = validateUploadFiles(
      incoming,
      filesRef.current.map((file) => file.name)
    );
    setUploadRejections(rejected);
    if (accepted.length === 0) return;

    const list: KnowledgeFile[] = accepted.map((f) => ({
      id: uid("file"),
      name: f.name,
      size: formatSize(f.size),
      kind: inferUploadFileKind(f.name),
      status: "uploading" as FileStatus,
      uploadedAt: new Date().toISOString(),
    }));
    const newIds = new Set(list.map((file) => file.id));
    updateFiles([...list, ...filesRef.current]);
    setStatusMessage(t("knowledge.addedStatus", { count: list.length }));
    markDirty();
    schedule(() => {
      updateFiles(
        filesRef.current.map((f) =>
          newIds.has(f.id) ? { ...f, status: "parsing" as FileStatus } : f
        )
      );
      setStatusMessage(t("knowledge.parsingStatus", { count: list.length }));
    }, 600);
    schedule(() => {
      updateFiles(
        filesRef.current.map((f) =>
          newIds.has(f.id) ? { ...f, status: "indexed" as FileStatus } : f
        )
      );
      setStatusMessage(t("knowledge.indexedStatus", { count: list.length }));
    }, 2800);
  };

  const uploadErrorMessages = uploadRejectionMessages(uploadRejections, locale, t);

  const removeFile = (file: KnowledgeFile) => {
    updateFiles(filesRef.current.filter((item) => item.id !== file.id));
    markDirty();
    setStatusMessage(t("knowledge.deletedStatus", { name: file.name }));
  };

  return (
    <div className={cn("space-y-[var(--wz-space-3)]", className)}>
      <p className="sr-only" role="status" aria-live="polite">
        {statusMessage}
      </p>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          addFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex flex-col items-center justify-center gap-[var(--wz-space-2)] rounded-[var(--wz-radius-lg)] border border-dashed text-center transition-[background-color,border-color] duration-[var(--wz-duration-fast)] ease-[var(--wz-ease-standard)]",
          compact ? "px-4 py-5" : "px-6 py-8",
          drag
            ? "border-[var(--wz-color-border-focus)] bg-[var(--wz-color-status-info-subtle)]"
            : "border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-surface)] hover:border-[var(--wz-color-border-strong)]"
        )}
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-[var(--wz-radius-md)] bg-[var(--wz-color-bg-surface)] text-[color:var(--wz-color-text-secondary)] shadow-[var(--wz-shadow-sm)]">
          <AppIcon icon={IconUpload} size={15} />
        </div>
        <p className="text-[length:var(--wz-font-size-sm)] font-semibold text-[var(--wz-color-text-primary)]">{t("knowledge.dropzone")}</p>
        {!compact && (
          <p className="text-[length:var(--wz-font-size-xs)] text-[color:var(--wz-color-text-secondary)]">
            {t("knowledge.constraints")}
          </p>
        )}
        <Button
          variant="outline"
          size="sm"
          className="mt-1"
          onClick={() => fileInputRef.current?.click()}
        >
          <AppIcon icon={IconPlus} size={11} />
          {t("knowledge.upload")}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          accept={UPLOAD_FILE_ACCEPT}
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      <UploadValidationNotice
        title={t("upload.rejectedTitle")}
        messages={uploadErrorMessages}
        dismissLabel={t("common.close")}
        onDismiss={() => setUploadRejections([])}
      />

      <div className="overflow-hidden rounded-[var(--wz-radius-lg)] border border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-surface)]">
        <div className="flex items-center justify-between border-b border-[var(--wz-color-border-subtle)] px-3 py-2">
          <p className="text-[length:var(--wz-font-size-xs)] font-semibold text-[color:var(--wz-color-text-secondary)]">
            {t("knowledge.included", { count: files.length })}
          </p>
          <p className="text-[length:var(--wz-font-size-xs)] text-[color:var(--wz-color-text-tertiary)]">{t("knowledge.projectOnly")}</p>
        </div>
        {files.length === 0 ? (
          <div className="px-4 py-6 text-center text-[length:var(--wz-font-size-xs)] text-[color:var(--wz-color-text-tertiary)]">
            {t("knowledge.emptySuggestion")}
          </div>
        ) : (
          <ul className="divide-y divide-[var(--wz-color-border-subtle)]">
            {files.map((f) => {
              const Icon = kindIcon(f.kind);
              return (
                <li key={f.id} className="flex items-center gap-2.5 px-3 py-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--wz-radius-md)] bg-[var(--wz-color-bg-subtle)] text-[color:var(--wz-color-text-secondary)]">
                    <AppIcon icon={Icon} size={13} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[length:var(--wz-font-size-sm)] font-medium text-[var(--wz-color-text-primary)]">
                      {f.name}
                    </p>
                    <p className="text-[length:var(--wz-font-size-xs)] text-[color:var(--wz-color-text-tertiary)]">
                      {f.size} · {f.kind.toUpperCase()}
                      {f.category
                        ? ` · ${translateKnowledgeCategory(f.category, locale)}`
                        : ""}
                    </p>
                  </div>
                  <FileStatusBadge status={f.status} />
                  {onReferenceFile && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={!onReferenceFile || f.status !== "indexed" || referencedFileIds?.has(f.id)}
                    aria-label={t("knowledge.referenceFile", { name: f.name })}
                    title={t("knowledge.referenceFile", { name: f.name })}
                    onClick={() => onReferenceFile?.(f)}
                    className="shrink-0"
                  >
                    <AppIcon icon={IconAttach} size={14} />
                  </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("knowledge.delete", { name: f.name })}
                    title={t("knowledge.delete", { name: f.name })}
                    onClick={() => setPendingDelete(f)}
                  >
                    <AppIcon icon={IconDelete} size={12} className="text-[color:var(--wz-color-text-tertiary)]" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title={t("knowledge.deleteTitle")}
        description={
          pendingDelete ? t("knowledge.deleteDescription", { name: pendingDelete.name }) : ""
        }
        confirmLabel={t("knowledge.deleteConfirm")}
        destructive
        onConfirm={() => {
          if (pendingDelete) removeFile(pendingDelete);
        }}
      />
    </div>
  );
}

function FileStatusBadge({ status }: { status: KnowledgeFile["status"] }) {
  const { t, locale } = useLocale();
  if (status === "unparsed") return <span className="text-xs text-neutral-500">{locale === "en-US" ? "Not parsed" : "未解析"}</span>;
  if (status === "indexed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-[var(--wz-radius-sm)] bg-[var(--wz-color-status-success-subtle)] px-1.5 py-0.5 text-[length:var(--wz-font-size-tag)] leading-[var(--wz-line-height-tag)] font-medium text-[var(--wz-color-status-success)]">
        <AppIcon icon={IconCheckCircle} size={10} />
        {t("knowledge.indexed")}
      </span>
    );
  }
  if (status === "parsing" || status === "uploading") {
    return (
      <span className="inline-flex items-center gap-1 rounded-[var(--wz-radius-sm)] bg-[var(--wz-color-status-running-subtle)] px-1.5 py-0.5 text-[length:var(--wz-font-size-tag)] leading-[var(--wz-line-height-tag)] font-medium text-[var(--wz-color-status-running)]">
        <AppIcon icon={IconRefresh} size={10} className="animate-spin motion-reduce:animate-none" />
        {status === "parsing" ? t("knowledge.parsing") : t("knowledge.uploading")}
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-[var(--wz-radius-sm)] bg-[var(--wz-color-status-danger-subtle)] px-1.5 py-0.5 text-[length:var(--wz-font-size-tag)] leading-[var(--wz-line-height-tag)] font-medium text-[var(--wz-color-status-danger)]">
        {t("knowledge.failed")}
      </span>
    );
  }
  return null;
}

/** 给外部使用的"知识库当前活跃状态"工具（项目主页 Tab 标题、SettingsPanel 同步用） */
export function getKnowledgeActivity(
  files: KnowledgeFile[],
  projectStatus: import("@/src/types").ProjectStatus,
  locale: Locale = "zh-CN"
):
  | { label: string; count: number; spinning: boolean; tone: "amber" | "rose" }
  | null {
  const uploading = files.filter((f) => f.status === "uploading");
  const parsing = files.filter((f) => f.status === "parsing");
  const failed = files.filter((f) => f.status === "failed");
  if (uploading.length > 0) {
    return { label: locale === "zh-CN" ? "上传中" : "Uploading", count: uploading.length, spinning: true, tone: "amber" };
  }
  if (parsing.length > 0 || projectStatus === "parsing") {
    return {
      label: locale === "zh-CN" ? "解析中" : "Parsing",
      count: parsing.length > 0 ? parsing.length : files.length,
      spinning: true,
      tone: "amber",
    };
  }
  if (failed.length > 0) {
    return { label: locale === "zh-CN" ? "部分失败" : "Some failed", count: failed.length, spinning: false, tone: "rose" };
  }
  const unparsed = files.filter((file) => file.status === "unparsed");
  if (unparsed.length) return { label: locale === "zh-CN" ? "未解析" : "Not parsed", count: unparsed.length, spinning: false, tone: "amber" };
  return null;
}
