import { useId, useState } from "react";
import { AppIcon } from "@/src/components/ui/app-icon";
import { IconArrowRight, IconChevronDown } from "@/src/lib/icons";
import { getCommitteeAnalysisQuestionContext, getCommitteeAnalysisQuestions, type CommitteeAnalysisQuestion } from "@/src/data/committee-analysis-questions";
import type { ProjectReportEntry, ReportBlock } from "@/src/lib/project-reports";
import type { Project, QuestionContext, SourceAnchor } from "@/src/types";
import { ReasoningSources } from "./QuestionReasoningDialog";

export const focusQuestionId = (projectId: string, questionId: string) => `current-focus-${projectId}-${questionId}`;

interface CommitteeAnalysisQuestionsProps {
  project: Project; reports: ProjectReportEntry[];
  onOpenReport: (block: ReportBlock) => void;
  onViewSource: (source: SourceAnchor) => void;
  onAsk: (context: QuestionContext) => void;
  onOpenReasoning: (context: QuestionContext, trigger: HTMLElement) => void;
}

function AnalysisQuestionRow({ project, question, onOpenReport, onViewSource, onAsk, onOpenReasoning }: Omit<CommitteeAnalysisQuestionsProps, "reports"> & { question: CommitteeAnalysisQuestion }) {
  const [expanded, setExpanded] = useState(false);
  const headingId = useId();
  const detailId = useId();
  const context = getCommitteeAnalysisQuestionContext(project, question);
  return <article className="ic-analysis-question" aria-labelledby={headingId}>
    <div className="ic-analysis-question-heading">
      <div className="ic-analysis-question-title"><span className="ic-analysis-category">{question.category}</span><h3 id={headingId}>{question.question}</h3></div>
      <div className="ic-analysis-question-controls">
        <button type="button" className="ic-overview-button" aria-label={`查看“${question.question}”的推演过程`} onClick={(event) => onOpenReasoning(context, event.currentTarget)}>推演过程 <AppIcon icon={IconArrowRight} size={11} /></button>
        <button type="button" className="ic-overview-button ic-analysis-evidence-toggle" aria-expanded={expanded} aria-controls={detailId} aria-label={`“${question.question}”的项目依据`} onClick={() => setExpanded((current) => !current)}>项目依据 <AppIcon icon={IconChevronDown} size={11} /></button>
      </div>
    </div>
    <div id={detailId} className="ic-analysis-question-evidence" data-expanded={expanded} aria-hidden={!expanded} inert={!expanded}>
      <div className="ic-analysis-question-evidence-inner"><div className="ic-analysis-question-content">
        <p>{question.conclusion}</p>
        <button type="button" className="manager-text-action ic-analysis-report" onClick={() => onOpenReport(question.report.block)}>分析来源：{question.report.block.title} <AppIcon icon={IconArrowRight} size={11} /></button>
        <ReasoningSources sources={question.sources} onViewSource={onViewSource} />
        <div className="ic-analysis-question-actions"><button type="button" className="ic-overview-button" onClick={() => onAsk(context)}>就此追问 <AppIcon icon={IconArrowRight} size={11} /></button></div>
      </div></div>
    </div>
  </article>;
}

export function CommitteeAnalysisQuestions({ project, reports, onOpenReport, onViewSource, onAsk, onOpenReasoning }: CommitteeAnalysisQuestionsProps) {
  const questions = getCommitteeAnalysisQuestions(project, reports);
  return <section className="ic-analysis-questions" aria-labelledby="ic-analysis-questions-title">
    <div className="ic-overview-section-heading"><h2 id="ic-analysis-questions-title">质询问题</h2><span>{questions.length ? `${questions.length} 项` : "待分析"}</span></div>
    {questions.length ? <div className="ic-analysis-question-list">{questions.map((question) => <AnalysisQuestionRow key={`${project.id}:${question.id}`} project={project} question={question} onOpenReport={onOpenReport} onViewSource={onViewSource} onAsk={onAsk} onOpenReasoning={onOpenReasoning} />)}</div> : <p className="ic-analysis-empty">当前暂无可引用的投资分析结论。</p>}
  </section>;
}
