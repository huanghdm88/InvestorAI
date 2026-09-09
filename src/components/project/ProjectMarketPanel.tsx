import { AppIcon } from "@/src/components/ui/app-icon";
import type { CommitteeBrief } from "@/src/data/committee-briefs";
import { IconArrowRight, IconChevronDown } from "@/src/lib/icons";
import type { Project, SourceAnchor } from "@/src/types";

interface ProjectMetric { label: string; value: string; period: string; source?: SourceAnchor }
interface MarketLens { label: string; question: string; evidence: string }

/** Source-bound demo metrics only. Market lenses are research questions, not market facts. */
export function getProjectMarketContent(project: Project, brief: CommitteeBrief): { metrics: ProjectMetric[]; market: MarketLens[] } {
  const source = (paragraph: string) => brief.questions.flatMap((question) => question.sources).find((item) => item.paragraph === paragraph);
  if (brief.questions.some((question) => question.id.startsWith("aurora-"))) return {
    metrics: [
      { label: "审计口径营收", value: "1.79 亿元", period: "2024 年度", source: source("经审计的合并利润表") },
      { label: "经营现金流（单体加总）", value: "2,415 万元", period: "2024 年度 · 尚待合并调节", source: source("经营活动产生的现金流量净额（单体加总）") },
      { label: "前五大客户收入占比", value: "41.2%", period: "议案客户集中度", source: source("四、客户集中度") },
      { label: "底层 API 成本占比", value: "38%", period: "2024 H2 · 单笔订单", source: source("单笔订单成本结构") },
    ],
    market: [
      { label: "需求空间", question: "企业运维 Agent 的付费需求能否由试点转为持续采购？", evidence: "待补：目标客户预算、付费试点转化与续约样本。" },
      { label: "竞争与定价", question: "相比企业自建和同类产品，交付与定价优势是否可验证？", evidence: "待补：同口径竞品报价、替代成本及客户选型记录。" },
      { label: "成本变化", question: "推理采购价格变化，会如何传导至真实订单毛利？", evidence: "待补：有效采购报价、调用量门槛与服务质量对照。" },
    ],
  };
  if (brief.questions.some((question) => question.id.startsWith("haizhi-"))) return {
    metrics: [
      { label: "营业收入", value: "2.89 亿元", period: "2024 年前十个月", source: source("主要财务尽调发现 / 模拟利润表") },
      { label: "净利润", value: "−1,341 万元", period: "2024 年前十个月", source: source("主要财务尽调发现 / 模拟利润表") },
      { label: "图数据库收入", value: "815.10 万元", period: "2024 年前十个月", source: source("商业模式 / 收入类型 / 毛利") },
      { label: "DMC 与图谱相关收入", value: "85.26%", period: "2024 年前十个月 · 占比", source: source("商业模式 / 收入类型 / 毛利") },
    ],
    market: [
      { label: "需求空间", question: "图数据库与知识图谱的需求，能否转化为标准软件订单？", evidence: "待补：可服务客户数、软件预算与项目交付边界。" },
      { label: "产品替代", question: "面对开源方案及通用数据库，商业产品的差异是否足够？", evidence: "待补：同负载测试、客户迁移成本与采购案例。" },
      { label: "退出可比", question: "哪些可比公司的收入结构和利润质量与项目接近？", evidence: "待补：可比样本及估值时点，不直接套用产品型倍数。" },
    ],
  };
  if (brief.questions.some((question) => question.id.startsWith("sifanshi-"))) return {
    metrics: [
      { label: "交易口径", value: "待统一", period: "历史演示报告存在版本冲突", source: source("B 轮交易条款") },
      { label: "控制权手续", value: "待核实", period: "以有效控制文件为准", source: source("公司对第四范式（北京）控制权瑕疵") },
      { label: "历史税务敞口", value: "待量化", period: "仅对应原材料时点", source: source("目标集团存在的税务问题") },
      { label: "经营财务数据", value: "待补充", period: "尚无可统一引用的财务口径" },
    ],
    market: [
      { label: "需求空间", question: "企业机器学习与智能决策预算能否形成可复制订单？", evidence: "待补：客户预算、付费项目与续约情况。" },
      { label: "竞争与交付", question: "AutoML 平台相较自建与定制开发，能否降低部署和维护成本？", evidence: "待补：同场景总成本、实施周期与效果验收。" },
      { label: "商业化质量", question: "收入增长依赖标准产品，还是持续增加的项目人力？", evidence: "待补：软件与服务收入、交付人效及毛利拆分。" },
    ],
  };
  return { metrics: [], market: [
    { label: "市场研究", question: `围绕${project.industry || "项目所在行业"}的客户需求、竞争替代和商业化路径补充材料。`, evidence: "尚未形成可引用的市场判断。" },
  ] };
}

export function ProjectMarketPanel({ project, brief, onViewSource }: {
  project: Project; brief: CommitteeBrief; onViewSource: (source: SourceAnchor) => void;
}) {
  const { metrics, market } = getProjectMarketContent(project, brief);
  return <details className="ic-project-market" open>
    <summary><h2>项目与市场</h2><AppIcon icon={IconChevronDown} size={12} /></summary>
    <div className="ic-project-market-grid">
      <section>
        <div className="ic-project-market-heading"><h3>项目数据</h3><span>原材料口径</span></div>
        {metrics.length ? <dl className="ic-project-data-grid">{metrics.map((metric) => <div key={metric.label}>
          <dt>{metric.label}</dt><dd>{metric.value}</dd><p>{metric.period}</p>
          {metric.source && <button type="button" onClick={() => onViewSource(metric.source!)} title={metric.source.paragraph} aria-label={`查看${metric.label}的来源`}>查看来源 <AppIcon icon={IconArrowRight} size={11} /></button>}
        </div>)}</dl> : <p className="ic-project-market-empty">暂无可引用的项目数据，补充材料后再整理。</p>}
      </section>
      <section>
        <div className="ic-project-market-heading"><h3>行业与市场</h3><span>研究方向 · 待验证</span></div>
        <div className="ic-market-lenses">{market.map((lens) => <article key={lens.label}><h4>{lens.label}</h4><p>{lens.question}</p><span>{lens.evidence}</span></article>)}</div>
      </section>
    </div>
  </details>;
}
