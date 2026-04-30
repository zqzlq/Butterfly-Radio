import { useState, type KeyboardEvent } from "react";
import { Send, Music, Mic } from "lucide-react";
import { usePlayerStore } from "@/store";
import { interactionApi } from "@/lib/api";

export function InteractionBar() {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const addInteraction = usePlayerStore((s) => s.addInteraction);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;

    setSending(true);
    setInput("");

    try {
      const isCommand = text.startsWith("/点歌") || text.startsWith("/song");
      const type = isCommand ? "song_request" : "message";
      const result = await interactionApi.send(text, type);
      addInteraction(result);
    } catch (err) {
      console.error("发送失败:", err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex items-center gap-3 px-6 h-14 glass-panel shrink-0">
      {/* Message input */}
      <div className="flex-1 relative">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder='说点什么... 或输入 /点歌 歌名'
          className="w-full h-9 px-4 rounded-input bg-bg-secondary text-sm text-text-primary placeholder:text-text-disabled border border-transparent focus:border-neon-cyan focus:shadow-neon-glow outline-none transition-all duration-200"
        />
      </div>

      {/* Send */}
      <button
        onClick={handleSend}
        disabled={!input.trim() || sending}
        className="w-8 h-8 rounded-full bg-neon-cyan flex items-center justify-center text-bg-primary disabled:opacity-40 hover:shadow-neon-glow active:scale-95 transition-all duration-200"
      >
        <Send className="w-3.5 h-3.5" />
      </button>

      {/* Song request */}
      <button className="w-8 h-8 rounded-full bg-neon-purple flex items-center justify-center text-white hover:shadow-[0_0_12px_rgba(123,97,255,0.3)] active:scale-95 transition-all duration-200">
        <Music className="w-3.5 h-3.5" />
      </button>

      {/* Voice */}
      <button className="w-8 h-8 rounded-full bg-neon-pink flex items-center justify-center text-white hover:shadow-[0_0_12px_rgba(255,0,110,0.3)] active:scale-95 transition-all duration-200">
        <Mic className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
