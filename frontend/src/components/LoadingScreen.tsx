import { Radio } from "lucide-react";

export function LoadingScreen() {
  return (
    <div className="h-screen w-screen bg-bg-primary flex flex-col items-center justify-center gap-6">
      {/* Logo */}
      <div className="relative">
        <Radio className="w-16 h-16 text-neon-cyan animate-pulse-neon" />
        <div className="absolute inset-0 w-16 h-16 rounded-full bg-neon-cyan/10 blur-xl animate-pulse-neon" />
      </div>

      {/* Title */}
      <h1 className="text-xl font-bold text-text-primary tracking-wide">
        Butterfly Radio
      </h1>

      {/* Progress bar */}
      <div className="w-48 h-[2px] bg-text-disabled rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-neon-cyan to-neon-purple"
          style={{
            animation: "loading-progress 2s ease-in-out infinite",
          }}
        />
      </div>

      {/* Status text */}
      <p className="text-xs text-text-secondary tracking-wider">
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
