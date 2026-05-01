import { Radio, RotateCcw, Download } from "lucide-react";
import { usePlayerStore } from "@/store";
import { loadAndPlay } from "@/player";
import { playlistApi } from "@/lib/api";
import { useState } from "react";

export function AiCommentBubble() {
  const commentaryHistory = usePlayerStore((s) => s.commentaryHistory);
  const hostName = usePlayerStore((s) => s.hostName);
  const [downloading, setDownloading] = useState<string | null>(null);

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

  if (commentaryHistory.length === 0) {
    return (
      <div className="w-full max-w-2xl">
        <div className="flex gap-3 px-4 py-3 rounded-card glass-card opacity-50">
          <div className="w-5 h-5 rounded-full bg-neon-cyan/20 flex items-center justify-center shrink-0 mt-0.5">
            <Radio className="w-3 h-3 text-neon-cyan" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-xs font-medium text-neon-cyan">{hostName}</span>
            <p className="text-sm text-text-disabled mt-1">等待 AI 主播口播...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl space-y-2.5 overflow-y-auto max-h-44 pr-1">
      {commentaryHistory.map((item) => (
        <div
          key={item.id}
          className="animate-fade-in-up flex gap-3 px-4 py-3 rounded-card glass-card border-l-2 border-neon-cyan"
        >
          <div className="w-5 h-5 rounded-full bg-neon-cyan/20 flex items-center justify-center shrink-0 mt-0.5">
            <Radio className="w-3 h-3 text-neon-cyan" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-neon-cyan">
                {item.host_name || hostName}
              </span>
              <span className="text-[10px] font-mono text-text-secondary">
                {new Date(item.timestamp).toLocaleTimeString("zh-CN")}
              </span>
            </div>
            <p className="text-sm text-text-primary leading-relaxed whitespace-pre-line">
              {item.content}
              {item.streaming && (
                <span className="inline-block w-0.5 h-4 bg-neon-cyan ml-0.5 animate-pulse align-text-bottom" />
              )}
            </p>
            {/* Online search results with download buttons */}
            {item.onlineResults && item.onlineResults.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {item.onlineResults.map((track: any) => (
                  <button
                    key={track.track_id}
                    onClick={() => handleDownloadAndPlay(track)}
                    disabled={downloading === track.track_id}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-neon-purple/10 border border-neon-purple/20 text-left hover:bg-neon-purple/20 transition-colors disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5 text-neon-purple shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-text-primary truncate">{track.title}</p>
                      <p className="text-[10px] text-text-secondary truncate">{track.artist}</p>
                    </div>
                    <span className="text-[10px] text-neon-purple shrink-0">
                      {downloading === track.track_id ? "下载中..." : "下载"}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="p-1 text-text-secondary hover:text-neon-cyan transition-colors duration-200 shrink-0 self-start mt-1">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
