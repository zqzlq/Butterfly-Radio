import { Settings, Radio, WifiOff, Minus, X } from "lucide-react";
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
        "relative flex items-center justify-between h-14 px-6 surface-panel shrink-0 z-50",
        isDesktop && "select-none"
      )}
      style={isDesktop ? { WebkitAppRegion: "drag" } as any : undefined}
    >
      {/* Bottom gradient edge */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent" />

      {/* Logo */}
      <div className="flex items-center gap-2.5">
        <div className="relative">
          <Radio className="w-4.5 h-4.5 text-accent" />
          <div className="absolute inset-0 w-4.5 h-4.5 rounded-full bg-accent/20 blur-md" />
        </div>
        <span className="text-sm font-bold text-text-primary tracking-[0.2em] uppercase">
          Butterfly Radio
        </span>
      </div>

      {/* DateTime */}
      <div className="font-mono font-digital text-[11px] text-accent/70 tracking-[0.15em] absolute left-1/2 -translate-x-1/2">
        {clock.full}
      </div>

      {/* Status & Controls */}
      <div className="flex items-center gap-2" style={isDesktop ? { WebkitAppRegion: "no-drag" } as any : undefined}>
        {/* Online/Offline indicator */}
        {!isOnline && (
          <div className="badge bg-text-disabled/10 text-text-disabled border border-border-subtle">
            <WifiOff className="w-3 h-3" />
            <span>OFFLINE</span>
          </div>
        )}

        {/* ON AIR badge */}
        {isLive && (
          <div className="badge bg-danger/15 text-danger border border-danger/20">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-danger opacity-75 animate-ping" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-danger" />
            </span>
            <span>ON AIR</span>
          </div>
        )}

        {/* LIVE badge */}
        <div className={cn(
          "badge border",
          isLive
            ? "bg-accent/10 text-accent border-accent/20"
            : "bg-text-disabled/5 text-text-disabled border-border-subtle"
        )}>
          LIVE
        </div>

        {/* Queue */}
        <button
          onClick={toggleQueue}
          className="px-2.5 py-1 text-[10px] font-semibold text-text-secondary uppercase tracking-widest hover:text-accent transition-colors duration-200"
        >
          QUEUE
        </button>

        {/* Settings */}
        <button
          onClick={toggleSettings}
          className="p-2 text-text-secondary hover:text-accent transition-colors duration-200"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* Hide / Mini mode */}
        <button
          onClick={toggleMiniMode}
          className="px-2.5 py-1 text-[10px] font-semibold text-text-secondary uppercase tracking-widest hover:text-accent transition-colors duration-200"
        >
          HIDE
        </button>

        {/* Electron window controls */}
        {isDesktop && (
          <div className="flex items-center gap-0.5 ml-2">
            <button
              onClick={minimizeWindow}
              className="w-7 h-7 flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-white/[0.04] rounded transition-colors"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={closeWindow}
              className="w-7 h-7 flex items-center justify-center text-text-secondary hover:text-danger hover:bg-danger/10 rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
