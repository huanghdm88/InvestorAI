import { useState } from "react";
import { AppIcon } from "@/src/components/ui/app-icon";
import { getLateStageBrief, type LateStageFact, type LateStageItem } from "@/src/data/late-stage-demo";
import { IconArrowRight, IconChevronDown, IconFileText, IconMessage } from "@/src/lib/icons";
import type { AuthRole, Project, QuestionContext, SourceAnchor } from "@/src/types";
import "./late-stage-workspace.css";

export interface LateStageWorkspaceProps {
  project: Project;
  role: AuthRole;
  onViewSource: (anchor: SourceAnchor) => void;
  onAsk: (context: QuestionContext) => void;
}

const statusLabels = { complete: "已核对", pending: "待补充", review: "待确认" };
const factLabels = { confirmed: "已确认", pending: "待确认", scenario: "情景值", inherited: "继承自出资基线" };

function FactSource({ fact, onViewSource }: { fact: LateStageFact; onViewSource: (source: SourceAnchor) => void }) {
  return <div className="late-stage-fact-provenance">
    <span>{factLabels[fact.status]} · {fact.date} · {fact.version}</span>
    {fact.source && <button type="button" className="late-stage-source" title={fact.source.document} aria-label={`查看${fact.label}的依据`} onClick={() => onViewSource(fact.source!)}><AppIcon icon={IconFileText} size={12} /><span>依据</span></button>}
  </div>;
}

function ItemRow({ item, project, manager, onViewSource, onAsk }: { item: LateStageItem; manager: boolean } & Omit<LateStageWorkspaceProps, "role">) {
  const [expanded, setExpanded] = useState(false);
  const context: QuestionContext = { projectId: project.id, projectName: project.name, questionId: item.id, stage: project.lifecycleStage, question: item.title, thesis: item.baseline, context: item.current, impact: item.impact, neededEvidence: item.evidenceNeeded, sources: item.sources };
  return <article className="late-stage-item">
    <div className="late-stage-item-heading"><div><h3>{item.title}</h3><p>{item.current}</p></div><span className="late-stage-item-status" data-status={item.status}>{statusLabels[item.status]}</span></div>
    <p className="late-stage-item-impact">{item.impact}</p>
    <div className="late-stage-item-footer">
      {manager && <span className="late-stage-owner">{item.owner} · {item.deadline}</span>}
      <div className="late-stage-item-actions"><button type="button" className="late-stage-text-action" onClick={() => onAsk(context)}><AppIcon icon={IconMessage} size={13} />就此追问</button><button type="button" className="late-stage-text-action" aria-expanded={expanded} aria-controls={`late-stage-evidence-${item.id}`} onClick={() => setExpanded((value) => !value)}>项目依据<AppIcon icon={IconChevronDown} size={11} className={expanded ? "late-stage-chevron-open" : ""} /></button></div>
    </div>
    <div id={`late-stage-evidence-${item.id}`} className="late-stage-evidence" data-expanded={expanded} aria-hidden={!expanded} inert={!expanded}>
      <div className="late-stage-evidence-inner"><div className="late-stage-evidence-content">
        <dl><div><dt>比较基准</dt><dd>{item.baseline}</dd></div><div><dt>待核验依据</dt><dd>{item.evidenceNeeded}</dd></div></dl>
        <div className="late-stage-source-list">{item.sources.map((source) => <button type="button" key={`${source.document}:${source.paragraph}`} className="late-stage-source" onClick={() => onViewSource(source)}><AppIcon icon={IconFileText} size={13} /><span>{source.document}</span><AppIcon icon={IconArrowRight} size={11} /></button>)}</div>
      </div></div>
    </div>
  </article>;
}

export function LateStageWorkspace({ project, role, onViewSource, onAsk }: LateStageWorkspaceProps) {
  const brief = getLateStageBrief(project);
  const manager = role === "investment-director";
  if (!brief) return null;
  const sections = brief.sections.map((section) => ({ ...section, items: manager ? section.items : section.items.filter((item) => item.material) })).filter((section) => section.items.length > 0);
  return <section className="late-stage-workspace" aria-label={brief.title} data-stage={brief.stage}>
    <header className="late-stage-heading"><div><h2>{brief.title}</h2><p>{brief.summary}</p></div><span className="late-stage-date">{brief.date} · {brief.version}</span></header>
    <dl className="late-stage-metrics">{brief.metrics.map((metric) => <div key={metric.id}><dt>{metric.label}</dt><dd>{metric.value}</dd>{metric.note && <p>{metric.note}</p>}<FactSource fact={metric} onViewSource={onViewSource} /></div>)}</dl>
    {brief.changes.length > 0 && <details className="late-stage-changes"><summary>最近变化<span>{brief.changes.length} 项</span><AppIcon icon={IconChevronDown} size={11} /></summary><ol>{brief.changes.map((change) => <li key={change.id}><time dateTime={change.date}>{change.date}</time><div><strong>{change.title}</strong><p>{change.impact}</p></div></li>)}</ol></details>}
    {brief.facts.length > 0 && <section className="late-stage-baseline" aria-label={brief.stage === "post" ? "实际持仓基线" : "阶段依据"}><h3>{brief.stage === "post" ? "实际持仓基线" : "阶段依据"}</h3><dl>{brief.facts.map((entry) => <div key={entry.id}><dt>{entry.label}</dt><dd>{entry.value}</dd>{entry.note && <p>{entry.note}</p>}<FactSource fact={entry} onViewSource={onViewSource} /></div>)}</dl></section>}
    {sections.map((section) => <section className="late-stage-section" key={section.id} aria-labelledby={`late-stage-${section.id}`}><div className="late-stage-section-heading"><h3 id={`late-stage-${section.id}`}>{manager ? section.title : section.committeeTitle ?? section.title}</h3><span>{section.items.length} 项</span></div>{section.items.map((item) => <ItemRow key={`${project.id}:${item.id}`} item={item} project={project} manager={manager} onViewSource={onViewSource} onAsk={onAsk} />)}</section>)}
    {!sections.length && <p className="late-stage-empty">{brief.stage === "signed" ? "签署文件、方案对照与交割条件待补充。" : brief.stage === "funded" ? "付款证明、股东名册与投后基线待补充。" : "实际出资基线、最新经营与治理资料待补充。"}</p>}
  </section>;
}
