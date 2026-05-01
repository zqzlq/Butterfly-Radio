import { useEffect, useRef } from "react";
import { usePlayerStore } from "@/store";
import { getFrequencyData } from "@/player";

/**
 * Hook that extracts beat/bass intensity from audio frequency data
 * and exposes them as CSS custom properties on document.documentElement.
 *
 * Sets: --beat (0~1), --bass (0~1)
 */
export function useBeat() {
  const rafRef = useRef<number>(0);
  const beatRef = useRef(0);
  const bassRef = useRef(0);

  useEffect(() => {
    const root = document.documentElement;

    const update = () => {
      const isPlaying = usePlayerStore.getState().isPlaying;
      if (!isPlaying) {
        rafRef.current = requestAnimationFrame(update);
        return;
      }

      const data = getFrequencyData();
      const len = data.length;
      if (len === 0) {
        rafRef.current = requestAnimationFrame(update);
        return;
      }

      // Overall intensity (0~1)
      let sum = 0;
      for (let i = 0; i < len; i++) sum += data[i];
      const rawBeat = sum / (len * 255);

      // Bass intensity — first third of frequency bins (low freq)
      const bassEnd = Math.floor(len / 3);
      let bassSum = 0;
      for (let i = 0; i < bassEnd; i++) bassSum += data[i];
      const rawBass = bassSum / (bassEnd * 255);

      // Smooth decay (fast attack, slow release)
      beatRef.current = Math.max(rawBeat, beatRef.current * 0.85);
      bassRef.current = Math.max(rawBass, bassRef.current * 0.88);

      root.style.setProperty("--beat", beatRef.current.toFixed(3));
      root.style.setProperty("--bass", bassRef.current.toFixed(3));

      rafRef.current = requestAnimationFrame(update);
    };

    rafRef.current = requestAnimationFrame(update);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, []);
}
