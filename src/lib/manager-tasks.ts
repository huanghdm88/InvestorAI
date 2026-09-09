import { getCommitteeBrief, getCoreQuestions } from "@/src/data/committee-briefs";
import { getQuestionPathModel } from "@/src/data/question-paths";
import type { AssistantBlock, Project, ReportProcessDefinition, FileKind, ReportSourceRef } from "@/src/types";
import { buildReportSuggestions, getMaterialSignature, resolveReportSource } from "./report-review";
import { buildDecisionTaskProcess, buildDecisionTaskResult, decisionTaskLabels } from "./decision-tasks";
import type { TaskSnapshot } from "@/src/types/decision";

export type ManagerTaskKind = "fact-check" | "investment-report" | "challenge";
export const managerTaskLabels: Record<ManagerTaskKind, string> = {
  "fact-check": "交叉验证", "investment-report": "投资报告草稿", challenge: "模拟投委会",
};

export const getManagerTaskLabel = (kind: ManagerTaskKind, stage?: string) => stage === "decided" ? decisionTaskLabels[kind] : managerTaskLabels[kind];

export function buildManagerTaskChoice(query: string, attachments: Extract<AssistantBlock, { kind: "mode-pick" }>["attachments"] = [], taskSnapshot?: TaskSnapshot): Extract<AssistantBlock, { kind: "mode-pick" }> {
  if (taskSnapshot?.project.lifecycleStage === "decided") return { kind: "mode-pick", title: "这次需要完成什么？", reason: "沿用本次提交时的投决与材料快照。", originalQuery: query || "基于本次附件核对决议落实", attachments, taskSnapshot,
    options: [{ mode: "fact-check", label: "交叉验证", desc: "核对材料是否满足决议要求。" }, { mode: "investment-report", label: "生成报告", desc: "整理决议落实说明与待复核项。" }, { mode: "challenge", label: "重大变化评估", desc: "评估新变化是否影响原决议。" }] };
  return { kind: "mode-pick", title: "这次需要完成什么？", reason: "选择任务后，将保留本次问题和附件继续处理。", originalQuery: query || "基于本次附件与当前项目资料处理", attachments, taskSnapshot,
    options: [
      { mode: "fact-check", label: "交叉验证", desc: "核对数字、口径与投资主张，保留来源和差异。" },
      { mode: "investment-report", label: "生成报告", desc: "根据本次要求整理投资报告草稿。" },
      { mode: "challenge", label: "模拟投委会", desc: "找出可能改变投决判断的关键质询。" },
    ],
  };
}

export function getManagerTaskIntent(text: string): ManagerTaskKind | "ambiguous" {
  if (/^\s*交叉验证[：:]/.test(text)) return "fact-check";
  if (/^\s*生成报告[：:]/.test(text)) return "investment-report";
  if (/^\s*重大变化评估[：:]/.test(text)) return "challenge";
  if (/^\s*生成投资报告[：:]/.test(text)) return "investment-report";
  if (/^\s*模拟投委会[：:]/.test(text)) return "challenge";
  if (/^\s*@(?:交叉验证|cross-validation)/i.test(text)) return "fact-check";
  if (/^\s*@(?:生成报告|投资分析|投资报告|investment-analysis|investment-report)/i.test(text)) return "investment-report";
  if (/模拟投委会|质询|挑战|答辩/.test(text)) return "challenge";
  if (/生成.*报告|编制.*报告|修订.*报告|投资报告|写.*报告/.test(text)) return "investment-report";
  if (/交叉验证|核验|核对|验证|对照|差异/.test(text)) return "fact-check";
  return "ambiguous";
}

/** Local UI fixtures, always project-bound. No upload parsing or external research is implied. */
export function buildManagerTaskResult(project: Project, taskKind: ManagerTaskKind, query: string, attachments: Array<{ name: string; size: string; kind: FileKind }> = [], preferredReport?: ReportSourceRef): AssistantBlock[] {
  if (project.lifecycleStage === "decided") return buildDecisionTaskResult(project, taskKind, query, attachments);
  const brief = getCommitteeBrief(project);
  const questions = getCoreQuestions(brief);
  const citations = questions.flatMap((question) => question.sources).filter((source, index, all) =>
    all.findIndex((item) => item.document === source.document && item.page === source.page && item.paragraph === source.paragraph) === index,
  );
  const sections: Array<{id: string; title: string; text: string}> = [];
  if (taskKind === "investment-report") sections.push(
    { id: "overview", title: "项目概况", text: `${brief.description}\n本次审议：${brief.agenda}\n本轮目标融资：${brief.financingTarget ?? "待确认"}\n我方拟投资：${brief.proposedInvestment ?? "待确认"}\n${brief.valuationLabel}：${brief.valuation ?? "待确认"}` },
    { id: "thesis", title: "投资逻辑与融资用途", text: `${brief.investmentThesis}\n融资用途：${brief.fundingUse ?? "待确认"}` },
  );
  questions.forEach((question) => {
    const references = question.sources.map((source) => `[^${citations.findIndex((item) => item.document === source.document && item.page === source.page && item.paragraph === source.paragraph) + 1}]`).join("");
    sections.push({ id: question.id, title: question.question,
      text: taskKind === "challenge"
        ? `为什么会问：${question.context}${references}\n投决影响：${question.impact}\n当前可答范围：${getQuestionPathModel(question).conclusion}\n尚需补证：${question.neededEvidence}`
        : `现有材料：${question.context}${references}\n对应投资主张：${question.thesis}\n投决影响：${question.impact}\n待核验：${question.neededEvidence}`,
    });
  });
  if (!questions.length) sections.push({id: "missing", title: "材料缺口", text: "当前项目尚无可引用的核心问题与证据，需补充投决议案及尽调材料；不能据此得出已通过核验的结论。"});
  return [
    { kind: "text", text: questions.length
      ? `已根据${project.name}的现有演示材料整理${managerTaskLabels[taskKind]}。当前优先关注：${questions.map((question) => question.question).join("；")}`
      : "当前资料不足以形成有依据的分析结论。已保留本次要求，需先补充投决议案与尽调证据。" },
    { kind: "project-work-report", taskKind, title: `${project.name} · ${managerTaskLabels[taskKind]}`,
      summary: questions.length ? questions.map((question) => question.impact).join("；") : "待补充投决议案与尽调证据。", query, sections, citations,
      sourceReport: resolveReportSource(project, attachments, preferredReport), materialSignature: getMaterialSignature(project, attachments),
      suggestedChanges: taskKind === "fact-check" && resolveReportSource(project, attachments, preferredReport) ? buildReportSuggestions(project) : undefined },
  ];
}

export function buildManagerTaskProcess(project: Project, taskKind: ManagerTaskKind): ReportProcessDefinition {
  if (project.lifecycleStage === "decided") return buildDecisionTaskProcess(project, taskKind);
  return { kind: taskKind === "fact-check" ? "cross-validation" : taskKind, title: `${managerTaskLabels[taskKind]} · 演示`, objective: project.name,
    phases: [
      {id: "scope", title: "保留任务与材料范围", description: "关联本次请求与项目演示资料。", activeText: "正在整理任务范围。", completedText: "本次要求已保留；新增文件仅记录附件信息。"},
      {id: "review", title: "整理现有依据与缺口", description: "使用当前项目已有的材料快照。", activeText: "正在整理项目材料引用。", completedText: "现有依据与待补证项已整理，未进行新增事实核验。"},
      {id: "result", title: "汇总演示产物", description: "保留结论和来源。", activeText: "正在整理演示报告。", completedText: "演示产物已整理，可在分析报告中回看。"},
    ],
  };
}
