import { useRef, useState, useCallback, useEffect } from "react";
import { SkipBack, Play, Pause, SkipForward, Repeat, Heart, Volume2, VolumeX } from "lucide-react";
import { usePlayerStore } from "@/store";
import { cn } from "@/lib/cn";
import { formatTime } from "@/lib/utils";
import { togglePlay, skipNext, skipPrev, seekTo, setVolume, toggleMute } from "@/player";

export function PlaybackControls() {
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const currentSong = usePlayerStore((s) => s.currentSong);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const volume = usePlayerStore((s) => s.volume);
  const isMuted = usePlayerStore((s) => s.isMuted);

  const progressRef = useRef<HTMLDivElement>(null);
  const volumeRef = useRef<HTMLDivElement>(null);
  const [draggingProgress, setDraggingProgress] = useState(false);
  const [draggingVolume, setDraggingVolume] = useState(false);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const displayVolume = isMuted ? 0 : volume;

  // ─── Progress bar drag ───

  const calcProgressRatio = useCallback((clientX: number) => {
    if (!progressRef.current) return 0;
    const rect = progressRef.current.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }, []);

  const handleProgressDown = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      setDraggingProgress(true);
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const ratio = calcProgressRatio(clientX);
      if (duration > 0) seekTo(ratio * duration);
    },
    [duration, calcProgressRatio]
  );

  const handleProgressMove = useCallback(
    (clientX: number) => {
      if (!draggingProgress || !duration) return;
      const ratio = calcProgressRatio(clientX);
      seekTo(ratio * duration);
    },
    [draggingProgress, duration, calcProgressRatio]
  );

  const handleProgressUp = useCallback(() => {
    setDraggingProgress(false);
  }, []);

  // ─── Volume slider drag ───

  const calcVolumeRatio = useCallback((clientX: number) => {
    if (!volumeRef.current) return 0;
    const rect = volumeRef.current.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }, []);

  const handleVolumeDown = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      setDraggingVolume(true);
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const ratio = calcVolumeRatio(clientX);
      setVolume(ratio);
    },
    [calcVolumeRatio]
  );

  const handleVolumeMove = useCallback(
    (clientX: number) => {
      if (!draggingVolume) return;
      const ratio = calcVolumeRatio(clientX);
      setVolume(ratio);
    },
    [draggingVolume, calcVolumeRatio]
  );

  const handleVolumeUp = useCallback(() => {
    setDraggingVolume(false);
  }, []);

  // ─── Global mouse/touch listeners ───

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      handleProgressMove(e.clientX);
      handleVolumeMove(e.clientX);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        handleProgressMove(e.touches[0].clientX);
        handleVolumeMove(e.touches[0].clientX);
      }
    };
    const onMouseUp = () => {
      handleProgressUp();
      handleVolumeUp();
    };

    if (draggingProgress || draggingVolume) {
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
      document.addEventListener("touchmove", onTouchMove);
      document.addEventListener("touchend", onMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onMouseUp);
    };
  }, [draggingProgress, draggingVolume, handleProgressMove, handleVolumeMove, handleProgressUp, handleVolumeUp]);

  return (
    <div className="flex items-center gap-3 px-5 py-2.5 rounded-capsule glass-panel beat-border">
      {/* Favorite */}
      <button
        className={cn(
          "p-1.5 transition-colors duration-200",
          currentSong?.is_favorited ? "text-neon-pink" : "text-text-secondary hover:text-neon-pink"
        )}
      >
        <Heart className={cn("w-4 h-4", currentSong?.is_favorited && "fill-current")} />
      </button>

      {/* Previous */}
      <button
        onClick={skipPrev}
        className="p-1.5 text-text-primary hover:text-neon-cyan transition-colors duration-200"
      >
        <SkipBack className="w-4 h-4" />
      </button>

      {/* Play / Pause */}
      <button
        onClick={togglePlay}
        className="w-9 h-9 rounded-full bg-neon-cyan flex items-center justify-center text-bg-primary hover:shadow-neon-glow active:scale-95 transition-all duration-200 beat-glow"
      >
        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
      </button>

      {/* Next */}
      <button
        onClick={skipNext}
        className="p-1.5 text-text-primary hover:text-neon-cyan transition-colors duration-200"
      >
        <SkipForward className="w-4 h-4" />
      </button>

      {/* Replay */}
      <button className="flex items-center gap-1 p-1.5 text-text-secondary hover:text-neon-cyan transition-colors duration-200">
        <Repeat className="w-3.5 h-3.5" />
        <span className="text-[9px] font-semibold uppercase tracking-wider">Replay</span>
      </button>

      {/* Divider */}
      <div className="w-px h-5 bg-white/[0.06]" />

      {/* Progress bar */}
      <div className="flex items-center gap-2 min-w-[180px]">
        <span className="font-mono text-[11px] text-text-secondary w-9 text-right">
          {formatTime(currentTime)}
        </span>
        <div
          ref={progressRef}
          onMouseDown={handleProgressDown}
          onTouchStart={handleProgressDown}
          className="flex-1 h-[3px] rounded-full bg-text-disabled relative group cursor-pointer"
        >
          <div
            className="h-full rounded-full bg-neon-cyan transition-[width] duration-100"
            style={{ width: `${progress}%` }}
          />
          <div
            className={cn(
              "absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-neon-cyan transition-opacity duration-200 shadow-neon-glow",
              draggingProgress ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}
            style={{ left: `${progress}%`, transform: `translate(-50%, -50%)` }}
          />
        </div>
        <span className="font-mono text-[11px] text-text-secondary w-9">
          {formatTime(duration)}
        </span>
      </div>

      {/* Divider */}
      <div className="w-px h-5 bg-white/[0.06]" />

      {/* Volume */}
      <div className="flex items-center gap-1.5">
        <button onClick={toggleMute} className="text-text-secondary hover:text-neon-cyan transition-colors">
          {isMuted || volume === 0 ? (
            <VolumeX className="w-3.5 h-3.5" />
          ) : (
            <Volume2 className="w-3.5 h-3.5" />
          )}
        </button>
        <span className="text-[9px] font-semibold text-text-secondary uppercase tracking-wider">VOL</span>
        <div
          ref={volumeRef}
          onMouseDown={handleVolumeDown}
          onTouchStart={handleVolumeDown}
          className="w-16 h-[3px] rounded-full bg-text-disabled relative group cursor-pointer"
        >
          <div
            className="h-full rounded-full bg-neon-cyan transition-[width] duration-100"
            style={{ width: `${displayVolume * 100}%` }}
          />
          <div
            className={cn(
              "absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-neon-cyan transition-opacity duration-200",
              draggingVolume ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}
            style={{ left: `${displayVolume * 100}%`, transform: `translate(-50%, -50%)` }}
          />
        </div>
        <span className="font-mono text-[11px] text-text-secondary w-7">
          {Math.round(displayVolume * 100)}%
        </span>
      </div>
    </div>
  );
}
