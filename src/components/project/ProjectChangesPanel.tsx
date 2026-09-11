import { AppIcon } from "@/src/components/ui/app-icon";
import { IconArrowRight, IconChevronDown } from "@/src/lib/icons";
import { getReportReviewReasoningContext, type ReportReviewDecision } from "@/src/lib/report-review";
import type { PendingProjectChange } from "@/src/lib/project-changes";
import type { Project, QuestionContext, SourceAnchor } from "@/src/types";
import { ReportReviewList } from "./ReportReviewList";

export function ProjectChangesPanel({ project, items, decisions, onDecide, onViewSource, onOpenReasoning, readOnly = false }: {
  project: Project; items: PendingProjectChange[]; decisions: Record<string, ReportReviewDecision>;
  onDecide: (key: string, decision: ReportReviewDecision | null) => void;
  onViewSource: (source: SourceAnchor) => void;
  onOpenReasoning: (context: QuestionContext, trigger: HTMLElement) => void;
  readOnly?: boolean;
}) {
  if (project.lifecycleStage !== "diligence") return null;
  const scoped = items.filter((item) => item.projectId === project.id);
  return <details className="ic-recent-changes" key={`${project.id}:${readOnly}`}><summary><span>最近变化</span><span>{scoped.length} 项{!readOnly && scoped.some((item) => !decisions[item.key]) ? " · 待确认" : ""}</span><AppIcon icon={IconChevronDown} size={12} /></summary>
    {!scoped.length ? <p className="manager-version-empty">暂无新增材料变化。</p> : readOnly ? <div>{scoped.map((item) => <article className="ic-change-summary" key={item.key}><h3>{item.title}</h3><p>{item.after}</p><p>{item.reason}</p>{item.sources.map((source, index) => <button key={index} type="button" className="ic-overview-source" onClick={() => onViewSource(source)}>{source.document} · {source.page}</button>)}</article>)}</div> : <ReportReviewList items={scoped} decisions={decisions} onDecide={onDecide} onViewSource={onViewSource} renderReasoningAction={(item) => {
    if (!("sourceReport" in item)) return null;
    const context = getReportReviewReasoningContext(project, item, item.sourceReport.id);
    return context ? <button type="button" className="ic-overview-button manager-review-reasoning" aria-label={`查看“${item.title}”的推演过程`} onClick={(event) => onOpenReasoning(context, event.currentTarget)}>推演过程 <AppIcon icon={IconArrowRight} size={11} /></button> : null;
  }} />}</details>;
}
