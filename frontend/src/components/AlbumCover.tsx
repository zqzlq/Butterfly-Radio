import { Heart, Music } from "lucide-react";
import { usePlayerStore } from "@/store";
import { cn } from "@/lib/cn";
import { getMediaUrl } from "@/lib/api";

export function AlbumCover() {
  const currentSong = usePlayerStore((s) => s.currentSong);
  const isPlaying = usePlayerStore((s) => s.isPlaying);

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
      <div className="relative w-full h-full rounded-card overflow-hidden border border-white/[0.06] bg-bg-secondary flex items-center justify-center">
        {currentSong && coverUrl ? (
          <img
            src={coverUrl}
            alt={currentSong.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <Music className="w-14 h-14 text-text-disabled" />
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
          <Heart
            className={cn("w-4 h-4", currentSong.is_favorited && "fill-current")}
          />
        </button>
      )}
    </div>
  );
}
