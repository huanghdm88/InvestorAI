import { MorphIcon } from "morphicons/react";
import { ChevronDown, MessageCircle } from "lucide";

type ComposerMorphIconProps = {
  open: boolean;
  size?: number;
};

export function ComposerMorphIcon({ open, size = 18 }: ComposerMorphIconProps) {
  return (
    <MorphIcon
      icon={open ? ChevronDown : MessageCircle}
      size={size}
      strokeWidth={2}
      absoluteStrokeWidth
      color="currentColor"
      spring="snappy"
      overflow="visible"
      className="composer-morph-icon"
    />
  );
}
