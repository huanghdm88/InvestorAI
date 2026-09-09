import { cn } from "@/src/lib/utils";
import { useLocale } from "@/src/lib/i18n";

const AVATAR_IMAGES: Record<string, string> = {
  finance: "finance-agent.png",
  customer: "customer-agent.png",
  technology: "technology-agent.png",
  market: "market-research-agent.png",
  legal: "legal-agent.png",
  valuation: "valuation-agent.png",
};

const SIZE_CLASS = {
  xs: "h-7 w-7",
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-14 w-14",
} as const;

interface YaojuAgentAvatarProps {
  agentId: string;
  name: string;
  size?: keyof typeof SIZE_CLASS;
  className?: string;
}

export function YaojuAgentAvatar({
  agentId,
  name,
  size = "md",
  className,
}: YaojuAgentAvatarProps) {
  const { locale } = useLocale();
  const imageName = AVATAR_IMAGES[agentId] ?? AVATAR_IMAGES.finance;

  return (
    <span
      className={cn(
        "shrink-0 overflow-hidden rounded-full border border-[var(--wz-color-border-strong)] bg-[var(--wz-color-bg-subtle)]",
        SIZE_CLASS[size],
        className
      )}
    >
      <img
        src={`/demo/yaoju/agents/${imageName}`}
        alt={locale === "en-US" ? `${name} Agent avatar` : `${name} Agent 头像`}
        draggable={false}
        className="h-full w-full rounded-full object-cover object-center"
      />
    </span>
  );
}
