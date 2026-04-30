export function SpectrumVisualizer() {
  // Placeholder — 32 static bars, will be driven by Web Audio API in Step 8
  const bars = Array.from({ length: 32 }, (_, i) => i);

  return (
    <div className="flex-1 h-60 rounded-card bg-bg-primary border border-white/[0.06] overflow-hidden relative">
      {/* CRT scanline overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.05) 2px, rgba(255,255,255,0.05) 4px)",
        }}
      />

      {/* Bars */}
      <div className="absolute inset-x-4 bottom-4 top-4 flex items-end justify-between gap-1">
        {bars.map((i) => {
          const height = 20 + Math.sin(i * 0.4) * 30 + Math.random() * 20;
          return (
            <div
              key={i}
              className="flex-1 rounded-t-sm animate-spectrum"
              style={{
                height: `${height}%`,
                background: `linear-gradient(to top, #00F0FF, #7B61FF)`,
                animationDelay: `${i * 0.05}s`,
                opacity: 0.8,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
