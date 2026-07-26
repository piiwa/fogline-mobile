import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge doesn't know the custom font sizes declared in
 * tailwind.config.ts (`text-h1`, `text-h2`, `text-xxs`) and would classify them
 * as text COLOURS — silently dropping the size. Declaring them in the
 * `font-size` class group keeps both `text-h1` and `text-foreground`.
 */
const twMerge = extendTailwindMerge({
  extend: { classGroups: { "font-size": [{ text: ["xxs", "h1", "h2"] }] } },
});

/**
 * Tailwind-aware class-name merger for NativeWind components: combines variant +
 * override classes safely (last-write-wins per utility group).
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
