/**
 * 一次性解析脚本：把《海致科技交叉验证报告(国产).html》忠实转换为应用内
 * `diligence-report` 结构化数据（src/data/haizhi-validation-report.ts），
 * 复用第四范式同款 DiligenceReportCard 渲染（目录 / 折叠 / 验证卡 / 溯源）。
 *
 * 原则：内容、信息与呈现顺序严格按 HTML，不增删验证项。
 *
 * 用法：npx tsx scripts/build-haizhi-validation-report.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const SRC_HTML = resolve(
  process.env.HOME ?? "",
  "Downloads/海致科技交叉验证报告(国产).html"
);
const OUT_TS = resolve(
  process.cwd(),
  "src/data/haizhi-validation-report.ts"
);

const html = readFileSync(SRC_HTML, "utf8");

/* ----------------------------- 工具函数 ----------------------------- */
function decode(s: string): string {
  return s
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .trim();
}

/** 把 li 内的 <strong>…</strong> 转成 **…**，其余按文本处理 */
function liToMarkdown(inner: string): string {
  const withBold = inner
    .replace(/<strong>/gi, "**")
    .replace(/<\/strong>/gi, "**");
  return decode(withBold);
}

type Tone = "danger" | "warning" | "neutral" | "positive";

interface Source {
  document: string;
  page: string;
  excerpt: string;
}
interface Card {
  index: number;
  category: string;
  verdict: string;
  riskLevel: string;
  claim: string;
  claimSources: Source[];
  evidence: string;
  evidenceSources: Source[];
}
interface Block {
  type: "verification-cards";
  caption?: string;
  defaultCollapsed?: boolean;
  items: Card[];
}
interface Group {
  title: string;
  tone: Tone;
  blocks: Block[];
}

/* ----------------------------- 顶部指标卡 ----------------------------- */
const metricToneMap: Record<string, Tone> = {
  "": "neutral",
  danger: "danger",
  warn: "warning",
  neutral: "neutral",
  ok: "positive",
};
const metrics: Array<{ label: string; value: string; tone: Tone }> = [];
{
  const re =
    /<div class="card([^"]*)"><strong>([^<]+)<\/strong><span>([^<]+)<\/span><\/div>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const tone = metricToneMap[m[1].trim()] ?? "neutral";
    metrics.push({ label: decode(m[3]), value: decode(m[2]), tone });
  }
}

/* ----------------------------- 摘要 / 关键风险项 / 风险分布解读 ----------------------------- */
function sliceBetween(startMarker: string, endMarker: string): string {
  const s = html.indexOf(startMarker);
  const e = html.indexOf(endMarker, s + startMarker.length);
  return html.slice(s + startMarker.length, e);
}

const keyRiskRegion = sliceBetween("<h2>关键风险项</h2>", "<h2>风险分布解读</h2>");
const keyRiskParagraph = decode(
  (keyRiskRegion.match(/<p>([\s\S]*?)<\/p>/) ?? ["", ""])[1]
);
const keyRiskBullets = [...keyRiskRegion.matchAll(/<li>([\s\S]*?)<\/li>/g)].map(
  (m) => liToMarkdown(m[1])
);

const distRegion = sliceBetween(
  "<h2>风险分布解读</h2>",
  "<h2>完整验证项明细表</h2>"
);
const distBullets = [...distRegion.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) =>
  liToMarkdown(m[1])
);

/* ----------------------------- 解析单张验证卡 ----------------------------- */
const verdictMap: Record<string, string> = {
  ok: "一致",
  partial: "部分一致",
  bad: "不一致",
  insufficient: "证据不足",
};

function parseClaimSources(article: string): Source[] {
  const out: Source[] = [];
  const re =
    /<span class="src-chip" title="([^"]*)"><a[^>]*>([^<]+)<\/a>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(article))) {
    const excerpt = decode(m[1]);
    const label = decode(m[2]); // e.g. 海致科技投决报告.pdf-P16
    const mm = label.match(/^(.*?\.pdf)-P(.+)$/);
    out.push({
      document: mm ? mm[1] : label,
      page: mm ? mm[2] : "",
      excerpt,
    });
  }
  return out;
}

function parseEvidenceSources(article: string): Source[] {
  const out: Source[] = [];
  const re =
    /<div class="src-anchor" title="([^"]*)"><span class="src-doc"><a[^>]*>([^<]+)<\/a>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(article))) {
    const title = decode(m[1]); // e.g. 海致科技财务尽调报告.pdf · P6-7
    const label = decode(m[2]); // e.g. 海致科技财务尽调报告.pdf-P6
    const docMatch = label.match(/^(.*?\.pdf)-P/);
    const document = docMatch ? docMatch[1] : label.replace(/-P.*$/, "");
    const pageMatch = title.match(/·\s*P([0-9][0-9\-]*)/);
    const labelPage = label.match(/-P(.+)$/);
    const page = pageMatch ? pageMatch[1] : labelPage ? labelPage[1] : "";
    out.push({ document, page, excerpt: title });
  }
  return out;
}

function parseArticle(article: string): Card {
  const category = decode(
    (article.match(
      /chip cat-[a-z]+"><span class="chip-dot"><\/span>([^<]+)<\/span>/
    ) ?? ["", "其他"])[1]
  );
  const riskLevel =
    "R" + (article.match(/chip-risk-R([1-4])/) ?? ["", "2"])[1];
  const verdict =
    verdictMap[(article.match(/verdict-(ok|partial|bad|insufficient)/) ?? ["", "insufficient"])[1]];
  const index = Number(
    (article.match(/vcard-index">#(\d+)</) ?? ["", "0"])[1]
  );
  const claim = decode(
    (article.match(/claim-text">([\s\S]*?)<\/p>/) ?? ["", ""])[1]
  );
  const evidence = decode(
    (article.match(/evidence-text">([\s\S]*?)<\/p>/) ?? ["", ""])[1]
  );
  return {
    index,
    category,
    verdict,
    riskLevel,
    claim,
    claimSources: parseClaimSources(article),
    evidence,
    evidenceSources: parseEvidenceSources(article),
  };
}

/* ----------------------------- 遍历明细表，重建分组与折叠结构 ----------------------------- */
const detailRegion = html.slice(html.indexOf("<h2>完整验证项明细表</h2>"));

const toneByRisk: Record<string, Tone> = {
  R4: "danger",
  R3: "warning",
  R2: "neutral",
  R1: "positive",
};

const groups: Group[] = [];
let currentGroup: Group | null = null;
let currentBlock: Block | null = null;

const tokenRe = new RegExp(
  [
    "<h3>([\\s\\S]*?)<\\/h3>",
    '<details class="folded (insufficient|consistent)"><summary>([\\s\\S]*?)<\\/summary>',
    '<article class="vcard">([\\s\\S]*?)<\\/article>',
  ].join("|"),
  "g"
);

let t: RegExpExecArray | null;
while ((t = tokenRe.exec(detailRegion))) {
  if (t[1] !== undefined) {
    // h3 → 新分组
    const title = t[1].replace(/[🔴🟡🟠🟢]/g, "").trim();
    const riskKey = (title.match(/R[1-4]/) ?? ["R2"])[0];
    currentGroup = { title, tone: toneByRisk[riskKey] ?? "neutral", blocks: [] };
    currentBlock = { type: "verification-cards", items: [] };
    currentGroup.blocks.push(currentBlock);
    groups.push(currentGroup);
  } else if (t[2] !== undefined) {
    // 折叠块（证据不足项 / 一致项）
    const caption = decode(t[3]);
    currentBlock = {
      type: "verification-cards",
      caption,
      defaultCollapsed: true,
      items: [],
    };
    currentGroup?.blocks.push(currentBlock);
  } else if (t[4] !== undefined) {
    currentBlock?.items.push(parseArticle(t[4]));
  }
}

/* ----------------------------- 组装 diligence-report ----------------------------- */
const h1 = decode(
  (html.match(/<h1>([\s\S]*?)<\/h1>/) ?? ["", "海致科技交叉验证报告"])[1]
);

type Content =
  | { type: "paragraph"; text: string }
  | { type: "bullets"; items: string[]; ordered?: boolean }
  | { type: "callout"; tone: Tone; title?: string; text: string }
  | Block;

interface Section {
  id: string;
  title: string;
  tone: Tone;
  defaultOpen?: boolean;
  content: Content[];
}

const sections: Section[] = [];

sections.push({
  id: "key-risks",
  title: "关键风险项",
  tone: "warning",
  content: [
    { type: "paragraph", text: keyRiskParagraph },
    { type: "bullets", items: keyRiskBullets },
  ],
});

sections.push({
  id: "risk-distribution",
  title: "风险分布解读",
  tone: "neutral",
  content: [{ type: "bullets", items: distBullets }],
});

for (const g of groups) {
  const riskKey = (g.title.match(/R[1-4]/) ?? ["R0"])[0].toLowerCase();
  const totalItems = g.blocks.reduce((n, b) => n + b.items.length, 0);
  const content: Content[] =
    totalItems === 0
      ? [{ type: "paragraph", text: "（共 0 项）本次交叉验证未识别出该等级的验证项。" }]
      : g.blocks
          .filter((b) => b.items.length > 0)
          .map((b) => {
            const blk: Block = { type: "verification-cards", items: b.items };
            if (b.caption) blk.caption = b.caption;
            if (b.defaultCollapsed) blk.defaultCollapsed = true;
            return blk;
          });
  sections.push({
    id: `detail-${riskKey}`,
    title: g.title,
    tone: g.tone,
    // HTML 中各风险等级 h3 大组均默认展开，仅内部「证据不足项 / 一致项」清单折叠
    defaultOpen: true,
    content,
  });
}

const report = {
  kind: "diligence-report" as const,
  title: h1,
  company: "海致科技",
  summary: keyRiskParagraph,
  // 严格按 HTML 内容呈现：不显示「报告详情」「尽调复核结论」外壳与头部摘要副标题
  hideChrome: true,
  verdict: {
    recommendation: "投决前重点复核",
    riskLevel: "R3" as const,
    valuation: "本报告未评估估值",
  },
  metrics,
  sections,
  citations: [] as Source[],
};

/* ----------------------------- 写出 TS ----------------------------- */
const totalCards = groups.reduce(
  (n, g) => n + g.blocks.reduce((m, b) => m + b.items.length, 0),
  0
);

const banner = `/**
 * 海致科技「投决报告事实交叉验证」演示数据。
 *
 * 数据源：海致科技交叉验证报告(国产).html —— 由 scripts/build-haizhi-validation-report.ts
 * 自动解析生成，内容 / 信息 / 呈现顺序严格对齐原 HTML，未增删验证项。
 * 共 ${totalCards} 项验证：${metrics.map((x) => `${x.label} ${x.value}`).join(" / ")}。
 *
 * 与第四范式「事实交叉验证报告」共用同一套渲染（DiligenceReportCard + 目录 +
 * verification-cards），以获得一致的视觉与交互。
 *
 * 如需更新：修改源 HTML 后重新运行 npx tsx scripts/build-haizhi-validation-report.ts。
 */
import type { AssistantBlock, ChatMessage } from "@/src/types";

const haizhiValidationReport: AssistantBlock = ${JSON.stringify(report, null, 2)};

export { haizhiValidationReport };

export const haizhiValidationReportMessages: ChatMessage[] = [
  {
    id: "m-haizhi-val-sys",
    role: "system",
    text: "项目「海致科技 D 轮」已完成 3 份资料解析：海致科技投决报告、海致科技财务尽调报告、海致科技法律尽调报告。",
    createdAt: "2026-06-18T10:10:00+08:00",
  },
  {
    id: "m-haizhi-val-user",
    role: "user",
    text: "对投决报告的内容进行事实交叉验证",
    mode: "fact-check",
    attachments: [{ name: "海致科技投决报告.pdf", size: "4.6 MB", kind: "pdf" }],
    createdAt: "2026-06-18T10:12:20+08:00",
  },
  {
    id: "m-haizhi-val-assistant",
    role: "assistant",
    createdAt: "2026-06-18T10:16:40+08:00",
    blocks: [haizhiValidationReport],
  },
];
`;

writeFileSync(OUT_TS, banner, "utf8");

// 控制台校验输出
console.log("metrics:", metrics.map((m) => `${m.label}=${m.value}`).join(", "));
console.log(
  "groups:",
  groups
    .map(
      (g) =>
        `${g.title} -> ${g.blocks
          .map((b) => `${b.caption ?? "(default)"}:${b.items.length}`)
          .join(" | ")}`
    )
    .join("\n        ")
);
console.log("total cards:", totalCards);
console.log("key-risk bullets:", keyRiskBullets.length);
console.log("dist bullets:", distBullets.length);
console.log("written:", OUT_TS);
