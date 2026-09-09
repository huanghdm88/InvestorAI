/**
 * Shared visual contract for the workflow implementations.
 *
 * `CrossValidationDemoCard` owns the live validation interactions while
 * `ReportProcessCard` owns the standard process timeline. Their content and
 * state rules stay separate, but the surrounding surface reads as one
 * unified product pattern.
 */
export const PROCESS_SHELL_CLASS =
  "w-full min-w-0 max-w-full overflow-hidden rounded-[var(--wz-radius-lg)] border border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-surface)] shadow-[var(--wz-shadow-sm)]";

export const PROCESS_HEADER_CLASS =
  "bg-[var(--wz-color-bg-surface)] px-4 py-3.5 sm:px-5";

export const PROCESS_HEADER_ICON_CLASS =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--wz-color-action-primary)] text-[var(--wz-color-text-inverse)] shadow-[var(--wz-shadow-sm)]";

export const PROCESS_KICKER_CLASS =
  "text-[length:var(--wz-font-size-caption)] font-medium leading-[var(--wz-line-height-tight)] text-[color:var(--wz-color-text-secondary)]";

export const PROCESS_PROGRESS_TRACK_CLASS =
  "h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[var(--wz-color-border-default)]";

export const PROCESS_PROGRESS_FILL_CLASS =
  "h-full w-full origin-left transition-transform [transition-duration:var(--wz-duration-normal)] [transition-timing-function:var(--wz-ease-standard)] motion-reduce:transition-none";

export const PROCESS_COLLAPSE_BUTTON_CLASS =
  "flex h-7 w-7 items-center justify-center rounded-full border border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-surface)] text-[color:var(--wz-color-text-tertiary)] outline-none transition-[background-color,border-color,color,box-shadow] [transition-duration:var(--wz-duration-fast)] [transition-timing-function:var(--wz-ease-standard)] hover:border-[var(--wz-color-border-strong)] hover:bg-[var(--wz-color-bg-subtle)] hover:text-[var(--wz-color-text-primary)] focus-visible:shadow-[0_0_0_3px_var(--wz-color-focus-ring)]";

/** Shared subtask surface used inside the process stages. */
export const FRAMEWORK_SUBTASK_CARD_CLASS =
  "framework-subtask-card w-full rounded-[var(--wz-radius-md)] border border-[var(--wz-color-border-default)] bg-[var(--wz-color-bg-surface)] text-left text-[var(--wz-color-text-primary)]";

export const FRAMEWORK_SUBTASK_INNER_CARD_CLASS =
  "rounded-[var(--wz-radius-sm)] bg-[var(--wz-color-bg-subtle)] p-3";

export const FRAMEWORK_SUBTASK_TITLE_CLASS =
  "text-[length:var(--wz-font-size-subtitle)] font-semibold leading-5 text-[var(--wz-color-text-primary)]";

export const FRAMEWORK_SUBTASK_DESCRIPTION_CLASS =
  "mt-1 text-[length:var(--wz-font-size-body)] leading-5 text-[color:var(--wz-color-text-secondary)]";
