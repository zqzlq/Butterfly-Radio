import { Radio, RotateCcw } from "lucide-react";

export function AiCommentBubble() {
  return (
    <div className="w-full max-w-2xl space-y-3 overflow-y-auto max-h-48">
      {/* Example bubble */}
      <div className="animate-fade-in-up flex gap-3 px-4 py-3 rounded-card bg-bg-card/60 border-l-2 border-neon-cyan">
        <div className="w-5 h-5 rounded-full bg-neon-cyan/20 flex items-center justify-center shrink-0 mt-0.5">
          <Radio className="w-3 h-3 text-neon-cyan" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-neon-cyan">DJ Butterfly</span>
            <span className="text-[10px] font-mono text-text-secondary">00:00:00</span>
          </div>
          <p className="text-sm text-text-primary leading-relaxed">
            欢迎来到 Butterfly Radio，你的专属 AI 电台。接下来为你带来一段美妙的音乐旅程...
          </p>
        </div>
        <button className="p-1 text-text-secondary hover:text-neon-cyan transition-colors duration-200 shrink-0">
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
