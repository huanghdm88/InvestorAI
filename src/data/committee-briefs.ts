import type { Project, SourceAnchor } from "@/src/types";
import { mockConversations } from "@/src/data/mock-conversations";
import { mockProjects } from "@/src/data/mock-projects";

export interface CoreQuestion {
  id: string;
  question: string;
  context: string;
  impact: string;
  thesis: string;
  neededEvidence: string;
  sources: SourceAnchor[];
  status: "待核实" | "需讨论" | "关键缺口";
  scope: "core" | "supporting" | "resolved";
  /** Smaller values come first; this is an editorial ordering, not a risk score. */
  priority: number;
}

export interface CommitteeBrief {
  projectId: string;
  description: string;
  round: string;
  financingTarget: string | null;
  proposedInvestment: string | null;
  valuation: string | null;
  valuationLabel: string;
  fundingUse: string | null;
  investmentThesis: string;
  agenda: string;
  questions: CoreQuestion[];
  isDemo: boolean;
  basis: string;
}

/**
 * Curated reading examples, not generated diligence results or live company facts.
 * Reuse the existing report anchors unchanged. A missing anchor stays missing;
 * project filenames must never be used to manufacture page numbers or quotations.
 */
function sourcesFrom(conversationId: string, ...paragraphs: string[]): SourceAnchor[] {
  const conversation = mockConversations.find((item) => item.id === conversationId);
  const citations = conversation?.messages.flatMap((message) =>
    (message.blocks ?? []).flatMap((block) =>
      "citations" in block ? block.citations ?? [] : [],
    ),
  ) ?? [];
  return paragraphs.flatMap((paragraph) => {
    const source = citations.find((citation) => citation.paragraph === paragraph);
    return source ? [{ ...source, highlight: source.highlight?.slice() }] : [];
  });
}

const auroraBrief: Omit<CommitteeBrief, "projectId"> = {
  description: "面向企业 IT 运维场景提供 AI Agent 自动化服务。",
  round: "Pre-A 轮",
  financingTarget: null,
  proposedInvestment: null,
  valuation: "人民币 12.6 亿元",
  valuationLabel: "议案投前估值",
  fundingUse: null,
  investmentThesis: "以企业运维自动化扩大订单规模，依靠推理成本下降改善盈利能力。",
  agenda: "审议 Pre-A 轮投资方案，重点判断增长与盈利假设能否支持本轮定价。",
  isDemo: true,
  basis: "基于现有极光智算演示议案、财务交叉验证及挑战质询报告整理；融资总额、我方拟投和资金用途尚未明确。",
  questions: [
    {
      id: "aurora-cash-reconciliation",
      question: "经营现金流的 425 万元差额能否解释，现有现金创造能力是否被高估？",
      context: "议案披露经营现金流 2,840 万元，尽调单体加总为 2,415 万元，尚缺合并调节说明。",
      impact: "如果差额缺乏支持，需要重新判断现金流质量与估值依据。",
      thesis: "议案将经营现金流改善作为经营质量提升的依据。",
      neededEvidence: "合并至单体现金流调节表、425 万元差额的逐项凭证及关联方代付费用处理。",
      sources: sourcesFrom("conv-aurora-fact", "三、财务摘要 / (3) 现金流", "经营活动产生的现金流量净额（单体加总）"),
      status: "待核实",
      scope: "core",
      priority: 1,
    },
    {
      id: "aurora-inference-margin",
      question: "若推理价格未下降 40%，毛利改善的投资逻辑是否仍成立？",
      context: "2024 H2 底层 API 成本占客单价 38%；BP 假设 2026 年推理价格下降 40%，推动毛利率升至 55%。",
      impact: "成本下降若无法兑现，订单增长未必带来预期利润，需要重估盈利预测。",
      thesis: "规模增长与推理降价共同推动毛利率改善。",
      neededEvidence: "已签采购价格、可执行的模型路由降本方案，以及不降价情景下的单位经济模型。",
      sources: sourcesFrom("conv-aurora-challenge", "单笔订单成本结构", "成本下降假设"),
      status: "关键缺口",
      scope: "core",
      priority: 2,
    },
    {
      id: "aurora-customer-growth",
      question: "头部客户续约金额下降 39%，新增订单能否支撑 12.6 亿元定价？",
      context: "前五大客户贡献收入 41.2%，最大客户 2025 年续约金额下降 39%；需确认新增客户能否弥补缺口。",
      impact: "收入预测若未反映续约下滑，当前定价的增长基础需要调整。",
      thesis: "以未来收入增长支撑本轮 PS 6 倍的投前定价。",
      neededEvidence: "最大客户续约合同、新客户已签订单与交付计划，以及更新后的收入预测。",
      sources: [
        ...sourcesFrom("conv-aurora-challenge", "四、客户集中度"),
        ...sourcesFrom("conv-aurora-fact", "本轮融资概览"),
      ],
      status: "需讨论",
      scope: "core",
      priority: 3,
    },
    {
      id: "aurora-cto-background",
      question: "CTO 的具体项目经历是否完成核验？",
      context: "BP 仅列示“资深架构师”，未给出具体项目与任职时间。",
      impact: "目前作为背景补证；若涉及核心技术或交付能力缺口，再提升至核心质询。",
      thesis: "核心团队具备交付企业级 Agent 产品的能力。",
      neededEvidence: "可核验的任职记录、项目职责及技术交付成果。",
      sources: sourcesFrom("conv-aurora-challenge", "团队介绍 / CTO 履历"),
      status: "待核实",
      scope: "supporting",
      priority: 4,
    },
    {
      id: "aurora-revenue-tax-basis",
      question: "营收 1.82 亿元与 1.79 亿元的口径差异",
      context: "现有演示交叉验证报告已将差异解释为含税与不含税口径，未识别实质性失真。",
      impact: "当前退出核心质询区，保留口径说明供查阅。",
      thesis: "年度收入披露应与审计口径可比。",
      neededEvidence: "保留报告中的口径说明；若后续材料推翻解释，再重新核验。",
      sources: sourcesFrom("conv-aurora-fact", "三、财务摘要 / (1) 收入", "经审计的合并利润表"),
      status: "需讨论",
      scope: "resolved",
      priority: 5,
    },
  ],
};

const haizhiBrief: Omit<CommitteeBrief, "projectId"> = {
  description: "提供图数据库、知识图谱与数据智能解决方案。",
  round: "D 轮",
  financingTarget: null,
  proposedInvestment: "人民币 1.5 亿元",
  valuation: "不超过人民币 29.5 亿元",
  valuationLabel: "议案投前估值",
  fundingUse: null,
  investmentThesis: "以图数据库及知识图谱能力带动收入增长和盈利改善，并通过上市实现退出。",
  agenda: "审议 D 轮拟投资方案，确认盈利兑现、退出估值及历史回购义务的处理。",
  isDemo: true,
  basis: "基于现有海致科技历史案例改编报告；财务与法律事项均为原演示材料的时点信息，不代表企业现状。1.5 亿元为议案拟投资金额，未据此推定本轮融资总额。",
  questions: [
    {
      id: "haizhi-year-end-recognition",
      question: "年末集中验收与回款能否兑现，全年扭亏依据是否充分？",
      context: "2024 年前十个月收入 2.89 亿元、净亏损 1,341 万元，议案全年预测收入 5 亿元、净利润 3,683 万元。",
      impact: "年末收入若不能验收并形成回款，盈利预测和新增资金需求都需要重估。",
      thesis: "依靠年末项目验收集中确认收入，实现全年扭亏。",
      neededEvidence: "年末逐项目验收资料、收入确认凭证、期后回款和长期未验收项目清单。",
      sources: sourcesFrom("conv-haizhi-review", "主要财务尽调发现 / 模拟利润表", "财务预测 / 估值与 IRR", "应收账款 / 存货 / 长期未验收项目"),
      status: "关键缺口",
      scope: "core",
      priority: 1,
    },
    {
      id: "haizhi-product-valuation",
      question: "收入仍以项目交付为主，29.5 亿元定价依赖的产品化与退出倍数是否成立？",
      context: "前十个月 DMC 与图谱相关收入占 85.26%，图数据库收入 815.10 万元；议案退出测算采用 35 倍 PE 或较高 PS。",
      impact: "产品化与利润改善若不及预期，当前定价可能缺乏足够退出回报。",
      thesis: "图数据库产品商业化提升收入质量，并获得产品型企业的退出估值。",
      neededEvidence: "标准化软件与项目交付的收入、毛利拆分，可重复订单，以及较低退出倍数情景。",
      sources: sourcesFrom("conv-haizhi-review", "商业模式 / 收入类型 / 毛利", "交易方案 / 融资情况", "财务预测 / 估值与 IRR"),
      status: "需讨论",
      scope: "core",
      priority: 2,
    },
    {
      id: "haizhi-redemption-rights",
      question: "历史投资人的回购权如何处理，会否挤占本轮资金或影响上市？",
      context: "演示法律尽调载明，未在约定的 2024 年 12 月 29 日前合格上市或并购，历史投资人可要求公司及创始人回购。",
      impact: "未解决的回购义务可能改变现金需求与交易前提，影响新增投资可行性。",
      thesis: "本轮融资支持经营发展，历史权利清理后推进退出。",
      neededEvidence: "相关投资人的书面豁免或延期协议、回购权触发状态及上市前权利清理方案。",
      sources: sourcesFrom("conv-haizhi-review", "回购权 / VIE 拆除 / 注册资本实缴"),
      status: "待核实",
      scope: "core",
      priority: 3,
    },
  ],
};

const sifanshiBrief: Omit<CommitteeBrief, "projectId"> = {
  description: "面向企业提供 AutoML 与智能决策系统。",
  round: "B 轮",
  financingTarget: null,
  proposedInvestment: null,
  valuation: null,
  valuationLabel: "估值口径",
  fundingUse: null,
  investmentThesis: "将机器学习能力用于企业决策场景，通过客户拓展实现商业化增长。",
  agenda: "审议 B 轮投资方案，先确认交易口径及控制权、税务和经营许可的处理条件。",
  isDemo: true,
  basis: "基于现有第四范式历史案例改编报告。两份演示报告的融资与估值口径存在冲突，金额暂不展示；法律与税务表述仅对应原材料时点。",
  questions: [
    {
      id: "sifanshi-transaction-basis",
      question: "本轮估值、新增融资与老股转让，以哪版交易文件为准？",
      context: "两份演示报告的交易数字存在冲突；现有尽调尚不能印证 B 轮完整认购份额和老股转让安排。",
      impact: "未锁定交易口径，就无法可靠判断持股比例、公司实际到账资金及本次投资价格。",
      thesis: "新增资本用于企业发展，本次认购应有明确的定价与权益边界。",
      neededEvidence: "B 轮 Term Sheet、SPA、股东协议及区分新增认购与老股转让的资金分配表。",
      sources: sourcesFrom("conv-sifanshi-validation", "B 轮交易条款"),
      status: "关键缺口",
      scope: "core",
      priority: 1,
    },
    {
      id: "sifanshi-control-exit",
      question: "经营主体控制权和 VIE 调整能否落实，拟定退出路径是否可行？",
      context: "历史法律尽调记载股权转让尚未完成必要程序，并提示协议控制结构可能影响境内上市。",
      impact: "控制权与退出结构若无法落实，需要重审交易可行性及交割前提。",
      thesis: "投资权益能够覆盖核心经营主体，并有可执行的退出路径。",
      neededEvidence: "完成的股权变更登记、有效控制文件及经专业意见支持的结构调整方案。",
      sources: sourcesFrom("conv-sifanshi-cross-check", "公司对第四范式（北京）控制权瑕疵", "协议控制 / 境内 IPO 障碍"),
      status: "待核实",
      scope: "core",
      priority: 2,
    },
    {
      id: "sifanshi-tax-exposure",
      question: "收入适用税率的历史差异会产生多大补缴责任，由谁承担？",
      context: "原时点财务尽调认为业务实质更接近软件销售，但公司按技术服务口径申报，存在税务合规疑点。",
      impact: "潜在补缴与处罚可能减少可用现金，需要量化并明确交易责任安排。",
      thesis: "投资方案中的现金与盈利基础已充分考虑历史负债。",
      neededEvidence: "对应业务性质的税务意见、历史补缴测算、整改结果及责任承担安排。",
      sources: sourcesFrom("conv-sifanshi-cross-check", "目标集团存在的税务问题"),
      status: "待核实",
      scope: "core",
      priority: 3,
    },
    {
      id: "sifanshi-operating-permit",
      question: "SaaS 业务所需经营许可是否明确，许可缺口会否中断核心业务？",
      context: "历史法律尽调提示相关 SaaS 业务可能需要 ICP 许可，需确认实际业务适用范围与补办状态。",
      impact: "如果核心业务必须持证且无法取得，商业化收入与持续经营假设可能受影响。",
      thesis: "企业 SaaS 业务能够合规持续运营并扩大客户收入。",
      neededEvidence: "业务模式与许可要求的法律确认、适用主体的许可证或可执行整改安排。",
      sources: sourcesFrom("conv-sifanshi-cross-check", "ICP 证 / 增值电信业务许可证"),
      status: "待核实",
      scope: "core",
      priority: 4,
    },
  ],
};

const curatedBriefs: Record<string, Omit<CommitteeBrief, "projectId">> = {
  "proj-aurora": auroraBrief,
  "proj-haizhi": haizhiBrief,
  "proj-sifanshi": sifanshiBrief,
};

export function getCommitteeBrief(project: Project): CommitteeBrief {
  const curated = curatedBriefs[project.id];
  if (curated) {
    return {
      ...curated,
      projectId: project.id,
      questions: curated.questions.map((question) => ({
        ...question,
        sources: question.sources.map((source) => ({ ...source, highlight: source.highlight?.slice() })),
      })),
    };
  }

  return {
    projectId: project.id,
    description: project.industry || "企业业务待补充",
    round: project.name.match(/(?:Pre-[A-Z]|[A-Z]\+?|天使|种子)\s*轮/)?.[0] ?? "待补充",
    financingTarget: null,
    proposedInvestment: null,
    valuation: null,
    valuationLabel: "投前估值",
    fundingUse: null,
    investmentThesis: "投资主张待补充",
    agenda: "本次审议事项待补充",
    questions: [],
    isDemo: mockProjects.some((item) => item.id === project.id),
    basis: "当前尚无可用于会前简报的项目分析结果；需结合议案与尽调材料形成项目特定的质询方向。",
  };
}

/** Preserve every material issue; never fill or truncate a fixed number of cards. */
export function getCoreQuestions(brief: CommitteeBrief): CoreQuestion[] {
  const seen = new Set<string>();
  return brief.questions
    .filter((question) => question.scope === "core")
    .slice()
    .sort((left, right) => left.priority - right.priority)
    .filter((question) => {
      if (seen.has(question.id)) return false;
      seen.add(question.id);
      return true;
    });
}
