import { useMemo, useState } from "react";

import { AppIcon } from "@/src/components/ui/app-icon";
import { Button } from "@/src/components/ui/button";
import {
  IconArrowRight,
  IconCalculator,
  IconCheckCircle,
  IconChevronDown,
  IconDatabase,
  IconFactCheck,
  IconFileSearch,
  IconGlobe,
  IconFileText,
  IconShieldAlert,
  IconShieldCheck,
  IconTarget,
  IconTrendUp,
} from "@/src/lib/icons";
import type { Project } from "@/src/types";

export type WorkspaceStage =
  | "contact"
  | "intake"
  | "approved"
  | "diligence"
  | "decided"
  | "signed"
  | "funded"
  | "post";

export const WORKSPACE_STAGES: Array<{
  id: WorkspaceStage;
  label: string;
  shortLabel: string;
  group: string;
}> = [
  { id: "contact", label: "接触", shortLabel: "接触", group: "前期判断" },
  { id: "intake", label: "入库", shortLabel: "入库", group: "前期判断" },
  { id: "approved", label: "已立项", shortLabel: "立项", group: "立项评估" },
  { id: "diligence", label: "尽调", shortLabel: "尽调", group: "投前决策" },
  { id: "decided", label: "已投决", shortLabel: "投决", group: "投前决策" },
  { id: "signed", label: "已签协议", shortLabel: "签约", group: "交易执行" },
  { id: "funded", label: "已出资", shortLabel: "出资", group: "交易执行" },
  { id: "post", label: "投后", shortLabel: "投后", group: "持续管理" },
];

export function getInitialWorkspaceStage(project: Project): WorkspaceStage {
  if (project.lifecycleStage) return project.lifecycleStage;
  if (project.status === "draft") return "contact";
  if (project.status === "parsing") return "intake";
  return "diligence";
}

type Tone = "positive" | "attention" | "warning" | "neutral";

interface StageTool {
  label: string;
  detail: string;
  icon: typeof IconTarget;
  prompt: string;
  primary?: boolean;
}

interface DecisionWorkspaceProps {
  project: Project;
  stage: WorkspaceStage;
  onAsk: (prompt: string) => void;
  onOpenReports: () => void;
  onOpenArchive?: () => void;
  reportCount: number;
  focusMessagesKey?: number;
}

interface Metric {
  label: string;
  value: string;
  detail: string;
  tone?: Tone;
}

interface Challenge {
  title: string;
  category: string;
  impact: string;
  status: string;
  tone: Tone;
  evidence: string;
  action: string;
}

interface StageSnapshot {
  status: string;
  reviewState: string;
  title: string;
  summary: string;
  decision: string;
  decisionTone: Tone;
  decisionBody: string;
  metrics: Metric[];
  thesis: string[];
  challenges: Challenge[];
  conditions: string[];
  facts: Metric[];
  market: Metric[];
  changes: Array<{ time: string; title: string; detail: string; tone: Tone }>;
  nextAction: string;
  nextPrompt: string;
}

const stageCopy: Record<WorkspaceStage, Pick<StageSnapshot, "status" | "reviewState" | "title" | "nextAction" | "nextPrompt">> = {
  contact: { status: "待初筛", reviewState: "未提交", title: "先判断是否值得投入研究", nextAction: "补齐项目画像", nextPrompt: "请基于当前项目资料判断是否值得进入入库，并列出必须补齐的事实。" },
  intake: { status: "材料解析中", reviewState: "材料解析中", title: "确认材料是否达到入库门槛", nextAction: "查看材料门", nextPrompt: "请检查当前材料完整性，标出无法支持入库判断的缺口。" },
  approved: { status: "已立项", reviewState: "主席初审中", title: "把研究资源集中到高影响假设", nextAction: "生成初审问题", nextPrompt: "请以投委会主席视角生成首轮高影响质询，并按决策影响排序。" },
  diligence: { status: "尽调中", reviewState: "主席初审中", title: "当前建议：有条件推进，先补证再谈价格", nextAction: "退回补证", nextPrompt: "请审阅当前项目，列出会改变投资结论的三项证据缺口。" },
  decided: { status: "已投决", reviewState: "待确认决议", title: "条件式通过，交割前提需要锁定", nextAction: "查看决议条件", nextPrompt: "请复核已投决项目的剩余条件，并说明哪些条件会阻断交割。" },
  signed: { status: "已签协议", reviewState: "条件验收中", title: "跟踪交割条件，不覆盖原决议", nextAction: "检查交割条件", nextPrompt: "请检查签约后的交割条件完成度，并提示逾期风险。" },
  funded: { status: "已出资", reviewState: "投后基线待确认", title: "建立投后基线，锁定首次复盘指标", nextAction: "建立投后基线", nextPrompt: "请根据当前资料建立投后基线，列出未来 90 天最重要的指标。" },
  post: { status: "投后跟踪", reviewState: "持续监控", title: "监控关键指标与重新审议触发器", nextAction: "查看监控指标", nextPrompt: "请总结当前投后指标变化，并识别需要重新提交投委会的触发器。" },
};

function buildSnapshot(project: Project, stage: WorkspaceStage): StageSnapshot {
  const company = project.name || "当前项目";
  const base = stageCopy[stage];
  const isEarly = project.stage === "early-growth";
  const commonMetrics: Metric[] = [
    { label: "拟投金额", value: isEarly ? "¥2,000万" : "¥4,500万", detail: "本轮新增投资", tone: "neutral" },
    { label: "投前估值", value: isEarly ? "¥6.0亿" : "¥29.5亿", detail: "建议价格口径", tone: "attention" },
    { label: "目标持股", value: isEarly ? "8.0%" : "3.8%", detail: "含 ESOP 稀释测算", tone: "neutral" },
    { label: "基准回报", value: isEarly ? "3.4x / 28%" : "2.6x / 21%", detail: "MOIC / IRR · 5 年", tone: "positive" },
  ];

  const facts: Metric[] = [
    { label: "收入质量", value: stage === "post" ? "持续观察" : "部分证实", detail: "一次性订单占比待核验", tone: "attention" },
    { label: "现金流", value: "¥2,415万", detail: "较议案口径低 15%", tone: "warning" },
    { label: "客户集中度", value: "Top 3 · 62%", detail: "复购证据仍不充分", tone: "attention" },
    { label: "主体穿透", value: "已确认", detail: "股权与关联方已归集", tone: "positive" },
  ];
  const market: Metric[] = [
    { label: "可比增速", value: "32%–46%", detail: "2025 年公开样本", tone: "positive" },
    { label: "可比估值", value: "6.8x–9.5x", detail: "收入倍数区间", tone: "attention" },
    { label: "退出流动性", value: "中等", detail: "审核周期存在不确定性", tone: "attention" },
    { label: "市场口径", value: "2025 Q4", detail: "外部数据截止日", tone: "neutral" },
  ];

  const challenges: Challenge[] = stage === "contact" || stage === "intake"
    ? [
        { title: "客户案例能否独立核验？", category: "客户", impact: "影响入库判断", status: "待回答", tone: "attention", evidence: "公开案例 · 管理层访谈", action: "补充客户联系人与合同锚点" },
        { title: "最终受益人和关联方是否完整？", category: "法务", impact: "影响主体合规", status: "证据不足", tone: "warning", evidence: "工商信息 · 股权结构图", action: "完成一层穿透并归档证明" },
      ]
    : [
        { title: "增长是否由可持续复购支撑？", category: "商业", impact: "影响建议与估值", status: "证据不足", tone: "warning", evidence: "客户明细表 · 财务尽调", action: "补充 cohort、续约和回款证据" },
        { title: "现金流缺口是否会改变价格边界？", category: "财务", impact: "影响报价与金额", status: "需复审", tone: "attention", evidence: "审计报告 p.18 · 投决议案 p.8", action: "按经营性现金流重算估值" },
        { title: "退出路径是否支持当前回报？", category: "退出", impact: "影响上会状态", status: "待确认", tone: "attention", evidence: "可比交易 · 退出案例", action: "补充退出门槛与流动性假设" },
        { title: "核心条款能否把风险变成条件？", category: "交易", impact: "影响交割", status: "待处理", tone: "neutral", evidence: "交易条款清单 · 法务意见", action: "写入里程碑释放与价格调整机制" },
      ];

  const conditions = stage === "decided" || stage === "signed"
    ? ["核心客户续约与最低采购承诺写入协议", "回购权和历史股权事项完成清理", "交割前补交现金流与应收账款验收证据"]
    : ["不接受原报价：价格上限不高于 ¥5.2 亿投前估值", "核心客户续约 / 回款证据未闭环前，不进入全额出资", "重大法务或主体冲突未关闭时，自动转为暂缓阻断"];

  return {
    ...base,
    summary: stage === "diligence"
      ? `${company} 的业务方向与机构策略匹配，但当前材料还不足以支持原报价。主席 Agent 建议先完成三项补证，再决定是否进入正式审议。`
      : `${company} 当前处于“${base.status}”。首页优先展示会改变判断的事实、交易边界和主席待办，完整证据可从下方入口展开。`,
    decision: stage === "diligence" ? "有条件可审议" : stage === "decided" ? "条件式通过" : stage === "post" ? "继续持有，按指标复盘" : "继续推进",
    decisionTone: stage === "diligence" || stage === "decided" ? "attention" : "positive",
    decisionBody: stage === "diligence" ? "补证完成且价格回到边界内，可进入会前预读；否则暂缓，不建议按当前报价推进。" : "结论基于当前版本材料，新的重大证据会创建独立版本，不覆盖已锁定判断。",
    metrics: commonMetrics,
    thesis: [
      "产品已切入高频业务流程，客户付费意愿具备一手验证路径。",
      "团队在目标行业有交付经验，但关键人依赖和规模化能力仍需验证。",
      "市场空间支持成长叙事，当前价格需要由现金流与退出基准共同约束。",
    ],
    challenges,
    conditions,
    facts,
    market,
    changes: [
      { time: "今天 09:40", title: "新增财务底稿，现金流口径下修", detail: "经营性现金流由 ¥2,840 万调整为 ¥2,415 万，价格边界需要重算。", tone: "warning" },
      { time: "昨天 16:20", title: "主体穿透完成一轮核验", detail: "直接股东与关联方已归集，最终受益人证据仍需留痕。", tone: "positive" },
      { time: "5 月 28 日", title: "主席 Agent 形成首版质询", detail: "已生成 4 个高影响问题，等待责任人补证。", tone: "attention" },
    ],
    nextAction: base.nextAction,
    nextPrompt: base.nextPrompt,
  };
}

export function getStageTools(stage: WorkspaceStage, projectName: string): StageTool[] {
  const subject = projectName || "当前项目";
  const tools: Record<WorkspaceStage, StageTool[]> = {
    contact: [
      { label: "生成项目画像", detail: "主体、团队、产品与策略匹配", icon: IconTarget, prompt: `请为${subject}生成一页项目画像，并标出进入入库前必须核验的事实。`, primary: true },
      { label: "核验公开信号", detail: "建立第一批证据锚点", icon: IconGlobe, prompt: `请对${subject}的公开信号做事实核验，区分来源、日期和可靠性。` },
    ],
    intake: [
      { label: "检查材料门", detail: "识别缺失、重复和解析失败", icon: IconFileSearch, prompt: `请检查${subject}的投决包材料门，列出缺失文件和无法读取的证据。`, primary: true },
      { label: "建立主体底稿", detail: "归集股权与关联方", icon: IconDatabase, prompt: `请为${subject}建立主体与股权事实底稿，标记证据不足项。` },
    ],
    approved: [
      { label: "生成主席质询", detail: "按决策影响排序", icon: IconFactCheck, prompt: `请以投委会主席视角为${subject}生成首轮质询台账，给出责任人和关闭标准。`, primary: true },
      { label: "拆解投资主张", detail: "事实、假设与影响关系", icon: IconTarget, prompt: `请把${subject}的投资逻辑拆成事实、假设、影响、判断和动作五层。` },
    ],
    diligence: [
      { label: "发起事实核验", detail: "对照投决议案与尽调材料", icon: IconFactCheck, prompt: `请对${subject}发起事实交叉验证，优先检查会改变金额、价格和上会状态的数字。`, primary: true },
      { label: "打开条件推演", detail: "比较价格、金额与保护条款", icon: IconCalculator, prompt: `请为${subject}生成基准、下行和极端下行情景，并给出价格边界。` },
      { label: "退回补证", detail: "生成责任人和截止时间", icon: IconShieldAlert, prompt: `请为${subject}生成退回补证清单，按决策影响排序并指定关闭标准。` },
    ],
    decided: [
      { label: "查看决议条件", detail: "确认条件可验收", icon: IconCheckCircle, prompt: `请复核${subject}的正式决议条件，标记不可验收或可能阻断交割的条目。`, primary: true },
      { label: "生成会议预读", detail: "压缩争议与委员问题", icon: IconFileText, prompt: `请为${subject}生成投委会会前预读一页纸，突出争议、边界和待确认事项。` },
    ],
    signed: [
      { label: "检查交割条件", detail: "核对责任人、期限与证据", icon: IconCheckCircle, prompt: `请检查${subject}签约后的交割条件进度，输出逾期风险和补救动作。`, primary: true },
      { label: "复核条款变化", detail: "比较签约版与决议版", icon: IconFactCheck, prompt: `请比较${subject}签约条款与已锁定决议，标出影响风险边界的变化。` },
    ],
    funded: [
      { label: "建立投后基线", detail: "收入、现金流与客户指标", icon: IconDatabase, prompt: `请为${subject}建立投后 90 天基线，列出指标来源和复盘频率。`, primary: true },
      { label: "生成首次复盘", detail: "回看承诺是否兑现", icon: IconTrendUp, prompt: `请生成${subject}的首次投后复盘清单，重点关注决议条件和关键假设。` },
    ],
    post: [
      { label: "查看监控指标", detail: "识别变化与触发器", icon: IconTrendUp, prompt: `请总结${subject}的投后指标变化，并识别需要重新审议的触发器。`, primary: true },
      { label: "发起季度复盘", detail: "形成可追溯审阅版本", icon: IconFileText, prompt: `请为${subject}生成季度投后复盘，保留历史版本并列出主席待处理事项。` },
    ],
  };
  return tools[stage];
}

export function StageTools({
  stage,
  tools,
  reportCount,
  onOpenReports,
  onAsk,
}: {
  stage: WorkspaceStage;
  tools: StageTool[];
  reportCount: number;
  onOpenReports: () => void;
  onAsk: (prompt: string) => void;
}) {
  const stageLabel = WORKSPACE_STAGES.find((item) => item.id === stage)?.label ?? "当前阶段";
  return (
    <section className="chair-stage-tools" aria-label={`${stageLabel}阶段工具`}>
      <div className="chair-stage-tools-heading">
        <div>
          <span>阶段工作台</span>
          <strong>{stageLabel} · 下一步动作</strong>
        </div>
        <button type="button" onClick={onOpenReports} className="chair-resource-link">
          <span>历史报告{reportCount > 0 ? ` ${reportCount}` : ""}</span>
          <AppIcon icon={IconArrowRight} size={11} />
        </button>
      </div>
      <div className="chair-stage-tool-list">
        {tools.map((tool) => (
          <button
            key={tool.label}
            type="button"
            className={`chair-stage-tool ${tool.primary ? "is-primary" : ""}`}
            onClick={() => onAsk(tool.prompt)}
          >
            <span className="chair-stage-tool-icon"><AppIcon icon={tool.icon} size={15} /></span>
            <span className="chair-stage-tool-copy"><strong>{tool.label}</strong><small>{tool.detail}</small></span>
            <AppIcon icon={IconArrowRight} size={12} className="chair-stage-tool-arrow" />
          </button>
        ))}
      </div>
    </section>
  );
}

export function DecisionWorkspace({ project, stage, onAsk, onOpenReports, reportCount }: DecisionWorkspaceProps) {
  const snapshot = useMemo(() => buildSnapshot(project, stage), [project, stage]);
  const evidenceCoverage = project.files.length === 0
    ? "0%"
    : `${Math.round((project.files.filter((file) => file.status === "indexed").length / project.files.length) * 100)}%`;
  const [selectedChallenge, setSelectedChallenge] = useState(0);
  const [showAllChallenges, setShowAllChallenges] = useState(false);
  const [actionTaken, setActionTaken] = useState<string | null>(null);
  const visibleChallenges = showAllChallenges ? snapshot.challenges : snapshot.challenges.slice(0, 3);
  const selected = snapshot.challenges[selectedChallenge] ?? snapshot.challenges[0];

  return (
    <div className="chair-workspace">
      <div className="chair-workspace-toolbar">
        <div>
          <span className="chair-kicker">CHAIR REVIEW</span>
          <div className="chair-workspace-heading"><h2>主席决策空间</h2><span className="chair-live-dot" /> <span>材料版本 v0.9 · 数据截止 2026-05-31</span></div>
        </div>
        <div className="chair-toolbar-actions">
          <button type="button" className="chair-quiet-action" onClick={() => onAsk(snapshot.nextPrompt)}><AppIcon icon={IconFactCheck} size={13} />问主席 Agent</button>
          <button type="button" className="chair-quiet-action" onClick={onOpenReports}><AppIcon icon={IconFileSearch} size={13} />报告</button>
        </div>
      </div>

      <section className={`chair-conclusion tone-${snapshot.decisionTone}`}>
          <div className="chair-conclusion-topline"><span className="chair-status-chip">{snapshot.status}</span><span className="chair-review-state"><AppIcon icon={IconFileText} size={12} /> {snapshot.reviewState}</span></div>
        <div className="chair-conclusion-grid">
          <div className="chair-conclusion-copy"><h3>{snapshot.title}</h3><p>{snapshot.summary}</p></div>
          <div className="chair-decision-box"><span>主席建议</span><strong>{snapshot.decision}</strong><small>{snapshot.decisionBody}</small></div>
        </div>
        <div className="chair-conclusion-actions">
          <Button size="sm" variant="default" onClick={() => { setActionTaken("可审议"); onAsk("请将当前项目标记为可审议前的检查项，并列出仍需主席确认的风险。"); }}><AppIcon icon={IconCheckCircle} size={13} />确认准备度</Button>
          <Button size="sm" variant="outline" onClick={() => { setActionTaken("退回补证"); onAsk(snapshot.nextPrompt); }}><AppIcon icon={IconShieldAlert} size={13} />退回补证</Button>
          <Button size="sm" variant="ghost" onClick={() => onAsk("请打开当前项目的条件推演，比较基准、下行和极端下行路径。")}><AppIcon icon={IconCalculator} size={13} />条件推演</Button>
          {actionTaken && <span className="chair-action-confirmed"><AppIcon icon={IconCheckCircle} size={12} />已记录：{actionTaken}</span>}
        </div>
      </section>

      <section className="chair-section">
        <SectionHeader eyebrow="RECOMMENDATION" title="投资经理建议 vs 主席 Agent 建议" action="查看差异" onAction={() => onAsk("请解释投资经理建议与主席 Agent 建议的差异，并逐条关联证据。")} />
        <div className="chair-recommendation-grid">
          <Recommendation label="投资经理建议" value="建议投资" detail="按 ¥6.0 亿投前估值投入 ¥2,000 万，目标持股 8%。" tone="neutral" />
          <div className="chair-compare-arrow"><AppIcon icon={IconArrowRight} size={16} /></div>
          <Recommendation label="主席 Agent 建议" value={snapshot.decision} detail="价格需要回到边界内，并将客户续约、现金流和退出路径转成可验收条件。" tone={snapshot.decisionTone} />
        </div>
      </section>

      <section className="chair-section">
        <SectionHeader eyebrow="DEAL BOUNDARY" title="交易方案与价格边界" action="打开估值推演" onAction={() => onAsk("请打开估值推演，比较当前报价、价格上限和保护条款对 MOIC / IRR 的影响。")} />
        <div className="chair-metric-grid">{snapshot.metrics.map((metric) => <MetricTile key={metric.label} metric={metric} />)}</div>
        <div className="chair-scenario-strip"><span>情景回报</span><strong>基准 3.4x / 28%</strong><strong className="is-attention">下行 1.7x / 9%</strong><strong className="is-warning">极端下行 0.8x / -6%</strong><small>稀释、退出倍数和现金流口径变动后重算</small></div>
      </section>

      <section className="chair-section">
        <SectionHeader eyebrow="CHALLENGE LEDGER" title="最可能改变判断的问题" action={snapshot.challenges.length > 3 && (showAllChallenges ? "收起" : `查看全部 ${snapshot.challenges.length}`)} onAction={() => setShowAllChallenges((value) => !value)} />
        <div className="chair-challenge-layout">
          <div className="chair-challenge-list">
            {visibleChallenges.map((challenge, index) => (
              <button type="button" key={challenge.title} className={`chair-challenge-row tone-${challenge.tone} ${index === selectedChallenge ? "is-selected" : ""}`} onClick={() => setSelectedChallenge(index)}>
                <span className="chair-challenge-index">{String(index + 1).padStart(2, "0")}</span><span className="chair-challenge-copy"><strong>{challenge.title}</strong><small>{challenge.category} · {challenge.impact}</small></span><span className="chair-challenge-status">{challenge.status}</span><AppIcon icon={IconChevronDown} size={12} className="chair-row-chevron" />
              </button>
            ))}
          </div>
          {selected && <aside className={`chair-challenge-detail tone-${selected.tone}`}><div className="chair-detail-label">当前问题 · {selected.category}</div><h3>{selected.title}</h3><dl><div><dt>证据状态</dt><dd>{selected.evidence}</dd></div><div><dt>决策影响</dt><dd>{selected.impact}</dd></div><div><dt>建议动作</dt><dd>{selected.action}</dd></div></dl><div className="chair-detail-actions"><button type="button" onClick={() => onAsk(`请对“${selected.title}”发起事实核验并返回证据差异。`)}><AppIcon icon={IconFactCheck} size={12} />发起核验</button><button type="button" onClick={() => onAsk(`请将“${selected.title}”转为可验收的主席质询，并给出责任人和截止时间。`)}><AppIcon icon={IconArrowRight} size={12} />分派补证</button></div></aside>}
        </div>
      </section>

      <div className="chair-two-column">
        <section className="chair-section"><SectionHeader eyebrow="EVIDENCE BASE" title="企业事实" action="查看底稿" onAction={() => onAsk("请打开企业事实底稿，按主体、团队、产品、客户、财务和法务分组展示证据。")} /><div className="chair-data-grid">{snapshot.facts.map((metric) => <MetricTile key={metric.label} metric={metric} compact />)}</div></section>
        <section className="chair-section"><SectionHeader eyebrow="MARKET BENCHMARK" title="市场与外部基准" action="查看来源" onAction={() => onAsk("请打开市场基准，标注来源可靠性、数据日期以及对投资逻辑的支持或削弱。")} /><div className="chair-data-grid">{snapshot.market.map((metric) => <MetricTile key={metric.label} metric={metric} compact />)}</div></section>
      </div>

      <section className="chair-section"><SectionHeader eyebrow="DECISION LOGIC" title="三条核心投资逻辑" action="打开判断关系" onAction={() => onAsk("请打开事实 -> 假设 -> 影响 -> 判断 -> 动作的决策链，并标出当前最不稳定的前提。")} /><div className="chair-thesis-list">{snapshot.thesis.map((item, index) => <div key={item} className="chair-thesis-row"><span>{index + 1}</span><p>{item}</p><AppIcon icon={IconArrowRight} size={12} /></div>)}</div></section>

      <section className="chair-section"><SectionHeader eyebrow="EXECUTION GUARDRAILS" title="交割条件与不可接受事项" action="查看条件清单" onAction={() => onAsk("请把当前条件整理为责任人、截止时间、验收证据和未完成后的处置动作。")} /><div className="chair-condition-list">{snapshot.conditions.map((condition, index) => <div key={condition} className="chair-condition-row"><AppIcon icon={index === 0 ? IconShieldCheck : IconShieldAlert} size={14} /><span>{condition}</span><em>{index === 0 ? "必需" : "阻断项"}</em></div>)}</div></section>

      <section className="chair-section chair-change-section"><SectionHeader eyebrow="MATERIAL CHANGE" title="材料变化与判断留痕" action="查看全部变化" onAction={() => onAsk("请展示材料版本差异，并说明每一项变化如何影响事实、估值、质询和审议状态。")} /><div className="chair-change-list">{snapshot.changes.map((change) => <div key={change.title} className="chair-change-row"><span className={`chair-change-dot tone-${change.tone}`} /><div><div className="chair-change-topline"><strong>{change.title}</strong><time>{change.time}</time></div><p>{change.detail}</p></div></div>)}</div><div className="chair-version-foot"><span><AppIcon icon={IconDatabase} size={12} /> {project.files.length} 份材料已索引 · 证据覆盖 {evidenceCoverage}</span><span><AppIcon icon={IconFileText} size={12} /> 最近更新 {project.updatedAt ? new Date(project.updatedAt).toLocaleDateString("zh-CN") : "刚刚"}</span><button type="button" onClick={onOpenReports}>打开历史报告 <AppIcon icon={IconArrowRight} size={11} /></button></div></section>
    </div>
  );
}

function SectionHeader({ eyebrow, title, action, onAction }: { eyebrow: string; title: string; action?: string | false; onAction?: () => void }) {
  return <div className="chair-section-header"><div><span>{eyebrow}</span><h3>{title}</h3></div>{action && <button type="button" onClick={onAction}>{action}<AppIcon icon={IconArrowRight} size={11} /></button>}</div>;
}

function Recommendation({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: Tone }) {
  return <div className={`chair-recommendation tone-${tone}`}><span>{label}</span><strong>{value}</strong><p>{detail}</p><small><AppIcon icon={tone === "attention" ? IconShieldAlert : IconCheckCircle} size={11} /> 证据与判断已关联</small></div>;
}

function MetricTile({ metric, compact = false }: { metric: Metric; compact?: boolean }) {
  return <div className={`chair-metric-tile tone-${metric.tone ?? "neutral"} ${compact ? "is-compact" : ""}`}><span>{metric.label}</span><strong>{metric.value}</strong><small>{metric.detail}</small></div>;
}
