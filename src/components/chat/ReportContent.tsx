import { ChallengeListCard } from "./ChallengeListCard";
import { DiligenceReportCard } from "./DiligenceReportCard";
import { EnterpriseAnalysisCard } from "./EnterpriseAnalysisCard";
import { FactVerificationCard } from "./FactVerificationCard";
import { ValuationCard } from "./ValuationCard";
import { QuestionReportCard } from "./QuestionReportCard";
import { ProjectWorkReportCard } from "./ProjectWorkReportCard";
import type { ReportBlock } from "@/src/lib/project-reports";
import type { SourceAnchor } from "@/src/types";

/** One report renderer for the reading drawer and the manager working surface. */
export function ReportContent({ block, onViewSource }: { block: ReportBlock; onViewSource: (source: SourceAnchor) => void }) {
  switch (block.kind) {
    case "project-work-report": return <ProjectWorkReportCard block={block} onViewSource={onViewSource} />;
    case "fact-verification": return <FactVerificationCard {...block} onViewSource={onViewSource} />;
    case "challenge-list": return <ChallengeListCard {...block} onViewSource={onViewSource} />;
    case "valuation": return <ValuationCard {...block} onViewSource={onViewSource} />;
    case "enterprise-analysis": return <EnterpriseAnalysisCard block={block} onViewSource={onViewSource} />;
    case "diligence-report": return <DiligenceReportCard block={block} onViewSource={onViewSource} />;
    case "question-report": return <QuestionReportCard block={block} onViewSource={onViewSource} />;
  }
}
