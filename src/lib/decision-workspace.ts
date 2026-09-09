import { getCommitteeBrief } from "@/src/data/committee-briefs";
import type { AuthRole, Project, ProjectLifecycleStage, QuestionContext } from "@/src/types";
import type { DecisionAction, DecisionItem, DecisionWorkspaceData, TaskSnapshot } from "@/src/types/decision";

export const decisionResultLabels = { conditional: "有条件通过", approved: "通过", pending: "结果待确认", deferred: "暂缓", rejected: "未通过" };
export const decisionStatusLabels = { missing: "待补材料", review: "待复核", supplement: "需补充", verified: "已核验", attention: "需判断", submitted: "已提交复核" };
export const inDecisionStage = (project: Project) => project.lifecycleStage === "decided";

const LIFECYCLE_ORDER: ProjectLifecycleStage[] = ["contact", "intake", "approved", "diligence", "decided", "signed", "funded", "post"];
const PROJECT_WORKFLOW_STORAGE_KEY = "invest-wise:project-workflow:v1";

export function restoreProjectWorkflow(projects: Project[]): Project[] {
  let saved: Record<string, Partial<Project>> = {};
  try {
    const raw: unknown = JSON.parse(window.localStorage.getItem(PROJECT_WORKFLOW_STORAGE_KEY) ?? "{}");
    if (raw && typeof raw === "object" && !Array.isArray(raw)) saved = raw as typeof saved;
  } catch { /* The bundled project data remains available when storage cannot be read. */ }
  return projects.map((project) => {
    const entry = saved[project.id];
    const initialStage = project.currentLifecycleStage ?? project.lifecycleStage ?? "contact";
    const savedStage = entry?.currentLifecycleStage;
    const stage = savedStage && LIFECYCLE_ORDER.indexOf(savedStage) >= LIFECYCLE_ORDER.indexOf(initialStage) ? savedStage : initialStage;
    const completed = LIFECYCLE_ORDER.slice(0, LIFECYCLE_ORDER.indexOf(stage));
    const restored = { ...project, lifecycleStage: stage, currentLifecycleStage: stage, completedLifecycleStages: completed };
    if (entry?.earlyStageRecords && typeof entry.earlyStageRecords === "object") restored.earlyStageRecords = entry.earlyStageRecords;
    const decision = entry?.decision && entry.decision.projectId === project.id && Array.isArray(entry.decision.items) && Array.isArray(entry.decision.terms)
      ? entry.decision : project.decision;
    return stage === "decided" ? { ...restored, decision: decision ?? createDecisionWorkspace(restored) } : { ...restored, decision };
  });
}

export function persistProjectWorkflow(projects: Project[]) {
  const progress = Object.fromEntries(projects.map((project) => [project.id, {
    currentLifecycleStage: project.currentLifecycleStage ?? project.lifecycleStage,
    completedLifecycleStages: project.completedLifecycleStages,
    earlyStageRecords: project.earlyStageRecords,
    decision: project.decision,
  }]));
  try { window.localStorage.setItem(PROJECT_WORKFLOW_STORAGE_KEY, JSON.stringify(progress)); }
  catch { /* Keep workflow changes available in memory if storage is blocked. */ }
}

/** Explicit, isolated scenario. A stage click never manufactures an actual approval. */
export function createDecisionWorkspace(project: Project): DecisionWorkspaceData {
  const empty: DecisionWorkspaceData = { id: `${project.id}:decision-v1`, projectId: project.id, result: "pending", version: "V1", isDemo: true,
    date: null, financing: null, investment: null, valuation: null, summary: "投决结果待确认，请补充正式决议及对应议案版本。", terms: [], items: [] };
  const report = project.files.find((file) => file.category === "投决议案" && file.status === "indexed");
  if (project.id !== "proj-aurora" || !report) return empty;
  const brief = getCommitteeBrief(project);
  const cash = brief.questions.find((q) => q.id === "aurora-cash-reconciliation");
  const margin = brief.questions.find((q) => q.id === "aurora-inference-margin");
  if (!cash || !margin) return empty;
  const common = { owner: "项目投资经理", reviewer: "授权复核人（待配置）", deadline: "待指定", evidence: [], history: [] };
  return { ...empty, result: "conditional", valuation: "人民币 11.8 亿元", summary: "按调整后估值有条件通过；现金流差额须在出资前完成核验，成本假设变化需另行评估。",
    terms: ["演示批准投前估值调整为人民币 11.8 亿元；融资总额与我方投资额仍待确认。", "出资前补齐现金流调节表及差额凭证，由授权人员核验。", "关键经营假设或交易条款发生重大变化，须按机构权限提交复核；不得自行豁免条件。"],
    approvedReport: { id: report.id, name: report.name, size: report.size, kind: report.kind, origin: "project" },
    items: [
      { ...common, id: "aurora-condition-cash", questionId: cash.id, kind: "condition", title: "425 万元现金流差额仍待核验", before: "出资前解释合并与单体经营现金流差额，并提供逐项凭证。", current: cash.context, impact: "该条件未核验前，不应视为出资准备已完成。", requirement: cash.neededEvidence, milestone: "出资前", critical: true, status: "missing", sources: cash.sources },
      { ...common, id: "aurora-change-margin", questionId: margin.id, kind: "change", title: "成本降幅未锁定，是否影响获批方案？", before: "原议案采用推理价格下降 40% 的盈利假设。", current: "情景假设：新增采购条款未锁定预期降幅，尚不能证明原盈利假设能够兑现。", impact: "若成本改善不足，需重评盈利预测及获批估值的支持条件。", requirement: margin.neededEvidence, milestone: "签约前", critical: true, status: "attention", sources: margin.sources },
      { ...common, id: "aurora-condition-materials", kind: "condition", title: "整理决议落实材料清单", before: "将决议要求与证明材料逐项对应。", current: "材料清单尚待项目经理整理。", impact: "用于签约和出资准备，不新增投资条件。", requirement: "条件落实说明及对应文件索引。", milestone: "签约前", critical: false, status: "missing", sources: [] },
      { ...common, id: "aurora-condition-valuation", questionId: "aurora-customer-growth", kind: "condition", title: "估值方案已调整至 11.8 亿元", before: "原议案投前估值为 12.6 亿元。", current: "演示情景已将获批方案调整至 11.8 亿元；正式协议仍待核对。", impact: "仅表示示例方案修改完成，不代表正式签约或出资获准。", requirement: "签约时核对正式协议与有效决议一致。", milestone: "签约前", critical: false, status: "verified", sources: [], history: [{ at: "", text: "演示预置：方案修改已核验，非真实审批记录。" }] },
    ] };
}

/** Viewing an earlier stage is a navigation action; it must not change the real project progress. */
export function selectProjectStage(project: Project, stage: ProjectLifecycleStage, role?: AuthRole): Project {
  const current = project.currentLifecycleStage ?? project.lifecycleStage ?? "contact";
  const currentIndex = LIFECYCLE_ORDER.indexOf(current);
  const nextIndex = LIFECYCLE_ORDER.indexOf(stage);
  if (nextIndex < 0 || nextIndex > currentIndex || (role === "committee-lead" && nextIndex < 3)) return project;
  if (project.lifecycleStage === stage) return project;
  return { ...project, currentLifecycleStage: current, lifecycleStage: stage };
}

/** Advance actual project progress one stage at a time. Only this path emits progression side effects. */
export function advanceProjectStage(project: Project, stage: ProjectLifecycleStage): Project | null {
  const current = project.currentLifecycleStage ?? project.lifecycleStage ?? "contact";
  const currentIndex = LIFECYCLE_ORDER.indexOf(current);
  const nextIndex = LIFECYCLE_ORDER.indexOf(stage);
  if (currentIndex < 0 || nextIndex !== currentIndex + 1) return null;
  const completed = new Set(project.completedLifecycleStages ?? []);
  completed.add(current);
  return {
    ...project,
    currentLifecycleStage: stage,
    completedLifecycleStages: LIFECYCLE_ORDER.filter((item) => completed.has(item)),
    lifecycleStage: stage,
    decision: stage === "decided" ? project.decision ?? createDecisionWorkspace(project) : project.decision,
  };
}

export function canAdvanceProjectStage(project: Project, stage: ProjectLifecycleStage) {
  const current = project.currentLifecycleStage ?? project.lifecycleStage ?? "contact";
  const currentIndex = LIFECYCLE_ORDER.indexOf(current);
  const nextIndex = LIFECYCLE_ORDER.indexOf(stage);
  return currentIndex >= 0 && nextIndex === currentIndex + 1;
}


export function getDecisionAttention(data: DecisionWorkspaceData, role: AuthRole) {
  return data.items.filter((item) => item.status !== "verified" && !(item.muted && role === "investment-director") && (role === "investment-director" || item.critical));
}

export function applyDecisionAction(project: Project, action: DecisionAction, role: AuthRole, at = new Date().toISOString()): Project {
  const data = project.decision;
  if (!inDecisionStage(project) || !data || data.projectId !== project.id || role !== "investment-director") return project;
  const current = data.items.find((item) => item.id === action.itemId);
  if (!current) return project;
  let changed: DecisionItem = { ...current };
  let message = "";
  if (action.type === "assign") {
    if (!action.owner.trim()) return project;
    changed.owner = action.owner.trim();
    changed.deadline = action.deadline || "待指定";
    message = `已更新处理安排：${changed.owner} · ${changed.deadline}（未发送通知）。`;
  } else if (action.type === "attach") {
    const newFiles = action.files.filter((file) => !current.evidence.some((old) => old.name === file.name && old.size === file.size));
    if (!newFiles.length) return project;
    changed.evidence = [...current.evidence, ...newFiles];
    changed.status = "review";
    changed.muted = false;
    message = `已收取 ${newFiles.length} 份材料的文件信息；未解析、未核验。`;
  } else if (action.type === "remove-evidence") {
    changed.evidence = current.evidence.filter((file) => file.id !== action.fileId);
    if (changed.evidence.length === current.evidence.length) return project;
    changed.status = changed.evidence.length ? "review" : current.kind === "change" ? "attention" : "missing";
    message = "已移除材料引用，需重新确认依据。";
  } else if (action.type === "submit") {
    if (!action.note.trim()) return project;
    changed.status = "submitted";
    changed.note = action.note.trim();
    message = "已记录提交复核（本地演示，未发送审批）。";
  } else if (action.type === "review-demo") {
    if (!data.isDemo || !current.evidence.length || !action.note.trim()) return project;
    changed.status = action.outcome;
    changed.note = action.note.trim();
    message = `演示复核结果：${decisionStatusLabels[action.outcome]}。${action.note.trim()}`;
  } else {
    changed.muted = action.type === "mute";
    message = changed.muted ? "暂不提醒；原条件及阻塞状态保持有效。" : "已恢复提醒。";
  }
  changed.history = [...current.history, { at, text: message }];
  return { ...project, decision: { ...data, items: data.items.map((item) => item.id === current.id ? changed : item) } };
}

export function decisionQuestionContext(project: Project, item: DecisionItem): QuestionContext {
  return { projectId: project.id, projectName: project.name, questionId: item.id, stage: "decided", decisionId: project.decision?.id, decisionStatus: item.status,
    question: item.title, thesis: item.before, context: `${item.current}\n处理状态：${decisionStatusLabels[item.status]}（演示）${item.note ? `\n处理说明：${item.note}` : ""}${item.evidence.length ? `\n已收取文件信息（未解析）：${item.evidence.map((file) => file.name).join("、")}` : ""}`,
    impact: item.impact, neededEvidence: item.requirement, sources: item.sources };
}

export function snapshotTask(project: Project, userRole?: AuthRole, reportSource?: TaskSnapshot["reportSource"]): TaskSnapshot {
  return JSON.parse(JSON.stringify({ project, userRole, reportSource }));
}
