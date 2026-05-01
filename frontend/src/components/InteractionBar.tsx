import { useState, type KeyboardEvent } from "react";
import { Send, Music, Mic } from "lucide-react";
import { usePlayerStore } from "@/store";
import { interactionApi, aiApi, playlistApi } from "@/lib/api";
import { loadAndPlay } from "@/player";

/** Keywords that indicate a song request in natural language */
const SONG_REQUEST_PATTERNS = [
  /(?:我想听|我想听一首|来一首|来首|点一首|点首|播放|放一首|放首|听一首|听首|来个|放个|听个)\s*(.+)/,
  /(.+?)(?:这首歌|这首|这首歌吧|来一下|安排一下)/,
];

/**
 * Try to extract a song name from natural language text.
 * Returns the song name if detected, or null if not a song request.
 */
function extractSongRequest(text: string): string | null {
  for (const pattern of SONG_REQUEST_PATTERNS) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const name = match[1].trim().replace(/[，。！？,.!?]$/g, "");
      if (name.length >= 1 && name.length <= 30) {
        return name;
      }
    }
  }
  return null;
}

/**
 * Levenshtein distance between two strings.
 */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return dp[m][n];
}

/**
 * Similarity score between two strings (0~1, higher = more similar).
 */
function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

/**
 * Search result with match type.
 */
interface SearchResult {
  song: any;
  matchType: "exact" | "partial" | "artist" | "fuzzy";
  suggestion?: string; // If fuzzy matched, the original title
}

/**
 * Search the local queue for a matching song. Supports exact, partial,
 * artist, and fuzzy (typo-tolerant) matching.
 */
function findSongInQueue(
  queue: { title: string; artist: string; [key: string]: any }[],
  query: string
): SearchResult | null {
  const q = query.toLowerCase();

  // 1. Exact title match
  const exact = queue.find((s) => s.title.toLowerCase() === q);
  if (exact) return { song: exact, matchType: "exact" };

  // 2. Partial title match
  const partial = queue.find((s) => s.title.toLowerCase().includes(q));
  if (partial) return { song: partial, matchType: "partial" };

  // 3. Artist match
  const artist = queue.find((s) => s.artist.toLowerCase().includes(q));
  if (artist) return { song: artist, matchType: "artist" };

  // 4. Fuzzy match (typo tolerance)
  let bestSong: any = null;
  let bestScore = 0;
  for (const song of queue) {
    const titleScore = similarity(q, song.title.toLowerCase());
    const artistScore = similarity(q, song.artist.toLowerCase()) * 0.8; // lower weight
    const score = Math.max(titleScore, artistScore);
    if (score > bestScore) {
      bestScore = score;
      bestSong = song;
    }
  }

  // Threshold: at least 50% similar
  if (bestSong && bestScore >= 0.5) {
    return { song: bestSong, matchType: "fuzzy", suggestion: bestSong.title };
  }

  return null;
}

export function InteractionBar() {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const addInteraction = usePlayerStore((s) => s.addInteraction);
  const addCommentary = usePlayerStore((s) => s.addCommentary);
  const queue = usePlayerStore((s) => s.queue);
  const streamingEnabled = usePlayerStore((s) => s.streamingEnabled);

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
          addInteraction({
            id: Date.now().toString(),
            content: text,
            interaction_type: "song_request",
            created_at: new Date().toISOString(),
          });

          const found = findSongInQueue(queue, songName);

          if (found) {
            loadAndPlay(found.song);
            const hint = found.matchType === "fuzzy" ? `（没找到精确匹配，为你播放近似歌曲）` : "";
            addCommentary({
              id: Date.now().toString(),
              content: `收到点歌请求，${hint}为你播放「${found.song.title}」。`,
              context: "song_request",
              host_name: usePlayerStore.getState().hostName,
              timestamp: Date.now(),
            });
          } else {
            const result = await interactionApi.send(text, "song_request");
            addInteraction(result);
            addCommentary({
              id: Date.now().toString(),
              content: `收到点歌请求「${songName}」，在本地曲库中未找到匹配歌曲。`,
              context: "song_request",
              host_name: usePlayerStore.getState().hostName,
              timestamp: Date.now(),
            });
          }
        }
        return;
      }

      // Natural language: detect song request intent
      const songName = extractSongRequest(text);
      if (songName) {
        addInteraction({
          id: Date.now().toString(),
          content: text,
          interaction_type: "song_request",
          created_at: new Date().toISOString(),
        });

        const found = findSongInQueue(queue, songName);

        if (found) {
          loadAndPlay(found.song);
          const hint = found.matchType === "fuzzy" ? `（没找到精确匹配，为你播放近似歌曲）` : "";
          addCommentary({
            id: Date.now().toString(),
            content: `${hint}为你播放「${found.song.title}」— ${found.song.artist}。`,
            context: "song_request",
            host_name: usePlayerStore.getState().hostName,
            timestamp: Date.now(),
          });
        } else {
          // Not found locally, send to AI for commentary
          interactionApi.send(text, "message").catch(() => {});
          aiApi.generateCommentary("chat_response", undefined, `用户想听「${songName}」，但本地曲库中没有这首歌`, streamingEnabled).catch(() => {});
        }
        return;
      }

      // Regular message
      addInteraction({
        id: Date.now().toString(),
        content: text,
        interaction_type: "message",
        created_at: new Date().toISOString(),
      });

      interactionApi.send(text, "message").catch(() => {});
      aiApi.generateCommentary("chat_response", undefined, text, streamingEnabled).catch(() => {});
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
