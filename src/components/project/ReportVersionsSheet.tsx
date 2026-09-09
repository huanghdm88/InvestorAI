import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/src/components/ui/sheet";
import { ReportFileIcon } from "./ReportFileIcon";
import { getCurrentReportCandidates, getReportVersions } from "@/src/lib/report-review";
import type { ProjectReportEntry, ReportBlock } from "@/src/lib/project-reports";
import type { Project } from "@/src/types";

export const formatVersionTime = (value: string) => Number.isNaN(Date.parse(value)) ? "日期未提供" : new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value));

export function ReportVersionList({ project, selectedId, reports, onSelectSource, onOpenReport, locked = false }: {
  locked?: boolean;
  project: Project; selectedId: string; reports: ProjectReportEntry[];
  onSelectSource: (id: string) => void; onOpenReport: (report: ReportBlock) => void;
}) {
  const submissions = project.reportSubmissions ?? [];
  const submissionIds = new Set(submissions.map((entry) => entry.file.id));
  const sources = getCurrentReportCandidates(project, reports).filter((file) => !submissionIds.has(file.id));
  const baseline = project.decision?.approvedReport;
  const missingBaseline = locked && baseline && !sources.some((file) => file.id === baseline.id);
  if (missingBaseline) sources.push({ ...baseline, uploadedAt: "", status: "failed", category: "投决议案" });
  const versions = getReportVersions(project, selectedId, reports);
  const decisionReports = getReportVersions(project, selectedId, reports, "decided");
  return <div className="manager-version-list">
    <h3>原报告</h3>
    {sources.length ? sources.map((file) => <div className="manager-version-row" key={file.id}><ReportFileIcon name={file.name} /><div><strong>{file.name}</strong><span>{file.id.startsWith("attachment:") ? "会话附件" : "项目资料"} · {formatVersionTime(file.uploadedAt)}</span></div>{file.id === selectedId ? <span className="ic-question-status">{locked ? "获批基准（演示）" : "当前"}</span> : !locked && <button type="button" className="ic-shell-button" onClick={() => onSelectSource(file.id)}>切换</button>}</div>) : <p className="manager-version-empty">尚未添加原报告。</p>}
    {missingBaseline && <p className="manager-version-note">获批原文件已不在资料库中，此处保留版本引用。</p>}
    {submissions.length > 0 && <><h3>提交版本</h3>{submissions.map((entry, index) => {
      const file = project.files.find((item) => item.id === entry.file.id);
      return <div className="manager-version-row" key={entry.id}><ReportFileIcon name={entry.file.name} /><div><strong>{entry.file.name}</strong><span>{entry.stage === "decided" ? "投决后补充" : "提交报告"} {submissions.length - index} · {formatVersionTime(entry.file.uploadedAt)} · {file ? "未解析" : "原文件已移除"}</span></div>{entry.file.id === selectedId ? <span className="ic-question-status">当前</span> : !locked && file && entry.stage === "diligence" && <button type="button" className="ic-shell-button" onClick={() => onSelectSource(file.id)}>切换</button>}</div>;
    })}</>}
    <h3>生成与修订草稿</h3>
    {versions.length ? versions.map((entry, index) => <button type="button" className="manager-version-row manager-version-open" key={entry.id} onClick={() => onOpenReport(entry.block)}><ReportFileIcon /><div><strong>{entry.block.title}</strong><span>{entry.block.kind === "project-work-report" && entry.block.revision ? "修订草稿" : "生成草稿"} {versions.length - index} · {formatVersionTime(entry.createdAt)}</span></div><span>查看 →</span></button>) : <p className="manager-version-empty">当前报告暂无历史草稿。生成报告或确认修改后会保留版本。</p>}
    {decisionReports.length > 0 && <><h3>决议后补充报告</h3>{decisionReports.map((entry) => <button type="button" className="manager-version-row manager-version-open" key={entry.id} onClick={() => onOpenReport(entry.block)}><ReportFileIcon /><div><strong>{entry.block.title}</strong><span>{formatVersionTime(entry.createdAt)}</span></div><span>查看 →</span></button>)}</>}
  </div>;
}

export function ReportVersionsSheet({ open, onOpenChange, ...props }: Parameters<typeof ReportVersionList>[0] & { open: boolean; onOpenChange: (open: boolean) => void }) {
  return <Sheet open={open} onOpenChange={onOpenChange}><SheetContent className="manager-versions-sheet"><SheetTitle>历史版本</SheetTitle><SheetDescription className="sr-only">{props.project.name}</SheetDescription><ReportVersionList {...props} onOpenReport={(report) => { onOpenChange(false); props.onOpenReport(report); }} /></SheetContent></Sheet>;
}
