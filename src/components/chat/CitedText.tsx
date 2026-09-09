import { Fragment } from "react";

import { CitationRef } from "@/src/components/chat/CitationRef";
import type { SourceAnchor } from "@/src/types";

interface CitedTextProps {
  /** 文本中可包含 `[^1]`、`[^2]` 形式的引用标记，序号对应 citations 数组的 1-based 下标 */
  text: string;
  citations?: SourceAnchor[];
  onView: (anchor: SourceAnchor) => void;
  /**
   * 是否将相邻的多个标记折叠为 [1,2] 这种连写
   * 默认 true。
   */
  combineAdjacent?: boolean;
}

const CITE_RE = /\[\^(\d+)\]/g;

/**
 * 把带 `[^N]` 标记的文本渲染为「正文 + 可悬停的引用标识符」。
 * - 找不到对应 citation 时静默丢弃标记（不显示 [^N] 原文）。
 * - 数字之间不插空格，保留原文标点节奏。
 */
export function CitedText({
  text,
  citations,
  onView,
  combineAdjacent = true,
}: CitedTextProps) {
  if (!text) return null;
  if (!citations || citations.length === 0) {
    return <>{text.replace(CITE_RE, "")}</>;
  }

  type Token =
    | { type: "text"; value: string }
    | { type: "cite"; refs: number[] };
  const tokens: Token[] = [];

  let lastIndex = 0;
  let match: RegExpExecArray | null;
  CITE_RE.lastIndex = 0;
  while ((match = CITE_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: "text", value: text.slice(lastIndex, match.index) });
    }
    tokens.push({ type: "cite", refs: [parseInt(match[1], 10)] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    tokens.push({ type: "text", value: text.slice(lastIndex) });
  }

  // 折叠相邻引用，做 [1][2] → 视觉上一组 chip 序列（中间不再插入空格）
  const flat: Token[] = [];
  if (combineAdjacent) {
    for (const t of tokens) {
      const prev = flat[flat.length - 1];
      if (t.type === "cite" && prev && prev.type === "cite") {
        prev.refs.push(...t.refs);
      } else {
        flat.push(t);
      }
    }
  } else {
    flat.push(...tokens);
  }

  return (
    <>
      {flat.map((t, i) => {
        if (t.type === "text") {
          return <Fragment key={i}>{t.value}</Fragment>;
        }
        return (
          <span
            key={i}
            className="inline-flex max-w-full flex-wrap items-center gap-0.5 align-middle"
          >
            {t.refs.map((r) => {
              const anchor = citations[r - 1];
              if (!anchor) return null;
              return (
                <CitationRef key={r} index={r} anchor={anchor} onView={onView} />
              );
            })}
          </span>
        );
      })}
    </>
  );
}
