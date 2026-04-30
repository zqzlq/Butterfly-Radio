import { Heart, Music } from "lucide-react";

export function AlbumCover() {
  return (
    <div className="relative w-60 h-60 rounded-card shrink-0 group">
      {/* Glow ring */}
      <div className="absolute inset-0 rounded-card animate-rotate-slow opacity-40"
        style={{
          background: "conic-gradient(from 0deg, #00F0FF, #7B61FF, #00F0FF)",
          filter: "blur(16px)",
        }}
      />

      {/* Cover image area */}
      <div className="relative w-full h-full rounded-card overflow-hidden border border-white/[0.06] bg-bg-secondary flex items-center justify-center">
        <Music className="w-16 h-16 text-text-disabled" />
      </div>

      {/* Favorite button */}
      <button className="absolute bottom-3 right-3 p-2 rounded-full bg-black/50 backdrop-blur-sm text-text-secondary hover:text-neon-pink transition-colors duration-200">
        <Heart className="w-5 h-5" />
      </button>
    </div>
  );
}
