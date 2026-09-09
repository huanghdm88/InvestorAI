import type { AuthRole, KnowledgeFile, Project, ReportSourceRef, SourceAnchor } from "./index";

export type DecisionResult = "conditional" | "approved" | "pending" | "deferred" | "rejected";
export type DecisionItemStatus = "missing" | "review" | "supplement" | "verified" | "attention" | "submitted";
export interface DecisionItem {
  id: string;
  questionId?: string;
  kind: "condition" | "change";
  title: string;
  before: string;
  current: string;
  impact: string;
  requirement: string;
  milestone: "签约前" | "出资前" | "后续跟踪";
  owner: string;
  reviewer: string;
  deadline: string;
  critical: boolean;
  status: DecisionItemStatus;
  sources: SourceAnchor[];
  evidence: KnowledgeFile[];
  muted?: boolean;
  note?: string;
  history: Array<{ at: string; text: string }>;
}
export interface DecisionWorkspaceData {
  id: string;
  projectId: string;
  result: DecisionResult;
  version: string;
  isDemo: boolean;
  date: string | null;
  financing: string | null;
  investment: string | null;
  valuation: string | null;
  summary: string;
  terms: string[];
  approvedReport?: ReportSourceRef;
  items: DecisionItem[];
}
export type DecisionAction =
  | { type: "assign"; itemId: string; owner: string; deadline: string }
  | { type: "attach"; itemId: string; files: KnowledgeFile[] }
  | { type: "remove-evidence"; itemId: string; fileId: string }
  | { type: "submit"; itemId: string; note: string }
  | { type: "mute" | "unmute"; itemId: string }
  | { type: "review-demo"; itemId: string; outcome: "verified" | "supplement"; note: string };

/** A request keeps its submitting context even if the user switches stage or role. */
export interface TaskSnapshot {
  project: Project;
  userRole?: AuthRole;
  reportSource?: ReportSourceRef;
}
