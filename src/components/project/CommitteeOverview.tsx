import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ProjectStageTrack } from "./ProjectStageTrack";
import { RollingAmount, StageMotion, StageTypewriter } from "./StageMotion";
import { ProjectMarketPanel } from "./ProjectMarketPanel";
import { QuestionReasoningDialog } from "./QuestionReasoningDialog";
import { focusQuestionId } from "./CommitteeAnalysisQuestions";
import { EarlyStageWorkspace } from "./EarlyStageWorkspace";
import { LateStageWorkspace } from "./LateStageWorkspace";
import { isProjectStagePreview } from "@/src/lib/decision-workspace";

import { AppIcon } from "@/src/components/ui/app-icon";
import {
  getCommitteeBrief,
  getCoreQuestions,
  type CoreQuestion,
} from "@/src/data/committee-briefs";
import {
  IconArrowRight,
  IconChevronDown,
  IconFileText,
  IconMessage,
} from "@/src/lib/icons";
import type { EarlyStageKey, Project, ProjectLifecycleStage, QuestionContext, SourceAnchor } from "@/src/types";
import { getProjectIdentity } from "@/src/lib/project-identity";

import "./committee-overview.css";

interface CommitteeOverviewProps {
  project: Project;
  onViewSource: (anchor: SourceAnchor) => void;
  onAsk: (context: QuestionContext) => void;
  onOpenKnowledge: () => void;
  beforeQuestions?: ReactNode | ((openReasoning: (context: QuestionContext, trigger: HTMLElement) => void) => ReactNode);
  showCurrentFocus?: boolean;
  reasoningScopeKey?: string;
  decisionContent?: ReactNode;
  afterQuestions?: ReactNode;
  onPreviewStage?: (stage: ProjectLifecycleStage) => void;
  onStageChange?: (stage: ProjectLifecycleStage) => void;
  onAdvanceStage?: (stage: ProjectLifecycleStage) => void;
  onEarlyStageSave?: (stage: EarlyStageKey, values: Record<string, string>) => void;
}

interface QuestionRowProps {
  question: CoreQuestion;
  index: number;
  projectName: string;
  projectId: string;
  onViewSource: (anchor: SourceAnchor) => void;
  onAsk: (context: QuestionContext) => void;
  secondary?: boolean;
  onOpenReasoning: (context: QuestionContext, trigger: HTMLElement) => void;
}

function QuestionRow({
  question,
  index,
  projectName,
  projectId,
  onViewSource,
  onAsk,
  secondary = false,
  onOpenReasoning,
}: QuestionRowProps) {
  const [expanded, setExpanded] = useState(!secondary);
  const detailId = useId();
  const headingId = useId();
  const context: QuestionContext = { projectId, projectName, questionId: question.id,
    question: question.question, context: question.context, thesis: question.thesis,
    impact: question.impact, neededEvidence: question.neededEvidence, sources: question.sources };

  return (
    <li id={focusQuestionId(projectId, question.id)} tabIndex={-1} className={`ic-question${secondary ? " ic-question--secondary" : ""}`}>
      <span className="ic-question-number" aria-hidden="true">
        {String(index + 1).padStart(2, "0")}
      </span>
      <article className="ic-question-body" aria-labelledby={headingId}>
        <div className="ic-question-heading">
          <h3 id={headingId}>{question.question}</h3>
          <span className="ic-question-status">
            {question.scope === "resolved" ? "已解答" : question.status}
          </span>
        </div>
        <p className="ic-question-context">{question.context}</p>
        <p className="ic-question-impact">{question.impact}</p>

        {expanded && (
          <div className="ic-question-detail" id={detailId}>
            <dl className="ic-question-detail-grid">
              <div>
                <dt>对应投资主张</dt>
                <dd>{question.thesis}</dd>
              </div>
              <div>
                <dt>仍需验证</dt>
                <dd>{question.neededEvidence}</dd>
              </div>
            </dl>

            {question.sources.length > 0 ? (
              <div className="ic-question-sources" aria-label="质询依据">
                {question.sources.map((source, sourceIndex) => (
                  <button
                    key={`${source.document}-${source.page}-${sourceIndex}`}
                    type="button"
                    className="ic-overview-source"
                    onClick={() => onViewSource(source)}
                    title={`查看《${source.document}》 · ${source.page}${source.paragraph ? ` · ${source.paragraph}` : ""}`}
                  >
                    <AppIcon icon={IconFileText} size={13} />
                    <span>{source.document}</span>
                    <span className="ic-overview-source-page">{typeof source.page === "number" || /^\d+$/.test(String(source.page)) ? `P${source.page}` : source.page}</span>
                    <AppIcon icon={IconArrowRight} size={11} />
                  </button>
                ))}
              </div>
            ) : (
              <p className="ic-question-missing-source">相关依据尚待补充。</p>
            )}

            <button
              type="button"
              className="ic-overview-button ic-overview-button--dark ic-question-ask"
              onClick={() => onAsk(context)}
            >
              <AppIcon icon={IconMessage} size={13} />
              就此追问
            </button>
          </div>
        )}
      </article>

      <div className="ic-question-actions"><button type="button" className="ic-overview-button"
        onClick={(event) => onOpenReasoning(context, event.currentTarget)}
        aria-label={`查看“${question.question}”的推演过程`}>推演过程 <AppIcon icon={IconArrowRight} size={11} /></button>
      <button
        type="button"
        className={`ic-overview-button ic-question-toggle${expanded ? " ic-question-toggle--expanded" : ""}`}
        aria-expanded={expanded}
        aria-controls={detailId}
        aria-label={`${expanded ? "收起" : "查看"}“${question.question}”的项目依据`}
        onClick={() => setExpanded((current) => !current)}
      >
        项目依据
        <AppIcon icon={IconChevronDown} size={10} />
      </button></div>
    </li>
  );
}

export function CommitteeOverview({
  project,
  onViewSource,
  onAsk,
  onOpenKnowledge,
  beforeQuestions,
  showCurrentFocus = true,
  reasoningScopeKey,
  decisionContent,
  afterQuestions,
  onPreviewStage,
  onStageChange,
  onAdvanceStage,
  onEarlyStageSave,
}: CommitteeOverviewProps) {
  const brief = getCommitteeBrief(project);
  const identity = getProjectIdentity(project);
  const isDecision = project.lifecycleStage === "decided";
  const isEarlyStage = project.lifecycleStage === "contact" || project.lifecycleStage === "intake" || project.lifecycleStage === "approved";
  const isLateStage = ["signed", "funded", "post"].includes(project.lifecycleStage ?? "");
  const isPreview = isProjectStagePreview(project);
  const decision = project.decision;
  const questions = getCoreQuestions(brief);
  const otherQuestions = brief.questions.filter((question) => question.scope !== "core");
  const [summaryExpanded, setSummaryExpanded] = useState(true);
  const [otherExpanded, setOtherExpanded] = useState(false);
  const [reasoningContext, setReasoningContext] = useState<QuestionContext | null>(null);
  const reasoningTrigger = useRef<HTMLElement | null>(null);
  const openReasoning = (context: QuestionContext, trigger: HTMLElement) => {
    reasoningTrigger.current = trigger;
    setReasoningContext(context);
  };
  const summaryId = useId();
  const otherId = useId();
  const hasIndexedMaterials = project.files.some((file) => file.status === "indexed");

  useEffect(() => {
    setSummaryExpanded(true);
    setOtherExpanded(false);
    setReasoningContext(null);
  }, [project.id]);

  useEffect(() => { setReasoningContext(null); }, [project.lifecycleStage, reasoningScopeKey]);

  return (
    <div className="ic-overview" aria-label={`${project.name}阶段工作台`}>
      <span className="sr-only" role="status">当前阶段：{isDecision ? "投决" : identity.status}</span>
      <section className="ic-overview-project" aria-labelledby="ic-overview-project-title">
        <div className="ic-overview-title-row">
          <h1 id="ic-overview-project-title">{identity.name}</h1>
          {(brief.isDemo || isDecision) && <span className="ic-overview-demo">{isPreview ? "阶段情景演示" : isDecision ? "投决情景演示" : "演示项目"}</span>}
        </div>
        <dl className="ic-overview-project-state">
          <div><dt>融资阶段</dt><dd>{identity.round}</dd></div>
          <div><dt>{isPreview ? "演示阶段" : project.currentLifecycleStage && project.currentLifecycleStage !== project.lifecycleStage ? "回看阶段" : "当前状态"}</dt><dd className="ic-stage-value"><ProjectStageTrack project={project} manager={showCurrentFocus} onStageChange={onStageChange} /></dd></div>
        </dl>
        <p className="ic-overview-description">{brief.description}</p>
        {!isEarlyStage && !isLateStage && <><div className="ic-overview-agenda">
          <span>{isDecision ? "本次投决" : "尽调重点"}</span>
          <StageTypewriter text={isDecision ? decision?.summary ?? "投决结果待确认。" : brief.agenda} stage={project.lifecycleStage ?? "diligence"} projectId={project.id} />
        </div>

        <StageMotion stage={project.lifecycleStage ?? "diligence"} projectId={project.id} className="ic-metrics-motion" distance={8}>
        <dl className="ic-overview-metrics">
          <div>
            <dt>本轮目标融资</dt>
            <dd className={(isDecision ? decision?.financing : brief.financingTarget) ? "" : "ic-overview-metric-missing"}>
              <RollingAmount value={isDecision ? decision?.financing ?? null : brief.financingTarget} />
            </dd>
          </div>
          <div>
            <dt>{isDecision ? "我方获批投资" : "我方拟投资"}</dt>
            <dd className={(isDecision ? decision?.investment : brief.proposedInvestment) ? "" : "ic-overview-metric-missing"}>
              <RollingAmount value={isDecision ? decision?.investment ?? null : brief.proposedInvestment} />
            </dd>
          </div>
          <div>
            <dt>{isDecision ? "获批投前估值" : brief.valuationLabel}</dt>
            <dd className={(isDecision ? decision?.valuation : brief.valuation) ? "" : "ic-overview-metric-missing"}>
              <RollingAmount value={isDecision ? decision?.valuation ?? null : brief.valuation} />
            </dd>
          </div>
        </dl>
        </StageMotion>
        </>}

        {!isEarlyStage && !isLateStage && <><button
          type="button"
          className="ic-overview-summary-toggle"
          aria-expanded={summaryExpanded}
          aria-controls={summaryId}
          onClick={() => setSummaryExpanded((current) => !current)}
        >
          投资逻辑与融资用途
          <AppIcon icon={IconChevronDown} size={10} />
        </button>
        {summaryExpanded && (
          <div className="ic-overview-summary" id={summaryId}>
            <dl className="ic-question-detail-grid">
              <div>
                <dt>投资逻辑</dt>
                <dd>{brief.investmentThesis}</dd>
              </div>
              <div>
                <dt>融资用途</dt>
                <dd>{brief.fundingUse ?? "融资用途待确认。"}</dd>
              </div>
            </dl>
          </div>
        )}</>}
      </section>

      <StageMotion stage={project.lifecycleStage ?? "diligence"} projectId={project.id}>
      {isLateStage ? <LateStageWorkspace project={project} role={showCurrentFocus ? "investment-director" : "committee-lead"} onViewSource={onViewSource} onAsk={onAsk} /> : isDecision ? decisionContent : isEarlyStage ? <EarlyStageWorkspace project={project} manager={showCurrentFocus} onAdvanceStage={onAdvanceStage} onSave={onEarlyStageSave} onViewSource={onViewSource} /> : <>
      {typeof beforeQuestions === "function" ? beforeQuestions(openReasoning) : beforeQuestions}
      {showCurrentFocus && <section className="ic-overview-questions" aria-labelledby="ic-overview-questions-title">
        <div className="ic-overview-section-heading">
          <h2 id="ic-overview-questions-title">当前关注</h2>
          {questions.length > 0 && <span>{questions.length} 个方向</span>}
        </div>

        {questions.length > 0 ? (
          <ol className="ic-overview-question-list">
            {questions.map((question, index) => (
              <QuestionRow
                key={`${project.id}-${question.id}`}
                question={question}
                index={index}
                projectName={project.name}
                projectId={project.id}
                onViewSource={onViewSource}
                onAsk={onAsk}
                onOpenReasoning={openReasoning}
              />
            ))}
          </ol>
        ) : (
          <div className="ic-overview-empty">
            <AppIcon icon={IconFileText} size={22} />
            <h3>{hasIndexedMaterials ? "待整理关键验证问题" : "资料尚不足以形成关键问题"}</h3>
            <p>
              {hasIndexedMaterials
                ? "需要结合最新尽调结论与本次投资主张，确认哪些未决事项可能改变判断。"
                : "补充投决议案与尽调材料后，再围绕关键投资主张梳理质询方向。"}
            </p>
            <button type="button" className="ic-overview-button" onClick={onOpenKnowledge}>
              {hasIndexedMaterials ? "查看项目资料" : "补充项目资料"}
              <AppIcon icon={IconArrowRight} size={11} />
            </button>
          </div>
        )}

        {otherQuestions.length > 0 && (
          <div className="ic-overview-other">
            <button
              type="button"
              className="ic-overview-other-toggle"
              aria-expanded={otherExpanded}
              aria-controls={otherId}
              onClick={() => setOtherExpanded((current) => !current)}
            >
              <span>已收纳的其他事项 <span>{otherQuestions.length}</span></span>
              <AppIcon icon={IconChevronDown} size={11} />
            </button>
            {otherExpanded && (
              <div id={otherId}>
                <ol className="ic-overview-question-list">
                  {otherQuestions.map((question, index) => (
                    <QuestionRow
                      key={`${project.id}-${question.id}`}
                      question={question}
                      index={index}
                      projectName={project.name}
                      projectId={project.id}
                      onViewSource={onViewSource}
                      onAsk={onAsk}
                      onOpenReasoning={openReasoning}
                      secondary
                    />
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}
      </section>}</>}
      </StageMotion>
      {!isEarlyStage && !isLateStage && <ProjectMarketPanel key={project.id} project={project} brief={brief} onViewSource={onViewSource} />}
      {project.lifecycleStage === "diligence" && afterQuestions}
      <QuestionReasoningDialog context={reasoningContext} onClose={() => setReasoningContext(null)}
        onViewSource={onViewSource} onAsk={onAsk} returnFocusTo={reasoningTrigger.current} />
    </div>
  );
}
