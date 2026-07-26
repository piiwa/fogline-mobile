import type { Config } from "tailwindcss";

/**
 * Fogline design tokens — playful, saturated, high-contrast.
 * JS mirror (for native props): src/theme/tokens.ts. Keep both in sync.
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#F4F4FB",
          100: "#E5E5F5",
          200: "#C9C9E6",
          300: "#9E9ECB",
          400: "#6F6FA8",
          500: "#4A4A85",
          600: "#343064",
          700: "#26224C",
          800: "#1B1839",
          900: "#12102A",
        },
        mist: {
          100: "#E9E6FD",
          200: "#CFC8FA",
          300: "#AEA2F4",
          400: "#8C7BEC",
          500: "#6E5AE0",
          600: "#5741C4",
          700: "#43319B",
        },
        mint: {
          100: "#D6FBF3",
          200: "#9DF5E4",
          300: "#5FEBD2",
          400: "#2BD9BC",
          500: "#12BFA2",
          600: "#0C9880",
        },
        sunny: {
          200: "#FFE9A8",
          300: "#FFD65C",
          400: "#FFC12E",
          500: "#F0A50E",
          600: "#C27F06",
        },
        bubble: {
          200: "#FFC7DE",
          300: "#FF93C0",
          400: "#FF5FA2",
          500: "#E93B85",
        },
        background: "#EFF3FB",
        surface: "#FFFFFF",
        foreground: "#1B1839",
        muted: "#6F6FA8",
        border: "#DCE1F0",
        success: "#12BFA2",
        warning: "#FFC12E",
        danger: "#FF5D6C",
      },
      fontFamily: {
        sans: ["System"],
      },
      fontSize: {
        xxs: ["11px", { lineHeight: "14px" }],
        xs: ["13px", { lineHeight: "18px" }],
        sm: ["15px", { lineHeight: "20px" }],
        base: ["17px", { lineHeight: "24px" }],
        lg: ["19px", { lineHeight: "26px" }],
        xl: ["22px", { lineHeight: "28px" }],
        h2: ["26px", { lineHeight: "32px" }],
        "2xl": ["28px", { lineHeight: "34px" }],
        "3xl": ["34px", { lineHeight: "40px" }],
        h1: ["38px", { lineHeight: "44px" }],
      },
      borderRadius: {
        none: "0",
        sm: "6px",
        DEFAULT: "12px",
        md: "16px",
        lg: "20px",
        xl: "24px",
        "2xl": "28px",
        "3xl": "34px",
        full: "9999px",
      },
    },
  },
  plugins: [],
};

export default config;
