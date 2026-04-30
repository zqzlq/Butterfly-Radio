import { create } from "zustand";

// ─── Types ───

export interface Song {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: number;
  cover_path?: string;
  file_path?: string;
  is_favorited: boolean;
  play_count: number;
}

export interface AiCommentary {
  id: string;
  content: string;
  context: string;
  host_name?: string;
  timestamp: number;
  replay?: boolean;
}

export interface User {
  id: string;
  nickname: string;
  avatar?: string;
}

// ─── State ───

interface PlayerState {
  // Playback
  isPlaying: boolean;
  currentSong: Song | null;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;

  // Queue
  queue: Song[];
  queueIndex: number;

  // Broadcast
  isLive: boolean;

  // AI
  hostName: string;
  commentaryHistory: AiCommentary[];

  // UI
  isQueueOpen: boolean;
  isSettingsOpen: boolean;
  isMiniMode: boolean;
  isOnline: boolean;
  isLoading: boolean;

  // User
  user: User | null;
  interactions: any[];

  // Actions — Playback
  setPlaying: (playing: boolean) => void;
  setCurrentSong: (song: Song | null) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;

  // Actions — Queue
  setQueue: (queue: Song[]) => void;
  setQueueIndex: (index: number) => void;

  // Actions — Broadcast
  setLive: (live: boolean) => void;

  // Actions — AI
  setHostName: (name: string) => void;
  addCommentary: (commentary: AiCommentary) => void;
  clearCommentary: () => void;

  // Actions — UI
  toggleQueue: () => void;
  toggleSettings: () => void;
  toggleMiniMode: () => void;
  setOnline: (online: boolean) => void;
  setLoading: (loading: boolean) => void;

  // Actions — User
  setUser: (user: User | null) => void;
  setInteractions: (interactions: any[]) => void;
  addInteraction: (interaction: any) => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  // Initial state
  isPlaying: false,
  currentSong: null,
  currentTime: 0,
  duration: 0,
  volume: 0.72,
  isMuted: false,

  queue: [],
  queueIndex: 0,

  isLive: false,

  hostName: "DJ Butterfly",
  commentaryHistory: [],

  isQueueOpen: false,
  isSettingsOpen: false,
  isMiniMode: false,
  isOnline: true,
  isLoading: true,

  user: null,
  interactions: [],

  // Actions
  setPlaying: (playing) => set({ isPlaying: playing }),
  setCurrentSong: (song) => set({ currentSong: song, currentTime: 0 }),
  setCurrentTime: (time) => set({ currentTime: time }),
  setDuration: (duration) => set({ duration }),
  setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)) }),
  toggleMute: () => set((s) => ({ isMuted: !s.isMuted })),

  setQueue: (queue) => set({ queue }),
  setQueueIndex: (index) => set({ queueIndex: index }),

  setLive: (live) => set({ isLive: live }),

  setHostName: (name) => set({ hostName: name }),
  addCommentary: (commentary) =>
    set((s) => ({
      commentaryHistory: [...s.commentaryHistory.slice(-4), commentary],
    })),
  clearCommentary: () => set({ commentaryHistory: [] }),

  toggleQueue: () => set((s) => ({ isQueueOpen: !s.isQueueOpen })),
  toggleSettings: () => set((s) => ({ isSettingsOpen: !s.isSettingsOpen })),
  toggleMiniMode: () => set((s) => ({ isMiniMode: !s.isMiniMode })),
  setOnline: (online) => set({ isOnline: online }),
  setLoading: (loading) => set({ isLoading: loading }),

  setUser: (user) => set({ user }),
  setInteractions: (interactions) => set({ interactions }),
  addInteraction: (interaction) =>
    set((s) => ({ interactions: [...s.interactions.slice(-49), interaction] })),
}));
