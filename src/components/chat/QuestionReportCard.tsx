import { CitationsFooter } from "@/src/components/chat/CitationsFooter";
import type { AssistantBlock, SourceAnchor } from "@/src/types";

export function QuestionReportCard({ block, onViewSource }: {
  block: Extract<AssistantBlock, { kind: "question-report" }>;
  onViewSource: (source: SourceAnchor) => void;
}) {
  const sectionClass = "rounded-lg border border-neutral-200 bg-white p-5";
  return <div className="space-y-4 text-sm leading-7 text-neutral-700">
    <section className={sectionClass}>
      <h3 className="mb-2 font-semibold text-neutral-900">本次追问</h3>
      <p className="whitespace-pre-wrap">{block.query}</p>
      <p className="mt-3 text-xs text-neutral-500">引用关注 · {block.context.question}</p>
    </section>
    <section className={sectionClass}>
      <h3 className="mb-2 font-semibold text-neutral-900">会话结论</h3>
      <p className="whitespace-pre-wrap">{block.conclusion}</p>
    </section>
    <section className={sectionClass}>
      <h3 className="mb-2 font-semibold text-neutral-900">材料与前提</h3>
      <p>{block.context.context}</p>
      <p className="mt-3">采用前提：{block.premise}</p>
      <p className="mt-3">待补证据：{block.context.neededEvidence}</p>
    </section>
    <section className={sectionClass}>
      <h3 className="mb-2 font-semibold text-neutral-900">条件路径</h3>
      <ol className="divide-y divide-neutral-100">
        {block.paths.map((path, index) => <li key={path.id} className="py-4">
          <h4 className="font-medium text-neutral-900">{index + 1}. {path.title}</h4>
          <p className="mt-1">如果：{path.condition}</p>
          <p>则：{path.judgment}</p>
          <p className="mt-2 text-neutral-500">下一步：{path.action}</p>
        </li>)}
      </ol>
    </section>
    <CitationsFooter citations={block.citations} onView={onViewSource} />
  </div>;
}
