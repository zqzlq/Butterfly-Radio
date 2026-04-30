import { io, Socket } from "socket.io-client";
import { usePlayerStore, type Song, type AiCommentary } from "@/store";

const SOCKET_URL = "http://127.0.0.1:3000";

let socket: Socket | null = null;

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
      const commentary: AiCommentary = {
        id: data.id || Date.now().toString(),
        content: data.content,
        context: data.context || "unknown",
        host_name: data.host_name,
        timestamp: Date.now(),
        replay: data.replay,
      };
      store().addCommentary(commentary);
    });

    // Streaming commentary events
    socket.on("ai_commentary_stream", (data: any) => {
      const { id, type, content, full_content, host_name, context } = data;

      if (type === "start") {
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
      } else if (type === "error") {
        // Remove the streaming bubble on error
        store().finishStreamingCommentary(id, content || "口播生成失败");
      }
    });

    // ─── Interaction events ───

    socket.on("interaction", (data: any) => {
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
