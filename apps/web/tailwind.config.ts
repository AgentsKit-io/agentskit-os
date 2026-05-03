import type { Config } from "tailwindcss";
import { createPreset } from "fumadocs-ui/tailwind-plugin";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./content/**/*.{md,mdx}",
    "./mdx-components.{ts,tsx}",
    "./node_modules/fumadocs-ui/dist/**/*.js",
  ],
  presets: [createPreset()],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Display",
          "SF Pro Text",
          "system-ui",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "SF Mono",
          "ui-monospace",
          "Menlo",
          "Monaco",
          "monospace",
        ],
      },
      colors: {
        ink: {
          DEFAULT: "#f5f5f7",
          muted: "#a1a1aa",
          subtle: "#71717a",
        },
        surface: {
          DEFAULT: "#08090c",
          alt: "#0d0e12",
          dim: "#0a0b0e",
        },
        panel: {
          DEFAULT: "#111217",
          alt: "#16171d",
        },
        line: {
          DEFAULT: "#1f2025",
          soft: "#141519",
        },
        accent: {
          DEFAULT: "#22d3ee",
          hover: "#67e8f9",
          dim: "#0e7490",
        },
      },
      letterSpacing: {
        tighter: "-0.025em",
        tightest: "-0.04em",
      },
      fontSize: {
        display: ["clamp(2.75rem, 6vw, 5.5rem)", { lineHeight: "1.05", letterSpacing: "-0.04em", fontWeight: "600" }],
        h2: ["clamp(2rem, 4vw, 3.25rem)", { lineHeight: "1.1", letterSpacing: "-0.03em", fontWeight: "600" }],
        eyebrow: ["0.875rem", { lineHeight: "1.4", letterSpacing: "0", fontWeight: "500" }],
      },
      animation: {
        "flow-pulse": "flow-pulse 2.4s ease-in-out infinite",
        "flow-dash": "flow-dash 3s linear infinite",
        "fade-up": "fade-up 0.8s cubic-bezier(0.22,1,0.36,1) both",
      },
      keyframes: {
        "flow-pulse": {
          "0%, 100%": { opacity: "0.4", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.04)" },
        },
        "flow-dash": {
          "0%": { strokeDashoffset: "0" },
          "100%": { strokeDashoffset: "-60" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
