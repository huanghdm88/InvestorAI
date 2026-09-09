import type { AssistantBlock, FileKind, Project, ReportProcessDefinition } from "@/src/types";
import { decisionResultLabels, decisionStatusLabels } from "./decision-workspace";
import { getMaterialSignature } from "./report-review";

type TaskKind = "fact-check" | "investment-report" | "challenge";
export const decisionTaskLabels: Record<TaskKind, string> = { "fact-check": "交叉验证", "investment-report": "决议落实说明", challenge: "重大变化评估" };
export function buildDecisionTaskResult(project: Project, kind: TaskKind, query: string, attachments: Array<{ name: string; size: string; kind: FileKind }> = []): AssistantBlock[] {
  const data = project.decision;
  const items = data?.items ?? [];
  const citations = items.flatMap((item) => item.sources).filter((source, index, all) => all.findIndex((other) => other.document === source.document && other.page === source.page && other.paragraph === source.paragraph) === index);
  const relevant = kind === "challenge" ? items.filter((item) => item.kind === "change" || item.critical) : items;
  const unresolved = items.filter((item) => item.status !== "verified");
  const conclusion = !data || data.result === "pending" ? "正式投决结果尚未确认，当前不能判断条件是否落实，也不能据此推进签约或出资。" : unresolved.length ? `当前仍有 ${unresolved.length} 项待处理或待复核，重点是：${unresolved.filter((item) => item.critical).map((item) => item.title).join("；") || unresolved[0].title}。投决通过不代表这些条件已经满足。` : "当前演示清单暂无未完成项；正式签约和出资仍需按机构权限另行确认。";
  const sections = [
    { id: "decision-baseline", title: "本次核对基准", text: `项目阶段：投决\n决议版本：${data?.version ?? "待确认"}（情景演示）\n投决结果：${data ? decisionResultLabels[data.result] : "待确认"}\n获批估值：${data?.valuation ?? "待确认"}\n获批议案引用：${data?.approvedReport?.name ?? "待补充"}\n正式决议尚未关联；以下不是审批结论。` },
    { id: "decision-conclusion", title: "当前结论", text: conclusion },
    ...relevant.map((item) => ({ id: item.id, title: item.title, text: `原批准要求（演示）：${item.before}\n当前情况：${item.current}\n处理状态：${decisionStatusLabels[item.status]}${item.muted ? "；暂不提醒，但条件仍有效" : ""}\n影响：${item.impact}\n所需证明：${item.requirement}\n已收取文件信息：${item.evidence.map((file) => file.name).join("、") || "暂无"}\n处理说明：${item.note ?? "待补充"}\n原尽调依据：${item.sources.map((source) => `${source.document} · ${source.page}`).join("；") || "暂无可引用来源"}` })),
    { id: "decision-boundary", title: "本次材料与核验边界", text: `本次附件：${attachments.map((file) => file.name).join("、") || "无新增附件"}。\n仅记录文件信息，未解析新增内容、未完成新增事实核验。生成说明不会改变任何条件状态或覆盖获批报告；核验、豁免及审批须由有权限人员处理。` },
  ];
  return [{ kind: "text", text: `当前结论：${conclusion}\n\n已整理${decisionTaskLabels[kind]}。` },
    { kind: "project-work-report", taskKind: kind, projectStage: "decided", decisionBaselineId: data?.id, title: `${project.name} · ${decisionTaskLabels[kind]}`, summary: conclusion, query, sections, citations, sourceReport: data?.approvedReport, materialSignature: getMaterialSignature(project, attachments) }];
}

export function buildDecisionTaskProcess(project: Project, kind: TaskKind): ReportProcessDefinition {
  return { kind: kind === "fact-check" ? "cross-validation" : kind, title: `${decisionTaskLabels[kind]} · 演示`, objective: project.name,
    phases: [
      { id: "baseline", title: "锁定决议与材料范围", description: "使用发送时的阶段与版本。", activeText: "正在关联决议情景与获批报告引用。", completedText: "已保留决议与请求快照，原报告未修改。" },
      { id: "conditions", title: "整理条件与差异", description: "区分材料已提交与条件已核验。", activeText: "正在整理未完成条件及重大变化。", completedText: "已整理现有情景信息，新增附件未解析。" },
      { id: "summary", title: "汇总说明与待复核项", description: "生成独立演示产物。", activeText: "正在汇总结论与后续动作。", completedText: "说明已整理，不改变审批或条件状态。" },
    ] };
}
