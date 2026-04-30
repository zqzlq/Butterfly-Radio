import { useEffect } from "react";
import { usePlayerStore } from "@/store";
import { togglePlay, skipNext, skipPrev, toggleMute } from "@/player";

export function useKeyboard() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Skip if user is typing in an input
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      switch (e.code) {
        case "Space":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowRight":
          e.preventDefault();
          skipNext();
          break;
        case "ArrowLeft":
          e.preventDefault();
          skipPrev();
          break;
        case "KeyM":
          toggleMute();
          break;
        case "KeyQ":
          usePlayerStore.getState().toggleQueue();
          break;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}
