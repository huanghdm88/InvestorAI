import { useCallback, useEffect, useMemo, useState } from "react";

import { ChatComposer } from "@/src/components/chat/ChatComposer";
import { ReportSummaryCard } from "@/src/components/chat/ReportSummaryCard";
import { AnalyzingBadge } from "@/src/components/ui/analyzing-badge";
import { Button } from "@/src/components/ui/button";
import { ConfirmDialog } from "@/src/components/ui/confirm-dialog";
import { Input } from "@/src/components/ui/input";
import { AppIcon } from "@/src/components/ui/app-icon";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/src/components/ui/tabs";
import {
  KnowledgePanel,
  getKnowledgeActivity,
} from "@/src/components/layout/KnowledgePanel";
import { CompanyInfoSection } from "@/src/components/layout/CompanyInfoSection";
import {
  DecisionWorkspace,
  StageTools,
  WORKSPACE_STAGES,
  getInitialWorkspaceStage,
  getStageTools,
  type WorkspaceStage,
} from "@/src/components/project/DecisionWorkspace";
import {
  IconDelete,
  IconMenu,
  IconMessage,
  IconRefresh,
  IconRename,
  IconSidebarRight,
} from "@/src/lib/icons";
import {
  cn,
  formatRelative,
  isListedConversation,
  isProjectAnalyzing,
} from "@/src/lib/utils";
import { useLocale } from "@/src/lib/i18n";
import type { ProjectReportEntry, ReportBlock } from "@/src/lib/project-reports";
import type {
  Conversation,
  AuthRole,
  FileKind,
  KnowledgeFile,
  Project,
  QueuedChatPrompt,
} from "@/src/types";

export type ProjectHomeTab = "workspace" | "conversations" | "reports" | "knowledge";

interface ProjectHomeProps {
  project: Project;
  conversations: Conversation[];
  /** 受控主页视图（默认展示主席决策空间） */
  homeTab: ProjectHomeTab;
  onHomeTabChange: (tab: ProjectHomeTab) => void;
  /** 项目下所有对话沉淀的报告 */
  projectReports: ProjectReportEntry[];
  onOpenReport: (
    block: ReportBlock,
    meta?: { sourceLabel?: string; createdAt?: string }
  ) => void;
  /** 右侧栏开合状态（用于在项目主页也能折叠右侧栏） */
  settingsOpen: boolean;
  /** 没有任务时不显示空的设置侧栏入口。 */
  settingsAvailable?: boolean;
  onToggleSettings: () => void;
  /** 小屏打开项目导航抽屉。 */
  onOpenNavigation?: () => void;
  /** 更新主页下方展示的完整项目信息。 */
  onUpdateProject: (patch: Partial<Project>) => void;
  onOpenConversation: (conversationId: string) => void;
  onCreateConversation: (projectId: string) => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  onDeleteConversation: (id: string) => void;
  onUpdateFiles: (files: KnowledgeFile[]) => void;
  /** 项目主页输入框：发送即创建/打开草稿对话并提交首条消息 */
  onSendFromHome: (
    text: string,
    attachments: Array<{ name: string; size: string; kind: FileKind }>
  ) => void | boolean;
  generating: boolean;
  onStopGenerating?: () => void;
  queuedPrompts?: QueuedChatPrompt[];
  onEditQueuedPrompt?: (id: string, text: string) => void;
  onDeleteQueuedPrompt?: (id: string) => void;
  userRole?: AuthRole;
}

export function ProjectHome({
  project,
  conversations,
  homeTab,
  onHomeTabChange,
  projectReports,
  onOpenReport,
  settingsOpen,
  settingsAvailable = true,
  onToggleSettings,
  onOpenNavigation,
  onUpdateProject,
  onOpenConversation,
  onCreateConversation,
  onRenameConversation,
  onDeleteConversation,
  onUpdateFiles,
  onSendFromHome,
  generating,
  onStopGenerating,
  queuedPrompts = [],
  onEditQueuedPrompt,
  onDeleteQueuedPrompt,
  userRole = "investment-director",
}: ProjectHomeProps) {
  const { locale, t } = useLocale();
  const tab = homeTab;
  const setTab = onHomeTabChange;
  const [renamingConvId, setRenamingConvId] = useState<string | null>(null);
  const [convDraft, setConvDraft] = useState("");
  const [pendingDelete, setPendingDelete] = useState<Conversation | null>(null);
  const [referenceAttachment, setReferenceAttachment] = useState<{
    name: string;
    size: string;
    kind: FileKind;
  } | null>(null);
  const [referencedFileIds, setReferencedFileIds] = useState<Set<string>>(
    () => new Set()
  );
  const [workspaceStage, setWorkspaceStage] = useState<WorkspaceStage>(() =>
    getInitialWorkspaceStage(project)
  );

  useEffect(() => {
    setWorkspaceStage(getInitialWorkspaceStage(project));
  }, [project.id, project.status, project.lifecycleStage]);

  const listedConvs = useMemo(
    () =>
      conversations
        .filter((c) => c.projectId === project.id && isListedConversation(c))
        .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)),
    [conversations, project.id]
  );

  const beginRenameConv = (c: Conversation) => {
    setRenamingConvId(c.id);
    setConvDraft(c.title);
  };

  const commitRenameConv = () => {
    if (renamingConvId && convDraft.trim()) {
      onRenameConversation(renamingConvId, convDraft.trim());
    }
    setRenamingConvId(null);
    setConvDraft("");
  };

  const analyzing = isProjectAnalyzing(project);
  const knowledgeActivity = getKnowledgeActivity(project.files, project.status, locale);
  const stageTools = getStageTools(workspaceStage, project.name);
  const composerPlaceholders = useMemo(
    () =>
      userRole === "committee-lead"
        ? [t("project.placeholderReport")]
        : [t("project.placeholderVerify")],
    [t, userRole]
  );
  const handleComposerAttachmentsChange = useCallback(
    (attachments: Array<{ name: string; size: string; kind: FileKind }>) => {
      const activeAttachmentKeys = new Set(
        attachments.map(
          (attachment) =>
            `${attachment.kind}:${attachment.name}:${attachment.size}`
        )
      );
      setReferencedFileIds((current) => {
        if (current.size === 0) return current;
        const next = new Set(
          [...current].filter((fileId) => {
            const file = project.files.find((candidate) => candidate.id === fileId);
            return (
              file !== undefined &&
              activeAttachmentKeys.has(`${file.kind}:${file.name}:${file.size}`)
            );
          })
        );
        if (next.size === current.size) return current;
        return next;
      });
    },
    [project.files]
  );

  return (
    <div className="thin-scroll relative flex-1 overflow-y-auto bg-[var(--wz-color-bg-conversation)]">
      {/* 有进行中任务时提供右侧任务栏开合按钮。 */}
      {settingsAvailable && (
        <button
          type="button"
          onClick={onToggleSettings}
          className={cn(
            "absolute right-4 top-4 z-10 hidden h-[var(--wz-control-height-sm)] w-[var(--wz-control-height-sm)] shrink-0 items-center justify-center rounded-[var(--wz-radius-md)] outline-none transition-[background-color,color,box-shadow] duration-[var(--wz-duration-fast)] ease-[var(--wz-ease-standard)] focus-visible:shadow-[0_0_0_3px_var(--wz-color-focus-ring)] md:inline-flex",
            settingsOpen
              ? "bg-[var(--wz-color-bg-subtle)] text-[var(--wz-color-text-primary)]"
              : "text-[color:var(--wz-color-text-tertiary)] hover:bg-[var(--wz-color-bg-subtle)] hover:text-[var(--wz-color-text-primary)]"
          )}
          aria-label={settingsOpen ? t("workspace.collapseSettings") : t("workspace.expandSettings")}
          aria-pressed={settingsOpen}
          title={settingsOpen ? t("workspace.collapseSettings") : t("workspace.expandSettings")}
        >
          <AppIcon icon={IconSidebarRight} size={14} />
        </button>
      )}

      <button
        type="button"
        onClick={onOpenNavigation}
        className="absolute left-3 top-3 z-10 inline-flex h-[var(--wz-control-height-sm)] w-[var(--wz-control-height-sm)] items-center justify-center rounded-[var(--wz-radius-md)] text-[color:var(--wz-color-text-secondary)] outline-none transition-[background-color,color,box-shadow] duration-[var(--wz-duration-fast)] ease-[var(--wz-ease-standard)] hover:bg-[var(--wz-color-bg-subtle)] hover:text-[var(--wz-color-text-primary)] focus-visible:shadow-[0_0_0_3px_var(--wz-color-focus-ring)] md:hidden"
        aria-label={t("workspace.openNavigation")}
        title={t("workspace.openNavigation")}
      >
        <AppIcon icon={IconMenu} size={16} />
      </button>

      <div className="mx-auto w-full max-w-[1060px] px-4 pb-16 pt-14 sm:px-6 sm:pt-12">
        {/* —— 顶部：项目名 + 副信息 + 解析中徽章 —— */}
        <header className="mb-8 flex items-start justify-between gap-4 px-3 sm:px-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-[length:var(--wz-font-size-2xl)] font-semibold leading-[var(--wz-line-height-tight)] text-[var(--wz-color-text-primary)]">
                {project.name}
              </h1>
              {analyzing && <AnalyzingBadge size="md" announce />}
            </div>
            <CompanyInfoSection
              project={project}
              surface="summary"
              onUpdate={onUpdateProject}
            />
            <ProjectStageAxis
              stage={workspaceStage}
              onChange={(nextStage) => {
                setWorkspaceStage(nextStage);
                onUpdateProject({ lifecycleStage: nextStage });
                setTab("workspace");
              }}
            />
          </div>
        </header>

        {/* —— 输入框：发送即创建草稿对话 —— */}
        <ChatComposer
          onSend={(text, attachments) => onSendFromHome(text, attachments)}
          generating={generating}
          onStop={onStopGenerating ?? (() => undefined)}
          queuedPrompts={queuedPrompts}
          onEditQueuedPrompt={onEditQueuedPrompt}
          onDeleteQueuedPrompt={onDeleteQueuedPrompt}
          animatedPlaceholders={composerPlaceholders}
          showAttachmentDivider={false}
          referenceAttachment={referenceAttachment}
          onReferenceAttachmentConsumed={() => setReferenceAttachment(null)}
          onAttachmentsChange={handleComposerAttachmentsChange}
          userRole={userRole}
          className="sm:px-4"
        />

        {tab === "workspace" && (
          <>
            <StageTools
              stage={workspaceStage}
              tools={stageTools}
              reportCount={projectReports.length}
              onOpenReports={() => setTab("reports")}
              onAsk={(prompt) => onSendFromHome(prompt, [])}
            />
            <DecisionWorkspace
              project={project}
              stage={workspaceStage}
              onAsk={(prompt) => onSendFromHome(prompt, [])}
              onOpenReports={() => setTab("reports")}
              reportCount={projectReports.length}
            />
          </>
        )}

        {/* —— 二级资源：历史对话 / 历史报告 / 项目知识库 —— */}
        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as ProjectHomeTab)}
          className={cn("mt-6 min-w-0 px-3 sm:px-4", tab === "workspace" && "hidden")}
        >
          <TabsList
            className="scrollbar-hidden flex w-full max-w-full items-center justify-start gap-4 overflow-x-auto sm:gap-6"
            aria-label={t("project.contentCategories")}
          >
            <TabsTrigger
              value="conversations"
              className="shrink-0 px-1"
            >
              <span>{t("project.conversations")}</span>
              {listedConvs.length > 0 && (
                <span className="text-[length:var(--wz-font-size-xs)] font-normal text-[color:var(--wz-color-text-tertiary)]">
                  {listedConvs.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="reports"
              className="shrink-0 px-1"
            >
              <span>{t("project.reports")}</span>
              {projectReports.length > 0 && (
                <span className="text-[length:var(--wz-font-size-xs)] font-normal text-[color:var(--wz-color-text-tertiary)]">
                  {projectReports.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="knowledge"
              className="shrink-0 px-1"
            >
              <span>{t("project.knowledge")}</span>
              {knowledgeActivity ? (
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 text-[length:var(--wz-font-size-xs)] font-medium",
                    knowledgeActivity.tone === "amber"
                      ? "text-[var(--wz-color-status-running)]"
                      : "text-[var(--wz-color-status-danger)]"
                  )}
                >
                  {knowledgeActivity.spinning && (
                    <AppIcon
                      icon={IconRefresh}
                      size={10}
                      className="animate-spin motion-reduce:animate-none"
                    />
                  )}
                  <span>
                    {knowledgeActivity.label}
                    {knowledgeActivity.count > 1
                      ? ` ${knowledgeActivity.count}`
                      : ""}
                  </span>
                </span>
              ) : project.files.length > 0 ? (
                <span className="text-[length:var(--wz-font-size-xs)] font-normal text-[color:var(--wz-color-text-tertiary)]">
                  {project.files.length}
                </span>
              ) : null}
            </TabsTrigger>
          </TabsList>

          {/* 历史对话 */}
          <TabsContent value="conversations">
            {listedConvs.length === 0 ? (
              <div className="rounded-[var(--wz-radius-lg)] border border-dashed border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-surface)] px-6 py-10 text-center">
                <p className="text-[length:var(--wz-font-size-sm)] font-medium text-[color:var(--wz-color-text-secondary)]">
                  {t("project.noConversations")}
                </p>
                <p className="mt-1 text-[length:var(--wz-font-size-xs)] leading-[var(--wz-line-height-normal)] text-[color:var(--wz-color-text-tertiary)]">
                  {t("project.noConversationsHint")}
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {listedConvs.map((c) => {
                  const preview =
                    c.messages.find((m) => m.role === "user")?.text ??
                    c.messages.find((m) => m.role === "assistant")?.blocks?.find(
                      (b) => b.kind === "text"
                    )?.text ??
                    t("common.notStarted");
                  const renaming = renamingConvId === c.id;
                  return (
                    <li
                      key={c.id}
                      className="group/conv flex items-center gap-3 border-b border-[var(--wz-color-border-subtle)] px-3 py-2.5 transition-[background-color,border-color] duration-[var(--wz-duration-normal)] ease-[var(--wz-ease-standard)] last:border-b-0 hover:border-[var(--wz-color-border-default)] hover:bg-[var(--wz-color-bg-subtle)] focus-within:border-[var(--wz-color-border-default)] focus-within:bg-[var(--wz-color-bg-subtle)]"
                    >
                      <div className="flex h-8 w-6 shrink-0 items-center justify-center text-[color:var(--wz-color-text-secondary)]">
                        <AppIcon icon={IconMessage} size={17} />
                      </div>
                      <div className="min-w-0 flex-1">
                        {renaming ? (
                          <Input
                            autoFocus
                            value={convDraft}
                            onChange={(e) => setConvDraft(e.target.value)}
                            onBlur={commitRenameConv}
                            onKeyDown={(e) => {
                              if (e.key === "Enter")
                                (e.target as HTMLInputElement).blur();
                              if (e.key === "Escape") {
                                setRenamingConvId(null);
                                setConvDraft("");
                              }
                            }}
                            className="h-[var(--wz-control-height-sm)] text-[length:var(--wz-font-size-sm)]"
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => onOpenConversation(c.id)}
                            className="block w-full rounded-[var(--wz-radius-sm)] text-left outline-none focus-visible:shadow-[0_0_0_3px_var(--wz-color-focus-ring)]"
                          >
                            <p className="truncate text-[length:var(--wz-font-size-md)] font-medium text-[var(--wz-color-text-primary)]">
                              {c.title === "新对话" ? t("common.newConversation") : c.title}
                            </p>
                            <p className="mt-0.5 truncate text-[length:var(--wz-font-size-xs)] leading-[var(--wz-line-height-normal)] text-[color:var(--wz-color-text-secondary)]">
                              {String(preview).slice(0, 64)}
                            </p>
                          </button>
                        )}
                      </div>
                      <div className="relative h-[var(--wz-control-height-sm)] w-[68px] shrink-0">
                        <span className="absolute inset-0 flex items-center justify-end whitespace-nowrap text-[length:var(--wz-font-size-xs)] text-[color:var(--wz-color-text-tertiary)] transition-opacity duration-[var(--wz-duration-fast)] ease-[var(--wz-ease-standard)] group-hover/conv:opacity-0 group-focus-within/conv:opacity-0 motion-reduce:transition-none">
                          {formatRelative(c.updatedAt, locale)}
                        </span>
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-end gap-1 bg-inherit opacity-0 transition-opacity duration-[var(--wz-duration-fast)] ease-[var(--wz-ease-standard)] group-hover/conv:pointer-events-auto group-hover/conv:opacity-100 group-focus-within/conv:pointer-events-auto group-focus-within/conv:opacity-100 motion-reduce:transition-none">
                          <button
                            type="button"
                            aria-label={t("workspace.renameConversationTitle")}
                            title={t("workspace.renameConversationTitle")}
                            onClick={(e) => {
                              e.stopPropagation();
                              beginRenameConv(c);
                            }}
                            className="inline-flex h-[var(--wz-control-height-sm)] w-[var(--wz-control-height-sm)] items-center justify-center rounded-[var(--wz-radius-md)] text-[color:var(--wz-color-text-secondary)] outline-none transition-[background-color,color,box-shadow] duration-[var(--wz-duration-fast)] ease-[var(--wz-ease-standard)] hover:bg-[var(--wz-color-bg-subtle)] hover:text-[var(--wz-color-text-primary)] focus-visible:shadow-[0_0_0_3px_var(--wz-color-focus-ring)] motion-reduce:transition-none"
                          >
                            <AppIcon icon={IconRename} size={16} />
                          </button>
                          <button
                            type="button"
                            aria-label={t("sidebar.deleteConversation")}
                            title={t("sidebar.deleteConversation")}
                            onClick={(e) => {
                              e.stopPropagation();
                              setPendingDelete(c);
                            }}
                            className="inline-flex h-[var(--wz-control-height-sm)] w-[var(--wz-control-height-sm)] items-center justify-center rounded-[var(--wz-radius-md)] text-[color:var(--wz-color-text-secondary)] outline-none transition-[background-color,color,box-shadow] duration-[var(--wz-duration-fast)] ease-[var(--wz-ease-standard)] hover:bg-[var(--wz-color-status-danger-subtle)] hover:text-[var(--wz-color-status-danger)] focus-visible:shadow-[0_0_0_3px_var(--wz-color-focus-ring)] motion-reduce:transition-none"
                          >
                            <AppIcon icon={IconDelete} size={16} />
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </TabsContent>

          {/* 历史报告 */}
          <TabsContent value="reports">
            {projectReports.length === 0 ? (
              <div className="rounded-[var(--wz-radius-lg)] border border-dashed border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-surface)] px-6 py-10 text-center">
                <p className="text-[length:var(--wz-font-size-sm)] font-medium text-[color:var(--wz-color-text-secondary)]">
                  {t("project.noReports")}
                </p>
                <p className="mt-1 text-[length:var(--wz-font-size-xs)] leading-[var(--wz-line-height-normal)] text-[color:var(--wz-color-text-tertiary)]">
                  {t("project.noReportsHint")}
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {projectReports.map((entry) => {
                  const sourceLabel =
                    entry.conversationTitle ?? t("project.conversationSource");
                  return (
                    <li key={entry.id}>
                      <ReportSummaryCard
                        block={entry.block}
                        surface="conversation"
                        sourceLabel={sourceLabel}
                        createdAt={entry.createdAt}
                        onOpen={() =>
                          onOpenReport(entry.block, {
                            sourceLabel,
                            createdAt: entry.createdAt,
                          })
                        }
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </TabsContent>

          {/* 项目知识库 */}
          <TabsContent value="knowledge">
            <KnowledgePanel
              files={project.files}
              onUpdateFiles={onUpdateFiles}
              referencedFileIds={referencedFileIds}
              onReferenceFile={(file) => {
                setReferencedFileIds((current) => {
                  const next = new Set(current);
                  next.add(file.id);
                  return next;
                });
                setReferenceAttachment({
                  name: file.name,
                  size: file.size,
                  kind: file.kind,
                });
              }}
            />
          </TabsContent>
        </Tabs>
      </div>
      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title={t("sidebar.deleteConversation")}
        description={
          pendingDelete ? t("project.deleteConversationDescription", { name: pendingDelete.title }) : ""
        }
        confirmLabel={t("sidebar.deleteConversation")}
        destructive
        onConfirm={() => {
          if (pendingDelete) onDeleteConversation(pendingDelete.id);
        }}
      />
    </div>
  );
}

function ProjectStageAxis({
  stage,
  onChange,
}: {
  stage: WorkspaceStage;
  onChange: (stage: WorkspaceStage) => void;
}) {
  const currentIndex = Math.max(
    0,
    WORKSPACE_STAGES.findIndex((option) => option.id === stage)
  );
  const progress = currentIndex / Math.max(1, WORKSPACE_STAGES.length - 1);

  return (
    <div className="chair-stage-axis" role="group" aria-label="项目生命周期阶段">
      <span className="chair-stage-axis-track" aria-hidden="true">
        <span className="chair-stage-axis-progress" style={{ transform: `scaleX(${progress})` }} />
      </span>
      {WORKSPACE_STAGES.map((option, index) => {
        const isCurrent = option.id === stage;
        return (
          <button
            key={option.id}
            type="button"
            className={cn(
              "chair-stage-axis-node",
              index < currentIndex && "is-past",
              isCurrent && "is-current"
            )}
            onClick={() => onChange(option.id)}
            aria-current={isCurrent ? "step" : undefined}
            aria-label={`切换到${option.label}阶段`}
            title={`${option.label} · ${option.group}`}
          >
            <span className="chair-stage-axis-dot" aria-hidden="true" />
            <span>{option.shortLabel}</span>
          </button>
        );
      })}
    </div>
  );
}
