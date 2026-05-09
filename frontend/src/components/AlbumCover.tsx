import { useState, useEffect, useRef, useCallback } from "react";
import { Heart, Music } from "lucide-react";
import { usePlayerStore } from "@/store";
import { cn } from "@/lib/cn";
import { playlistApi, getArtistPhotoUrl } from "@/lib/api";
import { getFrequencyData } from "@/player";

export function AlbumCover() {
  const currentSong = usePlayerStore((s) => s.currentSong);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const [transitioning, setTransitioning] = useState(false);
  const [artistPhotoFailed, setArtistPhotoFailed] = useState(false);
  const prevSongIdRef = useRef<string | null>(null);

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
      setArtistPhotoFailed(false);
      if (prevSongIdRef.current) {
        setTransitioning(true);
        const timer = setTimeout(() => setTransitioning(false), 400);
        return () => clearTimeout(timer);
      }
    }
  }, [currentSong?.id]);

  const handleToggleFavorite = async () => {
    if (!currentSong) return;
    try {
      const updated = await playlistApi.toggleFavorite(currentSong.id);
      usePlayerStore.getState().setCurrentSong({
        ...currentSong,
        is_favorited: updated.is_favorited,
      });
    } catch (e) {
      console.error("收藏操作失败:", e);
    }
  };

  const coverUrl = currentSong?.cover_path || null;
  const artistPhotoUrl = currentSong?.artist && !artistPhotoFailed
    ? getArtistPhotoUrl(currentSong.artist)
    : null;

  return (
    <div className="relative w-56 h-56 rounded-card shrink-0 group">
      {/* Glow ring - conic gradient sci-fi effect */}
      {isPlaying && (
        <>
          <div
            className="absolute inset-[-6px] rounded-card animate-rotate-slow"
            style={{
              background: "conic-gradient(from 0deg, transparent 0%, color-mix(in srgb, var(--accent) 30%, transparent) 25%, transparent 50%, color-mix(in srgb, var(--accent) 15%, transparent) 75%, transparent 100%)",
              filter: `blur(${12 + bass * 8}px)`,
              opacity: 0.4 + bass * 0.4,
            }}
          />
          <div
            className="absolute inset-[-2px] rounded-card"
            style={{
              border: `1px solid rgba(0,204,102,${0.1 + bass * 0.3})`,
            }}
          />
        </>
      )}

      {/* Cover image */}
      <div
        className={cn(
          "relative w-full h-full rounded-card overflow-hidden bg-bg-secondary flex items-center justify-center transition-all duration-400",
          transitioning ? "opacity-0 scale-95" : "opacity-100"
        )}
        style={isPlaying && !transitioning ? { transform: `scale(${1 + bass * 0.05})` } : undefined}
      >
        {currentSong && coverUrl ? (
          <img src={coverUrl} alt={currentSong.title} className="w-full h-full object-cover" />
        ) : currentSong && artistPhotoUrl ? (
          <img
            src={artistPhotoUrl}
            alt={currentSong.artist}
            className="w-full h-full object-cover"
            onError={() => setArtistPhotoFailed(true)}
          />
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Music className="w-12 h-12 text-text-disabled" />
            <span className="text-[10px] text-text-disabled tracking-widest uppercase">No Signal</span>
          </div>
        )}

        {/* Playing indicator */}
        {isPlaying && !transitioning && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm">
            <span className="w-1 h-3 bg-accent rounded-full animate-spectrum" />
            <span className="w-1 h-4 bg-accent rounded-full animate-spectrum" style={{ animationDelay: "0.1s" }} />
            <span className="w-1 h-2.5 bg-accent rounded-full animate-spectrum" style={{ animationDelay: "0.2s" }} />
          </div>
        )}
      </div>

      {/* Favorite button */}
      {currentSong && (
        <button
          onClick={handleToggleFavorite}
          className={cn(
            "absolute bottom-3 right-3 p-2 rounded-full bg-black/60 backdrop-blur-sm transition-all duration-200",
            currentSong.is_favorited
              ? "text-accent"
              : "text-text-secondary hover:text-accent"
          )}
        >
          <Heart className={cn("w-4 h-4", currentSong.is_favorited && "fill-current")} />
        </button>
      )}
    </div>
  );
}
