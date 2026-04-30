import { AlbumCover } from "@/components/AlbumCover";
import { SpectrumVisualizer } from "@/components/SpectrumVisualizer";
import { SongInfo } from "@/components/SongInfo";
import { PlaybackControls } from "@/components/PlaybackControls";
import { AiCommentBubble } from "@/components/AiCommentBubble";

export function MainContent() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-6 px-8 py-6 overflow-hidden">
      {/* Top row: Cover + Spectrum */}
      <div className="flex items-center gap-6 w-full max-w-4xl">
        <AlbumCover />
        <SpectrumVisualizer />
      </div>

      {/* Song info */}
      <SongInfo />

      {/* Playback controls */}
      <PlaybackControls />

      {/* AI commentary bubbles */}
      <AiCommentBubble />
    </main>
  );
}
