import { Play, Pause, SkipBack, SkipForward, Maximize2 } from "lucide-react";
import { usePlayerStore } from "@/store";
import { formatTime } from "@/lib/utils";
import { togglePlay, skipNext, skipPrev } from "@/player";

export function MiniPlayer() {
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const currentSong = usePlayerStore((s) => s.currentSong);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const toggleMiniMode = usePlayerStore((s) => s.toggleMiniMode);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-4 px-6 h-14 glass-panel shrink-0">
      {/* Song info */}
      <div className="flex items-center gap-3 min-w-0 w-52">
        <div className="w-8 h-8 rounded-lg bg-bg-secondary flex items-center justify-center shrink-0 overflow-hidden">
          {currentSong?.cover_path ? (
            <img src={currentSong.cover_path} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs text-text-disabled">♪</span>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm text-text-primary truncate">{currentSong?.title || "等待播放..."}</p>
          <p className="text-[11px] text-text-secondary truncate">{currentSong?.artist || "Butterfly Radio"}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        <button onClick={skipPrev} className="p-1.5 text-text-secondary hover:text-neon-cyan transition-colors">
          <SkipBack className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={togglePlay}
          className="w-7 h-7 rounded-full bg-neon-cyan flex items-center justify-center text-bg-primary active:scale-95 transition-transform"
        >
          {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 ml-0.5" />}
        </button>
        <button onClick={skipNext} className="p-1.5 text-text-secondary hover:text-neon-cyan transition-colors">
          <SkipForward className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Progress */}
      <div className="flex-1 flex items-center gap-2">
        <div className="flex-1 h-[2px] rounded-full bg-text-disabled">
          <div className="h-full rounded-full bg-neon-cyan transition-[width] duration-200" style={{ width: `${progress}%` }} />
        </div>
        <span className="font-mono text-[10px] text-text-secondary whitespace-nowrap">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>

      {/* Expand */}
      <button onClick={toggleMiniMode} className="p-2 text-text-secondary hover:text-neon-cyan transition-colors">
        <Maximize2 className="w-4 h-4" />
      </button>
    </div>
  );
}
