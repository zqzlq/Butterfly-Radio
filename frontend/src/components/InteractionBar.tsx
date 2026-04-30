import { Send, Music, Mic } from "lucide-react";

export function InteractionBar() {
  return (
    <div className="flex items-center gap-3 px-6 h-16 glass-panel shrink-0">
      {/* Message input */}
      <div className="flex-1 relative">
        <input
          type="text"
          placeholder='说点什么... 或输入 /点歌 歌名'
          className="w-full h-10 px-4 rounded-input bg-bg-secondary text-sm text-text-primary placeholder:text-text-disabled border border-transparent focus:border-neon-cyan focus:shadow-neon-glow outline-none transition-all duration-200"
        />
      </div>

      {/* Send */}
      <button className="w-9 h-9 rounded-full bg-neon-cyan flex items-center justify-center text-bg-primary hover:shadow-neon-glow transition-shadow duration-200">
        <Send className="w-4 h-4" />
      </button>

      {/* Song request */}
      <button className="w-9 h-9 rounded-full bg-neon-purple flex items-center justify-center text-white hover:shadow-[0_0_12px_rgba(123,97,255,0.3)] transition-shadow duration-200">
        <Music className="w-4 h-4" />
      </button>

      {/* Voice */}
      <button className="w-9 h-9 rounded-full bg-neon-pink flex items-center justify-center text-white hover:shadow-[0_0_12px_rgba(255,0,110,0.3)] transition-shadow duration-200">
        <Mic className="w-4 h-4" />
      </button>
    </div>
  );
}
