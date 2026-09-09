import type {
  ReportProcessDefinition,
  ReportProcessPhase,
} from "@/src/types";

interface ValidationOutcomes {
  consistent: number;
  partial: number;
  insufficient: number;
  inconsistent: number;
}

interface CrossValidationProcessOptions {
  projectName: string;
  documentCount: number;
  claimCount?: number;
  candidateCount?: number;
  outcomes?: ValidationOutcomes;
}

interface InvestmentReportProcessOptions {
  projectName: string;
  documentCount: number;
}

interface ChallengeProcessOptions extends InvestmentReportProcessOptions {
  /** 质询结果中最终输出的核心矛盾数量。 */
  challengeCount?: number;
}

function deriveOutcomes(total: number): ValidationOutcomes {
  const consistent = Math.round(total * 0.125);
  const partial = Math.round(total * 0.2125);
  const inconsistent = Math.round(total * 0.1);
  return {
    consistent,
    partial,
    inconsistent,
    insufficient: Math.max(0, total - consistent - partial - inconsistent),
  };
}

export function buildCrossValidationProcess({
  projectName,
  documentCount,
  claimCount = 80,
  candidateCount = Math.max(claimCount, Math.round(claimCount * 1.55)),
  outcomes = deriveOutcomes(claimCount),
}: CrossValidationProcessOptions): ReportProcessDefinition {
  const phases: ReportProcessPhase[] = [
    {
      id: "read",
      title: "读懂原报告与补充材料",
      description: "确认需要审查的报告、补充材料和研究边界。",
      activeText: "正在按章节读取材料，并定位表格、关键数字和原始结论。",
      completedText: `已完成 ${documentCount} 份材料的章节与关键数据索引。`,
      metrics: [
        { label: "已接入材料", value: `${documentCount} 份` },
        { label: "索引方式", value: "章节 + 页码" },
      ],
    },
    {
      id: "claims",
      title: "找出需要核验的主张",
      description: "把原报告中的叙述拆成可以逐条核对的判断。",
      activeText: "正在合并重复表述，并按是否可能影响投资决策排序。",
      completedText: `从 ${candidateCount} 条候选表述中整理出 ${claimCount} 项核心核验任务。`,
      metrics: [
        { label: "初步识别", value: `${candidateCount} 条` },
        { label: "合并后", value: `${claimCount} 项` },
      ],
    },
    {
      id: "valuation",
      title: "独立重算财务与估值",
      description: "不直接接受原报告数字，独立检查关键计算和口径。",
      activeText: "正在重算增长率、利润率、估值倍数、稀释和敏感性。",
      completedText: "已完成关键财务指标、估值口径与下行情景的独立复算。",
      workstreams: [
        { label: "增长与利润率", status: "running", result: "期间与计算口径已核对" },
        { label: "估值倍数", status: "running", result: "PS / PE 与可比口径已复算" },
        { label: "下行情景", status: "queued", result: "业绩与退出敏感性已检查" },
      ],
    },
    {
      id: "evidence",
      title: "逐项寻找支持与反证",
      description: "为每项主张寻找支持证据、反向证据和口径差异。",
      activeText: `正在并行核验 ${claimCount} 项主张，并持续补充证据来源。`,
      completedText: `已完成 ${claimCount} 项主张的证据比对与来源留存。`,
      metrics: [
        { label: "核验任务", value: `${claimCount} 项` },
        { label: "并行处理", value: "10 路" },
      ],
      workstreams: [
        { label: "财务与经营数据", status: "running", result: "收入、现金流与回款证据已归档" },
        { label: "交易条款与合规", status: "running", result: "权属、条款与合规材料已核对" },
        { label: "市场、客户与竞争", status: "running", result: "市场规模、客户与竞争证据已整理" },
      ],
    },
    {
      id: "critique",
      title: "对照原结论并反向质疑",
      description: "判断新证据是否会削弱或改变原投资判断。",
      activeText: "正在从投委会、尽调审查和财务负责人视角挑战薄弱结论。",
      completedText: `已完成结论对照：一致 ${outcomes.consistent} 项，部分一致 ${outcomes.partial} 项，证据不足 ${outcomes.insufficient} 项，不一致 ${outcomes.inconsistent} 项。`,
      metrics: [
        { label: "一致", value: `${outcomes.consistent}`, tone: "positive" },
        { label: "部分一致", value: `${outcomes.partial}`, tone: "warning" },
        { label: "证据不足", value: `${outcomes.insufficient}`, tone: "neutral" },
        { label: "不一致", value: `${outcomes.inconsistent}`, tone: "danger" },
      ],
    },
    {
      id: "quality",
      title: "质量检查与生成报告",
      description: "逐条检查结论、证据、风险等级和来源是否完整。",
      activeText: "正在检查核验结论是否有证据支撑，并整理报告结构。",
      completedText: "质量检查已通过，主张核验矩阵与交叉验证报告已生成。",
      metrics: [
        { label: "核验覆盖", value: `${claimCount} / ${claimCount}` },
        { label: "来源追溯", value: "已保留" },
        { label: "报告状态", value: "已生成", tone: "positive" },
      ],
    },
  ];

  return {
    kind: "cross-validation",
    title: `${projectName} · 交叉验证报告`,
    objective: "独立核验原报告中的关键主张，判断发现的问题是否会影响原投资结论。",
    phases,
  };
}

export function buildInvestmentReportProcess({
  projectName,
  documentCount,
}: InvestmentReportProcessOptions): ReportProcessDefinition {
  const phases: ReportProcessPhase[] = [
    {
      id: "read",
      title: "读懂项目与交易材料",
      description: "识别公司、产品、商业模式、交易结构和研究边界。",
      activeText: "正在读取项目材料，并建立公司、交易、行业和关键数据索引。",
      completedText: `已完成 ${documentCount} 份材料索引，明确公司、交易与研究边界。`,
      metrics: [
        { label: "已接入材料", value: `${documentCount} 份` },
        { label: "研究边界", value: "公司 + 交易 + 行业" },
      ],
    },
    {
      id: "questions",
      title: "明确投资问题与初步判断",
      description: "把项目转化为需要回答的投资问题和待补证据。",
      activeText: "正在按决策影响度拆解研究问题，并形成初步投资假设。",
      completedText: "已形成初步投资假设、6 个重点课题和待补材料清单。",
      metrics: [
        { label: "重点课题", value: "6 个" },
        { label: "优先级", value: "估值与增长质量" },
      ],
      workstreams: [
        { label: "市场是否真实", status: "complete", result: "行业来源与客户需求已核验" },
        { label: "增长是否可持续", status: "running", result: "收入质量与留存假设已复核" },
        { label: "价格是否合理", status: "queued", result: "价格边界与保护条款已列入检查" },
      ],
    },
    {
      id: "valuation",
      title: "建立独立估值区间",
      description: "从经营预测与可比公司出发，明确价格边界和关键假设。",
      activeText: "正在用多种方法独立估值，并测算业绩、稀释和退出情景。",
      completedText: "已完成 PS / PE、DCF 与 VC 倒算，形成基准及下行价格区间。",
      workstreams: [
        { label: "PS / PE 可比估值", status: "running", result: "可比公司倍数已整理" },
        { label: "现金流估值", status: "running", result: "现金流口径与预测已复算" },
        { label: "VC 回报倒算", status: "running", result: "退出、稀释与回报要求已测算" },
        { label: "下行情景", status: "queued", result: "收入下调与倍数收缩已设定" },
      ],
    },
    {
      id: "research",
      title: "分专题开展外部研究",
      description: "对行业、竞争、客户、财务、监管和退出路径逐项研究。",
      activeText: "多个研究课题正在并行取证，并对相互冲突的信息继续追查。",
      completedText: "已完成行业、竞争、客户、估值、监管与退出路径的专题研究。",
      metrics: [
        { label: "并行课题", value: "5 个" },
        { label: "证据要求", value: "至少 2 个独立来源" },
      ],
      workstreams: [
        { label: "市场规模与竞争格局", status: "running", result: "核对行业规模与主要厂商" },
        { label: "可比公司与交易案例", status: "running", result: "更新 PS / PE 与近期案例" },
        { label: "上市与退出路径", status: "running", result: "核对实际案例与门槛" },
        { label: "技术替代与客户预算", status: "queued", result: "检验增长与壁垒" },
      ],
    },
    {
      id: "synthesis",
      title: "形成投资判断并做压力测试",
      description: "综合事实与假设形成投资逻辑，再从失败场景反向攻击。",
      activeText: "正在检验最脆弱前提，并模拟收入不达预期、客户流失和估值收缩。",
      completedText: "已形成核心投资逻辑，并完成关键人、客户、业绩与退出四类压力测试。",
      workstreams: [
        { label: "业绩不达预期", status: "running", result: "收入与利润下行情景已运行" },
        { label: "核心客户流失", status: "running", result: "客户集中度与续费压力已测试" },
        { label: "估值倍数收缩", status: "running", result: "退出倍数敏感性已测算" },
        { label: "IPO 推迟或失败", status: "running", result: "退出路径延迟影响已评估" },
      ],
    },
    {
      id: "quality",
      title: "质量检查与生成报告",
      description: "区分事实、分析与假设，检查结论是否形成完整证据链。",
      activeText: "正在检查投资建议、前提条件、风险与证据是否闭环。",
      completedText: "质量检查已通过，投资建议、价格边界与失败场景已写入报告。",
      metrics: [
        { label: "研究阶段", value: "6 / 6" },
        { label: "事实与假设", value: "已区分" },
        { label: "报告状态", value: "已生成", tone: "positive" },
      ],
    },
  ];

  return {
    kind: "investment-report",
    title: `${projectName} · 投资分析报告`,
    objective: "从项目材料和外部证据出发，回答是否值得投、什么条件下值得投、最可能错在哪里。",
    phases,
  };
}

/**
 * 挑战质询主题的演示流程。挑战结果不是投资分析报告的别名，使用独立
 * 的阶段和标题，便于历史子话题回看完整的质询过程。
 */
export function buildChallengeProcess({
  projectName,
  documentCount,
  challengeCount = 3,
}: ChallengeProcessOptions): ReportProcessDefinition {
  const phases: ReportProcessPhase[] = [
    {
      id: "scope",
      title: "理解质询目标与证据边界",
      description: "确认用户要挑战的投资逻辑、材料范围和风险偏好。",
      activeText: "正在读取相关材料，并锁定会改变交易结论的关键假设。",
      completedText: `已完成 ${documentCount} 份材料索引，明确质询范围与证据边界。`,
      metrics: [
        { label: "已接入材料", value: `${documentCount} 份` },
        { label: "质询视角", value: "投委会 + 专业复核" },
      ],
      workstreams: [
        { label: "原报告结论", status: "complete", result: "原结论与关键依据已标记" },
        { label: "风险偏好", status: "complete", result: "按项目风险档位设定质询强度" },
      ],
    },
    {
      id: "thesis",
      title: "拆解核心投资逻辑",
      description: "把投资叙事拆成可被证据支持或推翻的假设。",
      activeText: "正在拆解增长、产品、团队和估值之间的因果链。",
      completedText: "已整理核心假设、依赖关系和需要优先验证的矛盾点。",
      metrics: [
        { label: "核心假设", value: "4 个" },
        { label: "优先风险", value: "R3 – R4" },
      ],
      workstreams: [
        { label: "增长质量", status: "complete", result: "收入兑现与客户扩容假设已拆解" },
        { label: "产品与团队匹配", status: "complete", result: "平台化执行前提已列出" },
        { label: "价格与回报", status: "complete", result: "估值倍数与退出依赖已标记" },
      ],
    },
    {
      id: "contradictions",
      title: "寻找矛盾与失败路径",
      description: "从反例和下行情景出发，检验假设是否能经受压力。",
      activeText: "正在比对议案、BP 与尽调材料，定位叙事与经营证据的冲突。",
      completedText: "已识别核心矛盾，并完成收入、客户、成本和执行四类失败路径测试。",
      workstreams: [
        { label: "叙事与经营数据", status: "complete", result: "增长叙事与底稿口径已对照" },
        { label: "平台化与定制化", status: "complete", result: "产品收入结构的错配风险已确认" },
        { label: "成本与毛利", status: "complete", result: "模型成本敏感性已测算" },
      ],
    },
    {
      id: "protections",
      title: "形成风险排序与条款建议",
      description: "按对交易结论的影响程度排序风险，并给出可执行的保护措施。",
      activeText: "正在把高影响风险转译为交割条件、回购和信息权建议。",
      completedText: "已完成风险排序，并为每项高影响风险配置条款或补证动作。",
      metrics: [
        { label: "高影响风险", value: "3 项", tone: "warning" },
        { label: "条款建议", value: "6 条" },
      ],
      workstreams: [
        { label: "交割前提", status: "complete", result: "收入与权属闭环列为先决条件" },
        { label: "业绩保护", status: "complete", result: "回购与补偿触发线已拟定" },
        { label: "投后治理", status: "complete", result: "关键岗位与信息权建议已整理" },
      ],
    },
    {
      id: "quality",
      title: "质量检查与生成质询清单",
      description: "检查每条质询是否有证据、风险等级和明确的下一步动作。",
      activeText: "正在检查质询依据、风险等级和条款建议是否形成闭环。",
      completedText: "质量检查已通过，核心矛盾、证据锚点与条款建议已生成。",
      metrics: [
        { label: "核心矛盾", value: `${challengeCount} 条` },
        { label: "证据锚点", value: "已保留" },
        { label: "输出状态", value: "已生成", tone: "positive" },
      ],
    },
  ];

  return {
    kind: "challenge",
    title: `${projectName} · 挑战质询过程`,
    objective: "围绕投资逻辑、关键假设与执行风险进行反向验证，并形成可执行的投决质询与条款建议。",
    phases,
  };
}

/** 估值平行测算主题的演示流程，参数提交后随 follow-up 结果一起展示。 */
export function buildValuationProcess({
  projectName,
  documentCount,
}: InvestmentReportProcessOptions): ReportProcessDefinition {
  const phases: ReportProcessPhase[] = [
    {
      id: "inputs",
      title: "读取估值输入与交易条件",
      description: "确认收入预测、当前价格、融资结构和退出假设。",
      activeText: "正在读取财务预测、交易条款和可比公司数据。",
      completedText: `已完成 ${documentCount} 份材料中的估值输入索引，并标记缺失参数。`,
      metrics: [
        { label: "已接入材料", value: `${documentCount} 份` },
        { label: "估值口径", value: "PS + VC + PTA" },
      ],
      workstreams: [
        { label: "收入预测", status: "complete", result: "NTM 收入与增长率已锁定" },
        { label: "交易结构", status: "complete", result: "投前估值与稀释条件已整理" },
      ],
    },
    {
      id: "normalize",
      title: "统一财务与稀释口径",
      description: "把不同材料中的收入、净现金、持股和稀释定义统一到同一基准。",
      activeText: "正在对齐收入基数、净现金、持股比例和预期退出年限。",
      completedText: "已统一收入、稀释和退出时间口径，完成关键参数校验。",
      metrics: [
        { label: "关键参数", value: "8 项" },
        { label: "口径差异", value: "2 处已处理" },
      ],
      workstreams: [
        { label: "收入与现金流", status: "complete", result: "预测期间与确认口径已统一" },
        { label: "稀释与持股", status: "complete", result: "未来融资稀释已纳入模型" },
        { label: "退出年限", status: "complete", result: "基准持有期参数已确认" },
      ],
    },
    {
      id: "methods",
      title: "运行多种估值方法",
      description: "分别运行 PS 对比、VC 倒算和交易案例法，避免单一方法决定结论。",
      activeText: "正在并行运行 PS、VC 倒算和 PTA 三种估值方法。",
      completedText: "三种估值方法均已完成，并保留各自的假设、区间和适用条件。",
      workstreams: [
        { label: "VC 倒算法", status: "complete", result: "回报要求与退出倍数已反推" },
        { label: "PS 对比法", status: "complete", result: "可比公司区间已计算" },
        { label: "交易案例法", status: "complete", result: "近期交易案例区间已计算" },
      ],
    },
    {
      id: "stress",
      title: "压力测试回报与价格边界",
      description: "检验收入下调、退出倍数收缩和后续稀释对回报的联动影响。",
      activeText: "正在运行收入、退出倍数和稀释变化的下行情景。",
      completedText: "已完成基准、下行和极端三档情景的回报敏感性测试。",
      metrics: [
        { label: "测试情景", value: "3 档" },
        { label: "最低回报", value: "已校验", tone: "warning" },
      ],
      workstreams: [
        { label: "收入下调", status: "complete", result: "收入兑现不足情景已运行" },
        { label: "倍数收缩", status: "complete", result: "退出 PS 收缩影响已量化" },
        { label: "后续稀释", status: "complete", result: "持股变化对 MOIC 的影响已量化" },
      ],
    },
    {
      id: "range",
      title: "汇总估值区间与假设",
      description: "汇总各方法结果，明确综合区间、关键假设和需要补充的参数。",
      activeText: "正在合并估值区间，并整理影响价格判断的关键假设。",
      completedText: "估值区间与方法差异已汇总，关键假设和待补证据已列明。",
      metrics: [
        { label: "独立方法", value: "3 种" },
        { label: "综合区间", value: "已形成" },
        { label: "输出状态", value: "已生成", tone: "positive" },
      ],
    },
  ];

  return {
    kind: "valuation",
    title: `${projectName} · 估值平行测算过程`,
    objective: "用多种方法独立测算估值区间，明确关键假设、回报边界和需要补充的参数。",
    phases,
  };
}

export function getReportProcessPhaseIndex(progress: number, phaseCount: number) {
  if (phaseCount <= 1) return 0;
  if (progress >= 100) return phaseCount - 1;
  return Math.min(
    phaseCount - 1,
    Math.floor((Math.max(0, progress) / 100) * phaseCount)
  );
}
