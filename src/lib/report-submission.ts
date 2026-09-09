import type { AuthRole, KnowledgeFile, Project } from "@/src/types";
import { inferUploadFileKind, validateUploadFiles } from "./file-upload";
import { applyProjectUpdate } from "./project-changes";

export const REPORT_UPLOAD_ACCEPT = ".pdf,.doc,.docx";
export interface ReportSubmissionRequest {
  projectId: string;
  stage: "diligence" | "decided";
  file: File;
  previousSourceId?: string;
}
export type ReportSubmissionResult = { ok: true; file: KnowledgeFile } | { ok: false; error: string };

export function reportFileError(file: File): string | undefined {
  if (!/\.(pdf|doc|docx)$/i.test(file.name)) return "请选择 PDF 或 Word 报告。";
  if (file.size === 0) return "文件为空，请重新选择。";
  const { rejected } = validateUploadFiles([file]);
  if (rejected[0]?.reason === "too-large") return "报告不能超过 50 MB。";
  if (rejected.length) return "文件格式与类型不符，请重新选择。";
}

/** Append a new version atomically. Same names are allowed; existing files and decisions are immutable. */
export function applyReportSubmission(project: Project, request: ReportSubmissionRequest, role: AuthRole, id: string, at: string): ReportSubmissionResult & { project?: Project } {
  if (role !== "investment-director" || project.id !== request.projectId || project.lifecycleStage !== request.stage || !["diligence", "decided"].includes(request.stage)) return { ok: false, error: "项目或阶段已变化，请重新提交。" };
  const error = reportFileError(request.file);
  if (error) return { ok: false, error };
  if (project.files.some((file) => file.id === id) || project.reportSubmissions?.some((entry) => entry.id === id)) return { ok: false, error: "该版本已提交。" };
  const bytes = request.file.size;
  const size = bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  const file: KnowledgeFile = { id, name: request.file.name, kind: inferUploadFileKind(request.file.name), size, status: "unparsed", category: "投决议案", uploadedAt: at };
  const previousSourceId = request.stage === "decided" ? project.decision?.approvedReport?.id : request.previousSourceId;
  return { ok: true, file, project: { ...applyProjectUpdate(project, { files: [file, ...project.files] }, id, at, "report-submission"), reportSubmissions: [{ id, stage: request.stage, file, previousSourceId }, ...(project.reportSubmissions ?? [])] } };
}
