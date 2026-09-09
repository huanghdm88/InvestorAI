import { useEffect, useId, useMemo, useRef, useState } from "react";

import { CitationsFooter } from "@/src/components/chat/CitationsFooter";
import { CitedText } from "@/src/components/chat/CitedText";
import { VerificationCard } from "@/src/components/chat/VerificationCard";
import { AppIcon } from "@/src/components/ui/app-icon";
import {
  IconChecklist,
  IconChevronDown,
  IconChevronRight,
  IconInfo,
} from "@/src/lib/icons";
import { useLocale } from "@/src/lib/i18n";
import { cn } from "@/src/lib/utils";
import type {
  AssistantBlock,
  DiligenceContent,
  DiligenceSection,
  SemanticTone,
  SourceAnchor,
} from "@/src/types";

type DiligenceBlock = Extract<AssistantBlock, { kind: "diligence-report" }>;

interface DiligenceReportCardProps {
  block: DiligenceBlock;
  onViewSource: (anchor: SourceAnchor) => void;
}

const toneText: Record<SemanticTone, string> = {
  danger: "text-[var(--wz-color-status-danger)]",
  warning: "text-[var(--wz-color-status-warning)]",
  neutral: "text-[var(--wz-color-text-primary)]",
  positive: "text-[var(--wz-color-status-success)]",
};

const toneBar: Record<SemanticTone, string> = {
  danger: "bg-[var(--wz-color-status-danger)]",
  warning: "bg-[var(--wz-color-status-warning)]",
  neutral: "bg-[var(--wz-color-text-tertiary)]",
  positive: "bg-[var(--wz-color-status-success)]",
};

const calloutStyle: Record<
  SemanticTone,
  { wrap: string; title: string; icon: string }
> = {
  danger: {
    wrap:
      "border-[var(--wz-color-border-default)] bg-[var(--wz-color-status-danger-subtle)]",
    title: "text-[var(--wz-color-status-danger)]",
    icon: "text-[var(--wz-color-status-danger)]",
  },
  warning: {
    wrap:
      "border-[var(--wz-color-border-default)] bg-[var(--wz-color-status-warning-subtle)]",
    title: "text-[var(--wz-color-status-warning)]",
    icon: "text-[var(--wz-color-status-warning)]",
  },
  neutral: {
    wrap:
      "border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-subtle)]",
    title: "text-[var(--wz-color-text-primary)]",
    icon: "text-[color:var(--wz-color-text-secondary)]",
  },
  positive: {
    wrap:
      "border-[var(--wz-color-border-default)] bg-[var(--wz-color-status-success-subtle)]",
    title: "text-[var(--wz-color-status-success)]",
    icon: "text-[var(--wz-color-status-success)]",
  },
};

/** 富文本：支持 **高亮** 与 [^N] 引用（引用悬停看来源、点击看原文） */
function RichText({
  text,
  citations,
  onView,
}: {
  text: string;
  citations?: SourceAnchor[];
  onView: (a: SourceAnchor) => void;
}) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) => {
        if (/^\*\*[^*]+\*\*$/.test(p)) {
          return (
            <mark
              key={i}
              className="rounded-[var(--wz-radius-sm)] bg-[var(--wz-color-status-warning-subtle)] px-1 font-semibold text-[var(--wz-color-text-primary)]"
            >
              <CitedText text={p.slice(2, -2)} citations={citations} onView={onView} />
            </mark>
          );
        }
        return (
          <CitedText key={i} text={p} citations={citations} onView={onView} />
        );
      })}
    </>
  );
}

function ContentRenderer({
  content,
  citations,
  onView,
}: {
  content: DiligenceContent;
  citations?: SourceAnchor[];
  onView: (a: SourceAnchor) => void;
}) {
  switch (content.type) {
    case "paragraph":
      return (
        <p className="text-[length:var(--wz-font-size-body)] leading-relaxed text-[color:var(--wz-color-text-secondary)]">
          <RichText text={content.text} citations={citations} onView={onView} />
        </p>
      );

    case "bullets": {
      const ListTag = content.ordered ? "ol" : "ul";
      return (
        <ListTag
          className={cn(
            "space-y-1.5 text-[length:var(--wz-font-size-body)] leading-relaxed text-[color:var(--wz-color-text-secondary)]",
            content.ordered ? "list-decimal pl-5" : "pl-1"
          )}
        >
          {content.items.map((it, i) => (
            <li key={i} className={cn(!content.ordered && "flex gap-2")}>
              {!content.ordered && (
                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--wz-color-border-strong)]" />
              )}
              <span className={cn(!content.ordered && "min-w-0 flex-1")}>
                <RichText text={it} citations={citations} onView={onView} />
              </span>
            </li>
          ))}
        </ListTag>
      );
    }

    case "callout": {
      const s = calloutStyle[content.tone];
      return (
        <div className={cn("rounded-lg border px-4 py-3", s.wrap)}>
          {content.title && (
            <p
              className={cn(
                "mb-1 flex items-center gap-1.5 text-[length:var(--wz-font-size-body)] font-semibold",
                s.title
              )}
            >
              <AppIcon icon={IconInfo} size={12} className={s.icon} />
              {content.title}
            </p>
          )}
          <p className="text-[length:var(--wz-font-size-body)] leading-relaxed text-[color:var(--wz-color-text-secondary)]">
            <RichText text={content.text} citations={citations} onView={onView} />
          </p>
        </div>
      );
    }

    case "stats":
      return (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {content.items.map((s, i) => (
            <div
              key={i}
              className="rounded-[var(--wz-radius-lg)] border border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-surface)] px-3.5 py-3"
            >
              <p className="text-[length:var(--wz-font-size-caption)] font-medium leading-tight text-[color:var(--wz-color-text-tertiary)]">
                {s.label}
              </p>
              <p
                className={cn(
                  "mt-1 text-[length:var(--wz-font-size-section)] font-semibold tabular-nums leading-none",
                  toneText[s.tone ?? "neutral"]
                )}
              >
                {s.value}
              </p>
              {s.sub && (
                <p className="mt-1 text-[length:var(--wz-font-size-caption)] leading-tight text-[color:var(--wz-color-text-tertiary)]">
                  {s.sub}
                </p>
              )}
            </div>
          ))}
        </div>
      );

    case "bars":
      return (
        <div className="rounded-[var(--wz-radius-lg)] border border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-surface)] px-4 py-3.5">
          {content.caption && (
            <p className="mb-2.5 text-[length:var(--wz-font-size-caption)] font-medium text-[color:var(--wz-color-text-tertiary)]">
              {content.caption}
            </p>
          )}
          <div className="space-y-2.5">
            {content.items.map((b, i) => (
              <div key={i}>
                <div className="mb-1 flex items-baseline justify-between gap-2">
                  <span className="text-[length:var(--wz-font-size-body)] text-[color:var(--wz-color-text-secondary)]">{b.label}</span>
                  <span
                    className={cn(
                      "text-[length:var(--wz-font-size-body)] font-semibold tabular-nums",
                      toneText[b.tone ?? "neutral"]
                    )}
                  >
                    {b.display}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[var(--wz-color-border-subtle)]">
                  <div
                    className={cn(
                      "h-full w-full origin-left rounded-full transition-transform [transition-duration:var(--wz-duration-normal)] [transition-timing-function:var(--wz-ease-standard)] motion-reduce:transition-none",
                      toneBar[b.tone ?? "neutral"]
                    )}
                    style={{ transform: `scaleX(${Math.max(2, Math.min(100, b.value)) / 100})` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    case "table":
      return (
        <div className="overflow-x-auto rounded-[var(--wz-radius-lg)] border border-[var(--wz-color-border-default)]">
          <table className="w-full min-w-[560px] border-collapse text-[length:var(--wz-font-size-body)]">
            <thead>
              <tr className="bg-[var(--wz-color-bg-subtle)]">
                {content.headers.map((h, i) => (
                  <th
                    key={i}
                    className="border-b border-[var(--wz-color-border-default)] px-3 py-2 text-left font-semibold text-[color:var(--wz-color-text-secondary)]"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {content.rows.map((row, ri) => (
                <tr key={ri} className="even:bg-[var(--wz-color-bg-subtle)]">
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className={cn(
                        "border-b border-[var(--wz-color-border-subtle)] px-3 py-2 align-top text-[color:var(--wz-color-text-secondary)]",
                        content.emphasizeCol === ci &&
                          "font-semibold text-[var(--wz-color-text-primary)]"
                      )}
                    >
                      <RichText text={cell} citations={citations} onView={onView} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "verification-cards":
      return (
        <VerificationCardsBlock content={content} onView={onView} />
      );

    default:
      return null;
  }
}

/** 「证据不足项 / 一致项」等长清单默认折叠；点击行标题展开 */
function VerificationCardsBlock({
  content,
  onView,
}: {
  content: Extract<DiligenceContent, { type: "verification-cards" }>;
  onView: (a: SourceAnchor) => void;
}) {
  const [collapsed, setCollapsed] = useState(content.defaultCollapsed ?? false);
  const contentId = useId();
  if (!content.caption) {
    return (
      <div className="space-y-2">
        {content.items.map((it) => (
          <VerificationCard key={it.index} item={it} onViewSource={onView} />
        ))}
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="flex w-full items-center justify-between rounded-[var(--wz-radius-lg)] border border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-subtle)] px-3 py-1.5 text-left text-[length:var(--wz-font-size-body)] font-medium text-[color:var(--wz-color-text-secondary)] transition-[background-color,border-color,color] [transition-duration:var(--wz-duration-fast)] [transition-timing-function:var(--wz-ease-standard)] hover:border-[var(--wz-color-border-strong)] hover:text-[var(--wz-color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--wz-color-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--wz-color-bg-surface)]"
        aria-expanded={!collapsed}
        aria-controls={contentId}
      >
        <span>{content.caption}</span>
        <AppIcon
          icon={IconChevronDown}
          size={12}
          className={cn(
            "text-[color:var(--wz-color-text-tertiary)] transition-transform [transition-duration:var(--wz-duration-normal)] [transition-timing-function:var(--wz-ease-standard)]",
            !collapsed && "rotate-180"
          )}
        />
      </button>
      <div id={contentId} hidden={collapsed} className="space-y-2">
        {content.items.map((it) => (
          <VerificationCard key={it.index} item={it} onViewSource={onView} />
        ))}
      </div>
    </div>
  );
}

function SectionBlock({
  section,
  open,
  onToggle,
  citations,
  onView,
  registerRef,
}: {
  section: DiligenceSection;
  open: boolean;
  onToggle: () => void;
  citations?: SourceAnchor[];
  onView: (a: SourceAnchor) => void;
  registerRef: (el: HTMLDivElement | null) => void;
}) {
  const contentId = useId();
  return (
    <div
      ref={registerRef}
      id={`dr-${section.id}`}
      className="scroll-mt-4 overflow-hidden rounded-[var(--wz-radius-lg)] border border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-surface)]"
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors [transition-duration:var(--wz-duration-fast)] [transition-timing-function:var(--wz-ease-standard)] hover:bg-[var(--wz-color-bg-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--wz-color-focus-ring)] motion-reduce:transition-none"
        aria-expanded={open}
        aria-controls={contentId}
      >
        <span className="min-w-0 flex-1 text-[length:var(--wz-font-size-body)] font-semibold text-[var(--wz-color-text-primary)]">
          {section.title}
        </span>
        <AppIcon
          icon={IconChevronDown}
          size={13}
          className={cn(
            "shrink-0 text-[color:var(--wz-color-text-tertiary)] transition-transform [transition-duration:var(--wz-duration-normal)] [transition-timing-function:var(--wz-ease-standard)] motion-reduce:transition-none",
            open && "rotate-180"
          )}
        />
      </button>
      <div
        id={contentId}
        aria-hidden={!open}
        inert={!open ? true : undefined}
        className={cn(
          "grid transition-[grid-template-rows,opacity] [transition-duration:var(--wz-duration-normal)] [transition-timing-function:var(--wz-ease-standard)] motion-reduce:transition-none",
          open ? "grid-rows-[1fr] opacity-100" : "pointer-events-none grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="min-h-0 overflow-hidden border-t border-[var(--wz-color-border-subtle)] px-4 py-4">
          <div className="space-y-3.5">
            {section.content.map((c, i) => (
              <ContentRenderer
                key={i}
                content={c}
                citations={citations}
                onView={onView}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function DiligenceReportCard({
  block,
  onViewSource,
}: DiligenceReportCardProps) {
  const { locale, t } = useLocale();
  const [openIds, setOpenIds] = useState<Set<string>>(
    () => new Set(block.sections.filter((s) => s.defaultOpen ?? true).map((s) => s.id))
  );
  const [tocCollapsed, setTocCollapsed] = useState(false);
  const [activeId, setActiveId] = useState<string>(
    () => block.sections[0]?.id ?? ""
  );
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const rootRef = useRef<HTMLDivElement>(null);

  const toggle = (id: string) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const jumpTo = (id: string) => {
    setActiveId(id);
    setOpenIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    // 等展开后再滚动
    requestAnimationFrame(() => {
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      sectionRefs.current[id]?.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "start",
      });
    });
  };

  /** 滚动联动：高亮当前滚动到的章节（监听抽屉滚动容器） */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    let scroller: HTMLElement | null = root.parentElement;
    while (scroller && scroller !== document.body) {
      const oy = getComputedStyle(scroller).overflowY;
      if (oy === "auto" || oy === "scroll") break;
      scroller = scroller.parentElement;
    }
    const target: HTMLElement | Window = scroller ?? window;

    const computeActive = () => {
      const containerTop = scroller ? scroller.getBoundingClientRect().top : 0;
      const threshold = 100;
      let current = block.sections[0]?.id ?? "";
      for (const s of block.sections) {
        const el = sectionRefs.current[s.id];
        if (!el) continue;
        const top = el.getBoundingClientRect().top - containerTop;
        if (top <= threshold) current = s.id;
      }
      setActiveId(current);
    };

    computeActive();
    target.addEventListener("scroll", computeActive, { passive: true });
    return () => target.removeEventListener("scroll", computeActive);
  }, [block.sections, openIds, tocCollapsed]);

  const allOpen = useMemo(
    () => block.sections.every((s) => openIds.has(s.id)),
    [block.sections, openIds]
  );

  const setAll = (open: boolean) =>
    setOpenIds(open ? new Set(block.sections.map((s) => s.id)) : new Set());
  return (
    <div ref={rootRef} className="space-y-4">
      {/* —— 结论概览 —— */}
      {!block.hideChrome && (
      <div className="rounded-[var(--wz-radius-lg)] border border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-subtle)] p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[length:var(--wz-font-size-caption)] font-semibold uppercase tracking-normal text-[color:var(--wz-color-text-secondary)]">
            {t("report.diligenceReview")}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <div className="rounded-[var(--wz-radius-lg)] border border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-surface)] px-3.5 py-2.5">
            <p className="text-[length:var(--wz-font-size-caption)] text-[color:var(--wz-color-text-tertiary)]">
              {t("report.finalRecommendation")}
            </p>
            <p className="mt-0.5 text-[length:var(--wz-font-size-subtitle)] font-semibold text-[var(--wz-color-status-danger)]">
              {block.verdict.recommendation}
            </p>
          </div>
          <div className="rounded-[var(--wz-radius-lg)] border border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-surface)] px-3.5 py-2.5">
            <p className="text-[length:var(--wz-font-size-caption)] text-[color:var(--wz-color-text-tertiary)]">
              {locale === "en-US" ? "Valuation View" : "估值判断"}
            </p>
            <p className="mt-0.5 text-[length:var(--wz-font-size-subtitle)] font-semibold text-[var(--wz-color-status-warning)]">
              {block.verdict.valuation}
            </p>
          </div>
        </div>
        <p className="mt-3 text-[length:var(--wz-font-size-body)] leading-relaxed text-[color:var(--wz-color-text-secondary)]">
          <RichText
            text={block.summary}
            citations={block.citations}
            onView={onViewSource}
          />
        </p>
      </div>
      )}

      {/* —— 关键指标可视化 —— */}
      {block.metrics.length > 0 && (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {block.metrics.map((m, i) => (
            <div
              key={i}
              className="rounded-[var(--wz-radius-lg)] border border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-surface)] px-3.5 py-3"
            >
              <p className="text-[length:var(--wz-font-size-caption)] font-medium leading-tight text-[color:var(--wz-color-text-tertiary)]">
                {m.label}
              </p>
              <p
                className={cn(
                  "mt-1 text-[length:var(--wz-font-size-title)] font-semibold tabular-nums leading-none",
                  toneText[m.tone ?? "neutral"]
                )}
              >
                {m.value}
              </p>
              {m.sub && (
                <p className="mt-1 text-[length:var(--wz-font-size-caption)] leading-tight text-[color:var(--wz-color-text-tertiary)]">
                  {m.sub}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* —— 正文 + 右侧快捷目录 ——
          目录始终在「右侧」，折叠态只是从 200px 列收缩成 36px 小窄列，
          位置保持原地，避免视觉跳转 */}
      <div
        className={cn(
          "lg:grid lg:gap-5",
          tocCollapsed
            ? "lg:grid-cols-[minmax(0,1fr)_36px]"
            : "lg:grid-cols-[minmax(0,1fr)_200px]"
        )}
      >
        {/* 正文章节 —— 永远在左侧 */}
        <div className="order-2 min-w-0 space-y-3 lg:order-1">
          {block.sections.map((s) => (
            <SectionBlock
              key={s.id}
              section={s}
              open={openIds.has(s.id)}
              onToggle={() => toggle(s.id)}
              citations={block.citations}
              onView={onViewSource}
              registerRef={(el) => {
                sectionRefs.current[s.id] = el;
              }}
            />
          ))}

          {block.citations.length > 0 && (
            <CitationsFooter citations={block.citations} onView={onViewSource} />
          )}
        </div>

        {/* 目录 —— 永远在右侧；折叠态只显示一颗 36×36 的图标按钮 */}
        <nav className="order-1 mb-4 lg:order-2 lg:mb-0">
          <div className="lg:sticky lg:top-2">
            {tocCollapsed ? (
              <button
                type="button"
                onClick={() => setTocCollapsed(false)}
                title={locale === "en-US" ? "Expand contents" : "展开目录"}
                aria-label={locale === "en-US" ? "Expand contents" : "展开目录"}
                className="flex h-9 w-9 items-center justify-center rounded-[var(--wz-radius-lg)] border border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-surface)] text-[color:var(--wz-color-text-secondary)] shadow-[var(--wz-shadow-sm)] transition-[background-color,border-color,color,box-shadow] [transition-duration:var(--wz-duration-fast)] [transition-timing-function:var(--wz-ease-standard)] hover:border-[var(--wz-color-border-strong)] hover:bg-[var(--wz-color-bg-subtle)] hover:text-[var(--wz-color-text-primary)] hover:shadow-[var(--wz-shadow-md)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--wz-color-focus-ring)]"
              >
                <AppIcon icon={IconChecklist} size={14} />
              </button>
            ) : (
              <>
                <div className="flex items-center justify-between px-1 pb-2">
                  <p className="text-[length:var(--wz-font-size-caption)] font-semibold uppercase tracking-normal text-[color:var(--wz-color-text-tertiary)]">
                    {locale === "en-US" ? "Contents" : "目录"}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAll(!allOpen)}
                      className="rounded-[var(--wz-radius-sm)] px-1 py-0.5 text-[length:var(--wz-font-size-caption)] font-medium text-[color:var(--wz-color-text-tertiary)] transition-colors [transition-duration:var(--wz-duration-fast)] [transition-timing-function:var(--wz-ease-standard)] hover:text-[var(--wz-color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--wz-color-focus-ring)]"
                    >
                      {allOpen
                        ? locale === "en-US" ? "Collapse all" : "全部折叠"
                        : locale === "en-US" ? "Expand all" : "全部展开"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setTocCollapsed(true)}
                      title={locale === "en-US" ? "Collapse contents" : "收起目录"}
                      aria-label={locale === "en-US" ? "Collapse contents" : "收起目录"}
                      className="flex h-5 w-5 items-center justify-center rounded-[var(--wz-radius-sm)] text-[color:var(--wz-color-text-tertiary)] transition-colors [transition-duration:var(--wz-duration-fast)] [transition-timing-function:var(--wz-ease-standard)] hover:bg-[var(--wz-color-bg-subtle)] hover:text-[var(--wz-color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--wz-color-focus-ring)]"
                    >
                      <AppIcon icon={IconChevronRight} size={12} />
                    </button>
                  </div>
                </div>
                <ul className="space-y-0.5">
                  {block.sections.map((s) => {
                    const active = activeId === s.id;
                    return (
                      <li key={s.id}>
                        <button
                          type="button"
                          onClick={() => jumpTo(s.id)}
                          aria-current={active ? "true" : undefined}
                          className={cn(
                            "group flex w-full items-center rounded-[var(--wz-radius-lg)] px-2 py-1.5 text-left transition-colors [transition-duration:var(--wz-duration-fast)] [transition-timing-function:var(--wz-ease-standard)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--wz-color-focus-ring)]",
                            active
                              ? "bg-[var(--wz-color-status-info-subtle)]"
                              : "hover:bg-[var(--wz-color-bg-subtle)]"
                          )}
                        >
                          <span
                            className={cn(
                              "min-w-0 flex-1 truncate text-[length:var(--wz-font-size-body)] leading-snug",
                              active
                                ? "font-semibold text-[var(--wz-color-text-primary)]"
                                : "text-[color:var(--wz-color-text-secondary)] group-hover:text-[var(--wz-color-text-primary)]"
                            )}
                          >
                            {s.title}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </div>
        </nav>
      </div>
    </div>
  );
}
