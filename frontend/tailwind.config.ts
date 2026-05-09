import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "var(--bg-primary)",
          card: "var(--bg-card)",
          secondary: "var(--bg-secondary)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          bright: "var(--accent-bright)",
          dim: "var(--accent-dim)",
        },
        danger: {
          DEFAULT: "var(--danger)",
        },
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          disabled: "var(--text-disabled)",
        },
        border: {
          subtle: "var(--border-subtle)",
          light: "var(--border-light)",
        },
      },
      fontFamily: {
        sans: ["Inter", "Noto Sans SC", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Source Code Pro", "monospace"],
        digital: ["JetBrains Mono", "Source Code Pro", "monospace"],
      },
      borderRadius: {
        card: "12px",
        capsule: "24px",
        input: "8px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0, 0, 0, 0.4)",
        glow: "0 0 8px color-mix(in srgb, var(--accent) 15%, transparent)",
        "glow-strong": "0 0 16px color-mix(in srgb, var(--accent) 25%, transparent)",
      },
      animation: {
        "fade-in-up": "fadeInUp 0.4s ease-out",
        "rotate-slow": "rotateSlow 8s linear infinite",
        spectrum: "spectrum 0.5s ease-in-out",
        "pulse-green": "pulseGreen 2s ease-in-out infinite",
      },
      keyframes: {
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        rotateSlow: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        spectrum: {
          "0%, 100%": { transform: "scaleY(0.3)" },
          "50%": { transform: "scaleY(1)" },
        },
        pulseGreen: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
