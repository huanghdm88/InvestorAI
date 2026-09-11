import type { AuthRole, ProjectLifecycleStage } from "@/src/types";

export type StageTaskKind = "fact-check" | "investment-report" | "challenge";
export interface StageTool { label: string; kind: StageTaskKind; description: string }

const stageTools: Record<ProjectLifecycleStage, StageTool[]> = {
  contact: [
    { label: "行业调研", kind: "fact-check", description: "整理行业与客户场景，列出尚待验证的信息。" },
    { label: "访谈要点", kind: "investment-report", description: "根据接触记录整理首访问题和待补资料。" },
  ],
  intake: [
    { label: "项目概览", kind: "investment-report", description: "汇总主体、负责人、基金匹配和档案缺口。" },
    { label: "行业调研", kind: "fact-check", description: "梳理赛道定位与需要补充的行业依据。" },
  ],
  approved: [
    { label: "尽调计划", kind: "investment-report", description: "整理工作范围、负责人、交付物和期限。" },
    { label: "访谈提纲", kind: "fact-check", description: "把待验证假设转为访谈与材料核查问题。" },
  ],
  diligence: [
    { label: "初版投决报告", kind: "investment-report", description: "根据已掌握事实与未决问题整理报告草稿。" },
    { label: "补充材料", kind: "fact-check", description: "核对证据缺口，形成补充材料清单。" },
  ],
  decided: [
    { label: "决议落实清单", kind: "fact-check", description: "逐项核对正式要求、责任人与落实证据。" },
    { label: "交易执行包", kind: "investment-report", description: "整理签约准备、前置条件和待复核变化。" },
  ],
  signed: [
    { label: "交割检查表", kind: "fact-check", description: "对照已签协议核对交割条件和证明文件。" },
    { label: "法务财务补充包", kind: "investment-report", description: "汇总条款差异、财法待办和交割缺口。" },
  ],
  funded: [
    { label: "投后跟踪基线", kind: "investment-report", description: "从实际付款、登记与生效权利建立投后基线。" },
  ],
  post: [
    { label: "投后跟踪报告", kind: "investment-report", description: "对照实际投后基线整理经营与治理进展。" },
    { label: "偏差报告", kind: "fact-check", description: "汇总最新事实相对基线的偏差及待处理事项。" },
  ],
};

export const stageToolCommands = [...new Set(Object.values(stageTools).flat().map((tool) => `@${tool.label}`))];

export function getStageTools(stage: ProjectLifecycleStage, role: AuthRole = "investment-director"): StageTool[] {
  if (role === "committee-lead" && ["contact", "intake", "approved"].includes(stage)) return [];
  if (role === "committee-lead" && (stage === "decided" || stage === "signed")) return stageTools[stage].filter((tool) => tool.kind === "fact-check");
  return stageTools[stage];
}

export function getStageToolIntent(text: string): StageTaskKind | undefined {
  const query = text.trim().replace(/^@/, "");
  return Object.values(stageTools).flat().find((tool) => query === tool.label || query.startsWith(`${tool.label} `) || query.startsWith(`${tool.label}：`) || query.startsWith(`${tool.label}:`))?.kind;
}

export function getStageTaskLabel(stage: ProjectLifecycleStage, kind: StageTaskKind, query = "") {
  const selected = stageTools[stage].find((tool) => query.trim().replace(/^@/, "").startsWith(tool.label));
  return selected?.label ?? stageTools[stage].find((tool) => tool.kind === kind)?.label ?? (kind === "challenge" ? "关键问题复核" : stageTools[stage][0].label);
}

export const stageComposerPlaceholders: Record<ProjectLifecycleStage, string> = {
  contact: "记录接触信息，或补充首访问题…",
  intake: "补充项目档案，或核对入库材料…",
  approved: "调整尽调范围，或补充访谈与材料清单…",
  diligence: "核对项目事实，或补充待验证的问题…",
  decided: "核对决议要求，或上传需要复核的材料…",
  signed: "核对协议条款与交割条件…",
  funded: "核对实际出资、股权登记与投后基线…",
  post: "更新经营事实，或分析相对基线的偏差…",
};
