import { create } from "zustand";

interface PlayerState {
  // Playback
  isPlaying: boolean;
  currentSong: {
    id: string;
    title: string;
    artist: string;
    album: string;
    duration: number;
    coverUrl: string | null;
  } | null;
  currentTime: number;
  volume: number;
  isMuted: boolean;
  isFavorited: boolean;

  // Queue
  queue: Array<{
    id: string;
    title: string;
    artist: string;
    duration: number;
    coverUrl: string | null;
  }>;

  // UI
  isQueueOpen: boolean;
  isSettingsOpen: boolean;
  isMiniMode: boolean;
  isOnline: boolean;

  // Actions
  setPlaying: (playing: boolean) => void;
  setCurrentSong: (song: PlayerState["currentSong"]) => void;
  setCurrentTime: (time: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleFavorite: () => void;
  setQueue: (queue: PlayerState["queue"]) => void;
  toggleQueue: () => void;
  toggleSettings: () => void;
  toggleMiniMode: () => void;
  setOnline: (online: boolean) => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  isPlaying: false,
  currentSong: null,
  currentTime: 0,
  volume: 0.72,
  isMuted: false,
  isFavorited: false,

  queue: [],

  isQueueOpen: false,
  isSettingsOpen: false,
  isMiniMode: false,
  isOnline: true,

  setPlaying: (playing) => set({ isPlaying: playing }),
  setCurrentSong: (song) => set({ currentSong: song }),
  setCurrentTime: (time) => set({ currentTime: time }),
  setVolume: (volume) => set({ volume }),
  toggleMute: () => set((s) => ({ isMuted: !s.isMuted })),
  toggleFavorite: () => set((s) => ({ isFavorited: !s.isFavorited })),
  setQueue: (queue) => set({ queue }),
  toggleQueue: () => set((s) => ({ isQueueOpen: !s.isQueueOpen })),
  toggleSettings: () => set((s) => ({ isSettingsOpen: !s.isSettingsOpen })),
  toggleMiniMode: () => set((s) => ({ isMiniMode: !s.isMiniMode })),
  setOnline: (online) => set({ isOnline: online }),
}));
