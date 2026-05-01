const BASE_URL = "http://127.0.0.1:3000/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const isFormData = options?.body instanceof URLSearchParams;
  const headers: Record<string, string> = isFormData
    ? { "Content-Type": "application/x-www-form-urlencoded", ...(options?.headers as Record<string, string>) }
    : { "Content-Type": "application/json", ...(options?.headers as Record<string, string>) };

  const res = await fetch(`${BASE_URL}${path}`, {
    headers,
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `请求失败: ${res.status}`);
  }
  return res.json();
}

// ─── Live ───

export const liveApi = {
  getState: () => request<any>("/live/state"),
  play: (action: string, songId?: string) =>
    request<any>("/live/play", {
      method: "POST",
      body: JSON.stringify({ action, song_id: songId }),
    }),
  start: () => request<any>("/live/start", { method: "POST" }),
  stop: () => request<any>("/live/stop", { method: "POST" }),
  rebuildQueue: (mode = "shuffle") =>
    request<any>(`/live/queue/rebuild?mode=${mode}`, { method: "POST" }),
};

// ─── Playlist ───

export const playlistApi = {
  listSongs: (keyword?: string) =>
    request<any[]>(`/playlist/songs${keyword ? `?keyword=${keyword}` : ""}`),
  getSong: (id: string) => request<any>(`/playlist/songs/${id}`),
  toggleFavorite: (id: string) =>
    request<any>(`/playlist/songs/${id}/favorite`, { method: "POST" }),
  importDir: (dir: string) =>
    request<any[]>("/playlist/songs/import", {
      method: "POST",
      body: new URLSearchParams({ directory: dir }),
    }),
  deleteSong: (id: string) =>
    request<any>(`/playlist/songs/${id}`, { method: "DELETE" }),
  browse: (path: string) =>
    request<{ current: string; parent: string | null; items: { name: string; path: string }[] }>(
      `/playlist/browse?path=${encodeURIComponent(path)}`
    ),
  listPlaylists: () => request<any[]>("/playlist/"),
  getPlaylist: (id: string) => request<any>(`/playlist/${id}`),
};

// ─── Interaction ───

export const interactionApi = {
  list: (limit = 20) => request<any[]>(`/interaction/?limit=${limit}`),
  send: (content: string, type = "message") =>
    request<any>("/interaction/", {
      method: "POST",
      body: JSON.stringify({ content, interaction_type: type }),
    }),
};

// ─── AI ───

export const aiApi = {
  getHost: () => request<any>("/ai/host"),
  updateConfig: (config: Record<string, any>) =>
    request<any>("/ai/config", {
      method: "PUT",
      body: JSON.stringify(config),
    }),
  generateCommentary: (context: string, songId?: string, userMessage?: string, stream = true) =>
    request<any>("/ai/commentary", {
      method: "POST",
      body: JSON.stringify({ context, song_id: songId, user_message: userMessage, stream }),
    }),
  getPresets: () => request<Record<string, any>>("/ai/presets"),
};

// ─── Media ───

export function getMediaUrl(songId: string): string {
  return `${BASE_URL.replace("/api", "")}/api/media/songs/${songId}/stream`;
}

export function getTtsAudioUrl(filename: string): string {
  return `${BASE_URL.replace("/api", "")}/api/media/tts/${filename}`;
}

// ─── Config ───

export const configApi = {
  getAll: () => request<{ configs: Record<string, string> }>("/config/"),
  update: (key: string, value: string) =>
    request<any>("/config/", {
      method: "PUT",
      body: JSON.stringify({ key, value }),
    }),
};
