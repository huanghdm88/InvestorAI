import { useId, useState } from "react";
import { AppIcon } from "@/src/components/ui/app-icon";
import { IconChevronRight } from "@/src/lib/icons";
import { getProjectIdentity } from "@/src/lib/project-identity";
import type { Project, ProjectLifecycleStage } from "@/src/types";

const stages: Array<[ProjectLifecycleStage, string]> = [
  ["contact", "接触"], ["intake", "入库"], ["approved", "立项"], ["diligence", "尽调"],
  ["decided", "投决"], ["signed", "签约"], ["funded", "出资"], ["post", "投后"],
];

export function ProjectStageTrack({ project, manager = false, onStageChange }: { project: Project; manager?: boolean; onStageChange?: (stage: ProjectLifecycleStage) => void }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return <div className={`ic-stage-track${open ? " is-open" : ""}`}>
    <button type="button" className="ic-stage-current" aria-expanded={open} aria-controls={id}
      aria-label={`${getProjectIdentity(project).status}，${open ? "收起" : "查看全部"}项目阶段`} onClick={() => setOpen((value) => !value)}>
      {getProjectIdentity(project).status}<AppIcon icon={IconChevronRight} size={10} />
    </button>
    <div id={id} className="ic-stage-reveal" aria-hidden={!open} inert={!open}>
      <ol className="ic-stage-steps" aria-label={onStageChange ? "演示阶段切换，可选择已完成阶段" : "项目阶段，仅供查看，可横向滚动"} tabIndex={open ? 0 : -1}>
        {stages.map(([stage, label]) => {
          const current = project.currentLifecycleStage ?? project.lifecycleStage;
          const canReview = Boolean(onStageChange && (manager || stage === "diligence" || stage === "decided") && (project.completedLifecycleStages?.includes(stage) || current === stage));
          return <li key={stage} aria-current={project.lifecycleStage === stage ? "step" : undefined}>{canReview ? <button type="button" aria-pressed={project.lifecycleStage === stage} aria-label={`${current === stage ? "查看" : "回看"}${label}阶段`} onClick={() => onStageChange?.(stage)}>{label}{project.completedLifecycleStages?.includes(stage) && <span className="ic-stage-done" aria-label="已完成" />}</button> : <span>{label}</span>}</li>;
        })}
      </ol>
    </div>
  </div>;
}
