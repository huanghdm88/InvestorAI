import type { Project, ProjectLifecycleStage, SourceAnchor } from "@/src/types";

export type LateStageKey = Extract<ProjectLifecycleStage, "signed" | "funded" | "post">;
export type LateStageFactStatus = "confirmed" | "pending" | "scenario" | "inherited";
export interface LateStageFact {
  id: string;
  label: string;
  value: string;
  date: string;
  version: string;
  status: LateStageFactStatus;
  source?: SourceAnchor;
  inherited?: { stage: LateStageKey; date: string; version: string };
  note?: string;
}
export interface LateStageItem {
  id: string;
  title: string;
  baseline: string;
  current: string;
  impact: string;
  evidenceNeeded: string;
  owner: string;
  deadline: string;
  status: "complete" | "pending" | "review";
  material: boolean;
  sources: SourceAnchor[];
}
export interface LateStageSection {
  id: string;
  title: string;
  committeeTitle?: string;
  items: LateStageItem[];
}
export interface LateStageBrief {
  stage: LateStageKey;
  title: string;
  summary: string;
  date: string;
  version: string;
  isDemo: boolean;
  metrics: LateStageFact[];
  facts: LateStageFact[];
  sections: LateStageSection[];
  changes: { id: string; date: string; title: string; impact: string }[];
}

const evidence = (document: string, paragraph: string, excerpt: string): SourceAnchor => ({
  document: `极光智算 · ${document}（情景演示）`, page: "情景摘要", paragraph, excerpt,
});
const plan = evidence("交易方案", "独立交易假设 · V1 · 2026-06-10", "本阶段独立演示假设：投前估值 11.8 亿元，本轮融资 1.2 亿元，我方投资 3,000 万元；投后估值 13 亿元，我方持股 2.3077%。现有投决记录中的融资总额与我方获批金额仍待确认，本情景不作为其批准依据。");
const signed = evidence("签署版协议", "关键条款 · V1 · 2026-06-12", "签署版情景：我方增资 3,000 万元，全部新增资金合计 1.2 亿元，投后估值 13 亿元；月度经营信息报送由交易方案的 10 个工作日改为 15 个工作日。出资前须完成现金流差额核验和股东名册交付。");
const payment = evidence("出资与登记对照", "交割记录 · V1 · 2026-06-30", "已出资情景：6 月 30 日我方完成 3,000 万元付款，本轮增资合计 1.2 亿元；股东名册列示我方持股 2.3077%，对应投后估值 13 亿元。交割前已完成 425 万元现金流差额核验，信息报送期限调整已由授权人确认。工商变更归档件待补。");
const baseline = evidence("投后基线", "经营与权利基线 · V1 · 2026-06-30", "投后基线引用 2026-06-30 实际出资情景：我方投资 3,000 万元，当前持股 2.3077%，交割投后估值 13 亿元。月度经常性收入目标 800 万元、毛利率目标 45%、净现金消耗上限 300 万元；重大治理事项保留约定表决权，月度经营信息于 15 个工作日内提供。");
const operations = evidence("8月经营快照", "2026-08 · V1 · 2026-08-31", "8 月经营情景：月度经常性收入 680 万元，较基线目标 800 万元低 15%；毛利率 39%，低于 45% 目标 6 个百分点；月度净现金消耗 360 万元，较 300 万元上限高 20%。现金余额 3,600 万元，以当前净消耗测算现金可支撑约 10 个月，尚未计入潜在新融资。");
const governance = evidence("治理与融资事项", "事项摘要 · V1 · 2026-08-31", "9 月董事会拟审议销售扩张预算；管理层提出下一轮融资意向，价格、金额与投资人均未确定。信息权履行正常，尚无退出交易或新融资交割，因此当前持股仍按 2.3077% 计算，不能按融资意向更新估值或确认退出回报。");

const fact = (id: string, label: string, value: string, source: SourceAnchor, date: string, status: LateStageFactStatus = "scenario", note?: string): LateStageFact => ({ id, label, value, source, date, status, version: "V1", note });
const inheritedFact = (id: string, label: string, value: string) => ({ ...fact(id, label, value, payment, "2026-06-30", "inherited"), inherited: { stage: "funded" as const, date: "2026-06-30", version: "V1" } });

const briefs: Record<LateStageKey, LateStageBrief> = {
  signed: {
    stage: "signed", title: "交割准备", summary: "交易文件已签署；1 项条款偏离待确认，2 项交割条件待完成。", date: "2026-06-12", version: "V1", isDemo: true,
    metrics: [fact("signed-investment", "签署投资额", "3,000 万元", signed, "2026-06-12"), fact("signed-share", "协议约定持股", "2.3077%", signed, "2026-06-12"), fact("signed-conditions", "交割条件", "1 / 3 已完成", signed, "2026-06-12")],
    facts: [fact("signed-plan", "方案与签署金额", "情景方案 3,000 万元 → 签署 3,000 万元", plan, "2026-06-12", "scenario", "独立交易假设；原投决金额仍待确认"), fact("signed-valuation", "投前 / 投后估值", "11.8 亿元 / 13 亿元", plan, "2026-06-12"), fact("signed-financing", "本轮融资总额", "1.2 亿元", signed, "2026-06-12"), fact("signed-version", "签署文件", "增资协议、股东协议、章程 · V1", signed, "2026-06-12")],
    sections: [
      { id: "signed-differences", title: "方案与协议差异", committeeTitle: "需确认的条款偏离", items: [{ id: "signed-information", title: "经营信息报送延后 5 个工作日", baseline: "交易方案要求月末后 10 个工作日内提供经营信息。", current: "签署版约定为 15 个工作日，尚缺偏离确认记录。", impact: "延后经营异常识别时点；需由授权人员判断是否接受，不能以签署完成代替确认。", evidenceNeeded: "条款对照表、法务意见与授权确认记录。", owner: "项目经理 / 法务", deadline: "交割前", status: "review", material: true, sources: [plan, signed] }] },
      { id: "signed-conditions", title: "交割先决条件", committeeTitle: "关键交割条件", items: [
        { id: "signed-cash", title: "425 万元现金流差额待核验", baseline: "出资前逐项解释经营现金流口径差额。", current: "调节表已收取，银行凭证与账务对应关系仍待复核。", impact: "核验完成前不计入可交割条件。", evidenceNeeded: "现金流调节表、逐项银行凭证和授权核验记录。", owner: "财务顾问 / 项目经理", deadline: "出资前", status: "pending", material: true, sources: [signed] },
        { id: "signed-register", title: "交割股东名册待交付", baseline: "应取得能够证明交割后持股的有效名册。", current: "律师正在核对新增注册资本与持股计算。", impact: "名册定稿后才能完成股份数量和交割文件核验。", evidenceNeeded: "盖章股东名册及持股计算底稿。", owner: "公司法务 / 外部律师", deadline: "出资前", status: "pending", material: true, sources: [signed] },
        { id: "signed-account", title: "收款账户与签署主体一致", baseline: "付款账户应与有效增资协议一致。", current: "账户名称、公司主体与付款通知的核对已完成。", impact: "账户核对完成；其余条件仍须分别满足。", evidenceNeeded: "付款通知及账户核对记录。", owner: "基金财务", deadline: "2026-06-12", status: "complete", material: false, sources: [signed] },
      ] },
      { id: "signed-rights", title: "权利与义务", committeeTitle: "关键权利安排", items: [{ id: "signed-governance", title: "信息权与重大事项表决权纳入协议", baseline: "交易方案要求经营信息获取和重大治理事项参与权。", current: "签署版已纳入相关权利；信息报送期限偏离单独待确认。", impact: "以最终生效的条款建立投后提醒，不能将未生效权利视作已实际取得。", evidenceNeeded: "生效协议、权利条款索引及履行责任人。", owner: "项目经理 / 法务", deadline: "交割时", status: "complete", material: true, sources: [signed] }] },
    ],
    changes: [{ id: "signed-change-1", date: "2026-06-12", title: "收到签署版交易文件", impact: "识别到 1 项信息报送期限偏离；金额与持股计算一致。" }, { id: "signed-change-2", date: "2026-06-12", title: "现金流调节表已补充", impact: "材料已收取，条件仍为待核验。" }],
  },
  funded: {
    stage: "funded", title: "实际出资与投后交接", summary: "3,000 万元出资与 2.3077% 持股已完成核对；1 项工商归档件待补，投后基线待发布。", date: "2026-06-30", version: "V1", isDemo: true,
    metrics: [fact("funded-paid", "实际出资", "3,000 万元", payment, "2026-06-30"), fact("funded-share", "实际持股", "2.3077%", payment, "2026-06-30"), fact("funded-date", "交割日期", "2026-06-30", payment, "2026-06-30")],
    facts: [fact("funded-comparison", "方案 / 协议 / 实际", "3,000 / 3,000 / 3,000 万元", payment, "2026-06-30", "scenario", "方案金额来自独立交易情景"), fact("funded-postvalue", "交割投后估值", "13 亿元", payment, "2026-06-30"), fact("funded-rights", "生效权利", "信息权、重大事项表决权", signed, "2026-06-30"), fact("funded-conditions", "交割条件", "3 / 3 已核验", payment, "2026-06-30")],
    sections: [
      { id: "funded-completed", title: "交易结果核对", committeeTitle: "实际结果与方案对照", items: [
        { id: "funded-payment", title: "付款与协议金额一致", baseline: "独立交易情景约定投资 3,000 万元。", current: "银行回单、付款通知与交割证明均对应 3,000 万元，未出现金额差异。", impact: "付款核对完成，可作为投后累计出资基线。", evidenceNeeded: "银行回单、付款通知、交割证明及核验记录。", owner: "基金财务", deadline: "2026-06-30", status: "complete", material: true, sources: [plan, payment] },
        { id: "funded-shares", title: "实际持股 2.3077%，与协议一致", baseline: "3,000 万元 ÷ 13 亿元投后估值 = 2.3077%。", current: "股东名册与增资完成后的持股计算一致，未发生额外稀释。", impact: "投后持仓与后续融资分析从实际持股起算。", evidenceNeeded: "股东名册、增资协议及持股核对底稿。", owner: "项目经理 / 法务", deadline: "2026-06-30", status: "complete", material: true, sources: [payment] },
        { id: "funded-conditions", title: "交割条件与条款偏离已完成确认", baseline: "现金流差额、有效名册及条款偏离需在出资前处理。", current: "本阶段情景中现金流核验及股东名册均已完成，报送期限调整已有授权确认。", impact: "该记录仅描述出资情景，不改变原投决工作区的待落实事项。", evidenceNeeded: "条件完成清单、偏离确认记录与交割确认函。", owner: "项目经理 / 授权确认人", deadline: "2026-06-30", status: "complete", material: true, sources: [payment] },
      ] },
      { id: "funded-handover", title: "归档与交接", committeeTitle: "持股确认与基线状态", items: [
        { id: "funded-archive", title: "工商变更归档件待补", baseline: "交易归档需保留有效签署版、付款证明、名册及登记材料。", current: "付款和名册已入档，工商变更归档件待公司补充。", impact: "持股已按名册核对；补件状态应持续保留，不能视为全套归档完成。", evidenceNeeded: "工商变更文件及归档索引。", owner: "公司法务 / 项目经理", deadline: "2026-07-10", status: "pending", material: false, sources: [payment] },
        { id: "funded-monitoring", title: "投后经营与权利基线待发布", baseline: "以实际出资、实际持股和生效协议作为投后起点。", current: "已整理月度经常性收入、毛利率、现金消耗和权利履行指标。", impact: "由项目负责人确认基线和首次跟踪周期后发布。", evidenceNeeded: "基线 V1、指标口径及负责人确认。", owner: "项目经理 / 投后团队", deadline: "2026-07-05", status: "review", material: true, sources: [payment, baseline] },
      ] },
    ],
    changes: [{ id: "funded-change-1", date: "2026-06-30", title: "出资和股东名册完成核对", impact: "实际结果一致，建立 3,000 万元 / 2.3077% 交易基线。" }, { id: "funded-change-2", date: "2026-06-30", title: "投后基线 V1 已整理", impact: "等待负责人确认后发布跟踪计划。" }],
  },
  post: {
    stage: "post", title: "投后经营与重大变化", summary: "8 月收入较目标低 15%，毛利率低 6 个百分点；现金消耗高于基线上限，需结合新增预算重新判断。", date: "2026-08-31", version: "V1", isDemo: true,
    metrics: [fact("post-revenue", "月度经常性收入", "680 万元", operations, "2026-08-31", "scenario", "基线 800 万元 · -15%"), fact("post-margin", "毛利率", "39%", operations, "2026-08-31", "scenario", "基线 45% · -6 个百分点"), fact("post-runway", "现金可支撑期", "约 10 个月", operations, "2026-08-31", "scenario", "3,600 万元 ÷ 360 万元 / 月")],
    facts: [inheritedFact("post-invested", "累计实际出资", "3,000 万元"), inheritedFact("post-share", "当前持股", "2.3077%"), inheritedFact("post-valuation", "交割投后估值", "13 亿元"), fact("post-recentvalue", "最新融资估值", "待确认", governance, "2026-08-31", "pending", "融资意向不计入估值更新")],
    sections: [
      { id: "post-deviations", title: "投前假设与经营偏差", committeeTitle: "需要重新判断的经营偏差", items: [
        { id: "post-growth", title: "收入较目标低 15%，增长兑现待验证", baseline: "月度经常性收入基线目标 800 万元，以持续付费和复购支撑增长。", current: "8 月实际为 680 万元，差额 120 万元；需拆分客户延期、流失和新增签约影响。", impact: "可能延后原增长路径，尚不能据此直接调整项目估值。", evidenceNeeded: "客户续约明细、订单转化、收入确认口径及管理层解释。", owner: "项目经理 / 公司财务", deadline: "2026-09-10", status: "review", material: true, sources: [baseline, operations] },
        { id: "post-cash", title: "毛利改善不足，现金消耗超过上限", baseline: "毛利率目标 45%，月度净现金消耗上限 300 万元。", current: "8 月毛利率 39%，净现金消耗 360 万元；可用现金 3,600 万元。", impact: "当前消耗对应约 10 个月现金可支撑期，需判断扩张预算是否需要调整。", evidenceNeeded: "API 采购成本、交付人员成本、现金预测及预算修订方案。", owner: "项目经理 / 财务顾问", deadline: "2026-09-10", status: "review", material: true, sources: [baseline, operations] },
      ] },
      { id: "post-governance", title: "治理与权利履行", committeeTitle: "待判断的治理事项", items: [
        { id: "post-budget", title: "扩张预算拟提交董事会", baseline: "重大预算变化须按治理文件履行审议流程。", current: "管理层计划扩大销售投入，预算草案与现金压力同步出现。", impact: "应结合回款和现金预测形成董事会意见，尚未形成批准结论。", evidenceNeeded: "董事会议案、滚动现金预测及预算收益测算。", owner: "外派董事 / 项目经理", deadline: "2026-09-15 董事会前", status: "pending", material: true, sources: [governance, operations] },
        { id: "post-rights", title: "月度信息权履行正常", baseline: "每月结束后 15 个工作日内提供经营信息。", current: "8 月经营快照已收到；继续跟进正式报表及勾稽底稿。", impact: "当前未发现权利履行异常。", evidenceNeeded: "月度报送记录及正式财务报表。", owner: "投后团队", deadline: "2026-09-18", status: "complete", material: false, sources: [signed, governance] },
      ] },
      { id: "post-value", title: "融资与价值实现", committeeTitle: "后续融资与退出判断", items: [{ id: "post-financing", title: "下一轮融资仅为意向，价格与稀释待评估", baseline: "实际持股 2.3077%，累计出资 3,000 万元，交割投后估值 13 亿元。", current: "管理层提出融资意向，尚无确定价格、规模和交割文件，也未发生退出。", impact: "保留当前实际持仓；取得条款后再判断是否跟投、潜在稀释与退出影响。", evidenceNeeded: "融资条款书、资金用途、估值依据与持股测算。", owner: "项目经理 / 投后团队", deadline: "取得条款后", status: "pending", material: true, sources: [payment, governance] }] },
    ],
    changes: [{ id: "post-change-1", date: "2026-08-31", title: "8 月经营快照更新", impact: "收入、毛利率和现金消耗出现偏差，相关判断待确认。" }, { id: "post-change-2", date: "2026-08-31", title: "新增董事会预算与融资意向", impact: "需准备治理意见；持股和估值尚未变化。" }],
  },
};

export function getLateStageBrief(project: Project): LateStageBrief | null {
  const stage = project.lifecycleStage;
  if (stage !== "signed" && stage !== "funded" && stage !== "post") return null;
  if (project.id === "proj-aurora") return briefs[stage];
  const reference = briefs[stage];
  return {
    stage, title: reference.title, summary: "阶段资料待补充。", date: project.updatedAt.slice(0, 10), version: "待确认", isDemo: false,
    metrics: reference.metrics.map(({ id, label }) => ({ id, label, value: "待确认", date: "待确认", version: "待确认", status: "pending" })),
    facts: [], sections: [], changes: [],
  };
}
