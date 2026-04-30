export function SongInfo() {
  return (
    <div className="text-center space-y-1 max-w-md">
      <h2 className="text-xl font-bold text-text-primary truncate">
        等待播放...
      </h2>
      <p className="text-sm text-text-secondary">
        Butterfly Radio
      </p>
      <div className="flex items-center justify-center gap-2 pt-1">
        <span className="px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded-capsule bg-neon-purple/15 text-neon-purple">
          AI 电台
        </span>
      </div>
    </div>
  );
}
