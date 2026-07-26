import { forwardRef } from "react";
import { Text as RNText, type TextProps as RNTextProps } from "react-native";

import { cn } from "@/utils/string";

export interface TextProps extends RNTextProps {
  variant?: "display" | "title" | "subtitle" | "body" | "caption" | "label";
  tone?: "default" | "muted" | "mint" | "mist" | "sunny" | "danger" | "inverse";
  weight?: "regular" | "medium" | "semibold" | "bold";
  align?: "left" | "center" | "right";
}

const variantClasses: Record<NonNullable<TextProps["variant"]>, string> = {
  display: "text-h1",
  title: "text-h2",
  subtitle: "text-lg",
  body: "text-base",
  caption: "text-xs",
  label: "text-xxs tracking-widest uppercase",
};

const toneClasses: Record<NonNullable<TextProps["tone"]>, string> = {
  default: "text-foreground",
  muted: "text-muted",
  mint: "text-mint-600",
  mist: "text-mist-600",
  sunny: "text-sunny-600",
  danger: "text-danger",
  inverse: "text-white",
};

const weightClasses: Record<NonNullable<TextProps["weight"]>, string> = {
  regular: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
};

const alignClasses: Record<NonNullable<TextProps["align"]>, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

// Only true screen/section titles get the header role — announcing every card
// label as a heading pollutes screen-reader navigation.
const HEADER_VARIANTS = new Set<TextProps["variant"]>(["display", "title"]);

export const Text = forwardRef<RNText, TextProps>(function Text(
  {
    variant = "body",
    tone = "default",
    weight = "regular",
    align,
    className,
    allowFontScaling = true,
    accessibilityRole,
    ...props
  },
  ref,
) {
  const resolvedRole = accessibilityRole ?? (HEADER_VARIANTS.has(variant) ? "header" : undefined);
  return (
    <RNText
      ref={ref}
      allowFontScaling={allowFontScaling}
      accessibilityRole={resolvedRole}
      className={cn(
        variantClasses[variant],
        toneClasses[tone],
        weightClasses[weight],
        align ? alignClasses[align] : undefined,
        className,
      )}
      {...props}
    />
  );
});
