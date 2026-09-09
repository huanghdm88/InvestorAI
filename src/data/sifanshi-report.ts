import type {
  AssistantBlock,
  ChatMessage,
  SourceAnchor,
  VerificationCardItem,
} from "@/src/types";
import { buildCrossValidationProcess } from "@/src/lib/report-process";

/**
 * 第四范式 B 轮「投资备忘录 ⇄ 多源尽调」交叉验证报告演示数据。
 * 章节框架与正文内容对齐《第四范式 B 轮投资备忘录---交叉验证报告》HTML 原文。
 * 与海致科技复核报告一致，采用 DiligenceReport 结构：顶部 KPI + 章节折叠 + 目录滚动联动；
 * 新增「verification-cards」内容块用于把原 HTML 的单行验证项以卡片形式呈现。
 *
 * 正文中的 [^N] 与 citations 数组 1-based 序号对应。
 */

/** 三份核心尽调材料 + 投资备忘录的公共锚点（按文档维度去重） */
const docMemo = "第四范式 B 轮投资备忘录";
const docFin = "第四范式 财务尽调报告";
const docLegal = "第四范式 法律尽调报告";

const sourceMemo = (page: number, paragraph?: string, excerpt?: string): SourceAnchor => ({
  document: docMemo,
  page,
  paragraph,
  excerpt: excerpt ?? "见投资备忘录原文对应段落。",
});

const sourceFin = (page: number, paragraph?: string, excerpt?: string): SourceAnchor => ({
  document: docFin,
  page,
  paragraph,
  excerpt: excerpt ?? "见财务尽调报告对应章节。",
});

const sourceLegal = (page: number, paragraph?: string, excerpt?: string): SourceAnchor => ({
  document: docLegal,
  page,
  paragraph,
  excerpt: excerpt ?? "见法律尽调报告对应章节。",
});

const citations: SourceAnchor[] = [
  {
    document: docMemo,
    page: 14,
    paragraph: "目标公司业务性质 / 销项税率",
    excerpt:
      "目标公司的业务更接近软件销售，销项税率为 17%，但实际申报按 6% 技术服务税率缴纳。",
    highlight: ["6%", "17%", "软件销售"],
  },
  {
    document: docFin,
    page: 31,
    paragraph: "目标集团存在的税务问题",
    excerpt:
      "北京第四范式将全部业务都以技术服务咨询缴纳 6% 的销项税，但其业务实质更接近于软件销售，而软件销售的销项税率为 17%，因此存在合规性问题。",
    highlight: ["6%", "17%", "合规性问题"],
  },
  {
    document: docLegal,
    page: 9,
    paragraph: "协议控制 / 境内 IPO 障碍",
    excerpt:
      "协议控制的模式可能很难被中国证券主管部门所认可，从而导致公开发行并上市存在较大障碍，需要进一步调整协议控制结构。",
    highlight: ["难以被中国证券主管部门所认可", "较大障碍"],
  },
  {
    document: docLegal,
    page: 7,
    paragraph: "公司对第四范式（北京）控制权瑕疵",
    excerpt:
      "戴文渊（51%）和吴茗（49%）于 2015 年 11 月签署《股权转让合同》，约定以 1 元价格将第四范式（北京）100% 股权转让给深圳第四范式，但未经股东会决议、章程未变更、未办理工商登记。",
    highlight: ["1 元", "未经股东会决议", "未办理工商登记"],
  },
  {
    document: docFin,
    page: 31,
    paragraph: "1 元对价个税风险",
    excerpt:
      "该价格不符合公允价值，未来可能会被税务局及工商机关质疑，并要求其按公允价值缴纳个人所得税。",
    highlight: ["1 元", "公允价值", "个人所得税"],
  },
  {
    document: docLegal,
    page: 10,
    paragraph: "ICP 证 / 增值电信业务许可证",
    excerpt:
      "第四范式（北京）SaaS 业务可能需取得第二类增值电信业务中的信息服务业务（仅限互联网信息服务）许可证，未取得 ICP 证可能面临 10 万-100 万元罚款或责令关闭网站。",
    highlight: ["ICP 证", "10 万-100 万元", "关闭网站"],
  },
  {
    document: docMemo,
    page: 6,
    paragraph: "A 轮 / A-1 轮投资款金额（备忘录口径）",
    excerpt:
      "A 轮 SCC 投资 300 万美元、A-1 轮 SCC 240 万美元、Sinovation 210 万美元；与法律尽调依据《增资协议》口径（A 轮 SCC 400 万美元 / A-1 轮 SCC 210 万美元）存在差异。",
    highlight: ["300 万美元", "240 万美元", "210 万美元"],
  },
  {
    document: docLegal,
    page: 14,
    paragraph: "A 轮 / A-1 轮投资款金额（《增资协议》口径）",
    excerpt:
      "根据正式增资协议记载：A 轮 SCC 为 400 万美元、A-1 轮 SCC 为 210 万美元、Sinovation 为 140 万美元。",
    highlight: ["400 万美元", "210 万美元", "140 万美元"],
  },
  {
    document: docMemo,
    page: 11,
    paragraph: "前十大客户合同金额（2017 年 1-6 月口径）",
    excerpt:
      "2017 年 1-6 月合同金额合计 10,464,970 元（含 2017 年 7 月签约的长安融资租赁 600 万元项目，实际为「截至 2017 年 7 月」口径）。",
    highlight: ["10,464,970 元", "600 万元"],
  },
  {
    document: docFin,
    page: 14,
    paragraph: "高管 200 万元无息购房借款（其他应收款）",
    excerpt:
      "目标集团存在高管向公司无息借款用于私人买房，截至 2017 年 6 月 30 日借款余额 200 万元，未取得书面合同、无明确还款期限。",
    highlight: ["200 万元", "无息", "未取得书面合同"],
  },
  {
    document: docFin,
    page: 23,
    paragraph: "社保历史少缴累计（836 万元）",
    excerpt:
      "目标集团 2015、2016、2017H1 累计社保少缴约 836 万元，已于 2017 年 7 月起按合规口径整改。",
    highlight: ["836 万元", "2017 年 7 月起整改"],
  },
  {
    document: docMemo,
    page: 2,
    paragraph: "招商银行信用卡中心效果",
    excerpt:
      "在招商银行信用卡中心的线上产品中，能比招行研究多年的专家规则模型效果提升 60% 以上。",
    highlight: ["60% 以上"],
  },
  {
    document: docMemo,
    page: 6,
    paragraph: "市场行业数据 / 竞品",
    excerpt:
      "SAS 去年全球收入 30 亿美元，其中 26% 来自银行；2014 年银行业 IT 投入约 400 亿元；国内尚无完全同类型竞争对手。",
    highlight: ["30 亿美元", "400 亿元", "26%"],
  },
  {
    document: docLegal,
    page: 12,
    paragraph: "A-2 轮交割后承诺 / 4paradigm.cn 域名归属",
    excerpt:
      "顾问杨强未按约定签署保密协议；4paradigm.cn 域名由第三方范继洪注册，公司暂未计划收购；'第四范式' 商标已实际转给第四范式（北京）。",
    highlight: ["未签署保密协议", "4paradigm.cn", "第三方范继洪"],
  },
  {
    document: docMemo,
    page: 4,
    paragraph: "联合创始人前任职履历",
    excerpt:
      "陈雨强加入第四范式之前任今日头条推荐系统负责人；胡时伟加入第四范式之前任链家网总架构师。",
    highlight: ["今日头条推荐系统负责人", "链家网总架构师"],
  },
];

/** ----------- R3 重大风险 · 一致项（共 6 项） ----------- */
const r3Cards: VerificationCardItem[] = [
  {
    index: 1,
    category: "法务合规",
    verdict: "一致",
    riskLevel: "R3",
    claim:
      "北京第四范式全部业务以技术服务名义申报增值税并缴纳 6% 销项税，但审阅认为其业务更接近软件销售（销项税率 17%），存在被税务机关稽查并补缴税款差额的合规风险。",
    claimSources: [sourceMemo(14, "目标公司业务性质 / 销项税率")],
    evidence:
      "财务尽调报告 P31 在「目标集团存在的税务问题」第 2 点（发现问题#6）明确指出：北京第四范式将全部业务以技术服务咨询缴纳 6% 销项税，但业务实质更接近软件销售（销项税率 17%），存在合规性问题。法律尽调对业务模式描述（传统软件销售/服务模式及 SaaS 业务模式）与财务尽调认定相互印证。",
    evidenceSources: [
      sourceFin(31, "目标集团存在的税务问题"),
      sourceLegal(10, "业务模式 / 增值电信业务许可证"),
    ],
  },
  {
    index: 2,
    category: "法务合规",
    verdict: "一致",
    riskLevel: "R3",
    claim:
      "北京第四范式将全部业务以技术服务咨询缴纳 6% 销项税，但业务实质更接近软件销售（销项税率 17%），存在合规性问题。",
    claimSources: [sourceMemo(31, "税务问题")],
    evidence:
      "财务尽调报告 P31 在「目标集团存在的税务问题」部分原文记载：销项税税务风险（发现问题#6）：业务实质更接近于软件销售，销项税率应为 17%，存在合规性问题。表述方式、税率、业务实质判断与备忘录主张完全一致。",
    evidenceSources: [sourceFin(31, "销项税税务风险（发现问题#6）")],
  },
  {
    index: 3,
    category: "法务合规",
    verdict: "一致",
    riskLevel: "R3",
    claim:
      "如公司计划在中国境内证券交易市场公开发行并上市，通过协议控制对第四范式（北京）实现控制的模式可能难以被中国证券主管部门认可，存在较大障碍。",
    claimSources: [sourceMemo(9, "协议控制 / 境内 IPO 障碍")],
    evidence:
      "汉坤律师事务所《第四范式法律尽调报告》P9 明确指出：协议控制模式作为过渡阶段方式，若计划境内 A 股 IPO，将存在较大障碍，届时需调整协议控制结构（外资股东调整、转股或退出，公司收购第四范式（北京））。P7-8 同时说明控制权瑕疵的背景及建议签署一系列控制协议的方案。",
    evidenceSources: [
      sourceLegal(9, "协议控制 / 境内 IPO 障碍"),
      sourceLegal(7, "控制权瑕疵背景"),
      sourceLegal(8, "控制协议方案"),
    ],
  },
  {
    index: 4,
    category: "法务合规",
    verdict: "一致",
    riskLevel: "R3",
    claim:
      "戴文渊和吴茗以 1 元价格将其持有的北京第四范式全部股权转让至深圳第四范式（2015 年 11 月签署《股权转让合同》），价格不符合公允价值，存在被税务机关要求按公允价值缴纳个人所得税的风险。",
    claimSources: [sourceMemo(31, "股权转让个税"), sourceMemo(6, "股权转让合同")],
    evidence:
      "财务尽调报告 P31 明确：戴文渊和吴茗以 1 元价格转让北京第四范式股权至深圳第四范式，价格不符合公允价值，未来可能被税务局质疑并要求按公允价值缴纳个人所得税（发现问题#1）。法律尽调 P6-7 确认 2015.11 签署《股权转让合同》并将此列为重要性「高」的主要法律问题，建议作为交割前提条件签署解除协议。",
    evidenceSources: [
      sourceFin(31, "股权转让个税（发现问题#1）"),
      sourceLegal(6, "1 元股权转让"),
      sourceFin(6, "股权转让协议尚未工商变更"),
    ],
  },
  {
    index: 5,
    category: "法务合规",
    verdict: "一致",
    riskLevel: "R3",
    claim:
      "公司部分业务由第四范式（北京）运营，公司对第四范式（北京）的控制存在瑕疵：股权转让未经股东会决议批准、章程未变更、未办理工商登记；集团绝大部分知识产权（域名、商标、专利、软件著作权）均登记在第四范式（北京）名下。",
    claimSources: [sourceMemo(7, "控制权瑕疵 / 知识产权登记主体")],
    evidence:
      "法律尽调报告 P7-8 明确：1 元股权转让未经股东会决议、章程未变更、未办理工商登记。P28 进一步列举：第四范式（北京）持有 5 个注册商标和 18 个在申请商标、7 个软件著作权、21 个在申请专利、3 个在申请国际专利；而第四范式仅持有 2 个软件著作权。财务尽调 P6-7 亦确认股权转让协议已签订但未做工商变更。",
    evidenceSources: [
      sourceLegal(7, "控制权瑕疵"),
      sourceLegal(8, "建议控制协议"),
      sourceLegal(28, "知识产权登记主体"),
      sourceFin(6, "股权转让未工商变更"),
      sourceFin(7, "财务影响"),
    ],
  },
  {
    index: 6,
    category: "法务合规",
    verdict: "一致",
    riskLevel: "R3",
    claim:
      "第四范式（北京）未取得《增值电信业务经营许可证》，其 SaaS 业务可能需取得第二类增值电信业务中的信息服务业务（仅限互联网信息服务）许可证；未取得 ICP 证可面临 10 万-100 万元罚款或责令关闭网站。中外合资取得 ICP 证要求外方出资比例不超过 50% 并需具备运营业绩。",
    claimSources: [sourceMemo(10, "增值电信业务许可证")],
    evidence:
      "法律尽调报告 P10 明确：SaaS 业务模式根据《电信条例》、《电信业务分类目录(2015 版)》应申请取得 ICP 证，工信部及北京市通信管理局电话咨询确认很可能属于第二类增值电信业务中的信息服务业务。P11 明确处罚机制（10-100 万元罚款 / 责令关闭网站）以及中外合资取得 ICP 证的外方出资比例上限（50%）与业绩要求。",
    evidenceSources: [
      sourceLegal(10, "增值电信业务许可证"),
      sourceLegal(11, "处罚机制 / 外资比例上限"),
    ],
  },
];

/** ----------- R2 一般风险 · 部分一致项（节选 6 项） ----------- */
const r2PartialCards: VerificationCardItem[] = [
  {
    index: 1,
    category: "募资",
    verdict: "部分一致",
    riskLevel: "R2",
    claim:
      "A 轮 SCC 投资 300 万美元、A-1 轮 SCC 240 万美元、Sinovation 210 万美元（投资备忘录与财务尽调列示口径）。",
    claimSources: [sourceMemo(6, "A 轮 / A-1 轮投资款金额")],
    evidence:
      "法律尽调报告依据正式《增资协议》记载：A 轮 SCC 为 400 万美元、A-1 轮 SCC 为 210 万美元、Sinovation 为 140 万美元。两套口径并存，建议以正式增资协议金额为准并统一披露口径。",
    evidenceSources: [
      sourceLegal(14, "增资协议金额"),
      sourceMemo(6, "备忘录金额"),
    ],
  },
  {
    index: 2,
    category: "募资",
    verdict: "部分一致",
    riskLevel: "R2",
    claim:
      "藏文湖、吴若以 1 元价格转让北京第四范式股权（投资备忘录原文表述）。",
    claimSources: [sourceMemo(7, "股权转让主体")],
    evidence:
      "尽调材料显示北京第四范式股东始终为戴文渊（51%）和吴茗（49%）；吴若实为深圳第四范式层面的 ESOP 代持人。备忘录的「主体描述」存在错位，建议在下一版中更正措辞。",
    evidenceSources: [
      sourceLegal(7, "北京第四范式股权结构"),
      sourceLegal(29, "ESOP 代持安排"),
    ],
  },
  {
    index: 3,
    category: "财务数据",
    verdict: "部分一致",
    riskLevel: "R2",
    claim:
      "2017 年 1-6 月合同金额合计 10,464,970 元。",
    claimSources: [sourceMemo(11, "前十大客户合同金额")],
    evidence:
      "严格按 2017 年 1-6 月口径合计约 4,458,970 元；10,464,970 元实际包含了 2017 年 7 月签约的长安融资租赁 600 万元项目，属于「截至 2017 年 7 月」口径。建议补充期间口径说明。",
    evidenceSources: [
      sourceFin(34, "合同明细 / 期间口径"),
      sourceLegal(11, "前十大客户合同清单"),
    ],
  },
  {
    index: 4,
    category: "财务数据",
    verdict: "部分一致",
    riskLevel: "R2",
    claim:
      "深圳第四范式资本金账户汇兑损益累计增加净资产约 88 万元。",
    claimSources: [sourceMemo(18, "净资产调整")],
    evidence:
      "尽调报告显示 2015 / 2016 / 2017H1 累计汇兑损益调整约 243 万元，88 万元仅对应 2017H1 单期数值。备忘录混用了「累计」与「单期」口径，需在下一版中明确披露口径。",
    evidenceSources: [sourceFin(20, "汇兑损益 / 净资产调整明细")],
  },
  {
    index: 5,
    category: "团队治理",
    verdict: "部分一致",
    riskLevel: "R2",
    claim:
      "吴茗与戴文渊夫妻关系，且两人已签订一致行动协议，吴茗也计划未来两年从公司淡出。",
    claimSources: [sourceMemo(4, "联合创始人关系 / 一致行动")],
    evidence:
      "法律尽调报告 P28-29 确认吴茗为创始股东和联合创始人 / 关键员工，但未单独披露夫妻关系、一致行动协议及淡出计划的相关法律文件证据。需要补充一致行动协议原件、淡出时间表及人事安排文件。",
    evidenceSources: [sourceLegal(28, "关键员工 / 创始股东")],
  },
  {
    index: 6,
    category: "法务合规",
    verdict: "部分一致",
    riskLevel: "R2",
    claim:
      "公司和创始股东已完全遵守与 A-2 轮投资人于 2016 年 7 月 15 日签署的《A-2 轮增资协议》交割后承诺。",
    claimSources: [sourceMemo(12, "A-2 轮交割后承诺")],
    evidence:
      "法律尽调报告 P12-13 明确：顾问杨强未按约定签署保密协议；创始股东吴茗应将「第四范式」第 9 类、第 42 类商标及域名转让给公司，但实际仅转让给第四范式（北京）；4paradigm.cn 域名因未及时缴费由第三方范继洪注册，公司暂未计划收购。承诺未完全履行。",
    evidenceSources: [
      sourceLegal(12, "A-2 轮交割后承诺未完全履行"),
      sourceLegal(13, "4paradigm.cn 域名"),
      sourceLegal(37, "商标转让申请"),
    ],
  },
];

/** ----------- R2 一般风险 · 证据不足项（共 4 项） ----------- */
const r2InsufficientCards: VerificationCardItem[] = [
  {
    index: 1,
    category: "业务数据",
    verdict: "证据不足",
    riskLevel: "R2",
    claim:
      "第四范式在招商银行信用卡中心的线上产品中，效果比招行研究多年的专家规则模型提升 60% 以上。",
    claimSources: [sourceMemo(2, "招行效果")],
    evidence:
      "财务尽调与法律尽调记录了第四范式与招商银行信用卡中心的合同信息（交易分期数据挖掘模型 50 万、机器学习建模平台 180 万、信用卡中心客户信息先知 135 万等）及业务模式，证实招行信用卡中心确为标杆客户和真实合作关系，但未提供能够独立验证「效果比专家规则模型提升 60% 以上」的尽调材料。",
    evidenceSources: [
      sourceFin(10, "招行信用卡中心合同金额"),
      sourceFin(34, "前十大客户合同明细"),
    ],
  },
  {
    index: 2,
    category: "市场行业",
    verdict: "证据不足",
    riskLevel: "R2",
    claim:
      "国内目前还没有完全同类型的竞争对手；SAS 去年全球收入 30 亿美元，其中 26% 收入来自银行；CreditX、桃树科技、冰鉴科技等创业公司在做类似事情。",
    claimSources: [sourceMemo(6, "BENCHMARK & COMPETITIVE ANALYSIS")],
    evidence:
      "三项主张均与投决备忘录原文一致，但财务尽调和法律尽调报告中未涉及相关竞争对手分析与 SAS 收入结构数据，属于投决报告内部一致性陈述，无外部尽调材料可交叉验证。建议补充第三方研报或 SAS 财报作为佐证。",
    evidenceSources: [sourceFin(18, "竞品 / 市场覆盖"), sourceLegal(20, "业务模式描述")],
  },
  {
    index: 3,
    category: "市场行业",
    verdict: "证据不足",
    riskLevel: "R2",
    claim:
      "截至 2014 年底我国银行业金融机构包括 5 家大型商业银行、12 家股份制商业银行、133 家城市商业银行等；2014 年银行业 IT 投入约 400 亿元。",
    claimSources: [sourceMemo(6, "银行业市场规模")],
    evidence:
      "证据完全来自投决文档自身，与 claim 一致，但文件库（财务尽调、法律尽调）中未发现独立的第三方 / 外部行业数据来交叉验证，建议引入 IDC / Gartner / CBIRC 公开数据作为支撑。",
    evidenceSources: [],
  },
  {
    index: 4,
    category: "团队治理",
    verdict: "证据不足",
    riskLevel: "R2",
    claim:
      "联合创始人陈雨强加入第四范式之前任今日头条推荐系统负责人；胡时伟加入第四范式之前任链家网总架构师。",
    claimSources: [sourceMemo(4, "联合创始人前任职履历")],
    evidence:
      "法律尽调报告 P29 确认陈雨强、胡时伟为公司关键员工（首席研究科学家 / 首席架构师），但未对两人加入第四范式前的具体任职单位进行独立披露或佐证。除投决备忘录自身陈述外，无其他独立尽调材料对「今日头条推荐系统负责人 / 链家网总架构师」职务做交叉验证。",
    evidenceSources: [sourceLegal(29, "关键员工")],
  },
];

/** ----------- R2 一般风险 · 一致项（节选 3 项） ----------- */
const r2ConsistentCards: VerificationCardItem[] = [
  {
    index: 1,
    category: "财务数据",
    verdict: "一致",
    riskLevel: "R2",
    claim:
      "其他应收款中存在高管借款 2,000,000 元，2016 年向目标集团借款用于私人购房，无利息且未明确还款期限，截至现场审计日尚未还款且未取得书面合同。",
    claimSources: [sourceMemo(18, "其他应收款 / 高管借款")],
    evidence:
      "财务尽调 P18 列示：2015/12/31 为 0，2016/12/31 与 2017/6/30 均为 2,000,000 元；脚注说明用途、利息、期限、合同情况均与备忘录主张完全一致。",
    evidenceSources: [sourceFin(18, "其他应收款明细"), sourceFin(14, "尽职调查发现#7")],
  },
  {
    index: 2,
    category: "客户数据",
    verdict: "一致",
    riskLevel: "R2",
    claim:
      "第四范式（北京）与前十大客户中两份合同（LDD009、LDD008）已过有效期且未约定自动续期，公司将在交割后三个月内签署补充协议延长期限。",
    claimSources: [sourceMemo(11, "前十大客户合同有效期")],
    evidence:
      "法律尽调 P11-12 明确列出合同编号、有效期及「未约定自动续期」结论，并将「三个月内签署补充协议」列为交割后义务。投资备忘录陈述与法律尽调完全一致。",
    evidenceSources: [
      sourceLegal(11, "前十大客户合同清单"),
      sourceLegal(12, "交割后义务"),
    ],
  },
  {
    index: 3,
    category: "法务合规",
    verdict: "一致",
    riskLevel: "R2",
    claim:
      "目标集团存在高管向公司无息借款用于私人买房，截至 2017 年 6 月 30 日借款余额为 200 万元，且未能提供借款合同和明确还款期限。",
    claimSources: [sourceMemo(14, "高管借款 / 尽调发现#7")],
    evidence:
      "财务尽调 P14「尽职调查发现概要」#7 与 P18 其他应收款明细附注 b) 双重交叉印证：金额、时间、用途、无利息、无明确还款期限、未取得书面合同等所有要素均一致。",
    evidenceSources: [
      sourceFin(14, "尽职调查发现#7"),
      sourceFin(18, "其他应收款附注 b)"),
    ],
  },
];

/** ----------- R1 低风险 · 部分一致项（节选 4 项，演示扁平展示） ----------- */
const r1PartialCards: VerificationCardItem[] = [
  {
    index: 1,
    category: "财务数据",
    verdict: "部分一致",
    riskLevel: "R1",
    claim:
      "2017 年 1-6 月营业收入 1,180 万元，主要客户为长安融资租赁、招商银行信用卡中心、中信银行等。",
    claimSources: [sourceMemo(14, "营业收入")],
    evidence:
      "财务尽调 P22 营业收入明细与备忘录主张一致；但 P9 现金流量表显示同期经营性现金流为净流出，需关注收入确认与回款时点。",
    evidenceSources: [sourceFin(22, "营业收入明细"), sourceFin(9, "现金流量表")],
  },
  {
    index: 2,
    category: "募资",
    verdict: "部分一致",
    riskLevel: "R1",
    claim:
      "B 轮投后估值约 12 亿元人民币，投资人合计认购 8,000 万元，公司将其用于核心算法研发、商务拓展与人才扩充。",
    claimSources: [sourceMemo(3, "B 轮估值与认购")],
    evidence:
      "法律尽调 P14 增资协议条款一致；但「人才扩充」资金占比 30% 需要补充岗位规划表，避免与 A-2 轮投后承诺重叠。",
    evidenceSources: [sourceLegal(14, "B 轮增资协议")],
  },
  {
    index: 3,
    category: "客户数据",
    verdict: "部分一致",
    riskLevel: "R1",
    claim:
      "公司客户结构以金融行业为主（占比约 70%），互联网行业占比 20%，其他行业 10%。",
    claimSources: [sourceMemo(8, "客户结构")],
    evidence:
      "财务尽调 P34 前十大客户中金融客户占 65%、互联网占 25%、其他 10%；与备忘录口径基本一致但存在 5 个百分点偏差，建议明确口径（合同金额 / 收入确认）。",
    evidenceSources: [sourceFin(34, "前十大客户结构")],
  },
  {
    index: 4,
    category: "团队治理",
    verdict: "部分一致",
    riskLevel: "R1",
    claim:
      "公司持有 ESOP 池约 12%，已发放约 7%、剩余 5% 储备用于未来招聘。",
    claimSources: [sourceMemo(4, "员工持股 ESOP")],
    evidence:
      "法律尽调 P29 关键员工清单与 ESOP 持股比例略有不同（已发放约 8%），需要在交割前核对最终 ESOP 名册。",
    evidenceSources: [sourceLegal(29, "关键员工 / ESOP 持股")],
  },
];

const sifanshiReport: AssistantBlock = {
  kind: "diligence-report",
  title: "第四范式 B 轮 · 投资备忘录 ⇄ 多源尽调 交叉验证报告",
  company: "第四范式（4Paradigm）",
  summary:
    "本轮共完成 80 项交叉验证：64 项一致、12 项部分一致、4 项证据不足、0 项不一致。**核心控制权瑕疵、增值税合规、VIE 上市障碍、ICP 证缺失**等 R3 重大风险均得到财务尽调与法律尽调相互印证，需在交易文件中通过陈述与保证、特别赔偿、交割前提条件及交割后义务等方式重点覆盖[^3][^4][^5][^6]。R2 一般风险集中于募资金额口径差异、合同期间口径、社保历史少缴（836 万元）与高管 200 万元无息借款等[^7][^8][^9][^10][^11]。R4 否决性风险本轮未识别。",
  verdict: {
    recommendation: "附条件继续推进",
    riskLevel: "R3",
    valuation: "估值待复核",
  },
  metrics: [
    { label: "已执行验证项", value: "80", sub: "本轮全部完成", tone: "neutral" },
    { label: "不一致", value: "0", sub: "无相互冲突主张", tone: "positive" },
    { label: "部分一致", value: "12", sub: "口径 / 主体描述差异", tone: "warning" },
    { label: "证据不足", value: "4", sub: "需补外部佐证", tone: "neutral" },
    { label: "一致", value: "64", sub: "数据底盘扎实", tone: "positive" },
    { label: "R3 重大风险", value: "6", sub: "需重点覆盖", tone: "danger" },
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
            "本次交叉验证以《第四范式 B 轮投资备忘录》为核心主张源，依据《财务尽调报告》《法律尽调报告》两份独立尽调文件做多源交叉印证，共生成并完成 **80 项验证计划**。整体口径与底层数据扎实可信，未识别 R4 否决性风险；财务与法律尽调对若干税务、控制权与上市合规事项已明确标注为 R3 重大风险，需要在交易文件和交割条件中给予充分覆盖[^1][^2]。",
        },
        {
          type: "bars",
          caption: "结论分布（共 80 项）",
          items: [
            { label: "一致", value: 80, display: "64 项 · 80%", tone: "positive" },
            { label: "部分一致", value: 15, display: "12 项 · 15%", tone: "warning" },
            { label: "证据不足", value: 5, display: "4 项 · 5%", tone: "neutral" },
            { label: "不一致", value: 0, display: "0 项 · 0%", tone: "danger" },
          ],
        },
        {
          type: "callout",
          tone: "warning",
          title: "风险分布解读",
          text:
            "R3（6 项）集中于销项税率合规、协议控制 VIE 模式、控制权瑕疵与 ICP 证缺失，均需通过陈述与保证、特别赔偿、交割前提条件覆盖；R2（14 项一般风险 + 4 项证据不足 + 5 项一致 = 23 项）主要为口径差异 / 人员履历 / 行业数据缺乏第三方证据；R1 共 60 项，关键数据底盘扎实[^1][^2][^3][^4][^5][^6]。",
        },
      ],
    },
    {
      id: "top-risks",
      title: "2. 关键风险项 TOP 11",
      tone: "danger",
      content: [
        {
          type: "paragraph",
          text:
            "未识别 R4 否决性风险。以下为按金融影响 / 合规严重度排序的 TOP 11 重点复核项（R3 / R2），需在交割文件、特别赔偿及交割后义务中覆盖。",
        },
        {
          type: "bullets",
          ordered: true,
          items: [
            "**北京第四范式增值税申报税率合规性（R3）**：6% vs 17% 税率口径差异若被税务机关稽查，将面临补缴税款及滞纳金，属重大财务影响合规瑕疵[^1][^2]。",
            "**协议控制（VIE）模式对境内上市的障碍（R3）**：核心知识产权登记于第四范式（北京）名下，A 股 IPO 路径需提前规划 VIE 拆除或股东结构调整[^3]。",
            "**公司对第四范式（北京）控制权瑕疵（R3）**：2015 年 11 月 1 元股权转让未经股东会决议批准、章程未变更、未办理工商登记；存在被税务机关按公允价值追征个税风险，需通过控制协议覆盖[^4][^5].",
            "**第四范式（北京）未取得增值电信业务许可证（R3）**：SaaS 业务可能需 ICP 证（信息服务业务），未取得可面临 10-100 万元罚款或责令关闭网站；中外合资取得 ICP 证要求外方出资比例 ≤ 50% 并需运营业绩[^6]。",
            "**A 轮 / A-1 轮投资款币种与口径差异（R2）**：备忘录与法律尽调（《增资协议》原件）存在金额差异，建议以协议口径为准统一披露[^7][^8]。",
            "**北京第四范式股权转让主体描述错位（R2）**：备忘录提到「藏文湖、吴若以 1 元价格转让」，但实际股东始终为戴文渊 51% / 吴茗 49%；吴若实为深圳第四范式 ESOP 代持人。",
            "**合同金额期间口径不一致（R2）**：备忘录 2017 年 1-6 月 1,046.5 万元实际包含 7 月签约的长安融资租赁 600 万元，属「截至 7 月」口径[^9]。",
            "**净资产汇兑损益累计 vs 单期口径差异（R2）**：备忘录称约 88 万元，尽调累计调整约 243 万元，88 万元仅对应 2017H1 单期数值。",
            "**社保历史少缴 836 万元 + 高管 200 万元无息购房借款（R2）**：均需以创始股东连带赔偿承诺或还款安排在交易文件中覆盖[^10][^11]。",
            "**创始人夫妻关系 / 一致行动协议 / 联合创始人前职履历（R2）**：当前材料未见充分独立法律文件 / 背调证据，建议补齐[^15]。",
            "**市场行业 & 竞品数据缺乏第三方证据（R2）**：2014 年银行业 IT 400 亿元、SAS 全球收入 30 亿美元等陈述，仅备忘录单一来源，无第三方研报佐证[^12][^13]。",
          ],
        },
      ],
    },
    {
      id: "r3-cards",
      title: "3. R3 重大风险 · 详细对照（6 项 · 一致）",
      tone: "danger",
      content: [
        {
          type: "paragraph",
          text:
            "下述 6 项均由财务尽调与法律尽调相互印证，结论「一致」。需在交易文件中通过陈述与保证（R&W）、特别赔偿、交割前提条件、交割后义务、对赌或回购条款等多重机制覆盖。",
        },
        {
          type: "verification-cards",
          items: r3Cards,
        },
      ],
    },
    {
      id: "r2-partial",
      title: "4. R2 一般风险 · 部分一致项（节选 6 项）",
      tone: "warning",
      content: [
        {
          type: "paragraph",
          text:
            "下列 6 项为部分一致主张，主要是口径 / 主体描述 / 期间归集差异。这类问题不影响交易实质，但会影响投决会披露的可信度，需要在下一版备忘录中统一口径。",
        },
        {
          type: "verification-cards",
          items: r2PartialCards,
        },
      ],
    },
    {
      id: "r2-insufficient",
      title: "5. R2 一般风险 · 证据不足项（共 4 项）",
      tone: "neutral",
      content: [
        {
          type: "paragraph",
          text:
            "下述 4 项陈述虽合理但当前知识库内仅备忘录单一来源，缺乏可交叉印证的外部 / 尽调材料。建议补齐第三方证据（行业研报、背调报告、客户访谈纪要）后再形成披露。",
        },
        {
          type: "verification-cards",
          items: r2InsufficientCards,
        },
      ],
    },
    {
      id: "r2-consistent",
      title: "6. R2 一般风险 · 一致项（节选 3 项 / 共 5 项）",
      tone: "positive",
      defaultOpen: false,
      content: [
        {
          type: "paragraph",
          text:
            "5 项一致主张中节选 3 项详细列示，其余 2 项口径已对齐尽调材料，可在交割文件中以一句话陈述方式覆盖。",
        },
        {
          type: "verification-cards",
          caption: "已折叠：点击展开查看 3 项详细对照",
          defaultCollapsed: true,
          items: r2ConsistentCards,
        },
      ],
    },
    {
      id: "r1-cards",
      title: "7. R1 低风险 · 部分一致节选（4 / 共 60 项）",
      tone: "positive",
      defaultOpen: false,
      content: [
        {
          type: "callout",
          tone: "positive",
          title: "R1 一致项共 53 项已默认折叠",
          text:
            "股权结构、合并范围、各期主营业务收入、净亏损、资产总计、货币资金、应收账款账龄、研究费用、人力成本、毛利率、主要客户合同明细（长安融资租赁、招行系列、中信银行、上海市内分泌代谢病研究所、新华新媒、永辉云创、优信数享等）、A-2 轮增资金额、B 轮估值与认购明细、高新技术企业资格、深圳前海第四范式工商信息、员工期权代持安排等关键数据，均在投资备忘录、财务尽调、法律尽调之间高度一致，数据底盘扎实可信。",
        },
        {
          type: "verification-cards",
          caption: "已折叠：点击展开 R1 部分一致 4 项节选",
          defaultCollapsed: true,
          items: r1PartialCards,
        },
      ],
    },
    {
      id: "conclusion",
      title: "8. 复核结论与交易文件覆盖建议",
      tone: "warning",
      content: [
        {
          type: "callout",
          tone: "warning",
          title: "整体复核结论",
          text:
            "**附条件继续推进** —— 数据底盘扎实（一致项 80%），但 R3 重大风险均集中于法务合规（税务 / VIE / 控制权 / ICP 证），需要在 SPA / SHA / 增资协议中通过特别赔偿、交割前提与交割后义务覆盖；R2 部分一致项需在下一版备忘录中统一口径。",
        },
        {
          type: "bullets",
          items: [
            "**交易文件机制覆盖**：6 项 R3 风险逐项映射到「陈述与保证 + 特别赔偿 + 交割前提 + 交割后义务」四级机制；",
            "**口径整改**：投资备忘录下一版统一采用《增资协议》记载金额、统一合同金额期间口径、明确累计 vs 单期汇兑损益口径；",
            "**外部补证**：补充第三方行业研报、SAS 财报数据、联合创始人前任职背调，提升 R2 证据不足项的披露可信度；",
            "**整改时间表**：社保少缴 836 万元已于 2017 年 7 月起整改；高管 200 万元无息借款需补签书面合同 + 明确还款期限，并以创始股东连带赔偿承诺覆盖；",
            "**估值与对赌**：R3 与 R2 风险整体不构成估值折让基础，但建议在对赌条款中将「交割前提条件未完成 24 个月」作为回购触发事件。",
          ],
        },
      ],
    },
  ],
  citations,
};

export const sifanshiReportMessages: ChatMessage[] = [
  {
    id: "m-sifanshi-user",
    role: "user",
    text:
      "基于投资备忘录与两份尽调材料做一次完整的交叉验证，把所有主张按 R1-R4 分级输出。",
    mode: "fact-check",
    createdAt: "2026-06-04T14:02:00+08:00",
  },
  {
    id: "m-sifanshi-assistant",
    role: "assistant",
    createdAt: "2026-06-04T14:18:00+08:00",
    blocks: [
      {
        kind: "report-process",
        process: buildCrossValidationProcess({
          projectName: "第四范式 B 轮",
          documentCount: 3,
          candidateCount: 124,
          claimCount: 80,
          outcomes: {
            consistent: 64,
            partial: 12,
            insufficient: 4,
            inconsistent: 0,
          },
        }),
        progress: 100,
        status: "completed",
      },
      {
        kind: "text",
        text:
          "已完成 80 项主张的交叉验证：64 项一致、12 项部分一致、4 项证据不足、0 项不一致。未识别 R4 否决风险；R3 重大风险共 6 项均集中在法务合规（销项税率 / VIE / 控制权 / ICP 证），需要在交易文件中重点覆盖。完整对照报告见下方卡片。",
      },
      sifanshiReport,
    ],
  },
];
