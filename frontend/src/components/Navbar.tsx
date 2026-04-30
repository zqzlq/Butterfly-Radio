import { Settings, Radio, WifiOff, Minus, Square, X } from "lucide-react";
import { usePlayerStore } from "@/store";
import { useClock } from "@/hooks/useClock";
import { cn } from "@/lib/cn";
import { isElectron, minimizeWindow, closeWindow } from "@/lib/electron";

export function Navbar() {
  const isLive = usePlayerStore((s) => s.isLive);
  const isOnline = usePlayerStore((s) => s.isOnline);
  const toggleSettings = usePlayerStore((s) => s.toggleSettings);
  const toggleMiniMode = usePlayerStore((s) => s.toggleMiniMode);
  const toggleQueue = usePlayerStore((s) => s.toggleQueue);
  const clock = useClock();
  const isDesktop = isElectron();

  return (
    <nav
      className={cn(
        "flex items-center justify-between h-14 px-6 glass-panel shrink-0 z-50",
        isDesktop && "select-none"
      )}
      style={isDesktop ? { WebkitAppRegion: "drag" } as any : undefined}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5">
        <Radio className="w-5 h-5 text-neon-cyan neon-text" />
        <span className="text-base font-bold text-neon-cyan neon-text tracking-wide">
          Butterfly Radio
        </span>
      </div>

      {/* DateTime */}
      <div className="font-mono text-xs text-text-secondary tracking-wider absolute left-1/2 -translate-x-1/2">
        {clock.full}
      </div>

      {/* Status & Controls */}
      <div className="flex items-center gap-2" style={isDesktop ? { WebkitAppRegion: "no-drag" } as any : undefined}>
        {/* Online/Offline indicator */}
        {!isOnline && (
          <div className="badge bg-text-disabled/15 text-text-secondary border border-text-disabled/30">
            <WifiOff className="w-3 h-3" />
            <span>OFFLINE</span>
          </div>
        )}

        {/* ON AIR badge */}
        {isLive && (
          <div className="badge bg-neon-pink/20 text-white border border-neon-pink/30 shadow-[0_0_12px_rgba(255,0,110,0.25)]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-neon-pink opacity-75 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-neon-pink" />
            </span>
            <span>ON AIR</span>
          </div>
        )}

        {/* LIVE badge */}
        <div className={cn(
          "badge border",
          isLive
            ? "bg-neon-cyan/15 text-neon-cyan border-neon-cyan/30"
            : "bg-text-disabled/15 text-text-disabled border-text-disabled/30"
        )}>
          LIVE
        </div>

        {/* Queue */}
        <button
          onClick={toggleQueue}
          className="px-2.5 py-1 text-[10px] font-semibold text-text-secondary uppercase tracking-wider hover:text-neon-cyan transition-colors duration-200"
        >
          QUEUE
        </button>

        {/* Settings */}
        <button
          onClick={toggleSettings}
          className="p-2 text-text-secondary hover:text-neon-cyan transition-colors duration-200"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* Hide / Mini mode */}
        <button
          onClick={toggleMiniMode}
          className="px-2.5 py-1 text-[10px] font-semibold text-text-secondary uppercase tracking-wider hover:text-neon-cyan transition-colors duration-200"
        >
          HIDE
        </button>

        {/* Electron window controls */}
        {isDesktop && (
          <div className="flex items-center gap-0.5 ml-2">
            <button
              onClick={minimizeWindow}
              className="w-7 h-7 flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-white/[0.06] rounded transition-colors"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={closeWindow}
              className="w-7 h-7 flex items-center justify-center text-text-secondary hover:text-neon-pink hover:bg-neon-pink/10 rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
