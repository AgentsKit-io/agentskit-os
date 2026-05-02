import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Display",
          "SF Pro Text",
          "Inter",
          "system-ui",
          "sans-serif",
        ],
        mono: ["SF Mono", "ui-monospace", "Menlo", "Monaco", "monospace"],
      },
      colors: {
        ink: {
          DEFAULT: "#1d1d1f",
          muted: "#6e6e73",
          subtle: "#86868b",
        },
        surface: {
          DEFAULT: "#ffffff",
          alt: "#f5f5f7",
          dim: "#fbfbfd",
        },
        line: "#d2d2d7",
        accent: {
          DEFAULT: "#0071e3",
          hover: "#0077ed",
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
