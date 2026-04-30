import { useEffect } from "react";
import { usePlayerStore } from "@/store";
import { getSocket } from "@/socket";
import { useKeyboard } from "@/hooks/useKeyboard";
import { Navbar } from "@/components/Navbar";
import { MainContent } from "@/components/MainContent";
import { InteractionBar } from "@/components/InteractionBar";
import { LoadingScreen } from "@/components/LoadingScreen";
import { MiniPlayer } from "@/components/MiniPlayer";

export default function App() {
  const isLoading = usePlayerStore((s) => s.isLoading);
  const isMiniMode = usePlayerStore((s) => s.isMiniMode);

  useKeyboard();

  useEffect(() => {
    getSocket();
    const timer = setTimeout(() => {
      usePlayerStore.getState().setLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (isMiniMode) {
    return (
      <div className="h-screen w-screen bg-bg-primary flex flex-col">
        <Navbar />
        <MiniPlayer />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-bg-primary">
      <Navbar />
      <MainContent />
      <InteractionBar />
    </div>
  );
}
