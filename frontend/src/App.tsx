import { useEffect } from "react";
import { usePlayerStore } from "@/store";
import { getSocket } from "@/socket";
import { useKeyboard } from "@/hooks/useKeyboard";
import { useBeat } from "@/hooks/useBeat";
import { liveApi, playlistApi, aiApi, configApi } from "@/lib/api";
import type { ThemeId } from "@/store";
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

    if (api) {
      const unsubscribe = api.onBackendReady(() => {
        console.log("[App] 后端已就绪，开始初始化...");
        initializeApp();
      });
      getSocket();
      return unsubscribe;
    }

    getSocket();
    initializeApp();
  }, []);

  async function initializeApp() {
    const store = usePlayerStore.getState();

    try {
      const songs = await playlistApi.listSongs();
      if (songs.length > 0) {
        store.setQueue(songs);
      }

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

      try {
        const hostInfo = await aiApi.getHost();
        if (hostInfo.host?.name) {
          store.setHostName(hostInfo.host.name);
        }
      } catch {
        // Ignore
      }

      try {
        const configData = await configApi.getAll();
        const savedTheme = configData?.configs?.theme as ThemeId | undefined;
        if (savedTheme && ["sci-fi", "ins", "warm"].includes(savedTheme)) {
          store.setTheme(savedTheme);
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
      <div className="h-screen w-screen bg-bg-primary flex flex-col relative">
        <Navbar />
        <MiniPlayer />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-bg-primary relative">
      {/* Noise overlay */}
      <div className="absolute inset-0 pointer-events-none noise-overlay z-0" />
      <div className="relative z-10 flex flex-col h-full">
        <Navbar />
        <MainContent />
        <InteractionBar />
      </div>
    </div>
  );
}
