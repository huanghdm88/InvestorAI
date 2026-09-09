/**
 * 批量把项目内的尽调 / 交叉验证报告导出为单文件 HTML（自包含 + 内联 CSS）。
 *
 * 渲染逻辑统一复用 src/lib/report-html.ts（与应用内「导出 HTML」按钮同源），
 * 下载版统一不含目录；diligence-report 尊重 hideChrome。
 *
 * 运行方式：
 *   npx tsx scripts/export-sifanshi-html.ts
 *
 * 输出位置：exports/*.html
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { haizhiValidationReportMessages } from "../src/data/haizhi-validation-report";
import { sifanshiReportMessages } from "../src/data/sifanshi-report";
import { sifanshiValidationReportMessages } from "../src/data/sifanshi-validation-report";
import {
  buildReportHtml,
  type ExportableReportBlock,
} from "../src/lib/report-html";
import type { ChatMessage } from "../src/types";

const __dirname = dirname(fileURLToPath(import.meta.url));

function extractReportBlock(
  messages: ChatMessage[],
  contextLabel: string
): ExportableReportBlock {
  for (const m of messages) {
    if (m.role !== "assistant" || !m.blocks?.length) continue;
    const found = m.blocks.find(
      (b): b is ExportableReportBlock => b.kind === "diligence-report"
    );
    if (found) return found;
  }
  throw new Error(`未在 ${contextLabel} 中找到 diligence-report 块`);
}

function exportReport(
  block: ExportableReportBlock,
  fileName: string,
  outDir: string
) {
  const html = buildReportHtml(block);
  const outPath = resolve(outDir, fileName);
  writeFileSync(outPath, html, "utf8");
  console.log(`✔ 报告已导出：${outPath}`);
}

function main() {
  const outDir = resolve(__dirname, "../exports");
  mkdirSync(outDir, { recursive: true });

  const crossCheck = extractReportBlock(
    sifanshiReportMessages,
    "sifanshiReportMessages"
  );
  exportReport(crossCheck, "第四范式B轮-投资备忘录-交叉验证报告.html", outDir);

  const validation = extractReportBlock(
    sifanshiValidationReportMessages,
    "sifanshiValidationReportMessages"
  );
  exportReport(validation, "第四范式B轮-投资备忘录-事实交叉验证报告.html", outDir);

  const haizhi = extractReportBlock(
    haizhiValidationReportMessages,
    "haizhiValidationReportMessages"
  );
  exportReport(haizhi, "海致科技D轮-投决报告-交叉验证报告.html", outDir);
}

main();
