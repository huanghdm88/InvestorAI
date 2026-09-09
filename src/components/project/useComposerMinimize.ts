import { useRef, useState, type RefObject } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

// One reversible timeline keeps rapid toggles at their current visual position.
export function createComposerMinimizeTween(target: gsap.TweenTarget, onMinimized: () => void, onRestored: () => void, launcher?: HTMLElement | null) {
  const animation = gsap.timeline({ paused: true, onComplete: onMinimized, onReverseComplete: onRestored });
  animation.fromTo(target,
    { y: 0, scaleX: 1, scaleY: 1, opacity: 1 },
    { y: 0, scaleX: () => launcher ? Math.min(1, launcher.offsetWidth / Math.max(1, (target as HTMLElement).offsetWidth)) : 0.24,
      scaleY: () => launcher ? Math.min(1, launcher.offsetHeight / Math.max(1, (target as HTMLElement).offsetHeight)) : 0.35,
      opacity: 0, duration: 0.32, ease: "power2.inOut" }, 0,
  );
  if (launcher) animation.fromTo(launcher, { opacity: 0, y: 10, scale: 0.88 },
    { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: "power2.out" }, 0.12);
  return animation;
}

export function driveComposerMinimize(animation: gsap.core.Timeline, open: boolean, immediate = false) {
  const destination = open ? 0 : 1;
  if (immediate || animation.progress() === destination) {
    // A second click can arrive before the first tween's next tick.
    animation.pause().progress(destination);
    return false;
  }
  if (open) animation.reverse();
  else animation.play();
  return true;
}

export function useComposerMinimize(open: boolean, enabled: boolean, surface: RefObject<HTMLDivElement | null>, launcher: RefObject<HTMLDivElement | null>) {
  const [present, setPresent] = useState(open && enabled);
  const openRef = useRef(open);
  const reducedMotion = useRef(false);
  const tween = useRef<gsap.core.Timeline | null>(null);

  useGSAP(() => {
    const element = surface.current;
    if (!enabled || !element) {
      setPresent(false);
      return;
    }
    openRef.current = open;
    const settle = () => { element.style.willChange = ""; if (launcher.current) launcher.current.style.willChange = ""; };
    // Opacity is visual only: the outer wrapper owns hidden/inert and focus.
    const animation = createComposerMinimizeTween(element, () => {
      if (!openRef.current) setPresent(false);
      settle();
    }, settle, launcher.current);
    tween.current = animation;
    const observer = new ResizeObserver(() => {
      if (!element.offsetWidth) return;
      const progress = animation.progress();
      animation.invalidate().progress(progress, true);
    });
    observer.observe(element);
    const media = gsap.matchMedia();
    media.add({ reduce: "(prefers-reduced-motion: reduce)", motion: "(prefers-reduced-motion: no-preference)" }, (context) => {
      reducedMotion.current = Boolean(context.conditions?.reduce);
      animation.pause().progress(openRef.current ? 0 : 1);
      setPresent(openRef.current);
      settle();
    });
    return () => {
      media.revert();
      observer.disconnect();
      animation.kill();
      tween.current = null;
      settle();
    };
  }, { scope: surface, dependencies: [enabled], revertOnUpdate: true });

  useGSAP(() => {
    openRef.current = open;
    const animation = tween.current;
    if (!enabled || !animation) return;
    if (open) setPresent(true);
    const animating = driveComposerMinimize(animation, open, reducedMotion.current);
    if (!animating) setPresent(open);
    if (surface.current) surface.current.style.willChange = animating ? "transform, opacity" : "";
    if (launcher.current) launcher.current.style.willChange = animating ? "transform, opacity" : "";
  }, { scope: surface, dependencies: [open, enabled] });

  return enabled && (open || present);
}
