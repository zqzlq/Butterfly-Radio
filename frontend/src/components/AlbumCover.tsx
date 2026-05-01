import { useState, useEffect, useRef, useCallback } from "react";
import { Heart, Music } from "lucide-react";
import { usePlayerStore } from "@/store";
import { cn } from "@/lib/cn";
import { playlistApi } from "@/lib/api";
import { getFrequencyData } from "@/player";

export function AlbumCover() {
  const currentSong = usePlayerStore((s) => s.currentSong);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const [transitioning, setTransitioning] = useState(false);
  const [favAnimating, setFavAnimating] = useState(false);
  const prevSongIdRef = useRef<string | null>(null);

  // Beat-reactive animation
  const [bass, setBass] = useState(0);
  const bassRef = useRef(0);
  const rafRef = useRef(0);

  const updateBeat = useCallback(() => {
    if (!usePlayerStore.getState().isPlaying) {
      bassRef.current *= 0.92;
      setBass(bassRef.current);
      rafRef.current = requestAnimationFrame(updateBeat);
      return;
    }
    const data = getFrequencyData();
    const bassEnd = Math.floor(data.length / 3);
    let sum = 0;
    for (let i = 0; i < bassEnd; i++) sum += data[i];
    const rawBass = bassEnd > 0 ? sum / (bassEnd * 255) : 0;
    bassRef.current = Math.max(rawBass, bassRef.current * 0.88);
    setBass(bassRef.current);
    rafRef.current = requestAnimationFrame(updateBeat);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(updateBeat);
    return () => cancelAnimationFrame(rafRef.current);
  }, [updateBeat]);

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

  const handleToggleFavorite = async () => {
    if (!currentSong) return;
    setFavAnimating(true);
    try {
      const updated = await playlistApi.toggleFavorite(currentSong.id);
      usePlayerStore.getState().setCurrentSong({
        ...currentSong,
        is_favorited: updated.is_favorited,
      });
    } catch (e) {
      console.error("收藏操作失败:", e);
    } finally {
      setTimeout(() => setFavAnimating(false), 500);
    }
  };

  const coverUrl = currentSong?.cover_path || null;

  return (
    <div className="relative w-56 h-56 rounded-card shrink-0 group">
      {/* Glow ring */}
      {isPlaying && (
        <div
          className="absolute inset-[-4px] rounded-card animate-rotate-slow"
          style={{
            background: "conic-gradient(from 0deg, #00F0FF, #7B61FF, #00F0FF)",
            filter: "blur(16px)",
            opacity: 0.2 + bass * 0.5,
          }}
        />
      )}

      {/* Cover image */}
      <div
        className={cn(
          "relative w-full h-full rounded-card overflow-hidden border border-white/[0.06] bg-bg-secondary flex items-center justify-center transition-all duration-400",
          transitioning ? "opacity-0 scale-95" : "opacity-100"
        )}
        style={isPlaying && !transitioning ? { transform: `scale(${1 + bass * 0.06})` } : undefined}
      >
        {currentSong && coverUrl ? (
          <img src={coverUrl} alt={currentSong.title} className="w-full h-full object-cover" />
        ) : (
          <Music className="w-14 h-14 text-text-disabled" />
        )}

        {/* Playing indicator */}
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
          onClick={handleToggleFavorite}
          className={cn(
            "absolute bottom-3 right-3 p-2 rounded-full bg-black/50 backdrop-blur-sm transition-all duration-200",
            currentSong.is_favorited
              ? "text-neon-pink neon-text-pink"
              : "text-text-secondary hover:text-neon-pink",
            favAnimating && "scale-125"
          )}
        >
          <Heart className={cn("w-4 h-4", currentSong.is_favorited && "fill-current")} />
          {/* Favorite particle effect */}
          {favAnimating && currentSong.is_favorited && (
            <>
              {[...Array(6)].map((_, i) => (
                <span
                  key={i}
                  className="absolute w-1 h-1 rounded-full bg-neon-pink"
                  style={{
                    animation: `particle-${i} 0.5s ease-out forwards`,
                    left: "50%",
                    top: "50%",
                  }}
                />
              ))}
            </>
          )}
        </button>
      )}

      <style>{`
        @keyframes particle-0 { to { transform: translate(12px, -16px); opacity: 0; } }
        @keyframes particle-1 { to { transform: translate(-10px, -14px); opacity: 0; } }
        @keyframes particle-2 { to { transform: translate(16px, 4px); opacity: 0; } }
        @keyframes particle-3 { to { transform: translate(-14px, 6px); opacity: 0; } }
        @keyframes particle-4 { to { transform: translate(4px, -18px); opacity: 0; } }
        @keyframes particle-5 { to { transform: translate(-6px, 14px); opacity: 0; } }
      `}</style>
    </div>
  );
}
