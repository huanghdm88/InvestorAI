import { AppIcon } from "@/src/components/ui/app-icon";
import { IconArrowRight } from "@/src/lib/icons";
import { getReportReviewReasoningContext, type ReportReviewDecision } from "@/src/lib/report-review";
import type { PendingProjectChange } from "@/src/lib/project-changes";
import type { Project, QuestionContext, SourceAnchor } from "@/src/types";
import { ReportReviewList } from "./ReportReviewList";

export function ProjectChangesPanel({ project, items, decisions, onDecide, onViewSource, onOpenReasoning }: {
  project: Project; items: PendingProjectChange[]; decisions: Record<string, ReportReviewDecision>;
  onDecide: (key: string, decision: ReportReviewDecision | null) => void;
  onViewSource: (source: SourceAnchor) => void;
  onOpenReasoning: (context: QuestionContext, trigger: HTMLElement) => void;
}) {
  if (project.lifecycleStage !== "diligence") return null;
  const scoped = items.filter((item) => item.projectId === project.id);
  if (!scoped.length) return <section className="manager-review-list" id="manager-pending-changes"><div className="ic-overview-section-heading"><h2>待确认变更</h2></div><p className="manager-version-empty">暂无待确认变更。</p></section>;
  return <ReportReviewList items={scoped} decisions={decisions} onDecide={onDecide} onViewSource={onViewSource} renderReasoningAction={(item) => {
    if (!("sourceReport" in item)) return null;
    const context = getReportReviewReasoningContext(project, item, item.sourceReport.id);
    return context ? <button type="button" className="ic-overview-button manager-review-reasoning" aria-label={`查看“${item.title}”的推演过程`} onClick={(event) => onOpenReasoning(context, event.currentTarget)}>推演过程 <AppIcon icon={IconArrowRight} size={11} /></button> : null;
  }} />;
}
