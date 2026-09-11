import { getCommitteeBrief, getCoreQuestions } from "@/src/data/committee-briefs";
import { getQuestionPathModel } from "@/src/data/question-paths";
import { getEarlyStageBrief } from "@/src/data/early-stage-demo";
import { getLateStageBrief } from "@/src/data/late-stage-demo";
import type { AssistantBlock, Project, ProjectLifecycleStage, ReportProcessDefinition, FileKind, ReportSourceRef } from "@/src/types";
import { buildReportSuggestions, getMaterialSignature, resolveReportSource } from "./report-review";
import { buildDecisionTaskProcess, buildDecisionTaskResult } from "./decision-tasks";
import type { TaskSnapshot } from "@/src/types/decision";
import { getStageTaskLabel, getStageToolIntent, getStageTools, stageComposerPlaceholders } from "./stage-tools";

export type ManagerTaskKind = "fact-check" | "investment-report" | "challenge";
export const managerTaskLabels: Record<ManagerTaskKind, string> = {
  "fact-check": "交叉验证", "investment-report": "投资报告草稿", challenge: "模拟投委会",
};

export const getManagerTaskLabel = (kind: ManagerTaskKind, stage?: string) => stage && stage in stageComposerPlaceholders ? getStageTaskLabel(stage as ProjectLifecycleStage, kind) : managerTaskLabels[kind];

export function buildManagerTaskChoice(query: string, attachments: Extract<AssistantBlock, { kind: "mode-pick" }>["attachments"] = [], taskSnapshot?: TaskSnapshot): Extract<AssistantBlock, { kind: "mode-pick" }> {
  const stage = taskSnapshot?.project.lifecycleStage;
  if (stage) return { kind: "mode-pick", title: "这次需要完成什么？", reason: "沿用本次提交时的阶段与材料快照。", originalQuery: query || "基于当前阶段资料整理", attachments, taskSnapshot,
    options: getStageTools(stage, taskSnapshot.userRole).map((tool) => ({ mode: tool.kind, label: tool.label, desc: tool.description })) };
  return { kind: "mode-pick", title: "这次需要完成什么？", reason: "选择任务后，将保留本次问题和附件继续处理。", originalQuery: query || "基于本次附件与当前项目资料处理", attachments, taskSnapshot,
    options: [
      { mode: "fact-check", label: "交叉验证", desc: "核对数字、口径与投资主张，保留来源和差异。" },
      { mode: "investment-report", label: "生成报告", desc: "根据本次要求整理投资报告草稿。" },
      { mode: "challenge", label: "模拟投委会", desc: "找出可能改变投决判断的关键质询。" },
    ],
  };
}

export function getManagerTaskIntent(text: string): ManagerTaskKind | "ambiguous" {
  const stageIntent = getStageToolIntent(text);
  if (stageIntent) return stageIntent;
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
  const stage = project.lifecycleStage ?? "diligence";
  const label = getStageTaskLabel(stage, taskKind, query);
  if (stage === "decided") return buildDecisionTaskResult(project, taskKind, query, attachments).map((block) => block.kind === "project-work-report" ? { ...block, title: `${project.name} · ${label}` } : block);
  const early = getEarlyStageBrief(project);
  if (early) {
    const sections = early.sections.map((section, index) => ({ id: `stage-fact-${index}`, title: section.label, text: `${section.value}${section.note ? `\n${section.note}` : ""}` }));
    const nextQuestions = stage === "contact"
      ? "客户当前如何完成这一工作，愿意为何付费？\n产品演示能否覆盖真实使用流程？\n需要补充联系人、访谈原始记录与客户样本。"
      : stage === "intake"
        ? "主体、融资与股权字段是否齐备，是否存在重复项目？\n基金策略匹配依据是什么？\n缺失字段和资料由谁补齐、何时提交立项？"
        : "哪些观察会支持或否定当前投资假设？\n商业、财务、法务和产品工作流各自需要什么证据？\n为每项核查明确责任人、期限与交付物，重大不利事实及时回到立项范围评估。";
    return [
      { kind: "text", text: `${project.name}的${label}已整理。${early.summary}` },
      { kind: "project-work-report", taskKind, projectStage: stage, title: `${project.name} · ${label}`, summary: early.summary, query,
        sections: [...sections,
          { id: "stage-questions", title: taskKind === "fact-check" ? "待核实问题与材料" : "后续工作", text: nextQuestions },
          { id: "stage-provenance", title: "记录依据", text: `${early.evidenceNote}\n本次附件：${attachments.map((file) => file.name).join("、") || "无新增附件"}。新增附件仅记录文件信息，待解析与人工确认。\n本产物保留本次阶段快照；不形成投资批准，也不变更项目业务阶段。` },
        ], citations: [], materialSignature: getMaterialSignature(project, attachments) },
    ];
  }
  const late = getLateStageBrief(project);
  if (late) {
    const facts = [...late.metrics, ...late.facts];
    const items = late.sections.flatMap((section) => section.items);
    const sources = [...facts.flatMap((fact) => fact.source ? [fact.source] : []), ...items.flatMap((item) => item.sources)];
    const citations = sources.filter((source, index) => sources.findIndex((other) => other.document === source.document && other.page === source.page && other.paragraph === source.paragraph) === index);
    const statusLabels = { complete: "已完成", pending: "待补充", review: "待复核" };
    const references = (itemSources: typeof citations) => itemSources.map((source) => `[^${citations.findIndex((item) => item.document === source.document && item.page === source.page && item.paragraph === source.paragraph) + 1}]`).join("");
    const sections = [
      { id: "stage-baseline", title: "本次基准", text: `${late.title} · ${late.version} · ${late.date}${late.isDemo ? "（独立阶段情景）" : ""}\n${late.summary}` },
      ...facts.map((fact) => ({ id: fact.id, title: fact.label, text: `${fact.value}${fact.source ? references([fact.source]) : ""}\n截至 ${fact.date} · ${fact.version}${fact.inherited ? `\n沿用已出资基线：${fact.inherited.date} · ${fact.inherited.version}` : ""}${fact.note ? `\n${fact.note}` : ""}` })),
      ...late.sections.map((section) => ({ id: section.id, title: section.title,
        text: section.items.filter((item) => taskKind !== "challenge" || item.material).map((item) => `${item.title}${references(item.sources)}\n基准：${item.baseline}\n当前事实：${item.current}\n影响：${item.impact}\n处理：${statusLabels[item.status]} · ${item.owner} · ${item.deadline}\n所需依据：${item.evidenceNeeded}`).join("\n\n"),
      })).filter((section) => section.text),
      { id: "stage-changes", title: "最近变化", text: late.changes.length ? late.changes.map((change) => `${change.date} · ${change.title}\n${change.impact}`).join("\n\n") : "暂无已确认的阶段更新。" },
      { id: "stage-boundary", title: "材料与确认状态", text: `本次附件：${attachments.map((file) => file.name).join("、") || "无新增附件"}。新增附件仅记录文件信息，待解析与人工确认。\n${late.isDemo ? "以上来自独立阶段情景，未改变原项目的决议、出资或业务进度。" : "现有阶段资料不足，不能据此确认条件满足、出资完成或经营结论。"}本产物不覆盖正式文件，待复核事项须由责任人确认。` },
    ];
    return [{ kind: "text", text: `${label}已整理。${late.summary}` },
      { kind: "project-work-report", taskKind, projectStage: stage, title: `${project.name} · ${label}`, summary: late.summary, query, sections, citations, materialSignature: getMaterialSignature(project, attachments) }];
  }
  const brief = getCommitteeBrief(project);
  const questions = getCoreQuestions(brief);
  const citations = questions.flatMap((question) => question.sources).filter((source, index, all) =>
    all.findIndex((item) => item.document === source.document && item.page === source.page && item.paragraph === source.paragraph) === index,
  );
  const sections: Array<{id: string; title: string; text: string}> = [];
  if (taskKind === "investment-report") sections.push(
    { id: "overview", title: "项目概况", text: `${brief.description}\n本轮研究事项：${brief.agenda}\n本轮目标融资：${brief.financingTarget ?? "待确认"}\n我方拟投资：${brief.proposedInvestment ?? "待确认"}\n${brief.valuationLabel}：${brief.valuation ?? "待确认"}\n上述为尽调待验证方案，尚未形成正式投决。` },
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
      ? `已根据${project.name}的现有演示材料整理${label}。当前优先关注：${questions.map((question) => question.question).join("；")}`
      : "当前资料不足以形成有依据的分析结论。已保留本次要求，需先补充投决议案与尽调证据。" },
    { kind: "project-work-report", taskKind, projectStage: stage, title: `${project.name} · ${label}`,
      summary: questions.length ? questions.map((question) => question.impact).join("；") : "待补充投决议案与尽调证据。", query, sections, citations,
      sourceReport: resolveReportSource(project, attachments, preferredReport), materialSignature: getMaterialSignature(project, attachments),
      suggestedChanges: taskKind === "fact-check" && resolveReportSource(project, attachments, preferredReport) ? buildReportSuggestions(project) : undefined },
  ];
}

export function buildManagerTaskProcess(project: Project, taskKind: ManagerTaskKind): ReportProcessDefinition {
  if (project.lifecycleStage === "decided") return { ...buildDecisionTaskProcess(project, taskKind), title: `${getStageTaskLabel("decided", taskKind)} · 演示` };
  const stage = project.lifecycleStage ?? "diligence";
  const scope = { contact: "接触记录与行业线索", intake: "主体档案与入库资料", approved: "立项范围与尽调计划", diligence: "尽调事实与证据缺口", decided: "正式决议与落实要求", signed: "签署协议与交割条件", funded: "实际出资与登记记录", post: "实际投后基线与经营更新" }[stage];
  return { kind: taskKind === "fact-check" ? "cross-validation" : taskKind, title: `${getManagerTaskLabel(taskKind, project.lifecycleStage)} · 演示`, objective: project.name,
    phases: [
      {id: "scope", title: "保留任务与阶段快照", description: `关联${scope}。`, activeText: `正在整理${scope}。`, completedText: "本次要求与阶段版本已保留；新增文件仅记录附件信息。"},
      {id: "review", title: "整理现有依据与缺口", description: `使用${scope}的现有来源。`, activeText: "正在整理来源、变化与待处理事项。", completedText: "现有依据与待补证项已整理，未进行新增事实核验。"},
      {id: "result", title: "汇总演示产物", description: "保留结论和来源。", activeText: "正在整理演示报告。", completedText: "演示产物已整理，可在分析报告中回看。"},
    ],
  };
}
