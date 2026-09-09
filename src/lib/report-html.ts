/**
 * 报告 → 单文件 HTML 导出（自包含 + 内联 CSS）。
 *
 * 同时供两处复用：
 *   1) 浏览器端「导出 HTML」按钮（src/App.tsx → downloadReportHtml）
 *   2) Node 脚本批量导出（scripts/export-sifanshi-html.ts）
 *
 * 设计原则：
 *   - 下载版统一「不带目录」（目录仅用于应用内导航）。
 *   - diligence-report 尊重 hideChrome：隐藏「结论卡 / 摘要副标题」等派生外壳。
 */
import { RISK_LEVEL_CONFIG } from "@/src/lib/risk-level";
import type {
  AssistantBlock,
  DiligenceContent,
  DiligenceSection,
  RiskLevel,
  SemanticTone,
  SourceAnchor,
  VerificationCardItem,
  VerificationCategory,
  VerificationVerdict,
} from "@/src/types";

type DiligenceBlock = Extract<AssistantBlock, { kind: "diligence-report" }>;
type FactVerificationBlock = Extract<AssistantBlock, { kind: "fact-verification" }>;
type ChallengeListBlock = Extract<AssistantBlock, { kind: "challenge-list" }>;
type ValuationBlock = Extract<AssistantBlock, { kind: "valuation" }>;
type EnterpriseBlock = Extract<AssistantBlock, { kind: "enterprise-analysis" }>;

/** 可导出的报告块 */
export type ExportableReportBlock =
  | Extract<AssistantBlock, { kind: "project-work-report" }>
  | Extract<AssistantBlock, { kind: "question-report" }>
  | DiligenceBlock
  | FactVerificationBlock
  | ChallengeListBlock
  | ValuationBlock
  | EnterpriseBlock;

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * 富文本：**加粗** → <mark>，[^N] → 上标引用链接。
 */
function renderRichText(text: string, citationCount: number): string {
  const escaped = escapeHtml(text);
  const withCites = escaped.replace(/\[\^(\d+)\]/g, (_m, idx: string) => {
    const n = parseInt(idx, 10);
    if (n < 1 || n > citationCount) return "";
    return `<sup class="cite"><a href="#cite-${n}">${n}</a></sup>`;
  });
  return withCites.replace(
    /\*\*([^*]+)\*\*/g,
    (_m, body: string) => `<mark class="hl">${body}</mark>`
  );
}

const TONE_STYLE: Record<SemanticTone, { wrap: string; text: string }> = {
  danger: { wrap: "tone-danger", text: "text-danger" },
  warning: { wrap: "tone-warning", text: "text-warning" },
  neutral: { wrap: "tone-neutral", text: "text-neutral" },
  positive: { wrap: "tone-positive", text: "text-positive" },
};

const CATEGORY_STYLE: Record<VerificationCategory, string> = {
  财务数据: "cat-blue",
  募资: "cat-violet",
  融资数据: "cat-violet",
  公司数据: "cat-cyan",
  法务合规: "cat-cyan",
  客户数据: "cat-orange",
  业务数据: "cat-emerald",
  市场行业: "cat-pink",
  团队治理: "cat-indigo",
  其他: "cat-slate",
};

const VERDICT_STYLE: Record<VerificationVerdict, string> = {
  一致: "verdict-ok",
  部分一致: "verdict-partial",
  不一致: "verdict-bad",
  证据不足: "verdict-insufficient",
};

const RISK_BODY: Record<RiskLevel, string> = {
  R1: "risk-R1",
  R2: "risk-R2",
  R3: "risk-R3",
  R4: "risk-R4",
  R5: "risk-R5",
};

function renderContent(content: DiligenceContent, citationCount: number): string {
  switch (content.type) {
    case "paragraph":
      return `<p class="paragraph">${renderRichText(content.text, citationCount)}</p>`;

    case "bullets": {
      const Tag = content.ordered ? "ol" : "ul";
      const items = content.items
        .map((it) => `<li>${renderRichText(it, citationCount)}</li>`)
        .join("");
      return `<${Tag} class="bullets ${content.ordered ? "ordered" : "dotted"}">${items}</${Tag}>`;
    }

    case "callout": {
      const s = TONE_STYLE[content.tone];
      return `<div class="callout ${s.wrap}">
  ${content.title ? `<p class="callout-title ${s.text}">${escapeHtml(content.title)}</p>` : ""}
  <p class="callout-body">${renderRichText(content.text, citationCount)}</p>
</div>`;
    }

    case "stats": {
      const cards = content.items
        .map((s) => {
          const tone = s.tone ? TONE_STYLE[s.tone].text : "";
          return `<div class="stat-card">
  <p class="stat-label">${escapeHtml(s.label)}</p>
  <p class="stat-value ${tone}">${escapeHtml(s.value)}</p>
  ${s.sub ? `<p class="stat-sub">${escapeHtml(s.sub)}</p>` : ""}
</div>`;
        })
        .join("");
      return `<div class="stats-grid">${cards}</div>`;
    }

    case "bars": {
      const rows = content.items
        .map((b) => {
          const tone = b.tone ? TONE_STYLE[b.tone].text : "";
          const fillClass = b.tone ? `bar-fill-${b.tone}` : "bar-fill-neutral";
          const value = Math.max(0, Math.min(100, b.value));
          // Keep the visual bar visible for non-zero values while exposing the
          // actual bounded value to assistive technology.
          const w = Math.max(2, value);
          return `<div class="bar-row">
  <div class="bar-meta">
    <span class="bar-label">${escapeHtml(b.label)}</span>
    <span class="bar-value ${tone}">${escapeHtml(b.display)}</span>
  </div>
  <div class="bar-track" role="progressbar" aria-label="${escapeHtml(b.label)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${value}" aria-valuetext="${escapeHtml(b.display)}"><div class="bar-fill ${fillClass}" style="transform:scaleX(${w / 100})"></div></div>
</div>`;
        })
        .join("");
      return `<div class="bars-block">
  ${content.caption ? `<p class="bars-caption">${escapeHtml(content.caption)}</p>` : ""}
  <div class="bars-list">${rows}</div>
</div>`;
    }

    case "table": {
      const headers = content.headers
        .map((h) => `<th>${escapeHtml(h)}</th>`)
        .join("");
      const rows = content.rows
        .map(
          (row) =>
            `<tr>${row
              .map(
                (cell, ci) =>
                  `<td class="${ci === content.emphasizeCol ? "emphasize" : ""}">${renderRichText(cell, citationCount)}</td>`
              )
              .join("")}</tr>`
        )
        .join("");
      return `<div class="table-wrap"><table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table></div>`;
    }

    case "verification-cards": {
      const cardsHtml = content.items.map((it) => renderVerificationCard(it)).join("");
      if (!content.caption) return `<div class="vcards">${cardsHtml}</div>`;
      const isOpen = !(content.defaultCollapsed ?? false);
      return `<details class="vcards-group" ${isOpen ? "open" : ""}>
  <summary>${escapeHtml(content.caption)}</summary>
  <div class="vcards">${cardsHtml}</div>
</details>`;
    }

    default:
      return "";
  }
}

function renderSourceAnchor(a: SourceAnchor): string {
  const docLine = `${escapeHtml(a.document)} · P${escapeHtml(String(a.page))}${a.paragraph ? ` · ${escapeHtml(a.paragraph)}` : ""}`;
  const excerpt = escapeHtml(a.excerpt ?? "");
  return `<div class="src-anchor" title="${excerpt}">
  <span class="src-doc">${docLine}</span>
</div>`;
}

function renderVerificationCard(item: VerificationCardItem): string {
  const catClass = CATEGORY_STYLE[item.category] ?? "cat-slate";
  const verdictClass = VERDICT_STYLE[item.verdict];
  const riskCfg = RISK_LEVEL_CONFIG[item.riskLevel];
  const claimSources = (item.claimSources ?? [])
    .map(
      (a) =>
        `<span class="src-chip" title="${escapeHtml(a.excerpt ?? "")}">${escapeHtml(a.document)} · P${escapeHtml(String(a.page))}</span>`
    )
    .join("");
  const evidenceSources = item.evidenceSources.map(renderSourceAnchor).join("");

  return `<article class="vcard">
  <header class="vcard-head">
    <div class="vcard-chips">
      <span class="chip ${catClass}"><span class="chip-dot"></span>${escapeHtml(item.category)}</span>
      <span class="chip chip-risk chip-risk-${item.riskLevel}">${escapeHtml(riskCfg.label)}</span>
    </div>
    <span class="chip ${verdictClass}">${escapeHtml(item.verdict)}</span>
  </header>
  <div class="vcard-body">
    <section class="vcard-claim">
      <p class="vcard-eyebrow">
        <span class="vcard-index">#${item.index}</span>
        投资备忘录 · 主张
      </p>
      <p class="vcard-text claim-text">${escapeHtml(item.claim)}</p>
      ${claimSources ? `<div class="src-chips">${claimSources}</div>` : ""}
    </section>
    <section class="vcard-evidence">
      <p class="vcard-eyebrow">证据摘要</p>
      <p class="vcard-text evidence-text">${escapeHtml(item.evidence)}</p>
      ${
        evidenceSources
          ? `<details class="src-list"><summary>证据来源 · ${item.evidenceSources.length}</summary><div>${evidenceSources}</div></details>`
          : ""
      }
    </section>
  </div>
</article>`;
}

function renderSection(section: DiligenceSection, citationCount: number): string {
  const body = section.content.map((c) => renderContent(c, citationCount)).join("\n");
  const isOpen = section.defaultOpen ?? true;
  return `<details id="${section.id}" class="section" ${isOpen ? "open" : ""}>
  <summary class="section-head"><span>${escapeHtml(section.title)}</span></summary>
  <div class="section-body">${body}</div>
</details>`;
}

function renderCitations(citations: SourceAnchor[]): string {
  if (citations.length === 0) return "";
  const rows = citations
    .map(
      (a, i) => `<li id="cite-${i + 1}" class="citation">
  <span class="cite-index">[${i + 1}]</span>
  <div class="cite-body">
    <p class="cite-doc">${escapeHtml(a.document)} · P${escapeHtml(String(a.page))}${a.paragraph ? ` · ${escapeHtml(a.paragraph)}` : ""}</p>
    <p class="cite-excerpt">「${escapeHtml(a.excerpt)}」</p>
  </div>
</li>`
    )
    .join("");
  return `<section class="citations">
  <h2>引用与原文摘要（共 ${citations.length} 条）</h2>
  <ol class="citations-list">${rows}</ol>
</section>`;
}

/* ============ 各报告类型 → body HTML ============ */

function renderDiligenceReport(report: DiligenceBlock): string {
  const verdictRecommendationClass =
    report.verdict.recommendation.includes("暂缓") ||
    report.verdict.recommendation.includes("否决") ||
    /defer|reject|do not proceed/i.test(report.verdict.recommendation)
      ? "verdict-danger"
      : report.verdict.recommendation.includes("附条件") ||
          /condition/i.test(report.verdict.recommendation)
        ? "verdict-warning"
        : "verdict-positive";

  const metrics = report.metrics
    .map((m) => {
      const tone = m.tone ? TONE_STYLE[m.tone].text : "";
      return `<div class="metric-card">
  <p class="metric-label">${escapeHtml(m.label)}</p>
  <p class="metric-value ${tone}">${escapeHtml(m.value)}</p>
  ${m.sub ? `<p class="metric-sub">${escapeHtml(m.sub)}</p>` : ""}
</div>`;
    })
    .join("");

  const citationCount = report.citations.length;
  const sections = report.sections
    .map((s) => renderSection(s, citationCount))
    .join("\n");

  const headerChrome = report.hideChrome
    ? ""
    : `<div class="verdict-grid">
    <div class="verdict-card ${verdictRecommendationClass}">
      <p class="verdict-label">最终建议</p>
      <p class="verdict-value">${escapeHtml(report.verdict.recommendation)}</p>
    </div>
    <div class="verdict-card">
      <p class="verdict-label">估值判断</p>
      <p class="verdict-value">${escapeHtml(report.verdict.valuation)}</p>
    </div>
  </div>
  <p class="report-summary">${renderRichText(report.summary, citationCount)}</p>`;

  return `<header class="report-header">
  <p class="report-eyebrow">尽调复核报告</p>
  <h1>${escapeHtml(report.title)}</h1>
  <p class="report-company">${escapeHtml(report.company)}</p>
  ${headerChrome}
</header>

<section class="metrics-grid">${metrics}</section>

<main class="report-main">
  <div class="sections-wrap">${sections}</div>
</main>

${renderCitations(report.citations)}`;
}

function renderFactVerification(report: FactVerificationBlock): string {
  const citationCount = report.citations?.length ?? 0;
  const rows = report.compares
    .map((c) => {
      const dev = c.deviationDetail;
      return `<article class="vcard">
  <header class="vcard-head">
    <div class="vcard-chips">
      <span class="chip chip-risk chip-risk-${c.level}">${escapeHtml(RISK_LEVEL_CONFIG[c.level].label)}</span>
      ${c.delta ? `<span class="chip ${RISK_BODY[c.level]}">${escapeHtml(c.delta)}</span>` : ""}
    </div>
    <span class="vcard-index">${escapeHtml(c.label)}</span>
  </header>
  <div class="vcard-body">
    <section class="vcard-claim">
      <p class="vcard-eyebrow">声称 · ${escapeHtml(c.claim.source)}</p>
      <p class="vcard-text claim-text">${escapeHtml(c.claim.value)}</p>
    </section>
    <section class="vcard-evidence">
      <p class="vcard-eyebrow">实际 · ${escapeHtml(c.reality.source)}</p>
      <p class="vcard-text evidence-text">${escapeHtml(c.reality.value)}</p>
    </section>
  </div>
  ${
    dev
      ? `<div class="vcard-deviation">
    <p class="paragraph"><strong>差异成因：</strong>${escapeHtml(dev.explanation)}</p>
    <p class="paragraph"><strong>业务影响：</strong>${escapeHtml(dev.impact)}</p>
    ${dev.recommendation ? `<p class="paragraph"><strong>处置建议：</strong>${escapeHtml(dev.recommendation)}</p>` : ""}
  </div>`
      : ""
  }
</article>`;
    })
    .join("\n");

  return `<header class="report-header">
  <p class="report-eyebrow">事实交叉验证</p>
  <h1>${escapeHtml(report.title)}</h1>
  <p class="report-summary">${renderRichText(report.summary, citationCount)}</p>
</header>

<main class="report-main">
  <div class="sections-wrap"><div class="vcards">${rows}</div></div>
</main>

${renderCitations(report.citations ?? [])}`;
}

function renderChallengeList(report: ChallengeListBlock): string {
  const citationCount = report.citations?.length ?? 0;
  const items = report.items
    .map((it) => {
      const evidence = it.evidence.map(renderSourceAnchor).join("");
      const advice = it.actionAdvice
        .map((a) => `<li>${renderRichText(a, citationCount)}</li>`)
        .join("");
      return `<article class="vcard">
  <header class="vcard-head">
    <div class="vcard-chips">
      <span class="chip chip-risk chip-risk-${it.riskLevel}">${escapeHtml(RISK_LEVEL_CONFIG[it.riskLevel].label)}</span>
      <span class="chip cat-indigo"><span class="chip-dot"></span>${escapeHtml(it.category)}</span>
    </div>
  </header>
  <div class="section-body">
    <p class="paragraph"><strong>${escapeHtml(it.title)}</strong></p>
    <p class="paragraph">${renderRichText(it.coreLogic, citationCount)}</p>
    ${advice ? `<ul class="bullets dotted">${advice}</ul>` : ""}
    ${
      evidence
        ? `<details class="src-list"><summary>事实底座 · ${it.evidence.length}</summary><div>${evidence}</div></details>`
        : ""
    }
  </div>
</article>`;
    })
    .join("\n");

  return `<header class="report-header">
  <p class="report-eyebrow">挑战质询清单</p>
  <h1>${escapeHtml(report.title)}</h1>
  <p class="report-summary">${renderRichText(report.summary, citationCount)}</p>
</header>

<main class="report-main">
  <div class="sections-wrap"><div class="vcards">${items}</div></div>
</main>

${renderCitations(report.citations ?? [])}`;
}

function renderValuation(report: ValuationBlock): string {
  const citationCount = report.citations?.length ?? 0;
  const rows = report.methods
    .map(
      (m) =>
        `<tr><td class="emphasize">${escapeHtml(m.method)}</td><td>${escapeHtml(m.range)}</td><td>${escapeHtml(m.assumption)}</td><td>${escapeHtml(m.applicability)}</td></tr>`
    )
    .join("");

  return `<header class="report-header">
  <p class="report-eyebrow">估值平行测算</p>
  <h1>${escapeHtml(report.title)}</h1>
  <p class="report-summary">${renderRichText(report.summary, citationCount)}</p>
</header>

<main class="report-main">
  <div class="sections-wrap">
    <div class="table-wrap"><table>
      <thead><tr><th>测算方法</th><th>估值区间</th><th>关键假设</th><th>适用性</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>
    <div class="callout tone-neutral">
      <p class="callout-title text-neutral">综合结论</p>
      <p class="callout-body">${renderRichText(report.conclusion, citationCount)}</p>
    </div>
  </div>
</main>

${renderCitations(report.citations ?? [])}`;
}

function renderEnterprise(report: EnterpriseBlock): string {
  const citationCount = report.citations?.length ?? 0;
  const dims = report.dimensions
    .map(
      (d) => `<article class="vcard">
  <header class="vcard-head">
    <div class="vcard-chips">
      <span class="chip chip-risk chip-risk-${d.level}">${escapeHtml(RISK_LEVEL_CONFIG[d.level].label)}</span>
      <span class="chip cat-blue"><span class="chip-dot"></span>${escapeHtml(d.label)}</span>
    </div>
  </header>
  <div class="section-body">
    <p class="paragraph">${renderRichText(d.finding, citationCount)}</p>
    <p class="paragraph"><strong>建议：</strong>${renderRichText(d.recommendation, citationCount)}</p>
  </div>
</article>`
    )
    .join("\n");

  const highlights = report.highlights
    .map((h) => `<li>${renderRichText(h, citationCount)}</li>`)
    .join("");

  return `<header class="report-header">
  <p class="report-eyebrow">企业分析评估</p>
  <h1>${escapeHtml(report.title)}</h1>
  <p class="report-summary">${renderRichText(report.summary, citationCount)}</p>
</header>

<main class="report-main">
  <div class="sections-wrap">
    ${highlights ? `<div class="callout tone-neutral"><p class="callout-title text-neutral">关键结论</p><ul class="bullets dotted">${highlights}</ul></div>` : ""}
    <div class="vcards">${dims}</div>
  </div>
</main>

${renderCitations(report.citations ?? [])}`;
}

function renderReportBody(block: ExportableReportBlock): string {
  switch (block.kind) {
    case "project-work-report":
      return `<header class="report-header"><h1>${escapeHtml(block.title)}</h1><p>${escapeHtml(block.summary)}</p></header><main class="report-main"><div class="sections-wrap"><section class="report-header"><h2>本次要求</h2><p>${escapeHtml(block.query).replace(/\n/g, "<br>")}</p></section>${block.sections.map((section) => `<section class="report-header"><h2>${escapeHtml(section.title)}</h2><p>${renderRichText(section.text, block.citations.length).replace(/\n/g, "<br>")}</p></section>`).join("")}</div></main>${renderCitations(block.citations)}`;
    case "question-report":
      return `<header class="report-header"><p class="report-eyebrow">关注问题专题 · 演示</p><h1>${escapeHtml(block.title)}</h1><p>${escapeHtml(block.summary)}</p></header>
      <main class="report-main"><div class="sections-wrap">
        <section class="report-header"><h2>本次追问</h2><p>${escapeHtml(block.query)}</p><p>当前关注：${escapeHtml(block.context.question)}</p></section>
        <section class="report-header"><h2>会话结论</h2><p>${escapeHtml(block.conclusion).replace(/\n/g, "<br>")}</p></section>
        <section class="report-header"><h2>材料与前提</h2><p>${escapeHtml(block.context.context)}</p><p>采用前提：${escapeHtml(block.premise)}</p><p>待补证据：${escapeHtml(block.context.neededEvidence)}</p></section>
        <section class="report-header"><h2>条件路径</h2>${block.paths.map((path) => `<article><h3>${escapeHtml(path.title)}</h3><p>如果：${escapeHtml(path.condition)}</p><p>则：${escapeHtml(path.judgment)}</p><p>下一步：${escapeHtml(path.action)}</p></article>`).join("")}</section>
      </div></main>${renderCitations(block.citations)}`;
    case "diligence-report":
      return renderDiligenceReport(block);
    case "fact-verification":
      return renderFactVerification(block);
    case "challenge-list":
      return renderChallengeList(block);
    case "valuation":
      return renderValuation(block);
    case "enterprise-analysis":
      return renderEnterprise(block);
    default:
      return "";
  }
}

export const REPORT_HTML_CSS = String.raw`
:root {
  --bg: #f7f8fa;
  --card: #ffffff;
  --border: #e5e6e8;
  --border-soft: #f2f3f5;
  --text: rgba(0, 0, 0, 0.88);
  --text-muted: #4e5969;
  --text-soft: #5f6b7a;
  --text-inverse: #ffffff;
  --action-primary: #1d2129;
  --accent: #0066ff;
  --accent-soft: #e8f3ff;
  --success: #008a23;
  --success-soft: rgb(0 138 35 / 10%);
  --warning: #ad4f00;
  --warning-soft: rgb(173 79 0 / 12%);
  --danger: #d92d20;
  --danger-soft: rgb(217 45 32 / 10%);
  --radius: 8px;
  --shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei",
    "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  background: var(--bg);
  color: var(--text);
  font-size: 14px;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}
.container { max-width: 1180px; margin: 0 auto; padding: 32px 24px 80px; }

/* ============ 报告头 ============ */
.report-header {
  padding: 28px 32px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
}
.report-eyebrow {
  margin: 0 0 4px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0;
  color: var(--text-soft);
}
.report-header h1 {
  margin: 0 0 4px;
  font-size: 24px;
  font-weight: 600;
  letter-spacing: 0;
  color: var(--text);
  line-height: 1.3;
}
.report-company {
  margin: 0 0 18px;
  font-size: 14px;
  color: var(--text-muted);
}
.verdict-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}
@media (max-width: 640px) {
  .verdict-grid { grid-template-columns: 1fr; }
}
.verdict-card {
  border: 1px solid var(--border);
  background: var(--card);
  border-radius: var(--radius);
  padding: 12px 14px;
}
.verdict-label {
  margin: 0 0 4px;
  font-size: 11px;
  color: var(--text-soft);
}
.verdict-value {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
}
.verdict-danger { background: var(--danger-soft); }
.verdict-danger .verdict-value { color: var(--danger); }
.verdict-warning { background: var(--warning-soft); }
.verdict-warning .verdict-value { color: var(--warning); }
.verdict-positive .verdict-value { color: var(--success); }
.risk-R1 { color: var(--success); }
.risk-R2 { color: var(--accent); }
.risk-R3 { color: var(--warning); }
.risk-R4, .risk-R5 { color: var(--danger); }
.report-summary {
  margin: 0;
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-muted);
}

/* ============ 顶部 KPI 网格 ============ */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 10px;
  margin: 18px 0 24px;
}
.metric-card {
  border: 1px solid var(--border);
  background: var(--card);
  border-radius: var(--radius);
  padding: 12px 14px;
}
.metric-label { margin: 0 0 4px; font-size: 11px; color: var(--text-soft); }
.metric-value {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  color: var(--text);
}
.metric-sub { margin: 6px 0 0; font-size: 11px; color: var(--text-soft); }

/* ============ 主体（章节，下载版不含目录） ============ */
.report-main { display: block; }

/* ============ 章节 ============ */
.sections-wrap { display: flex; flex-direction: column; gap: 12px; }
.section {
  border: 1px solid var(--border);
  background: var(--card);
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow);
}
.section > summary {
  list-style: none;
  cursor: pointer;
  padding: 14px 18px;
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  user-select: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.section > summary::-webkit-details-marker { display: none; }
.section > summary::after {
  content: "▾";
  font-size: 12px;
  color: var(--text-soft);
  transition: transform 0.15s ease;
}
.section[open] > summary::after { transform: rotate(180deg); }
.section-body { padding: 4px 18px 18px; display: flex; flex-direction: column; gap: 12px; }

/* ============ 通用文本 ============ */
.paragraph { margin: 0; font-size: 14px; line-height: 1.7; color: var(--text); }
.bullets { margin: 0; padding-left: 22px; font-size: 14px; line-height: 1.7; color: var(--text); }
.bullets.dotted { list-style-type: disc; }
.bullets li + li { margin-top: 4px; }
mark.hl {
  background: var(--warning-soft);
  color: var(--warning);
  padding: 0 2px;
  border-radius: 3px;
  font-weight: 600;
}
sup.cite a {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 15px;
  padding: 0 4px;
  margin: 0 2px;
  font-size: 10px;
  font-weight: 600;
  color: var(--text-muted);
  text-decoration: none;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 4px;
}
sup.cite a:hover { background: var(--text); color: var(--text-inverse); border-color: var(--text); }

/* ============ 标注（callout） ============ */
.callout { border: 1px solid; border-radius: var(--radius); padding: 12px 14px; }
.callout-title { margin: 0 0 4px; font-size: 14px; font-weight: 600; }
.callout-body { margin: 0; font-size: 14px; line-height: 1.7; color: var(--text); }
.tone-danger { background: var(--danger-soft); border-color: color-mix(in srgb, var(--danger) 24%, transparent); }
.tone-danger .text-danger { color: var(--danger); }
.tone-warning { background: var(--warning-soft); border-color: color-mix(in srgb, var(--warning) 24%, transparent); }
.tone-warning .text-warning { color: var(--warning); }
.tone-neutral { background: var(--bg); border-color: var(--border); }
.tone-neutral .text-neutral { color: var(--text-muted); }
.tone-positive { background: var(--success-soft); border-color: color-mix(in srgb, var(--success) 24%, transparent); }
.tone-positive .text-positive { color: var(--success); }
.text-danger { color: var(--danger); }
.text-warning { color: var(--warning); }
.text-positive { color: var(--success); }
.text-neutral { color: var(--text-muted); }

/* ============ KPI 子卡 + 横向条形 ============ */
.stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 10px; }
.stat-card { border: 1px solid var(--border); background: var(--card); border-radius: var(--radius); padding: 12px 14px; }
.stat-label { margin: 0 0 4px; font-size: 11px; color: var(--text-soft); }
.stat-value { margin: 0; font-size: 18px; font-weight: 600; font-variant-numeric: tabular-nums; color: var(--text); }
.stat-sub { margin: 6px 0 0; font-size: 11px; color: var(--text-soft); }

.bars-block { border: 1px solid var(--border); background: var(--card); border-radius: var(--radius); padding: 14px 16px; }
.bars-caption { margin: 0 0 10px; font-size: 14px; font-weight: 600; color: var(--text-soft); }
.bars-list { display: flex; flex-direction: column; gap: 10px; }
.bar-row { display: flex; flex-direction: column; gap: 4px; }
.bar-meta { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
.bar-label { font-size: 14px; color: var(--text-muted); }
.bar-value { font-size: 14px; font-weight: 600; font-variant-numeric: tabular-nums; }
.bar-track { height: 8px; background: var(--border-soft); border-radius: 999px; overflow: hidden; }
.bar-fill { width: 100%; height: 100%; border-radius: 999px; transform-origin: left center; }
.bar-fill-positive { background: var(--success); }
.bar-fill-warning { background: var(--warning); }
.bar-fill-danger { background: var(--danger); }
.bar-fill-neutral { background: var(--text-soft); }

/* ============ 表格 ============ */
/* Keep overflow inside the report surface on narrow screens instead of widening the page. */
.table-wrap {
  max-width: 100%;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-inline: contain;
  scrollbar-width: thin;
}
.table-wrap table { width: 100%; border-collapse: collapse; font-size: 14px; }
.table-wrap thead tr { background: var(--bg); }
.table-wrap th { min-width: 8rem; text-align: left; padding: 10px 12px; font-weight: 600; color: var(--text-muted); border-bottom: 1px solid var(--border); overflow-wrap: anywhere; }
.table-wrap td { min-width: 8rem; padding: 10px 12px; vertical-align: top; color: var(--text); border-bottom: 1px solid var(--border-soft); overflow-wrap: anywhere; }
.table-wrap td.emphasize { font-weight: 600; color: var(--text); }
.table-wrap tbody tr:last-child td { border-bottom: none; }
@media (max-width: 640px) {
  .table-wrap table { min-width: 640px; }
}

/* ============ 验证卡片 ============ */
.vcards { display: flex; flex-direction: column; gap: 10px; }
.vcards-group { border: 1px solid var(--border); background: var(--card); border-radius: var(--radius); overflow: hidden; }
.vcards-group > summary {
  cursor: pointer;
  list-style: none;
  padding: 10px 14px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-muted);
  background: var(--bg);
  user-select: none;
}
.vcards-group > summary::-webkit-details-marker { display: none; }
.vcards-group > summary::after { content: " ▾"; color: var(--text-soft); font-size: 10px; }
.vcards-group[open] > summary::after { content: " ▴"; }
.vcards-group > div { padding: 10px 12px; }

.vcard { border: 1px solid var(--border); background: var(--card); border-radius: var(--radius); overflow: hidden; box-shadow: var(--shadow); }
.vcard-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--border-soft);
  background: var(--card);
}
.vcard-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 10px;
  font-size: 11px;
  font-weight: 500;
  border: 1px solid transparent;
  border-radius: 999px;
}
.chip-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; opacity: 0.7; }
.cat-blue, .cat-violet, .cat-cyan, .cat-orange, .cat-emerald, .cat-pink, .cat-indigo, .cat-slate {
  border-color: var(--border);
  background: var(--bg);
  color: var(--text-muted);
}

.chip-risk-R1 { border-color: color-mix(in srgb, var(--success) 24%, transparent); background: var(--success-soft); color: var(--success); }
.chip-risk-R2 { border-color: color-mix(in srgb, var(--accent) 24%, transparent); background: var(--accent-soft); color: var(--accent); }
.chip-risk-R3 { border-color: color-mix(in srgb, var(--warning) 24%, transparent); background: var(--warning-soft); color: var(--warning); }
.chip-risk-R4, .chip-risk-R5 { border-color: color-mix(in srgb, var(--danger) 24%, transparent); background: var(--danger-soft); color: var(--danger); }

.verdict-ok { border-color: color-mix(in srgb, var(--success) 24%, transparent); background: var(--success-soft); color: var(--success); font-weight: 600; }
.verdict-partial { border-color: color-mix(in srgb, var(--warning) 24%, transparent); background: var(--warning-soft); color: var(--warning); font-weight: 600; }
.verdict-bad { border-color: color-mix(in srgb, var(--danger) 24%, transparent); background: var(--danger-soft); color: var(--danger); font-weight: 600; }
.verdict-insufficient { border-color: var(--border); background: var(--bg); color: var(--text-muted); font-weight: 600; }

.vcard-body { display: grid; grid-template-columns: 1.05fr 1fr; }
@media (max-width: 720px) { .vcard-body { grid-template-columns: 1fr; } }
.vcard-claim { padding: 14px 16px; background: var(--card); border-right: 1px solid var(--border-soft); }
@media (max-width: 720px) { .vcard-claim { border-right: 0; border-bottom: 1px solid var(--border-soft); } }
.vcard-evidence { padding: 14px 16px; background: var(--bg); }
.vcard-deviation { padding: 12px 16px; border-top: 1px solid var(--border-soft); background: var(--warning-soft); display: flex; flex-direction: column; gap: 6px; }
.vcard-eyebrow {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 6px;
}
.vcard-index { background: var(--action-primary); color: var(--text-inverse); padding: 1px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; }
.vcard-text { margin: 0; white-space: pre-wrap; font-size: 14px; line-height: 1.7; }
.claim-text { color: var(--text); font-weight: 500; }
.evidence-text { color: var(--text-muted); font-size: 14px; }
.src-chips { margin-top: 10px; display: flex; flex-wrap: wrap; gap: 4px; }
.src-chip { display: inline-block; padding: 2px 8px; font-size: 10.5px; color: var(--text-muted); background: var(--card); border: 1px solid var(--border); border-radius: 6px; }
.src-list { margin-top: 12px; }
.src-list > summary { cursor: pointer; list-style: none; text-align: right; font-size: 14px; font-weight: 500; color: var(--accent); user-select: none; }
.src-list > summary::-webkit-details-marker { display: none; }
.src-list > summary::after { content: " ›"; }
.src-list[open] > summary::after { content: " ▾"; }
.src-list > div { margin-top: 8px; display: flex; flex-direction: column; gap: 4px; }
.src-anchor { border: 1px solid var(--border); background: var(--card); border-radius: var(--radius); padding: 6px 10px; }
.src-doc { font-size: 14px; color: var(--text-muted); }

/* ============ 引用底部清单 ============ */
.citations { margin-top: 32px; padding: 22px 26px; border: 1px solid var(--border); background: var(--card); border-radius: var(--radius); box-shadow: var(--shadow); }
.citations h2 { margin: 0 0 14px; font-size: 14px; font-weight: 600; color: var(--text); }
.citations-list { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 12px; }
.citation { display: flex; align-items: flex-start; gap: 12px; padding: 8px 0; border-top: 1px solid var(--border-soft); }
.citation:first-child { border-top: 0; padding-top: 0; }
.cite-index { background: var(--bg); border: 1px solid var(--border); border-radius: 6px; padding: 1px 6px; font-size: 10.5px; font-weight: 600; color: var(--text-muted); font-variant-numeric: tabular-nums; }
.cite-body { flex: 1; min-width: 0; }
.cite-doc { margin: 0 0 4px; font-size: 14px; font-weight: 600; color: var(--text); }
.cite-excerpt { margin: 0; font-size: 14px; line-height: 1.7; color: var(--text-muted); }

/* ============ 打印优化 ============ */
@media print {
  body { background: var(--card); }
  .container { padding: 0; max-width: none; }
  .section, .vcard, .vcards-group, .metric-card, .stat-card, .bars-block, .table-wrap, .verdict-card, .report-header, .citations {
    break-inside: avoid;
    box-shadow: none;
  }
  .section[open] > summary::after, .section > summary::after { display: none; }
  details, details[open] { display: block; }
  details > summary { pointer-events: none; }
  .vcards-group, .src-list { border: none; }
  .vcards-group > div, .src-list > div { padding: 0; margin-top: 6px; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
`;

/** 报告标题（用于 <title> 与文件名） */
function reportTitle(block: ExportableReportBlock): string {
  return block.title;
}

/** 生成完整自包含 HTML 文档字符串 */
export function buildReportHtml(block: ExportableReportBlock): string {
  const body = renderReportBody(block);
  const title = reportTitle(block);
  const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>${REPORT_HTML_CSS}</style>
</head>
<body>
  <div class="container">
    ${body}
  </div>
</body>
</html>
`;
  return /[\p{Script=Han}]/u.test(title) ? html : localizeEnglishExport(html);
}

const ENGLISH_EXPORT_REPLACEMENTS: Array<[string, string]> = [
  ["投资备忘录 · 主张", "Investment Memo · Claim"],
  ["引用与原文摘要（共 ", "Citations and Source Excerpts ("],
  ["尽调复核报告", "Diligence Review Report"],
  ["事实交叉验证", "Cross-Validation"],
  ["挑战质询清单", "Challenge Review"],
  ["估值平行测算", "Parallel Valuation"],
  ["企业分析评估", "Company Assessment"],
  ["最终建议", "Final Recommendation"],
  ["估值判断", "Valuation View"],
  ["证据来源", "Evidence Sources"],
  ["证据摘要", "Evidence Summary"],
  ["事实底座", "Evidence Base"],
  ["差异成因", "Cause of Discrepancy"],
  ["业务影响", "Business Impact"],
  ["处置建议", "Recommended Action"],
  ["测算方法", "Valuation Method"],
  ["估值区间", "Valuation Range"],
  ["关键假设", "Key Assumptions"],
  ["适用性", "Applicability"],
  ["综合结论", "Overall Conclusion"],
  ["关键结论", "Key Findings"],
  ["声称", "Reported"],
  ["实际", "Verified"],
  ["建议", "Recommendation"],
  ["财务数据", "Financial Data"],
  ["融资数据", "Financing Data"],
  ["公司数据", "Company Data"],
  ["法务合规", "Legal & Compliance"],
  ["客户数据", "Customer Data"],
  ["业务数据", "Business Data"],
  ["市场行业", "Market & Industry"],
  ["团队治理", "Team & Governance"],
  ["估值", "Valuation"],
  ["财务", "Financial"],
  ["团队", "Team"],
  ["产品", "Product"],
  ["行业", "Industry"],
  ["合规", "Compliance"],
  ["募资", "Fundraising"],
  ["其他", "Other"],
  ["部分一致", "Partially Consistent"],
  ["证据不足", "Insufficient Evidence"],
  ["不一致", "Inconsistent"],
  ["一致", "Consistent"],
  ["R1 低风险", "R1 Low Risk"],
  ["R2 中低风险", "R2 Low–Medium Risk"],
  ["R3 中风险", "R3 Medium Risk"],
  ["R4 中高风险", "R4 Medium–High Risk"],
  ["R5 高风险", "R5 High Risk"],
  [" 条）", ")"],
  ["「", "“"],
  ["」", "”"],
];

function localizeEnglishExport(html: string): string {
  let localized = html
    .replace('<html lang="zh-CN">', '<html lang="en">')
    .replace(/\/\*[\s\S]*?\*\//g, "");
  for (const [source, target] of ENGLISH_EXPORT_REPLACEMENTS) {
    localized = localized.split(source).join(target);
  }
  return localized;
}

/** 把标题转换为安全文件名 */
export function reportFileName(block: ExportableReportBlock): string {
  const safe = block.title
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, "")
    .slice(0, 80);
  return `${safe || "report"}.html`;
}

/** 浏览器端：触发 HTML 文件下载 */
export function downloadReportHtml(block: ExportableReportBlock): void {
  const html = buildReportHtml(block);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = reportFileName(block);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
