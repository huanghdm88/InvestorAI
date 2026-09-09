import type { Project, ProjectLifecycleStage } from "@/src/types";

const lifecycleLabels: Record<ProjectLifecycleStage, string> = {
  contact: "接触中", intake: "已入库", approved: "已立项", diligence: "尽调中",
  decided: "投决中", signed: "已签协议", funded: "已出资", post: "投后跟踪",
};

export function getProjectIdentity(project: Project) {
  const suffix = project.name.match(/(?:Pre-[A-Z]|[A-Z]\+?|天使|种子)\s*轮\s*$/i)?.[0].trim();
  const round = project.financingRound?.trim() || suffix || "待确认";
  const name = suffix ? project.name.slice(0, project.name.lastIndexOf(suffix)).replace(/[\s·/-]+$/, "") : project.name;
  return {
    name: name || project.name,
    round,
    status: project.lifecycleStage === "decided" && project.decision?.result === "conditional" ? "有条件通过" : project.lifecycleStage === "decided" && project.decision?.result === "approved" ? "投决通过" : project.lifecycleStage ? lifecycleLabels[project.lifecycleStage] : "待确认",
  };
}
