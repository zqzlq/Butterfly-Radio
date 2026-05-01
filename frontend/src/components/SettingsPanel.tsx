import { useState, useEffect, useRef } from "react";
import { X, Cpu, Monitor, Cloud, FolderOpen, Music, RefreshCw, FileAudio } from "lucide-react";
import { usePlayerStore } from "@/store";
import { cn } from "@/lib/cn";
import { aiApi, playlistApi } from "@/lib/api";
import { isElectron } from "@/lib/electron";

const TABS = [
  { key: "ai", label: "AI 模式" },
  { key: "host", label: "主播设置" },
  { key: "music", label: "音乐库" },
  { key: "playback", label: "播放设置" },
  { key: "about", label: "关于" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const AI_MODES = [
  { key: "local_lightweight", label: "本地轻量模式", desc: "CPU 运行，8G 内存", icon: Cpu, recommended: true },
  { key: "local_highquality", label: "本地高质量模式", desc: "GPU 加速，16G 内存 + 4G 显存", icon: Monitor },
  { key: "cloud_api", label: "云 API 模式", desc: "无需本地算力，需联网", icon: Cloud },
] as const;

const HOST_STYLES = [
  { key: "warm", label: "温暖治愈" },
  { key: "rock", label: "摇滚热血" },
  { key: "literary", label: "文艺诗意" },
  { key: "news", label: "资讯播报" },
  { key: "cure", label: "治愈软萌" },
] as const;

export function SettingsPanel() {
  const toggleSettings = usePlayerStore((s) => s.toggleSettings);
  const streamingEnabled = usePlayerStore((s) => s.streamingEnabled);
  const setStreamingEnabled = usePlayerStore((s) => s.setStreamingEnabled);
  const [activeTab, setActiveTab] = useState<TabKey>("ai");
  const [aiMode, setAiMode] = useState("local_lightweight");
  const [hostStyle, setHostStyle] = useState("warm");
  const [ttsSpeed, setTtsSpeed] = useState(1.0);
  const [saving, setSaving] = useState(false);

  // Music library state
  const [songCount, setSongCount] = useState(0);
  const [importDir, setImportDir] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  useEffect(() => {
    playlistApi.listSongs().then((songs) => setSongCount(songs.length)).catch(() => {});
  }, []);

  const handleAiModeChange = async (mode: string) => {
    setAiMode(mode);
    setSaving(true);
    try {
      await aiApi.updateConfig({ mode });
    } catch (e) {
      console.error("保存 AI 模式失败:", e);
    } finally {
      setSaving(false);
    }
  };

  const handleHostStyleChange = async (style: string) => {
    setHostStyle(style);
    setSaving(true);
    try {
      await aiApi.updateConfig({ host_style: style });
    } catch (e) {
      console.error("保存主播风格失败:", e);
    } finally {
      setSaving(false);
    }
  };

  const handleTtsSpeedChange = async (speed: number) => {
    setTtsSpeed(speed);
    try {
      await aiApi.updateConfig({ tts_speed: speed });
    } catch (e) {
      console.error("保存语速失败:", e);
    }
  };

  const folderInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const doImport = async (dir: string) => {
    if (!dir || importing) return;
    setImporting(true);
    setImportResult(null);
    try {
      const songs = await playlistApi.importDir(dir);
      const store = usePlayerStore.getState();
      const allSongs = await playlistApi.listSongs();
      store.setQueue(allSongs);
      setSongCount(allSongs.length);
      setImportResult(`成功导入 ${songs.length} 首歌曲`);
      setImportDir("");
    } catch (e: any) {
      setImportResult(`导入失败: ${e.message}`);
    } finally {
      setImporting(false);
    }
  };

  const handleImport = () => doImport(importDir.trim());

  const handleFolderSelect = async () => {
    if (isElectron()) {
      const api = window.electronAPI as any;
      if (api?.openDirectoryDialog) {
        const result = await api.openDirectoryDialog();
        if (result) doImport(result);
        return;
      }
    }
    folderInputRef.current?.click();
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const onFolderInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      // Extract directory path from the first file
      const fullPath = files[0].webkitRelativePath || files[0].name;
      const relativePath = fullPath.split("/")[0];
      // Use the actual path if available (Electron/Chrome)
      const filePath = (files[0] as any).path;
      if (filePath) {
        const dir = filePath.replace(/[/\\][^/\\]+$/, "");
        doImport(dir);
      } else {
        setImportDir(relativePath);
      }
    }
    e.target.value = "";
  };

  const onFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setImporting(true);
    setImportResult(null);
    try {
      let totalImported = 0;
      const store = usePlayerStore.getState();
      for (const file of Array.from(files)) {
        const filePath = (file as any).path;
        if (filePath) {
          const dir = filePath.replace(/[/\\][^/\\]+$/, "");
          const songs = await playlistApi.importDir(dir);
          totalImported += songs.length;
        }
      }
      const allSongs = await playlistApi.listSongs();
      store.setQueue(allSongs);
      setSongCount(allSongs.length);
      setImportResult(`成功导入 ${totalImported} 首歌曲`);
    } catch (e: any) {
      setImportResult(`导入失败: ${e.message}`);
    } finally {
      setImporting(false);
    }
    e.target.value = "";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={toggleSettings} />

      {/* Panel */}
      <div className="relative w-[560px] max-h-[80vh] rounded-card bg-bg-secondary border border-white/[0.06] flex overflow-hidden animate-fade-in-up">
        {/* Sidebar */}
        <div className="w-40 shrink-0 border-r border-white/[0.06] py-4">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "w-full text-left px-4 py-2.5 text-sm transition-colors duration-200",
                activeTab === tab.key
                  ? "text-neon-cyan border-l-2 border-neon-cyan bg-neon-cyan/[0.05]"
                  : "text-text-secondary hover:text-text-primary border-l-2 border-transparent"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-text-primary">设置</h2>
            <div className="flex items-center gap-3">
              {saving && <span className="text-[10px] text-neon-cyan animate-pulse-neon">保存中...</span>}
              <button onClick={toggleSettings} className="p-1.5 text-text-secondary hover:text-text-primary transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Tab: AI Mode */}
          {activeTab === "ai" && (
            <div className="space-y-3">
              <p className="text-sm text-text-secondary mb-4">选择 AI 运行模式</p>
              {AI_MODES.map((mode) => {
                const Icon = mode.icon;
                const selected = aiMode === mode.key;
                return (
                  <button
                    key={mode.key}
                    onClick={() => handleAiModeChange(mode.key)}
                    className={cn(
                      "w-full flex items-center gap-4 p-4 rounded-card border transition-all duration-200 text-left",
                      selected
                        ? "border-neon-cyan bg-neon-cyan/[0.05] shadow-neon"
                        : "border-white/[0.06] hover:border-white/[0.12] bg-bg-card"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center",
                      selected ? "bg-neon-cyan/20 text-neon-cyan" : "bg-text-disabled/15 text-text-secondary"
                    )}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-text-primary">{mode.label}</span>
                        {mode.recommended && (
                          <span className="px-2 py-0.5 text-[9px] font-semibold rounded-capsule bg-neon-cyan/15 text-neon-cyan uppercase">
                            推荐
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-text-secondary">{mode.desc}</span>
                    </div>
                    <div className={cn(
                      "w-4 h-4 rounded-full border-2 transition-colors",
                      selected ? "border-neon-cyan bg-neon-cyan" : "border-text-disabled"
                    )} />
                  </button>
                );
              })}

              {/* Cloud API key input (only visible in cloud mode) */}
              {aiMode === "cloud_api" && (
                <div className="mt-4 p-4 rounded-card bg-bg-card border border-white/[0.06]">
                  <label className="text-sm text-text-secondary block mb-2">API 密钥</label>
                  <input
                    type="password"
                    placeholder="输入云 API 密钥"
                    className="w-full h-9 px-4 rounded-input bg-bg-secondary text-sm text-text-primary placeholder:text-text-disabled border border-transparent focus:border-neon-cyan outline-none transition-all"
                  />
                  <p className="text-[10px] text-text-disabled mt-2">支持火山引擎豆包 / 阿里云通义千问</p>
                </div>
              )}
            </div>
          )}

          {/* Tab: Host Style */}
          {activeTab === "host" && (
            <div className="space-y-4">
              <p className="text-sm text-text-secondary mb-4">选择 AI 主播风格</p>
              <div className="flex flex-wrap gap-2">
                {HOST_STYLES.map((style) => (
                  <button
                    key={style.key}
                    onClick={() => handleHostStyleChange(style.key)}
                    className={cn(
                      "px-4 py-2 rounded-capsule text-sm border transition-all duration-200",
                      hostStyle === style.key
                        ? "border-neon-cyan bg-neon-cyan/15 text-neon-cyan"
                        : "border-white/[0.06] text-text-secondary hover:border-white/[0.12]"
                    )}
                  >
                    {style.label}
                  </button>
                ))}
              </div>
              <div className="mt-6">
                <label className="text-sm text-text-secondary block mb-2">语速</label>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={ttsSpeed}
                  onChange={(e) => handleTtsSpeedChange(parseFloat(e.target.value))}
                  className="w-full accent-neon-cyan"
                />
                <div className="flex justify-between text-[10px] text-text-disabled mt-1">
                  <span>0.5x</span>
                  <span className="text-neon-cyan">{ttsSpeed.toFixed(1)}x</span>
                  <span>2.0x</span>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Music Library */}
          {activeTab === "music" && (
            <div className="space-y-5">
              {/* Current stats */}
              <div className="flex items-center gap-3 p-4 rounded-card bg-bg-card border border-white/[0.06]">
                <div className="w-10 h-10 rounded-lg bg-neon-purple/20 flex items-center justify-center">
                  <Music className="w-5 h-5 text-neon-purple" />
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">本地音乐库</p>
                  <p className="text-xs text-text-secondary">已收录 {songCount} 首歌曲</p>
                </div>
                <button
                  onClick={() => playlistApi.listSongs().then((s) => setSongCount(s.length)).catch(() => {})}
                  className="ml-auto p-1.5 text-text-secondary hover:text-neon-cyan transition-colors"
                  title="刷新"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {/* Import directory */}
              <div>
                <p className="text-sm text-text-secondary mb-3">添加音乐文件夹</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={importDir}
                    onChange={(e) => setImportDir(e.target.value)}
                    placeholder="输入文件夹路径，如 D:\Music"
                    className="flex-1 h-9 px-4 rounded-input bg-bg-secondary text-sm text-text-primary placeholder:text-text-disabled border border-transparent focus:border-neon-cyan outline-none transition-all"
                    onKeyDown={(e) => e.key === "Enter" && handleImport()}
                  />
                  <button
                    onClick={handleImport}
                    disabled={!importDir.trim() || importing}
                    className="px-4 h-9 rounded-input bg-neon-cyan text-bg-primary text-sm font-medium disabled:opacity-40 hover:shadow-neon-glow transition-all flex items-center gap-1.5"
                  >
                    {importing ? "导入中..." : "导入"}
                  </button>
                </div>

                {/* Browse buttons */}
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={handleFolderSelect}
                    disabled={importing}
                    className="flex-1 h-9 rounded-input border border-white/[0.06] bg-bg-card text-sm text-text-secondary hover:text-text-primary hover:border-neon-purple/30 transition-all flex items-center justify-center gap-1.5"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    选择文件夹
                  </button>
                  <button
                    onClick={handleFileSelect}
                    disabled={importing}
                    className="flex-1 h-9 rounded-input border border-white/[0.06] bg-bg-card text-sm text-text-secondary hover:text-text-primary hover:border-neon-purple/30 transition-all flex items-center justify-center gap-1.5"
                  >
                    <FileAudio className="w-3.5 h-3.5" />
                    选择文件
                  </button>
                </div>

                {/* Hidden file inputs */}
                <input
                  ref={folderInputRef}
                  type="file"
                  // @ts-ignore
                  webkitdirectory=""
                  directory=""
                  multiple
                  className="hidden"
                  onChange={onFolderInputChange}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".mp3,.wav,.flac,.aac,.ogg,.m4a"
                  multiple
                  className="hidden"
                  onChange={onFileInputChange}
                />
                {importResult && (
                  <p className={cn(
                    "text-xs mt-2",
                    importResult.includes("失败") ? "text-red-400" : "text-neon-cyan"
                  )}>
                    {importResult}
                  </p>
                )}
                <p className="text-[10px] text-text-disabled mt-2">
                  支持格式：MP3、WAV、FLAC、AAC、OGG、M4A，会递归扫描子文件夹
                </p>
              </div>
            </div>
          )}

          {/* Tab: Playback */}
          {activeTab === "playback" && (
            <div className="space-y-5">
              <ToggleRow label="自动播放" desc="启动时自动开始电台直播" defaultChecked />
              <ToggleRow label="无缝播放" desc="歌曲之间自动交叉淡入淡出" defaultChecked />
              <ToggleRow
                label="AI 流式输出"
                desc="口播文字逐字显示，关闭后等待完整回答"
                checked={streamingEnabled}
                onChange={setStreamingEnabled}
              />
              <div>
                <label className="text-sm text-text-secondary block mb-2">交叉淡入淡出时长</label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.5"
                  defaultValue="3"
                  className="w-full accent-neon-cyan"
                />
                <div className="flex justify-between text-[10px] text-text-disabled mt-1">
                  <span>0s</span>
                  <span>3s</span>
                  <span>10s</span>
                </div>
              </div>
            </div>
          )}

          {/* Tab: About */}
          {activeTab === "about" && (
            <div className="space-y-4 text-sm text-text-secondary">
              <div className="text-center py-6">
                <h3 className="text-xl font-bold text-neon-cyan neon-text mb-1">Butterfly Radio</h3>
                <p className="text-text-disabled">版本 0.1.0</p>
              </div>
              <p>本地私有化 AI 电台，完全离线运行，零隐私泄露。</p>
              <p>基于 Python + React + Electron 构建，支持 LLM 口播、TTS 语音合成、实时互动。</p>
              <p className="text-text-disabled text-xs mt-4">仅供个人学习与非商业用途</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ToggleRow({ label, desc, defaultChecked = false, checked: controlledChecked, onChange }: {
  label: string; desc: string; defaultChecked?: boolean;
  checked?: boolean; onChange?: (v: boolean) => void;
}) {
  const [internalChecked, setInternalChecked] = useState(defaultChecked);
  const checked = controlledChecked !== undefined ? controlledChecked : internalChecked;
  const toggle = () => {
    const next = !checked;
    if (onChange) onChange(next);
    else setInternalChecked(next);
  };
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-text-primary">{label}</p>
        <p className="text-xs text-text-secondary">{desc}</p>
      </div>
      <button
        onClick={toggle}
        className={cn(
          "w-10 h-5 rounded-full transition-colors duration-200 relative",
          checked ? "bg-neon-cyan" : "bg-text-disabled"
        )}
      >
        <div className={cn(
          "w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform duration-200",
          checked ? "translate-x-5" : "translate-x-0.5"
        )} />
      </button>
    </div>
  );
}
