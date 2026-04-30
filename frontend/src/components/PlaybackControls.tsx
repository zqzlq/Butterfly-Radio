import { SkipBack, Play, SkipForward, Repeat, Heart, Volume2 } from "lucide-react";

export function PlaybackControls() {
  return (
    <div className="flex items-center gap-4 px-6 py-3 rounded-capsule glass-panel">
      {/* Favorite */}
      <button className="p-1.5 text-text-secondary hover:text-neon-pink transition-colors duration-200">
        <Heart className="w-5 h-5" />
      </button>

      {/* Previous */}
      <button className="p-1.5 text-text-primary hover:text-neon-cyan transition-colors duration-200">
        <SkipBack className="w-5 h-5" />
      </button>

      {/* Play/Pause */}
      <button className="w-10 h-10 rounded-full bg-neon-cyan flex items-center justify-center text-bg-primary hover:shadow-neon-glow transition-shadow duration-200">
        <Play className="w-5 h-5 ml-0.5" />
      </button>

      {/* Next */}
      <button className="p-1.5 text-text-primary hover:text-neon-cyan transition-colors duration-200">
        <SkipForward className="w-5 h-5" />
      </button>

      {/* Replay */}
      <button className="flex items-center gap-1 p-1.5 text-text-secondary hover:text-neon-cyan transition-colors duration-200">
        <Repeat className="w-4 h-4" />
        <span className="text-[10px] font-medium uppercase tracking-wider">Replay</span>
      </button>

      {/* Divider */}
      <div className="w-px h-6 bg-white/[0.06]" />

      {/* Progress bar */}
      <div className="flex items-center gap-2 min-w-[200px]">
        <span className="font-mono text-xs text-text-secondary w-10 text-right">0:00</span>
        <div className="flex-1 h-[3px] rounded-full bg-text-disabled relative group cursor-pointer">
          <div className="h-full w-0 rounded-full bg-neon-cyan" />
          <div className="absolute top-1/2 -translate-y-1/2 left-0 w-3 h-3 rounded-full bg-neon-cyan opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
        </div>
        <span className="font-mono text-xs text-text-secondary w-10">0:00</span>
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-white/[0.06]" />

      {/* Volume */}
      <div className="flex items-center gap-2">
        <Volume2 className="w-4 h-4 text-text-secondary" />
        <span className="text-[10px] font-medium text-text-secondary uppercase tracking-wider">VOL</span>
        <div className="w-20 h-[3px] rounded-full bg-text-disabled relative group cursor-pointer">
          <div className="h-full w-3/4 rounded-full bg-neon-cyan" />
          <div className="absolute top-1/2 -translate-y-1/2 left-3/4 w-3 h-3 rounded-full bg-neon-cyan opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
        </div>
        <span className="font-mono text-xs text-text-secondary w-8">72%</span>
      </div>
    </div>
  );
}
