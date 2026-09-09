import type {
  AssistantBlock,
  ChatMessage,
  Conversation,
  RunningTask,
} from "@/src/types";
import { haizhiReportMessages } from "@/src/data/haizhi-report";
import { haizhiValidationReportMessages } from "@/src/data/haizhi-validation-report";
import { sifanshiReportMessages } from "@/src/data/sifanshi-report";
import { sifanshiValidationReportMessages } from "@/src/data/sifanshi-validation-report";
import {
  buildChallengeProcess,
  buildCrossValidationProcess,
  buildValuationProcess,
} from "@/src/lib/report-process";

/**
 * 演示子对话 - 围绕极光智算项目拆解为多条独立子对话：
 *  - conv-aurora-fact：事实交叉验证
 *  - conv-aurora-route：智能路由 → 待确认
 *  - conv-aurora-challenge：挑战质询清单（已完成结果）
 *  - conv-aurora-challenge-pending：挑战质询任务进行中（演示任务卡片）
 *  - conv-aurora-valuation：估值平行测算
 */

const factVerificationMessages: ChatMessage[] = [
  {
    id: "m-fact-user",
    role: "user",
    text: "对议案宣称的营收与经营性现金流做事实交叉验证。",
    mode: "fact-check",
    createdAt: "2026-05-12T09:22:14+08:00",
  },
  {
    id: "m-fact-assistant",
    role: "assistant",
    createdAt: "2026-05-12T09:22:48+08:00",
    blocks: [
      {
        kind: "report-process",
        process: buildCrossValidationProcess({
          projectName: "极光智算 Pre-A 轮",
          documentCount: 5,
          candidateCount: 5,
          claimCount: 3,
          outcomes: {
            consistent: 2,
            partial: 1,
            insufficient: 0,
            inconsistent: 0,
          },
        }),
        progress: 100,
        status: "completed",
      },
      {
        kind: "fact-verification",
        title: "营收与经营性现金流交叉验证",
        level: "R4",
        summary:
          "议案宣称的经营性现金流净额[^3]，与 FDD 底稿单体加总结果存在 15% 偏离[^4]；同时 LTM 营收口径在议案[^1]与审计报告[^2]之间基本一致，未发现量级跨越。投后估值数字在 BP[^5] 与增资协议[^6] 之间完全一致。",
        compares: [
          {
            label: "2024 全年营收",
            claim: { source: "投决议案 V3 · P8[^1]", value: "1.82 亿元" },
            reality: { source: "财务审计报告 · P12[^2]", value: "1.79 亿元" },
            delta: "+1.6%",
            level: "R1",
            deviationDetail: {
              explanation:
                "议案使用 1.82 亿元（含税口径），而审计报告披露的为不含税营业总收入 17,887 万元（1.79 亿元）；差异 1.6% 处于税金及附加合理区间，未发现实质性失真。",
              impact:
                "对估值与 PS 计算影响极小（≤ 0.2×），属 R1 低风险级。",
              recommendation: "保留原口径，在尽调备忘中加注「含税 / 不含税」披露口径说明即可。",
            },
          },
          {
            label: "2024 经营性现金流净额",
            claim: { source: "投决议案 V3 · P9[^3]", value: "+ 2,840 万元" },
            reality: { source: "FDD 底稿 · 附注 4[^4]", value: "+ 2,415 万元" },
            delta: "+15.0%",
            level: "R4",
            deviationDetail: {
              explanation:
                "议案披露的 2,840 万元来源于合并报表口径；FDD 底稿单体加总结果为 2,415 万元（母公司 1,902 + 子 A 396 + 子 B 117），425 万元差额未在附注中给出调节项说明。疑似将「关联方代付费用」回冲计入经营活动现金流。",
              impact:
                "现金流真实质量被高估 15%，直接影响 VC 倒算法估值上限，应触发 R4 级条款重构（业绩补偿 / 现金回购对赌）。",
              recommendation:
                "要求公司在 1 周内提供合并 → 单体的现金流调节表，并就 425 万差异逐项说明；如未能说明，建议将估值上限下修 8% – 12%。",
              evidence: [
                {
                  document: "FDD 底稿.xlsx",
                  page: "附注 4",
                  paragraph: "经营活动产生的现金流量净额（单体加总）",
                  excerpt:
                    "母公司 1,902 万 + 全资子公司 A 396 万 + 全资子公司 B 117 万 = 2,415 万元；与合并报表披露的 2,840 万存在 425 万差异，未在附注中说明调节项。",
                  highlight: ["2,415 万元", "425 万差异"],
                },
              ],
            },
          },
          {
            label: "投后估值（B 轮基础上）",
            claim: { source: "BP · P22[^5]", value: "12.6 亿元" },
            reality: { source: "增资协议原件 · P3[^6]", value: "12.6 亿元" },
            delta: "0%",
            level: "R1",
          },
        ],
        anchors: [
          {
            document: "投决议案-V3.pdf",
            page: 9,
            paragraph: "三、财务摘要 / (3) 现金流",
            excerpt:
              "公司 2024 年度经营性现金流净额为 +2,840 万元，较上一年度同比改善约 27%。",
            highlight: ["+2,840 万元", "27%"],
          },
          {
            document: "FDD 底稿.xlsx",
            page: "附注 4",
            paragraph: "经营活动产生的现金流量净额（单体加总）",
            excerpt:
              "母公司 1,902 万 + 全资子公司 A 396 万 + 全资子公司 B 117 万 = 2,415 万元；与合并报表披露的 2,840 万存在 425 万差异。",
            highlight: ["2,415 万元", "425 万差异"],
          },
        ],
        citations: [
          {
            document: "投决议案-V3.pdf",
            page: 8,
            paragraph: "三、财务摘要 / (1) 收入",
            excerpt: "2024 全年实现营业收入 1.82 亿元，较上一年度同比增长 36.8%。",
            highlight: ["1.82 亿元", "36.8%"],
          },
          {
            document: "财务审计报告.pdf",
            page: 12,
            paragraph: "经审计的合并利润表",
            excerpt:
              "本年度公司实现营业总收入 17,887 万元（折合 1.79 亿元），同比增长 34.5%。",
            highlight: ["17,887 万元", "1.79 亿元"],
          },
          {
            document: "投决议案-V3.pdf",
            page: 9,
            paragraph: "三、财务摘要 / (3) 现金流",
            excerpt:
              "公司 2024 年度经营性现金流净额为 +2,840 万元，较上一年度同比改善约 27%。",
            highlight: ["+2,840 万元", "27%"],
          },
          {
            document: "FDD 底稿.xlsx",
            page: "附注 4",
            paragraph: "经营活动产生的现金流量净额（单体加总）",
            excerpt:
              "母公司 1,902 万 + 全资子公司 A 396 万 + 全资子公司 B 117 万 = 2,415 万元；与合并报表披露的 2,840 万存在 425 万差异，未在附注中说明调节项。",
            highlight: ["2,415 万元", "425 万差异"],
          },
          {
            document: "BP_2026Q2.pptx",
            page: 22,
            paragraph: "本轮融资概览",
            excerpt: "本轮拟按投前估值人民币 12.6 亿元定价，对应 PS 6×。",
            highlight: ["12.6 亿元", "PS 6×"],
          },
          {
            document: "增资协议原件.pdf",
            page: 3,
            paragraph: "第二条 估值条款",
            excerpt:
              "各方一致同意以投前估值人民币 12.6 亿元（含已转可转债转股）为基础进行本轮增资。",
            highlight: ["12.6 亿元"],
          },
        ],
      },
    ],
  },
];

const routeAmbiguousMessages: ChatMessage[] = [
  {
    id: "m-route-user",
    role: "user",
    text: "这个项目整体怎么样？帮我看看。",
    createdAt: "2026-05-12T09:28:02+08:00",
  },
  {
    id: "m-route-assistant",
    role: "assistant",
    createdAt: "2026-05-12T09:28:35+08:00",
    blocks: [
      {
        kind: "mode-pick",
        title: "Agent 暂时无法判断该问题适合哪类能力",
        reason:
          "您的问题表述较宽泛，Agent 智能路由无法在「事实交叉验证」与「挑战质询」之间做出可靠判断，请手动选择一项继续，后续将延续您的选择。",
        originalQuery: "这个项目整体怎么样？帮我看看。",
        options: [
          {
            mode: "fact-check",
            label: "事实交叉验证",
            desc: "核对议案、BP、FDD、审计报告中的关键数字与口径是否一致，输出差异清单与证据锚点",
          },
          {
            mode: "challenge",
            label: "挑战质询",
            desc: "围绕投资逻辑、关键假设与执行风险生成投决会式质询清单与条款建议",
          },
        ],
      },
    ],
  },
];

const challengeMessages: ChatMessage[] = [
  {
    id: "m-challenge-user",
    role: "user",
    text: "请输出该项目的核心投资逻辑挑战质询清单。",
    mode: "challenge",
    createdAt: "2026-05-12T09:31:02+08:00",
  },
  {
    id: "m-challenge-assistant",
    role: "assistant",
    createdAt: "2026-05-12T09:31:47+08:00",
    blocks: [
      {
        kind: "report-process",
        process: buildChallengeProcess({
          projectName: "极光智算 Pre-A 轮",
          documentCount: 5,
          challengeCount: 4,
        }),
        progress: 100,
        status: "completed",
      },
      {
        kind: "challenge-list",
        title: "灵魂质询清单（4 条 · 已按 R2 稳健均衡型口径过滤）",
        summary:
          "总览：在 AI Agent 应用赛道高度内卷、底层模型成本占比偏高[^3] 的现状下，公司宣称的 60% 综合毛利[^4] 与人效水平[^2] 存在结构性张力。建议以条款约束对冲，详见下方。",
        items: [
          {
            id: "c-1",
            riskLevel: "R4",
            title: "估值逻辑断层与退出风险",
            coreLogic:
              "项目方按 PS 6× 计算投前估值[^1] 隐含 NTM 增速 +85%；但 2024 全年人效仅 47.1 万元[^2]，远低于行业基准 75–82 万元，公司如何跨越产能瓶颈以支撑该退出估值的净利润要求？",
            evidence: [
              {
                document: "投决议案-V3.pdf",
                page: 12,
                excerpt:
                  "项目方按 PS 6× × NTM 营收 2.1 亿计算投前估值 12.6 亿；隐含要求 NTM 增速 +85%。",
                highlight: ["PS 6×", "+85%"],
              },
              {
                document: "FDD 底稿.xlsx",
                page: "附表 3-人员",
                excerpt:
                  "在职研发 38 人，2024 全年人效 47.1 万元，远低于行业基准（约 75–82 万元）。",
                highlight: ["47.1 万元", "75–82 万元"],
              },
            ],
            actionAdvice: [
              "建议将投前估值下修 15% – 20%（落到 10.1 – 10.7 亿区间）",
              "增设「次年扣非净利不低于 3,500 万」的全现金回购对赌，不可仅设股权补偿",
              "Pre-A 轮释放 10% 股权用于回购缓冲池",
            ],
            category: "估值",
          },
          {
            id: "c-2",
            riskLevel: "R4",
            title: "底层模型 API 成本占比偏高 → 规模不经济",
            coreLogic:
              "Agent 服务每完成一笔自动化任务需调用 6.4 次 GPT-5.4 / Claude 4.6 推理；底层 API 成本占客单价 38%[^3]，毛利率结构脆弱。公司假设 2026 推理价格下降 40%[^4] 推动毛利至 55%，但缺乏合同 / 询价依据。",
            evidence: [
              {
                document: "FDD 底稿.xlsx",
                page: "Sheet · UE 测算",
                excerpt:
                  "2024 H2 单笔订单平均成本拆解：底层 API 38% / 服务器 11% / 人工运营 14% / 销售分摊 17% / 毛利 20%。",
                highlight: ["38%", "毛利 20%"],
              },
              {
                document: "BP_2026Q2.pptx",
                page: 17,
                excerpt:
                  "公司假设 2026 年底层模型推理价格下降 40%，从而推动综合毛利率提升至 55%。",
                highlight: ["下降 40%", "55%"],
              },
            ],
            actionAdvice: [
              "要求公司提供推理成本下降假设的量化依据（合同 / 询价单 / 模型路由方案）",
              "条款上设置「24 个月内综合毛利不低于 35%」的业绩补偿触发线",
              "建议引入 AI Gateway 路由方案，降低对单一模型的成本敞口",
            ],
            category: "财务",
          },
          {
            id: "c-3",
            riskLevel: "R3",
            title: "前五大客户占比 41%，存在单点依赖",
            coreLogic:
              "前五大客户合计贡献营收占比 41.2%[^5]，其中 TOP1 客户已签 2025 年延续协议但金额下降 39%[^5]，单一客户敞口对收入稳定性形成显性威胁。",
            evidence: [
              {
                document: "投决议案-V3.pdf",
                page: 14,
                excerpt:
                  "前五大客户合计贡献营收占比 41.2%，其中 TOP1 客户已签 2025 年延续协议，但金额下降 39%。",
                highlight: ["41.2%", "下降 39%"],
              },
            ],
            actionAdvice: [
              "要求新增「单一客户占比连续两期 > 30% 时，补充信用增信」的反稀释条款",
              "持续跟踪 2026 H1 新签客户多元化进展",
            ],
            category: "财务",
          },
          {
            id: "c-4",
            riskLevel: "R3",
            title: "团队基因匹配度待验证（销售型团队做底层 Agent 平台）",
            coreLogic:
              "核心三人创始团队中 2 位出身销售岗，CTO 履历[^6] 仅以「资深架构师」概称、未披露具体项目与时间区间，外部数据源中也未找到对应的 ML / Infra 背书。",
            evidence: [
              {
                document: "BP_2026Q2.pptx",
                page: 6,
                excerpt:
                  "CTO 张某：「曾任职某 AI 独角兽资深架构师」，但未披露具体项目与时间区间。",
                highlight: ["资深架构师"],
              },
            ],
            actionAdvice: [
              "建议增设 CTO 履历背调专项条款，由专业第三方完成",
              "在投后管理协议中预留关键岗位变更知会权",
            ],
            category: "团队",
          },
        ],
        citations: [
          {
            document: "投决议案-V3.pdf",
            page: 12,
            paragraph: "五、估值与定价 / (2) 退出推算",
            excerpt:
              "项目方按 PS 6× × NTM 营收 2.1 亿计算投前估值 12.6 亿；隐含要求 NTM 增速 +85%。",
            highlight: ["PS 6×", "+85%"],
          },
          {
            document: "FDD 底稿.xlsx",
            page: "附表 3-人员",
            paragraph: "人效与产能分析",
            excerpt:
              "在职研发 38 人，2024 全年人效 47.1 万元，远低于行业基准（约 75–82 万元）。",
            highlight: ["47.1 万元", "75–82 万元"],
          },
          {
            document: "FDD 底稿.xlsx",
            page: "Sheet · UE 测算",
            paragraph: "单笔订单成本结构",
            excerpt:
              "2024 H2 单笔订单平均成本拆解：底层 API 38% / 服务器 11% / 人工运营 14% / 销售分摊 17% / 毛利 20%。",
            highlight: ["38%", "毛利 20%"],
          },
          {
            document: "BP_2026Q2.pptx",
            page: 17,
            paragraph: "成本下降假设",
            excerpt:
              "公司假设 2026 年底层模型推理价格下降 40%，从而推动综合毛利率提升至 55%。",
            highlight: ["下降 40%", "55%"],
          },
          {
            document: "投决议案-V3.pdf",
            page: 14,
            paragraph: "四、客户集中度",
            excerpt:
              "前五大客户合计贡献营收占比 41.2%，其中 TOP1 客户已签 2025 年延续协议，但金额下降 39%。",
            highlight: ["41.2%", "下降 39%"],
          },
          {
            document: "BP_2026Q2.pptx",
            page: 6,
            paragraph: "团队介绍 / CTO 履历",
            excerpt:
              "CTO 张某：「曾任职某 AI 独角兽资深架构师」，但未披露具体项目与时间区间。",
            highlight: ["资深架构师"],
          },
        ],
      },
    ],
  },
];

/** 估值平行测算报告块 —— 仅在用户补全 clarification 后才追加到对话流中 */
const valuationFollowUpBlock: AssistantBlock = {
  kind: "valuation",
  title: "估值平行测算（已使用 VC 倒算 + PS 对比 + PTA 三种方法）",
  summary:
    "Agent 不提供单一推荐值。下述每种方法独立测算，所用 NTM 营收 2.1 亿元来源于公司预测口径[^1]，并将关键假设客观列出，由用户判断合理性。",
  methods: [
    {
      method: "VC 倒算法（IRR 15%, N=5, 稀释 30% 兜底）",
      range: "9.4 – 11.2 亿元",
      assumption:
        "预期退出 PS 4×[^4]，5 年后所需营收约 4.7 亿，对应 5 年 CAGR ≈ 27%",
      applicability: "强匹配（早期成长项目必使用）",
    },
    {
      method: "对比公司法 · PS",
      range: "10.5 – 12.1 亿元",
      assumption:
        "对标 3 家二级市场 SaaS / Agent 应用平均 PS = 5.2×[^2]，NTM 营收 2.1 亿[^1]",
      applicability: "中等匹配（公司未盈利、营收增速 > 30%）",
    },
    {
      method: "交易案例法（PTA）",
      range: "10.0 – 11.5 亿元",
      assumption:
        "近 12 个月 3 起可比 Pre-A 案例加权平均 PS = 5.0×[^3]，已剔除高估异常值",
      applicability: "全局并行验证（强制使用）",
    },
  ],
  conclusion:
    "综合估值区间：9.4 – 12.1 亿元。议案投前 12.6 亿[^5] 位于上限以上 4.1%，处于「需关注假设差异」区间（PRD 偏差率定义 15%–30% 之间）。建议复核 NTM 营收预测与 PS 对标公司选取合理性。",
  citations: [
    {
      document: "BP_2026Q2.pptx",
      page: 9,
      paragraph: "财务预测 / NTM 营收口径",
      excerpt:
        "公司预测 NTM（未来 12 个月）实现营业收入 2.1 亿元，对应同比增速 +15.4%。",
      highlight: ["2.1 亿元", "+15.4%"],
    },
    {
      document: "对比公司清单.xlsx",
      page: "Sheet · SaaS-Agent",
      paragraph: "可比公司 PS 中位数",
      excerpt:
        "选取 3 家二级 SaaS / Agent 应用厂商（A、B、C），近 30 日 NTM PS 中位数 5.2×，均值 5.4×。",
      highlight: ["5.2×", "5.4×"],
    },
    {
      document: "PTA 案例集.xlsx",
      page: "Sheet · Pre-A 近 12M",
      paragraph: "加权平均 PS",
      excerpt:
        "纳入样本 3 起，分别为 4.6× / 5.1× / 5.3×，按交易金额加权后 PS = 5.0×。",
      highlight: ["5.0×"],
    },
    {
      document: "退出参考案例.pdf",
      page: 4,
      paragraph: "二级市场退出 PS",
      excerpt:
        "近 24 个月境内 SaaS / Agent 应用厂商 IPO 退出 PS 中枢为 4×，区间 3.2× – 5.1×。",
      highlight: ["PS 4×", "3.2× – 5.1×"],
    },
    {
      document: "投决议案-V3.pdf",
      page: 8,
      paragraph: "五、估值与定价 / (1) 投前估值",
      excerpt: "本轮拟按投前估值人民币 12.6 亿元定价（折合 PS 6×）。",
      highlight: ["12.6 亿元", "PS 6×"],
    },
  ],
};

const valuationMessages: ChatMessage[] = [
  {
    id: "m-val-user",
    role: "user",
    text: "估值合理性怎么样？请给出区间，不需要推荐数。",
    createdAt: "2026-05-12T09:48:01+08:00",
  },
  {
    id: "m-val-assistant",
    role: "assistant",
    createdAt: "2026-05-12T09:48:55+08:00",
    blocks: [
      {
        kind: "clarification",
        title: "缺失关键参数：预计未来稀释比例",
        reason:
          "VC 倒算法（IRR 反向测算）必须使用，当前材料中未找到「退出前本轮股权稀释比例」披露，触发阻断式反问。",
        fields: [
          {
            key: "dilution",
            label: "预计未来稀释比例（%）",
            hint: "若 BP 表述「稀释到 X%」（留存率），系统会自动换算为 100% − X%",
            type: "number",
            required: true,
          },
          {
            key: "expected-irr",
            label: "目标 IRR（%）",
            hint: "默认 15%（基准）；激进档位可上调至 20–25%",
            type: "number",
            required: true,
          },
          {
            key: "exit-year",
            label: "预期退出年限（年）",
            hint: "默认 5 年",
            type: "number",
          },
        ],
        // 用户提交参数后由 App 追加完整估值过程与报告块到对话流
        followUp: [
          {
            kind: "report-process",
            process: buildValuationProcess({
              projectName: "极光智算 Pre-A 轮",
              documentCount: 5,
            }),
            progress: 100,
            status: "completed",
          },
          valuationFollowUpBlock,
        ],
      },
    ],
  },
];

/** 用于"挑战质询任务进行中"演示：用户发起任务，Agent 正在长任务，对话流暂时只有用户消息 */
const challengePendingMessages: ChatMessage[] = [
  {
    id: "m-challenge-pending-user",
    role: "user",
    text: "请围绕团队基因匹配度（销售型团队做底层 Agent 平台）做一轮深度挑战质询，输出 3–5 条核心矛盾与条款建议。",
    mode: "challenge",
    createdAt: new Date().toISOString(),
  },
];

/**
 * 常驻的投资分析思考框架：直接展示完成态，不依赖上传文件或长任务。
 * 用于产品走查时反复查看节点层级与编排样式。
 */
const investmentFrameworkMessages: ChatMessage[] = [
  {
    id: "m-investment-framework-assistant",
    role: "assistant",
    createdAt: "2026-08-18T14:20:00+08:00",
    blocks: [
      {
        kind: "text",
        text: "以下为固定展示的投资分析思考框架，可直接查看完整编排过程，无需重新上传材料或等待任务执行。",
      },
      {
        kind: "validation-demo",
        progress: 100,
        status: "completed",
        mode: "investment-analysis",
        agentIds: [
          "finance",
          "customer",
          "technology",
          "market",
          "legal",
          "valuation",
        ],
      },
    ],
  },
];

/**
 * 常驻的交叉验证思考框架：直接展示完成态，便于持续走查和调整交叉验证编排。
 */
const crossValidationFrameworkMessages: ChatMessage[] = [
  {
    id: "m-cross-validation-framework-assistant",
    role: "assistant",
    createdAt: "2026-08-18T15:00:00+08:00",
    blocks: [
      {
        kind: "text",
        text: "以下为固定展示的交叉验证思考框架，可直接查看完整编排过程，无需重新上传材料或等待任务执行。",
      },
      {
        kind: "validation-demo",
        progress: 100,
        status: "completed",
        mode: "cross-validation",
      },
    ],
  },
];

const frameworkComparisonMessages: ChatMessage[] = [
  ...investmentFrameworkMessages,
  ...crossValidationFrameworkMessages,
];

/** 任务完成后会注入到对话流的挑战质询块（与已完成示例同结构，但聚焦"团队基因 + 战略可行性"） */
const challengePendingResultBlock: AssistantBlock = {
  kind: "challenge-list",
  title: "团队基因与战略可行性 · 灵魂质询清单（3 条 · 已按 R2 稳健均衡型口径过滤）",
  summary:
    "围绕「销售型团队管理底层 Agent 平台」这一基因错配，结合 60% 综合毛利假设与对单一模型的依赖度，给出 3 条核心拷问与对应的对赌 / 条款建议。",
  items: [
    {
      id: "cp-1",
      riskLevel: "R4",
      title: "CTO 履历背书缺位，技术决策权重存疑",
      coreLogic:
        "CTO 张某仅以「资深架构师」概称、未披露项目与年限；外部公开渠道无对应 ML / Infra 项目背书；销售背景的两位联创合计持有 62% 表决权，技术路径决策存在系统性偏差风险。",
      evidence: [
        {
          document: "BP_2026Q2.pptx",
          page: 6,
          excerpt:
            "CTO 张某：「曾任职某 AI 独角兽资深架构师」，但未披露具体项目与时间区间。",
          highlight: ["资深架构师"],
        },
      ],
      actionAdvice: [
        "建议增设 CTO 履历背调专项条款，由第三方完成（45 天内出具）",
        "投后协议预留关键岗位变更知会权 + 12 个月内不可单方调整 CTO",
        "在董事会层面引入一名独立技术董事席位（投资方提名）",
      ],
      category: "团队",
    },
    {
      id: "cp-2",
      riskLevel: "R4",
      title: "销售基因 vs 平台型产品执行节奏错配",
      coreLogic:
        "公司 2025 年 H1 新签 9 个客户中 7 个为定制项目（单客户毛利 < 25%），而 BP 描绘的是 PLG 模式（订阅毛利 65%）。在缺乏产品负责人的情况下，销售团队主导的路线极易在 12 个月内回到「人月单」模型，背离平台估值逻辑。",
      evidence: [
        {
          document: "FDD 底稿.xlsx",
          page: "Sheet · 客户与合同",
          excerpt:
            "2025 H1 新签合同 9 单，其中定制开发 7 单（客单价 78 – 220 万），订阅类 2 单（ARR 共 36 万）。",
          highlight: ["定制开发 7 单", "ARR 共 36 万"],
        },
      ],
      actionAdvice: [
        "加入「12 个月内订阅 ARR 占比不低于 35%」的业绩补偿触发线",
        "建议公司在 90 天内招聘产品负责人，否则触发本轮 5% 投后股权调整权",
      ],
      category: "团队",
    },
    {
      id: "cp-3",
      riskLevel: "R3",
      title: "对单一基础模型的成本敞口未做对冲",
      coreLogic:
        "目前 88% 调用集中在 GPT-5.4，公司未引入路由层；若模型涨价 30% 或 SLA 下降，单笔订单毛利将由 20% 跌至 -3%。",
      evidence: [
        {
          document: "FDD 底稿.xlsx",
          page: "Sheet · UE 测算",
          excerpt:
            "推理调用占比：GPT-5.4 88% / Claude 4.6 7% / 自研开源 5%；当前底层 API 成本占客单价 38%。",
          highlight: ["88%", "38%"],
        },
      ],
      actionAdvice: [
        "要求 6 个月内引入至少 2 家底层模型供应商并接入 AI Gateway 路由",
        "在条款中约定「单一模型供应商占比 > 70% 持续 2 个季度」需董事会单议",
      ],
      category: "产品",
    },
  ],
  citations: [],
};

/** 预置任务：演示用户发起挑战质询后右侧栏出现「任务卡片」的过程（按 30s/任务 推进） */
export const initialRunningTasks: RunningTask[] = [
  {
    id: "task-aurora-challenge-pending",
    projectId: "proj-aurora",
    conversationId: "conv-aurora-challenge-pending",
    kind: "challenge",
    title: "团队基因与战略可行性挑战",
    summary:
      "围绕 CTO 履历背书、销售型团队管理 Agent 平台、对单一模型的依赖度做 3 维深度拷问。",
    // 已运行约 5s（30s 总时长），进度 ≈ 18%
    progress: 18,
    startedAt: new Date(Date.now() - 5_400).toISOString(),
    process: buildChallengeProcess({
      projectName: "极光智算 Pre-A 轮",
      documentCount: 5,
    }),
    resultBlocks: [challengePendingResultBlock],
  },
];

/**
 * 演示「批量上传后关键信息缺失 → 分析终止」场景：
 * 用户上传了 BP + 行业研报，缺审计 / 议案 / FDD，Agent 终止解析并要求补传。
 */
const analysisAbortedMessages: ChatMessage[] = [
  {
    id: "m-aborted-assistant",
    role: "assistant",
    createdAt: "2026-05-26T10:39:21+08:00",
    blocks: [
      {
        kind: "analysis-aborted",
        title: "解析任务已终止：缺少关键尽调资料",
        reason:
          "已识别 3 份资料均为「市场端」材料（BP + 研报 + 公司 Deck），但缺乏可用于交叉验证的财务、法律与议案文件，Agent 无法在 R2 稳健均衡口径下输出有据可依的事实验证与挑战质询，已主动终止以避免输出失真结论。",
        parsedSummary: { parsed: 3, total: 3 },
        missingItems: [
          {
            key: "audit-report",
            label: "2024 年度审计报告（含合并 / 单体）",
            requirement: "财务尽调",
            severity: "R5",
            hint:
              "缺审计无法验证营收 / 现金流真实性，事实交叉验证模块将完全失效。",
          },
          {
            key: "fdd-workbook",
            label: "FDD 财务底稿（含口径调节表）",
            requirement: "财务尽调",
            severity: "R5",
            hint:
              "FDD 是估值平行测算与对赌条款建议的最低输入，缺则估值模块无法运行。",
          },
          {
            key: "ic-memo",
            label: "投决议案 / IM（含估值与定价章节）",
            requirement: "投决议案",
            severity: "R4",
            hint:
              "议案是 Agent 的「对照基线」，缺则只能基于 BP 表述自说自话，会降低挑战质询的针对性。",
          },
          {
            key: "ldd-report",
            label: "法律尽调备忘 LDD（含股权结构 / 重大合同）",
            requirement: "法律尽调",
            severity: "R3",
            hint:
              "缺则无法判断对赌 / 反稀释 / 优先清算等条款的合规风险敞口，可在后续补传。",
          },
        ],
        nextSteps: [
          "请补传以上 R5 / R4 资料后，Agent 会自动重启解析并恢复全部分析能力",
          "如暂无审计报告，可先用「FDD 底稿 + 主合同」组合作为最小可行输入",
          "如确需仅基于 BP 做行业判断，请通过下方「快速上传」按钮明确告知 Agent 切换为「轻分析模式」",
        ],
      },
    ],
  },
];

export const mockConversations: Conversation[] = [
  {
    id: "conv-aurora-framework-comparison",
    projectId: "proj-aurora",
    title: "双思考框架对比",
    messages: frameworkComparisonMessages,
    createdAt: "2026-08-18T15:10:00+08:00",
    updatedAt: "2026-08-18T15:10:00+08:00",
  },
  {
    id: "conv-aurora-cross-validation-framework",
    projectId: "proj-aurora",
    title: "交叉验证思考框架",
    messages: crossValidationFrameworkMessages,
    createdAt: "2026-08-18T15:00:00+08:00",
    updatedAt: "2026-08-18T15:00:00+08:00",
  },
  {
    id: "conv-aurora-investment-framework",
    projectId: "proj-aurora",
    title: "投资分析思考框架",
    messages: investmentFrameworkMessages,
    createdAt: "2026-08-18T14:20:00+08:00",
    updatedAt: "2026-08-18T14:20:00+08:00",
  },
  {
    id: "conv-aurora-fact",
    projectId: "proj-aurora",
    title: "营收与现金流交叉验证",
    messages: factVerificationMessages,
    createdAt: "2026-05-12T09:20:00+08:00",
    updatedAt: "2026-05-12T09:23:00+08:00",
  },
  {
    id: "conv-aurora-challenge-pending",
    projectId: "proj-aurora",
    title: "团队基因与战略可行性挑战",
    messages: challengePendingMessages,
    createdAt: new Date(Date.now() - 26_000).toISOString(),
    updatedAt: new Date(Date.now() - 24_000).toISOString(),
  },
  {
    id: "conv-aurora-route",
    projectId: "proj-aurora",
    title: "项目整体怎么样",
    messages: routeAmbiguousMessages,
    createdAt: "2026-05-12T09:28:00+08:00",
    updatedAt: "2026-05-12T09:28:35+08:00",
  },
  {
    id: "conv-aurora-challenge",
    projectId: "proj-aurora",
    title: "核心投资逻辑挑战质询",
    messages: challengeMessages,
    createdAt: "2026-05-12T09:31:00+08:00",
    updatedAt: "2026-05-12T09:32:00+08:00",
  },
  {
    id: "conv-aurora-valuation",
    projectId: "proj-aurora",
    title: "估值合理性平行测算",
    messages: valuationMessages,
    createdAt: "2026-05-12T09:48:00+08:00",
    updatedAt: "2026-05-12T09:49:00+08:00",
  },
  {
    id: "conv-nebula-aborted",
    projectId: "proj-nebula",
    title: "首批资料解析",
    messages: analysisAbortedMessages,
    createdAt: "2026-05-26T10:38:00+08:00",
    updatedAt: "2026-05-26T10:39:30+08:00",
  },
  {
    id: "conv-haizhi-review",
    projectId: "proj-haizhi",
    title: "投资分析独立复核",
    messages: haizhiReportMessages,
    createdAt: "2026-05-31T17:00:00+08:00",
    updatedAt: "2026-05-31T17:18:00+08:00",
  },
  {
    id: "conv-haizhi-validation",
    projectId: "proj-haizhi",
    title: "投决报告事实交叉验证",
    messages: haizhiValidationReportMessages,
    createdAt: "2026-06-18T10:10:00+08:00",
    updatedAt: "2026-06-18T10:16:40+08:00",
  },
  {
    id: "conv-sifanshi-cross-check",
    projectId: "proj-sifanshi",
    title: "投资备忘录 ⇄ 尽调交叉验证",
    messages: sifanshiReportMessages,
    createdAt: "2026-06-04T14:00:00+08:00",
    updatedAt: "2026-06-04T14:18:00+08:00",
  },
  {
    id: "conv-sifanshi-validation",
    projectId: "proj-sifanshi",
    title: "投资备忘录事实交叉验证",
    messages: sifanshiValidationReportMessages,
    createdAt: "2026-06-11T09:40:00+08:00",
    updatedAt: "2026-06-11T09:48:30+08:00",
  },
];

/** 兼容旧导入：取首个 conversation 的 messages 作为默认 */
export const mockMessages: ChatMessage[] = factVerificationMessages;
