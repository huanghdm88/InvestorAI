import { useEffect, useId, useMemo, useRef, useState } from "react";
import { LanguageSwitcher } from "@/src/components/language-switcher";
import { Logo } from "@/src/components/logo";
import { Button } from "@/src/components/ui/button";
import { ConfirmDialog } from "@/src/components/ui/confirm-dialog";
import { Input } from "@/src/components/ui/input";
import { AppIcon } from "@/src/components/ui/app-icon";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/src/components/ui/tooltip";
import {
  IconDelete,
  IconFolder,
  IconFolderOpen,
  IconCheck,
  IconMore,
  IconPlus,
  IconRename,
  IconSignOut,
  IconSidebarCollapse,
  IconSidebarExpand,
  IconUser,
} from "@/src/lib/icons";
import { useLocale } from "@/src/lib/i18n";
import { cn, isListedConversation, isProjectAnalyzing } from "@/src/lib/utils";
import type { AuthRole, Conversation, Project } from "@/src/types";

interface SidebarProps {
  projects: Project[];
  conversations: Conversation[];
  currentProjectId: string;
  currentConversationId: string | null;
  /** 有正在跑任务的对话 id 集合 —— 行尾显示循环 loading 小图标 */
  runningConversationIds?: Set<string>;
  /** 未读对话 id 集合（任务完成时用户不在该对话页则会加入） —— 行尾显示绿点 */
  unreadConversationIds?: Set<string>;
  /** 任务已终止且用户尚未查看的对话 id 集合 —— 行尾显示红色脉动点 */
  abortedConversationIds?: Set<string>;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  onSelectProject: (id: string) => void;
  onOpenConversation: (conversationId: string) => void;
  onNewProject: () => void;
  onRenameProject: (id: string, newName: string) => void;
  onDeleteProject: (id: string) => void;
  /** 对话重命名 / 删除（侧边栏与项目主页共用同一套行为） */
  onRenameConversation: (id: string, newTitle: string) => void;
  onDeleteConversation: (id: string) => void;
  /** 退出当前应用登录态。 */
  onLogout?: () => void;
  /** 在统一演示工作区内切换登录身份。 */
  userRole?: AuthRole;
  onSwitchRole?: (role: AuthRole) => void;
}

const PROJECT_VISIBLE_LIMIT = 8;
// Keep the expanded project view useful without pushing the account controls
// below the fold; this matches the eight-item recent view capacity.
const SUBITEM_VISIBLE_LIMIT = 8;
const RECENT_LIMIT = 8;
const EXPANDED_PROJECTS_STORAGE_KEY = "invest-wise.sidebar-expanded-projects";
const EXPANDED_CONVERSATIONS_STORAGE_KEY = "invest-wise.sidebar-expanded-conversations";
const SHOW_ALL_PROJECTS_STORAGE_KEY = "invest-wise.sidebar-show-all-projects";
const MOCK_USER = {
  name: "黄海",
} as const;

function readStoredIdSet(key: string, fallback: Set<string>) {
  if (typeof window === "undefined") return fallback;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? "null");
    return Array.isArray(parsed) && parsed.every((value) => typeof value === "string")
      ? new Set(parsed)
      : fallback;
  } catch {
    return fallback;
  }
}

function readStoredBoolean(key: string) {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(key) === "true";
  } catch {
    return false;
  }
}

function OverflowFadeText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const textRef = useRef<HTMLSpanElement>(null);
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    const element = textRef.current;
    if (!element) return;

    const updateOverflow = () => {
      setOverflowing(element.scrollWidth > element.clientWidth + 1);
    };
    updateOverflow();

    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(updateOverflow);
    observer.observe(element);
    return () => observer.disconnect();
  }, [text]);

  return (
    <span
      ref={textRef}
      data-overflow-fade={overflowing || undefined}
      className={cn(
        "block min-w-0 overflow-hidden whitespace-nowrap",
        overflowing && "sidebar-overflow-fade",
        className
      )}
    >
      {text}
    </span>
  );
}

export function Sidebar({
  projects,
  conversations,
  currentProjectId,
  currentConversationId,
  runningConversationIds,
  unreadConversationIds,
  abortedConversationIds,
  collapsed = false,
  onToggleCollapsed,
  onSelectProject,
  onOpenConversation,
  onNewProject,
  onRenameProject,
  onDeleteProject,
  onRenameConversation,
  onDeleteConversation,
  onLogout,
  userRole = "investment-director",
  onSwitchRole,
}: SidebarProps) {
  const { locale, t } = useLocale();
  const displayUserName = locale === "en-US" ? "Hai Huang" : MOCK_USER.name;
  const displayUserRole = userRole === "committee-lead" ? t("sidebar.committeeLeadRole") : t("sidebar.userRole");
  const [menuId, setMenuId] = useState<string | null>(null);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  /** 对话行的更多菜单 / 重命名 inline 编辑 */
  const [convMenuId, setConvMenuId] = useState<string | null>(null);
  const [convRenameId, setConvRenameId] = useState<string | null>(null);
  const [convRenameDraft, setConvRenameDraft] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() =>
    readStoredIdSet(EXPANDED_PROJECTS_STORAGE_KEY, new Set([currentProjectId]))
  );
  const [showAllProjects, setShowAllProjects] = useState(() =>
    readStoredBoolean(SHOW_ALL_PROJECTS_STORAGE_KEY)
  );
  const [listView, setListView] = useState<"projects" | "recent">("projects");
  const [expandedAllConvs, setExpandedAllConvs] = useState<Set<string>>(() =>
    readStoredIdSet(EXPANDED_CONVERSATIONS_STORAGE_KEY, new Set())
  );
  const expandedSidebarContentId = useId();
  const listViewId = useId();
  const collapseButtonRef = useRef<HTMLButtonElement>(null);
  const expandButtonRef = useRef<HTMLButtonElement>(null);
  const restoreToggleFocusRef = useRef(false);

  const toggleCollapsed = () => {
    restoreToggleFocusRef.current = true;
    onToggleCollapsed?.();
  };

  useEffect(() => {
    if (!restoreToggleFocusRef.current) return;
    restoreToggleFocusRef.current = false;
    (collapsed ? expandButtonRef : collapseButtonRef).current?.focus();
  }, [collapsed]);
  /** 底部用户菜单的展开状态 */
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<
    | { kind: "project"; id: string; name: string }
    | { kind: "conversation"; id: string; name: string }
    | null
  >(null);

  const listedConversations = useMemo(
    () => conversations.filter(isListedConversation),
    [conversations]
  );

  useEffect(() => {
    if (!currentProjectId) return;
    setExpandedIds((prev) => {
      if (prev.has(currentProjectId)) return prev;
      const next = new Set(prev);
      next.add(currentProjectId);
      return next;
    });
  }, [currentProjectId]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        EXPANDED_PROJECTS_STORAGE_KEY,
        JSON.stringify([...expandedIds])
      );
    } catch {
      // Storage may be unavailable in private browsing; state still works in-memory.
    }
  }, [expandedIds]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        EXPANDED_CONVERSATIONS_STORAGE_KEY,
        JSON.stringify([...expandedAllConvs])
      );
      window.localStorage.setItem(
        SHOW_ALL_PROJECTS_STORAGE_KEY,
        String(showAllProjects)
      );
    } catch {
      // Storage may be unavailable in private browsing; state still works in-memory.
    }
  }, [expandedAllConvs, showAllProjects]);

  useEffect(() => {
    if (collapsed) setUserMenuOpen(false);
  }, [collapsed]);

  const rootRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setMenuId(null);
        setConvMenuId(null);
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!menuId && !convMenuId && !userMenuOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        const trigger = rootRef.current?.querySelector<HTMLElement>(
          'button[aria-expanded="true"]'
        );
        setMenuId(null);
        setConvMenuId(null);
        setUserMenuOpen(false);
        window.requestAnimationFrame(() => trigger?.focus());
        return;
      }

      if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
        return;
      }
      const menu = (event.target as HTMLElement).closest<HTMLElement>(
        '[role="menu"]'
      );
      if (!menu) return;
      const items = Array.from(
        menu.querySelectorAll<HTMLElement>('[role="menuitem"], [role="menuitemradio"]')
      ).filter((item) => !item.hasAttribute("disabled"));
      if (items.length === 0) return;
      event.preventDefault();
      const currentIndex = items.indexOf(document.activeElement as HTMLElement);
      const nextIndex =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? items.length - 1
            : event.key === "ArrowDown"
              ? (currentIndex + 1 + items.length) % items.length
              : (currentIndex - 1 + items.length) % items.length;
      items[nextIndex]?.focus();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [convMenuId, menuId, userMenuOpen]);

  useEffect(() => {
    if (!menuId && !convMenuId && !userMenuOpen) return;
    const frame = window.requestAnimationFrame(() => {
      rootRef.current
        ?.querySelector<HTMLElement>('[role="menu"] [role="menuitem"], [role="menu"] [role="menuitemradio"]')
        ?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [convMenuId, menuId, userMenuOpen]);

  const beginConvRename = (c: Conversation, rowKey: string) => {
    setConvRenameId(rowKey);
    setConvRenameDraft(c.title);
    setConvMenuId(null);
  };

  const commitConvRename = (convId: string, newTitle: string) => {
    const trimmed = newTitle.trim();
    if (trimmed) {
      onRenameConversation(convId, trimmed);
    }
    setConvRenameId(null);
    setConvRenameDraft("");
  };

  const beginRename = (p: Project) => {
    setRenameId(p.id);
    setRenameDraft(p.name);
    setMenuId(null);
  };

  const commitRename = () => {
    if (renameId && renameDraft.trim()) {
      onRenameProject(renameId, renameDraft.trim());
    }
    setRenameId(null);
    setRenameDraft("");
  };

  const convsByProject = useMemo(() => {
    const map: Record<string, Conversation[]> = {};
    for (const c of listedConversations) {
      if (!map[c.projectId]) map[c.projectId] = [];
      map[c.projectId].push(c);
    }
    for (const id of Object.keys(map)) {
      map[id].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
    }
    return map;
  }, [listedConversations]);

  const recentConversations = useMemo(
    () =>
      [...listedConversations]
        .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
        .slice(0, RECENT_LIMIT),
    [listedConversations]
  );

  useEffect(() => {
    // Keep the active panel usable if its last conversation is removed.
    if (listView === "recent" && recentConversations.length === 0) {
      setListView("projects");
    }
  }, [listView, recentConversations.length]);

  const visibleProjects = showAllProjects
    ? projects
    : projects.slice(0, PROJECT_VISIBLE_LIMIT);
  const hasMoreProjects = projects.length > PROJECT_VISIBLE_LIMIT;
  const currentProject = projects.find((project) => project.id === currentProjectId);

  const showProjectActions = (projectId: string) =>
    menuId === projectId
      ? "opacity-100"
      : "opacity-0 group-hover/project:opacity-100 group-focus-within/project:opacity-100";

  const confirmPendingDelete = () => {
    if (!pendingDelete) return;
    if (pendingDelete.kind === "project") {
      onDeleteProject(pendingDelete.id);
    } else {
      onDeleteConversation(pendingDelete.id);
    }
  };

  return (
    <aside
      ref={rootRef}
      className="relative flex h-full w-full shrink-0 flex-col overflow-hidden border-r border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-surface)] text-[var(--wz-color-text-primary)]"
    >
      <div
        id={expandedSidebarContentId}
        aria-hidden={collapsed}
        inert={collapsed ? true : undefined}
        className={cn(
          "flex min-h-0 flex-1 flex-col transition-[opacity,transform] duration-[var(--wz-duration-normal)] ease-[var(--wz-ease-standard)] motion-reduce:transition-none",
          collapsed && "pointer-events-none -translate-x-3 opacity-0 md:absolute md:inset-0"
        )}
      >
      <div className="flex h-14 shrink-0 items-center px-5">
        <Logo className="[&_span]:text-[length:var(--wz-font-size-subtitle)]" />
      </div>

      <div
        className="sidebar-scroll flex-1 overflow-y-auto px-3 pb-3 pt-1 focus-visible:rounded-[var(--wz-radius-sm)]"
        tabIndex={0}
        role="region"
        aria-label={t("sidebar.navigation")}
      >
      <div className="mb-4">
        <Button
          data-sidebar-primary-action
          variant="ghost"
          size="default"
          className="w-full justify-start px-2 text-[length:var(--wz-font-size-sm)] font-normal text-[color:var(--wz-color-text-secondary)] shadow-none"
          onClick={onNewProject}
        >
          <AppIcon icon={IconPlus} size={13} className="text-[color:var(--wz-color-text-tertiary)]" />
          {t("sidebar.newProject")}
        </Button>
      </div>

      <div
        role="tablist"
        aria-label={`${t("sidebar.projects")} / ${t("sidebar.recent")}`}
        className="mb-3 flex items-center gap-4 px-2"
      >
        {(["projects", "recent"] as const).map((view) => {
          const selected = listView === view;
          const disabled = view === "recent" && recentConversations.length === 0;
          const label = view === "projects" ? t("sidebar.projects") : t("sidebar.recent");
          const tabId = `${listViewId}-${view}-tab`;
          const panelId = `${listViewId}-${view}-panel`;

          return (
            <button
              key={view}
              id={tabId}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={panelId}
              aria-disabled={disabled || undefined}
              disabled={disabled}
              tabIndex={selected ? 0 : -1}
              onClick={() => setListView(view)}
              onKeyDown={(event) => {
                if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
                  return;
                }
                event.preventDefault();
                const views = ["projects", "recent"] as const;
                const currentIndex = views.indexOf(view);
                const nextIndex =
                  event.key === "Home"
                    ? 0
                    : event.key === "End"
                      ? views.length - 1
                      : event.key === "ArrowRight"
                        ? (currentIndex + 1) % views.length
                        : (currentIndex - 1 + views.length) % views.length;
                const nextView = views[nextIndex];
                if (nextView === "recent" && recentConversations.length === 0) return;
                setListView(nextView);
                window.requestAnimationFrame(() =>
                  document.getElementById(`${listViewId}-${nextView}-tab`)?.focus()
                );
              }}
              className={cn(
                "min-h-7 rounded-none border-0 bg-transparent px-0 no-underline text-[length:var(--wz-font-size-subtitle)] leading-[var(--wz-line-height-tight)] outline-none transition-[background-color,color,font-weight] duration-[var(--wz-duration-fast)] hover:bg-transparent active:bg-transparent focus-visible:bg-transparent focus-visible:shadow-[0_0_0_3px_var(--wz-color-focus-ring)]",
                selected
                  ? "font-semibold text-[var(--wz-color-text-primary)]"
                  : "font-normal text-[color:var(--wz-color-text-tertiary)] hover:text-[color:var(--wz-color-text-secondary)]",
                disabled && "cursor-not-allowed opacity-50",
                "motion-reduce:transition-none"
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      {listView === "projects" ? (
        <section
          id={`${listViewId}-projects-panel`}
          role="tabpanel"
          aria-labelledby={`${listViewId}-projects-tab`}
          tabIndex={0}
          className="min-w-0 outline-none"
        >
          <ul className="space-y-0.5">
        {visibleProjects.map((p) => {
          const active = p.id === currentProjectId;
          const renaming = renameId === p.id;
          const projectConvs = convsByProject[p.id] ?? [];
          const hasConvs = projectConvs.length > 0;
          // 没有历史对话时禁用展开态：图标 & 颜色都保持折叠样式
          const expanded = expandedIds.has(p.id) && hasConvs;
          const FolderIcon = expanded ? IconFolderOpen : IconFolder;
          const showAllForThis = expandedAllConvs.has(p.id);
          const visibleConvs = showAllForThis
            ? projectConvs
            : projectConvs.slice(0, SUBITEM_VISIBLE_LIMIT);
          const hasMoreConvs =
            projectConvs.length > SUBITEM_VISIBLE_LIMIT && !showAllForThis;
          const analyzing = isProjectAnalyzing(p);
          const conversationsRegionId = `sidebar-project-conversations-${p.id}`;

          const toggleExpand = () => {
            if (!hasConvs) return;
            setExpandedIds((prev) => {
              const next = new Set(prev);
              if (next.has(p.id)) next.delete(p.id);
              else next.add(p.id);
              return next;
            });
          };

          return (
            <li key={p.id}>
              {/* 项目行：使用 div 容器承载 hover/active 背景，内部拆出「图标」和「项目名」两个独立按钮 */}
              <div
                className={cn(
                  "group/project relative flex h-[42px] items-center rounded-md transition-colors",
                  active
                    ? "bg-[var(--wz-color-bg-subtle)] text-[var(--wz-color-text-primary)]"
                    : "text-[var(--wz-color-text-primary)] hover:bg-[var(--wz-color-bg-subtle)]"
                )}
              >
                {renaming ? (
                  <div className="w-full px-2 py-1">
                    <Input
                      autoFocus
                      value={renameDraft}
                      onChange={(e) => setRenameDraft(e.target.value)}
                      onBlur={commitRename}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                        if (e.key === "Escape") {
                          setRenameId(null);
                          setRenameDraft("");
                        }
                      }}
                      className="h-7 text-[length:var(--wz-font-size-body)]"
                    />
                  </div>
                ) : (
                  <>
                    {/* 左侧文件夹图标：点击展开/折叠 */}
                    <button
                      type="button"
                      disabled={!hasConvs}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!hasConvs) return;
                        toggleExpand();
                      }}
                      aria-label={
                        hasConvs
                          ? expanded
                            ? `${t("sidebar.collapseConversations")} · ${p.name}`
                            : `${t("sidebar.expandConversations")} · ${p.name}`
                          : t("sidebar.noConversations")
                      }
                      aria-expanded={hasConvs ? expanded : undefined}
                      aria-controls={hasConvs ? conversationsRegionId : undefined}
                      title={
                        hasConvs
                          ? expanded
                            ? t("sidebar.collapseHistory")
                            : t("sidebar.expandHistory")
                          : t("sidebar.noConversations")
                      }
                      className={cn(
                        "wz-icon-button flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--wz-radius-md)] outline-none transition-[background-color,box-shadow] duration-[var(--wz-duration-fast)]",
                        hasConvs
                          ? "hover:bg-[var(--wz-color-border-default)]"
                          : "cursor-default disabled:opacity-100"
                      )}
                    >
                      <AppIcon
                        icon={FolderIcon}
                        size={14}
                        className={cn(
                          expanded
                            ? "text-[var(--wz-color-text-primary)]"
                            : "text-[color:var(--wz-color-text-tertiary)]"
                        )}
                      />
                    </button>

                    {/* 项目名：点击打开项目主页 */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => onSelectProject(p.id)}
                          title={p.name}
                          aria-label={t("sidebar.openProject", { name: p.name })}
                          className={cn(
                            "flex h-full min-w-0 flex-1 items-center rounded-[var(--wz-radius-sm)] pr-10 text-left text-[length:var(--wz-font-size-sm)] outline-none"
                          )}
                        >
                          <OverflowFadeText text={p.name} />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right" sideOffset={8} className="max-w-80 break-words">
                        {p.name}
                      </TooltipContent>
                    </Tooltip>

                    {/* 解析中仅保留状态点，hover 时让位给操作按钮 */}
                    {analyzing && (
                      <div
                        className={cn(
                          "pointer-events-none absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center transition-opacity",
                          menuId === p.id
                            ? "opacity-0"
                            : "opacity-100 group-hover/project:opacity-0"
                        )}
                        role="status"
                        aria-label={t("common.analyzing")}
                        title={t("common.analyzing")}
                      >
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--wz-color-status-running)] opacity-70 motion-reduce:animate-none" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--wz-color-status-running)]" />
                        </span>
                      </div>
                    )}

                    <div
                        className={cn(
                        "absolute right-1 top-1/2 flex -translate-y-1/2 items-center gap-0.5 transition-opacity duration-[var(--wz-duration-fast)] focus-within:pointer-events-auto",
                        showProjectActions(p.id),
                        menuId === p.id
                        ? "pointer-events-auto"
                          : "pointer-events-none group-hover/project:pointer-events-auto group-focus-within/project:pointer-events-auto"
                      )}
                    >
                      <button
                        type="button"
                        className="wz-icon-button inline-flex h-8 w-8 items-center justify-center rounded-[var(--wz-radius-md)] text-[color:var(--wz-color-text-tertiary)] outline-none hover:bg-[var(--wz-color-border-default)] hover:text-[var(--wz-color-text-primary)]"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuId(menuId === p.id ? null : p.id);
                          setConvMenuId(null);
                          setUserMenuOpen(false);
                        }}
                        aria-label={t("sidebar.projectActions", { name: p.name })}
                        aria-haspopup="menu"
                        aria-expanded={menuId === p.id}
                        title={t("sidebar.moreActions")}
                      >
                        <AppIcon icon={IconMore} size={12} />
                      </button>
                    </div>

                    {menuId === p.id && (
                      <div
                        role="menu"
                        aria-label={t("sidebar.projectActions", { name: p.name })}
                        className="absolute right-1 top-full z-[var(--wz-z-dropdown)] mt-0.5 w-28 overflow-hidden rounded-[var(--wz-radius-md)] border border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-elevated)] shadow-[var(--wz-shadow-md)]"
                      >
                        <MenuButton
                          icon={<AppIcon icon={IconRename} size={11} />}
                          label={t("common.rename")}
                          onClick={() => beginRename(p)}
                        />
                        <MenuButton
                          icon={<AppIcon icon={IconDelete} size={11} />}
                          label={t("common.delete")}
                          danger
                          onClick={() => {
                            setMenuId(null);
                            setPendingDelete({
                              kind: "project",
                              id: p.id,
                              name: p.name,
                            });
                          }}
                        />
                      </div>
                    )}
                  </>
                )}
              </div>

              {!renaming && projectConvs.length > 0 && (
                <div
                  id={conversationsRegionId}
                  data-project-conversations={p.id}
                  aria-hidden={!expanded}
                  inert={!expanded}
                  className={cn(
                    "grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none",
                    expanded
                      ? "grid-rows-[1fr] opacity-100"
                      : "grid-rows-[0fr] opacity-0"
                  )}
                >
                  <div className="min-h-0 overflow-hidden">
                    <ul className="mb-1 mt-0.5 space-y-0.5">
                      {visibleConvs.map((c) => {
                        // 同一对话可能在「项目展开列表」与「最近」同时出现，
                        // 用「位置 + convId」做复合 key，避免菜单/重命名状态串扰
                        const rowKey = `proj-${p.id}:${c.id}`;
                        return (
                          <ConvRow
                            key={c.id}
                            conv={c}
                            indent
                            active={c.id === currentConversationId}
                            running={runningConversationIds?.has(c.id) ?? false}
                            unread={unreadConversationIds?.has(c.id) ?? false}
                            aborted={abortedConversationIds?.has(c.id) ?? false}
                            menuOpen={convMenuId === rowKey}
                            renaming={convRenameId === rowKey}
                            renameDraft={convRenameDraft}
                            onOpen={() => onOpenConversation(c.id)}
                            onToggleMenu={() =>
                              {
                                setConvMenuId(convMenuId === rowKey ? null : rowKey);
                                setMenuId(null);
                                setUserMenuOpen(false);
                              }
                            }
                            onBeginRename={() => beginConvRename(c, rowKey)}
                            onCommitRename={(newTitle) =>
                              commitConvRename(c.id, newTitle)
                            }
                            onCancelRename={() => {
                              setConvRenameId(null);
                              setConvRenameDraft("");
                            }}
                            onChangeRenameDraft={setConvRenameDraft}
                            onDelete={() => {
                              setConvMenuId(null);
                              setPendingDelete({
                                kind: "conversation",
                                id: c.id,
                                name: c.title,
                              });
                            }}
                          />
                        );
                      })}
                      {hasMoreConvs && (
                        <li>
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedAllConvs((prev) => {
                                if (prev.has(p.id)) return prev;
                                const next = new Set(prev);
                                next.add(p.id);
                                return next;
                              })
                            }
                            className="block w-full rounded-md py-1.5 pl-9 pr-3 text-left text-[length:var(--wz-font-size-body)] text-[color:var(--wz-color-text-tertiary)] transition-colors hover:bg-[var(--wz-color-bg-subtle)] hover:text-[color:var(--wz-color-text-secondary)]"
                          >
                            {t("common.showMore")}
                          </button>
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              )}
            </li>
          );
        })}

        {hasMoreProjects && (
          <li>
            <button
              type="button"
              onClick={() => setShowAllProjects((v) => !v)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[length:var(--wz-font-size-body)] text-[color:var(--wz-color-text-tertiary)] transition-colors hover:bg-[var(--wz-color-bg-subtle)] hover:text-[color:var(--wz-color-text-secondary)]"
            >
              <AppIcon icon={IconMore} size={14} className="text-[color:var(--wz-color-text-tertiary)]" />
              <span>{showAllProjects ? t("common.collapse") : t("common.more")}</span>
            </button>
          </li>
        )}
          </ul>
        </section>
      ) : (
        <section
          id={`${listViewId}-recent-panel`}
          role="tabpanel"
          aria-labelledby={`${listViewId}-recent-tab`}
          tabIndex={0}
          className="min-w-0 outline-none"
        >
          <ul className="space-y-0.5">
            {recentConversations.map((c) => {
              const rowKey = `recent:${c.id}`;
              return (
                <ConvRow
                  key={c.id}
                  conv={c}
                  active={c.id === currentConversationId}
                  running={runningConversationIds?.has(c.id) ?? false}
                  unread={unreadConversationIds?.has(c.id) ?? false}
                  aborted={abortedConversationIds?.has(c.id) ?? false}
                  menuOpen={convMenuId === rowKey}
                  renaming={convRenameId === rowKey}
                  renameDraft={convRenameDraft}
                  onOpen={() => onOpenConversation(c.id)}
                  onToggleMenu={() =>
                    {
                      setConvMenuId(convMenuId === rowKey ? null : rowKey);
                      setMenuId(null);
                      setUserMenuOpen(false);
                    }
                  }
                  onBeginRename={() => beginConvRename(c, rowKey)}
                  onCommitRename={(newTitle) =>
                    commitConvRename(c.id, newTitle)
                  }
                  onCancelRename={() => {
                    setConvRenameId(null);
                    setConvRenameDraft("");
                  }}
                  onChangeRenameDraft={setConvRenameDraft}
                  onDelete={() => {
                    setConvMenuId(null);
                    setPendingDelete({
                      kind: "conversation",
                      id: c.id,
                      name: c.title,
                    });
                  }}
                />
              );
            })}
          </ul>
        </section>
      )}
      </div>

      <div className="flex shrink-0 items-center justify-end border-t border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-surface)] px-3 py-2 md:justify-between">
        <button
          ref={collapseButtonRef}
          type="button"
          onClick={toggleCollapsed}
          className="wz-icon-button hidden h-8 w-8 items-center justify-center rounded-md text-[color:var(--wz-color-text-secondary)] outline-none transition-[background-color,color,box-shadow] hover:bg-[var(--wz-color-bg-subtle)] hover:text-[var(--wz-color-text-primary)] focus-visible:shadow-[0_0_0_3px_var(--wz-color-focus-ring)] md:flex"
          aria-label={t("sidebar.collapseSidebar")}
          aria-expanded={!collapsed}
          aria-controls={expandedSidebarContentId}
          title={t("sidebar.collapseSidebar")}
        >
          <AppIcon icon={IconSidebarCollapse} size={13} />
        </button>
        <LanguageSwitcher inactive={collapsed} />
      </div>

      <UserFooter
        menuOpen={userMenuOpen}
        onToggleMenu={() => {
          setUserMenuOpen((v) => !v);
          setMenuId(null);
          setConvMenuId(null);
        }}
        onLogout={() => {
          setUserMenuOpen(false);
          onLogout?.();
        }}
        userRole={userRole}
        onSwitchRole={(role) => {
          onSwitchRole?.(role);
          setUserMenuOpen(false);
        }}
      />
      </div>

      <div
        aria-hidden={!collapsed}
        inert={!collapsed ? true : undefined}
        className={cn(
          "pointer-events-none absolute inset-0 hidden h-full w-full flex-col items-center bg-[var(--wz-color-bg-surface)] px-2 py-3 opacity-0 transition-[opacity,transform] duration-[var(--wz-duration-normal)] ease-[var(--wz-ease-standard)] motion-reduce:transition-none md:flex",
          collapsed
            ? "pointer-events-auto translate-x-0 opacity-100"
            : "translate-x-3"
        )}
      >
          <Logo
            withText={false}
            markClassName="!h-8 !w-8"
          />

          <button
            type="button"
            onClick={onNewProject}
            className="wz-icon-button mt-3 flex h-9 w-9 items-center justify-center rounded-md text-[color:var(--wz-color-text-secondary)] transition-colors hover:bg-[var(--wz-color-bg-subtle)] hover:text-[var(--wz-color-text-primary)]"
            aria-label={t("sidebar.newProject")}
            title={t("sidebar.newProject")}
          >
            <AppIcon icon={IconPlus} size={14} />
          </button>

          <div className="my-3 h-px w-7 bg-[var(--wz-color-border-default)]" />

          {currentProject && (
            <button
              type="button"
              onClick={() => onSelectProject(currentProject.id)}
              className="wz-icon-button relative flex h-9 w-9 items-center justify-center rounded-md bg-[var(--wz-color-bg-subtle)] text-[var(--wz-color-text-primary)] transition-colors hover:bg-[var(--wz-color-border-default)]"
              aria-label={t("sidebar.openProject", { name: currentProject.name })}
              title={currentProject.name}
            >
              <AppIcon icon={IconFolderOpen} size={15} />
              {isProjectAnalyzing(currentProject) && (
                <span
                  className="absolute right-1 top-1 flex h-2 w-2"
                  role="status"
                  aria-label={t("common.analyzing")}
                >
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--wz-color-status-running)] opacity-70 motion-reduce:animate-none" />
                  <span className="relative inline-flex h-1.5 w-1.5 translate-x-px translate-y-px rounded-full bg-[var(--wz-color-status-running)]" />
                </span>
              )}
            </button>
          )}

          <div className="flex-1" />

          <div className="flex w-full flex-col items-center gap-2 border-t border-[var(--wz-color-border-default)] pt-3">
            <button
              ref={expandButtonRef}
              type="button"
              onClick={toggleCollapsed}
              className="wz-icon-button flex h-9 w-9 items-center justify-center rounded-md text-[color:var(--wz-color-text-secondary)] transition-colors hover:bg-[var(--wz-color-bg-subtle)] hover:text-[var(--wz-color-text-primary)]"
              aria-label={t("sidebar.expandSidebar")}
              aria-expanded={!collapsed}
              aria-controls={expandedSidebarContentId}
              title={t("sidebar.expandSidebar")}
            >
              <AppIcon icon={IconSidebarExpand} size={18} />
            </button>

            <LanguageSwitcher collapsed inactive={!collapsed} />

            <button
              type="button"
              onClick={toggleCollapsed}
              className="wz-icon-button flex h-9 w-9 items-center justify-center rounded-[var(--wz-radius-md)] text-[var(--wz-color-text-primary)] outline-none transition-[background-color,box-shadow] duration-[var(--wz-duration-fast)] hover:bg-[var(--wz-color-bg-subtle)] focus-visible:shadow-[0_0_0_3px_var(--wz-color-focus-ring)]"
              aria-label={t("sidebar.expandForAccount")}
              aria-expanded={!collapsed}
              aria-controls={expandedSidebarContentId}
              title={`${displayUserName} · ${displayUserRole}`}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--wz-color-border-strong)] bg-[var(--wz-color-bg-subtle)] text-[color:var(--wz-color-text-secondary)]">
                <AppIcon icon={IconUser} size={15} aria-hidden="true" />
              </span>
            </button>
          </div>
      </div>
      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title={pendingDelete?.kind === "project" ? t("sidebar.deleteProject") : t("sidebar.deleteConversation")}
        description={
          pendingDelete ? t("sidebar.deleteDescription", { name: pendingDelete.name }) : ""
        }
        confirmLabel={pendingDelete?.kind === "project" ? t("sidebar.deleteProject") : t("sidebar.deleteConversation")}
        destructive
        onConfirm={confirmPendingDelete}
      />
    </aside>
  );
}

/** 侧边栏底部的用户入口。未实现的占位操作不进入可交互界面。 */
function UserFooter({
  menuOpen,
  onToggleMenu,
  onLogout,
  userRole = "investment-director",
  onSwitchRole,
}: {
  menuOpen: boolean;
  onToggleMenu: () => void;
  onLogout: () => void;
  userRole?: AuthRole;
  onSwitchRole?: (role: AuthRole) => void;
}) {
  const { locale, t } = useLocale();
  const displayUserName = locale === "en-US" ? "Hai Huang" : MOCK_USER.name;
  const displayUserRole = userRole === "committee-lead" ? t("sidebar.committeeLeadRole") : t("sidebar.userRole");
  return (
    <div className="relative shrink-0 border-t border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-surface)] px-3 py-2.5">
      <button
        type="button"
        onClick={onToggleMenu}
        aria-label={t("sidebar.accountMenu", { name: displayUserName })}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        className={cn(
          "group flex w-full items-center gap-2.5 rounded-[var(--wz-radius-md)] px-1.5 py-1.5 text-left outline-none transition-[background-color,box-shadow] duration-[var(--wz-duration-fast)]",
          menuOpen
            ? "bg-[var(--wz-color-bg-subtle)]"
            : "hover:bg-[var(--wz-color-bg-subtle)]"
        )}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--wz-color-border-strong)] bg-[var(--wz-color-bg-subtle)] text-[color:var(--wz-color-text-secondary)]" aria-hidden>
          <AppIcon icon={IconUser} size={16} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block min-w-0 truncate text-[length:var(--wz-font-size-sm)] font-medium text-[var(--wz-color-text-primary)]">
            {displayUserName}
          </span>
          <span className="line-clamp-1 text-[length:var(--wz-font-size-xs)] text-[color:var(--wz-color-text-secondary)]">
            {displayUserRole}
          </span>
        </span>
        <AppIcon
          icon={IconMore}
          size={12}
          className={cn(
            "shrink-0 transition-colors",
            menuOpen
              ? "text-[color:var(--wz-color-text-secondary)]"
              : "text-[color:var(--wz-color-text-tertiary)] group-hover:text-[color:var(--wz-color-text-secondary)]"
          )}
        />
      </button>

      {menuOpen && (
        <div
          role="menu"
          aria-label={t("sidebar.accountActions")}
          className="absolute bottom-[calc(100%-6px)] left-3 right-3 z-[var(--wz-z-dropdown)] overflow-hidden rounded-[var(--wz-radius-md)] border border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-elevated)] shadow-[var(--wz-shadow-md)]"
        >
          {onSwitchRole && (
            <div className="border-b border-[var(--wz-color-border-default)] p-1.5">
              <button
                type="button"
                role="menuitemradio"
                aria-checked={userRole === "investment-director"}
                onClick={() => onSwitchRole("investment-director")}
                className={cn(
                  "flex min-h-8 w-full items-center justify-between gap-2 rounded-[var(--wz-radius-sm)] px-2 py-1.5 text-left text-[length:var(--wz-font-size-sm)] outline-none transition-colors hover:bg-[var(--wz-color-bg-subtle)] focus-visible:bg-[var(--wz-color-bg-subtle)]",
                  userRole === "investment-director"
                    ? "text-[var(--wz-color-text-primary)]"
                    : "text-[var(--wz-color-text-secondary)]"
                )}
              >
                <span>{t("auth.roleInvestmentDirector")}</span>
                {userRole === "investment-director" && <AppIcon icon={IconCheck} size={12} aria-hidden="true" />}
              </button>
              <button
                type="button"
                role="menuitemradio"
                aria-checked={userRole === "committee-lead"}
                onClick={() => onSwitchRole("committee-lead")}
                className={cn(
                  "flex min-h-8 w-full items-center justify-between gap-2 rounded-[var(--wz-radius-sm)] px-2 py-1.5 text-left text-[length:var(--wz-font-size-sm)] outline-none transition-colors hover:bg-[var(--wz-color-bg-subtle)] focus-visible:bg-[var(--wz-color-bg-subtle)]",
                  userRole === "committee-lead"
                    ? "text-[var(--wz-color-text-primary)]"
                    : "text-[var(--wz-color-text-secondary)]"
                )}
              >
                <span>{t("auth.roleCommitteeLead")}</span>
                {userRole === "committee-lead" && <AppIcon icon={IconCheck} size={12} aria-hidden="true" />}
              </button>
            </div>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={onLogout}
            className="flex min-h-8 w-full items-center gap-2 px-3 py-2 text-left text-[length:var(--wz-font-size-sm)] text-[var(--wz-color-status-danger)] outline-none transition-colors hover:bg-[var(--wz-color-status-danger-subtle)] focus-visible:bg-[var(--wz-color-status-danger-subtle)]"
          >
            <AppIcon icon={IconSignOut} size={12} />
            {t("sidebar.signOut")}
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * 对话行尾的状态指示器，优先级从高到低：
 *  - 有正在跑的任务 → 静态橙色状态点
 *  - 任务终止待确认 → 红色脉动圆点
 *  - 有未读新消息  → 绿色脉动圆点
 */
function ConvIndicator({
  running,
  unread,
  aborted,
}: {
  running: boolean;
  unread: boolean;
  aborted: boolean;
}) {
  const { t } = useLocale();
  if (running) {
    return (
      <span
        className="relative flex h-2 w-2 shrink-0"
        role="status"
        aria-live="polite"
        title={t("sidebar.taskRunning")}
      >
        <span
          aria-hidden="true"
          className="relative inline-flex h-2 w-2 rounded-full bg-[var(--wz-color-status-running)]"
        />
        <span className="sr-only">
          {t("sidebar.taskRunning")}
        </span>
      </span>
    );
  }
  if (aborted) {
    return (
      <span
        className="relative flex h-2 w-2 shrink-0"
        role="status"
        aria-live="polite"
        title={t("sidebar.taskAbortedPending")}
      >
        <span className="sr-only">{t("sidebar.taskAborted")}</span>
        <span aria-hidden="true" className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--wz-color-status-danger)] opacity-75 motion-reduce:animate-none" />
        <span aria-hidden="true" className="relative inline-flex h-2 w-2 rounded-full bg-[var(--wz-color-status-danger)]" />
      </span>
    );
  }
  if (unread) {
    return (
      <span
        className="relative flex h-2 w-2 shrink-0"
        role="status"
        aria-live="polite"
        title={t("sidebar.unreadResult")}
      >
        <span className="sr-only">{t("sidebar.unread")}</span>
        <span aria-hidden="true" className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--wz-color-status-unread)] opacity-75 motion-reduce:animate-none" />
        <span aria-hidden="true" className="relative inline-flex h-2 w-2 rounded-full bg-[var(--wz-color-status-unread)]" />
      </span>
    );
  }
  return null;
}

/**
 * 单条对话行：项目展开列表 & 「最近」 复用同一份渲染。
 * 提供 hover 出现的 ⋯ 操作菜单：重命名 / 删除（删除二次确认），重命名走 inline Input。
 */
function ConvRow({
  conv,
  indent = false,
  active,
  running,
  unread,
  aborted,
  menuOpen,
  renaming,
  renameDraft,
  onOpen,
  onToggleMenu,
  onBeginRename,
  onCommitRename,
  onCancelRename,
  onChangeRenameDraft,
  onDelete,
}: {
  conv: Conversation;
  /** 在项目展开列表里左侧有 9px 缩进对齐折叠图标 */
  indent?: boolean;
  active: boolean;
  running: boolean;
  unread: boolean;
  aborted: boolean;
  menuOpen: boolean;
  renaming: boolean;
  renameDraft: string;
  onOpen: () => void;
  onToggleMenu: () => void;
  onBeginRename: () => void;
  /** 入参为最新草稿内容，由父级负责 trim + 调用 onRenameConversation */
  onCommitRename: (newTitle: string) => void;
  onCancelRename: () => void;
  onChangeRenameDraft: (v: string) => void;
  onDelete: () => void;
}) {
  const { t } = useLocale();
  const displayTitle = conv.title === "新对话" ? t("common.newConversation") : conv.title;
  const hasIndicator = running || unread || aborted;
  return (
    <li>
      <div
        className={cn(
          "group/conv relative flex items-center rounded-md transition-colors",
          active
            ? "bg-[var(--wz-color-bg-subtle)] text-[var(--wz-color-text-primary)]"
            : "text-[color:var(--wz-color-text-secondary)] hover:bg-[var(--wz-color-bg-subtle)]"
        )}
      >
        {renaming ? (
          <div className={cn("w-full py-1", indent ? "pl-9 pr-2" : "px-2")}>
            <Input
              autoFocus
              value={renameDraft}
              onChange={(e) => onChangeRenameDraft(e.target.value)}
              onBlur={(e) => onCommitRename(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                if (e.key === "Escape") onCancelRename();
              }}
              className="h-7 text-[length:var(--wz-font-size-body)]"
            />
          </div>
        ) : (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onOpen}
                  title={displayTitle}
                  className={cn(
                    "flex min-w-0 flex-1 items-center gap-2 py-1.5 pr-10 text-left text-[length:var(--wz-font-size-body)]",
                    indent ? "pl-9" : "pl-2"
                  )}
                >
                  <OverflowFadeText text={displayTitle} className="flex-1" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8} className="max-w-80 break-words">
                {displayTitle}
              </TooltipContent>
            </Tooltip>

            <div className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2">
              <span
                className={cn(
                  "pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity",
                  hasIndicator && !menuOpen
                    ? "opacity-100 group-hover/conv:opacity-0 group-focus-within/conv:opacity-0"
                    : "opacity-0"
                )}
              >
                <ConvIndicator
                  running={running}
                  unread={unread}
                  aborted={aborted}
                />
              </span>
              <button
                type="button"
                className={cn(
                  "wz-icon-button absolute inset-0 inline-flex h-8 w-8 items-center justify-center rounded-[var(--wz-radius-md)] text-[color:var(--wz-color-text-tertiary)] outline-none transition-opacity hover:bg-[var(--wz-color-border-default)] hover:text-[var(--wz-color-text-primary)]",
                  menuOpen
                    ? "pointer-events-auto opacity-100"
                    : "pointer-events-none opacity-0 group-hover/conv:pointer-events-auto group-hover/conv:opacity-100 group-focus-within/conv:pointer-events-auto group-focus-within/conv:opacity-100"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleMenu();
                }}
                aria-label={t("sidebar.conversationActions", { name: displayTitle })}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                title={t("sidebar.moreActions")}
              >
                <AppIcon icon={IconMore} size={12} />
              </button>
            </div>

            {menuOpen && (
              <div
                role="menu"
                aria-label={t("sidebar.conversationActions", { name: displayTitle })}
                className="absolute right-1 top-full z-[var(--wz-z-dropdown)] mt-0.5 w-28 overflow-hidden rounded-[var(--wz-radius-md)] border border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-elevated)] shadow-[var(--wz-shadow-md)]"
              >
                <MenuButton
                  icon={<AppIcon icon={IconRename} size={11} />}
                  label={t("common.rename")}
                  onClick={onBeginRename}
                />
                <MenuButton
                  icon={<AppIcon icon={IconDelete} size={11} />}
                  label={t("common.delete")}
                  danger
                  onClick={onDelete}
                />
              </div>
            )}
          </>
        )}
      </div>
    </li>
  );
}

function MenuButton({
  icon,
  label,
  danger,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        "flex min-h-8 w-full items-center gap-1.5 px-2.5 py-1.5 text-left text-[length:var(--wz-font-size-xs)] outline-none hover:bg-[var(--wz-color-bg-subtle)] focus-visible:bg-[var(--wz-color-bg-subtle)]",
        danger
          ? "text-[var(--wz-color-status-danger)] hover:bg-[var(--wz-color-status-danger-subtle)]"
          : "text-[color:var(--wz-color-text-secondary)]"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
