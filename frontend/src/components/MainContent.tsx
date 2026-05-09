import { usePlayerStore } from "@/store";
import { AlbumCover } from "@/components/AlbumCover";
import { SpectrumVisualizer } from "@/components/SpectrumVisualizer";
import { SongInfo } from "@/components/SongInfo";
import { PlaybackControls } from "@/components/PlaybackControls";
import { ChatPanel } from "@/components/ChatPanel";
import { QueuePanel } from "@/components/QueuePanel";
import { SettingsPanel } from "@/components/SettingsPanel";

export function MainContent() {
  const isMiniMode = usePlayerStore((s) => s.isMiniMode);
  const isQueueOpen = usePlayerStore((s) => s.isQueueOpen);
  const isSettingsOpen = usePlayerStore((s) => s.isSettingsOpen);

  if (isMiniMode) {
    return null;
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-4 px-8 py-4 overflow-hidden relative beat-border rounded-card mx-4 mb-2 sci-fi-grid">
      {/* Subtle radial glow from center */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 60% 50% at 50% 40%, color-mix(in srgb, var(--accent) 3%, transparent) 0%, transparent 70%)",
        }}
      />

      {/* Top row: Cover + Spectrum */}
      <div className="flex items-center gap-5 w-full max-w-4xl relative z-10">
        <AlbumCover />
        <SpectrumVisualizer />
      </div>

      {/* Song info */}
      <SongInfo />

      {/* Playback controls */}
      <PlaybackControls />

      {/* Chat panel */}
      <ChatPanel />

      {/* Queue side panel */}
      {isQueueOpen && <QueuePanel />}

      {/* Settings modal */}
      {isSettingsOpen && <SettingsPanel />}
    </main>
  );
}
