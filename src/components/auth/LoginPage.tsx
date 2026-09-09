import { useEffect, useRef, useState } from "react";

import { LanguageSwitcher } from "@/src/components/language-switcher";
import { Logo } from "@/src/components/logo";
import { AppIcon } from "@/src/components/ui/app-icon";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import {
  IconCheck,
  IconChallenge,
  IconKey,
  IconMail,
  IconRefresh,
  IconShieldCheck,
  IconUser,
} from "@/src/lib/icons";
import { useLocale } from "@/src/lib/i18n";
import type { AuthRole } from "@/src/types";

interface LoginPageProps {
  onLogin: (role: AuthRole) => void;
}

interface VantaEffect {
  destroy: () => void;
}

interface VantaNetOptions {
  el: HTMLElement;
  THREE?: unknown;
  mouseControls: boolean;
  touchControls: boolean;
  gyroControls: boolean;
  minHeight: number;
  minWidth: number;
  scale: number;
  scaleMobile: number;
  color: number;
  backgroundColor: number;
  points: number;
  maxDistance: number;
  spacing: number;
}

function loadVendorScript(src: string): Promise<void> {
  if (src.includes("three") && window.THREE) return Promise.resolve();
  if (src.includes("vanta") && window.VANTA?.NET) return Promise.resolve();

  const existing = Array.from(document.scripts).find(
    (script) => script.dataset.investorAiVendor === src || script.src.endsWith(src)
  );

  if (existing) {
    if (existing.dataset.loaded === "true") return Promise.resolve();
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), { once: true });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.dataset.investorAiVendor = src;
    script.addEventListener("load", () => {
      script.dataset.loaded = "true";
      resolve();
    }, { once: true });
    script.addEventListener("error", () => {
      script.remove();
      reject(new Error(`Failed to load ${src}`));
    }, { once: true });
    document.head.appendChild(script);
  });
}

declare global {
  interface Window {
    THREE?: unknown;
    VANTA?: {
      NET?: (options: VantaNetOptions) => VantaEffect;
    };
  }
}

const panelShellClass =
  "rounded-[var(--wz-radius-lg)] bg-[linear-gradient(145deg,rgba(255,255,255,0.46)_0%,rgba(255,255,255,0.15)_28%,rgba(255,255,255,0.035)_58%,rgba(255,255,255,0.18)_100%)] p-px shadow-[var(--wz-shadow-lg)]";
const panelClass =
  "relative overflow-hidden rounded-[var(--wz-radius-lg)] bg-[linear-gradient(180deg,#111438_0%,#080827_62%,#05071c_100%)] p-5 max-[380px]:p-4 sm:p-8";
const labelClass = "block text-[length:var(--wz-font-size-body)] font-medium leading-5 text-white/90";
const inputClass =
  "h-12 rounded-xl border-white/[0.18] bg-white/[0.075] pl-11 pr-4 text-[length:var(--wz-font-size-body)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] placeholder:text-white/70 hover:border-white/30 focus-visible:border-white/40 focus-visible:shadow-[0_0_0_3px_rgba(255,255,255,0.18)]";
const inputIconClass =
  "pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/85";

export function LoginPage({ onLogin }: LoginPageProps) {
  const { t } = useLocale();
  const backgroundRef = useRef<HTMLDivElement>(null);
  const [email, setEmail] = useState("demo@investor-ai.com");
  const [password, setPassword] = useState("••••••••");
  const [selectedRole, setSelectedRole] = useState<AuthRole>("committee-lead");
  const [accepted, setAccepted] = useState(true);
  const [showForgot, setShowForgot] = useState(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("forgot") === "1";
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const element = backgroundRef.current;
    if (!element) return;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let effect: VantaEffect | null = null;
    let disposed = false;
    let vendorLoad: Promise<void> | null = null;

    const disposeEffect = () => {
      if (!effect) return;
      try {
        effect.destroy();
      } catch {
        // Vanta may already have removed its canvas during route teardown.
      } finally {
        effect = null;
      }
    };

    const ensureVendorRuntime = () => {
      if (!vendorLoad) {
        vendorLoad = loadVendorScript("/vendor/three.r134.min.js")
          .then(() => loadVendorScript("/vendor/vanta.net.min.js"));
      }
      return vendorLoad;
    };

    const mountEffect = () => {
      const createNetEffect = window.VANTA?.NET;
      if (disposed || motionQuery.matches || effect || !createNetEffect) return;
      try {
        effect = createNetEffect({
          el: element,
          THREE: window.THREE,
          mouseControls: true,
          touchControls: true,
          gyroControls: false,
          minHeight: 200,
          minWidth: 200,
          scale: 1,
          scaleMobile: 1,
          color: 0x55c8c8,
          backgroundColor: 0x40406b,
          points: 16,
          maxDistance: 26,
          spacing: 17,
        });
      } catch {
        // The solid background remains as the safe fallback.
        element.dataset.motion = "static";
      }
    };

    const syncBackground = () => {
      disposeEffect();
      element.dataset.motion = motionQuery.matches ? "static" : "animated";

      // Keep the login surface calm and deterministic for reduced-motion users
      // and when the optional Vanta runtime is unavailable.
      if (motionQuery.matches) return;
      void ensureVendorRuntime()
        .then(mountEffect)
        .catch(() => {
          if (!disposed) element.dataset.motion = "static";
        });
    };

    const handleMotionChange = () => syncBackground();
    syncBackground();
    if (typeof motionQuery.addEventListener === "function") {
      motionQuery.addEventListener("change", handleMotionChange);
    } else {
      motionQuery.addListener(handleMotionChange);
    }

    return () => {
      disposed = true;
      if (typeof motionQuery.removeEventListener === "function") {
        motionQuery.removeEventListener("change", handleMotionChange);
      } else {
        motionQuery.removeListener(handleMotionChange);
      }
      disposeEffect();
    };
  }, []);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      onLogin(selectedRole);
    }, 600);
  };

  return (
    <div className="relative min-h-dvh w-full overflow-hidden bg-[#40406b] text-white">
      <div
        ref={backgroundRef}
        id="login-vanta-background"
        aria-hidden="true"
        className="absolute inset-0 bg-[#40406b]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[1] bg-black/58"
      />

      <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
        <LanguageSwitcher collapsed inverted placement="below" />
      </div>

      <main className="relative z-10 flex min-h-dvh min-w-0 flex-col overflow-y-auto px-4 py-6 max-[380px]:px-3 max-[380px]:pb-4 max-[380px]:pt-14 sm:px-6 sm:py-8">
        <div className="flex min-h-0 w-full min-w-0 flex-1 items-center justify-center max-[380px]:items-start">
          <div className="min-w-0 w-full max-w-full animate-staged-reveal motion-reduce:animate-none sm:max-w-[460px]">
            <div className={panelShellClass}>
              <section className={panelClass} aria-labelledby="login-title">
              <div className="flex justify-center">
                <Logo
                  withText={false}
                  markClassName="!h-11 !w-11 !rounded-[10px]"
                />
              </div>

              {!showForgot ? (
                <>
                  <div className="mt-7 text-center max-[380px]:mt-5">
                    <h1
                      id="login-title"
                      className="text-[24px] font-semibold leading-8 text-white"
                    >
                      {t("auth.workspace")}
                    </h1>
                    <p className="mx-auto mt-2 max-w-[330px] text-[length:var(--wz-font-size-body)] leading-5 text-white/70">
                      {t("auth.subtitle")}
                    </p>
                  </div>

                  <fieldset className="mt-6 space-y-2.5 max-[380px]:mt-5">
                    <legend className={labelClass}>{t("auth.identity")}</legend>
                    <div
                      className="grid gap-2 sm:grid-cols-2"
                      role="radiogroup"
                      aria-label={t("auth.identity")}
                    >
                      <label className="block cursor-pointer">
                        <input
                          type="radio"
                          name="login-role"
                          value="investment-director"
                          checked={selectedRole === "investment-director"}
                          onChange={() => setSelectedRole("investment-director")}
                          className="peer sr-only"
                        />
                        <span className="flex min-h-[52px] items-start gap-2.5 rounded-xl border border-white/[0.18] bg-white/[0.055] px-3 py-2.5 text-left transition-[background-color,border-color,box-shadow] duration-[var(--wz-duration-fast)] hover:border-white/35 peer-checked:border-white/70 peer-checked:bg-white/[0.13] peer-focus-visible:shadow-[0_0_0_3px_rgba(255,255,255,0.18)]">
                          <AppIcon icon={IconUser} size={15} className="mt-0.5 shrink-0 text-white/80" aria-hidden="true" />
                          <span className="min-w-0">
                            <span className="block text-[length:var(--wz-font-size-body)] font-medium leading-5 text-white">
                              {t("auth.roleInvestmentDirector")}
                            </span>
                          </span>
                        </span>
                      </label>
                      <label className="block cursor-pointer">
                        <input
                          type="radio"
                          name="login-role"
                          value="committee-lead"
                          checked={selectedRole === "committee-lead"}
                          onChange={() => setSelectedRole("committee-lead")}
                          className="peer sr-only"
                        />
                        <span className="flex min-h-[52px] items-start gap-2.5 rounded-xl border border-white/[0.18] bg-white/[0.055] px-3 py-2.5 text-left transition-[background-color,border-color,box-shadow] duration-[var(--wz-duration-fast)] hover:border-white/35 peer-checked:border-white/70 peer-checked:bg-white/[0.13] peer-focus-visible:shadow-[0_0_0_3px_rgba(255,255,255,0.18)]">
                          <AppIcon icon={IconChallenge} size={15} className="mt-0.5 shrink-0 text-white/80" aria-hidden="true" />
                          <span className="min-w-0">
                            <span className="block text-[length:var(--wz-font-size-body)] font-medium leading-5 text-white">
                              {t("auth.roleCommitteeLead")}
                            </span>
                          </span>
                        </span>
                      </label>
                    </div>
                  </fieldset>

                  <form
                    onSubmit={handleSubmit}
                    className="mt-7 space-y-5 max-[380px]:mt-5 max-[380px]:space-y-4"
                    aria-busy={submitting}
                  >
                    <div className="space-y-2">
                      <label htmlFor="login-email" className={labelClass}>
                        {t("auth.email")}
                      </label>
                      <div className="relative">
                        <AppIcon
                          icon={IconMail}
                          size={17}
                          className={inputIconClass}
                        />
                        <Input
                          id="login-email"
                          type="email"
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          placeholder="name@company.com"
                          autoComplete="email"
                          className={inputClass}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-4">
                        <label htmlFor="login-password" className={labelClass}>
                          {t("auth.password")}
                        </label>
                        <button
                          type="button"
                          className="rounded-[var(--wz-radius-sm)] text-[length:var(--wz-font-size-body)] text-white/85 outline-none transition-[color,box-shadow] duration-[var(--wz-duration-fast)] hover:text-white focus-visible:shadow-[0_0_0_3px_rgba(255,255,255,0.18)]"
                          onClick={() => setShowForgot(true)}
                        >
                          {t("auth.forgotPassword")}
                        </button>
                      </div>
                      <div className="relative">
                        <AppIcon
                          icon={IconKey}
                          size={17}
                          className={inputIconClass}
                        />
                        <Input
                          id="login-password"
                          type="password"
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          placeholder={t("auth.passwordPlaceholder")}
                          autoComplete="current-password"
                          className={inputClass}
                          required
                        />
                      </div>
                    </div>

                    <label className="flex cursor-pointer items-start gap-2.5 text-[length:var(--wz-font-size-body)] leading-5 text-white/90">
                      <input
                        type="checkbox"
                        checked={accepted}
                        onChange={(event) => setAccepted(event.target.checked)}
                        className="peer sr-only"
                      />
                      <span
                        aria-hidden="true"
                        className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border border-white/65 bg-black/25 text-white transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-white/35 peer-checked:bg-black/40"
                      >
                        {accepted && <AppIcon icon={IconCheck} size={10} />}
                      </span>
                      <span>{t("auth.acceptTerms")}</span>
                    </label>

                    <Button
                      type="submit"
                      variant="default"
                      size="lg"
                      className="h-12 w-full rounded-xl bg-white text-[length:var(--wz-font-size-body)] font-semibold text-black shadow-[var(--wz-shadow-md)] hover:bg-white/90 focus-visible:shadow-[0_0_0_3px_rgba(255,255,255,0.28)] active:bg-white/85"
                      disabled={submitting || !accepted}
                    >
                      {submitting ? (
                        <>
                          <AppIcon
                            icon={IconRefresh}
                            size={13}
                            className="animate-spin motion-reduce:animate-none"
                            aria-hidden="true"
                          />
                          {t("auth.signingIn")}
                        </>
                      ) : (
                        t("auth.signIn")
                      )}
                    </Button>

                  </form>
                </>
              ) : (
                <>
                <div className="mt-7 text-center max-[380px]:mt-5">
                  <h1
                    id="login-title"
                    className="text-[24px] font-semibold leading-8 text-white"
                  >
                    {t("auth.recoverTitle")}
                  </h1>
                    <p className="mx-auto mt-2 max-w-[330px] text-[length:var(--wz-font-size-body)] leading-5 text-white/70">
                    {t("auth.recoverSubtitle")}
                  </p>
                </div>

                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    setShowForgot(false);
                  }}
                  className="mt-7 space-y-5 max-[380px]:mt-5 max-[380px]:space-y-4"
                >
                  <div className="space-y-2">
                    <label htmlFor="recovery-email" className={labelClass}>
                      {t("auth.email")}
                    </label>
                    <div className="relative">
                      <AppIcon
                        icon={IconMail}
                        size={17}
                        className={inputIconClass}
                      />
                      <Input
                        id="recovery-email"
                        type="email"
                        placeholder="name@company.com"
                        autoComplete="email"
                        className={inputClass}
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    variant="default"
                    size="lg"
                    className="h-12 w-full rounded-xl bg-white text-[length:var(--wz-font-size-body)] font-semibold text-black hover:bg-white/90 focus-visible:shadow-[0_0_0_3px_rgba(255,255,255,0.28)] active:bg-white/85"
                  >
                    {t("auth.sendReset")}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="lg"
                    className="h-12 w-full rounded-xl border border-white/[0.18] bg-white/[0.07] text-[length:var(--wz-font-size-body)] font-medium text-white/85 hover:bg-white/[0.12] hover:text-white focus-visible:shadow-[0_0_0_3px_rgba(255,255,255,0.18)] active:bg-white/[0.16]"
                    onClick={() => setShowForgot(false)}
                  >
                    {t("auth.backToLogin")}
                  </Button>
                </form>
                </>
              )}
              </section>
            </div>

            <div className="mt-5 flex items-center justify-center gap-2 text-[length:var(--wz-font-size-caption)] leading-4 text-white/80 max-[380px]:mt-3">
              <AppIcon icon={IconShieldCheck} size={14} className="text-white/85" />
              <span>{t("auth.security")}</span>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
