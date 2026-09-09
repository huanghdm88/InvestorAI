import type { Locale } from "@/src/lib/i18n";
import {
  YAOJU_AGENTS,
  type YaojuAgentRuntime,
  type YaojuClaimNode,
  type YaojuDemoAgent,
} from "@/src/data/yaoju-validation-demo";
import type {
  AssistantBlock,
  ChallengeItem,
  ChatMessage,
  Conversation,
  DiligenceContent,
  FactCompare,
  KnowledgeFile,
  Project,
  ReportProcessDefinition,
  ReportProcessPhase,
  RunningTask,
  SourceAnchor,
  VerificationCategory,
  VerificationVerdict,
} from "@/src/types";

const HAN_RE = /[\p{Script=Han}]/u;

const projectNames: Record<string, string> = {
  "proj-aurora": "Aurora Compute · Pre-A",
  "proj-helios": "Helios Semiconductor · Series B",
  "proj-haizhi": "Haizhi Technology · Series D",
  "proj-sifanshi": "4Paradigm · Series B",
  "proj-ocean": "OceanBlue Intelligent SaaS · Series A+",
  "proj-nebula": "Nebula Biopharma · Pre-A",
};

const projectIndustries: Record<string, string> = {
  "AI · Agent 应用": "AI · Agent Applications",
  "TMT · 半导体设计": "TMT · Semiconductor Design",
  "数据智能 · 图数据库 / 知识图谱":
    "Data Intelligence · Graph Databases / Knowledge Graphs",
  "AI · 企业级 AutoML / 决策系统":
    "AI · Enterprise AutoML / Decision Systems",
  "SaaS · 行业 AI": "SaaS · Vertical AI",
  "医疗 · 创新药": "Healthcare · Innovative Drugs",
};

const projectInstructions: Record<string, string> = {
  "proj-aurora":
    "Focus on verified order conversion for the enterprise IT operations Agent, and on the share of unit economics consumed by foundation-model API calls.",
  "proj-helios":
    "As a state-backed fund, focus on tape-out economics, yield ramp evidence, and reliance on restricted EDA vendors and foundries.",
  "proj-haizhi":
    "Validate 2024E revenue and profit, especially Q4 concentration; review receivables, inventory, repurchase rights, IPO compliance cleanup, and the sensitivity of the RMB 2.95 billion pre-money valuation.",
  "proj-sifanshi":
    "Reconcile the investment memo with financial and legal diligence, focusing on tax, control, VIE and ICP compliance, financing amounts, contract periods, and entity-level inconsistencies.",
  "proj-nebula":
    "Validate the PD-1/VEGF bispecific pipeline data and cash runway using the FDD workbook and clinical-study reports.",
};

const conversationTitles: Record<string, string> = {
  "conv-aurora-fact": "Revenue and Cash Flow Cross-Validation",
  "conv-aurora-challenge-pending": "Team Fit and Strategic Feasibility Review",
  "conv-aurora-route": "Overall Project Assessment",
  "conv-aurora-challenge": "Core Investment Thesis Challenge",
  "conv-aurora-valuation": "Independent Valuation Range",
  "conv-nebula-aborted": "Initial Document Review",
  "conv-haizhi-review": "Independent Investment Review",
  "conv-haizhi-validation": "Investment Report Cross-Validation",
  "conv-sifanshi-cross-check": "Investment Memo vs. Diligence Review",
  "conv-sifanshi-validation": "Investment Memo Cross-Validation",
};

const exactText: Record<string, string> = {
  新对话: "New conversation",
  当前项目: "Current project",
  曜矩智造投资分析: "Yaoju Manufacturing Investment Analysis",
  曜矩智造交叉验证: "Yaoju Manufacturing Cross-Validation",
  挑战质询任务: "Challenge review task",
  投资分析报告: "Investment Analysis Report",
  事实交叉验证任务: "Cross-validation task",
  一致: "Consistent",
  部分一致: "Partially consistent",
  不一致: "Inconsistent",
  证据不足: "Insufficient evidence",
  存在偏差: "Discrepancy found",
  已完成: "Completed",
  处理中: "Processing",
  执行中: "In progress",
  等待派遣: "Awaiting dispatch",
  等待分派: "Awaiting assignment",
  "已提交 · 待验收": "Submitted · Pending review",
  "已完成 · 已验收": "Completed · Accepted",
  "投决文档交叉验证报告\n\n已完成投决文档交叉验证核查。":
    "Investment document cross-validation report\n\nThe cross-validation review is complete.",
  "对议案宣称的营收与经营性现金流做事实交叉验证。":
    "Cross-check the revenue and operating cash flow stated in the investment memo.",
  "这个项目整体怎么样？帮我看看。":
    "Please give me an overall assessment of this project.",
  "请输出该项目的核心投资逻辑挑战质询清单。":
    "Create a challenge review of the project's core investment thesis.",
  "估值合理性怎么样？请给出区间，不需要推荐数。":
    "Is the valuation reasonable? Provide a range rather than a single recommended figure.",
  "请围绕团队基因匹配度（销售型团队做底层 Agent 平台）做一轮深度挑战质询，输出 3–5 条核心矛盾与条款建议。":
    "Challenge whether a sales-led team can execute an infrastructure Agent platform strategy. Identify three to five core tensions and propose deal protections.",
  "对投资备忘录的内容进行事实交叉验证":
    "Cross-validate the claims in the investment memo.",
  帮我检查投决报告: "Review the investment committee report.",
  "项目知识库逐项比对": "Project Knowledge Base Comparison",
  "理解报告": "Understand Report",
  "主张地图": "Claim Map",
  "编排策略": "Research Strategy",
  "Agent 执行": "Agent Execution",
  "聚合报告": "Aggregate Report",
  "知识库比对": "Knowledge Base Comparison",
  "生成报告": "Generate Report",
  "报告解析": "Report Review",
  "Agent 协作": "Agent Collaboration",
  "证据聚合": "Evidence Synthesis",
  "挑战质询过程": "Challenge Review Process",
  "估值平行测算过程": "Parallel Valuation Process",
  "分析完成": "Analysis complete",
  "分析中": "Analysis in progress",
  "当前任务": "Current task",
  "验收标准": "Acceptance criteria",
  "执行步骤": "Execution steps",
  "负责的主张节点": "Assigned claim nodes",
  "工作记录": "Work log",
  "实时追加": "Updated live",
  "提交给投资官AI的结论": "Conclusion submitted to Investor AI",
  "投资官AI正在确认任务边界与验收标准":
    "Investor AI is confirming scope and acceptance criteria",
  "等待投资官AI完成主张地图":
    "Waiting for Investor AI to complete the claim map",
  "正在核验证据并记录来源": "Verifying evidence and recording sources",
  "核验结果已回流投资官AI": "Results returned to Investor AI",
  "营收与经营性现金流交叉验证": "Revenue and Operating Cash Flow Cross-Validation",
  "2024 全年营收": "2024 Full-Year Revenue",
  "2024 经营性现金流净额": "2024 Operating Cash Flow",
  "投后估值（B 轮基础上）": "Post-Money Valuation (Series B)",
  "极光智算 Pre-A 轮": "Aurora Compute · Pre-A",
  "FDD 底稿 · 附注 4": "FDD Workbook · Note 4",
  "增资协议原件 · P3": "Executed Capital Increase Agreement · P3",
  "灵魂质询清单（4 条 · 已按 R2 稳健均衡型口径过滤）": "Core Investment Thesis Challenge · 4 Issues · R2 Balanced Standard",
  "估值平行测算（已使用 VC 倒算 + PS 对比 + PTA 三种方法）": "Parallel Valuation · VC Backsolve + PS Comparables + PTA",
  "缺失关键参数：预计未来稀释比例": "Required input missing: expected future dilution",
  "VC 倒算法（IRR 反向测算）必须使用，当前材料中未找到「退出前本轮股权稀释比例」披露，触发阻断式反问。":
    "The venture-capital backsolve requires an exit dilution assumption, but the uploaded materials do not disclose the expected ownership dilution before exit. Please provide it before the valuation analysis continues.",
  "预计未来稀释比例（%）": "Expected future dilution (%)",
  "若 BP 表述「稀释到 X%」（留存率），系统会自动换算为 100% − X%":
    "If the business plan states that ownership will be diluted to X% (retained ownership), the system will convert it to 100% − X%.",
  "目标 IRR（%）": "Target IRR (%)",
  "默认 15%（基准）；激进档位可上调至 20–25%":
    "Default: 15% for the base case. An aggressive return target may use 20%–25%.",
  "预期退出年限（年）": "Expected holding period (years)",
  "默认 5 年": "Default: 5 years",
  "Agent 暂时无法判断该问题适合哪类能力": "Investor AI needs you to choose the appropriate review mode",
  "您的问题表述较宽泛，Agent 智能路由无法在「事实交叉验证」与「挑战质询」之间做出可靠判断，请手动选择一项继续，后续将延续您的选择。":
    "Your question is broad enough to support either a factual cross-validation or an investment-thesis challenge. Choose one review mode to continue, and Investor AI will retain that choice for the conversation.",
  "核对议案、BP、FDD、审计报告中的关键数字与口径是否一致，输出差异清单与证据锚点":
    "Reconcile key figures and definitions across the investment memo, business plan, FDD, and audit report, then produce a discrepancy list with source anchors.",
  "围绕投资逻辑、关键假设与执行风险生成投决会式质询清单与条款建议":
    "Challenge the investment thesis, key assumptions, and execution risks, then propose investment-committee questions and deal protections.",
  "首批资料解析": "Initial Document Review",
  "团队基因与战略可行性挑战": "Team Fit and Strategic Feasibility Review",
  "附表 3-人员": "Appendix 3 · Personnel",
  "Sheet · UE 测算": "Sheet · Unit Economics",
  "2024 年度审计报告（含合并 / 单体）":
    "2024 Audit Report (Consolidated and Standalone)",
  "FDD 财务底稿（含口径调节表）":
    "FDD Financial Workbook (Including Reconciliation Schedules)",
  "投决议案 / IM（含估值与定价章节）":
    "Investment Committee Memo / IM (Including Valuation and Pricing)",
  "法律尽调备忘 LDD（含股权结构 / 重大合同）":
    "Legal Due Diligence Memorandum (Ownership Structure and Material Contracts)",
  "缺审计无法验证营收 / 现金流真实性，事实交叉验证模块将完全失效。":
    "Without an audit report, revenue and cash flow cannot be verified and factual cross-validation cannot run reliably.",
  "FDD 是估值平行测算与对赌条款建议的最低输入，缺则估值模块无法运行。":
    "The FDD workbook is the minimum input for parallel valuation and performance-protection terms. The valuation module cannot run without it.",
  "议案是 Agent 的「对照基线」，缺则只能基于 BP 表述自说自话，会降低挑战质询的针对性。":
    "The investment memo is the review baseline. Without it, Investor AI can only assess management's business-plan narrative, reducing the precision of challenge questions.",
  "缺则无法判断对赌 / 反稀释 / 优先清算等条款的合规风险敞口，可在后续补传。":
    "Without legal diligence, Investor AI cannot assess compliance exposure in performance guarantees, anti-dilution rights, or liquidation preferences. This document may be added later.",
  "请补传以上 R5 / R4 资料后，Agent 会自动重启解析并恢复全部分析能力":
    "Upload the R5 and R4 materials listed above. Investor AI will restart document review automatically and restore the full analysis workflow.",
  "如暂无审计报告，可先用「FDD 底稿 + 主合同」组合作为最小可行输入":
    "If the audit report is not yet available, use the FDD workbook plus principal customer contracts as the minimum viable evidence set.",
  "如确需仅基于 BP 做行业判断，请通过下方「快速上传」按钮明确告知 Agent 切换为「轻分析模式」":
    "If an industry-only view based on the business plan is sufficient, use the upload area below and instruct Investor AI to switch to a limited-scope analysis.",
  "附注 4": "Note 4",
  "三、财务摘要 / (1) 收入": "III. Financial Summary / (1) Revenue",
  "三、财务摘要 / (3) 现金流": "III. Financial Summary / (3) Cash Flow",
  "经营活动产生的现金流量净额（单体加总）":
    "Net Cash from Operating Activities (Sum of Standalone Entities)",
  "经审计的合并利润表": "Audited Consolidated Income Statement",
  "本轮融资概览": "Financing Round Overview",
  "第二条 估值条款": "Article 2 · Valuation Terms",
  "2024 全年实现营业收入 1.82 亿元，较上一年度同比增长 36.8%。":
    "Full-year 2024 revenue was RMB 182 million, up 36.8% year over year.",
  "本年度公司实现营业总收入 17,887 万元（折合 1.79 亿元），同比增长 34.5%。":
    "Audited 2024 revenue was RMB 178.87 million, up 34.5% year over year.",
  "公司 2024 年度经营性现金流净额为 +2,840 万元，较上一年度同比改善约 27%。":
    "Net operating cash flow in 2024 was RMB 28.4 million, an improvement of approximately 27% year over year.",
  "母公司 1,902 万 + 全资子公司 A 396 万 + 全资子公司 B 117 万 = 2,415 万元；与合并报表披露的 2,840 万存在 425 万差异，未在附注中说明调节项。":
    "The parent company (RMB 19.02 million), wholly owned subsidiary A (RMB 3.96 million), and subsidiary B (RMB 1.17 million) total RMB 24.15 million. This is RMB 4.25 million below the consolidated figure of RMB 28.4 million, with no reconciliation in the notes.",
  "本轮拟按投前估值人民币 12.6 亿元定价，对应 PS 6×。":
    "The round is priced at a RMB 1.26 billion pre-money valuation, equivalent to 6.0x revenue.",
  "各方一致同意以投前估值人民币 12.6 亿元（含已转可转债转股）为基础进行本轮增资。":
    "The parties agreed to complete the financing at a RMB 1.26 billion pre-money valuation, including converted convertible notes.",
  "研究阶段": "Research stages",
  "事实与假设": "Facts vs. assumptions",
  "报告状态": "Report status",
  "已区分": "Separated",
  "已生成": "Generated",
  "已接入材料": "Documents received",
  "质询视角": "Challenge lens",
  "投委会 + 专业复核": "Investment Committee + Specialist Review",
  "核心假设": "Core assumptions",
  "优先风险": "Priority risks",
  "高影响风险": "High-impact risks",
  "条款建议": "Deal protections",
  "核心矛盾": "Core tensions",
  "证据锚点": "Evidence anchors",
  "输出状态": "Output status",
  "原报告结论": "Source conclusion",
  "风险偏好": "Risk appetite",
  "增长质量": "Growth quality",
  "产品与团队匹配": "Product–team fit",
  "价格与回报": "Price and returns",
  "叙事与经营数据": "Narrative vs. operating data",
  "平台化与定制化": "Platformization vs. customization",
  "成本与毛利": "Cost and gross margin",
  "交割前提": "Closing conditions",
  "业绩保护": "Performance protection",
  "投后治理": "Post-investment governance",
  "估值口径": "Valuation basis",
  "PS + VC + PTA": "PS + VC + PTA",
  "关键参数": "Key parameters",
  "口径差异": "Definition differences",
  "测试情景": "Test scenarios",
  "最低回报": "Minimum return",
  "独立方法": "Independent methods",
  "综合区间": "Blended range",
  "收入预测": "Revenue forecast",
  "交易结构": "Transaction structure",
  "收入与现金流": "Revenue and cash flow",
  "稀释与持股": "Dilution and ownership",
  "退出年限": "Exit horizon",
  "VC 倒算法": "VC backsolve",
  "PS 对比法": "PS comparables",
  "交易案例法": "Precedent transactions",
  "收入下调": "Revenue downside",
  "倍数收缩": "Multiple compression",
  "后续稀释": "Future dilution",
  "已保留": "Retained",
  "已形成": "Formed",
  "已校验": "Validated",
  "4 个": "4 items",
  "3 项": "3 items",
  "6 条": "6 deal protections",
  "3 条": "3 tensions",
  "8 项": "8 parameters",
  "2 处已处理": "2 differences resolved",
  "3 档": "3 scenarios",
  "3 种": "3 methods",
  "研究边界": "Research scope",
  "公司 + 交易 + 行业": "Company + Transaction + Industry",
  "重点课题": "Priority workstreams",
  "优先级": "Priority",
  "估值与增长质量": "Valuation and growth quality",
  "并行课题": "Parallel workstreams",
  "证据要求": "Evidence standard",
  "至少 2 个独立来源": "At least two independent sources",
  "市场是否真实": "Is the addressable market real?",
  "增长是否可持续": "Is growth sustainable?",
  "价格是否合理": "Is the price reasonable?",
  "PS / PE 可比估值": "PS / PE comparables",
  "现金流估值": "Cash flow valuation",
  "VC 回报倒算": "Venture-return backsolve",
  "下行情景": "Downside scenarios",
  "市场规模与竞争格局": "Market size and competitive landscape",
  "可比公司与交易案例": "Public comparables and precedent transactions",
  "上市与退出路径": "IPO and exit paths",
  "技术替代与客户预算": "Technology substitution and customer budgets",
  "核对行业规模与主要厂商": "Validate market size and leading vendors",
  "更新 PS / PE 与近期案例": "Update PS / PE benchmarks and recent transactions",
  "核对实际案例与门槛": "Validate actual precedents and requirements",
  "检验增长与壁垒": "Test growth quality and defensibility",
  "业绩不达预期": "Performance below plan",
  "核心客户流失": "Loss of a core customer",
  "估值倍数收缩": "Valuation multiple compression",
  "IPO 推迟或失败": "IPO delay or failure",
  "投资建议：有条件推进，不建议按现有乐观假设无条件投资":
    "Recommendation: proceed with conditions; do not invest unconditionally on the current optimistic assumptions.",
  "价格原则：以独立估值的下行区间作为谈判起点":
    "Pricing: use the downside end of the independent valuation range as the negotiation starting point.",
  "交割前提：重点客户验收回款、核心财务口径与重大合规事项闭合":
    "Closing conditions: verify acceptance and collection from key customers, reconcile core financial definitions, and resolve material compliance matters.",
  "最可能失败原因：增长未从项目驱动转化为可复制的产品化增长":
    "Most likely failure mode: growth remains project-driven and does not become a repeatable product-led model.",
  "08 / 财务分析": "08 / Financial Analysis",
  "10 / 估值与回报": "10 / Valuation and Returns",
  "07 / 客户与经营": "07 / Customers and Operations",
  "05 / 产品与技术": "05 / Product and Technology",
  "13 / 尽调计划": "13 / Diligence Plan",
  "2026E 营业收入 222 百万元，同比增长 73%；2025A 已签未确认订单 9,600 万元，约覆盖 2026E 收入的 43%。":
    "2026E revenue is RMB 222 million, up 73% YoY. Signed but unrecognized 2025A orders total RMB 96 million, covering approximately 43% of 2026E revenue.",
  "6.80 亿元投前，对应 3.1x 2026E 收入；基准情景为 4.3x MOIC / 44.0% IRR。":
    "The RMB 680 million pre-money valuation equals 3.1x 2026E revenue. The base case produces 4.3x MOIC and 44.0% IRR.",
  "2025A 付费客户 118 家，Gross Retention 93%，Top 5 收入占比 31%；模拟完成 12 家客户访谈，其中 9 家计划扩容。":
    "2025A included 118 paying customers, 93% gross retention, and 31% revenue concentration among the top five customers. Simulated interviews covered 12 customers, of which nine planned to expand.",
  "工业缺陷数据资产包含 1,900 万张标注图像；两名前员工贡献代码的职务成果确认函待补签。":
    "The industrial-defect dataset contains 19 million labeled images. Work-product confirmations remain unsigned for code contributed by two former employees.",
  "2025Q4 验收集中：42% 年收入在 Q4 确认；需核验 15 笔合同、上线与回款。":
    "Acceptance was concentrated in 4Q 2025: 42% of full-year revenue was recognized in Q4. Fifteen contracts require contract-to-cash testing across deployment, acceptance, and collection.",
  "原结论与关键依据已标记": "Source conclusion and key support marked",
  "按项目风险档位设定质询强度":
    "Challenge intensity set to the project's risk profile",
  "收入兑现与客户扩容假设已拆解":
    "Revenue delivery and customer expansion assumptions decomposed",
  "平台化执行前提已列出": "Platform execution prerequisites listed",
  "估值倍数与退出依赖已标记":
    "Valuation multiple and exit dependencies marked",
  "增长叙事与底稿口径已对照":
    "Growth narrative compared with workbook definitions",
  "产品收入结构的错配风险已确认":
    "Mismatch risk in product revenue mix confirmed",
  "模型成本敏感性已测算": "Model cost sensitivity calculated",
  "收入与权属闭环列为先决条件":
    "Revenue and ownership closure listed as conditions precedent",
  "回购与补偿触发线已拟定":
    "Repurchase and compensation triggers drafted",
  "关键岗位与信息权建议已整理":
    "Key-role and information-rights recommendations organized",
  "NTM 收入与增长率已锁定": "NTM revenue and growth rate locked",
  "投前估值与稀释条件已整理":
    "Pre-money valuation and dilution terms organized",
  "预测期间与确认口径已统一":
    "Forecast period and recognition basis aligned",
  "未来融资稀释已纳入模型": "Future financing dilution included in the model",
  "基准持有期参数已确认": "Base holding-period parameter confirmed",
  "回报要求与退出倍数已反推":
    "Return requirement and exit multiple backsolved",
  "可比公司区间已计算": "Comparable-company range calculated",
  "近期交易案例区间已计算": "Recent transaction range calculated",
  "收入兑现不足情景已运行": "Revenue shortfall scenario run",
  "退出 PS 收缩影响已量化":
    "Exit PS compression impact quantified",
  "持股变化对 MOIC 的影响已量化":
    "MOIC impact of ownership changes quantified",
};

const auroraCompareCopy: Record<
  string,
  {
    label: string;
    claimSource?: string;
    claimValue?: string;
    realitySource?: string;
    realityValue?: string;
    explanation?: string;
    impact?: string;
    recommendation?: string;
  }
> = {
  "2024 全年营收": {
    label: "2024 Full-Year Revenue",
    explanation:
      "The memo uses RMB 182 million on a tax-inclusive basis, while the audit reports RMB 178.87 million excluding tax. The 1.6% gap is within a reasonable tax-related range and does not indicate a material misstatement.",
    impact:
      "The effect on valuation and the PS multiple is immaterial (no more than 0.2x), resulting in an R1 low-risk assessment.",
    recommendation:
      "Retain the reported figure but add a clear tax-inclusive versus tax-exclusive definition in the diligence memo.",
  },
  "2024 经营性现金流净额": {
    label: "2024 Operating Cash Flow",
    explanation:
      "The memo reports RMB 28.4 million on a consolidated basis, while the entity-level FDD schedules total RMB 24.15 million. The unexplained RMB 4.25 million gap may relate to related-party payments reclassified into operating cash flow.",
    impact:
      "Cash conversion quality may be overstated by 15%, directly reducing the valuation ceiling under a venture-return approach and warranting R4 deal protection.",
    recommendation:
      "Require a consolidated-to-entity cash flow bridge within one week. If the RMB 4.25 million gap remains unexplained, reduce the valuation ceiling by 8% to 12%.",
  },
  "投后估值（B 轮基础上）": {
    label: "Post-Money Valuation (Series B)",
  },
};

const yaojuCompareCopy: typeof auroraCompareCopy = {
  净收入留存: {
    label: "Net Revenue Retention",
    claimSource: "Source Report · P2",
    claimValue: "NRR 124%",
    realitySource: "Customer Ledger / Collection Records",
    realityValue: "84% of ARR supported by complete evidence",
    explanation:
      "The customer ledger supports the expansion trend, but does not cover all ARR, and simulated interviews cannot replace independent customer calls.",
    impact:
      "NRR is central to software expansion and valuation premium. Incomplete evidence reduces confidence in the conclusion.",
    recommendation:
      "Independently interview renewed, expanding, and churned customers, then reconcile account-level ARR with cash collections.",
  },
  付费客户数: {
    label: "Paying Customers",
    claimSource: "Source Report · P8[^3]",
    claimValue: "118 customers / +62% YoY",
    realitySource: "CRM / Invoice Ledger",
    realityValue: "118 customers",
  },
  客户扩容意愿: {
    label: "Customer Expansion Intent",
    claimSource: "Source Report · P8[^3]",
    claimValue: "9 of 12 customers plan to expand",
    realitySource: "Independent Customer Interviews",
    realityValue: "7 of 10 customers confirmed expansion",
  },
  应收周转天数: {
    label: "Receivable Days",
    claimSource: "Source Report · P8",
    claimValue: "Improved from 176 to 138 days",
    realitySource: "Receivables Aging Recalculation",
    realityValue: "139 days",
  },
  训练数据资产: {
    label: "Training Data Asset",
    claimSource: "Source Report · P6[^4]",
    claimValue: "19 million images / 620 classes",
    realitySource: "Data Authorization Inventory",
    realityValue: "14.2 million images are traceable",
    explanation:
      "The knowledge base can trace the source and authorization scope for only 14.2 million images. The remainder lacks complete authorization records.",
    impact:
      "The scale of legally usable data may be overstated, directly weakening the product-moat assessment.",
    recommendation:
      "Complete the source, customer authorization, anonymization, and permitted-use inventory before confirming the usable data volume.",
  },
  模块复用率: {
    label: "Module Reuse Rate",
    claimSource: "Source Report · P4",
    claimValue: "Improved from 38% to 71%",
    realitySource: "Code Repository / Project Time Logs",
    realityValue: "69%–72%",
  },
  平均上线周期: {
    label: "Average Deployment Cycle",
    claimSource: "Source Report · P8",
    claimValue: "Reduced from 12 weeks to 5 weeks",
    realitySource: "Time Records for 12 Projects",
    realityValue: "Median: 6.5 weeks",
  },
  系统接入覆盖: {
    label: "System Integration Coverage",
    claimSource: "Source Report · P6",
    claimValue: "70% of customers integrated MES / QMS",
    realitySource: "Customer Integration Inventory",
    realityValue: "Only 9 customers are verifiable",
    explanation:
      "The knowledge base lacks a complete integration inventory. A nine-customer sample is insufficient to validate the reported 70% coverage.",
    impact:
      "The current evidence cannot establish product embedding depth or customer switching costs.",
    recommendation:
      "Provide a complete customer integration list, acceptance records, and ongoing usage logs, then recalculate coverage across paying customers.",
  },
  收入预测: {
    label: "Revenue Forecast",
    claimSource: "Source Report · P9[^1]",
    claimValue: "2026E revenue: RMB 222 million / +73%",
    realitySource: "Orders / Sales Pipeline",
    realityValue: "Supports RMB 188–205 million",
    explanation:
      "Signed orders and the stage-weighted sales pipeline support growth, but do not fully cover the RMB 222 million forecast.",
    impact:
      "A lower revenue base would increase the entry multiple and reduce the base-case return.",
    recommendation:
      "Trace the top 20 contracts through acceptance, invoicing, and collection, then rebuild the forecast bridge.",
  },
  订单覆盖率: {
    label: "Backlog Coverage",
    claimSource: "Source Report · P9[^1]",
    claimValue: "RMB 96 million / 43% coverage",
    realitySource: "Contract Ledger",
    realityValue: "RMB 89.4 million / 40% coverage",
  },
  进入倍数: {
    label: "Entry Multiple",
    claimSource: "Source Report · P11[^2]",
    claimValue: "3.1x 2026E revenue",
    realitySource: "Independent Valuation Model",
    realityValue: "6.80 / 2.22 = 3.06x",
  },
  投资回报: {
    label: "Investment Return",
    claimSource: "Source Report · P11[^2]",
    claimValue: "4.3x MOIC / 44.0% IRR",
    realitySource: "Dilution-Adjusted Downside Case",
    realityValue: "2.6x MOIC / 27% IRR",
  },
  可服务市场: {
    label: "Serviceable Addressable Market",
    claimSource: "Source Report · P5",
    claimValue: "2030E SAM: RMB 28.06 billion",
    realitySource: "Industry Research / Production-Line Model",
    realityValue: "Definitions are not directly comparable",
    explanation:
      "External industry sources use a different scope from the serviceable production-line definition in the source report, so the RMB 28.06 billion estimate cannot be validated directly.",
    impact:
      "The market estimate may include industries, production lines, or software budgets that the current product cannot serve.",
    recommendation:
      "Recalculate SAM bottom-up using target production-line counts and independently verifiable software spend.",
  },
  前员工权属文件: {
    label: "Former-Employee Ownership Documents",
    claimSource: "Source Report · P6[^4]",
    claimValue: "Two confirmations remain unsigned",
    realitySource: "Legal Diligence Checklist",
    realityValue: "The same two confirmations remain unsigned",
  },
  "Q4 收入集中度": {
    label: "Q4 Revenue Concentration",
    claimSource: "Source Report · P14[^5]",
    claimValue: "42% of full-year revenue",
    realitySource: "General Ledger / Acceptance Record Recalculation",
    realityValue: "46% of full-year revenue",
    explanation:
      "Reclassification by general-ledger and acceptance dates shows that Q4 represented 46% of revenue, four percentage points above the source report.",
    impact:
      "The higher period-end concentration increases recognition risk and may affect both 2025A revenue quality and the starting point for the 2026E forecast.",
    recommendation:
      "Complete contract-to-cash testing for 15 high-risk contracts and include a discrepancy threshold in the closing conditions.",
  },
  一票否决项: {
    label: "Deal-Breaker Conditions",
    claimSource: "Source Report · P15",
    claimValue: "IP, data rights, and revenue authenticity",
    realitySource: "Project Knowledge Base Completeness Review",
    realityValue: "Evidence remains incomplete in all three areas",
    explanation:
      "The knowledge base still lacks a complete code scan, training-data authorization chain, and revenue contract-to-cash results.",
    impact:
      "Deal-breaker risks that could change the investment decision cannot yet be ruled out.",
    recommendation:
      "Make closure of all three evidence gaps conditions precedent and retain a termination right until they are resolved.",
  },
};

const replacements: Array<[string, string]> = [
  ["投资官AI", "Investor AI"],
  ["极光智算 Pre-A 轮", "Aurora Compute · Pre-A"],
  ["赫利俄斯半导体 B 轮", "Helios Semiconductor · Series B"],
  ["海致科技 D 轮", "Haizhi Technology · Series D"],
  ["第四范式 B 轮", "4Paradigm · Series B"],
  ["海洋蓝智能 SaaS · A+ 轮", "OceanBlue Intelligent SaaS · Series A+"],
  ["星云生物医药 Pre-A 轮", "Nebula Biopharma · Pre-A"],
  ["北京海致科技集团", "Beijing Haizhi Technology Group"],
  ["曜矩智造", "Yaoju Manufacturing"],
  ["极光智算", "Aurora Compute"],
  ["赫利俄斯半导体", "Helios Semiconductor"],
  ["赫利俄斯", "Helios"],
  ["海致科技", "Haizhi Technology"],
  ["第四范式", "4Paradigm"],
  ["星云生物医药", "Nebula Biopharma"],
  ["星云生物", "Nebula Biopharma"],
  ["海洋蓝智能", "OceanBlue Intelligence"],
  ["Pre-A 轮", "Pre-A Round"],
  ["A+ 轮", "Series A+"],
  ["A 轮", "Series A"],
  ["B 轮", "Series B"],
  ["C 轮", "Series C"],
  ["D 轮", "Series D"],
  ["投前投资分析报告", "Pre-Investment Analysis Report"],
  ["投资分析复核报告", "Investment Analysis Review"],
  ["投资分析报告", "Investment Analysis Report"],
  ["事实交叉验证报告", "Cross-Validation Report"],
  ["交叉验证报告", "Cross-Validation Report"],
  ["交叉验证", "Cross-Validation"],
  ["投资备忘录", "Investment Memo"],
  ["投决报告", "Investment Committee Report"],
  ["投决议案", "Investment Committee Memo"],
  ["财务专项尽调报告", "Special Financial Due Diligence Report"],
  ["财务尽调报告", "Financial Due Diligence Report"],
  ["法律尽调报告", "Legal Due Diligence Report"],
  ["财务审计报告", "Financial Audit Report"],
  ["审计报告", "Audit Report"],
  ["财务底稿", "Financial Due Diligence Workbook"],
  ["商业计划书", "Business Plan"],
  ["公司介绍", "Company Overview"],
  ["行业研报", "Industry Research"],
  ["项目知识库", "Project Knowledge Base"],
  ["尽调材料", "diligence materials"],
  ["原报告", "source report"],
  ["原文", "source text"],
  ["财务数据", "Financial Data"],
  ["融资数据", "Financing Data"],
  ["公司数据", "Company Data"],
  ["客户数据", "Customer Data"],
  ["业务数据", "Business Data"],
  ["法务合规", "Legal & Compliance"],
  ["市场行业", "Market & Industry"],
  ["团队治理", "Team & Governance"],
  ["商业增长", "Commercial Growth"],
  ["产品壁垒", "Product Moat"],
  ["财务估值", "Financials & Valuation"],
  ["风险交易", "Risk & Deal Terms"],
  ["行业与市场", "Industry & Market"],
  ["产品与商业模式", "Product & Business Model"],
  ["产品与技术", "Product & Technology"],
  ["客户与增长质量", "Customers & Growth Quality"],
  ["客户与增长", "Customers & Growth"],
  ["财务与现金流", "Financials & Cash Flow"],
  ["估值与价格边界", "Valuation & Price Boundaries"],
  ["退出与失败场景", "Exit & Failure Scenarios"],
  ["法务与合规", "Legal & Compliance"],
  ["估值与回报", "Valuation & Returns"],
  ["客户洞察", "Customer Insights"],
  ["财务核验", "Financial Verification"],
  ["技术审查", "Technology Review"],
  ["市场研究", "Market Research"],
  ["估值测算", "Valuation Analysis"],
  ["低风险", "Low Risk"],
  ["中低风险", "Low–Medium Risk"],
  ["中高风险", "Medium–High Risk"],
  ["高风险", "High Risk"],
  ["一般风险", "Moderate Risk"],
  ["重大风险", "Material Risk"],
  ["有条件推进", "Proceed with conditions"],
  ["建议暂缓", "Defer investment"],
  ["最终建议", "Final Recommendation"],
  ["整体复核结论", "Overall Review Conclusion"],
  ["执行摘要", "Executive Summary"],
  ["关键风险项", "Key Risk Items"],
  ["复核结论", "Review Conclusion"],
  ["下一步建议", "Next Steps"],
  ["核心结论", "Core Conclusion"],
  ["引用来源", "Sources"],
  ["证据摘要", "Evidence Summary"],
  ["证据来源", "Evidence Sources"],
  ["主张", "Claim"],
  ["证据", "Evidence"],
  ["估值", "Valuation"],
  ["收入", "Revenue"],
  ["现金流", "Cash Flow"],
  ["客户", "Customer"],
  ["市场", "Market"],
  ["产品", "Product"],
  ["团队", "Team"],
  ["财务", "Financial"],
  ["法律", "Legal"],
  ["合规", "Compliance"],
  ["核心", "Critical"],
  ["重要", "Important"],
  ["补充", "Supplementary"],
  ["待跟进", "Follow-up required"],
  ["已添加", "Added"],
  ["添加到任务", "Add to tasks"],
  ["未开始", "Not started"],
  ["已完成", "Completed"],
  ["进行中", "In progress"],
  ["执行中", "In progress"],
  ["等待", "Awaiting"],
  ["年度", "Annual"],
  ["同比", "YoY"],
  ["本轮", "this round"],
  ["投前", "pre-money"],
  ["投后", "post-money"],
  ["人民币", "RMB"],
  ["美元", "USD"],
  ["页", "page"],
  ["项", "items"],
  ["家", "customers"],
  ["年", "year"],
  [" 份", " documents"],
  [" 条", " items"],
  [" 个", " items"],
  [" 种", " methods"],
  [" 档", " scenarios"],
  [" 处", " differences"],
  [" 路", " lanes"],
];

function keyFigures(value: string): string {
  const figures = value.match(/[+-]?\d[\d,.]*(?:\.\d+)?(?:%|x|×|M|B)?/gi) ?? [];
  return [...new Set(figures)].slice(0, 8).join(", ");
}

function narrativeFallback(value: string): string {
  const figures = keyFigures(value);
  const suffix = figures ? ` Key figures: ${figures}.` : "";
  if (/估值|回报|退出|倍数|MOIC|IRR/.test(value)) {
    return `The valuation and return assumptions were independently recalculated and stress-tested against downside scenarios.${suffix}`;
  }
  if (/收入|利润|现金流|应收|订单|财务|审计/.test(value)) {
    return `The financial evidence was reconciled across reported figures, contracts, audit adjustments, collections, and recognition periods.${suffix}`;
  }
  if (/客户|续费|扩容|留存|NRR|ARR/.test(value)) {
    return `Customer retention, expansion, concentration, and payment evidence were cross-checked against the operating records.${suffix}`;
  }
  if (/产品|技术|代码|数据|模型|平台/.test(value)) {
    return `The product and technology claims were reviewed against traceable data, code ownership, delivery records, and deployment evidence.${suffix}`;
  }
  if (/法律|合规|协议|股权|知识产权|税/.test(value)) {
    return `The legal and compliance claim requires support from executed agreements, ownership records, and independently verifiable filings.${suffix}`;
  }
  if (/市场|行业|TAM|SAM|竞争/.test(value)) {
    return `The market claim was tested against independent sources and a bottom-up serviceable-market model.${suffix}`;
  }
  if (/团队|创始|高管|履历|治理/.test(value)) {
    return `The team and governance claim was assessed using role history, decision rights, background checks, and governance protections.${suffix}`;
  }
  if (/建议|条件|风险|结论|核验|验证|复核/.test(value)) {
    return `The independent review identified the evidence gaps and deal conditions that could change the investment conclusion.${suffix}`;
  }
  return `English demo summary based on the cited project evidence.${suffix}`;
}

function normalizeEnglishUnits(value: string): string {
  return value
    .replace(/([+-]?\d+(?:\.\d+)?)\s*亿元/g, (_, amount: string) =>
      `RMB ${(Number(amount) * 100).toLocaleString("en-US")} million`
    )
    .replace(/([+-]?\d[\d,]*(?:\.\d+)?)\s*万元/g, (_, amount: string) => {
      const numeric = Number(amount.replace(/,/g, ""));
      return `RMB ${(numeric / 100).toLocaleString("en-US")} million`;
    })
    .replace(/([+-]?\d[\d,]*(?:\.\d+)?)\s*元/g, "RMB $1")
    .replace(/（/g, " (")
    .replace(/）/g, ")")
    .replace(/：/g, ": ")
    .replace(/；/g, "; ")
    .replace(/，/g, ", ")
    .replace(/。/g, ". ")
    .replace(/「|」|“|”/g, '"')
    .replace(/·\s*·/g, "·")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function translateContentText(value: string, locale: Locale): string {
  if (locale === "zh-CN" || !value) return value;
  const exact = exactText[value.trim()];
  if (exact) return exact;

  let translated = normalizeEnglishUnits(value);
  for (const [source, target] of replacements) {
    translated = translated.split(source).join(target);
  }
  translated = normalizeEnglishUnits(translated);
  return HAN_RE.test(translated) ? narrativeFallback(value) : translated;
}

export function translateKnowledgeCategory(
  category: KnowledgeFile["category"],
  locale: Locale
): string {
  if (locale === "zh-CN" || !category) return category ?? "";
  return {
    投决议案: "Investment Memo",
    财务尽调: "Financial DD",
    法律尽调: "Legal DD",
    商业尽调: "Commercial DD",
    BP: "Business Plan",
    其他: "Other",
  }[category];
}

export function translateVerificationCategory(
  category: VerificationCategory,
  locale: Locale
): string {
  if (locale === "zh-CN") return category;
  return {
    财务数据: "Financial Data",
    募资: "Fundraising",
    融资数据: "Financing Data",
    公司数据: "Company Data",
    法务合规: "Legal & Compliance",
    客户数据: "Customer Data",
    业务数据: "Business Data",
    市场行业: "Market & Industry",
    团队治理: "Team & Governance",
    其他: "Other",
  }[category];
}

export function translateVerificationVerdict(
  verdict: VerificationVerdict | string,
  locale: Locale
): string {
  return translateContentText(verdict, locale);
}

function localizeFile(file: KnowledgeFile, locale: Locale): KnowledgeFile {
  if (locale === "zh-CN") return file;
  return { ...file, name: translateContentText(file.name, locale) };
}

export function localizeProject(project: Project, locale: Locale): Project {
  if (locale === "zh-CN") return project;
  const submittedFileIds = new Set(project.reportSubmissions?.map((entry) => entry.file.id));
  return {
    ...project,
    name: projectNames[project.id] ?? translateContentText(project.name, locale),
    industry:
      projectIndustries[project.industry] ??
      translateContentText(project.industry, locale),
    customInstruction:
      projectInstructions[project.id] ??
      translateContentText(project.customInstruction, locale),
    // User-submitted filenames identify actual versions, not translated demo copy.
    files: project.files.map((file) => submittedFileIds.has(file.id) ? file : localizeFile(file, locale)),
  };
}

export function localizeProjects(projects: Project[], locale: Locale): Project[] {
  return locale === "zh-CN"
    ? projects
    : projects.map((project) => localizeProject(project, locale));
}

export function localizeSourceAnchor(
  anchor: SourceAnchor,
  locale: Locale
): SourceAnchor {
  if (locale === "zh-CN") return anchor;
  return {
    ...anchor,
    document: translateContentText(anchor.document, locale),
    paragraph: anchor.paragraph
      ? translateContentText(anchor.paragraph, locale)
      : undefined,
    page:
      typeof anchor.page === "string"
        ? translateContentText(anchor.page, locale)
        : anchor.page,
    excerpt: translateContentText(anchor.excerpt, locale),
    highlight: anchor.highlight?.map((item) =>
      translateContentText(item, locale)
    ),
  };
}

function localizeCompare(compare: FactCompare, locale: Locale): FactCompare {
  const curated =
    auroraCompareCopy[compare.label] ?? yaojuCompareCopy[compare.label];
  return {
    ...compare,
    label: curated?.label ?? translateContentText(compare.label, locale),
    claim: {
      source:
        curated?.claimSource ??
        translateContentText(compare.claim.source, locale),
      value:
        curated?.claimValue ?? translateContentText(compare.claim.value, locale),
    },
    reality: {
      source:
        curated?.realitySource ??
        translateContentText(compare.reality.source, locale),
      value:
        curated?.realityValue ??
        translateContentText(compare.reality.value, locale),
    },
    delta: compare.delta
      ? translateContentText(compare.delta, locale)
      : undefined,
    deviationDetail: compare.deviationDetail
      ? {
          explanation:
            curated?.explanation ??
            translateContentText(compare.deviationDetail.explanation, locale),
          impact:
            curated?.impact ??
            translateContentText(compare.deviationDetail.impact, locale),
          recommendation: compare.deviationDetail.recommendation
            ? curated?.recommendation ??
              translateContentText(
                compare.deviationDetail.recommendation,
                locale
              )
            : undefined,
          evidence: compare.deviationDetail.evidence?.map((anchor) =>
            localizeSourceAnchor(anchor, locale)
          ),
        }
      : undefined,
  };
}

function localizeChallengeItem(
  item: ChallengeItem,
  locale: Locale
): ChallengeItem {
  const curated = challengeItemCopy[item.id];
  return {
    ...item,
    title: curated?.title ?? translateContentText(item.title, locale),
    coreLogic:
      curated?.coreLogic ?? translateContentText(item.coreLogic, locale),
    evidence: item.evidence.map((anchor) =>
      localizeSourceAnchor(anchor, locale)
    ),
    actionAdvice:
      curated?.actionAdvice ??
      item.actionAdvice.map((advice) => translateContentText(advice, locale)),
  };
}

const challengeItemCopy: Record<
  string,
  { title: string; coreLogic: string; actionAdvice: string[] }
> = {
  "c-1": {
    title: "Valuation discontinuity and exit risk",
    coreLogic:
      "A 6.0x revenue multiple implies 85% NTM growth, while 2024 revenue per employee was only RMB 471,000 versus an industry benchmark of RMB 750,000–820,000. The company must explain how it will overcome this capacity constraint and support the earnings required at exit.",
    actionAdvice: [
      "Reduce the pre-money valuation by 15%–20% to a range of RMB 1.01–1.07 billion.",
      "Add a full-cash repurchase obligation if next-year adjusted net profit is below RMB 35 million; equity-only compensation is insufficient.",
      "Reserve 10% of the Pre-A equity pool as a repurchase buffer.",
    ],
  },
  "c-2": {
    title: "Foundation-model API costs create diseconomies of scale",
    coreLogic:
      "Each automated task requires 6.4 GPT-5.4 / Claude 4.6 inference calls, and foundation-model API expense equals 38% of contract value. The plan assumes a 40% reduction in inference pricing by 2026 to lift gross margin to 55%, but provides no contract or quotation evidence.",
    actionAdvice: [
      "Require quantitative support for the inference-cost reduction assumption, including contracts, quotations, or a model-routing plan.",
      "Set a performance-protection trigger if consolidated gross margin remains below 35% within 24 months.",
      "Implement an AI Gateway routing layer to reduce cost exposure to a single model provider.",
    ],
  },
  "c-3": {
    title: "Top-five customers represent 41% of revenue",
    coreLogic:
      "The top five customers contribute 41.2% of revenue. The largest customer renewed for 2025, but contract value fell 39%, creating a clear concentration risk to revenue stability.",
    actionAdvice: [
      "Add credit support if any single customer exceeds 30% of revenue for two consecutive periods.",
      "Track customer diversification and new contract wins through 1H 2026.",
    ],
  },
  "c-4": {
    title: "Team fit for an infrastructure Agent platform remains unproven",
    coreLogic:
      "Two of the three founders have sales backgrounds. The CTO is described only as a former senior architect, with no disclosed projects, tenure, or independently verifiable ML / infrastructure credentials.",
    actionAdvice: [
      "Require an independent third-party background check on the CTO's credentials.",
      "Include investor notification rights for changes to key management roles.",
    ],
  },
  "cp-1": {
    title: "Unverified CTO credentials weaken technical decision authority",
    coreLogic:
      "The CTO is described only as a former senior architect, with no project or tenure disclosure and no public ML / infrastructure track record. Two sales-led cofounders hold 62% of voting rights, creating systematic bias risk in technical roadmap decisions.",
    actionAdvice: [
      "Require a third-party background check on the CTO, delivered within 45 days.",
      "Add notification rights for key-role changes and prohibit unilateral replacement of the CTO for 12 months.",
      "Add an independent technical director nominated by the investor.",
    ],
  },
  "cp-2": {
    title: "Sales-led execution conflicts with a platform product model",
    coreLogic:
      "Seven of nine new customers in 1H 2025 were custom projects with gross margin below 25%, while the business plan presents a product-led subscription model at 65% margin. Without a product leader, the company risks reverting to labor-based delivery within 12 months and undermining the platform valuation thesis.",
    actionAdvice: [
      "Trigger performance compensation if subscription ARR is below 35% of revenue after 12 months.",
      "Require a head of product within 90 days; otherwise grant a 5% post-money equity adjustment right.",
    ],
  },
  "cp-3": {
    title: "Single-model cost exposure is not hedged",
    coreLogic:
      "GPT-5.4 represents 88% of inference calls and the company has no routing layer. A 30% price increase or weaker SLA would reduce per-order gross margin from 20% to -3%.",
    actionAdvice: [
      "Integrate at least two foundation-model providers through an AI Gateway within six months.",
      "Require a separate board review if one provider exceeds 70% of usage for two consecutive quarters.",
    ],
  },
};

function localizeDiligenceContent(
  content: DiligenceContent,
  locale: Locale
): DiligenceContent {
  switch (content.type) {
    case "paragraph":
      return { ...content, text: translateContentText(content.text, locale) };
    case "bullets":
      return {
        ...content,
        items: content.items.map((item) => translateContentText(item, locale)),
      };
    case "callout":
      return {
        ...content,
        title: content.title
          ? translateContentText(content.title, locale)
          : undefined,
        text: translateContentText(content.text, locale),
      };
    case "stats":
      return {
        ...content,
        items: content.items.map((item) => ({
          ...item,
          label: translateContentText(item.label, locale),
          value: translateContentText(item.value, locale),
          sub: item.sub ? translateContentText(item.sub, locale) : undefined,
        })),
      };
    case "bars":
      return {
        ...content,
        caption: content.caption
          ? translateContentText(content.caption, locale)
          : undefined,
        items: content.items.map((item) => ({
          ...item,
          label: translateContentText(item.label, locale),
          display: translateContentText(item.display, locale),
        })),
      };
    case "table":
      return {
        ...content,
        headers: content.headers.map((header) =>
          translateContentText(header, locale)
        ),
        rows: content.rows.map((row) =>
          row.map((cell) => translateContentText(cell, locale))
        ),
      };
    case "verification-cards":
      return {
        ...content,
        caption: content.caption
          ? translateContentText(content.caption, locale)
          : undefined,
        items: content.items.map((item) => ({
          ...item,
          claim: translateContentText(item.claim, locale),
          claimSources: item.claimSources?.map((anchor) =>
            localizeSourceAnchor(anchor, locale)
          ),
          evidence: translateContentText(item.evidence, locale),
          evidenceSources: item.evidenceSources.map((anchor) =>
            localizeSourceAnchor(anchor, locale)
          ),
        })),
      };
  }
}

const phaseCopy: Record<
  string,
  Pick<ReportProcessPhase, "title" | "description" | "activeText" | "completedText">
> = {
  "cross-validation:read": {
    title: "Understand the source report and supporting materials",
    description:
      "Confirm the report under review, supporting documents, and research scope.",
    activeText:
      "Reading the materials section by section and locating tables, key figures, and source conclusions.",
    completedText:
      "The document structure, key figures, and source conclusions have been indexed.",
  },
  "cross-validation:claims": {
    title: "Identify claims that require validation",
    description:
      "Convert narrative statements in the source report into individually testable claims.",
    activeText:
      "Merging duplicate statements and prioritizing claims by potential decision impact.",
    completedText:
      "Candidate statements have been consolidated into a prioritized claim set.",
  },
  "cross-validation:valuation": {
    title: "Independently recalculate financials and valuation",
    description:
      "Recalculate key figures and definitions without relying on the source report's arithmetic.",
    activeText:
      "Recalculating growth, margins, valuation multiples, dilution, and sensitivity cases.",
    completedText:
      "Key financial metrics, valuation definitions, and downside cases have been independently recalculated.",
  },
  "cross-validation:evidence": {
    title: "Find supporting and contradictory evidence",
    description:
      "Search for support, counter-evidence, and definition differences for every claim.",
    activeText:
      "Validating claims in parallel and preserving a traceable source for each conclusion.",
    completedText:
      "Evidence comparisons and source anchors have been completed for all claims.",
  },
  "cross-validation:critique": {
    title: "Challenge the source conclusion",
    description:
      "Determine whether the new evidence weakens or changes the original investment view.",
    activeText:
      "Challenging weak conclusions from investment committee, diligence, and finance perspectives.",
    completedText:
      "The source conclusion has been reassessed against the claim-level validation results.",
  },
  "cross-validation:quality": {
    title: "Run quality checks and generate the report",
    description:
      "Check that every conclusion has complete evidence, risk grading, and source attribution.",
    activeText:
      "Checking evidence support and organizing the claim matrix and report structure.",
    completedText:
      "Quality checks passed and the cross-validation report has been generated.",
  },
  "investment-report:read": {
    title: "Understand the project and transaction materials",
    description:
      "Identify the company, product, business model, transaction structure, and research scope.",
    activeText:
      "Reading project materials and indexing the company, transaction, industry, and key data.",
    completedText:
      "Project materials have been indexed and the company, transaction, and research scope are clear.",
  },
  "investment-report:questions": {
    title: "Define investment questions and the preliminary view",
    description:
      "Translate the project into decision questions, initial hypotheses, and evidence gaps.",
    activeText:
      "Breaking down research questions by decision impact and forming preliminary investment hypotheses.",
    completedText:
      "Preliminary hypotheses, six priority workstreams, and the missing-materials list are complete.",
  },
  "investment-report:valuation": {
    title: "Build an independent valuation range",
    description:
      "Use operating forecasts and comparables to define price boundaries and critical assumptions.",
    activeText:
      "Running independent valuation methods across performance, dilution, and exit scenarios.",
    completedText:
      "PS / PE, DCF, and venture-capital backsolve analyses produced base and downside ranges.",
  },
  "investment-report:research": {
    title: "Run external research by workstream",
    description:
      "Research the industry, competition, customers, financials, regulation, and exit paths.",
    activeText:
      "Research workstreams are gathering evidence in parallel and investigating conflicting information.",
    completedText:
      "Industry, competition, customer, valuation, regulatory, and exit-path research is complete.",
  },
  "investment-report:synthesis": {
    title: "Form the investment view and stress-test it",
    description:
      "Synthesize facts and assumptions, then attack the thesis through failure scenarios.",
    activeText:
      "Testing the weakest assumptions under revenue shortfall, customer loss, and multiple compression.",
    completedText:
      "The core investment thesis and four stress tests covering people, customers, performance, and exit are complete.",
  },
  "investment-report:quality": {
    title: "Run quality checks and generate the report",
    description:
      "Separate facts, analysis, and assumptions, and verify that conclusions form a complete evidence chain.",
    activeText:
      "Checking that the recommendation, conditions, risks, and evidence form a complete decision record.",
    completedText:
      "Quality checks passed and the recommendation, price boundaries, and failure scenarios are in the report.",
  },
  "challenge:scope": {
    title: "Set the challenge objective and evidence boundary",
    description:
      "Confirm the investment logic, source materials, and risk appetite to use for the challenge.",
    activeText:
      "Reading the relevant materials and locking the assumptions that could change the transaction conclusion.",
    completedText:
      "The review scope and evidence boundary have been confirmed against the available materials.",
  },
  "challenge:thesis": {
    title: "Decompose the core investment thesis",
    description:
      "Break the investment narrative into assumptions that evidence can support or disprove.",
    activeText:
      "Decomposing the causal chain between growth, product, team, and valuation.",
    completedText:
      "Core assumptions, dependencies, and the contradictions requiring priority review have been mapped.",
  },
  "challenge:contradictions": {
    title: "Find contradictions and failure paths",
    description:
      "Test the thesis under counterexamples and downside scenarios to see whether it holds under pressure.",
    activeText:
      "Comparing the investment memo, business plan, and diligence materials to locate conflicts between narrative and operating evidence.",
    completedText:
      "Core tensions were identified and revenue, customer, cost, and execution failure paths were tested.",
  },
  "challenge:protections": {
    title: "Rank risks and propose deal protections",
    description:
      "Rank risks by their effect on the transaction conclusion and translate them into executable protections.",
    activeText:
      "Translating high-impact risks into closing conditions, repurchase rights, and information rights.",
    completedText:
      "Risks were ranked and each high-impact item was paired with a protection or evidence follow-up.",
  },
  "challenge:quality": {
    title: "Run quality checks and generate the challenge list",
    description:
      "Check that every challenge has evidence, a risk grade, and a clear next action.",
    activeText:
      "Checking whether the challenge basis, risk grades, and deal protections form a complete decision record.",
    completedText:
      "Quality checks passed and the core tensions, evidence anchors, and deal protections were generated.",
  },
  "valuation:inputs": {
    title: "Read valuation inputs and transaction terms",
    description:
      "Confirm the revenue forecast, current price, financing structure, and exit assumptions.",
    activeText:
      "Reading financial forecasts, transaction terms, and comparable-company data.",
    completedText:
      "Valuation inputs were indexed from the available materials and missing parameters were flagged.",
  },
  "valuation:normalize": {
    title: "Align financial and dilution definitions",
    description:
      "Bring revenue, net cash, ownership, and dilution definitions from different materials onto one basis.",
    activeText:
      "Aligning the revenue base, net cash, ownership percentage, and expected exit horizon.",
    completedText:
      "Revenue, dilution, and exit-horizon definitions were aligned and key parameters were checked.",
  },
  "valuation:methods": {
    title: "Run multiple valuation methods",
    description:
      "Run PS comparables, VC backsolve, and precedent transactions separately so no single method determines the conclusion.",
    activeText:
      "Running PS, VC backsolve, and PTA valuation methods in parallel.",
    completedText:
      "All three valuation methods were completed with their assumptions, ranges, and applicability preserved.",
  },
  "valuation:stress": {
    title: "Stress-test returns and price boundaries",
    description:
      "Test how revenue downside, exit-multiple compression, and future dilution affect returns together.",
    activeText:
      "Running downside scenarios for revenue, exit multiples, and dilution.",
    completedText:
      "Return sensitivity was tested across base, downside, and extreme scenarios.",
  },
  "valuation:range": {
    title: "Summarize the valuation range and assumptions",
    description:
      "Combine the method outputs and state the blended range, key assumptions, and evidence still required.",
    activeText:
      "Combining valuation ranges and organizing the assumptions that drive the price conclusion.",
    completedText:
      "The valuation range and method differences were summarized with key assumptions and evidence gaps.",
  },
  intent: {
    title: "Understand the report and investment objective",
    description:
      "Identify the uploaded document structure, stated conclusion, and decision questions.",
    activeText:
      "Reading the source materials and identifying statements that could change the investment decision.",
    completedText:
      "Document structure, stated conclusion, and review objectives identified.",
  },
  claims: {
    title: "Build the claim map",
    description:
      "Convert source passages into traceable claims that can be independently tested.",
    activeText:
      "Extracting source passages and adding traceable nodes to the claim map.",
    completedText:
      "Core claims grouped into commercial, product, financial, and deal-risk branches.",
  },
  strategy: {
    title: "Set the research strategy",
    description:
      "Define evidence standards, priorities, dependencies, and a consistent output format.",
    activeText:
      "Setting evidence thresholds and sequencing the highest-impact research questions.",
    completedText:
      "Evidence standards, priorities, and acceptance criteria confirmed.",
  },
  agents: {
    title: "Run specialist analysis",
    description:
      "Dispatch the required specialist Agents to search, recalculate, and analyze in parallel.",
    activeText:
      "Specialist Agents are running their assigned evidence and analysis workstreams in parallel.",
    completedText:
      "All selected specialist Agents completed their assignments and submitted results.",
  },
  aggregate: {
    title: "Synthesize findings and generate report",
    description:
      "Reconcile supporting evidence, counter-evidence, and specialist judgment into one decision view.",
    activeText:
      "Resolving evidence conflicts and drafting the investment conclusion, risk rating, and deal terms.",
    completedText:
      "Evidence synthesis completed and the investment analysis report generated.",
  },
  compare: {
    title: "Compare every claim with the knowledge base",
    description:
      "Retrieve evidence for each claim and record consistency, gaps, or discrepancies.",
    activeText:
      "Comparing each claim with financial, legal, customer, and market evidence.",
    completedText:
      "All claims compared and assigned an evidence-strength and discrepancy status.",
  },
  report: {
    title: "Generate the cross-validation report",
    description:
      "Combine claim-level conclusions, evidence gaps, and investment impact.",
    activeText:
      "Compiling the comparison results and drafting follow-up recommendations.",
    completedText:
      "Cross-validation synthesis completed and the report generated.",
  },
};

const diligenceSectionTitles: Record<string, string> = {
  "exec-summary": "Executive Summary",
  "logic-review": "Investment Thesis Review",
  business: "Business Model and Competitive Position",
  "finance-valuation": "Financials and Valuation",
  governance: "Management and Governance Risk",
  "industry-macro": "Industry and Macro Risk",
  "bear-case": "Bear Case",
  "ic-questions": "Investment Committee Challenge Questions",
  "final-conclusion": "Final Conclusion",
  "verification-matrix": "Verification Matrix",
  overview: "Validation Overview and Risk Distribution",
  "top-risks": "Key Risk Items",
  "r3-cards": "R3 Material Risk Details",
  "r2-partial": "R2 Partially Consistent Items",
  "r2-insufficient": "R2 Insufficient Evidence Items",
  "r2-consistent": "R2 Consistent Items",
  "r1-cards": "R1 Low-Risk Items",
  "r1-partial": "R1 Partially Consistent Items",
  "r1-consistent": "R1 Consistent Items",
  conclusion: "Review Conclusion and Next Steps",
  "key-risks": "Key Risk Items",
  "risk-distribution": "Risk Distribution",
  "detail-r4": "R4 Review Items",
  "detail-r3": "R3 Review Items",
  "detail-r2": "R2 Review Items",
  "detail-r1": "R1 Review Items",
};

function englishDiligenceMeta(
  block: Extract<AssistantBlock, { kind: "diligence-report" }>
) {
  if (block.title.includes("海致科技投决报告")) {
    return {
      title: "Haizhi Technology Investment Report · Cross-Validation",
      company: "Haizhi Technology",
      summary:
        "Seventy-four claims were cross-validated. No direct R4 rejection item was found, but material R3 discrepancies remain in financing history, executive biographies, and product-level financial metrics and require resolution before the investment decision.",
      recommendation: "Resolve material discrepancies before IC approval",
      valuation: "Valuation not assessed in this report",
    };
  }
  if (block.title.includes("海致科技")) {
    return {
      title: "Haizhi Technology Series D · Independent Investment Review",
      company: "Beijing Haizhi Technology Group",
      summary:
        "The independent review supports deferring the investment. The 2024 earnings and IPO thesis relies heavily on concentrated Q4 revenue recognition, while cash conversion and a RMB 2.95 billion pre-money valuation leave limited downside protection.",
      recommendation: "Defer investment",
      valuation: "Price is high and downside protection is insufficient",
    };
  }
  if (block.title.includes("第四范式") && block.title.includes("---")) {
    return {
      title: "4Paradigm Series B Investment Memo · Cross-Validation",
      company: "4Paradigm",
      summary:
        "Fifteen claims were reviewed. Financial data is broadly grounded, but eleven R2 evidence gaps remain concentrated in transaction terms, customer outcomes, executive biographies, and market benchmarks.",
      recommendation: "Complete evidence checks before IC approval",
      valuation: "Requires confirmation of the original Series B transaction documents",
    };
  }
  return {
    title: "4Paradigm Series B · Investment Memo vs. Multi-Source Diligence",
    company: "4Paradigm",
    summary:
      "Eighty claims were cross-validated across the investment memo, financial diligence, and legal diligence. Six R3 risks are concentrated in tax, VIE control, ICP licensing, and other legal matters that should be covered by closing conditions and special indemnities.",
    recommendation: "Proceed with conditions",
    valuation: "No valuation discount required if legal protections are fully documented",
  };
}

const genericInvestmentDimensions: Record<
  string,
  { finding: string; recommendation: string }
> = {
  market: {
    finding:
      "End-market demand is credible, but inconsistent public market-size estimates should not be extrapolated directly into company revenue.",
    recommendation:
      "Base the growth case on reachable customer budgets and actual orders from the last two years rather than a broad top-down TAM.",
  },
  business: {
    finding:
      "The product and domain expertise provide a credible foundation, but standardized recurring revenue and repeatable delivery still require proof.",
    recommendation:
      "Provide a continuous operating history for standardized product revenue, renewals, delivery cycles, and project-level gross margin.",
  },
  customers: {
    finding:
      "Growth remains exposed to customer concentration, period-end revenue recognition, and long collection cycles.",
    recommendation:
      "Make key-customer acceptance, collections, and the new-customer mix explicit pre-closing verification items.",
  },
  financial: {
    finding:
      "Improving accounting profit has not yet translated fully into operating cash flow, creating timing and definition risk in the forecast.",
    recommendation:
      "Rebuild the revenue, gross-margin, and cash-flow bridge on audited definitions and include a downside case.",
  },
  valuation: {
    finding:
      "The current price depends on optimistic growth and exit-multiple assumptions and offers limited margin of safety.",
    recommendation:
      "Reprice from the downside case or offset risk through staged closing and performance protections.",
  },
  exit: {
    finding:
      "IPO timing and valuation multiples should not be treated as certain; the exit path needs scenario analysis.",
    recommendation:
      "Assess delayed IPO, strategic acquisition, and dilution in a future financing round as separate exit scenarios.",
  },
};

const yaojuInvestmentDimensions: Record<
  string,
  { finding: string; recommendation: string }
> = {
  market: {
    finding:
      "Demand for industrial visual inspection is credible, but the RMB 28.06 billion serviceable market remains a scenario estimate.",
    recommendation:
      "Rebuild the serviceable market bottom-up from target production lines and independently verifiable software budgets.",
  },
  product: {
    finding:
      "Higher module reuse and shorter delivery cycles support the productization thesis, while training-data rights remain unresolved.",
    recommendation:
      "Complete the training-data authorization chain and a dedicated review of core-code ownership.",
  },
  customer: {
    finding:
      "Customer expansion has partial support, but NRR and simulated interviews lack independent account-level evidence.",
    recommendation:
      "Independently interview renewed, expanding, and churned customers and reconcile ARR with cash collections.",
  },
  finance: {
    finding:
      "2026E revenue growth is aggressive: signed backlog covers only 43% of forecast revenue and recognition is concentrated in Q4.",
    recommendation:
      "Complete contract-to-cash testing for top customers before closing, covering contracts, acceptance, invoices, and collections.",
  },
  legal: {
    finding:
      "Work-product confirmations from two former employees and legacy data authorizations remain incomplete.",
    recommendation:
      "Make clean core-code and data ownership opinions conditions precedent to closing.",
  },
  valuation: {
    finding:
      "The 3.1x entry multiple is arithmetically consistent, but the 4.3x MOIC depends heavily on revenue delivery and the exit multiple.",
    recommendation:
      "Set the price ceiling from the downside case and use staged closing plus performance protections.",
  },
};

function englishEnterpriseCopy(
  block: Extract<AssistantBlock, { kind: "enterprise-analysis" }>
) {
  const yaoju = block.title.includes("曜矩智造");
  return yaoju
    ? {
        summary:
          "Investor AI completed independent analysis across commercial growth, product and technology, customer quality, financial performance, compliance risk, and valuation returns. The recommendation is to proceed with conditions, with revenue authenticity, data rights, and code ownership as conditions precedent and the downside valuation case as the negotiation baseline.",
        dimensions: yaojuInvestmentDimensions,
        highlights: [
          "Recommendation: proceed with conditions; do not invest unconditionally on the current optimistic forecast.",
          "Price boundary: negotiate from the return requirement after reducing revenue and the exit multiple.",
          "Closing conditions: fully resolve revenue authenticity, core-code ownership, and training-data rights.",
          "Post-investment monitoring: customer expansion, collection cycles, and standardized product revenue mix.",
        ],
      }
    : {
        summary:
          "Investor AI reviewed the project materials, defined the key investment questions, built an independent valuation range, completed external research, and stress-tested failure scenarios. The current view is to proceed with conditions only if growth quality, price boundaries, and transaction protections are resolved together.",
        dimensions: genericInvestmentDimensions,
        highlights: [
          "Recommendation: proceed with conditions; do not invest unconditionally on the current optimistic assumptions.",
          "Pricing: use the downside end of the independent valuation range as the negotiation starting point.",
          "Closing conditions: verify key-customer acceptance and collections, reconcile core financial definitions, and resolve material compliance matters.",
          "Most likely failure mode: growth remains project-driven and does not become a repeatable product-led model.",
        ],
      };
}

export function localizeReportProcess(
  process: ReportProcessDefinition,
  locale: Locale
): ReportProcessDefinition {
  if (locale === "zh-CN") return process;
  return {
    ...process,
    title: translateContentText(process.title, locale),
    objective: {
      "cross-validation":
        "Independently validate material claims in the source report and determine whether identified issues change the original investment conclusion.",
      "investment-report":
        "Use project materials and external evidence to determine whether the investment is attractive, under what conditions, and where the thesis is most likely to fail.",
      challenge:
        "Challenge the investment thesis, key assumptions, and execution risks, then turn material issues into actionable review questions and deal protections.",
      valuation:
        "Independently calculate a valuation range with multiple methods, making key assumptions, return boundaries, and missing inputs explicit.",
    }[process.kind],
    phases: process.phases.map((phase) => {
      const copy =
        phaseCopy[`${process.kind}:${phase.id}`] ?? phaseCopy[phase.id];
      return {
        ...phase,
        title: copy?.title ?? translateContentText(phase.title, locale),
        description:
          copy?.description ?? translateContentText(phase.description, locale),
        activeText:
          copy?.activeText ?? translateContentText(phase.activeText, locale),
        completedText:
          copy?.completedText ??
          translateContentText(phase.completedText, locale),
        metrics: phase.metrics?.map((metric) => ({
          ...metric,
          label: translateContentText(metric.label, locale),
          value: translateContentText(metric.value, locale),
          note: metric.note
            ? translateContentText(metric.note, locale)
            : undefined,
        })),
        workstreams: phase.workstreams?.map((workstream) => ({
          ...workstream,
          label: translateContentText(workstream.label, locale),
          result: workstream.result
            ? translateContentText(workstream.result, locale)
            : undefined,
        })),
      };
    }),
  };
}

export function localizeAssistantBlock(
  block: AssistantBlock,
  locale: Locale
): AssistantBlock {
  if (locale === "zh-CN") return block;
  switch (block.kind) {
    case "question-report":
    case "project-work-report":
      // Preserve source-bound demo content and the user's exact follow-up.
      return block;
    case "text":
      return { ...block, text: translateContentText(block.text, locale) };
    case "report-process":
      return { ...block, process: localizeReportProcess(block.process, locale) };
    case "validation-demo":
      return block;
    case "clarification":
      return {
        ...block,
        title: translateContentText(block.title, locale),
        reason: translateContentText(block.reason, locale),
        fields: block.fields.map((field) => ({
          ...field,
          label: translateContentText(field.label, locale),
          hint: field.hint
            ? translateContentText(field.hint, locale)
            : undefined,
          options: field.options?.map((option) =>
            translateContentText(option, locale)
          ),
        })),
        followUp: block.followUp?.map((item) =>
          localizeAssistantBlock(item, locale)
        ),
      };
    case "mode-pick":
      return {
        ...block,
        title: translateContentText(block.title, locale),
        reason: translateContentText(block.reason, locale),
        originalQuery: translateContentText(block.originalQuery, locale),
        options: block.options.map((option) => ({
          ...option,
          label: translateContentText(option.label, locale),
          desc: translateContentText(option.desc, locale),
        })),
      };
    case "fact-verification":
      const yaojuValidation = block.title.includes("曜矩智造");
      return {
        ...block,
        title: yaojuValidation
          ? "Yaoju Manufacturing Pre-Investment Analysis Report · Cross-Validation"
          : translateContentText(block.title, locale),
        summary:
          yaojuValidation
            ? "Sixteen core claims were reviewed: five consistent, six partially consistent, four with insufficient evidence, and one material discrepancy. The source report's direction to proceed with conditions remains supportable, but revenue authenticity, data rights, and code ownership must remain conditions precedent.[^1][^4][^5]"
            : block.title === "营收与经营性现金流交叉验证"
            ? "Operating cash flow in the investment memo differs by 15% from the entity-level FDD schedules, while LTM revenue is broadly consistent with the audited accounts. The post-money valuation is fully consistent between the business plan and executed financing agreement.[^1][^2][^3][^4][^5][^6]"
            : translateContentText(block.summary, locale),
        compares: block.compares.map((compare) =>
          localizeCompare(compare, locale)
        ),
        anchors: block.anchors.map((anchor) =>
          localizeSourceAnchor(anchor, locale)
        ),
        citations: block.citations?.map((anchor) =>
          localizeSourceAnchor(anchor, locale)
        ),
      };
    case "challenge-list":
      const teamChallenge = block.title.includes("团队基因与战略可行性");
      return {
        ...block,
        title: teamChallenge
          ? "Team Fit and Strategic Feasibility Challenge · 3 Issues · R2 Balanced Standard"
          : block.title.includes("灵魂质询清单（4 条")
            ? "Core Investment Thesis Challenge · 4 Issues · R2 Balanced Standard"
            : translateContentText(block.title, locale),
        summary: teamChallenge
          ? "This review challenges the fit between a sales-led founding team and an infrastructure Agent platform strategy. It tests the 60% gross-margin assumption, custom-project dependence, and single-model exposure, then converts the findings into governance and performance protections."
          : block.title.includes("灵魂质询清单（4 条")
            ? "In a highly competitive Agent application market, foundation-model costs, low revenue per employee, and the claimed 60% gross margin create structural tension. The report identifies the assumptions that require contractual protection."
            : translateContentText(block.summary, locale),
        items: block.items.map((item) =>
          localizeChallengeItem(item, locale)
        ),
        citations: block.citations?.map((anchor) =>
          localizeSourceAnchor(anchor, locale)
        ),
      };
    case "valuation":
      return {
        ...block,
        title: translateContentText(block.title, locale),
        summary: translateContentText(block.summary, locale),
        methods: block.methods.map((method) => ({
          method: translateContentText(method.method, locale),
          range: translateContentText(method.range, locale),
          assumption: translateContentText(method.assumption, locale),
          applicability: translateContentText(method.applicability, locale),
        })),
        conclusion: translateContentText(block.conclusion, locale),
        citations: block.citations?.map((anchor) =>
          localizeSourceAnchor(anchor, locale)
        ),
      };
    case "enterprise-analysis":
      const enterpriseCopy = englishEnterpriseCopy(block);
      return {
        ...block,
        title: translateContentText(block.title, locale),
        summary: enterpriseCopy.summary,
        reportLabel: block.reportLabel
          ? translateContentText(block.reportLabel, locale)
          : undefined,
        dimensions: block.dimensions.map((dimension) => ({
          ...dimension,
          label: translateContentText(dimension.label, locale),
          finding:
            enterpriseCopy.dimensions[dimension.key]?.finding ??
            translateContentText(dimension.finding, locale),
          recommendation:
            enterpriseCopy.dimensions[dimension.key]?.recommendation ??
            translateContentText(dimension.recommendation, locale),
        })),
        highlights: enterpriseCopy.highlights,
        citations: block.citations?.map((anchor) =>
          localizeSourceAnchor(anchor, locale)
        ),
      };
    case "analysis-aborted":
      return {
        ...block,
        title: "Analysis stopped: required diligence materials are missing",
        reason:
          "The uploaded files contain market-facing materials only. Without financial, legal, and investment committee documents, Investor AI cannot produce a traceable review under the selected risk standard.",
        missingItems: block.missingItems.map((item) => ({
          ...item,
          label: translateContentText(item.label, locale),
          hint: item.hint ? translateContentText(item.hint, locale) : undefined,
        })),
        nextSteps: block.nextSteps?.map((step) =>
          translateContentText(step, locale)
        ),
      };
    case "diligence-report": {
      const meta = englishDiligenceMeta(block);
      return {
        ...block,
        title: meta.title,
        company: meta.company,
        summary: meta.summary,
        verdict: {
          ...block.verdict,
          recommendation: meta.recommendation,
          valuation: meta.valuation,
        },
        metrics: block.metrics.map((metric) => ({
          ...metric,
          label: translateContentText(metric.label, locale),
          value: translateContentText(metric.value, locale),
          sub: metric.sub
            ? translateContentText(metric.sub, locale)
            : undefined,
        })),
        sections: block.sections.map((section) => ({
          ...section,
          title:
            diligenceSectionTitles[section.id] ??
            translateContentText(section.title, locale),
          content: section.content.map((content) =>
            localizeDiligenceContent(content, locale)
          ),
        })),
        citations: block.citations.map((anchor) =>
          localizeSourceAnchor(anchor, locale)
        ),
      };
    }
  }
}

export function localizeChatMessage(
  message: ChatMessage,
  locale: Locale
): ChatMessage {
  if (locale === "zh-CN") return message;
  return {
    ...message,
    text: message.text
      ? translateContentText(message.text, locale)
      : undefined,
    blocks: message.blocks?.map((block) =>
      localizeAssistantBlock(block, locale)
    ),
    attachments: message.attachments?.map((attachment) => ({
      ...attachment,
      name: translateContentText(attachment.name, locale),
    })),
  };
}

export function localizeConversation(
  conversation: Conversation,
  locale: Locale
): Conversation {
  if (locale === "zh-CN") return conversation;
  return {
    ...conversation,
    title:
      conversationTitles[conversation.id] ??
      translateContentText(conversation.title, locale),
    messages: conversation.messages.map((message) =>
      localizeChatMessage(message, locale)
    ),
    followUpTasks: conversation.followUpTasks?.map((task) => ({
      ...task,
      title: translateContentText(task.title, locale),
      recommendation: translateContentText(task.recommendation, locale),
      compare: localizeCompare(task.compare, locale),
    })),
  };
}

export function localizeConversations(
  conversations: Conversation[],
  locale: Locale
): Conversation[] {
  return locale === "zh-CN"
    ? conversations
    : conversations.map((conversation) =>
        localizeConversation(conversation, locale)
      );
}

export function localizeRunningTask(
  task: RunningTask,
  locale: Locale
): RunningTask {
  if (locale === "zh-CN") return task;
  return {
    ...task,
    title: translateContentText(task.title, locale),
    summary: translateContentText(task.summary, locale),
    process: task.process
      ? localizeReportProcess(task.process, locale)
      : undefined,
    resultBlocks: task.resultBlocks.map((block) =>
      localizeAssistantBlock(block, locale)
    ),
  };
}

export function localizeRunningTasks(
  tasks: RunningTask[],
  locale: Locale
): RunningTask[] {
  return locale === "zh-CN"
    ? tasks
    : tasks.map((task) => localizeRunningTask(task, locale));
}

const yaojuClaimText: Record<string, string> = {
  "growth-nrr": "2025A net revenue retention (NRR) was 124%",
  "growth-customer": "2025A paying customers reached 118, up 62% YoY",
  "growth-expansion": "9 of 12 customers in the simulated interviews planned to expand",
  "growth-dso": "Accounts receivable days improved from 176 to 138",
  "product-data": "19 million labeled images covering 620 defect classes",
  "product-reuse": "Reuse of the top 20 standard modules increased from 38% to 71%",
  "product-cycle": "Average model deployment time fell from 12 weeks to 5 weeks",
  "product-workflow": "70% of customers integrated MES / QMS, implying high switching costs",
  "finance-revenue": "2026E revenue of RMB 222 million, up 73% YoY",
  "finance-backlog": "RMB 96 million signed backlog covers 43% of 2026E revenue",
  "valuation-entry": "RMB 680 million pre-money valuation equals 3.1x 2026E revenue",
  "valuation-return": "Base-case return of 4.3x MOIC / 44.0% IRR",
  "market-size": "2030E serviceable addressable market of RMB 28.06 billion",
  "risk-code": "Work-product confirmations from two former employees remain unsigned",
  "risk-q4": "42% of full-year 2025 revenue was recognized in Q4",
  "risk-ip": "Core IP, data ownership, and revenue authenticity are deal-breaker conditions",
};

const yaojuAgentCopy: Record<
  string,
  Omit<YaojuDemoAgent, "id" | "number">
> = {
  finance: {
    name: "Financial Verification",
    role: "Financial Evidence Review",
    assignment:
      "Recalculate revenue growth, backlog coverage, Q4 concentration, and receivables quality",
    evidenceGoal:
      "Use at least two evidence classes across contracts, acceptance, collections, and audit adjustments",
    steps: [
      "Normalize recognition periods and tax treatment",
      "Trace contracts, acceptance records, and invoices",
      "Recalculate backlog coverage and receivable days",
      "Stress-test concentrated Q4 recognition",
    ],
    output:
      "Identified three revenue-quality gaps; the RMB 680 million valuation is highly sensitive to the revenue base.",
  },
  customer: {
    name: "Customer Insights",
    role: "Customer and Retention Interviews",
    assignment:
      "Validate 124% NRR, expansion intent, concentration, and switching costs",
    evidenceGoal:
      "Cover renewal, expansion, churn, and collections across the customer sample",
    steps: [
      "Reconcile customer ARR and renewal records",
      "Segment expansion, stable, and churned accounts",
      "Cross-check interviews against collections",
      "Assess evidence strength for NRR and switching costs",
    ],
    output:
      "Expansion intent is partly supported, but simulated interviews cannot replace independent customer calls.",
  },
  technology: {
    name: "Technology Review",
    role: "Product and Technology Diligence",
    assignment:
      "Validate the data asset, module reuse, deployment time, and MES / QMS integration",
    evidenceGoal:
      "Reconcile blind tests, code branches, and project time records",
    steps: [
      "Review the data inventory and license boundaries",
      "Compare code branches with module reuse records",
      "Recalculate sampled deployment timelines",
      "Validate the depth of MES / QMS integration",
    ],
    output:
      "The combined moat thesis is credible, but licensing for the 19 million images remains unresolved.",
  },
  market: {
    name: "Market Research",
    role: "Market Boundary Analysis",
    assignment:
      "Validate TAM / SAM, manufacturing software budgets, and cross-industry replication",
    evidenceGoal:
      "Obtain at least two independent industry sources beyond company materials",
    steps: [
      "Separate TAM, SAM, and serviceable production lines",
      "Find independent manufacturing software budget data",
      "Recalculate market size from line count and annual spend",
      "Test delivery constraints on cross-industry expansion",
    ],
    output:
      "A bottom-up line-count model shows that RMB 28.06 billion should be treated as a scenario assumption.",
  },
  legal: {
    name: "Legal & Compliance",
    role: "IP Ownership and Compliance",
    assignment:
      "Verify former-employee code, training-data rights, open-source licenses, and cross-border data compliance",
    evidenceGoal:
      "Close the loop across ownership documents, code scans, and customer authorizations",
    steps: [
      "Verify former-employee work-product confirmations",
      "Review the training-data authorization chain",
      "Scan open-source licenses and code ownership",
      "Identify cross-border data and customer authorization gaps",
    ],
    output:
      "Two former-employee confirmations and legacy telemetry rights should remain closing conditions.",
  },
  valuation: {
    name: "Valuation Analysis",
    role: "Valuation and Return Recalculation",
    assignment:
      "Independently recalculate EV / Revenue, DCF, venture returns, and dilution scenarios",
    evidenceGoal:
      "Normalize revenue, net cash, future dilution, and exit-multiple assumptions",
    steps: [
      "Normalize pre-money valuation and net cash",
      "Recalculate EV / Revenue independently",
      "Build revenue downside and dilution scenarios",
      "Stress-test MOIC and exit multiples",
    ],
    output:
      "The 3.1x entry multiple is arithmetically sound; 4.3x MOIC depends on revenue delivery and a 5.0x exit multiple.",
  },
};

export function localizeYaojuClaim(
  claim: YaojuClaimNode,
  locale: Locale
): YaojuClaimNode {
  if (locale === "zh-CN") return claim;
  return {
    ...claim,
    branch: translateContentText(claim.branch, locale) as YaojuClaimNode["branch"],
    claim: yaojuClaimText[claim.id] ?? translateContentText(claim.claim, locale),
    priority: translateContentText(
      claim.priority,
      locale
    ) as YaojuClaimNode["priority"],
  };
}

export function localizeYaojuClaims(
  claims: YaojuClaimNode[],
  locale: Locale
): YaojuClaimNode[] {
  return locale === "zh-CN"
    ? claims
    : claims.map((claim) => localizeYaojuClaim(claim, locale));
}

export function localizeYaojuAgent(
  agent: YaojuDemoAgent,
  locale: Locale
): YaojuDemoAgent {
  if (locale === "zh-CN") return agent;
  const copy = yaojuAgentCopy[agent.id];
  return copy ? { ...agent, ...copy } : agent;
}

export function localizeYaojuAgents(
  agents: YaojuDemoAgent[],
  locale: Locale
): YaojuDemoAgent[] {
  return locale === "zh-CN"
    ? agents
    : agents.map((agent) => localizeYaojuAgent(agent, locale));
}

export function localizeYaojuRuntime(
  runtime: YaojuAgentRuntime,
  locale: Locale
): YaojuAgentRuntime {
  if (locale === "zh-CN") return runtime;
  const sourceAgent = YAOJU_AGENTS.find(
    (agent) =>
      agent.assignment === runtime.currentTask ||
      agent.output === runtime.currentTask ||
      agent.steps.includes(runtime.currentTask)
  );
  const copy = sourceAgent ? yaojuAgentCopy[sourceAgent.id] : undefined;
  const stepIndex = sourceAgent?.steps.indexOf(runtime.currentTask) ?? -1;
  const currentTask =
    stepIndex >= 0
      ? copy?.steps[stepIndex]
      : sourceAgent?.assignment === runtime.currentTask
        ? copy?.assignment
        : sourceAgent?.output === runtime.currentTask
          ? copy?.output
          : undefined;
  return {
    ...runtime,
    statusLabel: translateContentText(runtime.statusLabel, locale),
    currentTask: currentTask ?? translateContentText(runtime.currentTask, locale),
  };
}

export function localizeYaojuDocumentName(locale: Locale): string {
  return locale === "en-US"
    ? "Yaoju_Manufacturing_Pre-Investment_Analysis_Report_Mock"
    : "曜矩智造_投前投资分析报告_Mock";
}
