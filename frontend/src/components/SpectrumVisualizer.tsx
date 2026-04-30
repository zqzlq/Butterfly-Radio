import { useRef, useEffect, useCallback } from "react";
import { usePlayerStore } from "@/store";
import { getFrequencyData } from "@/player";

const BAR_COUNT = 48;

export function SpectrumVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const isPlaying = usePlayerStore((s) => s.isPlaying);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Handle high-DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    }

    const width = rect.width;
    const height = rect.height;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Get frequency data
    const data = getFrequencyData();
    const barCount = BAR_COUNT;
    const gap = 2;
    const barWidth = (width - gap * (barCount - 1)) / barCount;
    const step = Math.floor(data.length / barCount);

    for (let i = 0; i < barCount; i++) {
      // Average a few frequency bins per bar
      let sum = 0;
      for (let j = 0; j < step; j++) {
        sum += data[i * step + j] || 0;
      }
      const value = sum / step / 255;

      // When not playing, show breathing animation
      const barHeight = isPlaying
        ? Math.max(4, value * height * 0.85)
        : Math.max(4, (Math.sin(Date.now() / 1000 + i * 0.3) * 0.15 + 0.15) * height);

      const x = i * (barWidth + gap);
      const y = height - barHeight;

      // Gradient for each bar
      const gradient = ctx.createLinearGradient(x, height, x, y);
      gradient.addColorStop(0, "#00F0FF");
      gradient.addColorStop(0.5, "#7B61FF");
      gradient.addColorStop(1, "#FF006E");

      ctx.fillStyle = gradient;
      ctx.globalAlpha = isPlaying ? 0.85 : 0.3;

      // Draw bar with rounded top
      const radius = Math.min(barWidth / 2, 3);
      ctx.beginPath();
      ctx.moveTo(x, height);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.lineTo(x + barWidth - radius, y);
      ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + radius);
      ctx.lineTo(x + barWidth, height);
      ctx.closePath();
      ctx.fill();

      // Bright cap on top
      if (isPlaying && barHeight > 8) {
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#00F0FF";
        ctx.fillRect(x, y, barWidth, 2);
      }
    }

    ctx.globalAlpha = 1;
    animFrameRef.current = requestAnimationFrame(draw);
  }, [isPlaying]);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(draw);
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [draw]);

  return (
    <div className="flex-1 h-56 rounded-card bg-bg-primary border border-white/[0.06] overflow-hidden relative">
      {/* CRT scanline overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] scanlines" />

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ imageRendering: "auto" }}
      />

      {/* Subtle glow in center when playing */}
      {isPlaying && (
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2/3 h-1/2 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at bottom, rgba(0,240,255,0.06) 0%, transparent 70%)",
          }}
        />
      )}
    </div>
  );
}
