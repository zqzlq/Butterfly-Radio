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
      <div className="text-center space-y-2 max-w-md">
        <h2 className="text-lg font-bold text-text-disabled tracking-wider uppercase">等待信号...</h2>
        <p className="text-[10px] text-text-disabled tracking-widest uppercase">Butterfly Radio</p>
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
      <h2 className="text-xl font-bold text-text-primary truncate beat-glow tracking-wide">
        {currentSong.title}
      </h2>
      <p className="text-sm text-text-secondary truncate">
        {currentSong.artist}
        {currentSong.album ? ` · ${currentSong.album}` : ""}
      </p>
      <div className="flex items-center justify-center gap-2 pt-1">
        <span className="px-3 py-0.5 text-[9px] font-medium uppercase tracking-[0.15em] rounded-capsule bg-accent/[0.08] text-accent/80 border border-accent/[0.1]">
          {currentSong.play_count > 0 ? `${currentSong.play_count} plays` : "AI Radio"}
        </span>
      </div>
    </div>
  );
}
