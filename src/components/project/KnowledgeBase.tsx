import { useEffect, useRef, useState } from "react";

import { Button } from "@/src/components/ui/button";
import { ConfirmDialog } from "@/src/components/ui/confirm-dialog";
import { AppIcon } from "@/src/components/ui/app-icon";
import { UploadValidationNotice } from "@/src/components/ui/upload-validation-notice";
import {
  IconCheckCircle,
  IconDatabase,
  IconDelete,
  IconFile,
  IconFileSpreadsheet,
  IconFileText,
  IconPlus,
  IconRefresh,
  IconUpload,
} from "@/src/lib/icons";
import { cn, uid } from "@/src/lib/utils";
import { useLocale } from "@/src/lib/i18n";
import {
  inferUploadFileKind,
  UPLOAD_FILE_ACCEPT,
  uploadRejectionMessages,
  validateUploadFiles,
  type UploadRejection,
} from "@/src/lib/file-upload";
import type { FileKind, KnowledgeFile, Project } from "@/src/types";

interface KnowledgeBaseProps {
  project: Project;
  onUpdateFiles: (files: KnowledgeFile[]) => void;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const RECOMMENDED = [
  { nameKey: "knowledge.recommendProposal", descriptionKey: "knowledge.recommendProposalDesc" },
  { nameKey: "knowledge.recommendAudit", descriptionKey: "knowledge.recommendAuditDesc" },
  { nameKey: "knowledge.recommendDiligence", descriptionKey: "knowledge.recommendDiligenceDesc" },
  { nameKey: "knowledge.recommendPlan", descriptionKey: "knowledge.recommendPlanDesc" },
  { nameKey: "knowledge.recommendInterview", descriptionKey: "knowledge.recommendInterviewDesc" },
  { nameKey: "knowledge.recommendResearch", descriptionKey: "knowledge.recommendResearchDesc" },
] as const;

function kindIcon(kind: FileKind) {
  if (kind === "excel") return IconFileSpreadsheet;
  if (kind === "pdf" || kind === "word") return IconFileText;
  return IconFile;
}

export function KnowledgeBase({ project, onUpdateFiles }: KnowledgeBaseProps) {
  const { locale, t } = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const filesRef = useRef(project.files);
  const timersRef = useRef<Set<number>>(new Set());
  const [drag, setDrag] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<KnowledgeFile | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [uploadRejections, setUploadRejections] = useState<UploadRejection[]>([]);

  filesRef.current = project.files;

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

  const updateFiles = (files: KnowledgeFile[]) => {
    filesRef.current = files;
    onUpdateFiles(files);
  };

  const addFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const { accepted, rejected } = validateUploadFiles(
      files,
      filesRef.current.map((file) => file.name)
    );
    setUploadRejections(rejected);
    if (accepted.length === 0) return;

    const list: KnowledgeFile[] = accepted.map((f) => ({
      id: uid("file"),
      name: f.name,
      size: formatSize(f.size),
      kind: inferUploadFileKind(f.name),
      status: "uploading",
      uploadedAt: new Date().toISOString(),
    }));
    const incomingIds = new Set(list.map((file) => file.id));
    updateFiles([...list, ...filesRef.current]);
    setStatusMessage(t("knowledge.addedStatus", { count: list.length }));

    schedule(() => {
      updateFiles(
        filesRef.current.map((file) =>
          incomingIds.has(file.id) ? { ...file, status: "parsing" } : file
        )
      );
      setStatusMessage(t("knowledge.parsingStatus", { count: list.length }));
    }, 600);

    schedule(() => {
      updateFiles(
        filesRef.current.map((file) =>
          incomingIds.has(file.id) ? { ...file, status: "indexed" } : file
        )
      );
      setStatusMessage(t("knowledge.indexedStatus", { count: list.length }));
    }, 1500);
  };

  const uploadErrorMessages = uploadRejectionMessages(uploadRejections, locale, t);

  const removeFile = (file: KnowledgeFile) => {
    updateFiles(filesRef.current.filter((item) => item.id !== file.id));
    setStatusMessage(t("knowledge.deletedStatus", { name: file.name }));
  };

  return (
    <div className="flex flex-col gap-5 py-4">
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
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
        aria-label={t("knowledge.uploadArea")}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-[var(--wz-radius-lg)] border border-dashed px-6 py-8 text-center transition-[background-color,border-color] duration-[var(--wz-duration-fast)] ease-[var(--wz-ease-standard)] motion-reduce:transition-none",
          drag
            ? "border-[var(--wz-color-border-focus)] bg-[var(--wz-color-status-info-subtle)]"
            : "border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-surface)] hover:border-[var(--wz-color-border-strong)]"
        )}
      >
        <div className="flex h-[var(--wz-control-height-lg)] w-[var(--wz-control-height-lg)] items-center justify-center rounded-[var(--wz-radius-lg)] bg-[var(--wz-color-bg-surface)] text-[color:var(--wz-color-text-secondary)] shadow-[var(--wz-shadow-sm)]">
          <AppIcon icon={IconUpload} size={18} />
        </div>
        <p className="text-[length:var(--wz-font-size-md)] font-semibold text-[var(--wz-color-text-primary)]">
          {t("knowledge.dropTitle")}
        </p>
        <p className="text-[length:var(--wz-font-size-xs)] text-[color:var(--wz-color-text-secondary)]">
          {t("knowledge.supports")}
        </p>
        <Button variant="outline" size="sm" className="mt-2" onClick={() => inputRef.current?.click()}>
          <AppIcon icon={IconPlus} size={12} />
          {t("knowledge.upload")}
        </Button>
        <input
          ref={inputRef}
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

      {project.files.length === 0 ? (
        <section className="overflow-hidden rounded-[var(--wz-radius-lg)] border border-[var(--wz-color-border-subtle)] bg-[var(--wz-color-bg-surface)]">
          <h3 className="flex items-center gap-2 border-b border-[var(--wz-color-border-subtle)] px-4 py-3 text-[length:var(--wz-font-size-sm)] font-semibold text-[color:var(--wz-color-text-secondary)]">
            <AppIcon icon={IconDatabase} size={12} />
            {t("knowledge.recommended")}
          </h3>
          <ul className="divide-y divide-[var(--wz-color-border-subtle)]">
            {RECOMMENDED.map((r) => (
              <li key={r.nameKey} className="px-4 py-3">
                <p className="text-[length:var(--wz-font-size-sm)] font-medium text-[var(--wz-color-text-primary)]">
                  {t(r.nameKey)}
                </p>
                <p className="mt-0.5 text-[length:var(--wz-font-size-xs)] text-[color:var(--wz-color-text-secondary)]">
                  {t(r.descriptionKey)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section className="overflow-hidden rounded-[var(--wz-radius-lg)] border border-[var(--wz-color-border-subtle)] bg-[var(--wz-color-bg-surface)]">
          <div className="flex flex-wrap items-center justify-between gap-1 border-b border-[var(--wz-color-border-subtle)] px-4 py-3">
            <h3 className="text-[length:var(--wz-font-size-sm)] font-semibold text-[color:var(--wz-color-text-secondary)]">
              {t("knowledge.includedLibrary", { count: project.files.length })}
            </h3>
            <p className="text-[length:var(--wz-font-size-xs)] text-[color:var(--wz-color-text-tertiary)]">
              {t("knowledge.isolated")}
            </p>
          </div>
          <ul className="divide-y divide-[var(--wz-color-border-subtle)]">
            {project.files.map((f) => {
              const Icon = kindIcon(f.kind);
              return (
                <li key={f.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex h-[var(--wz-control-height-md)] w-[var(--wz-control-height-md)] shrink-0 items-center justify-center rounded-[var(--wz-radius-md)] bg-[var(--wz-color-bg-subtle)] text-[color:var(--wz-color-text-secondary)]">
                    <AppIcon icon={Icon} size={14} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[length:var(--wz-font-size-sm)] font-medium text-[var(--wz-color-text-primary)]">
                      {f.name}
                    </p>
                    <p className="text-[length:var(--wz-font-size-xs)] text-[color:var(--wz-color-text-secondary)]">
                      {f.size} · {f.kind.toUpperCase()}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1 text-[length:var(--wz-font-size-xs)]">
                    <FileStatusBadge status={f.status} />
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t("knowledge.delete", { name: f.name })}
                      title={t("knowledge.delete", { name: f.name })}
                      onClick={() => setPendingDelete(f)}
                    >
                      <AppIcon
                        icon={IconDelete}
                        size={16}
                        className="text-[color:var(--wz-color-text-tertiary)]"
                      />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

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
      <span className="inline-flex items-center gap-1 rounded-[var(--wz-radius-sm)] bg-[var(--wz-color-status-success-subtle)] px-2 py-0.5 font-medium text-[length:var(--wz-font-size-tag)] leading-[var(--wz-line-height-tag)] text-[var(--wz-color-status-success)]">
        <AppIcon icon={IconCheckCircle} size={11} />
        {t("knowledge.indexed")}
      </span>
    );
  }
  if (status === "parsing" || status === "uploading") {
    return (
      <span className="inline-flex items-center gap-1 rounded-[var(--wz-radius-sm)] bg-[var(--wz-color-status-running-subtle)] px-2 py-0.5 font-medium text-[length:var(--wz-font-size-tag)] leading-[var(--wz-line-height-tag)] text-[var(--wz-color-status-running)]">
        <AppIcon
          icon={IconRefresh}
          size={11}
          className="animate-spin motion-reduce:animate-none"
        />
        {status === "parsing" ? t("knowledge.parsing") : t("knowledge.uploading")}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-[var(--wz-radius-sm)] bg-[var(--wz-color-status-danger-subtle)] px-2 py-0.5 font-medium text-[length:var(--wz-font-size-tag)] leading-[var(--wz-line-height-tag)] text-[var(--wz-color-status-danger)]">
      {t("knowledge.parseFailed")}
    </span>
  );
}
