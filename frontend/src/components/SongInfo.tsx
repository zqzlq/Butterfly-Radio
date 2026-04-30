import { useState, useEffect, useRef } from "react";
import { usePlayerStore } from "@/store";
import { cn } from "@/lib/cn";

export function SongInfo() {
  const currentSong = usePlayerStore((s) => s.currentSong);
  const [transitioning, setTransitioning] = useState(false);
  const prevIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (currentSong?.id !== prevIdRef.current) {
      prevIdRef.current = currentSong?.id ?? null;
      if (prevIdRef.current) {
        setTransitioning(true);
        const timer = setTimeout(() => setTransitioning(false), 350);
        return () => clearTimeout(timer);
      }
    }
  }, [currentSong?.id]);

  if (!currentSong) {
    return (
      <div className="text-center space-y-1.5 max-w-md">
        <h2 className="text-xl font-bold text-text-secondary">等待播放...</h2>
        <p className="text-sm text-text-disabled">Butterfly Radio</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "text-center space-y-1.5 max-w-md transition-all duration-350",
        transitioning ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"
      )}
    >
      <h2 className="text-xl font-bold text-text-primary truncate">
        {currentSong.title}
      </h2>
      <p className="text-sm text-text-secondary truncate">
        {currentSong.artist}
        {currentSong.album ? ` · ${currentSong.album}` : ""}
      </p>
      <div className="flex items-center justify-center gap-2 pt-0.5">
        <span className="px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded-capsule bg-neon-purple/15 text-neon-purple">
          {currentSong.play_count > 0 ? `播放 ${currentSong.play_count} 次` : "AI 电台"}
        </span>
      </div>
    </div>
  );
}
