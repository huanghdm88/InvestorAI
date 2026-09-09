import { useEffect, useId, useRef, useState } from "react";

import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Textarea } from "@/src/components/ui/textarea";
import { KnowledgeBase } from "@/src/components/project/KnowledgeBase";
import { AppIcon } from "@/src/components/ui/app-icon";
import { industryOptions } from "@/src/data/industries";
import {
  IconArrowRight,
  IconBuilding,
  IconCheck,
  IconChevronDown,
  IconCompass,
  IconFolderPlus,
  IconShieldAlert,
  IconWand,
} from "@/src/lib/icons";
import { cn, uid } from "@/src/lib/utils";
import { translateIndustry, useLocale } from "@/src/lib/i18n";
import type { InvestmentStage, KnowledgeFile, Project, RiskTolerance } from "@/src/types";

interface ProjectWizardProps {
  onCreate: (project: Project) => void;
  onCancel: () => void;
  initialStep?: 1 | 2;
}

const stages: Array<{ value: InvestmentStage }> = [
  { value: "early-growth" },
  { value: "late-pre-ipo" },
];

const risks: Array<{ value: RiskTolerance }> = [
  { value: "R1" },
  { value: "R2" },
  { value: "R3" },
];


export function ProjectWizard({ onCreate, onCancel, initialStep = 1 }: ProjectWizardProps) {
  const { t } = useLocale();
  const [step, setStep] = useState<1 | 2>(initialStep);
  const [project, setProject] = useState<Project>({
    id: uid("proj"),
    name: "",
    industry: "",
    stage: "early-growth",
    riskTolerance: "R2",
    customInstruction: "",
    status: "draft",
    files: [],
    updatedAt: new Date().toISOString(),
  });

  const update = (patch: Partial<Project>) =>
    setProject((p) => ({ ...p, ...patch, updatedAt: new Date().toISOString() }));
  const stageLabel = (value: InvestmentStage) =>
    value === "early-growth" ? t("project.stageEarly") : t("project.stageLate");
  const stageSub = (value: InvestmentStage) =>
    value === "early-growth" ? t("wizard.stageEarlySub") : t("wizard.stageLateSub");
  const riskLabel = (value: RiskTolerance) =>
    value === "R1"
      ? t("company.riskR1")
      : value === "R2"
        ? t("company.riskR2")
        : t("company.riskR3");
  const riskTag = (value: RiskTolerance) =>
    value === "R1"
      ? t("wizard.riskR1Tag")
      : value === "R2"
        ? t("wizard.riskR2Tag")
        : t("wizard.riskR3Tag");

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--wz-color-bg-canvas)] text-[var(--wz-color-text-primary)]">
      <header className="relative flex shrink-0 flex-wrap items-center border-b border-[var(--wz-color-border-subtle)] bg-[var(--wz-color-bg-surface)] px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-[var(--wz-control-height-md)] w-[var(--wz-control-height-md)] items-center justify-center rounded-[var(--wz-radius-lg)] bg-[var(--wz-color-action-primary)] text-[var(--wz-color-text-inverse)]">
            <AppIcon icon={IconFolderPlus} size={15} />
          </div>
          <div>
            <h1
              id="project-wizard-title"
              autoFocus
              tabIndex={-1}
              className="text-[length:var(--wz-font-size-section)] font-semibold leading-[var(--wz-line-height-tight)] text-[var(--wz-color-text-primary)] outline-none"
            >
              {t("wizard.title")}
            </h1>
            <p className="mt-0.5 text-[length:var(--wz-font-size-caption)] leading-[var(--wz-line-height-tight)] text-[color:var(--wz-color-text-secondary)]">
              {t("wizard.subtitle")}
            </p>
          </div>
        </div>
        <ol
          className="pointer-events-none mt-3 flex w-full items-center justify-center gap-2 text-[length:var(--wz-font-size-xs)] sm:absolute sm:left-1/2 sm:top-1/2 sm:mt-0 sm:w-auto sm:-translate-x-1/2 sm:-translate-y-1/2"
          aria-label={t("wizard.progress")}
        >
          <StepDot state={step === 1 ? "current" : "complete"} label={t("wizard.basicInfo")} />
          <li aria-hidden="true" className="h-px w-8 bg-[var(--wz-color-border-default)]" />
          <StepDot state={step === 2 ? "current" : "upcoming"} label={t("wizard.knowledgeBase")} />
        </ol>
      </header>

      <section
        aria-labelledby="project-wizard-title"
        className="thin-scroll min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6"
      >
        {step === 1 ? (
          <form
            id="project-basics-form"
            className="mx-auto max-w-2xl space-y-[var(--wz-space-module)]"
            onSubmit={(event) => {
              event.preventDefault();
              if (!project.industry) {
                document.getElementById("project-industry")?.focus();
                return;
              }
              setStep(2);
            }}
          >
            <Section icon={<AppIcon icon={IconBuilding} size={18} />} title={t("wizard.naming")}>
              <div className="grid grid-cols-1 gap-[var(--wz-space-element)] sm:grid-cols-2">
                <div className="space-y-[var(--wz-space-compact)]">
                  <label
                    htmlFor="project-name"
                    className="text-[length:var(--wz-font-size-body)] font-medium leading-[var(--wz-line-height-tight)] text-[var(--wz-color-text-primary)]"
                  >
                    {t("wizard.projectName")}
                  </label>
                  <Input
                    id="project-name"
                    name="project-name"
                    required
                    placeholder={t("wizard.projectNamePlaceholder")}
                    value={project.name}
                    onChange={(e) => update({ name: e.target.value })}
                  />
                </div>
                <div className="space-y-[var(--wz-space-compact)]">
                  <label
                    htmlFor="project-industry"
                    className="text-[length:var(--wz-font-size-body)] font-medium leading-[var(--wz-line-height-tight)] text-[var(--wz-color-text-primary)]"
                  >
                    {t("wizard.industry")}
                  </label>
                  <IndustrySelect
                    value={project.industry}
                    onChange={(industry) => update({ industry })}
                  />
                </div>
              </div>
            </Section>

            <Section icon={<AppIcon icon={IconCompass} size={18} />} title={t("wizard.investmentStage")}>
              <fieldset>
                <legend className="sr-only">{t("wizard.selectStage")}</legend>
                <div className="grid grid-cols-1 gap-[var(--wz-space-element)] sm:grid-cols-2">
                  {stages.map((s) => {
                    const active = project.stage === s.value;
                    return (
                      <label key={s.value} className="block cursor-pointer">
                        <input
                          type="radio"
                          name="investment-stage"
                          value={s.value}
                          checked={active}
                          onChange={() => update({ stage: s.value })}
                          className="peer sr-only"
                        />
                        <span
                          className={cn(
                            "block min-h-[var(--wz-control-height-lg)] rounded-[var(--wz-radius-lg)] border px-[var(--wz-space-3)] py-[var(--wz-space-3)] text-left outline-none transition-[background-color,border-color,color,box-shadow] duration-[var(--wz-duration-fast)] ease-[var(--wz-ease-standard)] peer-focus-visible:shadow-[0_0_0_3px_var(--wz-color-focus-ring)]",
                            active
                              ? "border-[var(--wz-color-action-primary)] bg-[var(--wz-color-action-primary)] text-[var(--wz-color-text-inverse)]"
                              : "border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-surface)] text-[var(--wz-color-text-primary)] hover:border-[var(--wz-color-border-strong)]"
                          )}
                        >
                          <span className="block text-[length:var(--wz-font-size-body)] font-semibold leading-[var(--wz-line-height-tight)]">
                            {stageLabel(s.value)}
                          </span>
                          <span
                            className={cn(
                              "mt-1 block text-[length:var(--wz-font-size-caption)] leading-[var(--wz-line-height-tight)]",
                              active
                                ? "text-[color-mix(in_srgb,var(--wz-color-text-inverse)_72%,transparent)]"
                                : "text-[color:var(--wz-color-text-secondary)]"
                            )}
                          >
                            {stageSub(s.value)}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            </Section>

            <Section icon={<AppIcon icon={IconShieldAlert} size={18} />} title={t("wizard.riskTolerance")}>
              <fieldset>
                <legend className="sr-only">{t("wizard.selectRisk")}</legend>
                <div className="grid grid-cols-1 gap-[var(--wz-space-element)] sm:grid-cols-3">
                  {risks.map((r) => {
                    const active = project.riskTolerance === r.value;
                    return (
                      <label key={r.value} className="block cursor-pointer">
                        <input
                          type="radio"
                          name="risk-tolerance"
                          value={r.value}
                          checked={active}
                          onChange={() => update({ riskTolerance: r.value })}
                          className="peer sr-only"
                        />
                        <span
                          className={cn(
                            "flex min-h-[88px] flex-col items-start gap-[var(--wz-space-compact)] rounded-[var(--wz-radius-lg)] border px-[var(--wz-space-3)] py-[var(--wz-space-3)] text-left outline-none transition-[background-color,border-color,color,box-shadow] duration-[var(--wz-duration-fast)] ease-[var(--wz-ease-standard)] peer-focus-visible:shadow-[0_0_0_3px_var(--wz-color-focus-ring)]",
                            active
                              ? "border-[var(--wz-color-action-primary)] bg-[var(--wz-color-action-primary)] text-[var(--wz-color-text-inverse)]"
                              : "border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-surface)] text-[var(--wz-color-text-primary)] hover:border-[var(--wz-color-border-strong)]"
                          )}
                        >
                          <span className="text-[length:var(--wz-font-size-tag)] font-medium leading-[var(--wz-line-height-tag)]">
                            {r.value}
                          </span>
                          <span className="text-[length:var(--wz-font-size-body)] font-semibold leading-[var(--wz-line-height-tight)]">
                            {riskLabel(r.value)}
                          </span>
                          <span
                            className={cn(
                              "rounded-[var(--wz-radius-sm)] px-1.5 py-0.5 text-[length:var(--wz-font-size-tag)] leading-[var(--wz-line-height-tag)]",
                              active
                                ? "bg-[color-mix(in_srgb,var(--wz-color-text-inverse)_14%,transparent)] text-[var(--wz-color-text-inverse)]"
                                : "bg-[var(--wz-color-bg-subtle)] text-[color:var(--wz-color-text-secondary)]"
                            )}
                          >
                            {riskTag(r.value)}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            </Section>

            <Section icon={<AppIcon icon={IconWand} size={18} />} title={t("wizard.customTitle")}>
              <label htmlFor="project-custom-instruction" className="sr-only">
                {t("wizard.customLabel")}
              </label>
              <Textarea
                id="project-custom-instruction"
                name="project-custom-instruction"
                placeholder={t("wizard.customPlaceholder")}
                value={project.customInstruction}
                onChange={(e) => update({ customInstruction: e.target.value })}
                className="min-h-[90px] text-[length:var(--wz-font-size-body)] leading-[var(--wz-line-height-normal)]"
              />
              <p className="text-[length:var(--wz-font-size-caption)] leading-[var(--wz-line-height-tight)] text-[color:var(--wz-color-text-secondary)]">
                {t("wizard.customHint")}
              </p>
            </Section>
          </form>
        ) : (
          <div className="mx-auto max-w-3xl space-y-2">
            <h2 className="text-[length:var(--wz-font-size-lg)] font-semibold text-[var(--wz-color-text-primary)]">
              {t("wizard.uploadTitle")}
            </h2>
            <p className="text-[length:var(--wz-font-size-sm)] leading-[var(--wz-line-height-normal)] text-[color:var(--wz-color-text-secondary)]">
              {t("wizard.uploadHint")}
            </p>
            <KnowledgeBase
              project={project}
              onUpdateFiles={(files: KnowledgeFile[]) => update({ files })}
            />
          </div>
        )}
      </section>

      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-[var(--wz-color-border-subtle)] bg-[var(--wz-color-bg-surface)] px-4 py-3 sm:px-6">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
        <div className="flex items-center gap-2">
          {step === 2 && (
            <Button variant="outline" size="sm" onClick={() => setStep(1)}>
              {t("wizard.previous")}
            </Button>
          )}
          {step === 1 ? (
            <Button
              type="submit"
              form="project-basics-form"
              variant="default"
              size="sm"
            >
              {t("wizard.next")}
              <AppIcon icon={IconArrowRight} size={12} />
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={() =>
                onCreate({
                  ...project,
                  status: project.files.length > 0 ? "parsing" : "draft",
                })
              }
            >
              <AppIcon icon={IconFolderPlus} size={12} />
              {t("wizard.create")}
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}

function IndustrySelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { locale, t } = useLocale();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

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
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        window.requestAnimationFrame(() => triggerRef.current?.focus());
        return;
      }
      if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
      const options = Array.from(
        menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? []
      );
      if (options.length === 0) return;
      event.preventDefault();
      const currentIndex = options.indexOf(document.activeElement as HTMLButtonElement);
      const nextIndex =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? options.length - 1
            : event.key === "ArrowDown"
              ? (currentIndex + 1 + options.length) % options.length
              : (currentIndex - 1 + options.length) % options.length;
      options[nextIndex]?.focus();
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    const frame = window.requestAnimationFrame(() => {
      const selected = menuRef.current?.querySelector<HTMLButtonElement>(
        '[role="option"][aria-selected="true"]'
      );
      (selected ?? menuRef.current?.querySelector<HTMLButtonElement>('[role="option"]'))?.focus();
    });

    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const selectValue = (nextValue: string) => {
    onChange(nextValue);
    setOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  };

  return (
    <div className="relative">
      <input type="hidden" name="project-industry" value={value} />
      <button
        ref={triggerRef}
        id="project-industry"
        type="button"
        role="combobox"
        aria-controls={listboxId}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-required="true"
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className={cn(
          "flex h-[var(--wz-control-height-md)] w-full items-center justify-between gap-3 rounded-[var(--wz-radius-md)] border border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-surface)] px-[var(--wz-control-padding-inline)] text-left text-[length:var(--wz-font-size-md)] outline-none transition-[border-color,box-shadow] duration-[var(--wz-duration-fast)] ease-[var(--wz-ease-standard)] hover:border-[var(--wz-color-border-strong)] focus-visible:border-[var(--wz-color-border-focus)] focus-visible:shadow-[0_0_0_3px_var(--wz-color-focus-ring)]",
          value
            ? "text-[var(--wz-color-text-primary)]"
            : "text-[color:var(--wz-color-text-tertiary)]"
        )}
      >
        <span className="min-w-0 truncate">
          {value ? translateIndustry(value, locale) : t("company.industryPlaceholder")}
        </span>
        <AppIcon
          icon={IconChevronDown}
          size={12}
          className={cn(
            "shrink-0 text-[color:var(--wz-color-text-tertiary)] transition-transform duration-[var(--wz-duration-fast)]",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div
          ref={menuRef}
          id={listboxId}
          role="listbox"
          aria-label={t("wizard.industry")}
          className="absolute left-0 top-[calc(100%+6px)] z-[var(--wz-z-dropdown)] max-h-64 w-full overflow-y-auto rounded-[var(--wz-radius-md)] border border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-elevated)] p-1 shadow-[var(--wz-shadow-md)]"
        >
          {industryOptions.map((option) => {
            const selected = option === value;
            return (
              <button
                key={option}
                type="button"
                role="option"
                aria-selected={selected}
                tabIndex={selected || (!value && option === industryOptions[0]) ? 0 : -1}
                onClick={() => selectValue(option)}
                className={cn(
                  "flex min-h-9 w-full items-center justify-between gap-3 rounded-[var(--wz-radius-sm)] px-2.5 py-2 text-left text-[length:var(--wz-font-size-sm)] outline-none transition-colors duration-[var(--wz-duration-fast)] hover:bg-[var(--wz-color-bg-subtle)] focus-visible:bg-[var(--wz-color-bg-subtle)] motion-reduce:transition-none",
                  selected
                    ? "font-medium text-[var(--wz-color-text-primary)]"
                    : "text-[color:var(--wz-color-text-secondary)]"
                )}
              >
                <span>{translateIndustry(option, locale)}</span>
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
      )}
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-[var(--wz-color-border-subtle)] pb-[var(--wz-space-module)] last:border-b-0">
      <h2 className="mb-[var(--wz-space-element)] flex items-center gap-[var(--wz-space-compact)] text-[length:var(--wz-font-size-subtitle)] font-semibold leading-[var(--wz-line-height-tight)] text-[var(--wz-color-text-primary)]">
        {icon}
        {title}
      </h2>
      <div className="space-y-[var(--wz-space-compact)]">{children}</div>
    </section>
  );
}

function StepDot({
  state,
  label,
}: {
  state: "complete" | "current" | "upcoming";
  label: string;
}) {
  return (
    <li
      aria-current={state === "current" ? "step" : undefined}
      className={cn(
        "inline-flex items-center gap-1 rounded-[var(--wz-radius-sm)] px-2 py-1 text-[length:var(--wz-font-size-tag)] leading-[var(--wz-line-height-tag)] font-medium",
        state === "current" &&
          "bg-[var(--wz-color-action-primary)] text-[var(--wz-color-text-inverse)]",
        state === "complete" &&
          "bg-[var(--wz-color-status-info-subtle)] text-[var(--wz-color-status-info)]",
        state === "upcoming" &&
          "bg-[var(--wz-color-bg-subtle)] text-[color:var(--wz-color-text-tertiary)]"
      )}
    >
      <span className="h-1.5 w-1.5 rounded-[var(--wz-radius-full)] bg-current" />
      {label}
    </li>
  );
}
