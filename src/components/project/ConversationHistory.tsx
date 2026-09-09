import { useState } from "react";
import { AppIcon } from "@/src/components/ui/app-icon";
import { IconArrowRight } from "@/src/lib/icons";
import { formatRelative, isListedConversation } from "@/src/lib/utils";
import type { Conversation } from "@/src/types";

export const hasVisibleConversation = (item: Conversation) => isListedConversation(item) || Boolean(item.draftText?.trim() || item.questionContext || item.draftAttachments?.length);
export const conversationHistoryTitle = (item: Conversation) => item.isDraft
  ? `草稿 · ${item.draftText?.split("\n")[0] || item.questionContext?.question || item.draftAttachments?.[0]?.name || "新对话"}`
  : item.title || "未命名对话";

export function ConversationHistory({ conversations, currentId, onOpen, onRename, onDelete }: {
  conversations: Conversation[]; currentId: string | null;
  onOpen: (id: string) => void;
  onRename?: (id: string, title: string) => void;
  onDelete?: (id: string) => void;
}) {
  const [editing, setEditing] = useState<{ id: string; title: string } | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  return <div className="ic-shell-conversation-history">
    {conversations.length ? conversations.map((item) => <div className="ic-history-row" key={item.id}>
      {editing?.id === item.id ? <form className="ic-history-edit" onSubmit={(event) => { event.preventDefault(); if (editing.title.trim()) { onRename?.(item.id, editing.title.trim()); setEditing(null); } }}><input aria-label="对话名称" autoFocus value={editing.title} onChange={(event) => setEditing({ ...editing, title: event.target.value })} /><button type="submit" disabled={!editing.title.trim()}>保存</button><button type="button" onClick={() => setEditing(null)}>取消</button></form>
        : <button type="button" className="ic-history-open" aria-current={item.id === currentId ? "true" : undefined} onClick={() => onOpen(item.id)}><span>{conversationHistoryTitle(item)}</span><time dateTime={item.updatedAt}>{formatRelative(item.updatedAt, "zh-CN")}</time><AppIcon icon={IconArrowRight} size={12} /></button>}
      {deleting === item.id ? <div className="ic-history-confirm"><span>删除此对话及其分析报告？</span><button type="button" onClick={() => { onDelete?.(item.id); setDeleting(null); }}>确认删除</button><button type="button" onClick={() => setDeleting(null)}>取消</button></div>
        : <details className="ic-history-actions"><summary aria-label={`管理对话：${conversationHistoryTitle(item)}`}>···</summary><div>{onRename && !item.isDraft && <button type="button" onClick={() => { setEditing({ id: item.id, title: item.title }); setDeleting(null); }}>重命名</button>}{onDelete && <button type="button" onClick={() => { setDeleting(item.id); setEditing(null); }}>删除</button>}</div></details>}
    </div>) : <div className="ic-shell-empty"><p>当前项目暂无历史对话</p></div>}
  </div>;
}
