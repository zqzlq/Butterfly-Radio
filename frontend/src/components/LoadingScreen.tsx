import { Radio } from "lucide-react";

export function LoadingScreen() {
  return (
    <div className="h-screen w-screen bg-bg-primary flex flex-col items-center justify-center gap-8 relative overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 sci-fi-grid opacity-50" />

      {/* Radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 40% 40% at 50% 50%, color-mix(in srgb, var(--accent) 6%, transparent) 0%, transparent 70%)",
        }}
      />

      {/* Logo */}
      <div className="relative z-10">
        <div className="relative">
          <Radio className="w-14 h-14 text-accent animate-pulse-green" />
          <div className="absolute inset-0 w-14 h-14 rounded-full bg-accent/15 blur-xl animate-pulse-green" />
        </div>
      </div>

      {/* Title */}
      <div className="relative z-10 text-center">
        <h1 className="text-lg font-bold text-text-primary tracking-[0.3em] uppercase">
          Butterfly Radio
        </h1>
        <p className="text-[10px] text-accent/50 tracking-[0.2em] uppercase mt-2">
          Initializing System
        </p>
      </div>

      {/* Progress bar */}
      <div className="relative z-10 w-48">
        <div className="h-[1px] bg-border-subtle rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-accent"
            style={{
              animation: "loading-progress 2s ease-in-out infinite",
              boxShadow: "0 0 8px color-mix(in srgb, var(--accent) 40%, transparent)",
            }}
          />
        </div>
      </div>

      {/* Status text */}
      <p className="relative z-10 text-[10px] text-text-disabled tracking-widest uppercase font-mono">
        正在启动 AI 电台引擎...
      </p>

      <style>{`
        @keyframes loading-progress {
          0% { width: 0%; margin-left: 0; }
          50% { width: 60%; margin-left: 20%; }
          100% { width: 0%; margin-left: 100%; }
        }
      `}</style>
    </div>
  );
}
