import type { Project, ProjectLifecycleStage } from "@/src/types";

export type ProjectNotification = {
  id: string;
  projectId: string;
  projectName: string;
  stage: ProjectLifecycleStage;
  kind: "stage-advanced";
  title: string;
  summary: string;
  createdAt: string;
  readAt?: string;
};

export const PROJECT_NOTIFICATIONS_STORAGE_KEY = "invest-wise-general:project-notifications:v1";
export const DILIGENCE_NOTIFICATION_STAGE: ProjectLifecycleStage = "diligence";

const demoNotificationId = "stage-advanced:proj-haizhi:diligence";

function demoNotification(): ProjectNotification {
  return {
    id: demoNotificationId,
    projectId: "proj-haizhi",
    projectName: "海致科技 D 轮",
    stage: DILIGENCE_NOTIFICATION_STAGE,
    kind: "stage-advanced",
    title: "项目已进入尽调",
    summary: "海致科技 D 轮已进入尽调，可开始核对投决议案、财务与法律底稿。",
    createdAt: "2026-05-31T17:20:00+08:00",
  };
}

function demoReadHistory(): ProjectNotification {
  return {
    id: "stage-advanced:proj-aurora:diligence",
    projectId: "proj-aurora",
    projectName: "极光智算 Pre-A 轮",
    stage: DILIGENCE_NOTIFICATION_STAGE,
    kind: "stage-advanced",
    title: "项目已进入尽调",
    summary: "极光智算 Pre-A 轮已从立项推进到尽调，当前已进入投决阶段。",
    createdAt: "2026-03-16T09:18:00+08:00",
    readAt: "2026-03-16T10:04:00+08:00",
  };
}

function isNotification(value: unknown): value is ProjectNotification {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<ProjectNotification>;
  return typeof item.id === "string" && typeof item.projectId === "string" &&
    typeof item.projectName === "string" && item.stage === DILIGENCE_NOTIFICATION_STAGE &&
    item.kind === "stage-advanced" && typeof item.title === "string" &&
    typeof item.summary === "string" && typeof item.createdAt === "string" &&
    (item.readAt === undefined || typeof item.readAt === "string");
}

export function readProjectNotifications(): ProjectNotification[] {
  if (typeof window === "undefined") return [demoNotification(), demoReadHistory()];
  try {
    const raw = window.localStorage.getItem(PROJECT_NOTIFICATIONS_STORAGE_KEY);
    if (raw === null) return [demoNotification(), demoReadHistory()];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isNotification) : [demoNotification(), demoReadHistory()];
  } catch {
    return [demoNotification(), demoReadHistory()];
  }
}

export function writeProjectNotifications(notifications: ProjectNotification[]) {
  try {
    window.localStorage.setItem(PROJECT_NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
  } catch {
    // Embedded/private browsing contexts may deny localStorage. Keep the in-memory state.
  }
}

export function markProjectNotificationRead(notifications: ProjectNotification[], id: string, at = new Date().toISOString()) {
  return notifications.map((item) => item.id === id && !item.readAt ? { ...item, readAt: at } : item);
}

export function markAllProjectNotificationsRead(notifications: ProjectNotification[], at = new Date().toISOString()) {
  return notifications.map((item) => item.readAt ? item : { ...item, readAt: at });
}

export function createDiligenceNotification(project: Project, at = new Date().toISOString()): ProjectNotification {
  return {
    id: `stage-advanced:${project.id}:${DILIGENCE_NOTIFICATION_STAGE}`,
    projectId: project.id,
    projectName: project.name,
    stage: DILIGENCE_NOTIFICATION_STAGE,
    kind: "stage-advanced",
    title: "项目已进入尽调",
    summary: `${project.name}已从立项推进到尽调，可开始核对投决议案、财务与法律底稿。`,
    createdAt: at,
  };
}

export function appendDiligenceNotification(notifications: ProjectNotification[], project: Project, at = new Date().toISOString()) {
  if ((project.currentLifecycleStage ?? project.lifecycleStage) !== DILIGENCE_NOTIFICATION_STAGE) return notifications;
  const next = createDiligenceNotification(project, at);
  return notifications.some((item) => item.id === next.id) ? notifications : [next, ...notifications];
}

export function notificationStageLabel(stage: ProjectLifecycleStage) {
  return stage === "diligence" ? "尽调阶段" : stage === "decided" ? "投决阶段" : `${stage}阶段`;
}

export function formatProjectNotificationTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "时间未提供";
  return new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
}

export function isBeforeDiligence(stage: ProjectLifecycleStage) {
  return stage === "contact" || stage === "intake" || stage === "approved";
}
