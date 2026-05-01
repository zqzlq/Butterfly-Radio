import { usePlayerStore, type Song } from "@/store";
import { getMediaUrl } from "@/lib/api";

let audioEl: HTMLAudioElement | null = null;
let analyserNode: AnalyserNode | null = null;
let audioContext: AudioContext | null = null;

/**
 * Initialize the Web Audio API context and analyser for spectrum visualization.
 */
function ensureAudioContext(): { ctx: AudioContext; analyser: AnalyserNode } {
  if (!audioContext) {
    audioContext = new AudioContext();
    analyserNode = audioContext.createAnalyser();
    analyserNode.fftSize = 128;
    analyserNode.smoothingTimeConstant = 0.8;
  }
  return { ctx: audioContext, analyser: analyserNode! };
}

/**
 * Get the current AnalyserNode for spectrum data.
 */
export function getAnalyser(): AnalyserNode | null {
  return analyserNode;
}

/**
 * Get current frequency data for visualization.
 */
export function getFrequencyData(): Uint8Array {
  const analyser = analyserNode;
  if (!analyser) return new Uint8Array(64);
  const data = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(data);
  return data;
}

/**
 * Load and play a song.
 */
export function loadAndPlay(song: Song): void {
  const store = usePlayerStore.getState();

  // Clean up previous
  if (audioEl) {
    audioEl.pause();
    audioEl.removeAttribute("src");
    audioEl.load();
    audioEl = null;
  }

  audioEl = new Audio();
  audioEl.preload = "auto";
  audioEl.volume = store.isMuted ? 0 : store.volume;

  const src = getMediaUrl(song.id);
  audioEl.src = src;

  // Events
  audioEl.addEventListener("play", () => {
    usePlayerStore.getState().setPlaying(true);
    updateMediaSession(song);
  });

  audioEl.addEventListener("pause", () => {
    usePlayerStore.getState().setPlaying(false);
  });

  audioEl.addEventListener("ended", () => {
    usePlayerStore.getState().setPlaying(false);
    advanceToNext();
  });

  audioEl.addEventListener("loadedmetadata", () => {
    // Update duration from actual audio file
    if (audioEl && isFinite(audioEl.duration)) {
      usePlayerStore.getState().setDuration(audioEl.duration);
    }
  });

  audioEl.addEventListener("error", (e) => {
    console.error("[Player] 音频加载失败:", e);
  });

  // Update store
  store.setCurrentSong(song);
  store.setDuration(song.duration);

  // Play
  const playPromise = audioEl.play();
  if (playPromise) {
    playPromise.catch((err) => {
      console.warn("[Player] 自动播放被阻止:", err);
    });
  }

  // Resume AudioContext if suspended
  try {
    const { ctx } = ensureAudioContext();
    if (ctx.state === "suspended") {
      ctx.resume();
    }
  } catch {
    // Ignore
  }

  // Start progress tracking
  startProgressSync();
}

/**
 * Update Media Session API for system media integration.
 */
function updateMediaSession(song: Song): void {
  if (!("mediaSession" in navigator)) return;

  navigator.mediaSession.metadata = new MediaMetadata({
    title: song.title,
    artist: song.artist,
    album: song.album || "Butterfly Radio",
  });

  navigator.mediaSession.setActionHandler("play", () => resumePlayback());
  navigator.mediaSession.setActionHandler("pause", () => pausePlayback());
  navigator.mediaSession.setActionHandler("previoustrack", () => skipPrev());
  navigator.mediaSession.setActionHandler("nexttrack", () => skipNext());
  navigator.mediaSession.setActionHandler("seekto", (details) => {
    if (details.seekTime != null) {
      seekTo(details.seekTime);
    }
  });
  navigator.mediaSession.setActionHandler("seekbackward", (details) => {
    const offset = details.seekOffset || 10;
    seekTo(Math.max(0, getCurrentTime() - offset));
  });
  navigator.mediaSession.setActionHandler("seekforward", (details) => {
    const offset = details.seekOffset || 10;
    seekTo(Math.min(getDuration(), getCurrentTime() + offset));
  });
}

/**
 * Sync Media Session playback state with current player state.
 */
function syncMediaSessionState(): void {
  if (!("mediaSession" in navigator)) return;
  navigator.mediaSession.playbackState = isPlaying() ? "playing" : "paused";
  try {
    navigator.mediaSession.setPositionState({
      duration: getDuration(),
      playbackRate: 1,
      position: getCurrentTime(),
    });
  } catch {
    // Ignore
  }
}

let progressTimer: ReturnType<typeof setInterval> | null = null;

function startProgressSync() {
  stopProgressSync();
  progressTimer = setInterval(() => {
    if (audioEl && !audioEl.paused) {
      const time = audioEl.currentTime;
      if (typeof time === "number" && isFinite(time)) {
        usePlayerStore.getState().setCurrentTime(time);
      }
    }
    syncMediaSessionState();
  }, 250);
}

function stopProgressSync() {
  if (progressTimer) {
    clearInterval(progressTimer);
    progressTimer = null;
  }
}

function advanceToNext() {
  const store = usePlayerStore.getState();
  const { queue, queueIndex } = store;
  if (queue.length === 0) return;

  const nextIndex = (queueIndex + 1) % queue.length;
  store.setQueueIndex(nextIndex);
  loadAndPlay(queue[nextIndex]);
}

/**
 * Toggle play/pause.
 */
export function togglePlay(): void {
  if (!audioEl) return;
  if (audioEl.paused) {
    audioEl.play().catch(() => {});
  } else {
    audioEl.pause();
  }
}

/**
 * Pause playback.
 */
export function pausePlayback(): void {
  audioEl?.pause();
}

/**
 * Resume playback.
 */
export function resumePlayback(): void {
  audioEl?.play().catch(() => {});
}

/**
 * Stop playback.
 */
export function stopPlayback(): void {
  stopProgressSync();
  if (audioEl) {
    audioEl.pause();
    audioEl.removeAttribute("src");
    audioEl.load();
    audioEl = null;
  }
  usePlayerStore.getState().setPlaying(false);
  usePlayerStore.getState().setCurrentTime(0);
}

/**
 * Skip to next song.
 */
export function skipNext(): void {
  const store = usePlayerStore.getState();
  const { queue, queueIndex } = store;
  if (queue.length === 0) return;
  const nextIndex = (queueIndex + 1) % queue.length;
  store.setQueueIndex(nextIndex);
  loadAndPlay(queue[nextIndex]);
}

/**
 * Go to previous song.
 */
export function skipPrev(): void {
  const store = usePlayerStore.getState();
  const { queue, queueIndex } = store;
  if (queue.length === 0) return;
  const prevIndex = (queueIndex - 1 + queue.length) % queue.length;
  store.setQueueIndex(prevIndex);
  loadAndPlay(queue[prevIndex]);
}

/**
 * Seek to position (in seconds).
 */
export function seekTo(seconds: number): void {
  if (!audioEl) return;
  audioEl.currentTime = seconds;
  usePlayerStore.getState().setCurrentTime(seconds);
}

/**
 * Set volume (0-1).
 */
export function setVolume(vol: number): void {
  usePlayerStore.getState().setVolume(vol);
  if (audioEl) {
    audioEl.volume = usePlayerStore.getState().isMuted ? 0 : vol;
  }
}

/**
 * Toggle mute.
 */
export function toggleMute(): void {
  const store = usePlayerStore.getState();
  store.toggleMute();
  if (audioEl) {
    audioEl.volume = store.isMuted ? 0 : store.volume;
  }
}

/**
 * Get total duration of current song.
 */
export function getDuration(): number {
  if (audioEl && isFinite(audioEl.duration)) return audioEl.duration;
  return usePlayerStore.getState().duration || 0;
}

/**
 * Get current playback position.
 */
export function getCurrentTime(): number {
  return audioEl?.currentTime || 0;
}

/**
 * Check if currently playing.
 */
export function isPlaying(): boolean {
  return audioEl ? !audioEl.paused : false;
}
