import { Settings, EyeOff, Radio } from "lucide-react";

export function Navbar() {
  return (
    <nav className="flex items-center justify-between h-14 px-6 glass-panel shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <Radio className="w-6 h-6 text-neon-cyan neon-text" />
        <span className="text-lg font-bold text-neon-cyan neon-text tracking-wide">
          Butterfly Radio
        </span>
      </div>

      {/* DateTime */}
      <div className="font-mono text-sm text-text-secondary tracking-wider">
        <CurrentTime />
      </div>

      {/* Status & Controls */}
      <div className="flex items-center gap-3">
        {/* ON AIR badge */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-capsule bg-neon-pink/20 border border-neon-pink/30">
          <span className="w-2 h-2 rounded-full bg-neon-pink animate-pulse-neon" />
          <span className="text-xs font-semibold text-white tracking-wider uppercase">ON AIR</span>
        </div>

        {/* LIVE badge */}
        <div className="px-3 py-1 rounded-capsule bg-neon-cyan/15 border border-neon-cyan/30">
          <span className="text-xs font-semibold text-neon-cyan tracking-wider uppercase">LIVE</span>
        </div>

        {/* Queue button */}
        <button className="px-3 py-1 text-xs font-medium text-text-secondary uppercase tracking-wider hover:text-neon-cyan transition-colors duration-200">
          QUEUE
        </button>

        {/* Settings */}
        <button className="p-2 text-text-secondary hover:text-neon-cyan transition-colors duration-200">
          <Settings className="w-5 h-5" />
        </button>

        {/* Hide */}
        <button className="px-3 py-1 text-xs font-medium text-text-secondary uppercase tracking-wider hover:text-neon-cyan transition-colors duration-200">
          HIDE
        </button>
      </div>
    </nav>
  );
}

function CurrentTime() {
  // Placeholder — will be replaced with live clock in Step 6
  const now = new Date();
  const time = now.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  const date = now.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const weekday = ["日", "一", "二", "三", "四", "五", "六"][now.getDay()];
  return (
    <span>
      {time} · {date} · 星期{weekday}
    </span>
  );
}
