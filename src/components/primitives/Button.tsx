import { LinearGradient } from "expo-linear-gradient";
import { ActivityIndicator, View } from "react-native";

import { colors, gradients } from "@/theme/tokens";
import { cn } from "@/utils/string";

import { PressableScale, type PressableScaleProps } from "./PressableScale";
import { Text } from "./Text";

type ButtonVariant = "primary" | "outline" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends Omit<PressableScaleProps, "children"> {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftSlot?: React.ReactNode;
  fullWidth?: boolean;
  className?: string;
}

const base = "flex-row items-center justify-center rounded-2xl overflow-hidden";

const variantContainer: Record<ButtonVariant, string> = {
  primary: "",
  outline: "border border-mint-400 bg-transparent",
  ghost: "bg-transparent",
};

const variantLabelClass: Record<ButtonVariant, string> = {
  primary: "text-ink-950",
  outline: "text-mint-600",
  ghost: "text-muted",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "min-h-10 px-4 py-2",
  md: "min-h-12 px-5 py-3",
  lg: "min-h-14 px-6 py-3.5",
};

export function Button({
  label,
  variant = "primary",
  size = "md",
  isLoading = false,
  disabled,
  leftSlot,
  fullWidth = true,
  className,
  accessibilityLabel,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || isLoading;
  const isPrimary = variant === "primary";

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled, busy: isLoading }}
      disabled={isDisabled}
      className={cn(
        base,
        variantContainer[variant],
        sizeClasses[size],
        fullWidth ? "w-full" : "self-start",
        isDisabled ? "opacity-50" : undefined,
        className,
      )}
      style={
        isPrimary && !isDisabled
          ? {
              shadowColor: colors.mint[400],
              shadowOpacity: 0.45,
              shadowRadius: 18,
              shadowOffset: { width: 0, height: 8 },
              elevation: 10,
            }
          : undefined
      }
      {...rest}
    >
      {isPrimary ? (
        <LinearGradient
          colors={gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        />
      ) : null}

      {isLoading ? (
        <ActivityIndicator color={isPrimary ? colors.ink[900] : colors.mint[400]} />
      ) : (
        <>
          {leftSlot ? <View className="mr-2">{leftSlot}</View> : null}
          <Text variant="body" weight="semibold" className={variantLabelClass[variant]}>
            {label}
          </Text>
        </>
      )}
    </PressableScale>
  );
}
