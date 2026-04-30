import { useState, type KeyboardEvent } from "react";
import { Send, Music, Mic } from "lucide-react";
import { usePlayerStore } from "@/store";
import { interactionApi, playlistApi } from "@/lib/api";
import { loadAndPlay } from "@/player";

export function InteractionBar() {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const addInteraction = usePlayerStore((s) => s.addInteraction);
  const addCommentary = usePlayerStore((s) => s.addCommentary);
  const queue = usePlayerStore((s) => s.queue);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;

    setSending(true);
    setInput("");

    try {
      // Parse /点歌 command
      if (text.startsWith("/点歌") || text.startsWith("/song")) {
        const songName = text.replace(/^\/(点歌|song)\s*/, "").trim();
        if (songName) {
          // Add user interaction to UI
          addInteraction({
            id: Date.now().toString(),
            content: text,
            interaction_type: "song_request",
            created_at: new Date().toISOString(),
          });

          // Search for song in queue first
          const found = queue.find(
            (s) =>
              s.title.toLowerCase().includes(songName.toLowerCase()) ||
              s.artist.toLowerCase().includes(songName.toLowerCase())
          );

          if (found) {
            loadAndPlay(found);
            addCommentary({
              id: Date.now().toString(),
              content: `收到点歌请求，为你播放「${found.title}」。`,
              context: "song_request",
              host_name: usePlayerStore.getState().hostName,
              timestamp: Date.now(),
            });
          } else {
            // Send to backend for processing
            const result = await interactionApi.send(text, "song_request");
            addInteraction(result);
            addCommentary({
              id: Date.now().toString(),
              content: `收到点歌请求「${songName}」，正在搜索...`,
              context: "song_request",
              host_name: usePlayerStore.getState().hostName,
              timestamp: Date.now(),
            });
          }
        }
      } else {
        // Regular message
        addInteraction({
          id: Date.now().toString(),
          content: text,
          interaction_type: "message",
          created_at: new Date().toISOString(),
        });

        const result = await interactionApi.send(text, "message");
        if (result.ai_response) {
          addCommentary({
            id: Date.now().toString(),
            content: result.ai_response,
            context: "chat_response",
            host_name: usePlayerStore.getState().hostName,
            timestamp: Date.now(),
          });
        }
      }
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

  const isCommand = input.startsWith("/点歌") || input.startsWith("/song");

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
        {/* Command hint */}
        {isCommand && input.replace(/^\/(点歌|song)\s*/, "").trim().length > 0 && (
          <div className="absolute -top-8 left-0 right-0 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neon-purple/15 border border-neon-purple/30 text-xs text-neon-purple">
            <Music className="w-3 h-3" />
            <span>点歌模式：搜索「{input.replace(/^\/(点歌|song)\s*/, "").trim()}」</span>
          </div>
        )}
      </div>

      {/* Send */}
      <button
        onClick={handleSend}
        disabled={!input.trim() || sending}
        className="w-8 h-8 rounded-full bg-neon-cyan flex items-center justify-center text-bg-primary disabled:opacity-40 hover:shadow-neon-glow active:scale-95 transition-all duration-200"
      >
        <Send className="w-3.5 h-3.5" />
      </button>

      {/* Song request quick button */}
      <button
        onClick={() => setInput("/点歌 ")}
        className="w-8 h-8 rounded-full bg-neon-purple flex items-center justify-center text-white hover:shadow-[0_0_12px_rgba(123,97,255,0.3)] active:scale-95 transition-all duration-200"
        title="点歌"
      >
        <Music className="w-3.5 h-3.5" />
      </button>

      {/* Voice */}
      <button
        className="w-8 h-8 rounded-full bg-neon-pink flex items-center justify-center text-white hover:shadow-[0_0_12px_rgba(255,0,110,0.3)] active:scale-95 transition-all duration-200"
        title="语音输入"
      >
        <Mic className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
