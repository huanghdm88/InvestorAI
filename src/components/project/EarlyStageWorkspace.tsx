import { useEffect, useState } from "react";
import { AppIcon } from "@/src/components/ui/app-icon";
import { IconArrowRight, IconCheck, IconClose, IconFileText, IconRename } from "@/src/lib/icons";
import { getEarlyStageBrief, isHistoricalEarlyStage } from "@/src/data/early-stage-demo";
import type { EarlyStageKey, Project, ProjectLifecycleStage, SourceAnchor } from "@/src/types";
import "./early-stage.css";

export function EarlyStageWorkspace({ project, manager, onAdvanceStage, onSave, onViewSource }: {
  project: Project;
  manager: boolean;
  onAdvanceStage?: (stage: ProjectLifecycleStage) => void;
  onSave?: (stage: EarlyStageKey, values: Record<string, string>) => void;
  onViewSource?: (source: SourceAnchor) => void;
}) {
  const brief = getEarlyStageBrief(project);
  const historical = isHistoricalEarlyStage(project);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");
  useEffect(() => { setEditing(false); setNotice(""); }, [project.id, project.lifecycleStage]);
  if (!brief) return null;
  if (!manager) return null;
  const values = Object.fromEntries(brief.sections.map(({ label, value }) => [label, value]));
  const canSave = brief.sections.every(({ label }) => draft[label]?.trim());
  const save = () => {
    if (!canSave) return;
    onSave?.(brief.stage, Object.fromEntries(Object.entries(draft).map(([key, value]) => [key, value.trim()])));
    setEditing(false);
    setNotice("阶段记录已保存");
  };
  return <section className="ic-early-stage" aria-labelledby="ic-early-stage-title">
    <div className="ic-early-stage-header">
      <div><h2 id="ic-early-stage-title">{brief.title}</h2><p>{brief.summary}</p></div>
      <span className="ic-early-stage-demo">{historical ? `${brief.completedAt ?? "已完成"} · 阶段回看` : "演示阶段记录"}</span>
    </div>
    <dl className="ic-early-stage-grid">
      {brief.sections.map((section) => <div className="ic-early-stage-item" key={section.label}>
        <dt>{section.label}</dt><dd>{editing ? <input aria-label={section.label} value={draft[section.label] ?? ""} maxLength={180}
          onChange={(event) => setDraft((previous) => ({ ...previous, [section.label]: event.target.value }))}
          onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); setEditing(false); } }} /> : section.value}</dd>
        {section.note && <small>{section.note}</small>}
      </div>)}
    </dl>
    <div className="ic-early-stage-footer">
      <p className="ic-early-stage-note" role="status">{notice || brief.evidenceNote}</p>
      {onViewSource && <button type="button" className="ic-overview-source" onClick={() => onViewSource({ document: `${project.name} · ${brief.title}（演示记录）`, page: "阶段快照", paragraph: brief.completedAt ?? "当前记录", excerpt: `版本：${historical ? "归档 V1" : "工作记录 V1"}\n日期：${brief.completedAt ?? project.updatedAt}\n处理状态：${historical ? "演示归档" : "待项目经理核实"}\n${brief.sections.map((section) => `${section.label}：${section.value}`).join("\n")}` })}><AppIcon icon={IconFileText} size={13} />阶段依据</button>}
      {!historical && <div className="ic-early-stage-actions">
        {editing ? <><button type="button" className="ic-overview-button" onClick={() => setEditing(false)}><AppIcon icon={IconClose} size={12} />取消</button>
          <button type="button" className="ic-early-stage-action" disabled={!canSave} onClick={save}><AppIcon icon={IconCheck} size={12} />保存记录</button></> : <>
          {onSave && <button type="button" className="ic-overview-button" onClick={() => { setDraft(values); setEditing(true); setNotice(""); }}><AppIcon icon={IconRename} size={12} />编辑记录</button>}
          {onAdvanceStage && <button type="button" className="ic-early-stage-action" onClick={() => onAdvanceStage(brief.nextStage)}>{brief.nextAction}<AppIcon icon={IconArrowRight} size={12} /></button>}
        </>}
      </div>}
    </div>
  </section>;
}
