import type { Project, QuestionContext, SourceAnchor } from "@/src/types";
import type { ProjectReportEntry } from "@/src/lib/project-reports";

export interface CommitteeAnalysisQuestion {
  id: string;
  category: string;
  question: string;
  conclusion: string;
  thesis: string;
  impact: string;
  neededEvidence: string;
  relatedQuestionIds: string[];
  sources: SourceAnchor[];
  report: ProjectReportEntry;
}

export function getCommitteeAnalysisQuestionContext(project: Project, question: CommitteeAnalysisQuestion): QuestionContext {
  return {
    projectId: project.id, projectName: project.name, stage: project.lifecycleStage,
    questionId: question.id, question: question.question, context: question.conclusion,
    thesis: question.thesis, impact: question.impact, neededEvidence: question.neededEvidence,
    sources: question.sources.map((source) => ({ ...source })),
  };
}

/** Editorial questions from the existing, project-bound demo analysis artifacts.
 * Not live analysis of a newly uploaded file. Do not use filenames as evidence,
 * generic industry prompts, or the reference screenshot's unrelated figures.
 */
export function getCommitteeAnalysisQuestions(project: Project, reports: ProjectReportEntry[]): CommitteeAnalysisQuestion[] {
  const ownReports = reports.filter((report) => report.projectId === project.id);
  if (project.id === "proj-aurora") {
    const report = ownReports.find((entry) => entry.conversationId === "conv-aurora-challenge" && entry.block.kind === "challenge-list");
    if (!report || report.block.kind !== "challenge-list") return [];
    const items = report.block.items;
    const definitions = [
      { itemId: "c-1", category: "估值", question: "增长计划需要多少交付投入，本轮定价是否计入相应成本？", conclusion: "现有分析指出，人效与交付能力是收入预测及退出估值能否兑现的约束，不能只用收入倍数支持定价。", thesis: "收入增长在计入交付投入后仍能支持本轮定价。", impact: "若交付资源随收入同步增加，利润与退出回报需要按实际成本重算。", neededEvidence: "按项目拆分的交付人力、实施周期、单位成本及收入预测，连同相应订单和验收计划。", relatedQuestionIds: ["aurora-customer-growth"] },
      { itemId: "c-2", category: "技术", question: "盈利改善有多少来自可执行的技术降本，而非上游降价假设？", conclusion: "分析认为模型调用成本对毛利影响显著；采购价格和技术降本方案尚需分别验证。", thesis: "可执行的采购安排与技术方案能够支持预测中的盈利改善。", impact: "尚未兑现的降价或降本可能使订单增长无法转化为预期利润。", neededEvidence: "有效采购价格及期限、真实业务负载下的技术降本测试、服务质量结果和对应研发运维成本。", relatedQuestionIds: ["aurora-inference-margin"] },
      { itemId: "c-3", category: "增长", question: "头部客户收缩后，增长预测如何转化为可兑现的新订单？", conclusion: "分析识别出客户集中与续约下滑风险，收入增长需要以新增客户订单及交付计划补足。", thesis: "新增订单与续约能够覆盖头部客户收缩，并形成可交付、可回款的增长。", impact: "若新增订单不能弥补续约缺口，收入预测及其支持的定价需要调整。", neededEvidence: "逐客户续约及新增订单、签约状态、交付验收计划和期后回款，剔除试点与意向的重复计算。", relatedQuestionIds: ["aurora-customer-growth"] },
    ];
    return definitions.flatMap(({ itemId, ...definition }) => {
      const item = items.find((candidate) => candidate.id === itemId);
      return item?.evidence.length ? [{ ...definition, id: `aurora-analysis-${itemId}`, sources: item.evidence, report }] : [];
    });
  }
  if (project.id === "proj-haizhi") {
    const report = ownReports.find((entry) => entry.conversationId === "conv-haizhi-review" && entry.block.kind === "diligence-report");
    if (!report || report.block.kind !== "diligence-report") return [];
    const citations = report.block.citations;
    return [
      { id: "haizhi-analysis-strategy", category: "战略", question: "剔除宽口径市场叙事后，图数据库业务能否支撑报告的增长假设？", conclusion: "复核报告认为，上位市场规模不能等同于公司可获得市场，标准化软件收入占比仍缺乏充分支撑。", thesis: "可获得的图数据库市场与标准化软件收入能支持报告的增长假设。", impact: "若市场口径和实际软件收入不匹配，增长及产品型估值依据需要收窄。", neededEvidence: "图数据库细分市场口径、可触达客户及订单、标准化软件收入拆分和重复购买记录。", referenceNumbers: [2, 8, 12, 13], relatedQuestionIds: ["haizhi-product-valuation"] },
      { id: "haizhi-analysis-technology", category: "技术", question: "已有性能优势能否转化为可持续的商业优势，而非项目交付能力？", conclusion: "报告认可 AtlasGraph 的公开测试证据，但将产品性能、标准化收入与项目型交付区分判断。", thesis: "产品性能优势可以转化为持续的软件收入与商业竞争力。", impact: "若优势主要依赖定制实施，就不能直接以产品性能推断可复制收入与利润。", neededEvidence: "可比业务负载的性能测试、客户采购与续约、标准软件和定制交付收入及毛利拆分。", referenceNumbers: [2, 11], relatedQuestionIds: ["haizhi-product-valuation"] },
      { id: "haizhi-analysis-valuation", category: "估值", question: "退出转向港股后，当前定价需要哪些交易保护才能覆盖回报缺口？", conclusion: "报告将 A 股高倍数退出降为上行情景，认为本轮价格安全边际不足，需重新评估价格或保护条款。", thesis: "实际可行的退出路径与交易条件能够提供足够的投资回报。", impact: "较低退出倍数可能放大价格风险，未落实的保护条款不能计入已获得的安全边际。", neededEvidence: "港股可比估值与退出敏感性测算、投资价格、已签交易保护条款及其执行条件。", referenceNumbers: [5, 10, 15], relatedQuestionIds: ["haizhi-product-valuation", "haizhi-redemption-rights"] },
      { id: "haizhi-analysis-finance", category: "财务", question: "年末集中确收能否同时带来利润与回款，还是将压力留在应收和存货？", conclusion: "报告认为财务预测依赖年末集中确认收入，需要同时验证验收、成本结转和回款，不能只看合同金额。", thesis: "年末项目能够按实际验收确认收入、结转成本并实现回款。", impact: "验收或回款延期可能同时影响盈利兑现和营运资金需求。", neededEvidence: "逐项目合同、验收单、收入与成本结转凭证、应收和存货明细及期后回款。", referenceNumbers: [1, 3, 10], relatedQuestionIds: ["haizhi-year-end-recognition"] },
    ].flatMap(({ referenceNumbers, ...question }) => {
      const sources = referenceNumbers.flatMap((number) => citations[number - 1] ? [citations[number - 1]] : []);
      return sources.length ? [{ ...question, sources, report }] : [];
    });
  }
  return [];
}
