import { useState, useEffect, useRef } from "react";
import { Heart, Music } from "lucide-react";
import { usePlayerStore } from "@/store";
import { cn } from "@/lib/cn";

export function AlbumCover() {
  const currentSong = usePlayerStore((s) => s.currentSong);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const [transitioning, setTransitioning] = useState(false);
  const prevSongIdRef = useRef<string | null>(null);

  // Song change transition animation
  useEffect(() => {
    if (currentSong?.id !== prevSongIdRef.current) {
      prevSongIdRef.current = currentSong?.id ?? null;
      if (prevSongIdRef.current) {
        setTransitioning(true);
        const timer = setTimeout(() => setTransitioning(false), 400);
        return () => clearTimeout(timer);
      }
    }
  }, [currentSong?.id]);

  const coverUrl = currentSong?.cover_path || null;

  return (
    <div className="relative w-56 h-56 rounded-card shrink-0 group">
      {/* Glow ring — only when playing */}
      {isPlaying && (
        <div
          className="absolute inset-[-4px] rounded-card animate-rotate-slow opacity-30"
          style={{
            background: "conic-gradient(from 0deg, #00F0FF, #7B61FF, #00F0FF)",
            filter: "blur(16px)",
          }}
        />
      )}

      {/* Cover image area */}
      <div
        className={cn(
          "relative w-full h-full rounded-card overflow-hidden border border-white/[0.06] bg-bg-secondary flex items-center justify-center transition-all duration-400",
          transitioning ? "opacity-0 scale-95" : "opacity-100 scale-100"
        )}
      >
        {currentSong && coverUrl ? (
          <img
            src={coverUrl}
            alt={currentSong.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <Music className="w-14 h-14 text-text-disabled" />
        )}

        {/* Playing indicator overlay */}
        {isPlaying && !transitioning && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-sm">
            <span className="w-1.5 h-3 bg-neon-cyan rounded-full animate-spectrum" />
            <span className="w-1.5 h-4 bg-neon-cyan rounded-full animate-spectrum" style={{ animationDelay: "0.1s" }} />
            <span className="w-1.5 h-2.5 bg-neon-cyan rounded-full animate-spectrum" style={{ animationDelay: "0.2s" }} />
          </div>
        )}
      </div>

      {/* Favorite button */}
      {currentSong && (
        <button
          className={cn(
            "absolute bottom-3 right-3 p-2 rounded-full bg-black/50 backdrop-blur-sm transition-all duration-200",
            currentSong.is_favorited
              ? "text-neon-pink neon-text-pink"
              : "text-text-secondary hover:text-neon-pink"
          )}
        >
          <Heart className={cn("w-4 h-4", currentSong.is_favorited && "fill-current")} />
        </button>
      )}
    </div>
  );
}
