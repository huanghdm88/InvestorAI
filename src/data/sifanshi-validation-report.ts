import type {
  AssistantBlock,
  ChatMessage,
  SourceAnchor,
  VerificationCardItem,
} from "@/src/types";
import { buildCrossValidationProcess } from "@/src/lib/report-process";

/**
 * 第四范式 B 轮「投决文档事实交叉验证」演示数据。
 *
 * 数据源：`第四范式B轮投资备忘录---交叉验证报告 (1).html`
 * - 总验证项：15 项 / R4 0 项 / R3 0 项 / R2 一般风险 11 项 / R1 低风险 4 项
 * - 结论分布：0 不一致 / 2 部分一致 / 10 证据不足 / 3 一致
 *
 * 与「投资备忘录 ⇄ 多源尽调 交叉验证报告」共用同一套渲染（DiligenceReportCard
 * + 目录 + verification-cards），保持视觉/交互一致。
 */

const docMemo = "第四范式 B 轮投资备忘录";
const docFin = "第四范式 财务尽调报告";
const docLegal = "第四范式 法律尽调报告";

const sourceMemo = (page: number, paragraph?: string, excerpt?: string): SourceAnchor => ({
  document: docMemo,
  page,
  paragraph,
  excerpt: excerpt ?? "见投资备忘录原文对应段落。",
});

const sourceFin = (page: number | string, paragraph?: string, excerpt?: string): SourceAnchor => ({
  document: docFin,
  page,
  paragraph,
  excerpt: excerpt ?? "见财务尽调报告对应章节。",
});

const sourceLegal = (page: number | string, paragraph?: string, excerpt?: string): SourceAnchor => ({
  document: docLegal,
  page,
  paragraph,
  excerpt: excerpt ?? "见法律尽调报告对应章节。",
});

/** 投资备忘录中被反复引用的关键页面 —— 作为 citations 索引（1-based 与 [^N] 对应） */
const citations: SourceAnchor[] = [
  sourceMemo(3, "B 轮交易条款", "投前估值 4 亿美元 / 投后 4.35 亿美元，总投资 38,340,582 美元，其中 3,340,582 美元用于受让吴茗 + ESOP 老股；本轮领投方为元生资本，汇率 6.5622。"),
  sourceMemo(5, "招行信用卡中心业务效果", "招行信用卡中心交易分期手续费收入提升 61%、短信营销响应率提升 68%、汽车分期贷款精准营销响应率提升 200-300%。"),
  sourceMemo(4, "创始团队履历", "戴文渊 2009-2013 百度凤巢唯一总架构师 / T10 / 变现能力 4 年 8 倍；2013-2014 华为诺亚方舟实验室主任科学家。"),
  sourceMemo(4, "联合创始人吴茗", "吴茗与戴文渊为夫妻关系，两人已签订一致行动协议，吴茗计划未来两年逐步从公司淡出。"),
  sourceMemo(5, "平台产品发布与定位", "公司第二/新一代平台产品于 2015 年 8 月推出，主要面向银行为主的大型金融机构，帮助每个业务人员都能成为数据科学家。"),
  sourceMemo(6, "行业宏观数据", "2014 年银行业金融机构 5 家国有大行 + 12 家股份行 + 1 家邮储 + 133 家城商行 + 665 家农商行；银行业 IT 投入约 400 亿元；SAS 全球收入 30 亿美元、其中 26% 来自银行。"),
  sourceMemo(5, "招行交易分期合同关键参数", "招行信用卡中心 · 交易分期数据挖掘模型，合同起始日 2015-08-08，签约金额 500,000 元、毛利率 29%。"),
  sourceFin(34, "销售合同审阅清单 · 招行交易分期", "招行交易分期数据挖掘模型 合同起始日 2015-08-06，合同金额 500,000.00 元（与备忘录存在 2 天差异）。"),
  sourceFin(21, "合并利润表（2015 / 2016）", "2015 主营业务收入 452,427、主营业务利润 450,798、管理费用 (6,655,014)；2016 主营业务收入 4,281,028、主营业务成本 (1,011,350)、主营业务利润 3,197,331、营业费用 (7,375,050)、管理费用 (25,807,548)。"),
  sourceFin("17-20", "合并资产负债表（2015 / 2016 / 2017H1）", "货币资金 19,839,403 / 29,846,106 / 30,035,011；短期投资 - / 70,020,000 / 37,820,000；应收账款 - / 450,000 / 3,271,928。"),
  sourceFin(24, "招行上海分行培训合同", "招商银行上海分行 · 培训合同《数据分析道与术》，合同起始日 2015-01-15，合同金额 16,000 元，毛利率 100%。"),
];

/* ----------------------------- R2 一般风险 · 部分一致（1 项） ----------------------------- */
const r2PartialCards: VerificationCardItem[] = [
  {
    index: 1,
    category: "业务数据",
    verdict: "部分一致",
    riskLevel: "R2",
    claim:
      "公司第二/新一代平台产品在 2015 年 8 月份推出，主要面向银行为主的大型金融机构，目标是帮助每个业务人员都能成为数据科学家，大幅度降低数据建模门槛。",
    claimSources: [sourceMemo(5, "平台产品发布与定位", "公司第二/新一代平台产品于 2015 年 8 月推出，主要面向银行为主的大型金融机构。")],
    evidence:
      "对三项子主张的核验结果如下：\n1. **客户以银行为主**：有支持。财务尽调 P12 明确「目标集团客户以大型商业银行为主」；P10 列举招行信用卡中心、招行深圳分行、光大信用卡、中信信用卡等客户，与主张一致。\n2. **2015 年 8 月推出「第二/新一代」平台**：证据不足。法律尽调 P17 显示 2015-08-03 签署《A 轮增资协议》并完成中外合资变更；财务尽调未明确「先知」平台的发布时间，亦未出现「第二/新一代」产品代际表述。\n3. **「帮助业务人员成为数据科学家」**：部分间接支持。财务尽调 P10 提及平台技术服务包含「提供培训（如何建模）」，法律尽调 P7 提及「搭建建模平台 + 数据分析技术服务」，但均未出现「帮助每个业务人员成为数据科学家」的具体表述。",
    evidenceSources: [
      sourceFin(12, "客户结构 · 大型商业银行"),
      sourceFin(10, "业务模式 · 客户列表"),
      sourceFin(9, "平台技术服务范围"),
      sourceLegal(17, "A 轮增资协议签署"),
      sourceLegal(20, "第四范式（北京）成立时间"),
      sourceLegal(7, "技术服务范围"),
    ],
  },
];

/* ----------------------------- R2 一般风险 · 证据不足（10 项） ----------------------------- */
const r2InsufficientCards: VerificationCardItem[] = [
  {
    index: 2,
    category: "融资数据",
    verdict: "证据不足",
    riskLevel: "R2",
    claim:
      "B 轮 Series B Capital Raised 合计 35,000,000 美元；其中元生资本 18,000,000、众为资本 6,000,000、光控众盈 2,000,000、红杉资本 6,168,961.43、创新工场美元三期 951,500.95、创新工场人民币二期 1,520,120.03、领沨资本 359,417.59 美元。",
    claimSources: [sourceMemo(3, "B 轮各方认购明细")],
    evidence:
      "财务尽调 P6-7 历史融资及股权变更汇总仅披露至 A-2 轮：A 轮 SCC USD 3M、A-1 轮 SCC+Sinovation 各 USD 2.1M、A-2 轮 创新工场 + 红杉 + 上海峰上 合计 RMB 8,612 万元；表中未出现 B 轮各投资方明细。法律尽调 P30-36 附件一虽含 B 轮 Term Sheet 优先权对比，但未列各投资方认购金额。结论：当前材料无法支持或反驳，需要 B 轮 SPA、股东协议等原始交易文件。",
    evidenceSources: [
      sourceFin("6-7", "历史融资及股权变更汇总（截至 2017-06-30）"),
      sourceLegal("30-36", "附件一 · 投资人优先权利对比"),
      sourceLegal(18, "股权变更历程 · 截至 A-2 轮"),
    ],
  },
  {
    index: 3,
    category: "融资数据",
    verdict: "证据不足",
    riskLevel: "R2",
    claim:
      "创新工场美元三期基金和人民币二期基金本轮均为 Pro rata；按汇率 6.5622，人民币二期基金 1,520,120 美元等额人民币 9,975,332 元；本轮领投方为元生资本。",
    claimSources: [sourceMemo(3, "Pro rata / 汇率 / 领投方")],
    evidence:
      "已检索财务尽调 P3 / P13、法律尽调 P4 / P37：均仅涉及 A 轮及之前的术语定义、记账错误、投资人列表、商标信息，未覆盖 B 轮 Pro rata 参与、汇率 6.5622、领投方为元生资本等核心信息。文件库内现有尽调材料无法核验该主张。",
    evidenceSources: [
      sourceFin(3, "专业术语及简称汇总"),
      sourceFin(13, "尽职调查发现概要"),
      sourceLegal(4, "第一部分 · 定义（A-1/A-2 投资人）"),
      sourceLegal(37, "知识产权 · 商标注册"),
    ],
  },
  {
    index: 4,
    category: "融资数据",
    verdict: "证据不足",
    riskLevel: "R2",
    claim:
      "第四范式 B 轮融资投前估值 4 亿美元，投后估值 4.35 亿美元；各方总投资金额为 38,340,582 美元，其中 3,340,582 美元用于从联合创始人吴茗和 ESOP 购买老股，其余用于认购新增注册资本。",
    claimSources: [sourceMemo(3, "投前 / 投后估值与老股")],
    evidence:
      "财务尽调 P17/P19（调整后合并资产负债表 + 货币资金/短期投资附注）与法律尽调 P28/P37（商标与租赁清单）均未涉及 B 轮估值与老股转让。内部数学自洽性可作辅助：投后 - 投前 = 3,500 万美元 ≈ 总投 - 老股 = 38,340,582 - 3,340,582 = 35,000,000 美元。仍需调取 B 轮 Term Sheet / SPA 原始文件印证。",
    evidenceSources: [
      sourceFin(17, "调整后合并资产负债表"),
      sourceFin(19, "货币资金 / 短期投资附注"),
      sourceLegal(28, "关键员工清单"),
      sourceLegal(37, "知识产权附件"),
    ],
  },
  {
    index: 5,
    category: "业务数据",
    verdict: "证据不足",
    riskLevel: "R2",
    claim:
      "第四范式机器学习模型在招商银行信用卡中心将交易分期手续费收入提升 61%，短信营销响应率提升 68%，汽车分期贷款精准营销场景营销响应率提升 200-300%。",
    claimSources: [sourceMemo(5, "招行业务效果 · 三组百分比")],
    evidence:
      "财务尽调 P26 应收账款明细 / P33-34 销售合同审阅清单仅能确认招商银行信用卡中心三个项目合同存在（交易分期 50 万、机器学习建模平台 180 万、客户信息先知 135 万），但未提供任何业务成效百分比数据，亦无 A/B Test 报告或客户验收材料。法律尽调 P28/P37 仅含商标与知识产权信息，与业务效果无关。建议补充 AB Test 报告 / 客户验收材料。",
    evidenceSources: [
      sourceFin(26, "应收账款明细 · 招行项目"),
      sourceFin(33, "销售合同审阅清单 · 招行"),
      sourceFin(34, "销售合同审阅清单 · 招行"),
      sourceFin("12-15", "业务模式分析"),
      sourceLegal(28, "知识产权"),
      sourceLegal(37, "知识产权"),
    ],
  },
  {
    index: 6,
    category: "法务合规",
    verdict: "证据不足",
    riskLevel: "R2",
    claim:
      "吴茗与戴文渊是夫妻关系，两人已签订一致行动协议，吴茗也计划未来两年从公司淡出。",
    claimSources: [sourceMemo(4, "联合创始人吴茗 · 三项子主张")],
    evidence:
      "1. **夫妻关系**：法律尽调 P4 仅将戴文渊、吴茗共同定义为「创始股东」；P6 股权结构仅列各自持股比例（37.319% / 35.048%）；P15 工商信息仅列其分别为法定代表人/总经理 / 董事；P28-29 关键员工清单仅列其分别为「首席执行官」/「联合创始人」。均未说明两人为夫妻/配偶。\n2. **一致行动协议**：法律尽调 P7-10 提及戴/吴与公司及第四范式（北京）签署的「控制协议」（独家业务合作 / 股权质押 / 独家购买权 / 授权委托书），是 VIE 架构下的协议控制文件，与创始人之间针对股东会/董事会表决的「一致行动协议」在法律性质上不同，不应混淆。\n3. **未来两年淡出**：法律尽调 P28-29 仍将吴茗列为「联合创始人」，P15 列其为公司董事；P29 仅提及吴茗代持 ESOP 对应 308 万元注册资本，计划转让至持股平台，未提及其本人淡出时间表。三项主张当前材料均证据不足。",
    evidenceSources: [
      sourceLegal(4, "第一部分 · 定义（创始股东）"),
      sourceLegal(6, "股权结构表"),
      sourceLegal(7, "控制协议 · 独家业务合作"),
      sourceLegal(8, "控制协议 · 股权质押"),
      sourceLegal(9, "控制协议 · 独家购买权"),
      sourceLegal(10, "控制协议 · 授权委托书"),
      sourceLegal(11, "VIE 结构 · 协议控制"),
      sourceLegal(15, "公司工商信息 · 董监高"),
      sourceLegal(28, "关键员工清单"),
      sourceLegal(29, "员工激励 · ESOP 代持"),
      sourceLegal(37, "知识产权附件"),
      sourceFin(6, "股权结构与历史融资"),
      sourceFin(7, "股权结构与历史融资"),
    ],
  },
  {
    index: 7,
    category: "市场行业",
    verdict: "证据不足",
    riskLevel: "R2",
    claim: "2014 年中国银行业 IT 投入规模在 400 亿元左右。",
    claimSources: [sourceMemo(6, "银行业 IT 投入规模")],
    evidence:
      "财务尽调 P7、P19 与法律尽调 P16、P19 仅涉及目标公司历史融资、股权结构、资产负债表、公司沿革等内部信息，文件库内不包含任何银行业 IT 投入规模等行业宏观数据，无法支持或反驳该主张。建议补充 IDC / Gartner / 银监会等行业研报。",
    evidenceSources: [
      sourceFin(7, "历史融资及股权变更"),
      sourceFin(19, "合并资产负债表"),
      sourceLegal(16, "公司历史沿革"),
      sourceLegal(19, "股权结构 / 验资报告"),
    ],
  },
  {
    index: 8,
    category: "市场行业",
    verdict: "证据不足",
    riskLevel: "R2",
    claim: "SAS 作为类比对象，去年（备忘录撰写前）全球收入 30 亿美元，其中 26% 的收入来自银行。",
    claimSources: [sourceMemo(6, "SAS 类比数据")],
    evidence:
      "财务尽调 P17/P20 与法律尽调 P20/P45 检索到的内容均为目标公司（第四范式）的资产负债表、货币资金、租赁合同与工商信息，文件库中没有任何关于 SAS 公司全球收入或行业收入结构的数据。建议补充 SAS 公开年报 / IR 资料。",
    evidenceSources: [
      sourceFin(17, "合并资产负债表"),
      sourceFin(20, "货币资金 / 短期投资附注"),
      sourceLegal(20, "公司工商信息"),
      sourceLegal(45, "租赁合同清单"),
    ],
  },
  {
    index: 9,
    category: "市场行业",
    verdict: "证据不足",
    riskLevel: "R2",
    claim:
      "截至 2014 年底，我国银行业金融机构包括 5 家大型商业银行、12 家股份制商业银行、1 家邮政储蓄银行、133 家城市商业银行、665 家农村商业银行、89 家农村合作银行、1,596 家农村信用社。",
    claimSources: [sourceMemo(6, "2014 年银行业金融机构构成")],
    evidence:
      "财务尽调 P7、P27 仅涉及目标集团历史融资及经营费用分析；法律尽调 P17、P18 仅涉及历次增资和股权转让详情。文件库未包含银监会 / CBIRC 年报或行业统计数据等可用于交叉验证的来源，无法核验。建议补充银监会 / CBIRC 公开数据。",
    evidenceSources: [
      sourceFin(7, "历史融资及股权变更"),
      sourceFin(27, "经营费用分析"),
      sourceLegal(17, "历次增资详情"),
      sourceLegal(18, "股权转让详情"),
    ],
  },
  {
    index: 10,
    category: "团队治理",
    verdict: "证据不足",
    riskLevel: "R2",
    claim:
      "销售总监张宇在 IBM 期间曾带领 IBM 金融团队实现 IBM 在中国最大的单笔订单 1.7 亿美元，管理中国银行信用卡中心业务 5 年累计签署 8000 万美元销售合同；在思科期间连续 5 个财年保持超额完成销售业绩及 2 位数年度业绩增长。",
    claimSources: [sourceMemo(4, "销售总监张宇履历")],
    evidence:
      "财务尽调 P1（封面）/ P3（术语汇总）、法律尽调 P1（致函免责声明）/ P9（VIE 协议控制分析）均未涉及核心团队个人履历。张宇 IBM/思科销售业绩属个人履历背景，需要人事尽调报告、背景调查材料或简历等独立来源进行交叉验证。",
    evidenceSources: [
      sourceFin(1, "封面"),
      sourceFin(3, "术语汇总"),
      sourceLegal(1, "致函与免责声明"),
      sourceLegal(9, "VIE 结构与协议控制"),
    ],
  },
  {
    index: 11,
    category: "团队治理",
    verdict: "证据不足",
    riskLevel: "R2",
    claim:
      "创始人戴文渊 2009-2013 年就职于百度，是百度凤巢唯一的总架构师，技术级别 T10，是最年轻的百度高级科学家，把百度的变现能力 4 年提升了 8 倍；2013-2014 年就职于华为，诺亚方舟实验室主任科学家。",
    claimSources: [sourceMemo(4, "戴文渊百度 / 华为履历")],
    evidence:
      "法律尽调 P29 关键员工清单仅列示戴文渊职位为「首席执行官」，未披露百度凤巢、T10、华为诺亚方舟等任职细节；P6-7 仅涉及股权结构。财务尽调 P6-7 仅涉及股权结构（戴文渊持股 37.32%）与历史融资，未涉及创始人履历。两份尽调材料均未找到关于「百度凤巢总架构师」「T10」「变现能力 4 年 8 倍」「华为诺亚方舟主任科学家」等表述。建议补充第三方背景调查或公开履历印证。",
    evidenceSources: [
      sourceLegal(29, "关键员工清单 · 戴文渊"),
      sourceLegal(6, "股权结构"),
      sourceLegal(7, "股权结构"),
      sourceFin(6, "股权结构"),
      sourceFin(7, "股权结构"),
    ],
  },
];

/* ----------------------------- R1 低风险 · 部分一致（1 项） ----------------------------- */
const r1PartialCards: VerificationCardItem[] = [
  {
    index: 12,
    category: "客户数据",
    verdict: "部分一致",
    riskLevel: "R1",
    claim:
      "招行信用卡中心交易分期数据挖掘模型合同起始日 2015 年 8 月 8 日，合同金额 500,000 元，审阅期间收入 485,437 元，审阅期间成本 (342,681) 元，毛利 142,756 元，毛利率 29%。",
    claimSources: [sourceMemo(5, "招行交易分期合同关键参数")],
    evidence:
      "1. **合同起始日**：财务尽调 P34 记载为 **2015 年 8 月 6 日**，与备忘录的 **2015 年 8 月 8 日** 存在 2 天差异。\n2. **合同金额**：500,000 元 一致 ✓\n3. **签约客户**：「招商银行股份有限公司信用卡中心」一致 ✓\n4. **签约项目**：交易分期数据挖掘模型 一致 ✓\n5. 财务尽调 P32-34 销售合同审阅清单仅列示合同层面的签约金额 / 起始日 / 付款批次，未含单合同收入/成本/毛利数据，无法直接核验。\n6. 内部一致性校验：142,756 ÷ 485,437 ≈ 29.4%，与备忘录标注的「29%」基本吻合（四舍五入）。\n建议：在投决前澄清合同起始日口径（2015-08-06 vs 2015-08-08），其余金额与口径无实质性差异。",
    evidenceSources: [
      sourceFin(34, "销售合同审阅清单 · 招行交易分期"),
      sourceFin("32-33", "销售合同审阅清单 · 招行"),
    ],
  },
];

/* ----------------------------- R1 低风险 · 一致（3 项） ----------------------------- */
const r1ConsistentCards: VerificationCardItem[] = [
  {
    index: 13,
    category: "财务数据",
    verdict: "一致",
    riskLevel: "R1",
    claim:
      "合并资产负债表 2015/12/31 货币资金 19,839,403 元、固定资产净值 454,098 元；2016/12/31 货币资金 29,846,106 元、短期投资 70,020,000 元、应收账款 450,000 元；2017/6/30 货币资金 30,035,011 元、短期投资 37,820,000 元、应收账款 3,271,928 元。",
    claimSources: [sourceMemo(7, "合并资产负债表关键科目")],
    evidence:
      "财务尽调 P17-20 合并资产负债表逐项核对：\n• 货币资金 2015/12 19,839,403 ✓ / 2016/12 29,846,106 ✓ / 2017H1 30,035,011 ✓\n• 短期投资 2016/12 70,020,000 ✓ / 2017H1 37,820,000 ✓\n• 应收账款 2016/12 450,000 ✓ / 2017H1 3,271,928 ✓（与 P26 应收账款账龄及回款分析表合计一致）\n• 固定资产净值 2015/12 454,098 ✓（由原值 476,417 减累计折旧 22,319 得出）\n所有期间 - 指标 - 数值完全一致，无任何差异。",
    evidenceSources: [
      sourceFin(17, "合并资产负债表 2015/12"),
      sourceFin(18, "合并资产负债表 2016/12"),
      sourceFin(26, "应收账款账龄及回款分析"),
    ],
  },
  {
    index: 14,
    category: "财务数据",
    verdict: "一致",
    riskLevel: "R1",
    claim:
      "合并利润表 2015 年主营业务收入 452,427 元、主营业务利润 450,798 元、管理费用 (6,655,014) 元；2016 年主营业务收入 4,281,028 元、主营业务成本 (1,011,350) 元、主营业务利润 3,197,331 元、营业费用 (7,375,050) 元、管理费用 (25,807,548) 元。",
    claimSources: [sourceMemo(6, "合并利润表关键科目")],
    evidence:
      "财务尽调 P21 合并利润表逐项核对，所有数字（主营业务收入、主营业务成本、主营业务利润、营业费用、管理费用）的指标名称、期间归属、金额与单位均完全一致。P23 经营数据分析中 2015 / 2016 营收与成本数据吻合；P27 经营费用分析中管理费用明细合计也与备忘录一致（2015 年管理 6,655,014 + 营业 411,168 = 7,066,182；2016 年管理 25,807,548 + 营业 7,375,050 = 33,182,598）。",
    evidenceSources: [
      sourceFin(21, "合并利润表"),
      sourceFin(23, "经营数据分析"),
      sourceFin(27, "经营费用分析"),
    ],
  },
  {
    index: 15,
    category: "客户数据",
    verdict: "一致",
    riskLevel: "R1",
    claim:
      "招行上海分行培训合同《数据分析道与术》合同起始日 2015 年 1 月 15 日，合同金额 16,000 元，审阅期间收入 15,534 元，毛利 15,534 元，毛利率 100%。",
    claimSources: [sourceMemo(5, "招行上海分行培训合同")],
    evidence:
      "财务尽调 P24《已签约销售合同情况汇总》明确记录：「招行上海分行 - 培训合同《数据分析道与术》」起始日 2015-01-15、金额 16,000、审阅期间收入 15,534、成本 -、毛利 15,534、毛利率 100%。P34《销售合同审阅清单》对应「招商银行股份有限公司上海分行信息技术部」培训合同、起始日与签约金额均一致。两处证据与备忘录主张完全吻合。",
    evidenceSources: [
      sourceFin(24, "已签约销售合同情况汇总"),
      sourceFin(34, "销售合同审阅清单"),
    ],
  },
];

/* ----------------------------- DiligenceReport 主结构 ----------------------------- */
const sifanshiValidationReport: AssistantBlock = {
  kind: "diligence-report",
  title: "第四范式 B 轮投资备忘录---交叉验证报告",
  company: "第四范式（4Paradigm）",
  summary:
    "本次交叉验证以《第四范式财务尽调报告》和《第四范式法律尽调报告》为核心证据库，围绕《第四范式 B 轮投资备忘录》提出的 **15 项关键主张** 进行了系统核验。整体来看，在已加载的尽调材料中 **未发现可直接归为 R4 否决风险的硬性事实矛盾**，同时亦未识别出归为 R3 重大风险的验证项。本轮最高等级风险为 **R2 一般风险 11 项**——集中分布于 B 轮交易条款、关键业务效果数据、核心团队履历与行业宏观数据四大类，均呈现「当前材料未见充分证据」的状态，需在投决前补充独立来源核验[^1][^2][^3][^4][^5][^6]。此外 **1 项招行信用卡中心交易分期数据挖掘模型** 的合同起始日存在 2 天轻微差异，需澄清。",
  verdict: {
    recommendation: "建议补充核验后再决",
    riskLevel: "R2",
    valuation: "估值待印证",
  },
  metrics: [
    { label: "已执行验证项", value: "15", sub: "本轮全部完成", tone: "neutral" },
    { label: "不一致", value: "0", sub: "无相互冲突主张", tone: "positive" },
    { label: "部分一致", value: "2", sub: "口径 / 日期轻微差异", tone: "warning" },
    { label: "证据不足", value: "10", sub: "需补外部佐证", tone: "neutral" },
    { label: "一致", value: "3", sub: "财务底盘扎实", tone: "positive" },
    { label: "R2 一般风险", value: "11", sub: "需重点补证", tone: "warning" },
  ],
  sections: [
    {
      id: "overview",
      title: "1. 验证概览与风险分布",
      tone: "neutral",
      content: [
        {
          type: "paragraph",
          text:
            "本次交叉验证以《第四范式财务尽调报告》《第四范式法律尽调报告》为核心证据库，围绕《第四范式 B 轮投资备忘录》提出的 **15 项关键主张** 做多源交叉印证。已加载的尽调材料中 **未发现可直接归为 R4 否决风险的硬性事实矛盾**，亦未识别出 R3 重大风险；本轮最高等级风险为 **R2 一般风险 11 项**，集中分布于 B 轮交易条款 / 关键业务效果数据 / 核心团队履历 / 行业宏观数据四大类[^1][^2][^3][^5][^6]。",
        },
        {
          type: "bars",
          caption: "结论分布（共 15 项）",
          items: [
            { label: "一致", value: 20, display: "3 项 · 20%", tone: "positive" },
            { label: "部分一致", value: 13, display: "2 项 · 13%", tone: "warning" },
            { label: "证据不足", value: 67, display: "10 项 · 67%", tone: "neutral" },
            { label: "不一致", value: 0, display: "0 项 · 0%", tone: "danger" },
          ],
        },
        {
          type: "bars",
          caption: "风险等级分布（共 15 项）",
          items: [
            { label: "R4 否决风险", value: 0, display: "0 项", tone: "danger" },
            { label: "R3 重大风险", value: 0, display: "0 项", tone: "danger" },
            { label: "R2 一般风险", value: 73, display: "11 项 · 73%", tone: "warning" },
            { label: "R1 低风险", value: 27, display: "4 项 · 27%", tone: "positive" },
          ],
        },
      ],
    },
    {
      id: "top-risks",
      title: "2. 关键风险项 TOP 7",
      tone: "warning",
      content: [
        {
          type: "paragraph",
          text:
            "未识别 R4 否决性风险，亦未识别 R3 重大风险。以下为按金融影响 / 核验缺口严重度排序的 TOP 7 重点复核项，建议在投决前补充独立来源核验。",
        },
        {
          type: "bullets",
          ordered: true,
          items: [
            "**B 轮融资核心交易条款全部证据不足（R2 · 证据不足）**：投前估值 4 亿美元 / 投后 4.35 亿美元、总投资 38,340,582 美元、老股转让 3,340,582 美元、Series B Capital Raised 35,000,000 美元及逐方认购金额、汇率 6.5622 及领投方为元生资本等本轮交易核心参数，当前财务尽调（融资汇总仅覆盖至 A-2 轮）和法律尽调（仅含 B 轮投资人优先权利对比）均未涵盖，需补充 B 轮 Term Sheet / SPA / 股东协议印证[^1]。",
            "**招行信用卡中心业务效果百分比数据证据不足（R2 · 证据不足）**：交易分期手续费收入提升 61%、短信营销响应率提升 68%、汽车分期精准营销响应率提升 200-300% 三项业务成效数据，财务尽调 P32-34 销售合同审阅清单仅能确认 2015-2017 年相关项目合同存在，未提供任何业务效果百分比数据，亦未见 AB Test 报告 / 客户验收材料，建议补充[^2]。",
            "**核心团队成员个人履历背景证据不足（R2 · 证据不足）**：戴文渊「百度凤巢唯一总架构师 / T10 / 变现能力 4 年 8 倍 / 华为诺亚方舟主任科学家」、张宇「IBM 1.7 亿美元最大单笔订单 / 5 年累计 8000 万美元 / 思科连续 5 财年双位数增长」等任职经历及业绩主张，当前材料均未见充分证据，需第三方背景调查 / 高管简历 / 人事尽调印证[^3]。",
            "**联合创始人吴茗相关法律安排证据不足（R2 · 证据不足）**：夫妻关系认定、一致行动协议、未来两年淡出三项子主张，当前法律尽调与财务尽调均未提供明确支持或否认。特别需注意：法律尽调 P7-10 的「控制协议」系 VIE 架构下的协议控制文件（独家业务合作 / 股权质押 / 独家购买权 / 授权委托书），与「一致行动协议」在法律性质上不同，**不应混淆**[^4]。",
            "**平台产品发布时间及定位部分一致（R2 · 部分一致）**：客户以银行为主的定位有支持；但「2015 年 8 月推出第二/新一代平台」的具体时点存疑——尽调材料中 2015 年 8 月仅与 A 轮增资协议签署及变更为中外合资企业相关；财务尽调未明确「先知」平台发布时间，亦未出现「第二/新一代」产品代际概念[^5]。",
            "**行业宏观与对标公司数据证据不足（R2 · 证据不足）**：2014 年银行业机构构成、银行业 IT 400 亿元、SAS 全球 30 亿美元（26% 来自银行）等市场类比数据均属外部宏观/对标公司数据，尽调材料中未见任何相关引用，需补充银监会 / CBIRC 年报、IDC / Gartner 行业报告、SAS 年报等独立公开来源[^6]。",
            "**招行信用卡交易分期合同起始日 2 天轻微差异（R1 · 部分一致）**：财务尽调 P34 记载起始日为 2015-08-06，与备忘录的 2015-08-08 存在 2 天差异；合同金额 500,000 元、签约主体、项目名称均一致；毛利率 142,756 / 485,437 ≈ 29.4% 经内部自洽校验通过。建议在投决前澄清日期口径[^7][^8]。",
          ],
        },
      ],
    },
    {
      id: "r2-partial",
      title: "3. R2 一般风险 · 部分一致（1 项）",
      tone: "warning",
      content: [
        {
          type: "verification-cards",
          items: r2PartialCards,
        },
      ],
    },
    {
      id: "r2-insufficient",
      title: "4. R2 一般风险 · 证据不足（10 项）",
      tone: "neutral",
      content: [
        {
          type: "verification-cards",
          items: r2InsufficientCards,
        },
      ],
    },
    {
      id: "r1-partial",
      title: "5. R1 低风险 · 部分一致（1 项）",
      tone: "positive",
      content: [
        {
          type: "verification-cards",
          items: r1PartialCards,
        },
      ],
    },
    {
      id: "r1-consistent",
      title: "6. R1 低风险 · 一致（3 项）",
      tone: "positive",
      defaultOpen: false,
      content: [
        {
          type: "verification-cards",
          items: r1ConsistentCards,
        },
      ],
    },
    {
      id: "conclusion",
      title: "7. 复核结论与下一步建议",
      tone: "warning",
      content: [
        {
          type: "callout",
          tone: "warning",
          title: "整体复核结论",
          text:
            "**建议补充核验后再决** —— 未识别 R4 / R3 风险，财务数据底盘扎实；但本轮 **11 项 R2 风险** 高度集中于交易条款 / 业务效果 / 团队履历 / 行业宏观四类，且均呈「当前材料未见充分证据」状态，需在投决前补齐独立来源印证，避免投决核心论据缺乏可追溯依据。",
        },
        {
          type: "bullets",
          items: [
            "**优先调取 B 轮原始交易文件**：Term Sheet / SPA / 股东协议 / 各方认购份额表，逐项印证投前 4 亿美元 / 投后 4.35 亿美元、总投资 38.34M 美元、汇率 6.5622、领投方为元生资本等核心参数；",
            "**补充业务效果客观证据**：要求公司提供招行信用卡中心 61% / 68% / 200-300% 业务效果的 AB Test 报告、客户验收报告或运营数据，避免以营销口径替代财务事实；",
            "**第三方背景调查**：对戴文渊、张宇等核心团队成员的百度 / 华为 / IBM / 思科任职经历及业绩做独立背调，必要时通过持牌背调机构出具报告；",
            "**法律层面澄清吴茗安排**：要求出具夫妻关系证明 + 真正意义上的「创始人一致行动协议」（区别于 VIE 控制协议）+ 淡出时间表书面安排，并完成董事会成员变更登记；",
            "**澄清招行交易分期合同起始日**：以双方原合同盖章页为准统一为 2015-08-06 或 2015-08-08，避免在交割文件中出现日期歧义；",
            "**补充行业宏观对标数据来源**：银监会 2014 年银行业金融机构统计、IDC / Gartner 银行 IT 投入测算、SAS 公开年报，增强投决论据可信度。",
          ],
        },
      ],
    },
  ],
  citations,
};

export { sifanshiValidationReport };

export const sifanshiValidationReportMessages: ChatMessage[] = [
  {
    id: "m-sifanshi-val-user-1",
    role: "user",
    text: "对投资备忘录的内容进行事实交叉验证",
    mode: "fact-check",
    attachments: [{ name: "第四范式B轮投资备忘录.pdf", size: "3.2 MB", kind: "pdf" }],
    createdAt: "2026-06-11T09:42:10+08:00",
  },
  {
    id: "m-sifanshi-val-user-2",
    role: "user",
    text: "帮我检查投决报告",
    mode: "fact-check",
    attachments: [{ name: "第四范式B轮投资备忘录.pdf", size: "3.2 MB", kind: "pdf" }],
    createdAt: "2026-06-11T09:42:32+08:00",
  },
  {
    id: "m-sifanshi-val-assistant-1",
    role: "assistant",
    createdAt: "2026-06-11T09:45:00+08:00",
    blocks: [
      {
        kind: "report-process",
        process: buildCrossValidationProcess({
          projectName: "第四范式 B 轮",
          documentCount: 3,
          candidateCount: 29,
          claimCount: 15,
          outcomes: {
            consistent: 3,
            partial: 2,
            insufficient: 10,
            inconsistent: 0,
          },
        }),
        progress: 100,
        status: "completed",
      },
      {
        kind: "text",
        text:
          "投决文档交叉验证报告\n\n已完成投决文档交叉验证核查。\n\n报告产物：https://file-investment.lingyiwanwu.com/report/validation/2026/06/11/283774c6-f007-483a-b742-e3724adc6fc6.html",
      },
    ],
  },
  {
    id: "m-sifanshi-val-user-3",
    role: "user",
    text: "帮我检查投决报告 第四范式B轮投资备忘录.pdf",
    mode: "fact-check",
    attachments: [{ name: "第四范式B轮投资备忘录.pdf", size: "3.2 MB", kind: "pdf" }],
    createdAt: "2026-06-11T09:47:00+08:00",
  },
  {
    id: "m-sifanshi-val-assistant-2",
    role: "assistant",
    createdAt: "2026-06-11T09:48:30+08:00",
    blocks: [
      {
        kind: "report-process",
        process: buildCrossValidationProcess({
          projectName: "第四范式 B 轮",
          documentCount: 3,
          candidateCount: 29,
          claimCount: 15,
          outcomes: {
            consistent: 3,
            partial: 2,
            insufficient: 10,
            inconsistent: 0,
          },
        }),
        progress: 100,
        status: "completed",
      },
      sifanshiValidationReport,
    ],
  },
];
