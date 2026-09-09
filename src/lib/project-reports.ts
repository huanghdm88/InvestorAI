import type { AssistantBlock, Conversation } from "@/src/types";

/** 可在历史报告 / Canvas 抽屉中打开的报告块类型 */
export type ReportBlock = Extract<
  AssistantBlock,
  {
    kind:
      | "fact-verification"
      | "challenge-list"
      | "valuation"
      | "enterprise-analysis"
      | "question-report"
      | "project-work-report"
      | "diligence-report";
  }
>;

export function isReportBlock(
  block: AssistantBlock
): block is ReportBlock {
  return (
    block.kind === "fact-verification" ||
    block.kind === "challenge-list" ||
    block.kind === "valuation" ||
    block.kind === "enterprise-analysis" ||
    block.kind === "question-report" ||
    block.kind === "project-work-report" ||
    block.kind === "diligence-report"
  );
}

/** 项目历史报告条目：来自对话流或企业分析评估 */
export interface ProjectReportEntry {
  id: string;
  projectId: string;
  source: "conversation" | "enterprise-assessment" | "manager-revision";
  conversationId?: string;
  conversationTitle?: string;
  block: ReportBlock;
  createdAt: string;
}

/** 从项目下所有对话中抽取报告类 assistant block */
export function extractConversationReports(
  projectId: string,
  conversations: Conversation[]
): ProjectReportEntry[] {
  const entries: ProjectReportEntry[] = [];
  for (const conv of conversations) {
    if (conv.projectId !== projectId) continue;
    for (const msg of conv.messages) {
      if (msg.role !== "assistant" || !msg.blocks) continue;
      msg.blocks.forEach((block, i) => {
        if (!isReportBlock(block)) return;
        entries.push({
          id: `${conv.id}-${msg.id}-${i}`,
          projectId,
          source: "conversation",
          conversationId: conv.id,
          conversationTitle: conv.title,
          block,
          createdAt: msg.createdAt,
        });
      });
    }
  }
  return entries;
}

export function mergeProjectReports(
  fromConversations: ProjectReportEntry[],
  enterpriseReports: ProjectReportEntry[]
): ProjectReportEntry[] {
  const map = new Map<string, ProjectReportEntry>();
  for (const e of [...fromConversations, ...enterpriseReports]) {
    map.set(e.id, e);
  }
  return [...map.values()].sort(
    (a, b) => (a.createdAt < b.createdAt ? 1 : -1)
  );
}
