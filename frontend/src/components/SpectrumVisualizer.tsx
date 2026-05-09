import { useRef, useEffect, useCallback } from "react";
import { usePlayerStore } from "@/store";
import { getFrequencyData } from "@/player";

const BAR_COUNT = 48;

function getAccentColors() {
  const s = getComputedStyle(document.documentElement);
  return {
    accent: s.getPropertyValue("--accent").trim() || "#00CC66",
    accentBright: s.getPropertyValue("--accent-bright").trim() || "#33FF88",
    accentDim: s.getPropertyValue("--accent-dim").trim() || "#009944",
  };
}

export function SpectrumVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const isPlaying = usePlayerStore((s) => s.isPlaying);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    }

    const width = rect.width;
    const height = rect.height;
    const colors = getAccentColors();

    ctx.clearRect(0, 0, width, height);

    // Draw subtle horizontal grid lines
    ctx.strokeStyle = `${colors.accent}0A`;
    ctx.lineWidth = 0.5;
    for (let y = 0; y < height; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const data = getFrequencyData();
    const barCount = BAR_COUNT;
    const gap = 2;
    const barWidth = (width - gap * (barCount - 1)) / barCount;
    const step = Math.floor(data.length / barCount);

    for (let i = 0; i < barCount; i++) {
      let sum = 0;
      for (let j = 0; j < step; j++) {
        sum += data[i * step + j] || 0;
      }
      const value = sum / step / 255;

      const barHeight = isPlaying
        ? Math.max(4, value * height * 0.85)
        : Math.max(4, (Math.sin(Date.now() / 1200 + i * 0.25) * 0.12 + 0.12) * height);

      const x = i * (barWidth + gap);
      const y = height - barHeight;

      // Theme-aware gradient
      const gradient = ctx.createLinearGradient(x, height, x, y);
      gradient.addColorStop(0, `${colors.accentDim}99`);
      gradient.addColorStop(0.4, `${colors.accent}CC`);
      gradient.addColorStop(1, `${colors.accentBright}F2`);

      ctx.fillStyle = gradient;
      ctx.globalAlpha = isPlaying ? 0.9 : 0.2;

      const radius = Math.min(barWidth / 2, 2);
      ctx.beginPath();
      ctx.moveTo(x, height);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.lineTo(x + barWidth - radius, y);
      ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + radius);
      ctx.lineTo(x + barWidth, height);
      ctx.closePath();
      ctx.fill();

      // Bright cap
      if (isPlaying && barHeight > 8) {
        ctx.globalAlpha = 1;
        ctx.fillStyle = colors.accentBright;
        ctx.fillRect(x, y, barWidth, 1.5);
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
    <div className="flex-1 h-56 rounded-card bg-bg-primary border border-accent/[0.06] overflow-hidden relative">
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ imageRendering: "auto" }}
      />

      {/* Subtle green glow at bottom center */}
      {isPlaying && (
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-1/3 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at bottom, color-mix(in srgb, var(--accent) 8%, transparent) 0%, transparent 70%)",
          }}
        />
      )}

      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-accent/15 pointer-events-none" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-accent/15 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-accent/15 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-accent/15 pointer-events-none" />
    </div>
  );
}
