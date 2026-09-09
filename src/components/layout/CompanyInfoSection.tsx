import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useEffect, useId, useState } from "react";

import { AppIcon } from "@/src/components/ui/app-icon";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Textarea } from "@/src/components/ui/textarea";
import { industryOptions } from "@/src/data/industries";
import {
  IconAuto,
  IconClose,
  IconRename,
  IconShieldAlert,
  IconTarget,
} from "@/src/lib/icons";
import { translateIndustry, useLocale } from "@/src/lib/i18n";
import { cn } from "@/src/lib/utils";
import type { InvestmentStage, Project, RiskTolerance } from "@/src/types";

type CompanyInfoSurface = "sidebar" | "summary";

interface CompanyInfoSectionProps {
  project: Project;
  onUpdate: (patch: Partial<Project>) => void;
  /** 主页使用摘要布局；对话页设置栏保留紧凑卡片布局。 */
  surface?: CompanyInfoSurface;
}

const STAGE_OPTIONS: Array<{ value: InvestmentStage }> = [
  { value: "early-growth" },
  { value: "late-pre-ipo" },
];

const RISK_OPTIONS: Array<{
  value: RiskTolerance;
  shortLabel: string;
  icon: typeof IconShieldAlert;
}> = [
  { value: "R1", shortLabel: "R1", icon: IconShieldAlert },
  { value: "R2", shortLabel: "R2", icon: IconTarget },
  { value: "R3", shortLabel: "R3", icon: IconAuto },
];

function stageLabel(value: InvestmentStage, t: (key: any) => string) {
  return value === "early-growth" ? t("project.stageEarly") : t("project.stageLate");
}

function stageSub(value: InvestmentStage, t: (key: any) => string) {
  return value === "early-growth"
    ? t("wizard.stageEarlySub")
    : t("wizard.stageLateSub");
}

function riskLabel(value: RiskTolerance, t: (key: any) => string) {
  return value === "R1"
    ? t("company.riskR1")
    : value === "R2"
      ? t("company.riskR2")
      : t("company.riskR3");
}

function riskTag(value: RiskTolerance, t: (key: any) => string) {
  return value === "R1"
    ? t("wizard.riskR1Tag")
    : value === "R2"
      ? t("wizard.riskR2Tag")
      : t("wizard.riskR3Tag");
}

/** 项目信息摘要及编辑弹窗。 */
export function CompanyInfoSection({
  project,
  onUpdate,
  surface = "sidebar",
}: CompanyInfoSectionProps) {
  const { locale, t } = useLocale();
  const fieldId = useId();
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState(project.name);
  const [industryDraft, setIndustryDraft] = useState(project.industry);
  const [stageDraft, setStageDraft] = useState<InvestmentStage>(project.stage);
  const [riskDraft, setRiskDraft] = useState<RiskTolerance>(project.riskTolerance);
  const [instructionDraft, setInstructionDraft] = useState(project.customInstruction);

  const resetDrafts = () => {
    setNameDraft(project.name);
    setIndustryDraft(project.industry);
    setStageDraft(project.stage);
    setRiskDraft(project.riskTolerance);
    setInstructionDraft(project.customInstruction);
  };

  useEffect(() => {
    resetDrafts();
    setEditing(false);
    // Project fields are the source of truth for the editor drafts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    project.id,
    project.name,
    project.industry,
    project.stage,
    project.riskTolerance,
    project.customInstruction,
  ]);

  const handleOpenChange = (open: boolean) => {
    setEditing(open);
    if (!open) resetDrafts();
  };

  const save = () => {
    const patch: Partial<Project> = {};
    const nextName = nameDraft.trim();
    const nextIndustry = industryDraft.trim();
    if (nextName && nextName !== project.name) patch.name = nextName;
    if (nextIndustry && nextIndustry !== project.industry) patch.industry = nextIndustry;
    if (stageDraft !== project.stage) patch.stage = stageDraft;
    if (riskDraft !== project.riskTolerance) patch.riskTolerance = riskDraft;
    if (instructionDraft !== project.customInstruction) {
      patch.customInstruction = instructionDraft;
    }
    if (Object.keys(patch).length > 0) onUpdate(patch);
    handleOpenChange(false);
  };

  const summaryRows = [
    { label: t("company.name"), value: project.name || "—", title: project.name },
    {
      label: t("company.industry"),
      value: project.industry ? translateIndustry(project.industry, locale) : "—",
      title: project.industry,
    },
    { label: t("company.stage"), value: stageLabel(project.stage, t) },
    {
      label: t("company.riskTolerance"),
      value: `${project.riskTolerance} · ${riskLabel(project.riskTolerance, t)}`,
    },
  ];
  const summaryMeta = [
    project.industry ? translateIndustry(project.industry, locale) : null,
    stageLabel(project.stage, t),
    `${project.riskTolerance} · ${riskLabel(project.riskTolerance, t)}`,
  ].filter((value): value is string => Boolean(value));

  const nameId = `${fieldId}-name`;
  const industryId = `${fieldId}-industry`;
  const instructionId = `${fieldId}-instruction`;
  const isSummary = surface === "summary";

  const editor = (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
      className="flex min-h-0 flex-col"
    >
      <div className="flex items-start justify-between gap-[var(--wz-space-4)] border-b border-[var(--wz-color-border-default)] px-5 py-4">
        <div className="min-w-0">
          <DialogPrimitive.Title className="text-[length:var(--wz-font-size-lg)] font-semibold leading-[var(--wz-line-height-tight)] text-[var(--wz-color-text-primary)]">
            {t("company.edit")}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-1 text-[length:var(--wz-font-size-sm)] leading-[var(--wz-line-height-normal)] text-[color:var(--wz-color-text-secondary)]">
            {t("settings.companyInfo")}
          </DialogPrimitive.Description>
        </div>
        <DialogPrimitive.Close asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t("common.close")}
            title={t("common.close")}
          >
            <AppIcon icon={IconClose} size={14} />
          </Button>
        </DialogPrimitive.Close>
      </div>

      <div className="thin-scroll min-h-0 flex-1 overflow-y-auto px-5 py-5">
        <div className="space-y-6">
          <section aria-labelledby={`${fieldId}-naming`} className="space-y-3">
            <h3
              id={`${fieldId}-naming`}
              className="text-[length:var(--wz-font-size-md)] font-semibold leading-[var(--wz-line-height-tight)] text-[var(--wz-color-text-primary)]"
            >
              {t("wizard.naming")}
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor={nameId}
                  className="block text-[length:var(--wz-font-size-sm)] font-medium leading-[var(--wz-line-height-tight)] text-[var(--wz-color-text-primary)]"
                >
                  {t("company.name")}
                </label>
                <Input
                  id={nameId}
                  autoFocus
                  required
                  value={nameDraft}
                  onChange={(event) => setNameDraft(event.target.value)}
                  placeholder={t("company.namePlaceholder")}
                  className="h-[var(--wz-control-height-md)] text-[length:var(--wz-font-size-body)]"
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor={industryId}
                  className="block text-[length:var(--wz-font-size-sm)] font-medium leading-[var(--wz-line-height-tight)] text-[var(--wz-color-text-primary)]"
                >
                  {t("company.industry")}
                </label>
                <select
                  id={industryId}
                  value={industryDraft}
                  onChange={(event) => setIndustryDraft(event.target.value)}
                  required
                  className="h-[var(--wz-control-height-md)] w-full rounded-[var(--wz-radius-lg)] border border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-surface)] px-3 text-[length:var(--wz-font-size-body)] text-[var(--wz-color-text-primary)] outline-none transition-[border-color,box-shadow] duration-[var(--wz-duration-fast)] ease-[var(--wz-ease-standard)] focus-visible:border-[var(--wz-color-border-focus)] focus-visible:shadow-[0_0_0_3px_var(--wz-color-focus-ring)]"
                >
                  <option value="" disabled>
                    {t("company.industryPlaceholder")}
                  </option>
                  {industryOptions.map((option) => (
                    <option key={option} value={option}>
                      {translateIndustry(option, locale)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section aria-labelledby={`${fieldId}-stage`} className="space-y-3">
            <div>
              <h3
                id={`${fieldId}-stage`}
                className="text-[length:var(--wz-font-size-md)] font-semibold leading-[var(--wz-line-height-tight)] text-[var(--wz-color-text-primary)]"
              >
                {t("wizard.investmentStage")}
              </h3>
              <p className="mt-1 text-[length:var(--wz-font-size-xs)] text-[color:var(--wz-color-text-secondary)]">
                {t("wizard.selectStage")}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {STAGE_OPTIONS.map((option) => {
                const active = stageDraft === option.value;
                return (
                  <label key={option.value} className="block cursor-pointer">
                    <input
                      type="radio"
                      name={`${fieldId}-stage`}
                      value={option.value}
                      checked={active}
                      onChange={() => setStageDraft(option.value)}
                      className="peer sr-only"
                    />
                    <span
                      className={cn(
                        "block min-h-[76px] rounded-[var(--wz-radius-lg)] border px-3 py-3 text-left outline-none transition-[background-color,border-color,color,box-shadow] duration-[var(--wz-duration-fast)] ease-[var(--wz-ease-standard)] peer-focus-visible:shadow-[0_0_0_3px_var(--wz-color-focus-ring)]",
                        active
                          ? "border-[var(--wz-color-action-primary)] bg-[var(--wz-color-action-primary)] text-[var(--wz-color-text-inverse)]"
                          : "border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-surface)] text-[var(--wz-color-text-primary)] hover:border-[var(--wz-color-border-strong)]"
                      )}
                    >
                      <span className="block text-[length:var(--wz-font-size-body)] font-semibold leading-[var(--wz-line-height-tight)]">
                        {stageLabel(option.value, t)}
                      </span>
                      <span
                        className={cn(
                          "mt-1 block text-[length:var(--wz-font-size-xs)] leading-[var(--wz-line-height-tight)]",
                          active
                            ? "text-[color-mix(in_srgb,var(--wz-color-text-inverse)_72%,transparent)]"
                            : "text-[color:var(--wz-color-text-secondary)]"
                        )}
                      >
                        {stageSub(option.value, t)}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </section>

          <section aria-labelledby={`${fieldId}-risk`} className="space-y-3">
            <div>
              <h3
                id={`${fieldId}-risk`}
                className="text-[length:var(--wz-font-size-md)] font-semibold leading-[var(--wz-line-height-tight)] text-[var(--wz-color-text-primary)]"
              >
                {t("wizard.riskTolerance")}
              </h3>
              <p className="mt-1 text-[length:var(--wz-font-size-xs)] text-[color:var(--wz-color-text-secondary)]">
                {t("wizard.selectRisk")}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {RISK_OPTIONS.map((option) => {
                const active = riskDraft === option.value;
                return (
                  <label key={option.value} className="block cursor-pointer">
                    <input
                      type="radio"
                      name={`${fieldId}-risk`}
                      value={option.value}
                      checked={active}
                      onChange={() => setRiskDraft(option.value)}
                      className="peer sr-only"
                    />
                    <span
                      className={cn(
                        "flex min-h-[84px] flex-col items-start gap-1 rounded-[var(--wz-radius-lg)] border px-3 py-3 text-left outline-none transition-[background-color,border-color,color,box-shadow] duration-[var(--wz-duration-fast)] ease-[var(--wz-ease-standard)] peer-focus-visible:shadow-[0_0_0_3px_var(--wz-color-focus-ring)]",
                        active
                          ? "border-[var(--wz-color-action-primary)] bg-[var(--wz-color-action-primary)] text-[var(--wz-color-text-inverse)]"
                          : "border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-surface)] text-[var(--wz-color-text-primary)] hover:border-[var(--wz-color-border-strong)]"
                      )}
                    >
                      <span className="flex items-center gap-1.5 text-[length:var(--wz-font-size-xs)] font-medium leading-[var(--wz-line-height-tag)]">
                        <AppIcon icon={option.icon} size={14} aria-hidden="true" />
                        {option.shortLabel}
                      </span>
                      <span className="text-[length:var(--wz-font-size-body)] font-semibold leading-[var(--wz-line-height-tight)]">
                        {riskLabel(option.value, t)}
                      </span>
                      <span
                        className={cn(
                          "rounded-[var(--wz-radius-sm)] px-1.5 py-0.5 text-[length:var(--wz-font-size-tag)] leading-[var(--wz-line-height-tag)]",
                          active
                            ? "bg-[color-mix(in_srgb,var(--wz-color-text-inverse)_14%,transparent)] text-[var(--wz-color-text-inverse)]"
                            : "bg-[var(--wz-color-bg-subtle)] text-[color:var(--wz-color-text-secondary)]"
                        )}
                      >
                        {riskTag(option.value, t)}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </section>

          <section aria-labelledby={`${fieldId}-instruction`} className="space-y-3">
            <div>
              <h3
                id={`${fieldId}-instruction`}
                className="text-[length:var(--wz-font-size-md)] font-semibold leading-[var(--wz-line-height-tight)] text-[var(--wz-color-text-primary)]"
              >
                {t("wizard.customTitle")}
              </h3>
              <p className="mt-1 text-[length:var(--wz-font-size-xs)] text-[color:var(--wz-color-text-secondary)]">
                {t("wizard.customHint")}
              </p>
            </div>
            <label htmlFor={instructionId} className="sr-only">
              {t("company.customInstruction")}
            </label>
            <Textarea
              id={instructionId}
              value={instructionDraft}
              onChange={(event) => setInstructionDraft(event.target.value)}
              placeholder={t("company.instructionPlaceholder")}
              className="min-h-[104px] text-[length:var(--wz-font-size-body)] leading-[var(--wz-line-height-normal)]"
            />
          </section>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-[var(--wz-color-border-default)] px-5 py-3">
        <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>
          {t("common.cancel")}
        </Button>
        <Button type="submit" variant="default">
          {t("common.save")}
        </Button>
      </div>
    </form>
  );

  return (
    <DialogPrimitive.Root open={editing} onOpenChange={handleOpenChange}>
      <section
        className={cn(
          isSummary
            ? "group/summary relative mt-1.5 min-w-0 pr-8"
            : "bg-[var(--wz-color-bg-surface)] border-b border-[var(--wz-color-border-default)] px-[var(--wz-space-4)] py-[var(--wz-space-3)]"
        )}
      >
        {isSummary ? (
          <>
            <p className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[length:var(--wz-font-size-xs)] font-normal leading-[var(--wz-line-height-normal)] text-[color:var(--wz-color-text-tertiary)]">
              {summaryMeta.map((value, index) => (
                <span key={`${value}-${index}`} className="min-w-0">
                  {index > 0 && (
                    <span className="mr-1.5" aria-hidden="true">
                      ·
                    </span>
                  )}
                  {value}
                </span>
              ))}
            </p>
            {project.customInstruction.trim() && (
              <p
                className="mt-1 line-clamp-2 text-[length:var(--wz-font-size-xs)] leading-[var(--wz-line-height-normal)] text-[color:var(--wz-color-text-secondary)]"
                title={project.customInstruction}
              >
                {project.customInstruction}
              </p>
            )}
            <DialogPrimitive.Trigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t("company.edit")}
                title={t("company.edit")}
                className="pointer-events-none absolute right-0 top-[-5px] shrink-0 opacity-0 transition-opacity duration-[var(--wz-duration-fast)] ease-[var(--wz-ease-standard)] group-hover/summary:pointer-events-auto group-hover/summary:opacity-100 group-focus-within/summary:pointer-events-auto group-focus-within/summary:opacity-100 [@media(hover:none)]:pointer-events-auto [@media(hover:none)]:opacity-100"
              >
                <AppIcon icon={IconRename} size={13} />
              </Button>
            </DialogPrimitive.Trigger>
          </>
        ) : (
          <>
            <div className="flex items-start gap-4">
              <dl className="min-w-0 flex-1 space-y-3">
                {summaryRows.map((row) => (
                  <div key={row.label} className="flex items-baseline justify-between gap-3">
                    <dt className="text-[length:var(--wz-font-size-xs)] leading-[var(--wz-line-height-tight)] text-[color:var(--wz-color-text-tertiary)]">
                      {row.label}
                    </dt>
                    <dd
                      className="min-w-0 truncate text-right text-[length:var(--wz-font-size-sm)] font-medium leading-[var(--wz-line-height-normal)] text-[var(--wz-color-text-primary)]"
                      title={row.title}
                    >
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>
              <DialogPrimitive.Trigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("company.edit")}
                  title={t("company.edit")}
                  className="-mr-1 -mt-1 shrink-0"
                >
                  <AppIcon icon={IconRename} size={12} />
                </Button>
              </DialogPrimitive.Trigger>
            </div>

            {project.customInstruction.trim() && (
              <div className="mt-3 border-t border-[var(--wz-color-border-subtle)] pt-3 pr-[var(--wz-space-8)]">
                <p
                  className="line-clamp-3 whitespace-pre-wrap text-[length:var(--wz-font-size-sm)] leading-[var(--wz-line-height-normal)] text-[color:var(--wz-color-text-secondary)]"
                  title={project.customInstruction}
                >
                  {project.customInstruction}
                </p>
              </div>
            )}
          </>
        )}
      </section>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="wz-confirm-overlay fixed inset-0 z-[var(--wz-z-overlay)] bg-[var(--wz-color-bg-overlay)]" />
        <DialogPrimitive.Content className="wz-confirm-content fixed left-1/2 top-1/2 z-[var(--wz-z-dialog)] flex max-h-[min(840px,calc(100dvh-32px))] w-[min(680px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[var(--wz-radius-xl)] border border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-elevated)] text-[var(--wz-color-text-primary)] shadow-[var(--wz-shadow-lg)] outline-none">
          {editor}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
