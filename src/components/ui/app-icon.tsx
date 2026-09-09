import * as React from "react";
import type { AntdIconProps } from "@ant-design/icons/lib/components/AntdIcon";

import { cn } from "@/src/lib/utils";

type AppIconComponent = React.ForwardRefExoticComponent<
  Omit<AntdIconProps, "ref"> & React.RefAttributes<HTMLSpanElement>
>;

type AppIconProps = Omit<AntdIconProps, "children"> & {
  icon: AppIconComponent;
  size?: number | string;
  color?: string;
};

function AppIcon({
  icon: Icon,
  size = 16,
  color,
  className,
  style,
  title,
  "aria-label": ariaLabel,
  ...rest
}: AppIconProps) {
  return (
    <Icon
      aria-hidden={ariaLabel || title ? undefined : true}
      aria-label={ariaLabel}
      className={cn(
        "inline-flex shrink-0 items-center justify-center leading-none [vertical-align:0]",
        className
      )}
      style={{ fontSize: size, lineHeight: 1, verticalAlign: 0, color, ...style }}
      title={title}
      {...rest}
    />
  );
}

export { AppIcon };
export type { AppIconComponent, AppIconProps };
