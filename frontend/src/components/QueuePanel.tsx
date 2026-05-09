import { X, Clock, Trash2 } from "lucide-react";
import { usePlayerStore } from "@/store";
import { cn } from "@/lib/cn";
import { formatTime } from "@/lib/utils";
import { loadAndPlay } from "@/player";
import { playlistApi } from "@/lib/api";

export function QueuePanel() {
  const queue = usePlayerStore((s) => s.queue);
  const currentSong = usePlayerStore((s) => s.currentSong);
  const toggleQueue = usePlayerStore((s) => s.toggleQueue);

  const currentIndex = queue.findIndex((s) => s.id === currentSong?.id);
  const remainingDuration = queue
    .slice(currentIndex + 1)
    .reduce((sum, s) => sum + s.duration, 0);

  const handlePlaySong = (song: typeof queue[0]) => {
    loadAndPlay(song);
  };

  const handleDeleteSong = async (e: React.MouseEvent, song: typeof queue[0]) => {
    e.stopPropagation();
    try {
      await playlistApi.deleteSong(song.id);
      const store = usePlayerStore.getState();
      const newQueue = store.queue.filter((s) => s.id !== song.id);
      store.setQueue(newQueue);
      if (currentSong?.id === song.id) {
        const { stopPlayback } = await import("@/player");
        stopPlayback();
      }
    } catch (err) {
      console.error("删除歌曲失败:", err);
    }
  };

  return (
    <div className="absolute right-0 top-0 bottom-0 w-80 z-40 flex flex-col animate-fade-in-up overflow-hidden"
      style={{ background: "linear-gradient(180deg, var(--surface-panel-from) 0%, var(--surface-panel-to) 100%)", borderLeft: "1px solid color-mix(in srgb, var(--accent) 10%, transparent)" }}
    >
      {/* Left edge glow */}
      <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-accent/20 via-accent/5 to-accent/10" />

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
        <div>
          <h3 className="text-sm font-bold text-text-primary uppercase tracking-[0.15em]">Queue</h3>
          <p className="text-[11px] text-text-secondary mt-0.5 font-mono font-digital tracking-wider">{queue.length} tracks</p>
        </div>
        <button
          onClick={toggleQueue}
          className="p-1.5 text-text-secondary hover:text-accent transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Song list */}
      <div className="flex-1 overflow-y-auto">
        {queue.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-text-disabled">
            <span className="text-2xl opacity-30">&#9835;</span>
            <span className="text-sm tracking-wider">队列为空</span>
          </div>
        ) : (
          queue.map((song, index) => {
            const isCurrent = currentSong?.id === song.id;
            return (
              <div
                key={song.id}
                onClick={() => handlePlaySong(song)}
                className={cn(
                  "group w-full flex items-center gap-3 px-5 py-3 border-b border-border-subtle/30 text-left transition-all duration-200 cursor-pointer",
                  isCurrent
                    ? "bg-accent/[0.06] border-l-2 border-l-accent"
                    : "hover:bg-white/[0.02] border-l-2 border-l-transparent active:bg-white/[0.04]"
                )}
              >
                {/* Index */}
                <span className={cn(
                  "text-[11px] font-mono font-digital w-5 text-center shrink-0",
                  isCurrent ? "text-accent" : "text-text-disabled"
                )}>
                  {isCurrent ? (
                    <span className="flex items-center justify-center gap-[2px]">
                      <span className="w-[3px] h-2.5 bg-accent rounded-full animate-spectrum" />
                      <span className="w-[3px] h-3.5 bg-accent rounded-full animate-spectrum" style={{ animationDelay: "0.1s" }} />
                      <span className="w-[3px] h-2 bg-accent rounded-full animate-spectrum" style={{ animationDelay: "0.2s" }} />
                    </span>
                  ) : (
                    index + 1
                  )}
                </span>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-sm truncate",
                    isCurrent ? "text-accent font-medium" : "text-text-primary"
                  )}>
                    {song.title}
                  </p>
                  <p className="text-[11px] text-text-secondary truncate">{song.artist}</p>
                </div>

                {/* Duration & Delete */}
                <span className="font-mono font-digital text-[11px] text-text-secondary shrink-0 tracking-wider">
                  {formatTime(song.duration)}
                </span>
                <button
                  onClick={(e) => handleDeleteSong(e, song)}
                  className="p-1 text-text-disabled hover:text-danger transition-colors opacity-0 group-hover:opacity-100"
                  title="删除"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      {queue.length > 0 && (
        <div className="px-5 py-3 border-t border-border-subtle flex items-center gap-1.5 text-[11px] text-text-secondary">
          <Clock className="w-3 h-3 shrink-0" />
          <span className="font-mono font-digital tracking-wider">剩余：{formatTime(remainingDuration)}</span>
        </div>
      )}
    </div>
  );
}
