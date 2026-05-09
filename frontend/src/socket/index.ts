import { io, Socket } from "socket.io-client";
import { usePlayerStore, type Song, type AiCommentary } from "@/store";
import { getTtsAudioUrl } from "@/lib/api";
import { loadAndPlay } from "@/player";

const SOCKET_URL = "http://127.0.0.1:3000";

/**
 * Parse AI commentary for song recommendation marker and play if found.
 * Format: [推荐: song_title]
 */
function parseAndPlayRecommendation(content: string): void {
  const match = content.match(/\[推荐[:：]\s*(.+?)\]/);
  if (!match?.[1]) return;

  const songName = match[1].trim();
  if (!songName) return;

  const queue = usePlayerStore.getState().queue;
  // Try exact match first, then partial match
  const found = queue.find((s) => s.title === songName) ||
                queue.find((s) => s.title.includes(songName)) ||
                queue.find((s) => songName.includes(s.title));

  if (found) {
    console.log(`[AI推荐] 为你播放: ${found.title}`);
    loadAndPlay(found);
  } else {
    console.log(`[AI推荐] 未找到歌曲: ${songName}`);
  }
}

let socket: Socket | null = null;
// Track IDs that have already been created to prevent duplicates
const seenCommentaryIds = new Set<string>();
const seenInteractionIds = new Set<string>();
// Content-based dedup for interactions added locally before backend roundtrip
const pendingInteractionContent = new Map<string, number>(); // content → timestamp

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      transports: ["websocket", "polling"],
    });

    const store = usePlayerStore.getState;

    socket.on("connect", () => {
      console.log("[Socket.IO] 已连接:", socket?.id);
      store().setOnline(true);
    });

    socket.on("connected", (data: { sid: string }) => {
      console.log("[Socket.IO] 服务端确认:", data.sid);
    });

    socket.on("disconnect", (reason) => {
      console.log("[Socket.IO] 断开连接:", reason);
      store().setOnline(false);
    });

    socket.on("connect_error", (err) => {
      console.error("[Socket.IO] 连接错误:", err.message);
      store().setOnline(false);
    });

    // ─── Broadcast events ───

    socket.on("playback_state", (data: any) => {
      if ("is_playing" in data) store().setPlaying(data.is_playing);
      if ("current_time" in data) store().setCurrentTime(data.current_time);
      if ("duration" in data) store().setDuration(data.duration);
    });

    socket.on("song_change", (data: Song) => {
      store().setCurrentSong(data);
      store().setPlaying(true);
    });

    socket.on("broadcast_status", (data: { is_live: boolean }) => {
      store().setLive(data.is_live);
    });

    socket.on("queue_update", (data: { queue: Song[] }) => {
      store().setQueue(data.queue);
    });

    // ─── AI events ───

    socket.on("ai_commentary", (data: any) => {
      const id = data.id || Date.now().toString();
      console.log("[Socket.IO] ai_commentary:", id, data.content?.slice(0, 30));
      if (seenCommentaryIds.has(id)) {
        console.warn("[Socket.IO] ai_commentary DUPLICATE blocked:", id);
        return;
      }
      seenCommentaryIds.add(id);
      if (seenCommentaryIds.size > 100) {
        const first = seenCommentaryIds.values().next().value;
        seenCommentaryIds.delete(first);
      }
      const commentary: AiCommentary = {
        id,
        content: data.content,
        context: data.context || "unknown",
        host_name: data.host_name,
        timestamp: Date.now(),
        replay: data.replay,
      };
      store().addCommentary(commentary);
      // Parse for song recommendation
      if (data.content) {
        parseAndPlayRecommendation(data.content);
      }
      // Play TTS audio if available
      if (data.audio_path) {
        const filename = data.audio_path.split(/[/\\]/).pop();
        if (filename) {
          const audio = new Audio(getTtsAudioUrl(filename));
          audio.volume = store().volume;
          audio.play().catch((e) => console.warn("[TTS] 播放失败:", e));
        }
      }
    });

    // Streaming commentary events
    socket.on("ai_commentary_stream", (data: any) => {
      const { id, type, content, full_content, host_name, context } = data;
      console.log("[Socket.IO] ai_commentary_stream:", type, id, content?.slice(0, 30));

      if (type === "start") {
        if (seenCommentaryIds.has(id)) {
          console.warn("[Socket.IO] ai_commentary_stream DUPLICATE blocked:", id);
          return;
        }
        seenCommentaryIds.add(id);
        if (seenCommentaryIds.size > 100) {
          const first = seenCommentaryIds.values().next().value;
          seenCommentaryIds.delete(first);
        }
        // Create an empty streaming bubble
        const commentary: AiCommentary = {
          id,
          content: "",
          context: context || "unknown",
          host_name,
          timestamp: Date.now(),
          streaming: true,
        };
        store().addCommentary(commentary);
      } else if (type === "chunk") {
        // Update the streaming bubble content
        store().updateStreamingCommentary(id, full_content);
      } else if (type === "done") {
        // Finalize the streaming bubble
        store().finishStreamingCommentary(id, content);
        // Parse for song recommendation
        if (content) {
          parseAndPlayRecommendation(content);
        }
        // Play TTS audio if available
        if (data.audio_path) {
          const filename = data.audio_path.split(/[/\\]/).pop();
          if (filename) {
            const audio = new Audio(getTtsAudioUrl(filename));
            audio.volume = store().volume;
            audio.play().catch((e) => console.warn("[TTS] 播放失败:", e));
          }
        }
      } else if (type === "error") {
        // Remove the streaming bubble on error
        store().finishStreamingCommentary(id, content || "口播生成失败");
      }
    });

    // ─── Interaction events ───

    socket.on("interaction", (data: any) => {
      const id = data.id;
      if (id && seenInteractionIds.has(id)) {
        console.warn("[Socket.IO] interaction DUPLICATE blocked:", id);
        return;
      }
      if (id) {
        seenInteractionIds.add(id);
        if (seenInteractionIds.size > 100) {
          const first = seenInteractionIds.values().next().value;
          if (first) seenInteractionIds.delete(first);
        }
      }
      // Skip if this interaction was already added locally (content-based dedup)
      const content = data.content;
      if (content && pendingInteractionContent.has(content)) {
        pendingInteractionContent.delete(content);
        return;
      }
      // Assign client-side timestamp for correct chronological sorting with AI commentary
      data.receivedAt = Date.now();
      store().addInteraction(data);
    });
  }

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function emitEvent(event: string, data?: any) {
  const s = getSocket();
  if (s.connected) {
    s.emit(event, data);
  }
}

/**
 * Register a locally-added interaction so the socket handler
 * can skip the duplicate broadcast from the backend.
 */
export function markPendingInteraction(content: string) {
  pendingInteractionContent.set(content, Date.now());
  // Auto-cleanup after 10s
  setTimeout(() => pendingInteractionContent.delete(content), 10000);
}
