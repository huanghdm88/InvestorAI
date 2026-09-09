import { AppIcon } from "@/src/components/ui/app-icon";
import { IconClose } from "@/src/lib/icons";
import type { QuestionContext, SourceAnchor } from "@/src/types";
import "./question-context.css";

interface QuestionContextCardProps {
  context: QuestionContext;
  onRemove?: () => void;
  onViewSource?: (source: SourceAnchor) => void;
}

/** A reference snapshot, not an uploaded file or user-authored prompt. */
export function QuestionContextCard({ context, onRemove, onViewSource }: QuestionContextCardProps) {
  return (
    <div className="question-context-card">
      <details>
        <summary>
          <span className="question-context-copy">
            <span className="question-context-label">当前关注</span>
            <span className="question-context-title">{context.question}</span>
          </span>
          <span className="question-context-expand">展开</span>
        </summary>
        <div className="question-context-detail">
          <dl>
            <div><dt>当前依据</dt><dd>{context.context}</dd></div>
            <div><dt>{context.stage === "decided" ? "原批准要求" : "投资主张"}</dt><dd>{context.thesis}</dd></div>
            <div><dt>{context.stage === "decided" ? "执行影响" : "投决影响"}</dt><dd>{context.impact}</dd></div>
            <div><dt>需确认</dt><dd>{context.neededEvidence}</dd></div>
          </dl>
          {context.sources.length > 0 && <div className="question-context-sources">
            {context.sources.map((source, index) => onViewSource ? (
              <button type="button" key={index} onClick={() => onViewSource(source)}>
                {source.document} · {source.page}
              </button>
            ) : <span key={index}>{source.document} · {source.page}</span>)}
          </div>}
        </div>
      </details>
      {onRemove && <button className="question-context-remove" type="button" aria-label="移除质询附件" title="移除质询附件" onClick={onRemove}>
        <AppIcon icon={IconClose} size={13} />
      </button>}
    </div>
  );
}
