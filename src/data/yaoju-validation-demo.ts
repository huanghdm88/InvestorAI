import type {
  AssistantBlock,
  FactCompare,
  ReportProcessDefinition,
  SourceAnchor,
} from "@/src/types";

export const YAOJU_DEMO_DOCUMENT_NAME = "曜矩智造_投前投资分析报告_Mock";

export interface YaojuClaimNode {
  id: string;
  branch: "商业增长" | "产品壁垒" | "财务估值" | "风险交易";
  claim: string;
  page: number;
  priority: "核心" | "重要" | "补充";
  agentId: string;
}

export interface YaojuDemoAgent {
  id: string;
  name: string;
  role: string;
  number: string;
  assignment: string;
  evidenceGoal: string;
  steps: string[];
  output: string;
}

export type YaojuAgentRuntimeStatus =
  | "queued"
  | "running"
  | "review"
  | "rework"
  | "complete";

export interface YaojuAgentRuntime {
  progress: number;
  status: YaojuAgentRuntimeStatus;
  statusLabel: string;
  currentTask: string;
  activeStep: number;
  completedStepCount: number;
  totalSteps: number;
}

export const YAOJU_DEMO_TIMELINE = {
  intentEnd: 14,
  claimsEnd: 36,
  strategyEnd: 48,
  agentsEnd: 78,
} as const;

export const YAOJU_CROSS_VALIDATION_TIMELINE = {
  intentEnd: 14,
  claimsEnd: 36,
  comparisonEnd: 88,
} as const;

export function getYaojuDemoStageIndex(progress: number) {
  if (progress >= YAOJU_DEMO_TIMELINE.agentsEnd) return 4;
  if (progress >= YAOJU_DEMO_TIMELINE.strategyEnd) return 3;
  if (progress >= YAOJU_DEMO_TIMELINE.claimsEnd) return 2;
  if (progress >= YAOJU_DEMO_TIMELINE.intentEnd) return 1;
  return 0;
}

export function getYaojuCrossValidationStageIndex(progress: number) {
  if (progress >= YAOJU_CROSS_VALIDATION_TIMELINE.comparisonEnd) return 3;
  if (progress >= YAOJU_CROSS_VALIDATION_TIMELINE.claimsEnd) return 2;
  if (progress >= YAOJU_CROSS_VALIDATION_TIMELINE.intentEnd) return 1;
  return 0;
}

export function isYaojuDemoKind(
  demoKind?: "yaoju-investment-analysis" | "yaoju-cross-validation"
) {
  return demoKind === "yaoju-investment-analysis" || demoKind === "yaoju-cross-validation";
}

export const YAOJU_REPORT_META = {
  company: "曜矩智造",
  title: "曜矩智造 · 投前投资分析报告",
  pages: 15,
  sections: 14,
  fileSize: "566 KB",
  declaredVerdict: "有条件推进",
  inferredIntent:
    "核验报告中的关键主张是否足以支撑“有条件推进”，并识别会改变估值或交易条件的证据缺口。",
};

export const YAOJU_CLAIMS: YaojuClaimNode[] = [
  {
    id: "growth-nrr",
    branch: "商业增长",
    claim: "2025A 净收入留存率 NRR 为 124%",
    page: 2,
    priority: "核心",
    agentId: "customer",
  },
  {
    id: "growth-customer",
    branch: "商业增长",
    claim: "2025A 付费客户 118 家，同比增长 62%",
    page: 8,
    priority: "重要",
    agentId: "customer",
  },
  {
    id: "growth-expansion",
    branch: "商业增长",
    claim: "模拟访谈的 12 家客户中有 9 家计划扩容",
    page: 8,
    priority: "重要",
    agentId: "customer",
  },
  {
    id: "growth-dso",
    branch: "商业增长",
    claim: "应收账款周转天数由 176 天改善至 138 天",
    page: 8,
    priority: "核心",
    agentId: "finance",
  },
  {
    id: "product-data",
    branch: "产品壁垒",
    claim: "拥有 1,900 万张标注图像并覆盖 620 类缺陷",
    page: 6,
    priority: "核心",
    agentId: "technology",
  },
  {
    id: "product-reuse",
    branch: "产品壁垒",
    claim: "Top 20 标准模块复用率从 38% 提升至 71%",
    page: 4,
    priority: "核心",
    agentId: "technology",
  },
  {
    id: "product-cycle",
    branch: "产品壁垒",
    claim: "模型平均上线周期从 12 周缩短至 5 周",
    page: 8,
    priority: "重要",
    agentId: "technology",
  },
  {
    id: "product-workflow",
    branch: "产品壁垒",
    claim: "70% 客户已接入 MES / QMS，替换成本较高",
    page: 6,
    priority: "重要",
    agentId: "technology",
  },
  {
    id: "finance-revenue",
    branch: "财务估值",
    claim: "2026E 营业收入 2.22 亿元，同比增长 73%",
    page: 9,
    priority: "核心",
    agentId: "finance",
  },
  {
    id: "finance-backlog",
    branch: "财务估值",
    claim: "9,600 万元已签未确认订单覆盖 2026E 收入的 43%",
    page: 9,
    priority: "核心",
    agentId: "finance",
  },
  {
    id: "valuation-entry",
    branch: "财务估值",
    claim: "6.80 亿元投前估值对应 3.1x 2026E 收入",
    page: 11,
    priority: "核心",
    agentId: "valuation",
  },
  {
    id: "valuation-return",
    branch: "财务估值",
    claim: "基准情景回报为 4.3x MOIC / 44.0% IRR",
    page: 11,
    priority: "重要",
    agentId: "valuation",
  },
  {
    id: "market-size",
    branch: "财务估值",
    claim: "2030E 目标行业 SAM 为 280.6 亿元",
    page: 5,
    priority: "重要",
    agentId: "market",
  },
  {
    id: "risk-code",
    branch: "风险交易",
    claim: "两名前员工的职务成果确认函仍待补签",
    page: 6,
    priority: "核心",
    agentId: "legal",
  },
  {
    id: "risk-q4",
    branch: "风险交易",
    claim: "2025Q4 集中确认了 42% 的全年收入",
    page: 14,
    priority: "核心",
    agentId: "finance",
  },
  {
    id: "risk-ip",
    branch: "风险交易",
    claim: "核心 IP、数据权属和收入真实性均为一票否决项",
    page: 15,
    priority: "核心",
    agentId: "legal",
  },
];

export type YaojuValidationVerdict =
  | "一致"
  | "部分一致"
  | "证据不足"
  | "存在偏差";

export const YAOJU_CLAIM_VALIDATION_VERDICTS: Record<
  string,
  YaojuValidationVerdict
> = {
  "growth-nrr": "部分一致",
  "growth-customer": "一致",
  "growth-expansion": "部分一致",
  "growth-dso": "一致",
  "product-data": "证据不足",
  "product-reuse": "一致",
  "product-cycle": "部分一致",
  "product-workflow": "证据不足",
  "finance-revenue": "部分一致",
  "finance-backlog": "部分一致",
  "valuation-entry": "一致",
  "valuation-return": "部分一致",
  "market-size": "证据不足",
  "risk-code": "一致",
  "risk-q4": "存在偏差",
  "risk-ip": "证据不足",
};

export const YAOJU_AGENTS: YaojuDemoAgent[] = [
  {
    id: "finance",
    name: "财务核验",
    role: "财务证据核验",
    number: "01",
    assignment: "复算收入增速、订单覆盖、Q4 集中确认与应收质量",
    evidenceGoal: "合同、验收、回款和审计调整至少形成两类证据",
    steps: [
      "统一收入确认期间与含税口径",
      "穿行核对合同、验收单与发票",
      "复算订单覆盖率和应收周转",
      "执行 Q4 集中确收压力测试",
    ],
    output: "定位 3 个收入质量缺口，确认 6.80 亿元估值对收入基数高度敏感。",
  },
  {
    id: "customer",
    name: "客户洞察",
    role: "客户与留存访谈",
    number: "02",
    assignment: "核验 NRR 124%、扩容意愿、客户集中度与产品替换成本",
    evidenceGoal: "覆盖续费、扩容、流失和回款四类客户样本",
    steps: [
      "抽取客户 ARR 与续费台账口径",
      "按扩容、稳定、流失划分样本",
      "交叉核对访谈与回款记录",
      "评估 NRR 与替换成本证据强度",
    ],
    output: "扩容意愿获得部分支持，但模拟访谈不能替代独立客户回访。",
  },
  {
    id: "technology",
    name: "技术审查",
    role: "产品与技术审阅",
    number: "03",
    assignment: "核验数据资产、模块复用、上线周期和 MES / QMS 嵌入",
    evidenceGoal: "盲测、代码分支和项目工时三类证据相互印证",
    steps: [
      "检查数据资产目录和授权边界",
      "对照代码分支与模块复用记录",
      "抽样复算项目上线周期",
      "验证 MES / QMS 集成深度",
    ],
    output: "复合壁垒逻辑成立，但 1,900 万张图像的授权边界尚未闭环。",
  },
  {
    id: "market",
    name: "市场研究",
    role: "市场边界研究",
    number: "04",
    assignment: "验证 TAM / SAM、制造业预算和跨行业复制节奏",
    evidenceGoal: "公司口径之外，至少取得两个独立行业来源",
    steps: [
      "拆分 TAM、SAM 与可服务产线边界",
      "检索制造业软件预算独立来源",
      "自下而上复算产线数量与客单价",
      "校验跨行业复制的交付约束",
    ],
    output: "按产线数 × 软件支出重新测算后，280.6 亿元仅能视作情景假设。",
  },
  {
    id: "legal",
    name: "法务合规",
    role: "知识产权与合规",
    number: "05",
    assignment: "核验前员工代码、训练数据授权、开源许可和海外数据合规",
    evidenceGoal: "权属文件、代码扫描和客户授权形成闭环",
    steps: [
      "核对前员工职务成果确认文件",
      "检查训练数据授权链",
      "扫描开源许可与代码归属",
      "识别数据跨境和客户授权缺口",
    ],
    output: "两名前员工确认函与存量遥测数据授权仍需作为交割先决条件。",
  },
  {
    id: "valuation",
    name: "估值测算",
    role: "估值与回报复算",
    number: "06",
    assignment: "独立复算 EV / Revenue、DCF、风险资本法和稀释情景",
    evidenceGoal: "统一收入基数、净现金、融资稀释和退出倍数口径",
    steps: [
      "统一投前估值与净现金口径",
      "独立复算 EV / Revenue",
      "建立收入下调与稀释情景",
      "压力测试 MOIC 与退出倍数",
    ],
    output: "3.1x 算术自洽；4.3x MOIC 依赖收入兑现和 5.0x 退出倍数。",
  },
];

/**
 * 统一工作流中 Agent 之间的协同节点。每个节点同时标记双方正在处理的步骤，
 * 详情工作台据此把协同显示为独立的实时过程项。
 */
export interface YaojuAgentInteraction {
  id: string;
  agentId: string;
  agentStep: number;
  partnerId: string;
  partnerStep: number;
  zh: string;
  en: string;
}

export const YAOJU_AGENT_INTERACTIONS: readonly YaojuAgentInteraction[] = [
  {
    id: "finance-legal-evidence",
    agentId: "finance",
    agentStep: 1,
    partnerId: "legal",
    partnerStep: 1,
    zh: "共同核对合同、验收、回款与权属边界",
    en: "Reconcile contracts, acceptance, collections, and ownership boundaries",
  },
  {
    id: "finance-valuation-base",
    agentId: "finance",
    agentStep: 2,
    partnerId: "valuation",
    partnerStep: 1,
    zh: "同步收入基数，校准估值回报口径",
    en: "Sync the revenue base and calibrate valuation return definitions",
  },
  {
    id: "customer-finance-retention",
    agentId: "customer",
    agentStep: 2,
    partnerId: "finance",
    partnerStep: 2,
    zh: "对齐 ARR 台账、续费记录和真实回款",
    en: "Align ARR ledgers, renewals, and actual collections",
  },
  {
    id: "technology-legal-rights",
    agentId: "technology",
    agentStep: 0,
    partnerId: "legal",
    partnerStep: 1,
    zh: "追溯训练数据授权和代码归属",
    en: "Trace training-data rights and code ownership",
  },
  {
    id: "technology-market-delivery",
    agentId: "technology",
    agentStep: 3,
    partnerId: "market",
    partnerStep: 3,
    zh: "核对 MES / QMS 集成对交付边界的影响",
    en: "Check how MES / QMS integration affects delivery boundaries",
  },
  {
    id: "market-valuation-scenario",
    agentId: "market",
    agentStep: 2,
    partnerId: "valuation",
    partnerStep: 2,
    zh: "将 TAM / SAM 假设映射到收入情景",
    en: "Map TAM / SAM assumptions to revenue scenarios",
  },
];

export function getYaojuAgentCollaborations(
  agentId: string,
  stepIndex: number
) {
  return YAOJU_AGENT_INTERACTIONS.filter(
    (interaction) =>
      (interaction.agentId === agentId && interaction.agentStep === stepIndex) ||
      (interaction.partnerId === agentId && interaction.partnerStep === stepIndex)
  ).map((interaction) => {
    const isSource = interaction.agentId === agentId;
    return {
      interactionId: interaction.id,
      partnerId: isSource ? interaction.partnerId : interaction.agentId,
      agentStep: isSource ? interaction.agentStep : interaction.partnerStep,
      partnerStep: isSource ? interaction.partnerStep : interaction.agentStep,
      zh: interaction.zh,
      en: interaction.en,
    };
  });
}

export interface YaojuAgentReworkPlan {
  submission: string;
  rejectionReason: string;
  instruction: string;
  steps: string[];
}

const YAOJU_AGENT_REWORK_PLANS: Record<string, YaojuAgentReworkPlan> = {
  finance: {
    submission: "收入预测与订单覆盖率计算一致，可以沿用原报告口径。",
    rejectionReason: "只完成了算术复核，缺少合同、验收与回款证据，无法判断收入质量。",
    instruction: "补做 Top 合同穿行测试，并把确认时点、回款状态和审计调整逐笔对齐。",
    steps: ["重选高风险收入样本", "补齐合同与验收凭证", "核对发票和实际回款", "重算收入质量结论"],
  },
  customer: {
    submission: "客户扩容意愿较强，NRR 124% 可以支持增长判断。",
    rejectionReason: "样本来自模拟访谈，尚未与 ARR 台账和真实回款记录交叉印证。",
    instruction: "补充独立客户回访，并按续费、扩容和流失样本重新核验 NRR。",
    steps: ["重建客户分层样本", "补充独立客户回访", "核对 ARR 与回款台账", "重算留存与扩容结论"],
  },
  technology: {
    submission: "数据规模和模块复用率足以支持产品壁垒判断。",
    rejectionReason: "数据授权边界与代码复用记录尚未闭环，壁垒证据不可直接采信。",
    instruction: "补查授权链、代码分支和项目工时，用可追溯记录重建技术证据。",
    steps: ["追溯数据授权边界", "抽查代码分支记录", "复算项目交付工时", "重写技术壁垒结论"],
  },
  market: {
    submission: "报告给出的 TAM 为 820 亿元，市场空间较大。",
    rejectionReason: "缺少独立来源，也没有解释 280.6 亿元 SAM 的可服务边界。",
    instruction: "用目标产线数 x 年软件支出自下而上重算，并区分公司假设与外部证据。",
    steps: ["拆分 TAM 与可服务 SAM", "补充行业预算独立来源", "自下而上重算市场规模", "对比原报告情景假设"],
  },
  legal: {
    submission: "现有材料未显示重大权属争议，法律风险整体可控。",
    rejectionReason: "两名前员工确认函和训练数据授权链仍有缺口，不能据此排除一票否决风险。",
    instruction: "逐项追踪权属文件、代码扫描和客户授权，明确未闭环事项的交易条件。",
    steps: ["追踪职务成果确认文件", "补查训练数据授权链", "复核代码扫描结果", "重写交割条件建议"],
  },
  valuation: {
    submission: "3.1x 进入倍数和 4.3x MOIC 的计算均可成立。",
    rejectionReason: "只验证了公式，尚未测试收入下调、退出倍数收缩和后续稀释的联动影响。",
    instruction: "加入下行情景与稀释假设，重新给出价格边界和最低回报要求。",
    steps: ["建立收入下行情景", "加入后续融资稀释", "压力测试退出倍数", "重算价格与回报边界"],
  },
};

export function getYaojuDemoAgents(agentIds?: string[]) {
  if (!agentIds?.length) return YAOJU_AGENTS;
  const selectedIds = new Set(agentIds);
  const selected = YAOJU_AGENTS.filter((agent) => selectedIds.has(agent.id));
  return selected.length > 0 ? selected : YAOJU_AGENTS;
}

export function pickYaojuDemoAgentSelection(random = Math.random) {
  const shuffledIds = YAOJU_AGENTS.map((agent) => agent.id);
  for (let index = shuffledIds.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffledIds[index], shuffledIds[swapIndex]] = [
      shuffledIds[swapIndex],
      shuffledIds[index],
    ];
  }
  const count = 3 + Math.floor(random() * 4);
  let agentIds = shuffledIds.slice(0, count);

  // The collaboration state is a core part of the forward-looking demo. Keep
  // the selection varied, but guarantee that every run has at least one pair
  // that can visibly collaborate when their corresponding steps are active.
  const hasCollaboratingPair = YAOJU_AGENT_INTERACTIONS.some(
    (interaction) =>
      agentIds.includes(interaction.agentId) &&
      agentIds.includes(interaction.partnerId)
  );
  if (!hasCollaboratingPair) {
    // Finance/legal share a deliberately overlapping mid-run step, so the
    // fallback remains observable instead of selecting a pair whose steps
    // never coincide on the demo's staggered progress curves.
    const interaction = YAOJU_AGENT_INTERACTIONS.find(
      (item) => item.id === "finance-legal-evidence"
    ) ?? YAOJU_AGENT_INTERACTIONS[0];
    const pair = [interaction.agentId, interaction.partnerId];
    const retained = agentIds.filter((id) => !pair.includes(id));
    agentIds = [...pair, ...retained].slice(0, count);
  }
  const reworkAgentId = agentIds[Math.floor(random() * agentIds.length)];
  return { agentIds, reworkAgentId };
}

export function getYaojuAgentReworkPlan(agentId: string) {
  return YAOJU_AGENT_REWORK_PLANS[agentId] ?? YAOJU_AGENT_REWORK_PLANS.market;
}

const clamp = (value: number) => Math.min(100, Math.max(0, Math.round(value)));

export function getYaojuAgentRuntime(
  agentId: string,
  progress: number,
  _legacyReworkAgentId?: string
): YaojuAgentRuntime {
  const index = Math.max(0, YAOJU_AGENTS.findIndex((agent) => agent.id === agentId));
  const agent = YAOJU_AGENTS[index];
  const totalSteps = agent?.steps.length ?? 4;
  const executionStart = YAOJU_DEMO_TIMELINE.strategyEnd;

  if (progress < executionStart) {
    return {
      progress: 0,
      status: "queued",
      statusLabel: progress >= YAOJU_DEMO_TIMELINE.claimsEnd ? "等待派遣" : "等待分派",
      currentTask:
        progress >= YAOJU_DEMO_TIMELINE.claimsEnd
          ? "投资官AI正在确认任务边界与验收标准"
          : "等待投资官AI完成主张地图",
      activeStep: 0,
      completedStepCount: 0,
      totalSteps,
    };
  }

  if (progress < YAOJU_DEMO_TIMELINE.agentsEnd) {
    const available = YAOJU_DEMO_TIMELINE.agentsEnd - executionStart;
    const normalizedProgress = Math.min(
      1,
      Math.max(0, (progress - executionStart) / available)
    );
    // 六个 Agent 同时开始，但用不同推进曲线体现各专业任务的工作量差异。
    const progressExponent = [0.82, 0.9, 1, 1.08, 1.16, 1.24][index] ?? 1;
    const agentProgress = clamp(Math.pow(normalizedProgress, progressExponent) * 100);
    const completedStepCount = Math.min(
      totalSteps,
      Math.floor((agentProgress / 100) * totalSteps)
    );
    const activeStep = Math.min(totalSteps - 1, completedStepCount);
    const inReview = agentProgress >= 96;
    return {
      progress: agentProgress,
      status: inReview ? "review" : "running",
      statusLabel: inReview ? "已提交 · 待验收" : "执行中",
      currentTask: agent?.steps[activeStep] ?? agent?.assignment ?? "正在核验证据并记录来源",
      activeStep,
      completedStepCount,
      totalSteps,
    };
  }

  return {
    progress: 100,
    status: "complete",
    statusLabel: "已完成 · 已验收",
    currentTask: agent?.output ?? "核验结果已回流投资官AI",
    activeStep: Math.max(0, totalSteps - 1),
    completedStepCount: totalSteps,
    totalSteps,
  };
}

export function buildYaojuInvestmentProcess(agentCount = 6): ReportProcessDefinition {
  return {
    kind: "investment-report",
    title: "曜矩智造 · 投前投资分析报告",
    objective:
      "从原始材料的核心主张出发，组织专业研究与独立判断，形成可供投决使用的投资分析报告。",
    phases: [
      {
        id: "intent",
        title: "理解报告与用户动机",
        description: "识别上传材料的结构、原结论和用户真正关心的投资问题。",
        activeText: "正在读取 15 页材料，并判断哪些问题会影响投资决策。",
        completedText: "已识别 14 个章节、原结论“有条件推进”和 4 类分析目标。",
      },
      {
        id: "claims",
        title: "提取主张并建立主张地图",
        description: "把报告片段拆成可分析、可分派、可追溯的主张节点。",
        activeText: "正在从报告原文提取片段，主张节点持续写入右侧证据工作台。",
        completedText: "已从 38 个候选片段中建立 16 项核心主张和 4 个主张分支。",
      },
      {
        id: "strategy",
        title: "制定研究策略",
        description: "投资官AI确定证据标准、研究优先级和统一交付口径。",
        activeText: "正在按主张依赖梳理证据标准、研究优先级和交付口径。",
        completedText: "已确定证据分级标准、研究优先级和统一交付口径。",
      },
      {
        id: "agents",
        title: "选择并派遣子领域 Agent",
        description: "投资官AI按主张与能力匹配选择所需 Agent，派遣任务后由各 Agent 并行检索、复算和分析。",
        activeText: `已选择并派遣 ${agentCount} 个子领域 Agent，正在并行执行 ${agentCount * 4} 个分析步骤；详情将在各自完成后开放。`,
        completedText: `${agentCount} 个子领域 Agent 均已完成所派任务并提交分析结果。`,
      },
      {
        id: "aggregate",
        title: "观点聚合与报告生成",
        description: "让所有证据、反证和专业判断重新汇入投资官AI。",
        activeText: `正在合并 ${agentCount} 路分析结果，形成投资结论、风险等级和交易建议。`,
        completedText: "投资官AI已完成观点聚合，投资分析报告已生成。",
      },
    ],
  };
}

export function buildYaojuCrossValidationProcess(): ReportProcessDefinition {
  return {
    kind: "cross-validation",
    title: "曜矩智造 · 交叉验证报告",
    objective:
      "从上传报告提取可验证主张，并与项目知识库中的尽调、财务、法务及行业材料逐项比对。",
    phases: [
      {
        id: "intent",
        title: "理解报告与验证目标",
        description: "识别报告结构、原结论和需要交叉验证的投资主张。",
        activeText: "正在读取 15 页报告，并定位会影响投决结论的表述。",
        completedText: "已识别报告结构、原结论和 4 类验证目标。",
      },
      {
        id: "claims",
        title: "提取主张并建立主张地图",
        description: "把原文片段拆成可逐项比对、可追溯的主张节点。",
        activeText: "正在从报告原文提取片段，主张节点持续写入右侧证据工作台。",
        completedText: "已从 38 个候选片段中建立 16 项核心主张和 4 个主张分支。",
      },
      {
        id: "compare",
        title: "逐项对照项目知识库",
        description: "每个主张依次检索项目知识库，并记录一致、部分一致、证据不足或存在偏差。",
        activeText: "正在把 16 项主张逐一与项目知识库中的财务、法务、客户和行业材料比对。",
        completedText: "16 项主张已全部完成知识库比对，并形成证据强度与偏差标签。",
      },
      {
        id: "report",
        title: "汇总并生成交叉验证报告",
        description: "汇总所有比对结论、证据缺口和风险影响。",
        activeText: "正在汇总逐项比对结果，生成交叉验证结论和后续核查建议。",
        completedText: "投资官AI已完成结果汇总，交叉验证报告已生成。",
      },
    ],
  };
}

const source = (
  page: number,
  paragraph: string,
  excerpt: string,
  highlight: string[]
): SourceAnchor => ({
  document: YAOJU_DEMO_DOCUMENT_NAME,
  page,
  paragraph,
  excerpt,
  highlight,
});

const buildYaojuCitations = () => [
  source(9, "08 / 财务分析", "2026E 营业收入 222 百万元，同比增长 73%；2025A 已签未确认订单 9,600 万元，约覆盖 2026E 收入的 43%。", ["222", "73%", "9,600", "43%"]),
  source(11, "10 / 估值与回报", "6.80 亿元投前，对应 3.1x 2026E 收入；基准情景为 4.3x MOIC / 44.0% IRR。", ["6.80", "3.1x", "4.3x", "44.0%"]),
  source(8, "07 / 客户与经营", "2025A 付费客户 118 家，Gross Retention 93%，Top 5 收入占比 31%；模拟完成 12 家客户访谈，其中 9 家计划扩容。", ["118", "93%", "31%", "9 家"]),
  source(6, "05 / 产品与技术", "工业缺陷数据资产包含 1,900 万张标注图像；两名前员工贡献代码的职务成果确认函待补签。", ["1,900 万", "两名前员工", "待补签"]),
  source(14, "13 / 尽调计划", "2025Q4 验收集中：42% 年收入在 Q4 确认；需核验 15 笔合同、上线与回款。", ["42%", "15 笔"]),
];

export function buildYaojuInvestmentReportBlock(): AssistantBlock {
  const citations = buildYaojuCitations();
  return {
    kind: "enterprise-analysis",
    reportLabel: "投资分析报告",
    title: "曜矩智造 · 投前投资分析报告",
    summary:
      "投资官AI已完成商业增长、产品技术、客户质量、财务表现、合规风险与估值回报六个维度的独立分析。综合判断为有条件推进，但收入真实性、数据与代码权属应作为交割先决条件，估值需以下行情景作为谈判基准[^1][^2][^4][^5]。",
    overallLevel: "R4",
    dimensions: [
      { key: "market", label: "行业与市场", level: "R3", finding: "工业视觉质检需求明确，但 280.6 亿元 SAM 仍属于情景测算。", recommendation: "以目标产线数量和可验证预算自下而上重算可服务市场。" },
      { key: "product", label: "产品与技术", level: "R3", finding: "模块复用和交付周期改善支持产品化趋势，数据授权边界尚未闭环。", recommendation: "补齐训练数据授权链并完成核心代码权属专项复核。" },
      { key: "customer", label: "客户与增长", level: "R4", finding: "客户扩容方向获得部分支持，但 NRR 与模拟访谈缺少独立台账佐证。", recommendation: "独立回访续费、扩容和流失客户，并核对 ARR 与回款。" },
      { key: "finance", label: "财务与现金流", level: "R4", finding: "2026E 收入增速较高，已签订单仅覆盖预测收入的 43%，且 Q4 确收集中。", recommendation: "交割前完成 Top 合同、验收、发票和回款穿行测试。" },
      { key: "legal", label: "法务与合规", level: "R4", finding: "两名前员工职务成果确认函及存量数据授权仍待补齐。", recommendation: "将代码与数据权属无保留意见写入交割前提。" },
      { key: "valuation", label: "估值与回报", level: "R4", finding: "3.1x 进入倍数算术自洽，但 4.3x MOIC 高度依赖收入兑现与退出倍数。", recommendation: "以下行情景确定价格上限，并设置分期交割与业绩保护。" },
    ],
    highlights: [
      "投资建议：有条件推进，不建议按当前乐观预测无条件投资",
      "价格边界：以下调收入和退出倍数后的回报要求作为谈判基准",
      "交割前提：收入真实性、核心代码权属与训练数据授权全部闭环",
      "投后重点：持续跟踪客户扩容、回款周期和标准产品收入占比",
    ],
    citations,
  };
}

export function buildYaojuValidationReportBlock(): AssistantBlock {
  const citations = buildYaojuCitations();

  const comparisonDetails: Array<FactCompare & { claimId: string }> = [
    {
      claimId: "growth-nrr",
      label: "净收入留存",
      claim: { source: "原报告 P2", value: "NRR 124%" },
      reality: { source: "客户台账 / 回款记录", value: "84% ARR 已形成闭环" },
      delta: "部分一致",
      level: "R3",
      deviationDetail: {
        explanation: "现有客户台账支持扩张趋势，但尚未覆盖全部 ARR，且模拟访谈不能替代独立客户回访。",
        impact: "NRR 是判断软件扩张性和估值溢价的关键指标，证据覆盖不足会降低结论可信度。",
        recommendation: "独立回访续费、扩容和流失客户，并将 ARR 台账与实际回款逐户对齐。",
        evidence: [citations[2]],
      },
    },
    {
      claimId: "growth-customer",
      label: "付费客户数",
      claim: { source: "原报告 P8[^3]", value: "118 家 / 同比 +62%" },
      reality: { source: "CRM / 开票台账", value: "118 家" },
      delta: "一致",
      level: "R2",
    },
    {
      claimId: "growth-expansion",
      label: "客户扩容意愿",
      claim: { source: "原报告 P8[^3]", value: "9 / 12 家计划扩容" },
      reality: { source: "独立客户回访", value: "7 / 10 家明确扩容" },
      delta: "部分一致",
      level: "R3",
    },
    {
      claimId: "growth-dso",
      label: "应收周转天数",
      claim: { source: "原报告 P8", value: "176 天降至 138 天" },
      reality: { source: "应收账龄表复算", value: "139 天" },
      delta: "一致",
      level: "R2",
    },
    {
      claimId: "product-data",
      label: "训练数据资产",
      claim: { source: "原报告 P6[^4]", value: "1,900 万张 / 620 类" },
      reality: { source: "数据授权清单", value: "1,420 万张可追溯" },
      delta: "证据不足",
      level: "R4",
      deviationDetail: {
        explanation: "知识库只能追溯其中 1,420 万张图像的来源与授权范围，其余数据尚无完整授权记录。",
        impact: "数据资产规模和可合法使用范围可能被高估，并直接影响产品壁垒判断。",
        recommendation: "补齐数据来源、客户授权、脱敏方式和使用范围清单后再确认可用数据规模。",
        evidence: [citations[3]],
      },
    },
    {
      claimId: "product-reuse",
      label: "模块复用率",
      claim: { source: "原报告 P4", value: "38% 提升至 71%" },
      reality: { source: "代码仓 / 项目工时", value: "69% - 72%" },
      delta: "一致",
      level: "R2",
    },
    {
      claimId: "product-cycle",
      label: "平均上线周期",
      claim: { source: "原报告 P8", value: "12 周缩短至 5 周" },
      reality: { source: "12 个项目工时记录", value: "中位数 6.5 周" },
      delta: "部分一致",
      level: "R3",
    },
    {
      claimId: "product-workflow",
      label: "系统接入覆盖",
      claim: { source: "原报告 P6", value: "70% 客户接入 MES / QMS" },
      reality: { source: "客户接口清单", value: "仅 9 家可核验" },
      delta: "证据不足",
      level: "R4",
      deviationDetail: {
        explanation: "项目知识库缺少覆盖全部客户的接口清单，现有 9 家样本不足以验证 70% 的总体比例。",
        impact: "无法据此确认产品嵌入深度和客户替换成本。",
        recommendation: "补充全量客户接口、上线验收和持续调用记录，并按付费客户口径重算覆盖率。",
      },
    },
    {
      claimId: "finance-revenue",
      label: "收入预测",
      claim: { source: "原报告 P9[^1]", value: "2026E 2.22 亿元 / +73%" },
      reality: { source: "订单 / 销售管线", value: "支持 1.88 - 2.05 亿元" },
      delta: "部分一致",
      level: "R3",
      deviationDetail: {
        explanation: "已签订单和分阶段销售管线支持增长方向，但不足以完整覆盖 2.22 亿元预测。",
        impact: "收入基数若下调，将同时抬高进入倍数并压低基准回报。",
        recommendation: "穿行核验 Top 20 合同、验收、发票与回款，并重做预测桥接。",
        evidence: [citations[0]],
      },
    },
    {
      claimId: "finance-backlog",
      label: "订单覆盖率",
      claim: { source: "原报告 P9[^1]", value: "9,600 万元 / 覆盖 43%" },
      reality: { source: "合同台账", value: "8,940 万元 / 覆盖 40%" },
      delta: "部分一致",
      level: "R3",
    },
    {
      claimId: "valuation-entry",
      label: "进入倍数",
      claim: { source: "原报告 P11[^2]", value: "3.1x 2026E 收入" },
      reality: { source: "独立估值模型", value: "6.80 / 2.22 = 3.06x" },
      delta: "一致",
      level: "R2",
    },
    {
      claimId: "valuation-return",
      label: "投资回报",
      claim: { source: "原报告 P11[^2]", value: "4.3x MOIC / 44.0% IRR" },
      reality: { source: "含稀释下行情景", value: "2.6x MOIC / 27% IRR" },
      delta: "部分一致",
      level: "R3",
    },
    {
      claimId: "market-size",
      label: "可服务市场",
      claim: { source: "原报告 P5", value: "2030E SAM 280.6 亿元" },
      reality: { source: "行业研报 / 产线模型", value: "口径无法直接对应" },
      delta: "证据不足",
      level: "R4",
      deviationDetail: {
        explanation: "外部行业资料的统计边界与报告中的可服务产线口径不同，无法直接验证 280.6 亿元。",
        impact: "市场空间可能包含当前产品不可服务的行业、产线或软件预算。",
        recommendation: "按目标产线数乘以可验证软件支出，自下而上重算 SAM。",
      },
    },
    {
      claimId: "risk-code",
      label: "前员工权属文件",
      claim: { source: "原报告 P6[^4]", value: "2 人确认函待补签" },
      reality: { source: "法律尽调清单", value: "同为 2 人待补签" },
      delta: "一致",
      level: "R2",
    },
    {
      claimId: "risk-q4",
      label: "Q4 收入集中度",
      claim: { source: "原报告 P14[^5]", value: "全年收入的 42%" },
      reality: { source: "总账 / 验收单复算", value: "全年收入的 46%" },
      delta: "存在偏差",
      level: "R5",
      deviationDetail: {
        explanation: "按总账和验收日期重新归集后，Q4 收入占比为 46%，较报告披露高 4 个百分点。",
        impact: "收入集中确认风险进一步上升，可能影响 2025A 收入质量和 2026E 预测起点。",
        recommendation: "完成 15 笔高风险合同穿行测试，并将核验差异阈值写入交割条件。",
        evidence: [citations[4]],
      },
    },
    {
      claimId: "risk-ip",
      label: "一票否决项",
      claim: { source: "原报告 P15", value: "IP、数据与收入真实性" },
      reality: { source: "项目知识库完整性检查", value: "3 类证据均未闭环" },
      delta: "证据不足",
      level: "R4",
      deviationDetail: {
        explanation: "知识库尚缺完整代码扫描、训练数据授权链和收入穿行测试结果。",
        impact: "现阶段无法排除会改变投资决策的一票否决风险。",
        recommendation: "将三类证据闭环设为交割先决条件，并在缺口消除前保留终止权。",
        evidence: [citations[3], citations[4]],
      },
    },
  ];

  const compareByClaimId = new Map(
    comparisonDetails.map(({ claimId, ...compare }) => [claimId, compare])
  );
  const compares = YAOJU_CLAIMS.map((claim) => {
    const compare = compareByClaimId.get(claim.id);
    if (!compare) {
      throw new Error(`Missing cross-validation result for claim: ${claim.id}`);
    }
    return compare;
  });

  return {
    kind: "fact-verification",
    title: "曜矩智造投前投资分析报告 · 交叉验证",
    level: "R4",
    summary:
      "完成 16 项核心主张核验：5 项一致、6 项部分一致、4 项证据不足、1 项存在偏差。原报告“有条件推进”方向可保留，但收入真实性、数据与代码权属仍应保持为交割先决条件[^1][^4][^5]。",
    compares,
    anchors: citations,
    citations,
  };
}
