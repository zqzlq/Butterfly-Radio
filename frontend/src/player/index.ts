import { Howl } from "howler";
import { usePlayerStore, type Song } from "@/store";
import { getMediaUrl } from "@/lib/api";

let currentHowl: Howl | null = null;
let pendingSeek: number | null = null;
let pendingSeekNode: HTMLAudioElement | null = null;
let pendingSeekHandler: (() => void) | null = null;
let analyserNode: AnalyserNode | null = null;
let audioContext: AudioContext | null = null;
let mediaSourceNode: MediaElementAudioSourceNode | null = null;

/**
 * Initialize the Web Audio API context and analyser for spectrum visualization.
 */
function ensureAudioContext(): { ctx: AudioContext; analyser: AnalyserNode } {
  if (!audioContext) {
    audioContext = new AudioContext();
    analyserNode = audioContext.createAnalyser();
    analyserNode.fftSize = 256;
    analyserNode.smoothingTimeConstant = 0.8;
  }
  return { ctx: audioContext, analyser: analyserNode! };
}

/**
 * Connect an <audio> element to Web Audio API for frequency analysis.
 * MUST await ctx.resume() before createMediaElementSource — otherwise the
 * audio gets trapped in a suspended graph and produces no sound.
 */
async function connectAudioNode(node: HTMLAudioElement): Promise<void> {
  try {
    const { ctx, analyser } = ensureAudioContext();

    // Resume context first — this is the critical step
    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    // Only create source once per audio element
    if (!mediaSourceNode) {
      mediaSourceNode = ctx.createMediaElementSource(node);
      mediaSourceNode.connect(analyser);
      analyser.connect(ctx.destination);
    }
  } catch {
    // MediaElementSource already connected for this element — OK
  }
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

  // Cancel any pending seek from previous song
  cancelPendingSeek();

  // Reset Web Audio source node (will reconnect on play)
  mediaSourceNode = null;

  // Unload previous
  if (currentHowl) {
    currentHowl.unload();
    currentHowl = null;
  }

  const src = getMediaUrl(song.id);

  // Extract format from file path (e.g. "D:/music/song.mp3" -> ["mp3"])
  const ext = song.file_path?.split(".").pop()?.toLowerCase();
  const formats = ext ? [ext] : undefined;

  currentHowl = new Howl({
    src: [src],
    html5: true,
    format: formats,
    volume: store.isMuted ? 0 : store.volume,
    onplay: () => {
      usePlayerStore.getState().setPlaying(true);

      // Connect to Web Audio API for frequency analysis + visualization
      // Capture the audio node now — currentHowl may change before async completes
      try {
        // @ts-ignore — Howler internal
        const audioNode = currentHowl?._sounds?.[0]?._node;
        if (audioNode instanceof HTMLMediaElement) {
          connectAudioNode(audioNode).catch(() => {});
        }
      } catch { /* ignore */ }

      // Update Media Session metadata
      updateMediaSession(song);
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
    // Ignore if duration is not available yet
  }
}

let progressTimer: ReturnType<typeof setInterval> | null = null;

function startProgressSync() {
  stopProgressSync();
  progressTimer = setInterval(() => {
    if (currentHowl && currentHowl.playing()) {
      // Use Howler's seek() for reading — it returns node.currentTime in HTML5 mode
      const time = currentHowl.seek() as number;
      if (typeof time === "number" && isFinite(time) && time > 0) {
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
 * Get the underlying HTML audio element from Howler.
 * In html5 mode, Howler stores the <audio> element at _sounds[0]._node.
 */
function getAudioNode(): HTMLAudioElement | null {
  if (!currentHowl) return null;
  try {
    // @ts-ignore — Howler internal: _sounds[0]._node is the <audio> element
    const node = currentHowl._sounds?.[0]?._node;
    if (node instanceof HTMLAudioElement) return node;
  } catch { /* ignore */ }
  return null;
}

/**
 * Cancel any pending seek that's waiting for metadata to load.
 */
function cancelPendingSeek() {
  if (pendingSeekNode && pendingSeekHandler) {
    pendingSeekNode.removeEventListener("loadedmetadata", pendingSeekHandler);
  }
  pendingSeek = null;
  pendingSeekNode = null;
  pendingSeekHandler = null;
}

/**
 * Seek to position (in seconds).
 * Bypasses Howler's seek() to avoid the pause→play restart bug in HTML5 mode.
 * Must sync Howler's internal _seek so _start() reads the correct position on play().
 */
export function seekTo(seconds: number): void {
  if (!currentHowl) return;
  cancelPendingSeek();

  const clamped = Math.max(0, seconds);
  const node = getAudioNode();

  // Sync Howler's internal seek state — critical!
  // Howler's _start() reads sound._seek to determine playback position.
  // Without this, play() restarts from the old position.
  try {
    // @ts-ignore — Howler internal
    const sounds = currentHowl._sounds;
    if (sounds?.[0]) {
      sounds[0]._seek = clamped;
      sounds[0]._ended = false;
    }
    // Clear old end timer — otherwise it fires based on the OLD seek position
    // @ts-ignore — Howler internal
    if (currentHowl._clearTimer) currentHowl._clearTimer(sounds?.[0]?._id);
  } catch { /* ignore */ }

  if (node) {
    if (node.readyState >= 1) {
      node.currentTime = clamped;
    } else {
      // Metadata not loaded yet — defer seek
      pendingSeek = clamped;
      pendingSeekNode = node;
      const handler = () => {
        if (pendingSeekNode === node && pendingSeek !== null) {
          node.currentTime = pendingSeek;
        }
        cancelPendingSeek();
      };
      pendingSeekHandler = handler;
      node.addEventListener("loadedmetadata", handler, { once: true });
    }
  }

  usePlayerStore.getState().setCurrentTime(clamped);
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
  return currentHowl?.duration() || 0;
}

/**
 * Get current playback position.
 */
export function getCurrentTime(): number {
  return (currentHowl?.seek() as number) || 0;
}

/**
 * Check if currently playing.
 */
export function isPlaying(): boolean {
  return currentHowl?.playing() ?? false;
}
