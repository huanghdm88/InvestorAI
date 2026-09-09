import { useRef, type ReactNode } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);
export function getDigitRoll(previous: number, digit: number, direction: number) {
  const start = 10 + previous;
  return { start, end: start + (direction >= 0 ? (digit - previous + 10) % 10 : -((previous - digit + 10) % 10)) };
}

function RollingDigit({ digit, direction, index }: { digit: number; direction: number; index: number }) {
  const track = useRef<HTMLSpanElement>(null);
  const previous = useRef(digit);
  const position = useRef(10 + digit);
  useGSAP(() => {
    const last = previous.current;
    previous.current = digit;
    const mm = gsap.matchMedia();
    mm.add({ reduce: "(prefers-reduced-motion: reduce)", motion: "(prefers-reduced-motion: no-preference)" }, (ctx) => {
      if (ctx.conditions?.reduce || last === digit) {
        position.current = 10 + digit;
        gsap.set(track.current, { yPercent: 0, y: `${-position.current * 1.2}em` });
        return;
      }
      // Preserve the visible fractional row on interruption, then normalize into the
      // duplicated middle decade. Rapid direction changes never jump to an old target.
      const { start, end } = getDigitRoll(((position.current % 10) + 10) % 10, digit, direction);
      const progress = { row: start };
      gsap.set(track.current, { yPercent: 0, y: `${-start * 1.2}em` });
      const setY = gsap.quickSetter(track.current, "y", "em");
      gsap.to(progress, { row: end, duration: 0.78, delay: index * 0.035, ease: "power3.inOut", onUpdate: () => { position.current = progress.row; setY(-progress.row * 1.2); } });
    });
    return () => mm.revert();
  }, { scope: track, dependencies: [digit], revertOnUpdate: true });
  return <span className="decision-digit"><span ref={track} className="decision-digit-track" style={{ transform: `translateY(-${(10 + digit) * 1.2}em)` }}>{Array.from({ length: 30 }, (_, n) => <span key={n}>{n % 10}</span>)}</span></span>;
}

/** The rolling layer is decorative; assistive technology receives only the final amount. */
export function RollingAmount({ value }: { value: string | null }) {
  const root = useRef<HTMLSpanElement>(null);
  const previous = useRef(value);
  const oldNumber = Number(previous.current?.match(/[\d.]+/)?.[0]);
  const match = value?.match(/^(.*?)(\d+(?:\.\d+)?)(.*)$/);
  const direction = match && Number(match[2]) < oldNumber ? -1 : 1;
  useGSAP(() => {
    const wasMissing = !previous.current;
    const changed = previous.current !== value;
    previous.current = value;
    if (!changed || (!wasMissing && value)) return;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => { gsap.fromTo(root.current, { opacity: 0, y: 9 }, { opacity: 1, y: 0, duration: 0.38, ease: "power2.out" }); });
    return () => mm.revert();
  }, { scope: root, dependencies: [value], revertOnUpdate: true });
  return <span ref={root} className="decision-amount"><span className="sr-only">{value ?? "待确认"}</span><span aria-hidden="true">{match ? <>{match[1]}<span className="decision-number">{[...match[2]].map((char, index) => char === "." ? <span key={`dot-${index}`}>.</span> : <RollingDigit key={`digit-${index}`} digit={Number(char)} direction={direction} index={index} />)}</span>{match[3]}</> : value ?? "待确认"}</span></span>;
}

/** Never expose an empty typing frame or split a combined character / emoji. */
export function getTypewriterFrames(text: string): string[] {
  let prefix = "";
  const frames = Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text), ({ segment }) => (prefix += segment));
  return frames.length ? frames : [""];
}

/** Keep the paragraph mounted and sized to the full copy; only its decorative text types. */
export function StageTypewriter({ text, stage, projectId }: { text: string; stage: string; projectId: string }) {
  const root = useRef<HTMLParagraphElement>(null);
  const visible = useRef<HTMLSpanElement>(null);
  const previous = useRef({ text, stage, projectId });
  useGSAP(() => {
    const element = visible.current;
    if (!element) return;
    const last = previous.current;
    previous.current = { text, stage, projectId };
    const changedStage = last.projectId === projectId && last.stage !== stage && last.text !== text;
    let completed = false;
    const finish = () => { completed = true; element.textContent = text; };
    // Opening a project or changing language is not a stage transition.
    if (!changedStage) { finish(); return; }
    const frames = getTypewriterFrames(text);
    const mm = gsap.matchMedia();
    mm.add({ reduce: "(prefers-reduced-motion: reduce)", motion: "(prefers-reduced-motion: no-preference)" }, (ctx) => {
      if (ctx.conditions?.reduce || completed) { finish(); return; }
      element.textContent = frames[0];
      const cursor = { frame: 0 };
      let shown = 0;
      gsap.to(cursor, { frame: frames.length - 1, duration: Math.min(0.85, Math.max(0.35, frames.length * 0.016)), ease: "none",
        onUpdate: () => {
          const frame = Math.floor(cursor.frame);
          if (frame !== shown) { element.textContent = frames[frame]; shown = frame; }
        }, onComplete: finish,
      });
    });
    return () => { mm.revert(); finish(); };
  }, { scope: root, dependencies: [text, stage, projectId], revertOnUpdate: true });
  return <p ref={root} className="ic-agenda-copy"><span className="sr-only">{text}</span><span className="ic-agenda-layout" aria-hidden="true">{text}</span><span ref={visible} className="ic-agenda-typed" aria-hidden="true">{text}</span></p>;
}

export function getStageMotionDirection(previous: string, next: string) {
  const stages = ["contact", "intake", "approved", "diligence", "decided", "signed", "funded", "post"];
  const from = stages.indexOf(previous);
  const to = stages.indexOf(next);
  return from < 0 || to < 0 ? 0 : Math.sign(to - from);
}

export function createStageReveal(targets: gsap.TweenTarget, direction: number, distance = 14) {
  // Keep the new data readable throughout the update, in either direction.
  return gsap.fromTo(targets, { autoAlpha: 0.45, y: direction * distance }, {
    autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.035, ease: "power2.out",
    clearProps: "opacity,visibility,transform",
  });
}

export function StageMotion({ stage, projectId, children, className = "", distance = 14 }: {
  stage: string; projectId: string; children: ReactNode; className?: string; distance?: number;
}) {
  const root = useRef<HTMLDivElement>(null);
  const previousHeight = useRef<number | null>(null);
  const previousStage = useRef({ stage, projectId });
  useGSAP(() => {
    const element = root.current;
    if (!element) return;
    const direction = getStageMotionDirection(previousStage.current.stage, stage);
    const changed = previousStage.current.projectId === projectId && direction !== 0;
    const oldHeight = previousHeight.current;
    previousStage.current = { stage, projectId };
    const height = element.offsetHeight;
    previousHeight.current = height;
    const mm = gsap.matchMedia();
    if (changed) mm.add("(prefers-reduced-motion: no-preference)", () => {
      // Content moves as a single group; only the outer height needs layout interpolation.
      createStageReveal(element.children, direction, distance);
      if (oldHeight !== null && Math.abs(oldHeight - height) > 1) gsap.fromTo(element, { height: oldHeight, overflow: "hidden" }, { height, duration: 0.5, ease: "power2.inOut", clearProps: "height,overflow", onUpdate: () => { previousHeight.current = parseFloat(element.style.height) || height; } });
    });
    const observer = new ResizeObserver(() => { if (!gsap.isTweening(element)) previousHeight.current = element.offsetHeight; });
    observer.observe(element);
    return () => { observer.disconnect(); mm.revert(); };
  }, { scope: root, dependencies: [stage, projectId], revertOnUpdate: true });
  return <div ref={root} className={`decision-stage-body ${className}`}>{children}</div>;
}
