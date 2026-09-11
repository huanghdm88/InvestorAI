import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ManagerReportPanel, createManagerReportDraft, type ManagerReportDraft } from "./ManagerReportPanel";
import { ProjectChangesPanel } from "./ProjectChangesPanel";
import { CommitteeAnalysisQuestions } from "./CommitteeAnalysisQuestions";
import { getPendingProjectChanges } from "@/src/lib/project-changes";
import { ConversationHistory, hasVisibleConversation } from "./ConversationHistory";
import { DecisionWorkspacePanel } from "./DecisionWorkspacePanel";
import { useComposerMinimize } from "./useComposerMinimize";
import type { DecisionAction } from "@/src/types/decision";
import type { ReportSubmissionRequest, ReportSubmissionResult } from "@/src/lib/report-submission";

import { KnowledgePanel } from "@/src/components/layout/KnowledgePanel";
import { LanguageSwitcher } from "@/src/components/language-switcher";
import { Logo } from "@/src/components/logo";
import { CommitteeOverview } from "@/src/components/project/CommitteeOverview";
import { AppIcon } from "@/src/components/ui/app-icon";
import { Avatar, AvatarFallback, AvatarImage } from "@/src/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/src/components/ui/sheet";
import {
  IconArrowRight,
  IconBuilding,
  IconChevronDown,
  IconChevronLeft,
  IconClose,
  IconDatabase,
  IconFileText,
  IconFolderOpen,
  IconMenu,
  IconMessage,
  IconHistory,
  IconPlus,
  IconSearch,
  IconSettings,
  IconSidebarCollapse,
  IconSidebarExpand,
  IconDownload,
  IconUser,
} from "@/src/lib/icons";
import type { ProjectReportEntry, ReportBlock } from "@/src/lib/project-reports";
import { getProjectIdentity } from "@/src/lib/project-identity";
import { isBeforeDiligence } from "@/src/lib/project-notifications";
import { getManagerTaskLabel } from "@/src/lib/manager-tasks";
import type { ReportReviewDecision } from "@/src/lib/report-review";
import type { AuthRole, Conversation, EarlyStageKey, KnowledgeFile, Project, ProjectLifecycleStage, QuestionContext, SourceAnchor } from "@/src/types";

import "./committee-workspace.css";
import "./manager-workspace.css";

const ReportContent = lazy(() => import("@/src/components/chat/ReportContent").then((module) => ({ default: module.ReportContent })));

interface CommitteeWorkspaceProps {
  role?: AuthRole;
  onStageChange?: (stage: ProjectLifecycleStage) => void;
  onPreviewStage?: (stage: ProjectLifecycleStage) => void;
  onAdvanceStage?: (stage: ProjectLifecycleStage) => void;
  onEarlyStageSave?: (stage: EarlyStageKey, values: Record<string, string>) => void;
  notificationContent?: ReactNode;
  projectHomeActivationKey?: number;
  onDecisionAction?: (action: DecisionAction) => void;
  project: Project;
  projects: Project[];
  conversations: Conversation[];
  reports: ProjectReportEntry[];
  reviewDecisions?: Record<string, ReportReviewDecision>;
  onReviewDecision?: (key: string, decision: ReportReviewDecision | null) => void;
  onCurrentReportChange?: (id: string) => void;
  onSubmitReport?: (request: ReportSubmissionRequest) => ReportSubmissionResult;
  currentConversationId: string | null;
  conversationOpen: boolean;
  assistantActivationKey?: number;
  onSelectProject: (id: string) => void;
  onNewProject: () => void;
  onOpenConversation: (id: string) => void;
  onNewConversation: () => void;
  onCloseConversation: (startFresh?: boolean) => void;
  onLogout: () => void;
  onSwitchRole: () => void;
  onUpdateFiles: (files: KnowledgeFile[]) => void;
  onOpenReport: (block: ReportBlock) => void;
  onViewSource: (anchor: SourceAnchor) => void;
  onAsk: (context: QuestionContext) => void;
  assistantContent: ReactNode;
  composerContent?: ReactNode | ((actions?: ReactNode) => ReactNode);
  settingsContent?: ReactNode;
  openReport?: ReportBlock | null;
  onCloseReport?: () => void;
  onExportReport?: () => void;
  onDraftTask?: (text: string, file?: KnowledgeFile | KnowledgeFile[]) => void;
  onRenameConversation?: (id: string, title: string) => void;
  onDeleteConversation?: (id: string) => void;
  onReferenceFile?: (file: KnowledgeFile) => void;
}

type WorkspaceSection = "overview" | "knowledge" | "reports" | "projects";

const navigation = [
  { id: "overview", label: "项目主页", icon: IconFolderOpen },
  { id: "knowledge", label: "项目资料", icon: IconDatabase },
  { id: "reports", label: "分析报告", icon: IconFileText },
] as const;

const reportLabels: Record<ReportBlock["kind"], string> = {
  "project-work-report": "项目分析",
  "question-report": "关注问题专题",
  "fact-verification": "交叉验证",
  "challenge-list": "挑战质询",
  valuation: "估值分析",
  "enterprise-analysis": "企业分析",
  "diligence-report": "尽调报告",
};
const reportLabel = (block: ReportBlock) => block.kind === "project-work-report" ? getManagerTaskLabel(block.taskKind, block.projectStage) : reportLabels[block.kind];

const projectStatusLabels: Record<Project["status"], string> = {
  draft: "待整理资料",
  parsing: "资料处理中",
  parsed: "资料已处理",
  failed: "资料处理失败",
};

const SIDEBAR_COLLAPSED_STORAGE_KEY = "invest-wise.committee-sidebar-collapsed";

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "日期未提供";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function CommitteeWorkspace({
  role = "committee-lead",
  onStageChange,
  onPreviewStage,
  onAdvanceStage,
  onEarlyStageSave,
  notificationContent,
  projectHomeActivationKey,
  onDecisionAction,
  project,
  projects,
  conversations,
  reports,
  reviewDecisions = {},
  onReviewDecision,
  onCurrentReportChange,
  onSubmitReport,
  currentConversationId,
  conversationOpen,
  assistantActivationKey,
  onSelectProject,
  onNewProject,
  onOpenConversation,
  onNewConversation,
  onCloseConversation,
  onLogout,
  onSwitchRole,
  onUpdateFiles,
  onOpenReport,
  onViewSource,
  onAsk,
  assistantContent,
  composerContent,
  settingsContent,
  openReport,
  onCloseReport,
  onExportReport,
  onDraftTask,
  onReferenceFile,
  onRenameConversation,
  onDeleteConversation,
}: CommitteeWorkspaceProps) {
  const isManager = role === "investment-director";
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [section, setSection] = useState<WorkspaceSection>("overview");
  const [projectSearch, setProjectSearch] = useState("");
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(isManager);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });
  const lastActivationRef = useRef(assistantActivationKey);
  const [reportDrafts, setReportDrafts] = useState<Record<string, ManagerReportDraft>>({});
  const draftKey = `${role}:${project.id}:${project.lifecycleStage ?? "diligence"}`;
  const reportDraft = reportDrafts[draftKey] ?? createManagerReportDraft(project);
  const lastCompletedReportRef = useRef<Record<string, string>>({});
  const accountRef = useRef<HTMLDetailsElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const workareaRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const composerSurfaceRef = useRef<HTMLDivElement>(null);
  const launcherSurfaceRef = useRef<HTMLDivElement>(null);
  const assistantTriggerRef = useRef<HTMLButtonElement>(null);
  const mobileTriggerRef = useRef<HTMLButtonElement>(null);
  const brandTriggerRef = useRef<HTMLButtonElement>(null);
  const focusComposerAfterNavigation = useRef(false);

  useEffect(() => {
    setSection("overview");
    setHistoryOpen(false);
    setSettingsVisible(false);
    setMobileNavigationOpen(false);
  }, [projectHomeActivationKey]);

  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(sidebarCollapsed));
    } catch {
      // Navigation still works when browser storage is unavailable.
    }
  }, [sidebarCollapsed]);

  const listedConversations = useMemo(
    () => conversations
      .filter((item) => item.projectId === project.id && hasVisibleConversation(item))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [conversations, project.id],
  );
  const projectReports = useMemo(
    () => reports
      .filter((item) => item.projectId === project.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [reports, project.id],
  );
  const stageReports = projectReports.filter((entry) => ("projectStage" in entry.block ? entry.block.projectStage ?? "diligence" : "diligence") === (project.lifecycleStage ?? "diligence"));
  const reviewItems = useMemo(() => isManager ? getPendingProjectChanges(project, projectReports) : [], [isManager, project, projectReports]);
  const pendingReviews = reviewItems.filter((item) => !reviewDecisions[item.key]);
  const filteredProjects = useMemo(() => {
    const query = projectSearch.trim().toLocaleLowerCase();
    return projects.filter((item) =>
      (isManager || !isBeforeDiligence(item.currentLifecycleStage ?? item.lifecycleStage ?? "contact")) && (!query || `${item.name} ${item.industry}`.toLocaleLowerCase().includes(query)),
    );
  }, [projects, projectSearch, isManager]);
  const activeConversation = conversations.find(
    (item) => item.id === currentConversationId && item.projectId === project.id,
  );
  const isDirectory = section === "projects";
  const composerPresent = useComposerMinimize(composerOpen, !isDirectory, composerSurfaceRef, launcherSurfaceRef);
  const showPendingShortcut = project.lifecycleStage !== "decided" && pendingReviews.length > 0 && (conversationOpen || historyOpen || Boolean(openReport) || section !== "overview");

  useEffect(() => { onCurrentReportChange?.(reportDraft.selectedId); }, [reportDraft.selectedId, project.id, onCurrentReportChange]);

  useEffect(() => {
    if (!composerOpen || isDirectory || !composerRef.current) return;
    const measure = () => workareaRef.current?.style.setProperty("--manager-composer-height", `${composerRef.current?.offsetHeight ?? 160}px`);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(composerRef.current);
    return () => observer.disconnect();
  }, [composerOpen, isDirectory]);

  useEffect(() => {
    if (isDirectory || !composerRef.current) return;
    const root = document.documentElement;
    const updateDockSpace = () => {
      const dock = composerOpen ? composerRef.current : assistantTriggerRef.current;
      if (!dock) return;
      const bottom = parseFloat(getComputedStyle(composerOpen ? dock : dock.closest(".composer-launcher-position")!).bottom) || 20;
      root.style.setProperty("--project-assistant-height", `${dock.offsetHeight + bottom + 12}px`);
    };
    updateDockSpace();
    const observer = new ResizeObserver(updateDockSpace);
    observer.observe(composerRef.current);
    window.addEventListener("resize", updateDockSpace);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateDockSpace);
      root.style.removeProperty("--project-assistant-height");
    };
  }, [composerOpen, isDirectory]);

  useEffect(() => {
    setSection("overview");
    setMobileNavigationOpen(false);
    setHistoryOpen(false);
    setSettingsVisible(false);
    setComposerOpen(isManager);
  }, [project.id, role]);

  useEffect(() => {
    setReportDrafts((previous) => previous[draftKey] ? previous : { ...previous, [draftKey]: createManagerReportDraft(project) });
  }, [project, draftKey]);

  useEffect(() => {
    const latest = stageReports[0];
    if (project.lifecycleStage !== "diligence") return;
    if (!latest || lastCompletedReportRef.current[project.id] === latest.id) return;
    lastCompletedReportRef.current[project.id] = latest.id;
    const block = latest.block;
    if (block.kind !== "project-work-report" || !block.sourceReport || block.revision || (block.projectStage && block.projectStage !== "diligence")) return;
    const selectedId = block.sourceReport.id;
    setReportDrafts((previous) => ({ ...previous, [draftKey]: { ...(previous[draftKey] ?? createManagerReportDraft(project)), selectedId } }));
  }, [project.id, project.lifecycleStage, projectReports, draftKey]);

  useEffect(() => {
    if (lastActivationRef.current === assistantActivationKey) return;
    lastActivationRef.current = assistantActivationKey;
    setHistoryOpen(false); setSettingsVisible(false); setComposerOpen(true);
    const frame = window.requestAnimationFrame(() => {
      if (composerRef.current && !composerRef.current.inert) composerRef.current.querySelector("textarea")?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [assistantActivationKey]);
  useEffect(() => { if (openReport) setHistoryOpen(false); }, [openReport]);

  useEffect(() => {
    if (conversationOpen) setHistoryOpen(false);
  }, [conversationOpen, currentConversationId]);

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [section, project.id]);

  useEffect(() => {
    const closeAccount = (event: PointerEvent) => {
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) {
        accountRef.current.open = false;
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && accountRef.current?.open) {
        accountRef.current.open = false;
        accountRef.current.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("pointerdown", closeAccount);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", closeAccount);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const navigate = (next: WorkspaceSection) => {
    setSection(next);
    setMobileNavigationOpen(false);
    onCloseConversation(next === "overview" || next === "projects"); onCloseReport?.(); setHistoryOpen(false);
  };

  const openProject = (id: string) => {
    setSection("overview");
    setMobileNavigationOpen(false);
    onSelectProject(id);
  };

  const openAssistant = () => {
    focusComposerAfterNavigation.current = mobileNavigationOpen;
    setMobileNavigationOpen(false);
    setComposerOpen(true);
    window.requestAnimationFrame(() => {
      if (composerRef.current && !composerRef.current.inert) composerRef.current.querySelector("textarea")?.focus({ preventScroll: true });
    });
  };

  const collapseAssistant = () => {
    focusComposerAfterNavigation.current = false;
    setMobileNavigationOpen(false);
    setComposerOpen(false);
    window.requestAnimationFrame(() => {
      if (assistantTriggerRef.current && !assistantTriggerRef.current.closest("[inert]")) assistantTriggerRef.current.focus({ preventScroll: true });
    });
  };

  const openPendingReview = () => {
    navigate("overview");
    window.requestAnimationFrame(() => {
      const target = document.getElementById("manager-pending-changes");
      const fold = target?.closest("details");
      if (fold) fold.open = true;
      target?.scrollIntoView({ block: "start" });
    });
  };

  const ask = (context: QuestionContext) => {
    setHistoryOpen(false);
    onCloseReport?.();
    onAsk(context);
  };

  const history = <ConversationHistory conversations={listedConversations} currentId={currentConversationId} onOpen={(id) => { setHistoryOpen(false); onCloseReport?.(); onOpenConversation(id); }} onRename={onRenameConversation} onDelete={onDeleteConversation} />;
  const managerComposerActions = <>
    {showPendingShortcut && <button type="button" className="manager-pending-shortcut" onClick={openPendingReview} title={`查看 ${pendingReviews.length} 项待确认变更`}>待确认 {pendingReviews.length}</button>}
  </>;
  const composer = typeof composerContent === "function" ? composerContent(managerComposerActions) : composerContent;

  const renderNavigation = () => (
    <>
      <div className="ic-shell-sidebar-heading">
        <button className="ic-shell-back" type="button" onClick={() => navigate("projects")} aria-label="所有项目" title="所有项目">
          <AppIcon icon={IconChevronLeft} size={12} />
          <span className="ic-shell-sidebar-label">所有项目</span>
        </button>
        <button
          type="button"
          className="ic-shell-sidebar-toggle"
          aria-label={sidebarCollapsed ? "展开项目导航" : "折叠项目导航"}
          title={sidebarCollapsed ? "展开项目导航" : "折叠项目导航"}
          aria-expanded={!sidebarCollapsed}
          aria-controls="project-sidebar-navigation"
          onClick={() => setSidebarCollapsed((value) => !value)}
        >
          <AppIcon icon={sidebarCollapsed ? IconSidebarExpand : IconSidebarCollapse} size={14} />
        </button>
      </div>
      <nav className="ic-shell-navigation" aria-label="项目导航">
        {navigation.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-current={!historyOpen && !conversationOpen && !openReport && section === item.id ? "page" : undefined}
            aria-label={item.label}
            title={item.label}
            onClick={() => navigate(item.id)}
          >
            <AppIcon icon={item.icon} size={15} />
            <span className="ic-shell-sidebar-label">{item.label}</span>
          </button>
        ))}
        <button type="button" aria-label="历史对话" title="历史对话" aria-current={historyOpen ? "page" : undefined} onClick={() => { setHistoryOpen(true); setMobileNavigationOpen(false); onCloseConversation(true); onCloseReport?.(); }}><AppIcon icon={IconHistory} size={15} /><span className="ic-shell-sidebar-label">历史对话</span></button>
      </nav>
      <div className="ic-shell-sidebar-bottom">
        {isManager && <button type="button" className="manager-settings-trigger" aria-label="项目设置与任务" title="项目设置与任务" onClick={() => setSettingsVisible(true)}><AppIcon icon={IconSettings} size={15} /><span className="ic-shell-sidebar-label">项目设置与任务</span></button>}
      </div>
    </>
  );

  return (
    <div className="ic-shell">
      <header className="ic-shell-topbar">
        {!isDirectory && (
          <button
            ref={mobileTriggerRef}
            className="ic-shell-icon-button ic-shell-mobile-menu"
            type="button"
            aria-label="打开项目导航"
            onClick={() => setMobileNavigationOpen(true)}
          >
            <AppIcon icon={IconMenu} size={17} />
          </button>
        )}
        <button ref={brandTriggerRef} className="ic-shell-brand" type="button" aria-label="投资官 AI · 所有项目" onClick={() => navigate("projects")}>
          <Logo markClassName="ic-shell-logo-mark" />
        </button>
        <nav className="ic-shell-breadcrumb" aria-label="当前位置">
          <button type="button" onClick={() => navigate("projects")}>所有项目</button>
          {!isDirectory && <><span aria-hidden="true">/</span><span title={project.name}>{project.name}</span></>}
        </nav>
        <div className="ic-shell-topbar-actions">
          {notificationContent}
          <LanguageSwitcher collapsed placement="below" />
          <details className="ic-shell-account" ref={accountRef}>
            <summary aria-label="账户与工作视角">
              <Avatar key={role} className="ic-shell-avatar" aria-hidden="true">
                <AvatarImage src={isManager ? "/avatars/investment-manager.png" : "/avatars/committee-member.png"} alt="" width={29} height={29} draggable={false} />
                <AvatarFallback><AppIcon icon={IconUser} size={15} /></AvatarFallback>
              </Avatar>
              <span className="ic-shell-role">{isManager ? "投资经理" : "投委会委员"}</span>
              <AppIcon icon={IconChevronDown} size={10} />
            </summary>
            <div className="ic-shell-account-menu">
              <button type="button" onClick={() => { if (accountRef.current) accountRef.current.open = false; onSwitchRole(); }}>{isManager ? "投委会委员" : "投资经理"}</button>
              <button type="button" onClick={onLogout}>退出登录</button>
            </div>
          </details>
        </div>
      </header>

      <div className={`ic-shell-body${isDirectory ? " ic-shell-body-directory" : ""}`}>
        {!isDirectory && <aside id="project-sidebar-navigation" className={`ic-shell-sidebar${sidebarCollapsed ? " is-collapsed" : ""}`}>{renderNavigation()}</aside>}
        <div ref={workareaRef} className={`ic-manager-workarea${composerPresent ? " has-floating-composer" : !isDirectory ? " has-composer-launcher" : ""}`}>
        {!isDirectory && conversationOpen && !historyOpen && !openReport ? <section className="ic-manager-conversation" aria-label="项目助手">
          <div className="ic-manager-conversation-heading"><button type="button" className="ic-shell-icon-button" aria-label="返回项目主页" onClick={() => navigate("overview")}><AppIcon icon={IconChevronLeft} size={14} /></button><h1>{activeConversation?.title || "项目助手"}</h1></div>
          {assistantContent}
        </section> : <main className="ic-shell-main" ref={mainRef}>
          {!isDirectory && historyOpen ? (
            <div className="ic-shell-content"><div className="ic-shell-page-heading"><h1>历史对话</h1></div>{history}</div>
          ) : isManager && openReport && !isDirectory ? (
            <article className="ic-manager-report-reader"><header className="ic-manager-report-reader-header"><button className="ic-shell-icon-button" type="button" aria-label="返回分析报告" onClick={() => { onCloseReport?.(); navigate("reports"); }}><AppIcon icon={IconChevronLeft} size={15} /></button><div><h1>{openReport.title}</h1><p>{reportLabel(openReport)}</p></div><button type="button" className="ic-shell-button" onClick={onExportReport}><AppIcon icon={IconDownload} size={13} />导出</button></header><Suspense fallback={<p role="status">正在打开报告…</p>}><ReportContent key={openReport.title} block={openReport} onViewSource={onViewSource} /></Suspense></article>
          ) : isDirectory ? (
            <div className="ic-shell-directory">
              <div className="ic-shell-directory-heading">
                <div><p className="ic-shell-eyebrow">{isManager ? "投资经理 · 项目工作台" : "投委会 · 会前准备"}</p><h1>投资项目</h1></div>
                {isManager && <button className="ic-shell-button ic-shell-button-primary" type="button" onClick={onNewProject}>
                  <AppIcon icon={IconPlus} size={13} />新建项目
                </button>}
              </div>
              <div className="ic-shell-directory-toolbar">
                <label className="ic-shell-search">
                  <AppIcon icon={IconSearch} size={14} />
                  <input aria-label="搜索项目" placeholder="搜索项目名称或行业" value={projectSearch} onChange={(event) => setProjectSearch(event.target.value)} />
                  {projectSearch && <button type="button" aria-label="清除搜索" onClick={() => setProjectSearch("")}><AppIcon icon={IconClose} size={12} /></button>}
                </label>
                <span>{filteredProjects.length} 个项目</span>
              </div>
              {filteredProjects.length ? (
                <div className="ic-shell-project-grid">
                  {filteredProjects.map((item) => {
                    const identity = getProjectIdentity({ ...item, lifecycleStage: item.currentLifecycleStage ?? item.lifecycleStage });
                    return (
                    <button key={item.id} type="button" className="ic-shell-project-card" onClick={() => openProject(item.id)}>
                      <span className="ic-shell-project-card-top">
                        <span className="ic-shell-project-symbol"><AppIcon icon={IconBuilding} size={18} /></span>
                        <span className="ic-shell-project-round"><span>融资阶段</span>{identity.round}</span>
                      </span>
                      <h2>{identity.name}</h2>
                      <p>{item.industry}</p>
                      <span className="ic-shell-project-lifecycle"><span>当前状态</span><strong>{identity.status}</strong></span>
                      <span className="ic-shell-project-card-bottom">
                        <span>{item.files.length} 份资料<span aria-hidden="true"> · </span>{projectStatusLabels[item.status]}</span>
                        <AppIcon icon={IconArrowRight} size={15} />
                      </span>
                    </button>
                  );})}
                </div>
              ) : (
                <div className="ic-shell-empty"><AppIcon icon={IconFolderOpen} size={25} /><p>{projectSearch ? "没有找到匹配的项目" : "暂无项目"}</p></div>
              )}
            </div>
          ) : (
            <div className="ic-shell-content">
              {section === "overview" && (
                <CommitteeOverview
                  project={project}
                  onStageChange={onStageChange}
                  onPreviewStage={onPreviewStage}
                  onAdvanceStage={onAdvanceStage}
                  onEarlyStageSave={onEarlyStageSave}
                  onViewSource={onViewSource}
                  onAsk={ask}
                  onOpenKnowledge={() => navigate("knowledge")}
                  reasoningScopeKey={`${draftKey}:${reportDraft.selectedId}`}
                  showCurrentFocus={isManager}
                  beforeQuestions={(openReasoning) => <><ProjectChangesPanel project={project} items={isManager ? reviewItems : project.contextChanges ?? []} decisions={reviewDecisions} readOnly={!isManager} onDecide={(key, decision) => onReviewDecision?.(key, decision)} onViewSource={onViewSource} onOpenReasoning={openReasoning} />{!isManager && <CommitteeAnalysisQuestions project={project} reports={stageReports} onOpenReport={onOpenReport} onViewSource={onViewSource} onAsk={ask} onOpenReasoning={openReasoning} />}</>}
                  afterQuestions={<ManagerReportPanel key={draftKey} project={project} draft={reportDraft} readOnly={!isManager} onDraftChange={(draft) => setReportDrafts((previous) => ({ ...previous, [draftKey]: draft }))} reports={stageReports} onOpenReport={onOpenReport} onViewSource={onViewSource} />}
                  decisionContent={<DecisionWorkspacePanel key={`${project.id}:${role}`} project={project} role={role} onAction={(action) => onDecisionAction?.(action)} onAsk={ask} onViewSource={onViewSource} onDraftTask={onDraftTask} reportPanel={<ManagerReportPanel key={draftKey} project={project} draft={reportDraft} readOnly={!isManager} onDraftChange={(draft) => setReportDrafts((previous) => ({ ...previous, [draftKey]: draft }))} reports={stageReports} onOpenReport={onOpenReport} onViewSource={onViewSource} />} />}
                />
              )}
              {section === "knowledge" && (
                <section aria-labelledby="ic-knowledge-title">
                  <div className="ic-shell-page-heading"><h1 id="ic-knowledge-title">项目资料</h1></div>
                  <KnowledgePanel files={project.files} onUpdateFiles={onUpdateFiles} onReferenceFile={isManager ? (file) => { openAssistant(); onReferenceFile?.(file); } : undefined} />
                </section>
              )}
              {section === "reports" && (
                <section aria-labelledby="ic-reports-title">
                  <div className="ic-shell-page-heading"><h1 id="ic-reports-title">分析报告</h1><span>{projectReports.length} 份</span></div>
                  {projectReports.length ? (
                    <div className="ic-shell-report-list">
                      {projectReports.map((entry) => (
                        <button className="ic-shell-report-row" key={entry.id} type="button" onClick={() => onOpenReport(entry.block)}>
                          <span className="ic-shell-report-icon"><AppIcon icon={IconFileText} size={18} /></span>
                          <span className="ic-shell-report-title">{entry.block.title}</span>
                          <span className="ic-shell-report-kind">{reportLabel(entry.block)}</span>
                          <time dateTime={entry.createdAt}>{formatDate(entry.createdAt)}</time>
                          <AppIcon icon={IconArrowRight} size={13} />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="ic-shell-empty"><AppIcon icon={IconFileText} size={25} /><p>当前项目暂无分析报告</p><button className="ic-shell-button" type="button" onClick={openAssistant}>打开项目助手</button></div>
                  )}
                </section>
              )}
            </div>
          )}
        </main>}
        {!isDirectory && <>
          <div id="project-floating-composer" ref={composerRef} className="ic-manager-composer" hidden={!composerPresent} inert={!composerOpen} aria-hidden={!composerOpen} onKeyDown={(event) => {
            if (event.key !== "Escape" || event.defaultPrevented || event.nativeEvent.isComposing) return;
            event.preventDefault(); event.stopPropagation(); collapseAssistant();
          }}><div ref={composerSurfaceRef} className="ic-manager-composer-inner"><div className="ic-manager-composer-content">{composer}</div><button type="button" className="composer-minimize-action" aria-label="收起输入框" title="收起输入框" onClick={collapseAssistant}><AppIcon icon={IconChevronDown} size={14} /></button></div></div>
          <div className="composer-launcher-position" inert={composerOpen} aria-hidden={composerOpen}>
            <div ref={launcherSurfaceRef} className="composer-launcher-surface">
              <button ref={assistantTriggerRef} type="button" className="composer-launcher" aria-label="展开项目助手" title="展开项目助手" aria-expanded={composerOpen} aria-controls="project-floating-composer" tabIndex={composerOpen ? -1 : 0} onClick={openAssistant}>
                <AppIcon icon={IconMessage} size={20} />
              </button>
            </div>
          </div>
        </>}
        </div>
      </div>

      <Sheet modal={false} open={mobileNavigationOpen} onOpenChange={setMobileNavigationOpen}>
        <SheetContent side="left" className="ic-shell-mobile-sidebar" onCloseAutoFocus={(event) => {
          event.preventDefault();
          const target = focusComposerAfterNavigation.current ? (composerRef.current?.inert ? null : composerRef.current?.querySelector("textarea")) : null;
          focusComposerAfterNavigation.current = false;
          (target ?? mobileTriggerRef.current ?? brandTriggerRef.current)?.focus();
        }}>
          <SheetTitle className="sr-only">项目导航</SheetTitle>
          <SheetDescription className="sr-only">当前项目的主页、资料与分析报告</SheetDescription>
          <div className="ic-shell-mobile-project">{project.name}</div>
          {renderNavigation()}
        </SheetContent>
      </Sheet>

      {isManager && <Sheet modal={false} open={settingsVisible} onOpenChange={setSettingsVisible}><SheetContent className="w-[min(420px,100vw)] p-0"><SheetTitle className="sr-only">项目设置与任务</SheetTitle><SheetDescription className="sr-only">项目偏好、执行任务与人工跟进</SheetDescription>{settingsContent}</SheetContent></Sheet>}
    </div>
  );
}
