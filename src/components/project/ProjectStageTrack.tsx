import { useEffect, useId, useState } from "react";
import { AppIcon } from "@/src/components/ui/app-icon";
import { IconChevronRight } from "@/src/lib/icons";
import { getProjectIdentity } from "@/src/lib/project-identity";
import type { Project, ProjectLifecycleStage } from "@/src/types";

const stages: Array<[ProjectLifecycleStage, string]> = [
  ["contact", "接触"], ["intake", "入库"], ["approved", "立项"], ["diligence", "尽调"],
  ["decided", "投决"], ["signed", "签约"], ["funded", "出资"], ["post", "投后"],
];

const openTracks = new Map<string, boolean>();

function isInsideControl(event: { clientX: number; clientY: number; currentTarget: EventTarget }) {
  const target = event.currentTarget;
  if (!(target instanceof Element)) return false;
  const rect = target.getBoundingClientRect();
  return event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
}

export function ProjectStageTrack({ project, manager = false, onStageChange }: { project: Project; manager?: boolean; onStageChange?: (stage: ProjectLifecycleStage) => void }) {
  const [open, setOpen] = useState(() => openTracks.get(project.id) ?? false);
  const id = useId();

  useEffect(() => {
    setOpen(openTracks.get(project.id) ?? false);
  }, [project.id]);

  const toggleOpen = () => {
    const next = !(openTracks.get(project.id) ?? open);
    openTracks.set(project.id, next);
    setOpen(next);
  };

  return <div className={`ic-stage-track${open ? " is-open" : ""}`}>
    <button type="button" className="ic-stage-current" aria-expanded={open} aria-controls={id}
      aria-label={`${getProjectIdentity(project).status}，${open ? "收起" : "查看全部"}项目阶段`}
      onMouseDown={(event) => { event.preventDefault(); }}
      onClick={(event) => {
        const fromKeyboard = event.detail === 0;
        if (!fromKeyboard && !isInsideControl(event)) return;
        toggleOpen();
        if (!fromKeyboard) event.currentTarget.blur();
      }}>
      {getProjectIdentity(project).status}<AppIcon icon={IconChevronRight} size={10} />
    </button>
    <div id={id} className="ic-stage-reveal" aria-hidden={!open} inert={!open}>
      <ol className="ic-stage-steps" aria-label={onStageChange ? "演示阶段切换，可选择已完成阶段" : "项目阶段，仅供查看，可横向滚动"} tabIndex={open ? 0 : -1}>
        {stages.map(([stage, label]) => {
          const current = project.currentLifecycleStage ?? project.lifecycleStage;
          const viewing = project.lifecycleStage === stage;
          const canReview = Boolean(onStageChange && (manager || stages.findIndex(([key]) => key === stage) >= 3) && (project.completedLifecycleStages?.includes(stage) || current === stage));
          const state = viewing ? "current" : canReview ? "available" : "locked";
          return <li key={stage} data-stage-state={state} aria-current={viewing ? "step" : undefined}>{canReview ? <button type="button" aria-pressed={viewing} aria-label={`${current === stage ? "查看" : "回看"}${label}阶段`} onClick={() => onStageChange?.(stage)}>{label}</button> : <span title="该阶段尚未到达，暂不可查看">{label}</span>}</li>;
        })}
      </ol>
    </div>
  </div>;
}
