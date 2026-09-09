import {
  useCallback,
  useEffect,
  lazy,
  useMemo,
  useRef,
  useState,
  Suspense,
  type CSSProperties,
  type MutableRefObject,
} from "react";

import { LoginPage } from "@/src/components/auth/LoginPage";
import { ChatComposer } from "@/src/components/chat/ChatComposer";
import { MessageList } from "@/src/components/chat/MessageList";
import { QuoteViewer } from "@/src/components/chat/QuoteViewer";
import { ParsingGateDialog } from "@/src/components/chat/ParsingGateDialog";
import type { ReportDrawerMeta } from "@/src/components/chat/ReportDrawer";
import { SettingsPanel } from "@/src/components/layout/SettingsPanel";
import { Sidebar } from "@/src/components/layout/Sidebar";
import { WorkspaceHeader } from "@/src/components/layout/WorkspaceHeader";
import { ProjectHome } from "@/src/components/project/ProjectHome";
import { CommitteeWorkspace } from "@/src/components/project/CommitteeWorkspace";
import { NotificationCenter } from "@/src/components/project/NotificationCenter";
import { applyProjectUpdate, canonicalLibraryFiles, getPendingProjectChanges } from "@/src/lib/project-changes";
import type { ProjectHomeTab } from "@/src/components/project/ProjectHome";
import { AppIcon } from "@/src/components/ui/app-icon";
import { Button } from "@/src/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/src/components/ui/sheet";
import { TooltipProvider } from "@/src/components/ui/tooltip";
import {
  initialRunningTasks,
  mockConversations,
} from "@/src/data/mock-conversations";
import { mockProjects } from "@/src/data/mock-projects";
import {
  YAOJU_DEMO_TIMELINE,
  buildYaojuCrossValidationProcess,
  buildYaojuInvestmentProcess,
  buildYaojuInvestmentReportBlock,
  buildYaojuValidationReportBlock,
  isYaojuDemoKind,
  pickYaojuDemoAgentSelection,
} from "@/src/data/yaoju-validation-demo";
import {
  extractConversationReports,
  isReportBlock,
  type ReportBlock,
  type ProjectReportEntry,
} from "@/src/lib/project-reports";
import { downloadReportHtml } from "@/src/lib/report-html";
import {
  buildChallengeProcess,
  buildCrossValidationProcess,
  buildInvestmentReportProcess,
} from "@/src/lib/report-process";
import { IconSidebarRight } from "@/src/lib/icons";
import { useLocale } from "@/src/lib/i18n";
import {
  localizeConversations,
  localizeProjects,
  localizeRunningTasks,
} from "@/src/lib/content-localization";
import { cn, isListedConversation, uid } from "@/src/lib/utils";
import { buildQuestionFollowUp, buildQuestionProcess, buildQuestionResult, consumeQuestionDraft } from "@/src/lib/question-context";
import { buildManagerTaskProcess, buildManagerTaskResult, buildManagerTaskChoice, getManagerTaskIntent } from "@/src/lib/manager-tasks";
import { buildReportRevision, getDiligenceReportReviews, getSelectedReportSource, type ReportReviewDecision } from "@/src/lib/report-review";
import { applyReportSubmission, type ReportSubmissionRequest, type ReportSubmissionResult } from "@/src/lib/report-submission";
import type { ReportSourceRef } from "@/src/types";
import { advanceProjectStage, applyDecisionAction, persistProjectWorkflow, restoreProjectWorkflow, selectProjectStage, snapshotTask } from "@/src/lib/decision-workspace";
import {
  appendDiligenceNotification,
  isBeforeDiligence,
  markAllProjectNotificationsRead,
  markProjectNotificationRead,
  readProjectNotifications,
  writeProjectNotifications,
  type ProjectNotification,
} from "@/src/lib/project-notifications";
import type { TaskSnapshot } from "@/src/types/decision";
import type {
  AssistantBlock,
  AuthRole,
  AuthSession,
  ChatMessage,
  Conversation,
  FileKind,
  KnowledgeFile,
  Project,
  ProjectLifecycleStage,
  QuestionContext,
  QueuedChatPrompt,
  RunningTask,
  SourceAnchor,
  ValidationDemoDetail,
  ValidationDemoMode,
  ValidationFollowUpTaskInput,
  WorkMode,
} from "@/src/types";

const ReportDrawer = lazy(() =>
  import("@/src/components/chat/ReportDrawer").then((module) => ({
    default: module.ReportDrawer,
  }))
);
const ValidationWorkspaceDrawer = lazy(() =>
  import("@/src/components/chat/ValidationWorkspaceDrawer").then((module) => ({
    default: module.ValidationWorkspaceDrawer,
  }))
);
const ProjectWizard = lazy(() =>
  import("@/src/components/project/ProjectWizard").then((module) => ({
    default: module.ProjectWizard,
  }))
);

function DeferredSurfaceFallback({ label }: { label: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-20 items-center justify-center px-4 text-[length:var(--wz-font-size-body)] text-[color:var(--wz-color-text-secondary)]"
    >
      {label}
    </div>
  );
}

/**
 * 视图：
 *  - project-home：项目主页（主席决策空间 / 历史对话 / 报告 / 知识库）
 *  - conversation：对话详情页
 *  - new-project：新建项目向导
 */
type ViewMode = "project-home" | "conversation" | "new-project";
type AgentIntent =
  | "fact-check"
  | "challenge"
  | "investment-report"
  | "ambiguous";

const XL_VIEWPORT_QUERY = "(min-width: 1280px)";
const SIDEBAR_COLLAPSED_STORAGE_KEY = "invest-wise.sidebar-collapsed";
/** 任务总时长（毫秒）。每秒推进进度 = 100 / (秒数) */
const TASK_TOTAL_MS = 30_000;
const TASK_TICK_MS = 1_000;

function getInitialSidebarCollapsed() {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

type MessageAttachment = NonNullable<ChatMessage["attachments"]>[number];

interface ValidationCanvasState {
  detail: ValidationDemoDetail;
  taskId?: string;
  progress: number;
  /** 当前任务的真实生命周期，不能只由进度推断（取消时进度可能未到 100）。 */
  status: Extract<
    Extract<AssistantBlock, { kind: "validation-demo" }>,
    { status: string }
  >["status"];
  agentIds?: string[];
  reworkAgentId?: string;
  mode?: ValidationDemoMode;
}

/** 与 KnowledgePanel 内逻辑一致的小工具，供 handleQuickUpload 复用 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function inferFileKind(name: string): FileKind {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return "pdf";
  if (ext === "doc" || ext === "docx") return "word";
  if (ext === "ppt" || ext === "pptx") return "ppt";
  if (ext === "xls" || ext === "xlsx" || ext === "csv") return "excel";
  return "other";
}

function conversationTitleFor(
  text: string,
  attachments: MessageAttachment[],
  fallback: string
) {
  const hasUploadedDocument = attachments.length > 0;
  if (
    hasUploadedDocument &&
    (text.includes("@交叉验证") || text.includes("@cross-validation"))
  ) {
    return "曜矩智造交叉验证";
  }
  if (
    hasUploadedDocument &&
    (text.includes("@投资分析") ||
      text.includes("@投资报告") ||
      text.includes("@investment-analysis") ||
      text.includes("@investment-report"))
  ) {
    return "曜矩智造投资分析";
  }
  return text.trim().slice(0, 24) || fallback;
}

function matchesXlViewport() {
  return typeof window !== "undefined" && window.matchMedia(XL_VIEWPORT_QUERY).matches;
}

function useXlViewport() {
  const [matches, setMatches] = useState(matchesXlViewport);

  useEffect(() => {
    const mediaQuery = window.matchMedia(XL_VIEWPORT_QUERY);
    const handleChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    setMatches(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return matches;
}

function readCapturePreview() {
  if (typeof window === "undefined") return null;
  const query = new URLSearchParams(window.location.search);
  // Older capture URLs include an `edition` query parameter. It is
  // intentionally ignored now that every authenticated user enters the same
  // unified workspace.
  if (query.get("autologin") !== "1") return null;

  const viewParam = query.get("view");
  const view: ViewMode =
    viewParam === "conversation" ||
    viewParam === "new-project" ||
    viewParam === "project-home"
      ? viewParam
      : "project-home";
  const tabParam = query.get("tab");
  const homeTab: ProjectHomeTab =
    tabParam === "reports" ||
    tabParam === "knowledge" ||
    tabParam === "conversations" ||
    tabParam === "workspace"
      ? tabParam
      : "workspace";
  const conversationId = query.get("cid");
  const conversation = conversationId
    ? mockConversations.find((item) => item.id === conversationId)
    : undefined;

  const overlayParam = query.get("overlay");
  const overlay =
    overlayParam === "report" ||
    overlayParam === "validation" ||
    overlayParam === "quote"
      ? overlayParam
      : null;
  const detailParam = query.get("detail");
  const detailView: ValidationDemoDetail["view"] | null =
    detailParam === "document" ||
    detailParam === "claim-map" ||
    detailParam === "agent" ||
    detailParam === "aggregation"
      ? detailParam
      : null;
  const wizardStep: 1 | 2 = query.get("wizardStep") === "2" ? 2 : 1;
  const modeParam = query.get("mode");
  const mode: ValidationDemoMode | null =
    modeParam === "investment-analysis" || modeParam === "cross-validation"
      ? modeParam
      : null;

  if (query.get("process") === "1") {
    try {
      window.localStorage.setItem(
        "invest-wise:collapse-process:cross-validation",
        "false"
      );
      window.localStorage.setItem(
        "invest-wise:collapse-process:investment-analysis",
        "false"
      );
      window.localStorage.removeItem("invest-wise:open-stages:cross-validation");
      window.localStorage.removeItem(
        "invest-wise:open-stages:investment-analysis"
      );
    } catch {
      // Capture previews should still render if storage is unavailable.
    }
  }

  return {
    view: conversation ? ("conversation" as const) : view,
    role: (query.get("role") === "investment-director" ? "investment-director" : "committee-lead") as AuthRole,
    homeTab,
    conversationId: conversation?.id ?? null,
    projectId: conversation?.projectId ?? mockProjects[0]?.id ?? "",
    settingsOpen: query.get("settings") === "1",
    overlay,
    detailView,
    wizardStep,
    mode,
  };
}

function App() {
  const { locale, t } = useLocale();
  const capturePreview = useMemo(() => readCapturePreview(), []);
  const [authSession, setAuthSession] = useState<AuthSession | null>(
    capturePreview ? { authenticated: true, role: capturePreview.role } : null
  );

  const [projects, setProjects] = useState<Project[]>(() => restoreProjectWorkflow(mockProjects));
  const [projectNotifications, setProjectNotifications] = useState<ProjectNotification[]>(readProjectNotifications);
  const [projectHomeActivationKey, setProjectHomeActivationKey] = useState(0);
  const [conversations, setConversations] = useState<Conversation[]>(mockConversations);
  const [runningTasks, setRunningTasks] = useState<RunningTask[]>(initialRunningTasks);
  const [queuedPrompts, setQueuedPrompts] = useState<QueuedChatPrompt[]>([]);

  const requestedProjectId = capturePreview?.projectId || mockProjects[0]?.id || "";
  const requestedProject = projects.find((project) => project.id === requestedProjectId);
  const initialProjectId = capturePreview?.role === "committee-lead" && requestedProject && isBeforeDiligence(requestedProject.currentLifecycleStage ?? requestedProject.lifecycleStage ?? "contact")
    ? projects.find((project) => !isBeforeDiligence(project.currentLifecycleStage ?? project.lifecycleStage ?? "contact"))?.id ?? requestedProjectId
    : requestedProjectId;

  const [currentProjectId, setCurrentProjectId] = useState<string>(initialProjectId);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(
    capturePreview?.conversationId ?? null
  );
  // 默认从项目主页进入
  const [view, setView] = useState<ViewMode>(capturePreview?.view ?? "project-home");

  const [generating, setGenerating] = useState(false);
  const [composerReset, setComposerReset] = useState<{ conversationId: string; key: string } | null>(null);
  const [managerHomeDrafts, setManagerHomeDrafts] = useState<Record<string, { text: string; attachments: MessageAttachment[] }>>({});
  const homeDraftKey = `${authSession?.role ?? "investment-director"}:${currentProjectId}`;
  const [managerReferenceFile, setManagerReferenceFile] = useState<KnowledgeFile | null>(null);
  const [assistantActivationKey, setAssistantActivationKey] = useState(0);
  const [reportReviewState, setReportReviewState] = useState<{ decisions: Record<string, ReportReviewDecision>; versions: ProjectReportEntry[] }>({ decisions: {}, versions: [] });
  const [selectedReportIds, setSelectedReportIds] = useState<Record<string, string>>({});
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(getInitialSidebarCollapsed);
  const mobileNavigationTriggerRef = useRef<HTMLElement | null>(null);
  const settingsTriggerRef = useRef<HTMLElement | null>(null);
  const reportDrawerTriggerRef = useRef<HTMLElement | null>(null);
  const quoteViewerTriggerRef = useRef<HTMLElement | null>(null);
  const validationWorkspaceTriggerRef = useRef<HTMLElement | null>(null);
  const isXlViewport = useXlViewport();
  const [viewerAnchor, setViewerAnchor] = useState<SourceAnchor | null>(null);
  /** 任务完成时如果用户不在当前对话页，把对话 id 标记为未读，UI 上显示绿点 */
  const [unreadConvIds, setUnreadConvIds] = useState<Set<string>>(() => new Set());
  /** 用户已确认过的「任务终止」对话 id；首次点击进入该对话后写入，红点立刻消失 */
  const [acknowledgedAbortedConvIds, setAcknowledgedAbortedConvIds] = useState<
    Set<string>
  >(() => new Set());
  /** 长任务刚刚注入到对话流的报告消息 id；MessageList 会让对应报告卡片走一次 yellow fade 动画 */
  const [newReportMsgIds, setNewReportMsgIds] = useState<Set<string>>(() => new Set());
  const [homeTab, setHomeTab] = useState<ProjectHomeTab>(
    capturePreview?.homeTab ?? "workspace"
  );
  /**
   * 项目知识库仍在解析时，用户发起 fact-check / challenge 会先弹窗提示。
   * 取消时所有副作用（新建对话、写入用户消息）都不会发生；
   * 「继续执行」时按 conversationId 是否为 null 决定是否新建草稿对话，并补写用户消息。
   */
  const [pendingTask, setPendingTask] = useState<
    | {
        kind: Exclude<AgentIntent, "ambiguous">;
        /** 目标对话 id；为 null 表示「继续」时需要先 openOrCreateDraftFor */
        conversationId: string | null;
        projectId: string;
        userQuery: string;
        attachments?: MessageAttachment[];
        /** 待写入的用户消息；取消时丢弃，避免在对话流留下半截气泡 */
        userMsg?: ChatMessage;
        taskSnapshot?: TaskSnapshot;
      }
    | null
  >(null);

  // 桌面端每次进入默认展开任务 / 项目设置栏；窄屏仍按需使用 Sheet。
  const [settingsOpen, setSettingsOpen] = useState<boolean>(
    capturePreview?.settingsOpen ?? matchesXlViewport()
  );
  const previousXlViewportRef = useRef(matchesXlViewport());
  const sendInConversationRef = useRef<
    ((conversationId: string, text: string, attachments: MessageAttachment[], questionContext?: QuestionContext, userRole?: AuthRole, reportSource?: ReportSourceRef, taskSnapshot?: TaskSnapshot) => void) | null
  >(null);
  const queueDispatchScheduledRef = useRef<string | null>(null);
  const cancelledQueuedPromptIdsRef = useRef<Set<string>>(new Set());
  const completionTimersRef = useRef<Map<string, number>>(new Map());
  const cancelledTaskIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => { writeProjectNotifications(projectNotifications); }, [projectNotifications]);
  useEffect(() => { persistProjectWorkflow(projects); }, [projects]);

  const cancelTaskLifecycle = useCallback((taskId: string) => {
    cancelledTaskIdsRef.current.add(taskId);
    const timerId = completionTimersRef.current.get(taskId);
    if (timerId !== undefined) {
      window.clearTimeout(timerId);
      completionTimersRef.current.delete(taskId);
    }
    // Keep the marker through the current event turn in case a callback was
    // already queued, then release it whether or not a timer existed.
    window.setTimeout(() => cancelledTaskIdsRef.current.delete(taskId), 0);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        SIDEBAR_COLLAPSED_STORAGE_KEY,
        String(sidebarCollapsed)
      );
    } catch {
      // Storage can be unavailable in private or embedded browsing contexts.
    }
  }, [sidebarCollapsed]);

  useEffect(() => {
    const wasXlViewport = previousXlViewportRef.current;
    if (!isXlViewport) {
      setSettingsOpen(false);
    } else if (!wasXlViewport) {
      // matchMedia can settle after the first render (notably in an embedded
      // browser). Re-open the desktop rail when crossing into the desktop
      // layout, while leaving an intentional user collapse untouched.
      setSettingsOpen(true);
    }
    previousXlViewportRef.current = isXlViewport;
  }, [isXlViewport]);

  useEffect(
    () => () => {
      completionTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
      completionTimersRef.current.clear();
    },
    []
  );

  const rememberTrigger = (ref: MutableRefObject<HTMLElement | null>) => {
    if (document.activeElement instanceof HTMLElement) {
      ref.current = document.activeElement;
    }
  };

  const toggleSettings = () => {
    if (!settingsOpen) rememberTrigger(settingsTriggerRef);
    setSettingsOpen((value) => !value);
  };

  const openMobileNavigation = () => {
    rememberTrigger(mobileNavigationTriggerRef);
    setSettingsOpen(false);
    setMobileSidebarOpen(true);
  };

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 768px)");
    const closeMobileNavigation = (event: MediaQueryListEvent) => {
      if (event.matches) setMobileSidebarOpen(false);
    };
    mediaQuery.addEventListener("change", closeMobileNavigation);
    return () => mediaQuery.removeEventListener("change", closeMobileNavigation);
  }, []);

  const [openReport, setOpenReport] = useState<ReportBlock | null>(null);
  const [openReportMeta, setOpenReportMeta] = useState<ReportDrawerMeta | null>(
    null
  );
  const [validationCanvas, setValidationCanvas] =
    useState<ValidationCanvasState | null>(null);

  useEffect(() => {
    if (!capturePreview?.overlay) return;
    if (capturePreview.overlay === "report") {
      const reports = extractConversationReports(
        capturePreview.projectId,
        mockConversations
      );
      const preferred =
        reports.find((item) => item.block.kind === "diligence-report") ??
        reports[0];
      if (!preferred) return;
      setOpenReport(preferred.block);
      setOpenReportMeta({
        sourceLabel: preferred.conversationTitle,
        createdAt: preferred.createdAt,
      });
      return;
    }
    if (capturePreview.overlay === "validation") {
      const view = capturePreview.detailView ?? "claim-map";
      const mode =
        capturePreview.mode ??
        (view === "agent" ? "investment-analysis" : "cross-validation");
      setValidationCanvas({
        detail: {
          view,
          agentId: view === "agent" ? "finance" : undefined,
        },
        progress: 100,
        status: "completed",
        mode,
        agentIds: [
          "finance",
          "customer",
          "technology",
          "market",
          "legal",
          "valuation",
        ],
      });
      return;
    }
    const factBlock = mockConversations
      .find((item) => item.id === "conv-aurora-fact")
      ?.messages.flatMap((message) =>
        message.role === "assistant" ? message.blocks ?? [] : []
      )
      .find((block) => block.kind === "fact-verification");
    if (factBlock?.kind === "fact-verification" && factBlock.anchors[0]) {
      setViewerAnchor(factBlock.anchors[0]);
    }
  }, [capturePreview]);

  const currentProject = useMemo(
    () => projects.find((p) => p.id === currentProjectId) ?? projects[0],
    [projects, currentProjectId]
  );

  const currentConversation = useMemo(
    () => conversations.find((c) => c.id === currentConversationId) ?? null,
    [conversations, currentConversationId]
  );

  const localizedProjects = useMemo(
    () => localizeProjects(projects, locale),
    [locale, projects]
  );

  const localizedConversations = useMemo(
    () => localizeConversations(conversations, locale),
    [conversations, locale]
  );

  const localizedRunningTasks = useMemo(
    () => localizeRunningTasks(runningTasks, locale),
    [locale, runningTasks]
  );

  const localizedCurrentProject = useMemo(
    () =>
      localizedProjects.find((project) => project.id === currentProjectId) ??
      localizedProjects[0],
    [currentProjectId, localizedProjects]
  );

  const localizedCurrentConversation = useMemo(
    () =>
      localizedConversations.find(
        (conversation) => conversation.id === currentConversationId
      ) ?? null,
    [currentConversationId, localizedConversations]
  );

  const localizedMessages = localizedCurrentConversation?.messages ?? [];

  const localizedCurrentProjectRunningTasks = useMemo(
    () =>
      localizedRunningTasks.filter(
        (task) => task.projectId === currentProjectId
      ),
    [currentProjectId, localizedRunningTasks]
  );

  const localizedCurrentConversationRunningTasks = useMemo(
    () =>
      currentConversationId
        ? localizedRunningTasks.filter(
            (task) => task.conversationId === currentConversationId
          )
        : [],
    [currentConversationId, localizedRunningTasks]
  );

  const localizedCurrentConversationFollowUpTasks =
    localizedCurrentConversation?.followUpTasks ?? [];

  const projectReports = useMemo(
    () => [...extractConversationReports(currentProjectId, localizedConversations), ...reportReviewState.versions.filter((entry) => entry.projectId === currentProjectId)],
    [currentProjectId, localizedConversations, reportReviewState.versions]
  );

  const handleReportReviewDecision = (key: string, decision: ReportReviewDecision | null) => {
    const project = projects.find((entry) => entry.id === currentProjectId);
    if (authSession?.role !== "investment-director" || project?.lifecycleStage !== "diligence") return;
    const allChanges = getPendingProjectChanges(project, projectReports, true);
    const items = getDiligenceReportReviews(project, projectReports, true);
    const item = allChanges.find((entry) => entry.key === key);
    if (!item) return;
    const id = uid("report-revision");
    const createdAt = new Date().toISOString();
    setReportReviewState((previous) => {
      if ((previous.decisions[key] ?? null) === decision) return previous;
      const decisions = { ...previous.decisions };
      if (decision) decisions[key] = decision;
      else delete decisions[key];
      const saveRevision = "sourceReport" in item && (decision === "accepted" || previous.decisions[key] === "accepted");
      const revision: ProjectReportEntry | undefined = saveRevision ? { id, projectId: item.projectId, source: "manager-revision", createdAt, block: buildReportRevision(item.sourceReport, items, decisions) } : undefined;
      return { decisions, versions: revision ? [revision, ...previous.versions] : previous.versions };
    });
  };

  const activeReportSourceFor = (projectId: string) => {
    const project = projects.find((item) => item.id === projectId);
    if (project?.lifecycleStage === "decided") return project.decision?.approvedReport;
    return project ? getSelectedReportSource(project, [...extractConversationReports(projectId, conversations), ...reportReviewState.versions], selectedReportIds[projectId]) : undefined;
  };
  const taskSnapshotFor = (projectId: string) => {
    const project = projects.find((item) => item.id === projectId);
    return project ? snapshotTask(project, authSession?.role, activeReportSourceFor(projectId)) : undefined;
  };

  const handleOpenReport = useCallback(
    (block: ReportBlock, meta?: ReportDrawerMeta) => {
      if (document.activeElement instanceof HTMLElement) {
        reportDrawerTriggerRef.current = document.activeElement;
      }
      setOpenReport(block);
      setOpenReportMeta(meta ?? null);
    },
    []
  );

  const handleViewSource = useCallback((anchor: SourceAnchor) => {
    if (document.activeElement instanceof HTMLElement) {
      quoteViewerTriggerRef.current = document.activeElement;
    }
    setViewerAnchor(anchor);
  }, []);

  /** 哪些对话当前有正在跑的任务（用于侧边栏显示小 loading 动画） */
  const runningConvIds = useMemo(() => {
    const set = new Set<string>();
    runningTasks.forEach((t) => set.add(t.conversationId));
    return set;
  }, [runningTasks]);

  /**
   * 派生：当前有「分析终止」未被用户确认的对话 id 集合。
   * 数据源是 conversations 中是否包含 analysis-aborted 类型的 assistant block；
   * 用户进入该对话后会被加入 acknowledgedAbortedConvIds，红点消失。
   */
  const abortedConvIds = useMemo(() => {
    const set = new Set<string>();
    conversations.forEach((c) => {
      if (acknowledgedAbortedConvIds.has(c.id)) return;
      const hasAborted = c.messages.some(
        (m) =>
          m.role === "assistant" &&
          m.blocks?.some((b) => b.kind === "analysis-aborted")
      );
      if (hasAborted) set.add(c.id);
    });
    return set;
  }, [conversations, acknowledgedAbortedConvIds]);

  /** 进入一个对话时，自动清理它的未读标记，并把「任务终止」红点也一并清掉 */
  useEffect(() => {
    if (!currentConversationId) return;
    setUnreadConvIds((prev) => {
      if (!prev.has(currentConversationId)) return prev;
      const next = new Set(prev);
      next.delete(currentConversationId);
      return next;
    });
    setAcknowledgedAbortedConvIds((prev) => {
      if (prev.has(currentConversationId)) return prev;
      const next = new Set(prev);
      next.add(currentConversationId);
      return next;
    });
  }, [currentConversationId]);

  // —— 项目操作 ——
  const updateProject = (patch: Partial<Project>) => {
    const changeId = uid("context-change");
    const at = new Date().toISOString();
    setProjects((prev) =>
      prev.map((p) =>
        p.id === currentProjectId
          ? applyProjectUpdate(p, patch, changeId, at)
          : p
      )
    );
  };

  const renameProject = (id: string, newName: string) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, name: newName, updatedAt: new Date().toISOString() } : p
      )
    );
  };

  const deleteProject = (id: string) => {
    runningTasks
      .filter((task) => task.projectId === id)
      .forEach((task) => cancelTaskLifecycle(task.id));
    queuedPrompts
      .filter((prompt) => prompt.projectId === id)
      .forEach((prompt) => cancelledQueuedPromptIdsRef.current.add(prompt.id));
    setProjects((prev) => prev.filter((p) => p.id !== id));
    setConversations((prev) => prev.filter((c) => c.projectId !== id));
    setRunningTasks((prev) => prev.filter((t) => t.projectId !== id));
    setQueuedPrompts((prev) => prev.filter((prompt) => prompt.projectId !== id));
    if (id === currentProjectId) {
      const remaining = projects.filter((p) => p.id !== id);
      if (remaining.length > 0) {
        const nextProjectId = remaining[0].id;
        setCurrentProjectId(nextProjectId);
        setCurrentConversationId(null);
        setView("project-home");
      } else {
        setCurrentConversationId(null);
        setView("new-project");
      }
    }
  };

  // —— 子对话操作 ——
  const renameConversation = (id: string, newTitle: string) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, title: newTitle, updatedAt: new Date().toISOString() } : c
      )
    );
  };

  const handleCommitteeDraftTextChange = useCallback((text: string) => {
    if (!currentConversationId) return;
    setConversations((previous) => {
      const conversation = previous.find((item) => item.id === currentConversationId);
      if (!conversation || (conversation.draftText ?? "") === text) return previous;
      return previous.map((item) => item.id === currentConversationId
        ? { ...item, draftText: text, updatedAt: new Date().toISOString() }
        : item);
    });
  }, [currentConversationId]);

  const consumeConversationDraft = (conversationId: string) => {
    setConversations((previous) => consumeQuestionDraft(previous, conversationId));
    setComposerReset({ conversationId, key: uid("sent-draft") });
  };

  const deleteConversation = (id: string) => {
    runningTasks
      .filter((task) => task.conversationId === id)
      .forEach((task) => cancelTaskLifecycle(task.id));
    queuedPrompts
      .filter((prompt) => prompt.conversationId === id)
      .forEach((prompt) => cancelledQueuedPromptIdsRef.current.add(prompt.id));
    setConversations((prev) => prev.filter((c) => c.id !== id));
    setRunningTasks((prev) => prev.filter((t) => t.conversationId !== id));
    setQueuedPrompts((prev) => prev.filter((prompt) => prompt.conversationId !== id));
    if (currentConversationId === id) {
      setCurrentConversationId(null);
      setView("project-home");
    }
  };

  const handleAddValidationFollowUpTask = useCallback(
    (input: ValidationFollowUpTaskInput) => {
      if (!currentConversationId) return;

      const createdAt = new Date().toISOString();
      setConversations((prev) =>
        prev.map((conversation) => {
          if (conversation.id !== currentConversationId) return conversation;
          const followUpTasks = conversation.followUpTasks ?? [];
          if (
            followUpTasks.some(
              (task) =>
                task.sourceKey === input.sourceKey && task.status === "open"
            )
          ) {
            return conversation;
          }
          return {
            ...conversation,
            followUpTasks: [
              ...followUpTasks.filter(
                (task) => task.sourceKey !== input.sourceKey
              ),
              {
                ...input,
                id: uid("follow-up"),
                status: "open" as const,
                createdAt,
              },
            ],
            updatedAt: createdAt,
          };
        })
      );
      setSettingsOpen(true);
    },
    [currentConversationId]
  );

  const handleCloseValidationFollowUpTask = useCallback(
    (taskId: string) => {
      if (!currentConversationId) return;

      const closedAt = new Date().toISOString();
      setConversations((prev) =>
        prev.map((conversation) => {
          if (conversation.id !== currentConversationId) return conversation;
          const followUpTasks = conversation.followUpTasks ?? [];
          if (!followUpTasks.some((task) => task.id === taskId && task.status === "open")) {
            return conversation;
          }
          return {
            ...conversation,
            followUpTasks: followUpTasks.map((task) =>
              task.id === taskId
                ? { ...task, status: "closed" as const, closedAt }
                : task
            ),
            updatedAt: closedAt,
          };
        })
      );
    },
    [currentConversationId]
  );

  const appendMessage = useCallback((conversationId: string, msg: ChatMessage) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId
          ? {
              ...c,
              messages: [...c.messages, msg],
              updatedAt: new Date().toISOString(),
            }
          : c
      )
    );
  }, []);

  const activateConversation = () => {
    setOpenReport(null);
    setView("conversation");
    setAssistantActivationKey((key) => key + 1);
  };

  /** 为指定项目创建一个空的临时对话，并切到对话视图 */
  const createEmptyConversationFor = (projectId: string, draftText = "", questionContext?: QuestionContext, draftAttachments: MessageAttachment[] = []) => {
    const convId = uid("conv");
    const newConv: Conversation = {
      id: convId,
      projectId,
      title: "新对话",
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDraft: true,
      draftText,
      draftAttachments,
      questionContext,
    };
    setConversations((prev) => [newConv, ...prev]);
    setCurrentConversationId(convId);
    setCurrentProjectId(projectId);
    setManagerReferenceFile(null);
    activateConversation();
    return convId;
  };

  /** 打开或复用该项目下的草稿对话 */
  const openOrCreateDraftFor = (projectId: string) => {
    const existingDraft = conversations.find(
      (c) => c.projectId === projectId && c.isDraft && !c.draftText?.trim() && !c.draftAttachments?.length && !c.questionContext && c.messages.length === 0
    );
    if (existingDraft) {
      setCurrentProjectId(projectId);
      setCurrentConversationId(existingDraft.id);
      activateConversation();
      return existingDraft.id;
    }
    return createEmptyConversationFor(projectId);
  };

  /** 点击侧边栏的项目「名称」→ 打开项目主页 */
  const selectProject = (projectId: string) => {
    setManagerReferenceFile(null);
    setOpenReport(null);
    setViewerAnchor(null);
    setCurrentProjectId(projectId);
    setCurrentConversationId(null);
    setHomeTab("workspace");
    setView("project-home");
  };

  const changeAuthRole = (role: AuthRole) => {
    setAuthSession({ authenticated: true, role });
    if (role === "committee-lead") {
      const selected = projects.find((project) => project.id === currentProjectId);
      const target = selected && !isBeforeDiligence(selected.currentLifecycleStage ?? selected.lifecycleStage ?? "contact")
        ? selected : projects.find((project) => !isBeforeDiligence(project.currentLifecycleStage ?? project.lifecycleStage ?? "contact"));
      if (target) {
        setProjects((previous) => previous.map((project) => project.id === target.id ? selectProjectStage(project, project.currentLifecycleStage ?? project.lifecycleStage ?? "diligence", role) : project));
        selectProject(target.id);
        setProjectHomeActivationKey((value) => value + 1);
        return;
      }
    }
    selectProject(currentProjectId);
  };

  const handleAdvanceProjectStage = (stage: ProjectLifecycleStage) => {
    if (authSession?.role !== "investment-director") return;
    const project = projects.find((item) => item.id === currentProjectId);
    if (!project || project.lifecycleStage !== (project.currentLifecycleStage ?? project.lifecycleStage)) return;
    const next = advanceProjectStage(project, stage);
    if (!next) return;
    setProjects((previous) => previous.map((item) => item.id === project.id ? advanceProjectStage(item, stage) ?? item : item));
    if (stage === "diligence") {
      const at = new Date().toISOString();
      setProjectNotifications((previous) => appendDiligenceNotification(previous, next, at));
    }
  };

  const openNotificationProject = (projectId: string) => {
    if (!projects.some((project) => project.id === projectId)) return;
    setProjects((previous) => previous.map((project) => project.id === projectId
      ? selectProjectStage(project, project.currentLifecycleStage ?? project.lifecycleStage ?? "diligence", "committee-lead")
      : project));
    selectProject(projectId);
    setProjectHomeActivationKey((value) => value + 1);
  };

  /** 项目主页「新建对话」按钮 */
  const handleCreateConversation = (projectId: string) => {
    openOrCreateDraftFor(projectId);
  };

  const handleOpenConversation = (id: string) => {
    const conv = conversations.find((c) => c.id === id);
    if (!conv) return;
    setCurrentProjectId(conv.projectId);
    setCurrentConversationId(id);
    setManagerReferenceFile(null);
    activateConversation();
  };

  // —— Agent 能力识别 ——
  const detectIntent = (text: string, userRole = authSession?.role): AgentIntent => {
    if (!text.trim()) return "ambiguous";
    return userRole === "committee-lead" ? "investment-report" : getManagerTaskIntent(text);
  };

  /** 判断项目知识库是否仍在解析中 */
  const isProjectParsing = (projectId: string) => {
    const proj = projects.find((p) => p.id === projectId);
    if (!proj) return false;
    if (proj.status === "parsing") return true;
    return proj.files.some(
      (f) => f.status === "uploading" || f.status === "parsing"
    );
  };

  /**
   * 触发一个长任务。报告类任务在对话流和右侧栏同步展示生成过程，
   * 完成后由 ticker 把过程记录与 resultBlocks 一起保留在对话中。
   */
  const startTask = (
    kind: Exclude<AgentIntent, "ambiguous">,
    conversationId: string,
    projectId: string,
    userQuery: string,
    attachments: MessageAttachment[] = [],
    displayQuery = userQuery,
    questionContext?: QuestionContext,
    userRole = authSession?.role,
    reportSource = activeReportSourceFor(projectId),
    taskSnapshot?: TaskSnapshot
  ) => {
    userRole = taskSnapshot?.userRole ?? userRole;
    if (taskSnapshot) reportSource = taskSnapshot.reportSource;
    const isChallenge = kind === "challenge";
    const managerTask = userRole === "investment-director";
    const isInvestmentReport = kind === "investment-report";
    const hasUploadedDocument = attachments.length > 0;
    const isYaojuMaterial = attachments.some((file) => /曜矩/.test(file.name)) && /曜矩/.test(projects.find((item) => item.id === projectId)?.name ?? "");
    const isYaojuInvestmentDemo = kind === "investment-report" && hasUploadedDocument && isYaojuMaterial && !questionContext && !managerTask;
    const isYaojuCrossValidationDemo = kind === "fact-check" && hasUploadedDocument && isYaojuMaterial && !questionContext && !managerTask;
    const isYaojuDemo = isYaojuInvestmentDemo || isYaojuCrossValidationDemo;
    const demoSelection = isYaojuInvestmentDemo
      ? pickYaojuDemoAgentSelection()
      : undefined;
    const project = taskSnapshot?.project ?? projects.find((item) => item.id === projectId);
    const projectName = project?.name ?? "当前项目";
    const documentCount = Math.max(1, project?.files.length ?? 0);
    const resultBlock = isYaojuInvestmentDemo
      ? buildYaojuInvestmentReportBlock()
      : isYaojuCrossValidationDemo
        ? buildYaojuValidationReportBlock()
      : isChallenge
      ? buildGenericChallengeBlock(userQuery)
      : isInvestmentReport
        ? buildGenericInvestmentReportBlock(userQuery, projectName)
        : buildGenericFactCheckBlock(userQuery);
    const process = questionContext
      ? buildQuestionProcess(questionContext)
      : (managerTask || project?.lifecycleStage === "decided") && project ? buildManagerTaskProcess(project, kind)
      : isYaojuInvestmentDemo
      ? buildYaojuInvestmentProcess(demoSelection?.agentIds.length)
      : isYaojuCrossValidationDemo
        ? buildYaojuCrossValidationProcess()
      : isChallenge
      ? buildChallengeProcess({ projectName, documentCount })
      : isInvestmentReport
        ? buildInvestmentReportProcess({ projectName, documentCount })
        : buildCrossValidationProcess({
            projectName,
            documentCount,
            claimCount: Math.min(100, Math.max(24, documentCount * 16)),
          });

    const task: RunningTask = {
      id: uid("task"),
      projectId,
      conversationId,
      kind,
      title:
        (isYaojuInvestmentDemo
          ? "曜矩智造投资分析"
          : isYaojuCrossValidationDemo
            ? "曜矩智造交叉验证"
            : displayQuery.trim().slice(0, 28)) ||
        (isChallenge
          ? "挑战质询任务"
          : isInvestmentReport
            ? "投资分析报告"
            : "事实交叉验证任务"),
      summary:
        (isYaojuInvestmentDemo
          ? `提取 16 项核心主张，由投资官AI选择 ${demoSelection?.agentIds.length ?? 3} 个子领域 Agent 并行分析并通过质量门`
          : isYaojuCrossValidationDemo
            ? "提取 16 项核心主张，逐项对照项目知识库并生成交叉验证报告"
          : displayQuery.trim()) ||
        (isChallenge
          ? "围绕投资逻辑与执行风险开展多维拷问"
          : isInvestmentReport
            ? "从项目材料与外部证据出发形成投资判断、价格边界与失败场景"
            : "对议案 / BP / FDD / 审计的关键数字做多源交叉比对"),
      progress: 4,
      startedAt: new Date().toISOString(),
      process,
      demoKind: isYaojuInvestmentDemo
        ? "yaoju-investment-analysis"
        : isYaojuCrossValidationDemo
          ? "yaoju-cross-validation"
          : undefined,
      demoAgentIds: demoSelection?.agentIds,
      demoReworkAgentId: demoSelection?.reworkAgentId,
      durationMs: questionContext || managerTask ? 8_000 : isYaojuDemo ? 96_000 : undefined,
      resultBlocks: questionContext ? buildQuestionResult(displayQuery, questionContext) : (managerTask || project?.lifecycleStage === "decided") && project ? buildManagerTaskResult(project, kind, displayQuery, attachments, reportSource) : [resultBlock],
    };
    setRunningTasks((prev) => [task, ...prev]);
  };

  /** 在某个 conversation 中发送 user 消息 + 触发 Agent 回复 */
  const sendInConversation = (
    conversationId: string,
    text: string,
    attachments: Array<{ name: string; size: string; kind: FileKind }>,
    questionContext?: QuestionContext,
    userRole = authSession?.role,
    reportSource?: ReportSourceRef,
    taskSnapshot?: TaskSnapshot
  ) => {
    const snapshotProjectId = conversations.find((c) => c.id === conversationId)?.projectId ?? currentProjectId;
    taskSnapshot = taskSnapshot ?? taskSnapshotFor(snapshotProjectId);
    userRole = taskSnapshot?.userRole ?? userRole;
    const intent = text.trim().length > 0 ? (questionContext ? "challenge" : detectIntent(text, userRole)) : "ambiguous";
    const userMsg: ChatMessage = {
      id: uid("m"),
      role: "user",
      text,
      questionContext,
      attachments: attachments.length > 0 ? attachments : undefined,
      mode: intent === "ambiguous" ? undefined : intent,
      createdAt: new Date().toISOString(),
    };
    appendMessage(conversationId, userMsg);

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== conversationId) return c;
        if (!c.isDraft && c.title !== "新对话") return c;
        const nextTitle = conversationTitleFor(text, attachments, c.title);
        return { ...c, title: nextTitle, isDraft: false };
      })
    );

    const conv = conversations.find((c) => c.id === conversationId);
    const projectId = conv?.projectId ?? currentProjectId;

    if (text.trim().length === 0) {
      if ((userRole === "investment-director" || taskSnapshot?.project.lifecycleStage === "decided") && attachments.length) appendMessage(conversationId, { id: uid("m"), role: "assistant", createdAt: new Date().toISOString(), blocks: [buildManagerTaskChoice(text, attachments, taskSnapshot)] });
      return;
    }

    if (
      intent === "challenge" ||
      intent === "fact-check" ||
      intent === "investment-report"
    ) {
      // 上层 handleSend / handleSendFromHome 已经做过 parsing 拦截，到这里直接启动
      startTask(intent, conversationId, projectId, buildQuestionFollowUp(text, questionContext), attachments, text, questionContext, userRole, reportSource, taskSnapshot);
      return;
    }

    // ambiguous → 待确认
    setGenerating(true);
    setTimeout(() => {
      const pickMsg: ChatMessage = {
        id: uid("m"),
        role: "assistant",
        createdAt: new Date().toISOString(),
        blocks: userRole === "investment-director" ? [buildManagerTaskChoice(text, attachments, taskSnapshot)] : [
          {
            kind: "mode-pick",
            title: "Agent 暂时无法判断该问题适合哪类能力",
            reason:
              "您的问题表述较宽泛，Agent 智能路由未能在「事实交叉验证」与「挑战质询」之间做出可靠判断。请手动选择一项继续。",
            originalQuery: text,
            taskSnapshot,
            options: [
              {
                mode: "fact-check",
                label: "走「事实交叉验证」",
                desc: "对议案 / BP / FDD / LDD 内的关键数字做多源比对，输出差异清单与佐证锚点",
                recommended: true,
              },
              {
                mode: "challenge",
                label: "走「挑战质询」",
                desc: "围绕商业逻辑、关键假设、市场与执行风险生成投决会式的拷问清单",
              },
            ],
          },
        ],
      };
      appendMessage(conversationId, pickMsg);
      setGenerating(false);
    }, 700);
  };

  // 保留最新发送函数引用，队列在前序任务完成后的 effect 中启动时避免捕获旧状态。
  sendInConversationRef.current = sendInConversation;

  const enqueuePrompt = (
    conversationId: string,
    text: string,
    attachments: MessageAttachment[],
    questionContext?: QuestionContext
  ) => {
    const projectId = conversations.find((conversation) => conversation.id === conversationId)?.projectId ?? currentProjectId;
    setQueuedPrompts((previous) => [
      ...previous,
      {
        id: uid("queue"),
        projectId,
        conversationId,
        text: text.trim(),
        userRole: authSession?.role,
        reportSource: activeReportSourceFor(projectId),
        taskSnapshot: taskSnapshotFor(projectId),
        questionContext,
        attachments: attachments.length > 0 ? attachments : undefined,
        createdAt: new Date().toISOString(),
      },
    ]);
  };

  const updateQueuedPrompt = (id: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setQueuedPrompts((previous) =>
      previous.map((item) => (item.id === id ? { ...item, text: trimmed } : item))
    );
  };

  const deleteQueuedPrompt = (id: string) => {
    cancelledQueuedPromptIdsRef.current.add(id);
    setQueuedPrompts((previous) => previous.filter((item) => item.id !== id));
  };

  // 当前任务完成并从 runningTasks 移除后，自动启动该会话的下一条排队指令。
  useEffect(() => {
    if (queueDispatchScheduledRef.current) {
      return;
    }

    if (generating || queuedPrompts.length === 0) return;
    const activeConversationIds = new Set(runningTasks.map((task) => task.conversationId));
    // 队列是用户看到的执行顺序，严格只看队首，避免跨会话跳过等待中的指令。
    const nextPrompt = queuedPrompts[0];
    if (!nextPrompt || activeConversationIds.has(nextPrompt.conversationId)) return;

    queueDispatchScheduledRef.current = nextPrompt.id;
    setQueuedPrompts((previous) => previous.filter((item) => item.id !== nextPrompt.id));
    window.setTimeout(() => {
      if (queueDispatchScheduledRef.current !== nextPrompt.id) return;
      queueDispatchScheduledRef.current = null;
      if (cancelledQueuedPromptIdsRef.current.has(nextPrompt.id)) {
        cancelledQueuedPromptIdsRef.current.delete(nextPrompt.id);
        return;
      }
      sendInConversationRef.current?.(
        nextPrompt.conversationId,
        nextPrompt.text,
        nextPrompt.attachments ?? [],
        nextPrompt.questionContext,
        nextPrompt.userRole,
        nextPrompt.reportSource,
        nextPrompt.taskSnapshot
      );
    }, 0);
  }, [generating, queuedPrompts, runningTasks]);

  /**
   * 项目主页输入：先识别意图。若是任务类输入且项目正在解析，先弹窗；
   * 用户选「等待」时不会创建草稿对话，也不会写入用户消息。
   * 其他情况按原行为：先打开/创建草稿对话，再发送首条消息。
   */
  const handleSendFromHome = (
    text: string,
    attachments: Array<{ name: string; size: string; kind: FileKind }>
  ) => {
    const projectId = currentProjectId;
    const trimmed = text.trim();
    if (!trimmed && attachments.length === 0) return false;

    if (trimmed.length > 0) {
      const intent = detectIntent(text);
      if (
        intent !== "ambiguous" &&
        isProjectParsing(projectId)
      ) {
        const userMsg: ChatMessage = {
          id: uid("m"),
          role: "user",
          text,
          attachments: attachments.length > 0 ? attachments : undefined,
          mode: intent,
          createdAt: new Date().toISOString(),
        };
        setPendingTask({
          kind: intent,
          conversationId: null, // 「继续」时再 openOrCreateDraftFor
          projectId,
          userQuery: text,
          taskSnapshot: taskSnapshotFor(projectId),
          attachments,
          userMsg,
        });
        return false;
      }
    }

    const convId = openOrCreateDraftFor(projectId);
    const conversationBusy =
      generating || runningTasks.some((task) => task.conversationId === convId);
    if (conversationBusy && (trimmed.length > 0 || attachments.length > 0)) {
      enqueuePrompt(convId, text, attachments);
      setManagerHomeDrafts((previous) => ({ ...previous, [homeDraftKey]: { text: "", attachments: [] } }));
      return true;
    }

    sendInConversation(convId, text, attachments);
    setManagerHomeDrafts((previous) => ({ ...previous, [homeDraftKey]: { text: "", attachments: [] } }));
    return true;
  };

  const handleSend = (
    text: string,
    attachments: Array<{ name: string; size: string; kind: FileKind }>
  ) => {
    if (!currentConversationId || (!text.trim() && attachments.length === 0)) return false;
    const projectId = currentProjectId;
    const trimmed = text.trim();
    const questionContext = currentConversation?.questionContext?.projectId === projectId
      ? currentConversation.questionContext : undefined;

    const conversationBusy =
      generating ||
      runningTasks.some((task) => task.conversationId === currentConversationId);
    if (conversationBusy && (trimmed.length > 0 || attachments.length > 0)) {
      enqueuePrompt(currentConversationId, text, attachments, questionContext);
      consumeConversationDraft(currentConversationId);
      activateConversation();
      return true;
    }

    if (trimmed.length > 0) {
      const intent = questionContext ? "challenge" : detectIntent(text);
      if (
        intent !== "ambiguous" &&
        isProjectParsing(projectId)
      ) {
        const userMsg: ChatMessage = {
          id: uid("m"),
          role: "user",
          text,
          questionContext,
          attachments: attachments.length > 0 ? attachments : undefined,
          mode: intent,
          createdAt: new Date().toISOString(),
        };
        setPendingTask({
          kind: intent,
          conversationId: currentConversationId,
          projectId,
          userQuery: buildQuestionFollowUp(text, questionContext),
          taskSnapshot: taskSnapshotFor(projectId),
          attachments,
          userMsg,
        });
        return false;
      }
    }

    sendInConversation(currentConversationId, text, attachments, questionContext);
    consumeConversationDraft(currentConversationId);
    activateConversation();
    return true;
  };

  const handleModePick = (
    _msgId: string,
    _pickedMode: Extract<WorkMode, "fact-check" | "challenge" | "investment-report">,
    originalQuery: string,
    attachments: MessageAttachment[] = []
  ) => {
    if (!currentConversationId) return;
    const choice = currentConversation?.messages.find((msg) => msg.id === _msgId)?.blocks?.find((block) => block.kind === "mode-pick");
    const taskSnapshot = choice?.kind === "mode-pick" ? choice.taskSnapshot ?? taskSnapshotFor(currentProjectId) : taskSnapshotFor(currentProjectId);
    const permittedMode: Exclude<AgentIntent, "ambiguous"> =
      _pickedMode;
    const userMsg: ChatMessage = {
      id: uid("m"),
      role: "user",
      text: originalQuery,
      attachments,
      mode: permittedMode,
      createdAt: new Date().toISOString(),
    };

    if (isProjectParsing(currentProjectId)) {
      setPendingTask({
        kind: permittedMode,
        conversationId: currentConversationId,
        projectId: currentProjectId,
        userQuery: originalQuery,
        taskSnapshot,
        attachments,
        userMsg,
      });
      return;
    }

    appendMessage(currentConversationId, userMsg);
    startTask(permittedMode, currentConversationId, currentProjectId, originalQuery, attachments, originalQuery, undefined, taskSnapshot?.userRole, taskSnapshot?.reportSource, taskSnapshot);
  };

  const handleClarificationSubmit = (
    _msgId: string,
    values: Record<string, string>,
    followUp?: AssistantBlock[]
  ) => {
    if (!currentConversationId) return;

    if (followUp && followUp.length > 0) {
      const dilution = values["dilution"] || "30";
      const irr = values["expected-irr"] || "15";
      const ackMsg: ChatMessage = {
        id: uid("m"),
        role: "assistant",
        createdAt: new Date().toISOString(),
        blocks: [
          {
            kind: "text",
            text: `已收到补充数据（稀释比例 ${dilution}% · IRR ${irr}%），正在按 VC 倒算 + PS 对比 + PTA 三种方法并行测算…`,
          },
        ],
      };
      appendMessage(currentConversationId, ackMsg);
      setGenerating(true);
      const targetId = currentConversationId;
      setTimeout(() => {
        const reportMsg: ChatMessage = {
          id: uid("m"),
          role: "assistant",
          createdAt: new Date().toISOString(),
          blocks: followUp,
        };
        appendMessage(targetId, reportMsg);
        setGenerating(false);
      }, 1400);
      return;
    }

    const dilution = values["dilution"] || "30";
    const irr = values["expected-irr"] || "15";
    const replyMsg: ChatMessage = {
      id: uid("m"),
      role: "assistant",
      createdAt: new Date().toISOString(),
      blocks: [
        {
          kind: "text",
          text: `已根据补充数据（稀释比例 ${dilution}% · IRR ${irr}%）继续推算，结果详见上方更新结论。`,
        },
      ],
    };
    appendMessage(currentConversationId, replyMsg);
  };

  const handleCreate = (proj: Project) => {
    setProjects((prev) => [proj, ...prev]);
    setCurrentProjectId(proj.id);
    setCurrentConversationId(null);

    if (proj.files.length > 0) {
      setTimeout(() => {
        setProjects((prev) =>
          prev.map((p) => (p.id === proj.id ? { ...p, status: "parsed" } : p))
        );
      }, 2200);
    }
    setView("project-home");
  };

  const handleUpdateFiles = (files: KnowledgeFile[]) => {
    const id = uid("context-change");
    const at = new Date().toISOString();
    setProjects((previous) => previous.map((project) => project.id === currentProjectId
      ? applyProjectUpdate(project, { files: canonicalLibraryFiles(project, files) }, id, at)
      : project));
  };

  const handleSubmitReport = (request: ReportSubmissionRequest): ReportSubmissionResult => {
    const project = projects.find((item) => item.id === request.projectId);
    if (!project || currentProjectId !== request.projectId || authSession?.role !== "investment-director") return { ok: false, error: "当前无法提交，请返回投资经理的项目页面重试。" };
    const id = uid("submitted-report");
    const at = new Date().toISOString();
    const result = applyReportSubmission(project, request, authSession.role, id, at);
    if (!result.ok) return result;
    setProjects((previous) => previous.map((item) => {
      if (item.id !== request.projectId) return item;
      return applyReportSubmission(item, request, authSession.role, id, at).project ?? item;
    }));
    if (request.stage === "diligence") setSelectedReportIds((previous) => ({ ...previous, [request.projectId]: result.file.id }));
    return result;
  };

  const handleExport = (block?: AssistantBlock) => {
    // 注意：抽屉下载按钮以 onClick={onDownload} 调用，会把事件对象作为首参传入，
    // 因此这里只在传入的是合法报告块时使用它，否则回退到当前打开的报告。
    const target =
      block && isReportBlock(block) ? block : openReport;
    if (!target || !isReportBlock(target)) return;
    downloadReportHtml(target);
  };

  /**
   * 用户在 analysis-aborted 卡片里通过快速上传补传资料：
   *   1) 把新文件 prepend 到当前项目知识库，状态走 uploading → parsing → indexed
   *   2) 同步把项目 status 从 failed 推回 parsing → parsed
   *   3) 在当前对话中追加 system「已接收 N 份补传…」+ 解析完成后的 assistant 文本回执
   * AnalysisAbortedCard 自己负责把卡片视觉切到「成功态」，这里只管真实数据写入。
   */
  const handleQuickUpload = useCallback(
    (_msgId: string, files: FileList) => {
      if (!currentProject || !currentConversationId) return;
      const projectId = currentProject.id;
      const conversationId = currentConversationId;
      const incoming: KnowledgeFile[] = Array.from(files).map((f) => ({
        id: uid("file"),
        name: f.name,
        size: formatFileSize(f.size),
        kind: inferFileKind(f.name),
        status: "uploading",
        uploadedAt: new Date().toISOString(),
      }));
      const incomingIds = new Set(incoming.map((f) => f.id));
      const changeId = uid("context-change");
      const changeAt = new Date().toISOString();

      // 1) 立即写入文件 + status 推回 parsing
      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectId
            ? applyProjectUpdate(p, { files: [...incoming, ...p.files], status: "parsing" }, changeId, changeAt)
            : p
        )
      );
      // 2) 600ms：uploading → parsing
      window.setTimeout(() => {
        setProjects((prev) =>
          prev.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  files: p.files.map((f) =>
                    incomingIds.has(f.id) ? { ...f, status: "parsing" } : f
                  ),
                }
              : p
          )
        );
      }, 600);

      // 3) 2800ms：parsing → indexed + 项目 status = parsed + assistant 回执
      window.setTimeout(() => {
        setProjects((prev) =>
          prev.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  files: p.files.map((f) =>
                    incomingIds.has(f.id) ? { ...f, status: "indexed" } : f
                  ),
                  status: "parsed",
                  updatedAt: new Date().toISOString(),
                }
              : p
          )
        );
        const head = incoming.slice(0, 2).map((f) => f.name).join("、");
        const tail = incoming.length > 2 ? ` 等 ${incoming.length} 份` : "";
        appendMessage(conversationId, {
          id: uid("m"),
          role: "assistant",
          createdAt: new Date().toISOString(),
          blocks: [
            {
              kind: "text",
              text: `补传资料解析完成：${head}${tail}。事实交叉验证、估值平行测算与挑战质询能力已恢复，可继续向投资官AI提问。`,
            },
          ],
        });
      }, 2800);
    },
    [currentProject, currentConversationId, appendMessage]
  );

  // —— 长任务推进 ticker：每秒推进 progress，达 100 后注入结果到对话流 ——
  const taskCompletionRef = useRef<Set<string>>(new Set());

  /**
   * 用户在右侧任务卡片的二次确认弹层中确认取消正在执行的任务：
   * 1) 从 runningTasks 中移除该任务（卡片立即消失）
   * 2) 防止 ticker 之后误判该任务已完成而追加结果（taskCompletionRef 标记一下）
   * 3) 在对应对话中追加一条 assistant 文本确认任务已取消
   */
  const handleCancelTask = useCallback(
    (task: RunningTask) => {
      cancelTaskLifecycle(task.id);
      taskCompletionRef.current.add(task.id);
      setValidationCanvas((current) => {
        if (!current || current.taskId !== task.id) return current;
        // An auto-opened claim map closes when the task is stopped. Other
        // views stay available, but must switch to a stopped, non-loading state.
        if (current.detail.view === "claim-map") return null;
        return {
          ...current,
          progress: task.progress,
          status: "cancelled",
        };
      });
      setRunningTasks((prev) => prev.filter((t) => t.id !== task.id));
      const kindLabel =
        task.kind === "challenge"
          ? "「挑战质询」"
          : task.kind === "fact-check"
            ? "「事实交叉验证」"
            : task.kind === "investment-report"
              ? "「投资分析报告」"
              : "「估值平行测算」";
      appendMessage(task.conversationId, {
        id: uid("m"),
        role: "assistant",
        createdAt: new Date().toISOString(),
        blocks: [
          ...(task.process
            ? ([
                {
                  ...(isYaojuDemoKind(task.demoKind)
                    ? {
                        kind: "validation-demo" as const,
                      }
                    : {
                        kind: "report-process" as const,
                        process: task.process,
                      }),
                  progress: task.progress,
                  status: "cancelled" as const,
                  ...(isYaojuDemoKind(task.demoKind)
                    ? {
                        mode:
                          task.demoKind === "yaoju-cross-validation"
                            ? "cross-validation" as const
                            : "investment-analysis" as const,
                        agentIds: task.demoAgentIds,
                        reworkAgentId: task.demoReworkAgentId,
                      }
                    : {}),
                },
              ] satisfies AssistantBlock[])
            : []),
          {
            kind: "text",
            text: `任务已取消：${kindLabel}任务模块已根据你的操作中止，未生成的中间结果不会写入对话。如需重新发起，直接在下方输入框继续提问即可。`,
          },
        ],
      });
    },
    [appendMessage, cancelTaskLifecycle]
  );

  useEffect(() => {
    if (runningTasks.length === 0) return;
    const id = window.setInterval(() => {
      setRunningTasks((prev) => {
        if (prev.length === 0) return prev;
        const completedNow: RunningTask[] = [];
        const nextList = prev.map((t) => {
          const durationMs = t.durationMs ?? TASK_TOTAL_MS;
          const increment = (100 * TASK_TICK_MS) / durationMs;
          const next = Math.min(100, t.progress + increment);
          if (next >= 100 && !taskCompletionRef.current.has(t.id)) {
            taskCompletionRef.current.add(t.id);
            completedNow.push({ ...t, progress: 100 });
          }
          return { ...t, progress: next };
        });
        if (completedNow.length > 0) {
          // 进度条停在 100% 短暂展示后再清理任务卡 + 注入结果。
          // 每个任务拥有独立定时器，取消其中一个不会影响同批次其他任务。
          completedNow.forEach((t) => {
            const timerId = window.setTimeout(() => {
              completionTimersRef.current.delete(t.id);
              if (cancelledTaskIdsRef.current.has(t.id)) {
                cancelledTaskIdsRef.current.delete(t.id);
                return;
              }

              // 详情 Drawer 可能仍在打开状态；在移除任务前将其推进到完成态，
              // 避免实时工作流停留在最后一个 ticker 的旧进度。
              setValidationCanvas((current) =>
                current?.taskId === t.id
                  ? { ...current, progress: 100, status: "completed" }
                  : current
              );

              const reportMsg: ChatMessage = {
                id: uid("m"),
                role: "assistant",
                createdAt: new Date().toISOString(),
                blocks: [
                  ...(t.process
                    ? ([
                        {
                          ...(isYaojuDemoKind(t.demoKind)
                            ? {
                                kind: "validation-demo" as const,
                              }
                            : {
                                kind: "report-process" as const,
                                process: t.process,
                              }),
                          progress: 100,
                          status: "completed" as const,
                          ...(isYaojuDemoKind(t.demoKind)
                            ? {
                                mode:
                                  t.demoKind === "yaoju-cross-validation"
                                    ? "cross-validation" as const
                                    : "investment-analysis" as const,
                                agentIds: t.demoAgentIds,
                                reworkAgentId: t.demoReworkAgentId,
                              }
                            : {}),
                        },
                      ] satisfies AssistantBlock[])
                    : []),
                  ...(isYaojuDemoKind(t.demoKind)
                    ? ([
                        {
                          kind: "text" as const,
                          text:
                            t.demoKind === "yaoju-cross-validation"
                              ? "交叉验证已完成。投资官AI已将 16 项核心主张逐一与项目知识库比对：5 项一致、6 项部分一致、4 项证据不足、1 项存在偏差。原报告“有条件推进”方向可保留，但收入真实性、数据与代码权属仍应作为交割先决条件。完整报告如下。"
                              : "投资分析报告已完成。投资官AI已聚合本轮专业研究，对商业增长、产品技术、客户质量、财务表现、合规风险和估值回报形成独立判断。综合建议为有条件推进，收入真实性、数据与代码权属应作为交割先决条件。完整报告如下。",
                        },
                      ] satisfies AssistantBlock[])
                    : []),
                  ...t.resultBlocks,
                ],
              };
              appendMessage(t.conversationId, reportMsg);
              // 标记为「新到达的报告」，MessageList 渲染时按报告类型播放一次入场高亮。
              setNewReportMsgIds((prev) => {
                const next = new Set(prev);
                next.add(reportMsg.id);
                return next;
              });
              // 用户当前不在该对话页 → 打未读标记
              if (t.conversationId !== currentConversationId) {
                setUnreadConvIds((prev) => {
                  if (prev.has(t.conversationId)) return prev;
                  const next = new Set(prev);
                  next.add(t.conversationId);
                  return next;
                });
              }
              setRunningTasks((curr) => curr.filter((item) => item.id !== t.id));
            }, 600);
            completionTimersRef.current.set(t.id, timerId);
          });
        }
        return nextList;
      });
    }, TASK_TICK_MS);
    return () => window.clearInterval(id);
  }, [runningTasks.length, appendMessage, currentConversationId]);

  const handleOpenValidationDetail = useCallback(
    (
      detail: ValidationDemoDetail,
      task?: RunningTask,
      block?: Extract<AssistantBlock, { kind: "validation-demo" }>
    ) => {
      if (document.activeElement instanceof HTMLElement) {
        validationWorkspaceTriggerRef.current = document.activeElement;
      }
      setValidationCanvas({
        detail,
        taskId: task?.id,
        progress: task?.progress ?? 100,
        status: block?.status ?? (task ? "running" : "completed"),
        agentIds: task?.demoAgentIds ?? block?.agentIds,
        reworkAgentId: task?.demoReworkAgentId ?? block?.reworkAgentId,
        mode:
          block?.mode ??
          (task?.demoKind === "yaoju-cross-validation"
            ? "cross-validation"
            : "investment-analysis"),
      });
    },
    []
  );

  const handleCloseValidationCanvas = useCallback(() => {
    setValidationCanvas(null);
  }, []);

  const handleAutoCloseValidationDetail = useCallback((taskId?: string) => {
    setValidationCanvas((current) => {
      if (!current || current.detail.view !== "claim-map") return current;
      if (taskId && current.taskId !== taskId) return current;
      return null;
    });
  }, []);

  useEffect(() => {
    if (!validationCanvas?.taskId) return;
    const task = runningTasks.find((item) => item.id === validationCanvas.taskId);
    if (!task) {
      // A cancelled or already-cleaned-up task must not leave an automatically
      // opened claim-map drawer stranded on screen.
      if (validationCanvas.detail.view === "claim-map") {
        setValidationCanvas(null);
      }
      return;
    }
    if (task.progress === validationCanvas.progress) return;
    setValidationCanvas((current) =>
      current?.taskId === task.id
        ? { ...current, progress: task.progress }
        : current
    );
  }, [runningTasks, validationCanvas]);

  const settingsAvailable =
    view === "conversation" ||
    (view === "project-home" && localizedCurrentProjectRunningTasks.length > 0);
  const showProjectSettings = settingsAvailable && Boolean(currentProject);
  const settingsPanel = localizedCurrentProject ? (
    <SettingsPanel
      project={localizedCurrentProject}
      runningTasks={localizedCurrentProjectRunningTasks}
      followUpTasks={localizedCurrentConversationFollowUpTasks}
      currentConversationId={authSession?.role === "investment-director" ? null : view === "conversation" ? currentConversationId : null}
      showCompanyInfo={authSession?.role === "investment-director" || view !== "project-home"}
      onUpdate={updateProject}
      onOpenTaskConversation={(conversationId) => {
        handleOpenConversation(conversationId);
        if (!isXlViewport) setSettingsOpen(false);
      }}
      onCancelTask={handleCancelTask}
      onCloseFollowUpTask={handleCloseValidationFollowUpTask}
    />
  ) : null;

  const renderSidebar = (options?: { collapsed?: boolean }) => (
    <Sidebar
      projects={localizedProjects}
      conversations={localizedConversations}
      currentProjectId={currentProjectId}
      currentConversationId={currentConversationId}
      runningConversationIds={runningConvIds}
      unreadConversationIds={unreadConvIds}
      abortedConversationIds={abortedConvIds}
      // The mobile Sheet is always an expanded navigation surface. Reusing the
      // desktop collapsed preference there would hide every navigation item
      // for users who last used the compact desktop rail.
      collapsed={options?.collapsed ?? sidebarCollapsed}
      onToggleCollapsed={() => setSidebarCollapsed((value) => !value)}
      onSelectProject={(id) => {
        selectProject(id);
        setMobileSidebarOpen(false);
      }}
      onOpenConversation={(id) => {
        handleOpenConversation(id);
        setMobileSidebarOpen(false);
      }}
      onNewProject={() => {
        setView("new-project");
        setMobileSidebarOpen(false);
      }}
      onRenameProject={renameProject}
      onDeleteProject={deleteProject}
      onRenameConversation={renameConversation}
      onDeleteConversation={deleteConversation}
      userRole={authSession?.role}
      onSwitchRole={changeAuthRole}
      onLogout={() => setAuthSession(null)}
    />
  );

  if (!authSession) {
    return <LoginPage onLogin={changeAuthRole} />;
  }

  const committeeView = view !== "new-project" && Boolean(localizedCurrentProject);

  return (
    <TooltipProvider delayDuration={150}>
      <div
        className={cn(!committeeView && "app-shell", "h-screen overflow-hidden bg-[var(--wz-color-bg-canvas)] text-[var(--wz-color-text-primary)]")}
      >
        {committeeView && localizedCurrentProject ? (
          <CommitteeWorkspace
            role={authSession.role}
            onStageChange={(stage) => setProjects((previous) => previous.map((project) => project.id === currentProjectId ? selectProjectStage(project, stage, authSession.role) : project))}
            onAdvanceStage={handleAdvanceProjectStage}
            onEarlyStageSave={(stage, values) => {
              if (authSession.role !== "investment-director") return;
              setProjects((previous) => previous.map((project) => project.id === currentProjectId && (project.currentLifecycleStage ?? project.lifecycleStage) === stage
                ? { ...project, earlyStageRecords: { ...project.earlyStageRecords, [stage]: values } } : project));
            }}
            projectHomeActivationKey={projectHomeActivationKey}
            notificationContent={authSession.role === "committee-lead" ? <NotificationCenter
              notifications={projectNotifications.filter((item) => projects.some((project) => project.id === item.projectId))}
              onOpenProject={openNotificationProject}
              onMarkRead={(id) => setProjectNotifications((previous) => markProjectNotificationRead(previous, id))}
              onMarkAllRead={() => setProjectNotifications((previous) => markAllProjectNotificationsRead(previous))}
            /> : undefined}
            onDecisionAction={(action) => setProjects((previous) => previous.map((project) => project.id === currentProjectId ? applyDecisionAction(project, action, authSession.role) : project))}
            project={localizedCurrentProject}
            projects={localizedProjects}
            conversations={localizedConversations}
            reports={projectReports}
            reviewDecisions={reportReviewState.decisions}
            onReviewDecision={handleReportReviewDecision}
            onSubmitReport={handleSubmitReport}
            onCurrentReportChange={(id) => setSelectedReportIds((previous) => previous[currentProjectId] === id ? previous : { ...previous, [currentProjectId]: id })}
            currentConversationId={currentConversationId}
            conversationOpen={view === "conversation"}
            assistantActivationKey={assistantActivationKey}
            onSelectProject={selectProject}
            onNewProject={() => setView("new-project")}
            onOpenConversation={(id) => {
              handleOpenConversation(id);
            }}
            onNewConversation={() => {
              createEmptyConversationFor(currentProjectId);
            }}
            onRenameConversation={renameConversation}
            onDeleteConversation={deleteConversation}
            onCloseConversation={(startFresh) => {
              setView("project-home");
              if (startFresh) {
                setCurrentConversationId(null);
                setManagerReferenceFile(null);
              }
            }}
            onLogout={() => setAuthSession(null)}
            onSwitchRole={() => changeAuthRole(authSession.role === "committee-lead" ? "investment-director" : "committee-lead")}
            onUpdateFiles={handleUpdateFiles}
            onOpenReport={handleOpenReport}
            onViewSource={handleViewSource}
            settingsContent={settingsPanel}
            openReport={openReport}
            onCloseReport={() => setOpenReport(null)}
            onExportReport={() => handleExport()}
            onReferenceFile={setManagerReferenceFile}
            onDraftTask={(text, file) => {
              setOpenReport(null);
              const files = file ? Array.isArray(file) ? file : [file] : [];
              createEmptyConversationFor(currentProjectId, text, undefined, files.map((item) => ({ name: item.name, size: item.size, kind: item.kind })));
            }}
            onAsk={(context) => {
              if (context.projectId !== currentProjectId) return;
              createEmptyConversationFor(currentProjectId, "", context);
            }}
            assistantContent={
                <MessageList
                  messages={localizedMessages}
                  generating={generating}
                  runningTasks={localizedCurrentConversationRunningTasks}
                  validationFollowUpTasks={localizedCurrentConversationFollowUpTasks}
                  onAddValidationFollowUpTask={handleAddValidationFollowUpTask}
                  onCloseValidationFollowUpTask={handleCloseValidationFollowUpTask}
                  onViewSource={handleViewSource}
                  onClarificationSubmit={handleClarificationSubmit}
                  onExport={handleExport}
                  onOpenReport={(block) => handleOpenReport(block as ReportBlock)}
                  onModePick={handleModePick}
                  hasKnowledge={localizedCurrentProject.files.length > 0}
                  onQuickUpload={handleQuickUpload}
                  onOpenValidationDetail={handleOpenValidationDetail}
                  onAutoCloseValidationDetail={handleAutoCloseValidationDetail}
                />
            }
            composerContent={(actions) =>
                <ChatComposer
                  toolbarActions={actions}
                  key={`${authSession.role}:${currentProjectId}:${currentConversationId ?? "home"}`}
                  onSend={currentConversationId ? handleSend : handleSendFromHome}
                  generating={generating}
                  onStop={() => {
                    const task = runningTasks.find((item) => item.conversationId === currentConversationId);
                    if (task) handleCancelTask(task);
                    else setGenerating(false);
                  }}
                  userRole={authSession.role}
                  projectStage={localizedCurrentProject.lifecycleStage}
                  className="manager-composer"
                  allowProjectMaterials={authSession.role === "investment-director" && localizedCurrentProject.files.some((file) => file.status === "indexed")}
                  allowQueueWhileGenerating={authSession.role === "investment-director"}
                  questionContext={currentConversation?.questionContext}
                  onViewSource={handleViewSource}
                  onRemoveQuestionContext={() => setConversations((previous) => previous.map((item) =>
                    item.id === currentConversationId ? { ...item, questionContext: undefined } : item
                  ))}
                  initialDraft={currentConversationId ? currentConversation?.draftText : managerHomeDrafts[homeDraftKey]?.text ?? ""}
                  initialAttachments={currentConversationId ? currentConversation?.draftAttachments : managerHomeDrafts[homeDraftKey]?.attachments}
                  referenceAttachment={authSession.role === "investment-director" ? managerReferenceFile : null}
                  onReferenceAttachmentConsumed={() => setManagerReferenceFile(null)}
                  onAttachmentsChange={(attachments) => {
                    if (currentConversationId) setConversations((previous) => previous.map((item) => item.id === currentConversationId ? { ...item, draftAttachments: attachments } : item));
                    else setManagerHomeDrafts((previous) => ({ ...previous, [homeDraftKey]: { text: previous[homeDraftKey]?.text ?? "", attachments } }));
                  }}
                  resetKey={composerReset?.conversationId === currentConversationId ? composerReset.key : undefined}
                  onDraftTextChange={currentConversationId ? handleCommitteeDraftTextChange : (text) => setManagerHomeDrafts((previous) => previous[homeDraftKey]?.text === text ? previous : ({ ...previous, [homeDraftKey]: { text, attachments: previous[homeDraftKey]?.attachments ?? [] } }))}
                  draftStorageKey={`invest-wise:${authSession.role}-draft:${currentProjectId}:${currentConversationId ?? "new"}`}
                  showAttachmentDivider={false}
                  queuedPrompts={queuedPrompts.filter((prompt) => prompt.conversationId === currentConversationId)}
                  onEditQueuedPrompt={updateQueuedPrompt}
                  onDeleteQueuedPrompt={deleteQueuedPrompt}
                />
            }
          />
        ) : (
        <>
        <div
          className="app-sidebar-shell h-full transition-[flex-basis] duration-[var(--wz-duration-normal)] ease-[var(--wz-ease-standard)] motion-reduce:transition-none"
          style={{
            "--app-sidebar-width": `${sidebarCollapsed ? 56 : 260}px`,
          } as CSSProperties}
        >
          {renderSidebar()}
        </div>

        <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
          <SheetContent
            side="left"
            className="w-[min(260px,calc(100vw-48px))] max-w-none p-0 md:hidden [&>button]:right-3 [&>button]:top-4"
            onOpenAutoFocus={(event) => {
              event.preventDefault();
              const content = event.currentTarget as HTMLElement | null;
              window.requestAnimationFrame(() => {
                content
                  ?.querySelector<HTMLElement>("[data-sidebar-primary-action]")
                  ?.focus();
              });
            }}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              mobileNavigationTriggerRef.current?.focus();
            }}
          >
            <SheetTitle className="sr-only">{t("dialog.projectNavigation")}</SheetTitle>
            <SheetDescription className="sr-only">
              {t("dialog.projectNavigationDescription")}
            </SheetDescription>
            {renderSidebar({ collapsed: false })}
          </SheetContent>
        </Sheet>

        <main className="app-main relative flex min-w-0 max-w-full flex-1 flex-col overflow-hidden bg-[var(--wz-color-bg-subtle)]">
          {view === "project-home" && localizedCurrentProject && (
            <>
              {settingsAvailable && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="absolute right-[var(--wz-space-3)] top-[var(--wz-space-3)] z-20 md:hidden"
                  onClick={toggleSettings}
                  aria-label={settingsOpen ? t("workspace.collapseSettings") : t("workspace.expandSettings")}
                  aria-pressed={settingsOpen}
                  title={settingsOpen ? t("workspace.collapseSettings") : t("workspace.expandSettings")}
                >
                  <AppIcon icon={IconSidebarRight} size={14} />
                </Button>
              )}
              <ProjectHome
                project={localizedCurrentProject}
                conversations={localizedConversations}
                homeTab={homeTab}
                onHomeTabChange={setHomeTab}
                projectReports={projectReports}
                onOpenReport={handleOpenReport}
                settingsOpen={settingsOpen}
                settingsAvailable={settingsAvailable}
                onToggleSettings={toggleSettings}
                onOpenNavigation={openMobileNavigation}
                onUpdateProject={updateProject}
                onOpenConversation={handleOpenConversation}
                onCreateConversation={handleCreateConversation}
                onRenameConversation={renameConversation}
                onDeleteConversation={deleteConversation}
                onUpdateFiles={handleUpdateFiles}
                onSendFromHome={handleSendFromHome}
                userRole={authSession.role}
                generating={generating}
                onStopGenerating={() => {
                  const task = runningTasks.find(
                    (candidate) => candidate.projectId === currentProjectId
                  );
                  if (task) {
                    handleCancelTask(task);
                  } else {
                    setGenerating(false);
                  }
                }}
                queuedPrompts={queuedPrompts.filter(
                  (prompt) => prompt.projectId === currentProjectId
                )}
                onEditQueuedPrompt={updateQueuedPrompt}
                onDeleteQueuedPrompt={deleteQueuedPrompt}
              />
            </>
          )}

          {view === "conversation" && localizedCurrentProject && (
            <>
              <WorkspaceHeader
                project={localizedCurrentProject}
                conversation={localizedCurrentConversation}
                settingsOpen={settingsOpen}
                onToggleSettings={toggleSettings}
                onOpenNavigation={openMobileNavigation}
                onRenameConversation={(newTitle) => {
                  if (currentConversationId) {
                    renameConversation(currentConversationId, newTitle);
                  }
                }}
                onBackToProjectHome={() => {
                  setCurrentConversationId(null);
                  setView("project-home");
                }}
              />
              <MessageList
                messages={localizedMessages}
                generating={generating}
                runningTasks={localizedCurrentConversationRunningTasks}
                validationFollowUpTasks={localizedCurrentConversationFollowUpTasks}
                onAddValidationFollowUpTask={handleAddValidationFollowUpTask}
                onCloseValidationFollowUpTask={handleCloseValidationFollowUpTask}
                onViewSource={handleViewSource}
                onClarificationSubmit={handleClarificationSubmit}
                onExport={handleExport}
                onOpenReport={(b) => handleOpenReport(b as ReportBlock)}
                onModePick={handleModePick}
                hasKnowledge={localizedCurrentProject.files.length > 0}
                newReportMessageIds={newReportMsgIds}
                onReportAnimated={(id) =>
                  setNewReportMsgIds((prev) => {
                    if (!prev.has(id)) return prev;
                    const next = new Set(prev);
                    next.delete(id);
                    return next;
                  })
                }
                onQuickUpload={handleQuickUpload}
                onOpenValidationDetail={handleOpenValidationDetail}
                onAutoCloseValidationDetail={handleAutoCloseValidationDetail}
              />
              <ChatComposer
                key={currentConversationId}
                onSend={handleSend}
                generating={generating}
                onStop={() => setGenerating(false)}
                userRole={authSession.role}
                showAttachmentDivider={false}
                initialDraft={currentConversation?.draftText ?? ""}
                onDraftTextChange={handleCommitteeDraftTextChange}
                resetKey={composerReset?.conversationId === currentConversationId ? composerReset.key : undefined}
                queuedPrompts={queuedPrompts.filter(
                  (prompt) => prompt.conversationId === currentConversationId
                )}
                onEditQueuedPrompt={updateQueuedPrompt}
                onDeleteQueuedPrompt={deleteQueuedPrompt}
              />
            </>
          )}

          {view === "new-project" && (
            <div className="min-h-0 flex-1 overflow-hidden bg-[var(--wz-color-bg-canvas)]">
              <Suspense fallback={<DeferredSurfaceFallback label={t("common.loading")} />}>
                <ProjectWizard
                  initialStep={capturePreview?.wizardStep ?? 1}
                  onCreate={handleCreate}
                  onCancel={() => {
                    if (projects[0]) selectProject(projects[0].id);
                  }}
                />
              </Suspense>
            </div>
          )}
        </main>

        {/* 宽屏设置栏保持在正常文档流中；关闭后 inert，避免隐藏控件进入 Tab 顺序。 */}
        {showProjectSettings && isXlViewport && (
          <div
            className="settings-sidebar-shell shrink-0 overflow-hidden motion-reduce:transition-none"
            style={
              {
                "--settings-width": settingsOpen
                  ? "clamp(280px, 24vw, 320px)"
                  : "0px",
              } as CSSProperties
            }
            aria-hidden={!settingsOpen}
            inert={settingsOpen ? undefined : true}
          >
            <div
              className={cn(
                "h-full min-w-[clamp(280px,24vw,320px)] transition-[opacity,transform] duration-[var(--wz-duration-normal)] ease-[var(--wz-ease-standard)] motion-reduce:transition-none",
                settingsOpen
                  ? "translate-x-0 opacity-100"
                  : "translate-x-6 opacity-0"
              )}
            >
              {settingsPanel}
            </div>
          </div>
        )}

        {/* 较窄视口使用模态 Sheet，避免设置栏挤压对话工作区。 */}
        {showProjectSettings && !isXlViewport && (
          <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
            <SheetContent
              side="right"
              className="w-[min(360px,calc(100vw-16px))] max-w-none p-0"
              onCloseAutoFocus={(event) => {
                event.preventDefault();
                settingsTriggerRef.current?.focus();
              }}
            >
              <SheetTitle className="sr-only">{t("dialog.projectSettings")}</SheetTitle>
              <SheetDescription className="sr-only">
                {t("dialog.projectSettingsDescription")}
              </SheetDescription>
              {settingsPanel}
            </SheetContent>
          </Sheet>
        )}

        </>
        )}

        <ParsingGateDialog
          open={pendingTask !== null}
          taskKind={pendingTask?.kind ?? "challenge"}
          projectName={
            pendingTask
              ? localizedProjects.find((p) => p.id === pendingTask.projectId)?.name
              : localizedCurrentProject?.name
          }
          onCancel={() => setPendingTask(null)}
          onContinue={() => {
            if (!pendingTask) return;
            const t = pendingTask;
            setPendingTask(null);
            // 若来自项目主页首次提问，此时才创建草稿对话；否则使用已有对话
            const convId = t.conversationId ?? openOrCreateDraftFor(t.projectId);
            consumeConversationDraft(convId);
            if (!t.conversationId) setManagerHomeDrafts((previous) => ({ ...previous, [`${t.taskSnapshot?.userRole ?? authSession?.role}:${t.projectId}`]: { text: "", attachments: [] } }));
            activateConversation();
            if (t.userMsg) {
              appendMessage(convId, t.userMsg);
              // 草稿对话或仍叫「新对话」时，用首条 user 消息作为标题
              setConversations((prev) =>
                prev.map((c) => {
                  if (c.id !== convId) return c;
                  if (!c.isDraft && c.title !== "新对话") return c;
                  const nextTitle = conversationTitleFor(
                    t.userMsg?.text ?? t.userQuery,
                    t.attachments ?? [],
                    c.title
                  );
                  return { ...c, title: nextTitle, isDraft: false };
                })
              );
            }
            startTask(
              t.kind,
              convId,
              t.projectId,
              t.userQuery,
              t.attachments,
              t.userMsg?.text ?? t.userQuery,
              t.userMsg?.questionContext,
              t.taskSnapshot?.userRole,
              t.taskSnapshot?.reportSource,
              t.taskSnapshot
            );
          }}
        />

        <QuoteViewer
          anchor={viewerAnchor}
          returnFocusTo={quoteViewerTriggerRef.current}
          onClose={() => setViewerAnchor(null)}
        />
        {openReport && (authSession.role === "committee-lead" || !committeeView) && (
          <Suspense fallback={null}>
            <ReportDrawer
              block={openReport}
              meta={openReportMeta}
              returnFocusTo={reportDrawerTriggerRef.current}
              onClose={() => {
                setOpenReport(null);
                setOpenReportMeta(null);
              }}
              onViewSource={handleViewSource}
              onDownload={handleExport}
            />
          </Suspense>
        )}
        {validationCanvas && (
          <Suspense fallback={null}>
            <ValidationWorkspaceDrawer
              detail={validationCanvas.detail}
              progress={validationCanvas.progress}
              status={validationCanvas.status}
              agentIds={validationCanvas.agentIds}
              reworkAgentId={validationCanvas.reworkAgentId}
              mode={validationCanvas.mode}
              returnFocusTo={validationWorkspaceTriggerRef.current}
              onClose={handleCloseValidationCanvas}
              onChangeDetail={(detail) =>
                setValidationCanvas((current) =>
                  current
                    ? {
                        ...current,
                        detail,
                      }
                    : current
                )
              }
            />
          </Suspense>
        )}
      </div>
    </TooltipProvider>
  );
}

/** 用户主动发起事实交叉验证时，任务完成后注入的通用 fact-verification 块 */
function buildGenericFactCheckBlock(query: string): AssistantBlock {
  return {
    kind: "fact-verification",
    title: "事实交叉验证（基于当前知识库口径）",
    level: "R4",
    summary: `已围绕「${query.trim().slice(0, 36) || "您的请求"}」对议案 / BP / FDD / 审计报告等多源材料做了关键数据交叉比对，命中若干差异点，详见下方对照。`,
    compares: [
      {
        label: "2024 全年营业收入",
        claim: { source: "投决议案-V3.pdf p.7", value: "1.82 亿元" },
        reality: { source: "审计报告 p.23", value: "1.68 亿元" },
        delta: "+8.3%",
        level: "R4",
        deviationDetail: {
          explanation:
            "议案口径包含集团内部交易（约 1,400 万），审计报告做了内部抵销。",
          impact: "若按审计口径，PS 估值倍数实际为 7.5× 而非议案宣称的 6.9×，对估值合理性形成压力。",
          recommendation:
            "要求公司说明合并口径与内部交易抵销策略；条款上可加「营收口径偏差>5% 触发业绩补偿」。",
        },
      },
      {
        label: "2024 经营性现金流",
        claim: { source: "BP_2026Q2.pptx p.14", value: "+3,100 万元" },
        reality: { source: "审计报告 p.36", value: "-1,250 万元" },
        delta: "+348%",
        level: "R5",
        deviationDetail: {
          explanation:
            "BP 将客户预付款计入经营性现金流；审计报告按准则将其归类为合同负债，未计入。",
          impact:
            "经营性现金流真实为负，意味着公司高度依赖外部融资，对估值与对赌条款应做相应调整。",
          recommendation:
            "复核客户预付款合同条款；建议增设「连续 2 季度经营现金流为负则触发回购权」。",
        },
      },
    ],
    anchors: [],
    citations: [],
  };
}

/** 用户主动发起投资报告时，在六阶段研究完成后生成的投资判断摘要。 */
function buildGenericInvestmentReportBlock(
  query: string,
  projectName: string
): AssistantBlock {
  return {
    kind: "enterprise-analysis",
    title: `${projectName} · 投资分析报告`,
    summary: `已围绕「${query.trim().slice(0, 36) || "本项目"}」完成材料阅读、投资问题拆解、独立估值、外部研究和失败场景压力测试。当前判断为有条件推进，核心前提是增长质量、价格边界与交易保护必须同时闭合。`,
    overallLevel: "R4",
    dimensions: [
      {
        key: "market",
        label: "行业与市场",
        level: "R3",
        finding: "市场需求存在，但公开市场规模口径差异较大，不能直接外推为公司收入。",
        recommendation: "用可触达客户预算和近两年实际订单替代宽口径 TAM 作为增长依据。",
      },
      {
        key: "business",
        label: "产品与商业模式",
        level: "R3",
        finding: "产品能力与行业积累具备基础，但标准化收入和可复制交付仍需进一步证明。",
        recommendation: "补充标准产品收入占比、续费、交付周期与单项目毛利的连续数据。",
      },
      {
        key: "customers",
        label: "客户与增长质量",
        level: "R4",
        finding: "增长对重点客户、集中确收与长回款周期存在依赖。",
        recommendation: "将重点客户验收、回款与新增客户结构设为交割前核查条件。",
      },
      {
        key: "financial",
        label: "财务与现金流",
        level: "R4",
        finding: "利润改善尚未充分转化为经营现金流，预测兑现存在时间和口径风险。",
        recommendation: "以审计口径重做收入、毛利和现金流桥接，并加入下行情景。",
      },
      {
        key: "valuation",
        label: "估值与价格边界",
        level: "R4",
        finding: "当前价格依赖较乐观的增长和退出倍数，安全边际不足。",
        recommendation: "以下行情景为基准重新议价，或用分期交割与业绩保护换取风险补偿。",
      },
      {
        key: "exit",
        label: "退出与失败场景",
        level: "R3",
        finding: "IPO 时点和估值倍数不应作为确定性基准，退出路径需要情景化。",
        recommendation: "同时评估 IPO 推迟、并购退出和下一轮融资稀释三类情景。",
      },
    ],
    highlights: [
      "投资建议：有条件推进，不建议按现有乐观假设无条件投资",
      "价格原则：以独立估值的下行区间作为谈判起点",
      "交割前提：重点客户验收回款、核心财务口径与重大合规事项闭合",
      "最可能失败原因：增长未从项目驱动转化为可复制的产品化增长",
    ],
  };
}

/** 当用户主动发起挑战质询时，构造一个通用 challenge-list 占位块作为完成时的结果 */
function buildGenericChallengeBlock(query: string): AssistantBlock {
  return {
    kind: "challenge-list",
    title: "灵魂质询清单（按当前偏好口径过滤）",
    summary: `围绕您提出的「${query.trim().slice(0, 36)}…」与该项目知识库做了多维对照，得到以下质询要点与条款建议。`,
    items: [
      {
        id: "auto-c-1",
        riskLevel: "R4",
        title: "核心假设缺乏外部数据支撑",
        coreLogic:
          "公司测算所依赖的关键假设（增速 / 毛利 / 客单价）目前主要来源于内部 BP，缺少行业研报或可比对标的交叉佐证。建议在条款层面加入「超出假设区间触发对赌」机制。",
        evidence: [
          {
            document: "BP_2026Q2.pptx",
            page: 17,
            excerpt: "公司假设 2026 年综合毛利率提升至 55%（依据：底层模型推理价格下降 40%）。",
            highlight: ["55%", "下降 40%"],
          },
        ],
        actionAdvice: [
          "要求公司提供第三方对标数据；24 个月内综合毛利不低于 35% 即触发业绩补偿",
        ],
        category: "财务",
      },
      {
        id: "auto-c-2",
        riskLevel: "R3",
        title: "团队基因与战略路径错配",
        coreLogic:
          "团队画像与战略路径之间存在明显错配，需要在投后协议层面建立纠偏机制（如关键岗位变更知会权、独立技术董事席位）。",
        evidence: [
          {
            document: "BP_2026Q2.pptx",
            page: 6,
            excerpt: "CTO 张某履历披露偏概括，缺少具体项目与年限信息。",
            highlight: ["资深架构师"],
          },
        ],
        actionAdvice: [
          "增设 CTO 履历背调专项条款；投后协议预留关键岗位变更知会权",
        ],
        category: "团队",
      },
    ],
    citations: [],
  };
}

export default App;
