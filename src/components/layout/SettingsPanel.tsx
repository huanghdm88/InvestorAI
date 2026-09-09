import { useEffect, useId, useState } from "react";

import { ChallengeTaskCard } from "@/src/components/chat/ChallengeTaskCard";
import { CompanyInfoSection } from "@/src/components/layout/CompanyInfoSection";
import { ValidationFollowUpTaskCard } from "@/src/components/layout/ValidationFollowUpTaskCard";
import { AppIcon } from "@/src/components/ui/app-icon";
import { IconChecklist, IconRefresh } from "@/src/lib/icons";
import { useLocale } from "@/src/lib/i18n";
import { cn } from "@/src/lib/utils";
import type {
  Project,
  RunningTask,
  ValidationFollowUpTask,
} from "@/src/types";

const FOLLOW_UP_REVEAL_WINDOW_MS = 1_500;
const SETTINGS_PANEL_MODULE_LOADED_AT = Date.now();
const revealedFollowUpTaskIds = new Set<string>();

interface SettingsPanelProps {
  project: Project;
  runningTasks: RunningTask[];
  followUpTasks: ValidationFollowUpTask[];
  currentConversationId?: string | null;
  onUpdate: (next: Partial<Project>) => void;
  /** 点击任务卡片：跳转到任务对应的对话 */
  onOpenTaskConversation?: (conversationId: string) => void;
  /** 用户在卡片上二次确认后取消任务 */
  onCancelTask?: (task: RunningTask) => void;
  /** 关闭当前话题内的人工跟进任务。 */
  onCloseFollowUpTask: (taskId: string) => void;
  /** 项目主页把企业信息移到主区；对话页继续在设置栏展示。 */
  showCompanyInfo?: boolean;
}

export function SettingsPanel({
  project,
  runningTasks,
  followUpTasks,
  currentConversationId,
  onUpdate,
  onOpenTaskConversation,
  onCancelTask,
  onCloseFollowUpTask,
  showCompanyInfo = true,
}: SettingsPanelProps) {
  const { t } = useLocale();
  const headingId = useId();
  const openFollowUpTasks = followUpTasks.filter((task) => task.status === "open");
  const visibleTaskCount = runningTasks.filter(
    (task) => task.conversationId !== currentConversationId
  ).length;
  const hasTaskContent = openFollowUpTasks.length > 0 || runningTasks.length > 0;

  return (
    <aside
      aria-labelledby={headingId}
      className="relative flex h-full w-full shrink-0 flex-col border-l border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-surface)]"
    >
      <div className="flex items-center border-b border-[var(--wz-color-border-default)] px-[var(--wz-space-4)] py-[var(--wz-space-3)] pr-[calc(var(--wz-space-12)+var(--wz-space-2))]">
        <div>
          <h2
            id={headingId}
            className="text-[length:var(--wz-font-size-md)] font-semibold leading-[var(--wz-line-height-tight)] text-[var(--wz-color-text-primary)]"
          >
            {t("settings.title")}
          </h2>
          <p className="mt-1 text-[length:var(--wz-font-size-xs)] leading-[var(--wz-line-height-normal)] text-[color:var(--wz-color-text-tertiary)]">
            {showCompanyInfo ? t("settings.companyInfo") : t("settings.taskInfo")}
          </p>
        </div>
      </div>

      {showCompanyInfo && <CompanyInfoSection project={project} onUpdate={onUpdate} />}

      {hasTaskContent && (
        <div className="thin-scroll min-h-0 flex-1 overflow-y-auto px-[var(--wz-space-4)] py-[var(--wz-space-4)]">
          <div className="space-y-[var(--wz-space-5)]">
            {openFollowUpTasks.length > 0 && (
              <section aria-label={t("settings.currentTopicTasksLabel")}>
                <SectionHeader
                  icon={<AppIcon icon={IconChecklist} size={12} />}
                  title={t("settings.currentTopicTasks", { count: openFollowUpTasks.length })}
                />
                <div className="grid gap-[var(--wz-space-2)]">
                  {openFollowUpTasks.map((task) => (
                    <FollowUpTaskSlot
                      key={task.id}
                      task={task}
                      onClose={onCloseFollowUpTask}
                    />
                  ))}
                </div>
              </section>
            )}

            <section aria-label={t("settings.otherRunningTasksLabel")}>
              {visibleTaskCount > 0 && (
                <SectionHeader
                  icon={
                    <AppIcon
                      icon={IconRefresh}
                      size={12}
                      className="animate-spin text-[var(--wz-color-status-running)] motion-reduce:animate-none"
                      aria-hidden="true"
                    />
                  }
                  title={t("settings.runningTasks", { count: visibleTaskCount })}
                />
              )}
              <div>
                {runningTasks.map((task) => {
                  const minimized = task.conversationId === currentConversationId;
                  return (
                    <div
                      key={task.id}
                      aria-hidden={minimized}
                      inert={minimized ? true : undefined}
                      className={cn(
                        "sidebar-task-slot",
                        minimized && "sidebar-task-slot--minimized"
                      )}
                    >
                      <div className="min-h-0 overflow-hidden">
                        <ChallengeTaskCard
                          task={task}
                          projectName={project.name}
                          onOpen={() => onOpenTaskConversation?.(task.conversationId)}
                          onCancel={onCancelTask}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      )}
    </aside>
  );
}

function FollowUpTaskSlot({
  task,
  onClose,
}: {
  task: ValidationFollowUpTask;
  onClose: (taskId: string) => void;
}) {
  const [shouldReveal] = useState(() => {
    if (revealedFollowUpTaskIds.has(task.id)) return false;

    const createdAt = new Date(task.createdAt).getTime();
    const now = Date.now();
    return (
      Number.isFinite(createdAt) &&
      createdAt >= SETTINGS_PANEL_MODULE_LOADED_AT - FOLLOW_UP_REVEAL_WINDOW_MS &&
      now - createdAt <= FOLLOW_UP_REVEAL_WINDOW_MS
    );
  });

  useEffect(() => {
    revealedFollowUpTaskIds.add(task.id);
  }, [task.id]);

  return (
    <div
      className={cn(
        "grid grid-rows-[1fr]",
        shouldReveal && "follow-up-task-slot-reveal"
      )}
    >
      <div className="min-h-0 overflow-hidden">
        <ValidationFollowUpTaskCard task={task} onClose={onClose} />
      </div>
    </div>
  );
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="mb-[var(--wz-space-2)] flex items-center gap-[var(--wz-space-2)] text-[length:var(--wz-font-size-xs)] font-semibold leading-[var(--wz-line-height-tight)] text-[color:var(--wz-color-text-secondary)]">
      {icon}
      {title}
    </div>
  );
}
