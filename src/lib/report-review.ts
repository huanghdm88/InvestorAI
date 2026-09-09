import { getCommitteeBrief, getCoreQuestions } from "@/src/data/committee-briefs";
import { getQuestionPathModel } from "@/src/data/question-paths";
import { mockProjects } from "@/src/data/mock-projects";
import type { AssistantBlock, FileKind, KnowledgeFile, Project, QuestionContext, ReportChangeSuggestion, ReportSourceRef } from "@/src/types";
import type { ProjectReportEntry } from "./project-reports";

type Attachment = { name: string; size: string; kind: FileKind };
export type ReportReviewDecision = "accepted" | "ignored";
export interface ReportReviewItem extends ReportChangeSuggestion { key: string; projectId: string; sourceReport: ReportSourceRef; materialSignature: string; createdAt: string }

/** Keep the reviewed snapshot; only reuse editorial paths when the suggestion still matches. */
export function getReportReviewReasoningContext(project: Project, item: ReportReviewItem, selectedSourceId: string): QuestionContext | undefined {
  if (project.lifecycleStage !== "diligence" || item.projectId !== project.id || item.sourceReport.id !== selectedSourceId) return;
  const question = getCommitteeBrief(project).questions.find((candidate) => candidate.id === item.id);
  const matches = question && item.before === question.thesis && item.reason === question.context
    && item.after === getQuestionPathModel(question).premise && JSON.stringify(item.sources) === JSON.stringify(question.sources);
  return {
    projectId: project.id, projectName: project.name, stage: "diligence",
    questionId: matches ? question.id : `report-review:${item.key}`,
    question: matches ? question.question : item.title,
    thesis: item.before, context: item.reason, sources: item.sources.map((source) => ({ ...source })),
    impact: matches ? question.impact : `建议调整为：${item.after} 是否采纳仍需核对证据，不代表已完成核验。`,
    neededEvidence: matches ? question.neededEvidence : "核对该版本原报告、上述引用材料及建议表述的适用条件；缺失依据另行补齐。",
  };
}
export const getMaterialSignature = (project: Project, attachments: Attachment[] = []) => JSON.stringify([
  ...project.files.map((file) => `${file.id}:${file.name}:${file.size}`),
  ...attachments.filter((file) => !project.files.some((source) => source.name === file.name && source.kind === file.kind && source.size === file.size)).map((file) => `${file.kind}:${file.name}:${file.size}`),
].sort());

export function resolveReportSource(project: Project, attachments: Attachment[] = [], preferred?: ReportSourceRef): ReportSourceRef | undefined {
  const candidates = getCurrentReportCandidates(project);
  const attached = attachments.find((file) => candidates.some((candidate) => candidate.name === file.name))
    ?? attachments.find((file) => /投决|议案|投资.*报告|备忘录/i.test(file.name));
  if (!attached && preferred) return preferred;
  // Same-named submissions may also have the same size. Preserve an explicitly
  // selected version when its metadata matches the report-card attachment.
  if (attached && preferred && preferred.name === attached.name && preferred.size === attached.size && preferred.kind === attached.kind) return preferred;
  const source = attached ? candidates.find((file) => file.name === attached.name && file.size === attached.size) : candidates[0];
  if (source) return { id: source.id, name: source.name, size: source.size, kind: source.kind, origin: "project" };
  if (attached) return { id: `attachment:${attached.kind}:${attached.name}:${attached.size}`, ...attached, origin: "attachment" };
}

export function getCurrentReportCandidates(project: Project, reports: ProjectReportEntry[] = []): KnowledgeFile[] {
  const supplements = new Set(project.reportSubmissions?.filter((entry) => entry.stage === "decided").map((entry) => entry.file.id));
  const files = project.files.filter((file) => file.category === "投决议案" && !supplements.has(file.id));
  const map = new Map(files.map((file) => [file.id, file]));
  reports.filter((entry) => entry.projectId === project.id).forEach((entry) => {
    const source = entry.block.kind === "project-work-report" ? entry.block.sourceReport : undefined;
    if (source?.origin === "attachment" && !map.has(source.id)) map.set(source.id, { ...source, category: "投决议案", status: "indexed", uploadedAt: entry.createdAt });
  });
  return [...map.values()];
}

const changeTitles: Record<string, string> = {
  "aurora-cash-reconciliation": "现金流改善需补充口径说明",
  "aurora-inference-margin": "毛利预测需保留降本前提",
  "aurora-customer-growth": "收入预测需反映续约下滑",
  "haizhi-year-end-recognition": "全年盈利预测需保留验收条件",
  "haizhi-product-valuation": "估值需区分软件与项目交付",
  "haizhi-redemption-rights": "回购义务需保留未决说明",
};
export function buildReportSuggestions(project: Project): ReportChangeSuggestion[] {
  return getCoreQuestions(getCommitteeBrief(project)).map((question) => ({ id: question.id, title: changeTitles[question.id] ?? question.thesis.replace(/[。.]$/, ""),
    before: question.thesis, after: getQuestionPathModel(question).premise, reason: question.context, sources: question.sources }));
}

/** Completed report entries only; stable source/question keys prevent repeat verification from reopening handled items. */
export function collectReportReviews(projectId: string, reports: ProjectReportEntry[], includeSuperseded = false): ReportReviewItem[] {
  const byKey = new Map<string, ReportReviewItem>();
  [...reports].filter((entry) => entry.projectId === projectId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).forEach((entry) => {
    const block = entry.block;
    if (block.kind !== "project-work-report" || block.taskKind !== "fact-check" || !block.sourceReport) return;
    for (const change of block.suggestedChanges ?? []) {
      const key = JSON.stringify([projectId, block.sourceReport.id, block.materialSignature, change.id, change.before, change.after]);
      if (!byKey.has(key)) byKey.set(key, { ...change, key, projectId, sourceReport: block.sourceReport, materialSignature: block.materialSignature ?? "", createdAt: entry.createdAt });
    }
  });
  if (includeSuperseded) return [...byKey.values()];
  const currentQuestions = new Set<string>();
  return [...byKey.values()].filter((item) => {
    const identity = JSON.stringify([item.sourceReport.id, item.id]);
    if (currentQuestions.has(identity)) return false;
    currentQuestions.add(identity);
    return true;
  });
}

/** A preloaded review scenario, not a generated report or a newly verified fact. */
export function getDiligenceReportReviews(project: Project, reports: ProjectReportEntry[], includeSuperseded = false): ReportReviewItem[] {
  if (project.lifecycleStage !== "diligence") return [];
  const completed = collectReportReviews(project.id, reports, true);
  const baseline = project.id === "proj-aurora" ? mockProjects.find((item) => item.id === project.id) : undefined;
  const sourceReport = baseline ? getSelectedReportSource(baseline, []) : undefined;
  // Display names can be localized; file identity must not change with language.
  const sourceExists = sourceReport && project.files.some((file) => file.id === sourceReport.id && file.size === sourceReport.size && file.kind === sourceReport.kind);
  // Keep the fixture signature stable when other files are uploaded or a stage is revisited.
  const materialSignature = baseline ? getMaterialSignature(baseline) : "";
  const seeded: ReportReviewItem[] = baseline && sourceReport && sourceExists ? buildReportSuggestions(baseline).map((change) => ({
    ...change, sourceReport, projectId: project.id, materialSignature, createdAt: baseline.updatedAt,
    key: JSON.stringify([project.id, sourceReport.id, materialSignature, change.id, change.before, change.after]),
  })) : [];
  const seenKeys = new Set<string>();
  const seenQuestions = new Set<string>();
  // Completed work takes precedence; the fixture must not reopen or duplicate its changes.
  return [...completed, ...seeded].filter((item) => {
    const identity = JSON.stringify([item.sourceReport.id, item.id]);
    if (seenKeys.has(item.key) || (!includeSuperseded && seenQuestions.has(identity))) return false;
    seenKeys.add(item.key);
    seenQuestions.add(identity);
    return true;
  });
}

export function getSelectedReportSource(project: Project, reports: ProjectReportEntry[], selectedId?: string): ReportSourceRef | undefined {
  const candidates = getCurrentReportCandidates(project, reports);
  const file = selectedId ? candidates.find((file) => file.id === selectedId) : candidates[0];
  return file ? { id: file.id, name: file.name, size: file.size, kind: file.kind, origin: file.id.startsWith("attachment:") ? "attachment" : "project" } : undefined;
}

export function getReportVersions(project: Project, sourceId: string, reports: ProjectReportEntry[], stage: "diligence" | "decided" = "diligence") {
  return reports.filter((entry) => entry.projectId === project.id && entry.block.kind === "project-work-report"
    && (stage === "decided" ? entry.block.projectStage === "decided" : entry.block.projectStage !== "decided")
    && entry.block.taskKind === "investment-report" && (entry.block.sourceReport?.id === sourceId || (!entry.block.sourceReport && sourceId === project.files.find((file) => file.category === "投决议案")?.id)))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Saves a revision record, never edits a PDF or marks missing evidence as verified. */
export function buildReportRevision(source: ReportSourceRef, items: ReportReviewItem[], decisions: Record<string, ReportReviewDecision>): Extract<AssistantBlock, { kind: "project-work-report" }> {
  const latest = new Map<string, ReportReviewItem>();
  items.filter((item) => item.sourceReport.id === source.id && decisions[item.key] === "accepted")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .forEach((item) => { if (!latest.has(item.id)) latest.set(item.id, item); });
  const accepted = [...latest.values()];
  return { kind: "project-work-report", taskKind: "investment-report", title: `${source.name.replace(/\.[^.]+$/, "")} · 修订草稿`, sourceReport: source,
    summary: accepted.length ? `已确认 ${accepted.length} 项表述调整。` : "当前无已确认修改。", query: "根据投资经理已确认的修改形成修订记录。",
    sections: accepted.length ? accepted.map((item) => ({ id: item.id, title: item.title, text: `原表述：${item.before}\n修订表述：${item.after}` })) : [{ id: "restored", title: "已撤销全部修订", text: "当前无已确认修改，以原报告为准。" }],
    citations: accepted.flatMap((item) => item.sources).filter((source, index, all) => all.findIndex((entry) => JSON.stringify(entry) === JSON.stringify(source)) === index),
    revision: { changeKeys: accepted.map((item) => item.key) },
  };
}
