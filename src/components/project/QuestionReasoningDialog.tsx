import { AppIcon } from "@/src/components/ui/app-icon";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/src/components/ui/sheet";
import { getQuestionPathModel } from "@/src/data/question-paths";
import { IconArrowRight, IconChevronDown, IconClose, IconFileText } from "@/src/lib/icons";
import type { QuestionContext, SourceAnchor } from "@/src/types";
import "./question-reasoning.css";

export function ReasoningSources({ sources, onViewSource }: {
  sources: SourceAnchor[];
  onViewSource: (source: SourceAnchor) => void;
}) {
  return <div className="ic-reasoning-sources">
    {sources.length ? sources.map((source, index) => <button
      type="button" key={`${source.document}-${source.page}-${index}`}
      onClick={() => onViewSource(source)}
      title={source.paragraph}
      aria-label={`查看《${source.document}》${source.page}：${source.paragraph ?? "引用原文"}`}
    >
      <AppIcon icon={IconFileText} size={13} />
      <span>{source.document} · {typeof source.page === "number" ? `P${source.page}` : source.page}</span>
      <AppIcon icon={IconArrowRight} size={11} />
    </button>) : <p className="ic-reasoning-muted">来源待补充</p>}
  </div>;
}

/** A readable explanation of the supplied materials, not an internal model thought trace. */
export function QuestionReasoningBody({ context, onViewSource }: {
  context: QuestionContext;
  onViewSource: (source: SourceAnchor) => void;
}) {
  const model = getQuestionPathModel(context);
  return <div className="ic-reasoning-grid">
    <div className="ic-reasoning-inputs">
      <section className="ic-reasoning-card ic-reasoning-signal">
        <div className="ic-reasoning-card-heading"><span className="ic-reasoning-letter">A</span><div><span className="ic-reasoning-muted">推演起点</span><h3>材料信号</h3></div></div>
        <p>{context.context}</p>
        <div className="ic-reasoning-impact"><span>投决影响</span><p>{context.impact}</p></div>
        <ReasoningSources sources={context.sources} onViewSource={onViewSource} />
      </section>
      <section className="ic-reasoning-card">
        <h3>本次采用前提</h3>
        <p className="ic-reasoning-premise">{model.premise}</p>
      </section>
      <details className="ic-reasoning-card ic-reasoning-fold">
        <summary><h3>上下文</h3><AppIcon icon={IconChevronDown} size={12} /></summary>
        <dl><dt>对应投资主张</dt><dd>{context.thesis}</dd><dt>会前需补齐</dt><dd>{context.neededEvidence}</dd></dl>
      </details>
      <details className="ic-reasoning-card ic-reasoning-fold">
        <summary><h3>事实分析</h3><AppIcon icon={IconChevronDown} size={12} /></summary>
        <ol className="ic-reasoning-facts">
          <li><span>01 · 材料陈述</span><p>{context.context}</p></li>
          <li><span>02 · 证据缺口</span><p>{context.neededEvidence}</p></li>
          <li><span>03 · 当前判断</span><p>{model.conclusion}</p></li>
        </ol>
      </details>
    </div>
    <section className="ic-reasoning-card ic-reasoning-outcomes">
      <div className="ic-reasoning-outcomes-heading"><div><span className="ic-reasoning-muted">基于当前前提</span><h3>可能走向</h3></div><span className="ic-reasoning-muted">3 条条件路径</span></div>
      <div className="ic-reasoning-tree">
        <div className="ic-reasoning-fork"><span className="ic-reasoning-muted">关键分叉</span><h4>{model.fork}</h4></div>
        <div className="ic-reasoning-branches">
          {model.paths.map((path, index) => <div key={path.id} className="ic-reasoning-branch"><details className={`ic-reasoning-path ic-reasoning-path--${index}`}>
            <summary>
              <span className="ic-reasoning-letter">{String.fromCharCode(66 + index)}</span>
              <div className="ic-reasoning-path-heading"><span className="ic-reasoning-muted">{["支持当前主张", "需要附加条件", "动摇当前主张"][index]}</span><h4>{path.title}</h4><p>{path.condition}</p><strong>{path.judgment}</strong></div>
              <AppIcon icon={IconChevronDown} size={12} />
            </summary>
            <div className="ic-reasoning-path-detail"><dl>
              <dt>接下来要做</dt><dd>{path.action}</dd>
              <dt>核对材料</dt><dd>{context.neededEvidence}</dd>
            </dl><ReasoningSources sources={context.sources} onViewSource={onViewSource} /></div>
          </details></div>)}
        </div>
      </div>
    </section>
  </div>;
}

export function QuestionReasoningDialog({ context, onClose, onViewSource, onAsk, returnFocusTo }: {
  context: QuestionContext | null;
  onClose: () => void;
  onViewSource: (source: SourceAnchor) => void;
  onAsk: (context: QuestionContext) => void;
  returnFocusTo?: HTMLElement | null;
}) {
  return <Sheet open={context !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
    <SheetContent showCloseButton={false} className="ic-reasoning-dialog" onCloseAutoFocus={(event) => {
      if (returnFocusTo?.isConnected) { event.preventDefault(); returnFocusTo.focus(); }
    }}>
      {context && <>
        <header className="ic-reasoning-header">
          <div><span className="ic-reasoning-eyebrow">条件推演</span><SheetTitle>{context.question}</SheetTitle><SheetDescription>{context.projectName} · 演示材料</SheetDescription></div>
          <button type="button" className="ic-reasoning-close" aria-label="关闭推演过程" onClick={onClose}><AppIcon icon={IconClose} size={18} /></button>
        </header>
        <div className="ic-reasoning-scroll"><QuestionReasoningBody key={context.questionId} context={context} onViewSource={onViewSource} /></div>
        <footer className="ic-reasoning-footer"><div><button type="button" onClick={onClose}>返回</button><button type="button" className="ic-reasoning-primary" onClick={() => { onClose(); onAsk(context); }}>就此追问 <AppIcon icon={IconArrowRight} size={13} /></button></div></footer>
      </>}
    </SheetContent>
  </Sheet>;
}
