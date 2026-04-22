import type { Config } from "tailwindcss";

/** Palette hex values mirror `packages/shared/src/design-tokens.css` — update both when tokens change. */
const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#ffffff",
        surface: "#fafafa",
        "surface-2": "#f0f0f0",
        border: "#e2e2e2",
        "border-2": "#cccccc",
        text: "#111111",
        muted: "#888888",
        dim: "#bbbbbb",
        accent: "#ff4f00",
        red: "#e60000",
        green: "#16a34a",
      },
      fontFamily: {
        sans: ["Geist", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
      height: {
        "task-row": "36px",
      },
      animation: {
        "task-enter": "task-enter 180ms cubic-bezier(0.34, 1.56, 0.64, 1) both",
        "task-exit": "task-exit 150ms cubic-bezier(0.23, 1, 0.32, 1) forwards",
        "palette-in": "palette-in 150ms cubic-bezier(0.34, 1.56, 0.64, 1) both",
        "palette-out":
          "palette-out 100ms cubic-bezier(0.23, 1, 0.32, 1) forwards",
        "modal-in": "modal-in 150ms cubic-bezier(0.34, 1.56, 0.64, 1) both",
        "modal-out": "modal-out 120ms ease-in forwards",
        /** Week view: range label tick + today marker (keep subtle; respects motion-reduce via utilities) */
        "week-nudge": "week-nudge 200ms cubic-bezier(0.23, 1, 0.32, 1) both",
        "week-today-glow":
          "week-today-glow 2.8s cubic-bezier(0.45, 0, 0.55, 1) infinite",
      },
      keyframes: {
        "task-enter": {
          from: { opacity: "0", transform: "translateX(-6px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "task-exit": {
          "0%": { opacity: "1", transform: "translateX(0)" },
          "100%": { opacity: "0", transform: "translateX(10px)" },
        },
        "palette-in": {
          from: { opacity: "0", transform: "translateY(-8px) scale(0.98)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "palette-out": {
          from: { opacity: "1", transform: "translateY(0) scale(1)" },
          to: { opacity: "0", transform: "translateY(-4px) scale(0.98)" },
        },
        "modal-in": {
          from: { opacity: "0", transform: "scale(0.96) translateY(6px)" },
          to: { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        "modal-out": {
          from: { opacity: "1", transform: "scale(1) translateY(0)" },
          to: { opacity: "0", transform: "scale(0.96) translateY(6px)" },
        },
        "week-nudge": {
          from: { opacity: "0.82", transform: "translateY(3px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "week-today-glow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.45" },
        },
      },
      boxShadow: {
        panel: "var(--shadow-panel)",
        laser: "var(--shadow-laser)",
        "laser-soft": "var(--shadow-laser-soft)",
        "laser-archive": "var(--shadow-laser-archive)",
        hotkey: "var(--shadow-hotkey)",
      },
      backdropBlur: {
        scrim: "2px",
        panel: "12px",
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
