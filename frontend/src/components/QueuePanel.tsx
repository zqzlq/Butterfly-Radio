import { X, Clock } from "lucide-react";
import { usePlayerStore } from "@/store";
import { cn } from "@/lib/cn";
import { formatTime } from "@/lib/utils";

export function QueuePanel() {
  const queue = usePlayerStore((s) => s.queue);
  const queueIndex = usePlayerStore((s) => s.queueIndex);
  const currentSong = usePlayerStore((s) => s.currentSong);
  const toggleQueue = usePlayerStore((s) => s.toggleQueue);

  const remainingDuration = queue
    .slice(queueIndex + 1)
    .reduce((sum, s) => sum + s.duration, 0);

  return (
    <div className="absolute right-0 top-0 bottom-0 w-80 glass-card z-40 flex flex-col animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
        <div>
          <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">Queue</h3>
          <p className="text-[11px] text-text-secondary mt-0.5">{queue.length} 首歌曲</p>
        </div>
        <button
          onClick={toggleQueue}
          className="p-1.5 text-text-secondary hover:text-text-primary transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Song list */}
      <div className="flex-1 overflow-y-auto">
        {queue.length === 0 ? (
          <div className="flex items-center justify-center h-full text-text-disabled text-sm">
            队列为空
          </div>
        ) : (
          queue.map((song, index) => {
            const isCurrent = currentSong?.id === song.id;
            return (
              <div
                key={song.id}
                className={cn(
                  "flex items-center gap-3 px-5 py-3 border-b border-white/[0.03] cursor-pointer transition-colors duration-200",
                  isCurrent
                    ? "bg-neon-cyan/[0.05] border-l-2 border-l-neon-cyan"
                    : "hover:bg-white/[0.02] border-l-2 border-l-transparent"
                )}
              >
                {/* Index */}
                <span className={cn(
                  "text-[11px] font-mono w-5 text-center",
                  isCurrent ? "text-neon-cyan" : "text-text-disabled"
                )}>
                  {isCurrent ? "▶" : index + 1}
                </span>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-sm truncate",
                    isCurrent ? "text-neon-cyan font-medium" : "text-text-primary"
                  )}>
                    {song.title}
                  </p>
                  <p className="text-[11px] text-text-secondary truncate">{song.artist}</p>
                </div>

                {/* Duration */}
                <span className="font-mono text-[11px] text-text-secondary">
                  {formatTime(song.duration)}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      {queue.length > 0 && (
        <div className="px-5 py-3 border-t border-white/[0.06] flex items-center gap-1.5 text-[11px] text-text-secondary">
          <Clock className="w-3 h-3" />
          <span>预计剩余：{formatTime(remainingDuration)}</span>
        </div>
      )}
    </div>
  );
}
