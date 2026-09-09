import { useEffect, useRef, useState } from "react";

import { AnalyzingBadge } from "@/src/components/ui/analyzing-badge";
import { Input } from "@/src/components/ui/input";
import { AppIcon } from "@/src/components/ui/app-icon";
import {
  IconChevronLeft,
  IconMenu,
  IconRename,
  IconSidebarRight,
} from "@/src/lib/icons";
import { useLocale } from "@/src/lib/i18n";
import { cn, isProjectAnalyzing } from "@/src/lib/utils";
import type { Conversation, Project } from "@/src/types";

interface WorkspaceHeaderProps {
  project: Project;
  conversation: Conversation | null;
  settingsOpen: boolean;
  onToggleSettings: () => void;
  onRenameConversation: (newTitle: string) => void;
  /** 小屏打开项目导航抽屉。 */
  onOpenNavigation?: () => void;
  /** 点击项目名 / 返回按钮：回到项目主页 */
  onBackToProjectHome?: () => void;
}

export function WorkspaceHeader({
  project,
  conversation,
  settingsOpen,
  onToggleSettings,
  onRenameConversation,
  onOpenNavigation,
  onBackToProjectHome,
}: WorkspaceHeaderProps) {
  const { t } = useLocale();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(conversation?.title ?? "");
  const renameButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setDraft(conversation?.title ?? "");
    setEditing(false);
  }, [conversation?.id, conversation?.title]);

  const commit = () => {
    if (draft.trim() && conversation && draft.trim() !== conversation.title) {
      onRenameConversation(draft.trim());
    } else {
      setDraft(conversation?.title ?? "");
    }
    setEditing(false);
  };

  const cancelEditing = () => {
    setDraft(conversation?.title ?? "");
    setEditing(false);
    requestAnimationFrame(() => renameButtonRef.current?.focus());
  };

  const analyzing = isProjectAnalyzing(project);
  const displayConversationTitle =
    conversation?.title === "新对话"
      ? t("common.newConversation")
      : conversation?.title;

  return (
    <header className="flex items-center justify-between gap-[var(--wz-space-3)] border-b border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-surface)] px-[var(--wz-space-3)] py-[var(--wz-space-2)] sm:px-[var(--wz-space-4)]">
      <div className="flex min-w-0 items-center gap-[var(--wz-space-2)]">
        <button
          type="button"
          onClick={onOpenNavigation}
          className="inline-flex h-[var(--wz-control-height-sm)] w-[var(--wz-control-height-sm)] shrink-0 items-center justify-center rounded-[var(--wz-radius-md)] text-[color:var(--wz-color-text-secondary)] outline-none transition-[background-color,color,box-shadow] duration-[var(--wz-duration-fast)] ease-[var(--wz-ease-standard)] hover:bg-[var(--wz-color-bg-subtle)] hover:text-[var(--wz-color-text-primary)] focus-visible:shadow-[0_0_0_3px_var(--wz-color-focus-ring)] md:hidden"
          aria-label={t("workspace.openNavigation")}
          title={t("workspace.openNavigation")}
        >
          <AppIcon icon={IconMenu} size={15} />
        </button>
        <button
          type="button"
          onClick={onBackToProjectHome}
          className="inline-flex h-[var(--wz-control-height-sm)] w-[var(--wz-control-height-sm)] shrink-0 items-center justify-center rounded-[var(--wz-radius-md)] text-[color:var(--wz-color-text-secondary)] outline-none transition-[background-color,color,box-shadow] duration-[var(--wz-duration-fast)] ease-[var(--wz-ease-standard)] hover:bg-[var(--wz-color-bg-subtle)] hover:text-[var(--wz-color-text-primary)] focus-visible:shadow-[0_0_0_3px_var(--wz-color-focus-ring)] sm:h-auto sm:w-auto sm:max-w-[140px] sm:justify-start sm:truncate sm:px-[var(--wz-space-2)] sm:py-1 sm:text-[length:var(--wz-font-size-xs)]"
          aria-label={t("workspace.backToProject", { name: project.name })}
          title={t("workspace.backToProject", { name: project.name })}
        >
          <AppIcon icon={IconChevronLeft} size={13} className="sm:hidden" />
          <span className="hidden truncate sm:inline">{project.name}</span>
        </button>
        {analyzing && <AnalyzingBadge size="md" announce />}
        <span className="text-[var(--wz-color-border-strong)]" aria-hidden="true">
          /
        </span>
        {conversation ? (
          editing ? (
            <Input
              autoFocus
              aria-label={t("workspace.conversationName")}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                if (e.key === "Escape") {
                  e.preventDefault();
                  cancelEditing();
                }
              }}
              className="h-[var(--wz-control-height-sm)] max-w-[320px] text-[length:var(--wz-font-size-md)] font-semibold"
            />
          ) : (
            <button
              ref={renameButtonRef}
              type="button"
              onClick={() => setEditing(true)}
              className="group flex min-w-0 items-center gap-[var(--wz-space-1)] rounded-[var(--wz-radius-md)] px-[var(--wz-space-2)] py-[var(--wz-space-1)] text-left outline-none transition-[background-color,box-shadow] duration-[var(--wz-duration-fast)] ease-[var(--wz-ease-standard)] hover:bg-[var(--wz-color-bg-subtle)] focus-visible:shadow-[0_0_0_3px_var(--wz-color-focus-ring)]"
              aria-label={t("workspace.renameConversation", { name: displayConversationTitle ?? "" })}
              title={t("workspace.renameConversationTitle")}
            >
              <h1 className="truncate text-[length:var(--wz-font-size-subtitle)] font-semibold leading-5 text-[var(--wz-color-text-primary)]">
                {displayConversationTitle}
              </h1>
              <AppIcon
                icon={IconRename}
                size={11}
                className="text-[color:var(--wz-color-text-tertiary)] opacity-0 transition-opacity duration-[var(--wz-duration-fast)] group-hover:opacity-100 group-focus-visible:opacity-100"
              />
            </button>
          )
        ) : (
          <h1 className="truncate text-[length:var(--wz-font-size-subtitle)] font-semibold leading-5 text-[var(--wz-color-text-primary)]">
            {t("common.newConversation")}
          </h1>
        )}
      </div>

      <button
        type="button"
        onClick={onToggleSettings}
        className={cn(
          "inline-flex h-[var(--wz-control-height-sm)] w-[var(--wz-control-height-sm)] shrink-0 items-center justify-center rounded-[var(--wz-radius-md)] outline-none transition-[background-color,color,box-shadow] duration-[var(--wz-duration-fast)] ease-[var(--wz-ease-standard)] focus-visible:shadow-[0_0_0_3px_var(--wz-color-focus-ring)]",
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
    </header>
  );
}
