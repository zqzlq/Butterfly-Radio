import { usePlayerStore } from "@/store";
import { AlbumCover } from "@/components/AlbumCover";
import { SpectrumVisualizer } from "@/components/SpectrumVisualizer";
import { SongInfo } from "@/components/SongInfo";
import { PlaybackControls } from "@/components/PlaybackControls";
import { AiCommentBubble } from "@/components/AiCommentBubble";
import { QueuePanel } from "@/components/QueuePanel";
import { SettingsPanel } from "@/components/SettingsPanel";

export function MainContent() {
  const isMiniMode = usePlayerStore((s) => s.isMiniMode);
  const isQueueOpen = usePlayerStore((s) => s.isQueueOpen);
  const isSettingsOpen = usePlayerStore((s) => s.isSettingsOpen);

  if (isMiniMode) {
    return null; // Mini mode handled by MiniPlayer in App
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-5 px-8 py-4 overflow-hidden relative beat-border rounded-card mx-4 mb-2">
      {/* Top row: Cover + Spectrum */}
      <div className="flex items-center gap-5 w-full max-w-4xl">
        <AlbumCover />
        <SpectrumVisualizer />
      </div>

      {/* Song info */}
      <SongInfo />

      {/* Playback controls */}
      <PlaybackControls />

      {/* AI commentary bubbles */}
      <AiCommentBubble />

      {/* Queue side panel */}
      {isQueueOpen && <QueuePanel />}

      {/* Settings modal */}
      {isSettingsOpen && <SettingsPanel />}
    </main>
  );
}
