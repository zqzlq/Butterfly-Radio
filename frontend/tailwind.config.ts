import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "#0A0A0F",
          card: "#12121A",
          secondary: "#1A1A28",
        },
        neon: {
          cyan: "#00F0FF",
          pink: "#FF006E",
          purple: "#7B61FF",
        },
        text: {
          primary: "#E8E8F0",
          secondary: "#8888A0",
          disabled: "#3A3A50",
        },
      },
      fontFamily: {
        sans: ["Inter", "Noto Sans SC", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Source Code Pro", "monospace"],
      },
      borderRadius: {
        card: "16px",
        capsule: "24px",
        input: "12px",
      },
      boxShadow: {
        neon: "0 4px 24px rgba(0, 240, 255, 0.08)",
        "neon-hover": "0 8px 32px rgba(0, 240, 255, 0.15)",
        "neon-glow": "0 0 12px rgba(0, 240, 255, 0.3)",
      },
      backdropBlur: {
        glass: "20px",
      },
      animation: {
        "pulse-neon": "pulseNeon 2s ease-in-out infinite",
        "fade-in-up": "fadeInUp 0.4s ease-out",
        "rotate-slow": "rotateSlow 8s linear infinite",
        spectrum: "spectrum 0.5s ease-in-out",
      },
      keyframes: {
        pulseNeon: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
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
      },
    },
  },
  plugins: [],
};

export default config;
