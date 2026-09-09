import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { AppIcon } from "@/src/components/ui/app-icon";
import { IconArrowRight, IconChevronDown, IconFileText } from "@/src/lib/icons";
import type { SourceAnchor } from "@/src/types";
import type { ReportReviewDecision } from "@/src/lib/report-review";
import { changeOriginLabel, type PendingProjectChange } from "@/src/lib/project-changes";

function PendingReportChange({ item, animateIn, onDecide, onViewSource, renderReasoningAction }: {
  item: PendingProjectChange;
  animateIn: boolean;
  onDecide: (item: PendingProjectChange, decision: ReportReviewDecision) => void;
  onViewSource: (source: SourceAnchor) => void;
  renderReasoningAction?: (item: PendingProjectChange) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<"entering" | "idle" | "exiting">(animateIn ? "entering" : "idle");
  const decisionTimer = useRef<number | null>(null);
  const detailId = useId();
  useEffect(() => {
    const timer = window.setTimeout(() => setPhase((current) => current === "entering" ? "idle" : current), 260);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => () => {
    if (decisionTimer.current !== null) window.clearTimeout(decisionTimer.current);
  }, []);
  const handleDecision = (decision: ReportReviewDecision) => {
    if (decisionTimer.current !== null) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onDecide(item, decision);
      return;
    }
    setPhase("exiting");
    decisionTimer.current = window.setTimeout(() => onDecide(item, decision), 240);
  };
  return <article className={`manager-review-item manager-review-item--${phase}`}>
    <div className="manager-review-item-content"><div className="manager-review-item-body">
    <div className="manager-review-item-heading">
      <button type="button" className="manager-review-toggle" aria-expanded={open} aria-controls={detailId} onClick={() => setOpen(!open)}>
        <strong><small className="manager-change-origin">{changeOriginLabel(item)}</small>{item.title}</strong><span>{open ? "收起" : "查看修改"}<AppIcon icon={IconChevronDown} size={11} /></span>
      </button>
      <div className="manager-review-actions"><button type="button" className="ic-overview-button ic-overview-button--dark" aria-label={`采纳：${item.title}`} onClick={() => handleDecision("accepted")}>采纳</button><button type="button" className="ic-overview-button" aria-label={`忽略：${item.title}`} onClick={() => handleDecision("ignored")}>忽略</button></div>
    </div>
    <div id={detailId} className="manager-review-detail" hidden={!open}>
      <dl><div><dt>{"sourceReport" in item ? "原表述" : "更新前"}</dt><dd>{item.before}</dd></div><div><dt>{"sourceReport" in item ? "建议表述" : "更新后"}</dt><dd>{item.after}</dd></div></dl><p>{item.reason}</p>
      <div className="manager-review-detail-footer"><div className="manager-review-sources">{item.sources.map((source, index) => <button type="button" key={index} className="ic-overview-source" onClick={() => onViewSource(source)}><AppIcon icon={IconFileText} size={13} />{source.document} · {source.page}<AppIcon icon={IconArrowRight} size={11} /></button>)}</div>{renderReasoningAction?.(item)}</div>
    </div>
    </div></div>
  </article>;
}

export function ReportReviewList({ items, decisions, onDecide, onViewSource, renderReasoningAction }: {
  items: PendingProjectChange[]; decisions: Record<string, ReportReviewDecision>;
  onDecide: (key: string, decision: ReportReviewDecision | null) => void;
  onViewSource: (source: SourceAnchor) => void;
  renderReasoningAction?: (item: PendingProjectChange) => ReactNode;
}) {
  const [notice, setNotice] = useState<{ text: string; key: string } | null>(null);
  const [restoredKey, setRestoredKey] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [noticeHovered, setNoticeHovered] = useState(false);
  const [noticeFocused, setNoticeFocused] = useState(false);
  useEffect(() => {
    if (!notice || noticeHovered || noticeFocused) return;
    const timeout = window.setTimeout(() => {
      setNotice(null);
    }, 4000);
    return () => window.clearTimeout(timeout);
  }, [notice, noticeHovered, noticeFocused]);
  useEffect(() => {
    if (notice && !items.some((item) => item.key === notice.key)) setNotice(null);
  }, [items, notice]);
  if (!items.length) return null;
  const pending = items.filter((item) => !decisions[item.key]);
  const handled = items.filter((item) => decisions[item.key]);
  const decide = (item: PendingProjectChange, decision: ReportReviewDecision | null) => {
    if (decision === null) setRestoredKey(item.key);
    onDecide(item.key, decision);
    setNoticeHovered(false);
    setNoticeFocused(false);
    setNotice({ key: item.key, text: decision === "accepted" ? "sourceReport" in item ? "已采纳，修订草稿已保存。" : "已采纳，已记录复核意见；未自动改写报告。" : decision === "ignored" ? "已忽略，保留现有数据。" : "已撤销，可重新处理。" });
    headingRef.current?.focus({ preventScroll: true });
  };
  return <section className="manager-review-list" id="manager-pending-changes" aria-label="待确认变更">
    <header className="ic-overview-section-heading"><h2 ref={headingRef} tabIndex={-1}>待确认变更</h2><span>{pending.length ? `${pending.length} 项` : "已处理"}</span></header>
    {pending.map((item) => <PendingReportChange key={item.key} item={item} animateIn={restoredKey === item.key} onDecide={decide} onViewSource={onViewSource} renderReasoningAction={renderReasoningAction} />)}
    {notice && <div role="status" className="manager-review-feedback"
      onPointerEnter={() => setNoticeHovered(true)} onPointerLeave={() => setNoticeHovered(false)}
      onFocus={() => setNoticeFocused(true)} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setNoticeFocused(false); }}
    ><span>{notice.text}</span>{decisions[notice.key] && <button type="button" onClick={() => { const item = items.find((item) => item.key === notice.key); if (item) decide(item, null); }}>撤销</button>}</div>}
    {handled.length > 0 && <details className="manager-review-handled"><summary>已处理 {handled.length} <AppIcon icon={IconChevronDown} size={10} /></summary>{handled.map((item) => <div key={item.key}><span>{item.title}</span><small>{decisions[item.key] === "accepted" ? "已采纳" : "已忽略"}</small><button type="button" aria-label={`撤销：${item.title}`} onClick={() => decide(item, null)}>撤销</button></div>)}</details>}
  </section>;
}
