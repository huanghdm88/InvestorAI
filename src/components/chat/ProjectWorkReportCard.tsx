import { CitedText } from "./CitedText";
import { CitationsFooter } from "./CitationsFooter";
import type { AssistantBlock, SourceAnchor } from "@/src/types";

export function ProjectWorkReportCard({ block, onViewSource }: { block: Extract<AssistantBlock, {kind: "project-work-report"}>; onViewSource: (source: SourceAnchor) => void }) {
  return <div className="space-y-5 text-sm leading-7 text-neutral-700">
    <details className="rounded-lg border border-neutral-200 bg-white px-5 py-4"><summary className="cursor-pointer text-xs text-neutral-500">本次要求</summary><p className="mt-3 whitespace-pre-wrap">{block.query}</p></details>
    <p className="text-xs text-neutral-500">{block.summary}</p>
    {block.sections.map((section) => <section key={section.id} className="rounded-lg border border-neutral-200 bg-white p-5"><h3 className="mb-3 text-base font-semibold text-neutral-900">{section.title}</h3><div className="whitespace-pre-wrap"><CitedText text={section.text} citations={block.citations} onView={onViewSource} /></div></section>)}
    <CitationsFooter citations={block.citations} onView={onViewSource} />
  </div>;
}
