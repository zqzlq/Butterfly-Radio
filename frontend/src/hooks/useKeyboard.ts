import { useEffect } from "react";
import { usePlayerStore } from "@/store";

export function useKeyboard() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Skip if user is typing in an input
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      switch (e.code) {
        case "Space":
          e.preventDefault();
          const { isPlaying } = usePlayerStore.getState();
          usePlayerStore.getState().setPlaying(!isPlaying);
          break;
        case "KeyM":
          usePlayerStore.getState().toggleMute();
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
