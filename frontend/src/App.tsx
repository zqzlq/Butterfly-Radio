import { useEffect } from "react";
import { usePlayerStore } from "@/store";
import { getSocket } from "@/socket";
import { useKeyboard } from "@/hooks/useKeyboard";
import { useBeat } from "@/hooks/useBeat";
import { liveApi, playlistApi, aiApi } from "@/lib/api";
import { isElectron } from "@/lib/electron";
import { Navbar } from "@/components/Navbar";
import { MainContent } from "@/components/MainContent";
import { InteractionBar } from "@/components/InteractionBar";
import { LoadingScreen } from "@/components/LoadingScreen";
import { MiniPlayer } from "@/components/MiniPlayer";

export default function App() {
  const isLoading = usePlayerStore((s) => s.isLoading);
  const isMiniMode = usePlayerStore((s) => s.isMiniMode);

  useKeyboard();
  useBeat();

  useEffect(() => {
    const api = isElectron() ? window.electronAPI : null;

    // In Electron, wait for backend-ready signal before initializing
    if (api) {
      const unsubscribe = api.onBackendReady(() => {
        console.log("[App] 后端已就绪，开始初始化...");
        initializeApp();
      });
      // Also start Socket.IO immediately
      getSocket();
      return unsubscribe;
    }

    // In browser mode, initialize directly
    getSocket();
    initializeApp();
  }, []);

  async function initializeApp() {
    const store = usePlayerStore.getState();

    try {
      // Load songs
      const songs = await playlistApi.listSongs();
      if (songs.length > 0) {
        store.setQueue(songs);
      }

      // Load broadcast state
      try {
        const state = await liveApi.getState();
        if (state.is_live && state.current_song) {
          store.setLive(true);
          store.setCurrentSong(state.current_song);
          if (state.queue?.length > 0) {
            store.setQueue(state.queue);
            store.setQueueIndex(state.queue_index || 0);
          }
          store.setCurrentTime(state.current_position || 0);
          store.setPlaying(true);
        } else if (songs.length > 0) {
          store.setCurrentSong(songs[0]);
          store.setDuration(songs[0].duration);
        }
      } catch {
        console.warn("后端状态获取失败，使用本地数据");
      }

      // Load AI host info
      try {
        const hostInfo = await aiApi.getHost();
        if (hostInfo.host?.name) {
          store.setHostName(hostInfo.host.name);
        }
      } catch {
        // Ignore
      }

      store.setLoading(false);
    } catch (e: any) {
      console.error("应用初始化失败:", e);
      store.setLoading(false);
    }
  }

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
