import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { AppIcon } from "@/src/components/ui/app-icon";
import { IconCheck, IconGlobe } from "@/src/lib/icons";
import { useLocale, type Locale } from "@/src/lib/i18n";
import { cn } from "@/src/lib/utils";

interface LanguageSwitcherProps {
  collapsed?: boolean;
  inverted?: boolean;
  /** Closes a portalled menu when this visual instance is no longer active. */
  inactive?: boolean;
  placement?: "above" | "below";
}

export function LanguageSwitcher({
  collapsed = false,
  inverted = false,
  inactive = false,
  placement = "above",
}: LanguageSwitcherProps) {
  const { locale, setLocale, t } = useLocale();
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ left: 8, top: 8 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (inactive) {
      setOpen(false);
    }
  }, [inactive]);

  useEffect(() => {
    if (!open || !collapsed) return;

    const updatePosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const width = 168;
      setMenuPosition({
        left: Math.min(
          Math.max(8, rect.left),
          Math.max(8, window.innerWidth - width - 8)
        ),
        top:
          placement === "below"
            ? Math.min(window.innerHeight - 96, rect.bottom + 8)
            : Math.max(8, rect.top - 88),
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [collapsed, open, placement]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        !triggerRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };

    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target as Node;
      if (
        !triggerRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        window.requestAnimationFrame(() => triggerRef.current?.focus());
        return;
      }
      if (event.key === "Tab") {
        setOpen(false);
        triggerRef.current?.focus({ preventScroll: true });
        return;
      }
      if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
        return;
      }
      const items = Array.from(
        menuRef.current?.querySelectorAll<HTMLButtonElement>(
          '[role="menuitemradio"]'
        ) ?? []
      );
      if (items.length === 0) return;
      event.preventDefault();
      const currentIndex = items.indexOf(
        document.activeElement as HTMLButtonElement
      );
      const nextIndex =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? items.length - 1
            : event.key === "ArrowDown"
              ? (currentIndex + 1 + items.length) % items.length
              : (currentIndex - 1 + items.length) % items.length;
      items[nextIndex]?.focus();
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("keydown", handleKeyDown);
    const frame = window.requestAnimationFrame(() => {
      menuRef.current
        ?.querySelector<HTMLButtonElement>(
          '[role="menuitemradio"][aria-checked="true"]'
        )
        ?.focus();
    });

    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const languageName =
    locale === "zh-CN" ? t("language.zhCN") : t("language.enUS");
  const label = `${t("language.switch")} · ${t("language.current", {
    language: languageName,
  })}`;
  const options: Array<{ value: Locale; label: string }> = [
    { value: "zh-CN", label: t("language.zhCN") },
    { value: "en-US", label: t("language.enUS") },
  ];
  const menu = open ? (
    <div
      ref={menuRef}
      id={menuId}
      data-language-menu
      role="menu"
      aria-label={t("language.menu")}
      style={collapsed ? menuPosition : undefined}
      className={cn(
        "z-[var(--wz-z-dropdown)] w-[168px] overflow-hidden rounded-[var(--wz-radius-md)] border border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-elevated)] p-1 shadow-[var(--wz-shadow-md)]",
        collapsed
          ? "fixed"
          : placement === "below"
            ? "absolute right-0 top-[calc(100%+8px)]"
            : "absolute bottom-[calc(100%+8px)] right-0"
      )}
    >
      {options.map((option) => {
        const selected = option.value === locale;
        return (
          <button
            key={option.value}
            type="button"
            role="menuitemradio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => {
              setLocale(option.value);
              setOpen(false);
              window.requestAnimationFrame(() => triggerRef.current?.focus());
            }}
            className={cn(
              "flex min-h-9 w-full items-center justify-between gap-3 rounded-[var(--wz-radius-sm)] px-2.5 py-2 text-left text-[length:var(--wz-font-size-sm)] outline-none transition-colors duration-[var(--wz-duration-fast)] hover:bg-[var(--wz-color-bg-subtle)] focus-visible:bg-[var(--wz-color-bg-subtle)] motion-reduce:transition-none",
              selected
                ? "font-medium text-[var(--wz-color-text-primary)]"
                : "text-[color:var(--wz-color-text-secondary)]"
            )}
          >
            <span>{option.label}</span>
            {selected && (
              <AppIcon
                icon={IconCheck}
                size={12}
                className="shrink-0 text-[var(--wz-color-text-primary)]"
              />
            )}
          </button>
        );
      })}
    </div>
  ) : null;

  return (
    <span className="relative inline-flex">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className={cn(
          "inline-flex items-center justify-center rounded-[var(--wz-radius-md)] outline-none transition-[background-color,color,box-shadow] duration-[var(--wz-duration-fast)] ease-[var(--wz-ease-standard)] focus-visible:shadow-[0_0_0_3px_var(--wz-color-focus-ring)] motion-reduce:transition-none",
          collapsed ? "h-9 w-9" : "h-8 w-8",
          inverted
            ? "border border-white/[0.12] bg-black/10 text-white/65 backdrop-blur-sm hover:bg-white/10 hover:text-white focus-visible:shadow-[0_0_0_3px_rgba(255,255,255,0.22)]"
            : "text-[color:var(--wz-color-text-secondary)] hover:bg-[var(--wz-color-bg-subtle)] hover:text-[var(--wz-color-text-primary)]",
          open &&
            (inverted
              ? "bg-white/12 text-white"
              : "bg-[var(--wz-color-bg-subtle)] text-[var(--wz-color-text-primary)]")
        )}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        title={label}
      >
        <AppIcon icon={IconGlobe} size={collapsed ? 18 : 13} />
      </button>

      {collapsed && menu ? createPortal(menu, document.body) : menu}
    </span>
  );
}
