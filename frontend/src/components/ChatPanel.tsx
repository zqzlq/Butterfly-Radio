import { useEffect, useRef } from "react";
import { Radio, User, Download, RotateCcw } from "lucide-react";
import { usePlayerStore, type AiCommentary } from "@/store";
import { loadAndPlay } from "@/player";
import { playlistApi } from "@/lib/api";
import { useState } from "react";

interface ChatMessage {
  id: string;
  type: "ai" | "user";
  content: string;
  timestamp: number;
  streaming?: boolean;
  onlineResults?: any[];
  hostName?: string;
}

function mergeMessages(commentary: AiCommentary[], interactions: any[]): ChatMessage[] {
  const msgs: ChatMessage[] = [];

  for (const c of commentary) {
    msgs.push({
      id: c.id,
      type: "ai",
      content: c.content,
      timestamp: c.timestamp,
      streaming: c.streaming,
      onlineResults: c.onlineResults,
      hostName: c.host_name,
    });
  }

  for (const i of interactions) {
    msgs.push({
      id: i.id || `user-${Date.now()}`,
      type: "user",
      content: i.content || "",
      timestamp: i.receivedAt || (i.created_at ? new Date(i.created_at).getTime() : Date.now()),
    });
  }

  msgs.sort((a, b) => a.timestamp - b.timestamp);
  return msgs.slice(-12);
}

export function ChatPanel() {
  const commentaryHistory = usePlayerStore((s) => s.commentaryHistory);
  const interactions = usePlayerStore((s) => s.interactions);
  const hostName = usePlayerStore((s) => s.hostName);
  const [downloading, setDownloading] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const messages = mergeMessages(commentaryHistory, interactions);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const handleDownloadAndPlay = async (track: any) => {
    setDownloading(track.track_id);
    try {
      const song = await playlistApi.downloadTrack({
        source: track.source,
        track_id: track.track_id,
        title: track.title,
        artist: track.artist,
        url: track.url,
      });
      const allSongs = await playlistApi.listSongs();
      usePlayerStore.getState().setQueue(allSongs);
      loadAndPlay(song);
    } catch (e) {
      console.error("Download failed:", e);
    } finally {
      setDownloading(null);
    }
  };

  if (messages.length === 0) {
    return (
      <div className="w-full max-w-2xl">
        <div className="flex gap-3 px-4 py-3 rounded-xl surface-card opacity-40">
          <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
            <Radio className="w-3 h-3 text-accent/60" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-medium text-accent/60 uppercase tracking-widest">{hostName}</span>
            <p className="text-sm text-text-disabled mt-1">等待信号接入...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="w-full max-w-2xl space-y-2 overflow-y-auto max-h-52 pr-1 scroll-smooth">
      {messages.map((msg) => (
        msg.type === "ai"
          ? <AiBubble key={msg.id} msg={msg} hostName={hostName} downloading={downloading} onDownload={handleDownloadAndPlay} />
          : <UserBubble key={msg.id} msg={msg} />
      ))}
    </div>
  );
}

function AiBubble({
  msg,
  hostName,
  downloading,
  onDownload,
}: {
  msg: ChatMessage;
  hostName: string;
  downloading: string | null;
  onDownload: (track: any) => void;
}) {
  return (
    <div className="flex gap-3 justify-start chat-slide-left">
      <div className="w-6 h-6 rounded-full bg-accent/15 flex items-center justify-center shrink-0 mt-1 ring-1 ring-accent/20">
        <Radio className="w-3 h-3 text-accent" />
      </div>
      <div className="max-w-[85%]">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-medium text-accent uppercase tracking-widest">
            {msg.hostName || hostName}
          </span>
          <span className="text-[9px] font-mono font-digital text-text-disabled">
            {new Date(msg.timestamp).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
        <div className="relative px-3.5 py-2.5 rounded-2xl rounded-tl-sm bg-accent/[0.06] border border-accent/[0.1]">
          <p className="text-sm text-text-primary leading-relaxed whitespace-pre-line">
            {msg.content}
            {msg.streaming && (
              <span className="inline-block w-0.5 h-3.5 bg-accent ml-0.5 animate-pulse align-text-bottom" />
            )}
          </p>
          {/* Online search results */}
          {msg.onlineResults && msg.onlineResults.length > 0 && (
            <div className="mt-2.5 space-y-1.5">
              {msg.onlineResults.map((track: any) => (
                <button
                  key={track.track_id}
                  onClick={() => onDownload(track)}
                  disabled={downloading === track.track_id}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/[0.08] border border-accent/10 text-left hover:bg-accent/[0.12] transition-colors disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5 text-accent shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-text-primary truncate">{track.title}</p>
                    <p className="text-[10px] text-text-secondary truncate">{track.artist}</p>
                  </div>
                  <span className="text-[10px] text-accent shrink-0 font-mono">
                    {downloading === track.track_id ? "..." : "下载"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <button className="p-1 text-text-disabled hover:text-accent transition-colors shrink-0 self-start mt-1 opacity-0 group-hover:opacity-100">
        <RotateCcw className="w-3 h-3" />
      </button>
    </div>
  );
}

function UserBubble({ msg }: { msg: ChatMessage }) {
  return (
    <div className="flex gap-3 justify-end chat-slide-right">
      <div className="max-w-[75%]">
        <div className="flex items-center gap-2 mb-1 justify-end">
          <span className="text-[9px] font-mono font-digital text-text-disabled">
            {new Date(msg.timestamp).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
          </span>
          <span className="text-[10px] font-medium text-text-secondary uppercase tracking-widest">你</span>
        </div>
        <div className="px-3.5 py-2.5 rounded-2xl rounded-tr-sm bg-white/[0.06] border border-white/[0.08]">
          <p className="text-sm text-text-primary leading-relaxed">{msg.content}</p>
        </div>
      </div>
      <div className="w-6 h-6 rounded-full bg-white/[0.08] flex items-center justify-center shrink-0 mt-1 ring-1 ring-white/[0.1]">
        <User className="w-3 h-3 text-text-secondary" />
      </div>
    </div>
  );
}
