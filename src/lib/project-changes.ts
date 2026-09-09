import type { Project, ProjectContextChange } from "@/src/types";
import type { ProjectReportEntry } from "./project-reports";
import { getDiligenceReportReviews, type ReportReviewItem } from "./report-review";

/** Library callbacks carry localized display names. Existing file identities stay canonical. */
export function canonicalLibraryFiles(project: Project, files: Project["files"]): Project["files"] {
  return files.map((file) => {
    const existing = project.files.find((candidate) => candidate.id === file.id);
    return existing ? { ...file, name: existing.name, category: existing.category } : file;
  });
}

export type PendingProjectChange = ReportReviewItem | ProjectContextChange;
export const changeOriginLabel = (item: PendingProjectChange) => "sourceReport" in item ? "报告分析" : { "company-info": "企业信息", "knowledge-base": "知识库", "report-submission": "报告提交" }[item.origin];

/** Record actual edits, never infer changed financial conclusions from file metadata. */
export function applyProjectUpdate(project: Project, patch: Partial<Project>, id: string, at: string, origin?: ProjectContextChange["origin"]): Project {
  const next = { ...project, ...patch, updatedAt: at };
  if (project.lifecycleStage !== "diligence") return next;
  const changes: ProjectContextChange[] = [];
  const fields = { name: "企业名称", industry: "所属行业", financingRound: "融资轮次", stage: "投资阶段" } as const;
  const changedFields = (Object.keys(fields) as Array<keyof typeof fields>).filter((key) => key in patch && patch[key] !== project[key]);
  if (changedFields.length) changes.push({ key: `project-change:${id}:company`, projectId: project.id, origin: "company-info", effect: "context-review", title: "企业信息已更新", before: changedFields.map((key) => `${fields[key]}：${project[key] ?? "未提供"}`).join("；"), after: changedFields.map((key) => `${fields[key]}：${next[key] ?? "未提供"}`).join("；"), reason: "确认更新后的企业信息是否纳入后续分析；确认或忽略不会回滚已保存的信息。", sources: [], createdAt: at });
  if (patch.files) {
    const signature = (file: Project["files"][number]) => JSON.stringify([file.id, file.name, file.kind, file.size, file.category]);
    const before = project.files.filter((file) => !patch.files!.some((candidate) => signature(candidate) === signature(file)));
    const after = patch.files.filter((file) => !project.files.some((candidate) => signature(candidate) === signature(file)));
    if (before.length || after.length) changes.push({ key: `project-change:${id}:files`, projectId: project.id, origin: origin ?? "knowledge-base", effect: "context-review", title: origin === "report-submission" ? "新报告版本待复核" : "项目资料发生变化", before: before.length ? before.map((file) => file.name).join("；") : "原有资料保留", after: after.length ? after.map((file) => file.name).join("；") : "所列资料已移除", reason: "仅检测到文件信息变化，未解析正文。确认后纳入后续复核；忽略不会撤销文件操作。", sources: [], createdAt: at });
  }
  return changes.length ? { ...next, contextChanges: [...changes, ...(project.contextChanges ?? [])] } : next;
}

export function getPendingProjectChanges(project: Project, reports: ProjectReportEntry[], includeSuperseded = false): PendingProjectChange[] {
  if (project.lifecycleStage !== "diligence") return [];
  return [...(project.contextChanges ?? []).filter((item) => item.projectId === project.id), ...getDiligenceReportReviews(project, reports, includeSuperseded)];
}
