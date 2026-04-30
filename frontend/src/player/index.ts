import { Howl } from "howler";
import { usePlayerStore, type Song } from "@/store";
import { getMediaUrl } from "@/lib/api";

let currentHowl: Howl | null = null;
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

  // Unload previous
  if (currentHowl) {
    currentHowl.unload();
    currentHowl = null;
  }

  const src = getMediaUrl(song.id);

  currentHowl = new Howl({
    src: [src],
    html5: true,
    volume: store.isMuted ? 0 : store.volume,
    onplay: () => {
      usePlayerStore.getState().setPlaying(true);

      // Connect to Web Audio API for spectrum analysis
      try {
        const { ctx, analyser } = ensureAudioContext();
        // @ts-ignore — Howler internal access
        const mediaNode = (currentHowl as any)?._sounds?.[0]?._node;
        if (mediaNode && ctx.state === "suspended") {
          ctx.resume();
        }
        if (mediaNode) {
          const source = ctx.createMediaElementSource(mediaNode);
          source.connect(analyser);
          analyser.connect(ctx.destination);
        }
      } catch (e) {
        // MediaElementSource already connected — that's fine
      }
    },
    onpause: () => {
      usePlayerStore.getState().setPlaying(false);
    },
    onend: () => {
      usePlayerStore.getState().setPlaying(false);
      // Auto-advance to next song
      advanceToNext();
    },
    onloaderror: (_id, err) => {
      console.error("[Player] 加载失败:", err);
    },
    onplayerror: (_id, err) => {
      console.error("[Player] 播放失败:", err);
    },
  });

  // Update store
  store.setCurrentSong(song);
  store.setDuration(song.duration);

  // Play
  currentHowl.play();

  // Start progress tracking
  startProgressSync();
}

let progressTimer: ReturnType<typeof setInterval> | null = null;

function startProgressSync() {
  stopProgressSync();
  progressTimer = setInterval(() => {
    if (currentHowl && currentHowl.playing()) {
      const time = currentHowl.seek() as number;
      if (typeof time === "number" && isFinite(time)) {
        usePlayerStore.getState().setCurrentTime(time);
      }
    }
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
  if (!currentHowl) return;
  if (currentHowl.playing()) {
    currentHowl.pause();
  } else {
    currentHowl.play();
  }
}

/**
 * Pause playback.
 */
export function pausePlayback(): void {
  currentHowl?.pause();
}

/**
 * Resume playback.
 */
export function resumePlayback(): void {
  currentHowl?.play();
}

/**
 * Stop playback.
 */
export function stopPlayback(): void {
  stopProgressSync();
  currentHowl?.stop();
  currentHowl?.unload();
  currentHowl = null;
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
  if (currentHowl) {
    currentHowl.seek(seconds);
    usePlayerStore.getState().setCurrentTime(seconds);
  }
}

/**
 * Set volume (0-1).
 */
export function setVolume(vol: number): void {
  usePlayerStore.getState().setVolume(vol);
  if (currentHowl) {
    currentHowl.volume(usePlayerStore.getState().isMuted ? 0 : vol);
  }
}

/**
 * Toggle mute.
 */
export function toggleMute(): void {
  const store = usePlayerStore.getState();
  store.toggleMute();
  if (currentHowl) {
    currentHowl.volume(store.isMuted ? 0 : store.volume);
  }
}

/**
 * Get total duration of current song.
 */
export function getDuration(): number {
  return currentHowl?.duration() ?? 0;
}

/**
 * Get current playback position.
 */
export function getCurrentTime(): number {
  return (currentHowl?.seek() as number) ?? 0;
}

/**
 * Check if currently playing.
 */
export function isPlaying(): boolean {
  return currentHowl?.playing() ?? false;
}
