import { useState, useRef, useEffect } from "react";
import { Send, Music, Mic } from "lucide-react";
import { usePlayerStore } from "@/store";
import { interactionApi, aiApi, playlistApi } from "@/lib/api";
import { markPendingInteraction } from "@/socket";
import { loadAndPlay } from "@/player";

// Web Speech API type declarations
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

const SpeechRecognitionAPI =
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

const SONG_REQUEST_PATTERNS = [
  /(?:我想听|我想听一首|来一首|来首|点一首|点首|播放|放一首|放首|听一首|听首|来个|放个|听个)\s*(.+)/,
  /(.+?)(?:这首歌|这首|这首歌吧|来一下|安排一下)/,
];

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

function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

interface SearchResult {
  song: any;
  matchType: "exact" | "partial" | "artist" | "fuzzy";
  suggestion?: string;
}

function findSongInQueue(
  queue: { title: string; artist: string; [key: string]: any }[],
  query: string
): SearchResult | null {
  const q = query.toLowerCase();

  const exact = queue.find((s) => s.title.toLowerCase() === q);
  if (exact) return { song: exact, matchType: "exact" };

  const partial = queue.find((s) => s.title.toLowerCase().includes(q));
  if (partial) return { song: partial, matchType: "partial" };

  const artist = queue.find((s) => s.artist.toLowerCase().includes(q));
  if (artist) return { song: artist, matchType: "artist" };

  let bestSong: any = null;
  let bestScore = 0;
  for (const song of queue) {
    const titleScore = similarity(q, song.title.toLowerCase());
    const artistScore = similarity(q, song.artist.toLowerCase()) * 0.8;
    const score = Math.max(titleScore, artistScore);
    if (score > bestScore) {
      bestScore = score;
      bestSong = song;
    }
  }

  if (bestSong && bestScore >= 0.5) {
    return { song: bestSong, matchType: "fuzzy", suggestion: bestSong.title };
  }

  return null;
}

export function InteractionBar() {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const inputRef = useRef("");
  const isPTTRef = useRef(false);
  const addInteraction = usePlayerStore((s) => s.addInteraction);
  const addCommentary = usePlayerStore((s) => s.addCommentary);
  const queue = usePlayerStore((s) => s.queue);
  const streamingEnabled = usePlayerStore((s) => s.streamingEnabled);

  const setInputAndRef = (val: string) => {
    inputRef.current = val;
    setInput(val);
  };

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === "KeyV" && !e.repeat && !isListening) {
        isPTTRef.current = true;
        startListening();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "KeyV" && isPTTRef.current && isListening) {
        isPTTRef.current = false;
        stopListening();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isListening]);

  useEffect(() => {
    const handleGlobalVoice = (_event: any, action: string) => {
      if (action === "start") {
        isPTTRef.current = false;
        startListening();
      } else if (action === "stop") {
        stopListening();
      } else if (action === "toggle") {
        toggleVoiceInput();
      }
    };
    // @ts-ignore
    window.electronAPI?.onGlobalVoice?.(handleGlobalVoice);
    return () => {
      // @ts-ignore
      window.electronAPI?.removeGlobalVoiceListener?.();
    };
  }, [isListening]);

  const startListening = () => {
    if (!SpeechRecognitionAPI) {
      addCommentary({
        id: Date.now().toString(),
        content: "当前浏览器不支持语音输入，请使用 Chrome 或 Edge 浏览器。",
        context: "system",
        host_name: usePlayerStore.getState().hostName,
        timestamp: Date.now(),
      });
      return;
    }

    if (isListening) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = "zh-CN";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setInputAndRef("");
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      const text = finalTranscript || interimTranscript;
      setInputAndRef(text);
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
      const text = inputRef.current.trim();
      if (text) {
        setTimeout(() => handleSendDirect(text), 100);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
      recognitionRef.current = null;

      if (event.error === "not-allowed") {
        addCommentary({
          id: Date.now().toString(),
          content: "麦克风权限被拒绝，请在浏览器设置中允许麦克风访问。",
          context: "system",
          host_name: usePlayerStore.getState().hostName,
          timestamp: Date.now(),
        });
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const toggleVoiceInput = () => {
    if (isListening) {
      stopListening();
    } else {
      isPTTRef.current = false;
      startListening();
    }
  };

  const searchOnlineAndShow = async (songName: string) => {
    try {
      const { results } = await playlistApi.searchOnline(songName, 3);
      if (results.length === 0) {
        addCommentary({
          id: Date.now().toString(),
          content: `在 Jamendo 也没有找到「${songName}」的相关结果。`,
          context: "song_request",
          host_name: usePlayerStore.getState().hostName,
          timestamp: Date.now(),
        });
        return;
      }
      const list = results.map((r: any, i: number) => `${i + 1}. ${r.title} — ${r.artist}`).join("\n");
      addCommentary({
        id: Date.now().toString(),
        content: `本地没有「${songName}」，在 Jamendo 找到以下免费音乐：\n${list}\n\n点击下方按钮下载播放。`,
        context: "song_request",
        host_name: usePlayerStore.getState().hostName,
        timestamp: Date.now(),
        onlineResults: results,
      });
    } catch (e: any) {
      addCommentary({
        id: Date.now().toString(),
        content: `本地没有「${songName}」。在线搜索暂不可用（${e.message || "请检查 Jamendo 配置"}）。`,
        context: "song_request",
        host_name: usePlayerStore.getState().hostName,
        timestamp: Date.now(),
      });
    }
  };

  const handleSendDirect = async (text: string) => {
    if (!text || sending) return;
    setInputAndRef("");
    setSending(true);
    try {
      await processMessage(text);
    } finally {
      setSending(false);
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInputAndRef("");
    setSending(true);
    try {
      await processMessage(text);
    } finally {
      setSending(false);
    }
  };

  const processMessage = async (text: string) => {
    try {
      if (text.startsWith("/点歌") || text.startsWith("/song")) {
        const songName = text.replace(/^\/(点歌|song)\s*/, "").trim();
        if (songName) {
          const found = findSongInQueue(queue, songName);

          if (found) {
            // Local match — add interaction locally, no backend call
            addInteraction({
              id: Date.now().toString(),
              content: text,
              interaction_type: "song_request",
              created_at: new Date().toISOString(),
              receivedAt: Date.now(),
            });
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
            // Not found locally — send to backend, let socket broadcast handle interaction display
            interactionApi.send(text, "song_request").catch(() => {});
            await searchOnlineAndShow(songName);
          }
        }
        return;
      }

      const songName = extractSongRequest(text);
      if (songName) {
        const found = findSongInQueue(queue, songName);

        if (found) {
          // Local match — add interaction locally
          addInteraction({
            id: Date.now().toString(),
            content: text,
            interaction_type: "song_request",
            created_at: new Date().toISOString(),
          });
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
          // Not found — send to backend, let socket broadcast handle interaction display
          interactionApi.send(text, "song_request").catch(() => {});
          await searchOnlineAndShow(songName);
        }
        return;
      }

      // Add user message locally first — guaranteed earlier timestamp than AI response
      const now = Date.now();
      addInteraction({
        id: `local-${now}`,
        content: text,
        interaction_type: "message",
        created_at: new Date(now).toISOString(),
        receivedAt: now,
      });
      markPendingInteraction(text);

      interactionApi.send(text, "message").catch(() => {});
      aiApi.generateCommentary("chat_response", undefined, text, streamingEnabled).catch(() => {});
    } catch (err) {
      console.error("发送失败:", err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isCommand = input.startsWith("/点歌") || input.startsWith("/song");

  return (
    <div className="relative flex items-center gap-3 px-6 h-14 surface-panel shrink-0">
      {/* Top gradient edge */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/15 to-transparent" />

      {/* Message input */}
      <div className="flex-1 relative">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isListening ? "正在聆听..." : "说点什么... (按住 V 说话，Alt+V 全局语音)"}
          className="w-full h-9 px-4 rounded-lg bg-bg-secondary/80 text-sm text-text-primary placeholder:text-text-disabled border border-border-subtle focus:border-accent/40 outline-none transition-all duration-200 font-mono"
        />
        {/* Command hint */}
        {isCommand && input.replace(/^\/(点歌|song)\s*/, "").trim().length > 0 && (
          <div className="absolute -top-8 left-0 right-0 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent/[0.08] border border-accent/15 text-xs text-accent">
            <Music className="w-3 h-3" />
            <span className="tracking-wide">点歌模式：搜索「{input.replace(/^\/(点歌|song)\s*/, "").trim()}」</span>
          </div>
        )}
      </div>

      {/* Send */}
      <button
        onClick={handleSend}
        disabled={!input.trim() || sending}
        className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-bg-primary disabled:opacity-30 hover:shadow-glow-strong active:scale-95 transition-all duration-200"
      >
        <Send className="w-3.5 h-3.5" />
      </button>

      {/* Song request quick button */}
      <button
        onClick={() => setInput("/点歌 ")}
        className="w-8 h-8 rounded-full bg-accent/[0.08] border border-accent/15 flex items-center justify-center text-accent hover:bg-accent/15 active:scale-95 transition-all duration-200"
        title="点歌"
      >
        <Music className="w-3.5 h-3.5" />
      </button>

      {/* Voice */}
      {SpeechRecognitionAPI && (
        <button
          onClick={toggleVoiceInput}
          className={`w-8 h-8 rounded-full flex items-center justify-center text-bg-primary active:scale-95 transition-all duration-200 ${
            isListening
              ? "bg-danger animate-pulse shadow-[0_0_12px_rgba(255,51,51,0.3)]"
              : "bg-accent/80 hover:bg-accent hover:shadow-glow"
          }`}
          title={isListening ? "停止录音" : "语音输入"}
        >
          <Mic className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
