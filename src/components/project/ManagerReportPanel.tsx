import { useId, useState } from "react";
import { ReportFileIcon } from "./ReportFileIcon";
import { ReportVersionsSheet } from "./ReportVersionsSheet";
import { getCurrentReportCandidates, getMaterialSignature, getReportVersions } from "@/src/lib/report-review";
import type { ProjectReportEntry, ReportBlock } from "@/src/lib/project-reports";
import { AppIcon } from "@/src/components/ui/app-icon";
import { IconArrowRight, IconChevronDown, IconFileText } from "@/src/lib/icons";
import type { KnowledgeFile, Project, SourceAnchor } from "@/src/types";
import { getCommitteeBrief } from "@/src/data/committee-briefs";

export { getCurrentReportCandidates, getMaterialSignature } from "@/src/lib/report-review";

export interface ManagerReportDraft { selectedId: string; materialSignature: string }
export function createManagerReportDraft(project: Project): ManagerReportDraft {
  if (project.lifecycleStage === "decided") return { selectedId: project.decision?.approvedReport?.id ?? "", materialSignature: getMaterialSignature(project) };
  return { selectedId: getCurrentReportCandidates(project)[0]?.id ?? "", materialSignature: getMaterialSignature(project) };
}

export function ManagerReportPanel({ project, draft, onDraftChange, onViewSource, reports = [], onOpenReport, readOnly = false }: {
  readOnly?: boolean;
  project: Project;
  draft: ManagerReportDraft;
  onDraftChange: (draft: ManagerReportDraft) => void;
  onViewSource: (source: SourceAnchor) => void;
  reports?: ProjectReportEntry[];
  onOpenReport?: (block: ReportBlock) => void;
}) {
  const candidates = getCurrentReportCandidates(project, reports);
  const isDecision = project.lifecycleStage === "decided";
  const selectedId = isDecision ? project.decision?.approvedReport?.id ?? "" : draft.selectedId;
  const [evidenceOpen, setEvidenceOpen] = useState(true);
  const evidenceId = useId();
  const [versionsOpen, setVersionsOpen] = useState(false);
  const currentFile = candidates.find((file) => file.id === selectedId);
  const baseline = isDecision ? project.decision?.approvedReport : undefined;
  const selected: KnowledgeFile | undefined = currentFile ?? (baseline ? { ...baseline, status: "failed", uploadedAt: "", category: "投决议案" } : undefined);
  const materialsChanged = draft.materialSignature !== getMaterialSignature(project);
  const brief = getCommitteeBrief(project);
  const reportSources = brief.questions.flatMap((question) => question.sources).filter((source, index, all) =>
    Boolean(selected?.name.includes(source.document)) && all.findIndex((item) => item.document === source.document && item.page === source.page && item.paragraph === source.paragraph) === index,
  );
  const versions = getReportVersions(project, selectedId, reports, isDecision ? "decided" : "diligence");
  const latestSubmission = isDecision ? project.reportSubmissions?.find((entry) => entry.stage === "decided") : undefined;
  return <section className="manager-current-report" aria-labelledby="manager-current-report-title">
    <div className="ic-overview-section-heading"><h2 id="manager-current-report-title">当前报告</h2><button type="button" className="manager-text-action" onClick={() => setVersionsOpen(true)}>历史版本</button></div>
    <div className="manager-report-card">
      <div className="manager-report-heading">
        <ReportFileIcon name={selected?.name} />
        <div className="manager-report-name"><h3>{selected?.name ?? (isDecision ? "获批报告版本待确认" : "尚未指定投资报告")}</h3>{selected && <p>{isDecision ? "获批基准" : selected.status === "unparsed" ? "提交版本" : "原报告"}</p>}</div>
        {selected && !isDecision && <span className="ic-question-status">{selected.status === "unparsed" ? "未解析" : materialsChanged ? "需重新复核" : selected.status === "indexed" ? "待复核" : selected.status === "failed" ? "资料处理失败" : "资料处理中"}</span>}
      </div>
      {baseline && !currentFile && <p className="manager-report-update">原文件不在资料库中，已保留获批基准引用；需重新补充文件。</p>}
      {latestSubmission && <button type="button" className="manager-latest-submission" onClick={() => setVersionsOpen(true)}><span>最新提交</span><strong>{latestSubmission.file.name}</strong><AppIcon icon={IconArrowRight} size={12} /></button>}
      {versions.length > 0 && <button type="button" className="manager-latest-version" onClick={() => onOpenReport?.(versions[0].block)}>{isDecision ? "最新落实说明" : "最新草稿"} <AppIcon icon={IconArrowRight} size={11} /></button>}
      {reportSources.length > 0 && <>
        <div className="manager-report-actions"><button type="button" className="manager-text-action manager-report-evidence-toggle" aria-expanded={evidenceOpen} aria-controls={evidenceId} onClick={() => setEvidenceOpen((current) => !current)}>报告依据<AppIcon icon={IconChevronDown} size={10} /></button></div>
        <div id={evidenceId} className="manager-report-evidence-panel" data-expanded={evidenceOpen} aria-hidden={!evidenceOpen} inert={!evidenceOpen}><div className="manager-report-evidence-inner"><div className="manager-report-evidence">{reportSources.map((source, index) => <button type="button" className="ic-overview-source" key={index} onClick={() => onViewSource(source)}><AppIcon icon={IconFileText} size={13} />{source.document} · {source.page}<AppIcon icon={IconArrowRight} size={11} /></button>)}</div></div></div>
      </>}
    </div>
    <ReportVersionsSheet open={versionsOpen} onOpenChange={setVersionsOpen} project={project} selectedId={selectedId} reports={reports} onSelectSource={(selectedId) => { if (!isDecision && !readOnly) onDraftChange({ ...draft, selectedId }); setEvidenceOpen(true); }} onOpenReport={(block) => onOpenReport?.(block)} locked={isDecision || readOnly} />
  </section>;
}
