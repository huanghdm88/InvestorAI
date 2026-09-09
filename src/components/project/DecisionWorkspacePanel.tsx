import { useRef, useState, type ReactNode } from "react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/src/components/ui/sheet";
import { AppIcon } from "@/src/components/ui/app-icon";
import { IconArrowRight, IconChevronDown, IconClose, IconFileText, IconAttach } from "@/src/lib/icons";
import { getCommitteeBrief } from "@/src/data/committee-briefs";
import { decisionQuestionContext, decisionResultLabels, decisionStatusLabels, getDecisionAttention } from "@/src/lib/decision-workspace";
import { inferUploadFileKind, UPLOAD_FILE_ACCEPT, validateUploadFiles } from "@/src/lib/file-upload";
import type { AuthRole, KnowledgeFile, Project, QuestionContext, SourceAnchor } from "@/src/types";
import type { DecisionAction, DecisionItem, DecisionWorkspaceData } from "@/src/types/decision";
import { ReasoningSources } from "./QuestionReasoningDialog";
import "./decision-workspace.css";

export function getDecisionExecutionSummary(data: DecisionWorkspaceData): string {
  const label = data.isDemo ? "演示决议" : "决议";
  if (data.result === "pending") return `${label}结果待确认，落实条件尚未明确。`;
  if (data.result === "deferred" || data.result === "rejected") return `${label}${decisionResultLabels[data.result]}，当前不进入签约或出资落实。`;
  const conditions = data.items.filter((item) => item.kind === "condition");
  const verified = conditions.filter((item) => item.status === "verified").length;
  const changes = data.items.filter((item) => item.kind === "change" && item.status !== "verified").length;
  const progress = conditions.length ? `已落实 ${verified} 项，待落实 ${conditions.length - verified} 项` : "落实条件待确认";
  return `${label}${decisionResultLabels[data.result]}：${progress}${changes ? `，另有 ${changes} 项重大变化待复核` : ""}。`;
}

export function DecisionWorkspacePanel({ project, role, onAction, onAsk, onViewSource, onDraftTask, reportPanel }: {
  project: Project; role: AuthRole;
  onAction: (action: DecisionAction) => void;
  onAsk: (context: QuestionContext) => void;
  onViewSource: (source: SourceAnchor) => void;
  onDraftTask?: (text: string, files?: KnowledgeFile | KnowledgeFile[]) => void;
  reportPanel?: ReactNode;
}) {
  const data = project.decision;
  const manager = role === "investment-director";
  const [detailId, setDetailId] = useState<string | null>(null);
  const [resolutionOpen, setResolutionOpen] = useState(false);
  const [note, setNote] = useState("");
  const [notice, setNotice] = useState("");
  const [reviewDemoOpen, setReviewDemoOpen] = useState(false);
  const [owner, setOwner] = useState("");
  const [deadline, setDeadline] = useState("");
  const trigger = useRef<HTMLElement | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  if (!data) return <p className="decision-empty">投决结果待确认。</p>;
  const item = data.items.find((entry) => entry.id === detailId);
  const attention = getDecisionAttention(data, role);
  const conditions = data.items.filter((entry) => entry.kind === "condition");
  const incomplete = conditions.filter((entry) => entry.status !== "verified");
  const linked = new Set(data.items.map((entry) => entry.questionId));
  const oldQuestions = getCommitteeBrief(project).questions;
  const openItem = (entry: DecisionItem, target: HTMLElement) => { trigger.current = target; setDetailId(entry.id); setNote(entry.note ?? ""); setOwner(entry.owner); setDeadline(/^\d{4}-\d{2}-\d{2}$/.test(entry.deadline) ? entry.deadline : ""); setNotice(""); setReviewDemoOpen(false); };
  const act = (action: DecisionAction, message: string) => { onAction(action); setNotice(message); };
  const restoreFocus = (event: Event) => { if (trigger.current?.isConnected) { event.preventDefault(); trigger.current.focus(); } };
  const submitReview = () => {
    if (!item || !note.trim()) { setNotice("请先填写需要复核的说明。"); return; }
    act({ type: "submit", itemId: item.id, note }, "已记录复核请求；演示环境不会向真实审批人发送通知。");
  };
  return <div className="decision-workspace">
    <section className="decision-resolution" aria-labelledby="decision-resolution-title">
      <div className="ic-overview-section-heading"><h2 id="decision-resolution-title">投决结论</h2></div>
      <div className="decision-baseline-card">
        <div><strong>{getDecisionExecutionSummary(data)}</strong></div>
        <button type="button" className="ic-overview-button" onClick={(event) => { trigger.current = event.currentTarget; setResolutionOpen(true); }}>查看决议 <AppIcon icon={IconArrowRight} size={12} /></button>
      </div>
      <section className="decision-execution" aria-labelledby="decision-execution-title">
        <details open key={`${project.id}:${role}`}>
          <summary><h3 id="decision-execution-title">决议落实</h3><span>{incomplete.length ? `${incomplete.length} 项待落实` : conditions.length ? "条件已完成（演示）" : "条件待确认"}</span><AppIcon icon={IconChevronDown} size={11} /></summary>
          {conditions.length ? <div className="decision-condition-list">{conditions.map((entry) => <button type="button" key={entry.id} className="decision-condition-row" onClick={(event) => openItem(entry, event.currentTarget)}><span><strong>{entry.title}</strong><small>{entry.milestone} · {entry.owner}{entry.muted ? " · 暂不提醒" : ""}</small></span><span className="ic-question-status">{decisionStatusLabels[entry.status]}</span><AppIcon icon={IconArrowRight} size={12} /></button>)}</div> : <p className="decision-empty">未确认决议条件，不自动新增任务。</p>}
          {data.items.some((entry) => entry.muted && entry.kind === "change") && <div className="decision-condition-list"><p className="decision-meta">暂不提醒的变化</p>{data.items.filter((entry) => entry.muted && entry.kind === "change").map((entry) => <button type="button" key={entry.id} className="decision-condition-row" onClick={(event) => openItem(entry, event.currentTarget)}>{entry.title}<AppIcon icon={IconArrowRight} size={12} /></button>)}</div>}
        </details>
      </section>
    </section>

    {manager && <section className="decision-attention" aria-labelledby="decision-attention-title">
      <div className="ic-overview-section-heading"><h2 id="decision-attention-title">当前关注</h2><span>{attention.length ? `${attention.length} 项` : "暂无新增事项"}</span></div>
      {attention.length ? <ol className="decision-attention-list">{attention.map((entry, index) => <li key={entry.id}>
        <span className="ic-question-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
        <div className="decision-attention-copy"><div><h3>{entry.title}</h3><span className="ic-question-status">{decisionStatusLabels[entry.status]}</span></div><p>{entry.impact}</p><span className="decision-meta">{entry.kind === "change" ? "重大变化" : entry.milestone} · {manager ? entry.owner : "影响原决议落实"}</span></div>
        <button type="button" className="ic-overview-button" onClick={(event) => openItem(entry, event.currentTarget)}>查看详情 <AppIcon icon={IconArrowRight} size={12} /></button>
      </li>)}</ol> : <p className="decision-empty">{data.result === "pending" ? "确认投决结果后，再整理关键条件与变化。" : "暂无需再次审议的重大变化；条件落实情况可在投决结论中查看。"}</p>}
    </section>}

    {reportPanel}

    <details open key={`${project.id}:${role}:archive`} className="decision-question-archive"><summary>会前关注去向 <AppIcon icon={IconChevronDown} size={11} /></summary><div>{oldQuestions.map((question) => <div key={question.id}><span>{question.question}</span><small>{data.items.find((entry) => entry.questionId === question.id)?.kind === "change" ? "转为变化评估" : linked.has(question.id) ? "转为决议落实" : question.scope === "resolved" ? "已澄清" : "保留待判断"}</small></div>)}</div></details>

    <Sheet open={resolutionOpen} onOpenChange={setResolutionOpen}><SheetContent className="decision-detail-sheet" onCloseAutoFocus={restoreFocus}>
      <SheetTitle>投决结论</SheetTitle><SheetDescription>{project.name} · {data.version} · 情景演示</SheetDescription>
      <div className="decision-sheet-scroll"><p className="decision-resolution-result">{decisionResultLabels[data.result]}</p><p>{data.summary}</p><ol className="decision-resolution-terms">{data.terms.map((term) => <li key={term}>{term}</li>)}</ol>
        <dl className="decision-detail-grid"><div><dt>原议案投前估值</dt><dd>{getCommitteeBrief(project).valuation ?? "待确认"}</dd></div><div><dt>获批演示估值</dt><dd>{data.valuation ?? "待确认"}</dd></div><div><dt>正式决议日期</dt><dd>{data.date ?? "待补充"}</dd></div><div><dt>关联议案</dt><dd>{data.approvedReport?.name ?? "待确认"}</dd></div></dl>
      </div>
    </SheetContent></Sheet>

    <Sheet open={Boolean(item)} onOpenChange={(open) => { if (!open) setDetailId(null); }}><SheetContent className="decision-detail-sheet" onCloseAutoFocus={restoreFocus}>
      <SheetTitle>{item?.title ?? "决议事项"}</SheetTitle><SheetDescription>{project.name} · {item?.kind === "change" ? "重大变化" : "决议条件"} · 情景演示</SheetDescription>
      {item && <><div className="decision-sheet-scroll">
        <div className="decision-detail-status"><span className="ic-question-status">{decisionStatusLabels[item.status]}</span><span>{item.milestone}{item.muted ? " · 暂不提醒，条件仍有效" : ""}</span></div>
        <div className="decision-explanation"><section><span>01</span><div><h3>原批准要求</h3><p>{item.before}</p></div></section><section><span>02</span><div><h3>当前情况</h3><p>{item.current}</p></div></section><section><span>03</span><div><h3>影响与待判断事项</h3><p>{item.impact}</p></div></section></div>
        <section className="decision-proof"><h3>需要的证明</h3><p>{item.requirement}</p><dl className="decision-detail-grid"><div><dt>责任人</dt><dd>{item.owner}</dd></div><div><dt>复核人</dt><dd>{item.reviewer}</dd></div><div><dt>完成期限</dt><dd>{item.deadline}</dd></div><div><dt>比较基准</dt><dd>决议 {data.version} · 演示</dd></div></dl>
          {item.evidence.length > 0 && <div className="decision-evidence-files">{item.evidence.map((file) => <div key={file.id}><AppIcon icon={IconFileText} size={15} /><span>{file.name}<small>{file.size} · 已收取文件信息，未解析</small></span>{manager && <button type="button" aria-label={`移除${file.name}`} onClick={() => act({ type: "remove-evidence", itemId: item.id, fileId: file.id }, "材料引用已移除。") }><AppIcon icon={IconClose} size={12} /></button>}</div>)}</div>}
          {manager && <><input ref={fileInput} className="sr-only" type="file" accept={UPLOAD_FILE_ACCEPT} multiple onChange={(event) => {
            const { accepted, rejected } = validateUploadFiles(Array.from(event.target.files ?? []), item.evidence.map((file) => file.name));
            const files: KnowledgeFile[] = accepted.map((file) => ({ id: `decision-file-${crypto.randomUUID()}`, name: file.name, kind: inferUploadFileKind(file.name), size: `${(file.size / 1024 / 1024).toFixed(2)} MB`, status: "parsing", uploadedAt: new Date().toISOString(), category: "其他" }));
            if (files.length) onAction({ type: "attach", itemId: item.id, files });
            setNotice(rejected.length ? "部分文件未添加：仅支持 50 MB 内的文档，请检查重复文件或文件格式。" : "已收取文件信息，等待复核；未执行内容解析。"); event.target.value = "";
          }} /><button type="button" className="ic-overview-button" onClick={() => fileInput.current?.click()}><AppIcon icon={IconAttach} size={14} />补充材料</button></>}
        </section>
        <details className="decision-source-fold"><summary>原尽调依据 <AppIcon icon={IconChevronDown} size={11} /></summary><ReasoningSources sources={item.sources} onViewSource={onViewSource} /></details>
        {manager && <details className="decision-source-fold"><summary>调整处理安排 <AppIcon icon={IconChevronDown} size={11} /></summary><div className="decision-assignment"><label>责任人<input value={owner} onChange={(event) => setOwner(event.target.value)} placeholder="填写责任人" /></label><label>完成期限<input type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} /></label><button type="button" className="ic-overview-button" disabled={!owner.trim()} onClick={() => act({ type: "assign", itemId: item.id, owner, deadline }, "处理安排已保存；未发送外部通知。")}>保存安排</button></div></details>}
        {manager && <section className="decision-handling"><label htmlFor="decision-note">处理说明</label><textarea id="decision-note" rows={3} placeholder="说明差异、补证情况或需要复核的内容…" value={note} onChange={(event) => setNote(event.target.value)} />
          <div className="decision-inline-actions"><button type="button" className="ic-overview-button" onClick={submitReview}>提交复核</button><button type="button" className="manager-text-action" onClick={() => act({ type: item.muted ? "unmute" : "mute", itemId: item.id }, item.muted ? "已恢复提醒。" : "已暂不提醒；原条件与阻塞状态仍然保留。")}>{item.muted ? "恢复提醒" : "暂不提醒"}</button></div>
          {data.isDemo && <details open={reviewDemoOpen} onToggle={(event) => setReviewDemoOpen(event.currentTarget.open)} className="decision-source-fold"><summary>演示复核结果 <AppIcon icon={IconChevronDown} size={11} /></summary><div className="decision-inline-actions">{(["verified", "supplement"] as const).map((outcome) => <button type="button" className="ic-overview-button" key={outcome} disabled={!item.evidence.length || !note.trim()} title={!item.evidence.length || !note.trim() ? "请先添加材料并填写处理说明" : undefined} onClick={() => act({ type: "review-demo", itemId: item.id, outcome, note }, "已更新演示复核状态；未执行真实审批。")}>{outcome === "verified" ? item.kind === "change" ? "模拟无实质影响" : "模拟核验通过" : "模拟退回补充"}</button>)}</div></details>}
        </section>}
        {notice && <p className="decision-inline-notice" role="status">{notice}</p>}
        {item.history.length > 0 && <details className="decision-source-fold"><summary>处理记录 · {item.history.length} <AppIcon icon={IconChevronDown} size={11} /></summary><ol className="decision-history">{item.history.map((entry, index) => <li key={index}><p>{entry.text}</p>{entry.at && <time dateTime={entry.at}>{new Date(entry.at).toLocaleString("zh-CN")}</time>}</li>)}</ol></details>}
      </div><footer className="decision-detail-footer"><button type="button" className="ic-overview-button" onClick={() => { const context = decisionQuestionContext(project, item); setDetailId(null); onAsk(context); }}>就此追问</button>{manager && onDraftTask && <button type="button" className="ic-overview-button ic-overview-button--dark" onClick={() => { setDetailId(null); onDraftTask(`${item.kind === "change" ? "重大变化评估" : "交叉验证"}：对照决议 ${data.version} 核对“${item.title}”。批准要求：${item.before}；所需证明：${item.requirement}。保留差异，不代替授权核验。`, item.evidence); }}>{item.kind === "change" ? "重大变化评估" : "交叉验证"} <AppIcon icon={IconArrowRight} size={12} /></button>}</footer></>}
    </SheetContent></Sheet>
  </div>;
}
