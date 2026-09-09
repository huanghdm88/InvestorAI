import * as React from "react";

import { cn } from "@/src/lib/utils";

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "rounded-[var(--wz-radius-lg)] border border-[var(--wz-color-border-subtle)] bg-[var(--wz-color-bg-surface)] text-[var(--wz-color-text-primary)] shadow-[var(--wz-shadow-sm)] transition-[border-color,box-shadow] duration-[var(--wz-duration-normal)] ease-[var(--wz-ease-standard)]",
        className
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn("flex flex-col gap-[var(--wz-space-2)] p-[var(--wz-space-5)]", className)}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "text-[length:var(--wz-font-size-lg)] font-semibold leading-[var(--wz-line-height-tight)]",
        className
      )}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn(
        "text-[length:var(--wz-font-size-md)] leading-[var(--wz-line-height-normal)] text-[color:var(--wz-color-text-secondary)]",
        className
      )}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-[var(--wz-space-5)] pb-[var(--wz-space-5)]", className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center px-[var(--wz-space-5)] pb-[var(--wz-space-5)]",
        className
      )}
      {...props}
    />
  );
}

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
