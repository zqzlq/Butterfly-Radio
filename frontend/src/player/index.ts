import { Howl } from "howler";

let currentHowl: Howl | null = null;

export interface PlayerCallbacks {
  onPlay?: () => void;
  onPause?: () => void;
  onStop?: () => void;
  onEnd?: () => void;
  onLoadError?: (id: number, error: unknown) => void;
}

export function loadAndPlay(src: string, callbacks?: PlayerCallbacks): Howl {
  if (currentHowl) {
    currentHowl.unload();
  }

  currentHowl = new Howl({
    src: [src],
    html5: true,
    volume: 0.72,
    onplay: () => callbacks?.onPlay?.(),
    onpause: () => callbacks?.onPause?.(),
    onstop: () => callbacks?.onStop?.(),
    onend: () => callbacks?.onEnd?.(),
    onloaderror: (_id, err) => callbacks?.onLoadError?.(_id, err),
  });

  currentHowl.play();
  return currentHowl;
}

export function pausePlayback() {
  currentHowl?.pause();
}

export function resumePlayback() {
  currentHowl?.play();
}

export function stopPlayback() {
  currentHowl?.stop();
}

export function setVolume(vol: number) {
  currentHowl?.volume(vol);
}

export function seekTo(pos: number) {
  currentHowl?.seek(pos);
}

export function getDuration(): number {
  return currentHowl?.duration() ?? 0;
}

export function getCurrentTime(): number {
  return (currentHowl?.seek() as number) ?? 0;
}
