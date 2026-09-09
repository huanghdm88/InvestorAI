import type { EarlyStageKey, Project } from "@/src/types";

export interface EarlyStageSection {
  label: string;
  value: string;
  note?: string;
}

export interface EarlyStageBrief {
  stage: EarlyStageKey;
  title: string;
  summary: string;
  sections: EarlyStageSection[];
  nextStage: EarlyStageKey | "diligence";
  nextAction: string;
  evidenceNote: string;
  completedAt?: string;
}

const briefs: Record<EarlyStageKey, Omit<EarlyStageBrief, "stage">> = {
  contact: {
    title: "初步接触记录",
    summary: "初筛建议继续跟进；客户付费意愿、团队分工与融资用途仍待首访后核实。",
    sections: [
      { label: "来源", value: "产业合作方转介", note: "演示预置" },
      { label: "联系人", value: "创始人 / CEO（待确认）", note: "演示预置" },
      { label: "首访", value: "已完成 · 2026-05-10", note: "会议纪要未接入" },
      { label: "初筛判断", value: "建议继续了解", note: "非投资结论" },
      { label: "待补", value: "客户付费样本、团队分工、融资用途", note: "3 项缺口" },
      { label: "跟进", value: "约下一次产品与客户访谈", note: "负责人待指定" },
    ],
    nextStage: "intake",
    nextAction: "确认进入入库",
    evidenceNote: "本页内容为接触阶段演示记录，不代表已形成投资意见。",
  },
  intake: {
    title: "项目入库档案",
    summary: "核心档案已建立，待负责人确认材料缺口与基金匹配，再提交立项评估。",
    sections: [
      { label: "完整性", value: "6 / 9 项已具备", note: "演示盘点" },
      { label: "赛道 / 基金匹配", value: "行业 AI · 早期成长基金", note: "初步匹配" },
      { label: "重复项目", value: "未发现同名项目", note: "仅查本地演示库" },
      { label: "资料", value: "BP、产品介绍、首访纪要", note: "3 份 · 待解析" },
      { label: "负责人", value: "投资经理（待配置）", note: "演示预置" },
      { label: "下一步", value: "补齐客户与融资字段，提交立项评估", note: "建议动作" },
    ],
    nextStage: "approved",
    nextAction: "确认进入立项",
    evidenceNote: "项目档案字段为本地演示快照，未接入真实项目库或重复检索服务。",
  },
  approved: {
    title: "立项与尽调计划",
    summary: "拟投入商业、财务、法务与产品尽调资源，重点验证投资假设和准入条件。",
    sections: [
      { label: "立项结论", value: "建议立项 · 有条件", note: "演示结论" },
      { label: "投资假设", value: "行业 AI 预算可转为持续订阅收入", note: "待尽调验证" },
      { label: "尽调范围", value: "商业、财务、法务、产品", note: "4 个工作流" },
      { label: "人员", value: "投资经理 + 财务 / 法务顾问", note: "名单待确认" },
      { label: "时间 / 预算", value: "3 周 · 预算待确认", note: "演示预置" },
      { label: "准入条件", value: "补齐客户合同与现金流口径", note: "未满足前不进入投决" },
    ],
    nextStage: "diligence",
    nextAction: "开始尽调",
    evidenceNote: "立项内容用于演示资源安排，不代表真实审批、预算承诺或尽调结论。",
  },
};

const profiles: Record<string, Partial<Record<EarlyStageKey, Record<string, string>>>> = {
  "proj-aurora": {
    contact: { "来源": "企业软件生态伙伴转介", "联系人": "创始人及商业化负责人（演示角色）", "首访": "2026-03-03 · 产品与商业化访谈", "初筛判断": "建议继续：企业运维自动化需求明确", "待补": "付费试点、团队履历、API 采购单价", "跟进": "完成产品演示和两家客户访谈" },
    intake: { "完整性": "核心档案 9 / 9 项已整理", "赛道 / 基金匹配": "企业 AI 应用 · 早期成长基金", "重复项目": "未发现同主体记录（演示核对）", "资料": "BP、首访纪要、产品清单已归档", "负责人": "陈昱 · 投资经理（演示角色）", "下一步": "提交立项，优先验证收入与毛利假设" },
    approved: { "立项结论": "同意立项（演示记录）", "投资假设": "运维 Agent 能形成可复购订单与正向单位经济", "尽调范围": "订单转化、API 成本、财务口径、知识产权", "人员": "陈昱牵头；财务与法务顾问协同（演示）", "时间 / 预算": "2026-03-16 至 04-03 · 18 万元（演示）", "准入条件": "开放抽样客户访谈；提供合同、流水与成本底稿" },
  },
  "proj-helios": {
    contact: { "来源": "半导体产业链访谈", "初筛判断": "建议继续：需先确认客户验证与量产节点", "待补": "流片预算、良率爬坡与受限供应链依赖" },
    intake: { "完整性": "核心档案 6 / 9 项已整理", "赛道 / 基金匹配": "半导体设计 · 成长期产业基金", "资料": "投决议案初稿已索引，FDD 底稿解析中", "负责人": "林澈 · 投资经理（演示角色）", "下一步": "补齐量产计划、流片安排和供应链清单" },
    approved: { "投资假设": "量产良率与客户定点可支持芯片商业化", "尽调范围": "客户验证、流片经济学、EDA 与代工依赖", "准入条件": "取得客户验证记录与有效供应商报价" },
  },
  "proj-ocean": {
    contact: { "来源": "行业交流活动", "联系人": "创始人（演示角色，联系方式待补）", "首访": "待安排 · 产品与客户访谈", "初筛判断": "待初筛", "待补": "BP、付费客户、续约数据与融资用途", "跟进": "确认首访时间并收集基础资料" },
    intake: { "资料": "待补充 BP、客户清单和首访纪要", "赛道 / 基金匹配": "行业 SaaS · 早期成长基金" },
    approved: { "投资假设": "行业 SaaS 的 AI 功能能带来可验证付费增量", "准入条件": "取得付费、续约及交付成本样本" },
  },
  "proj-nebula": {
    intake: { "赛道 / 基金匹配": "创新药 · 生命科学基金", "资料": "BP、行业研报和公司介绍已归档", "负责人": "顾言 · 投资经理（演示角色）" },
    approved: { "立项结论": "有条件立项，资料缺口待补齐", "投资假设": "双抗管线的差异化疗效与安全性可被临床证据支持", "尽调范围": "临床数据、知识产权、财务与现金跑道", "人员": "顾言牵头；临床与财务顾问协同（演示）", "时间 / 预算": "4 周 · 预算 24 万元（演示）", "准入条件": "补齐临床试验报告、FDD 底稿和知情同意材料" },
  },
};

const auroraHistory: Record<EarlyStageKey, Omit<EarlyStageBrief, "stage">> = {
  contact: {
    ...briefs.contact,
    summary: "完成产品首访与商业化初筛，确认企业运维自动化方向具备继续研究价值，于 2026-03-06 转入项目库。",
    completedAt: "2026-03-06",
    sections: [
      { label: "项目来源", value: "企业软件生态伙伴转介" },
      { label: "主要联系人", value: "周远 · 创始人；孟宁 · 商业化负责人", note: "人物与联系方式均为演示设定" },
      { label: "跟进负责人", value: "陈昱 · 投资经理" },
      { label: "首访时间", value: "2026-03-03 · 产品与商业化线上访谈" },
      { label: "产品概况", value: "面向企业 IT 团队的运维 Agent，覆盖告警分流、工单协同与知识检索。" },
      { label: "客户概况", value: "首访介绍了企业 IT 团队的试点场景；后续验证付费、采购周期与复购。" },
      { label: "初筛结论", value: "继续跟进；需求场景明确，将订单转化与 API 成本列为后续验证重点。" },
      { label: "待补与处置", value: "团队履历、BP 和产品资料已收齐；客户合同与调用成本进入尽调待补清单。" },
      { label: "后续动作结果", value: "03-05 完成产品演示与客户访谈安排；03-06 初筛通过并转入库。" },
    ],
    evidenceNote: "历史记录快照 · 2026-03-06 由项目组确认",
  },
  intake: {
    ...briefs.intake,
    summary: "主体与项目档案完成入库，匹配早期成长基金并明确负责人；经营验证缺口已归入立项评审材料，于 2026-03-12 提交立项。",
    completedAt: "2026-03-12",
    sections: [
      { label: "主体 / 档案编号", value: "极光智算 · IW-2026-0312", note: "演示主体档案" },
      { label: "赛道 / 基金匹配", value: "企业 AI 应用 / 早期成长基金", note: "符合企业软件与 AI 应用研究范围" },
      { label: "项目负责人", value: "陈昱 · 投资经理；赵宁 · 研究协同" },
      { label: "档案完整性", value: "9 / 9 项核心信息已登记", note: "完整登记不等于已核验材料结论" },
      { label: "核心档案清单", value: "主体、联系人、BP、产品、融资、股权、团队、首访、访谈安排。" },
      { label: "去重结果", value: "本地演示项目库未发现同主体重复档案。" },
      { label: "资料版本", value: "BP_2026Q1、03-03 首访纪要、03-05 产品演示记录已入库。" },
      { label: "缺口处置", value: "客户付费样本与 API 成本清单转入立项尽调范围，由陈昱持续跟进。" },
      { label: "入库结论 / 日期", value: "同意入库并提交立项 · 2026-03-12" },
    ],
    evidenceNote: "历史档案快照 · 2026-03-12 完成入库",
  },
  approved: {
    ...briefs.approved,
    summary: "2026-03-13 立项评审通过，批准三周专项尽调安排。资料访问与访谈条件已落实，2026-03-16 正式启动尽调。",
    completedAt: "2026-03-16",
    sections: [
      { label: "评审日期 / 结论", value: "2026-03-13 · 同意立项并投入尽调资源" },
      { label: "投资假设", value: "运维 Agent 的试点可转为可复购订单，并在可控 API 成本下形成正向单位经济。" },
      { label: "项目人员", value: "陈昱牵头；赵宁负责商业；财务、法务与产品顾问分工协同。" },
      { label: "商业尽调 / 交付物", value: "验证订单转化、客户集中度与复购；交付客户访谈纪要及订单抽样表。" },
      { label: "财务尽调 / 交付物", value: "核对收入、现金流与成本口径；交付财务尽调报告及差异调节表。" },
      { label: "法律尽调 / 交付物", value: "审查股权、关键合同、数据与知识产权；交付法律风险清单。" },
      { label: "产品尽调 / 交付物", value: "评估部署边界与 API 依赖；交付产品测试记录及成本敏感性分析。" },
      { label: "计划时间", value: "2026-03-16 至 04-03 · 三周" },
      { label: "批准预算", value: "18 万元 · 包含外部专业顾问费用", note: "演示预算，不产生真实费用承诺" },
      { label: "准入条件落实", value: "数据室访问已开放；客户访谈已授权；财务与成本材料清单已确认。" },
      { label: "阶段责任边界", value: "立项仅批准尽调资源；收入与毛利假设留待尽调验证，不代表投资批准。" },
      { label: "尽调启动", value: "2026-03-16 · 已进入尽调并通知相关投委会委员" },
    ],
    evidenceNote: "历史立项快照 · 2026-03-16 进入尽调",
  },
};

export function getEarlyStageBrief(project: Project): EarlyStageBrief | null {
  const stage = project.lifecycleStage;
  if (stage !== "contact" && stage !== "intake" && stage !== "approved") return null;
  const brief = project.id === "proj-aurora" ? auroraHistory[stage] : briefs[stage];
  const saved = project.earlyStageRecords?.[stage];
  const profile = project.id === "proj-aurora" ? undefined : profiles[project.id]?.[stage];
  const knownDemo = Boolean(profiles[project.id]);
  return { stage, ...brief, summary: knownDemo ? brief.summary : "阶段记录待投资经理补充。", sections: brief.sections.map((section) => ({ ...section,
    value: saved?.[section.label] ?? profile?.[section.label] ?? (knownDemo ? section.value : "待补充"),
    note: saved?.[section.label] ? "本次会话已确认" : knownDemo && !section.note?.includes("演示预置") ? section.note : undefined,
  })) };
}

export function isHistoricalEarlyStage(project: Project) {
  return Boolean(project.currentLifecycleStage && project.currentLifecycleStage !== project.lifecycleStage);
}
