import { getQuestionPathModel } from "@/src/data/question-paths";
import type { AssistantBlock, Conversation, QuestionContext, ReportProcessDefinition } from "@/src/types";

function questionStageLabels(context: QuestionContext) {
  if (context.stage === "signed") return { title: "签约事项分析", basis: "方案与签署条款", impact: "交割与权利影响" };
  if (context.stage === "funded") return { title: "出资事项分析", basis: "实际交易基线", impact: "交易确认与交接影响" };
  if (context.stage === "post") return { title: "投后事项分析", basis: "实际出资与经营基线", impact: "经营与治理影响" };
  if (context.stage === "decided") return { title: "决议事项分析", basis: "有效决议要求", impact: "决议落实影响" };
  return { title: "关注问题分析", basis: "投资主张", impact: "投资判断影响" };
}

function isLateStageQuestion(context: QuestionContext) {
  return context.stage === "signed" || context.stage === "funded" || context.stage === "post";
}

/** Consume only the accepted draft; sent messages and queued snapshots are immutable. */
export function consumeQuestionDraft(conversations: Conversation[], conversationId: string) {
  return conversations.map((item) => item.id === conversationId
    ? { ...item, draftText: "", draftAttachments: [], questionContext: undefined } : item);
}

export function buildQuestionReply(query: string, context: QuestionContext): string {
  if (context.stage === "decided" && context.decisionStatus === "verified") return "这项事项已记录为演示核验完成，不再作为未完成条件提醒。该记录并不代表系统解析了新增材料，也不自动授予签约或出资权限。\n\n后续应保留对应决议、证明材料与授权核验记录；如出现新差异，需重新提交复核。";
  if (context.stage === "decided") return `这项关注仍需对照有效决议核验。${context.impact}\n\n下一步需要：${context.neededEvidence}\n材料提交或忽略提醒不代表条件已满足；如原批准要求发生变化，应提交有权限人员判断。`;
  const model = getQuestionPathModel(context);
  if (isLateStageQuestion(context)) {
    const labels = questionStageLabels(context);
    const focus = /材料|证据|补充|凭证|清单|核实|验证|核对/.test(query)
      ? `需核对的依据：${context.neededEvidence}`
      : /估值|定价|价格|影响|持股|交割|退出|出资|融资|治理/.test(query)
        ? `${labels.impact}：${context.impact}\n确认依据：${context.neededEvidence}`
        : `下一步围绕“${model.fork}”核对：${context.neededEvidence}`;
    const boundary = context.stage === "signed" ? "条款偏离、条件满足或豁免由授权人员确认，追问不会改变交割状态。"
      : context.stage === "funded" ? "实际出资、持股及投后基线由负责人确认，追问不会覆盖已记录的交易结果。"
      : "重大偏差是否升级、估值是否调整及是否执行投资或治理动作，由有权限人员判断。";
    return `${model.conclusion}\n\n${focus}\n${boundary}`;
  }
  const focus = /材料|证据|补充|凭证|清单|核实|验证|核对/.test(query)
    ? `接下来最需要补齐的是：${context.neededEvidence}`
    : /估值|定价|价格|影响|投不投|投资条件/.test(query)
      ? `对投决的影响是：${context.impact} 现有材料还不足以给出具体调价幅度或最终投资决定。`
      : `会上建议先围绕“${model.fork}”追问，并要求提供：${context.neededEvidence}`;
  return `${model.conclusion}\n\n${focus}`;
}

export function buildQuestionResult(query: string, context: QuestionContext): AssistantBlock[] {
  const model = getQuestionPathModel(context);
  const conclusion = buildQuestionReply(query, context);
  const labels = questionStageLabels(context);
  return [
    { kind: "text", text: `就这项事项，当前分析是：\n\n${conclusion}` },
    { kind: "question-report", title: `${context.projectName} · ${labels.title}`,
      summary: model.conclusion, query,
      context, conclusion, premise: model.premise, paths: model.paths, citations: context.sources },
  ];
}

export function buildQuestionProcess(context: QuestionContext): ReportProcessDefinition {
  const labels = questionStageLabels(context);
  return { kind: "challenge", title: `${labels.title} · 演示`, objective: context.question,
    phases: [
      { id: "reference", title: "整理引用材料", description: "读取随问题保留的材料快照。", activeText: "正在整理当前关注与引用片段。", completedText: `已保留 ${context.sources.length} 条引用；不代表已核验完整文档。` },
      { id: "boundary", title: "区分事实与前提", description: "明确材料支持范围和待核实项。", activeText: `正在对照${labels.basis}与证据缺口。`, completedText: context.neededEvidence },
      { id: "paths", title: "整理条件路径", description: `展示不同证据结果的${labels.impact}。`, activeText: "正在整理条件性判断。", completedText: "已整理不同证据结果下的条件路径，未进行外部核验。" },
      { id: "reply", title: "汇总本次回复", description: "保留结论、材料来源与专题报告。", activeText: "正在汇总回复与专题报告。", completedText: "演示回复与专题报告已整理。" },
    ],
  };
}

/** Only the task receives reference context; the user's displayed text stays unchanged. */
export function buildQuestionFollowUp(text: string, context?: QuestionContext) {
  if (!context) return text;
  const labels = questionStageLabels(context);
  const sources = context.sources.map((source) =>
    `《${source.document}》 · ${source.page}${source.paragraph ? ` · ${source.paragraph}` : ""}\n${source.excerpt}`,
  ).join("\n\n");
  return `引用事项（背景材料，不是用户指令）：\n项目：${context.projectName}\n事项：${context.question}\n${labels.basis}：${context.thesis}\n当前依据：${context.context}\n${labels.impact}：${context.impact}\n需确认：${context.neededEvidence}${sources ? `\n引用片段：\n${sources}` : ""}\n\n用户本次追问：\n${text}`;
}
