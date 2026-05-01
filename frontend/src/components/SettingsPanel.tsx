import { useState, useEffect } from "react";
import { X, Cpu, Monitor, Cloud, FolderOpen, Music, RefreshCw } from "lucide-react";
import { usePlayerStore } from "@/store";
import { cn } from "@/lib/cn";
import { aiApi, playlistApi, configApi } from "@/lib/api";

const TABS = [
  { key: "ai", label: "AI 模式" },
  { key: "host", label: "主播设置" },
  { key: "music", label: "音乐库" },
  { key: "playback", label: "播放设置" },
  { key: "about", label: "关于" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const AI_MODES = [
  { key: "cloud_api", label: "云 API 模式", desc: "无需本地算力，需联网", icon: Cloud, recommended: true },
  { key: "local_lightweight", label: "本地轻量模式", desc: "CPU 运行，8G 内存（未完成开发）", icon: Cpu, disabled: true },
  { key: "local_highquality", label: "本地高质量模式", desc: "GPU 加速，16G 内存 + 4G 显存（未完成开发）", icon: Monitor, disabled: true },
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
  const [aiMode, setAiMode] = useState("cloud_api");
  const [hostStyle, setHostStyle] = useState("warm");
  const [ttsSpeed, setTtsSpeed] = useState(1.0);
  const [saving, setSaving] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [apiKeySaved, setApiKeySaved] = useState(false);
  const [jamendoClientId, setJamendoClientId] = useState("");
  const [jamendoSaved, setJamendoSaved] = useState(false);

  // Music library state
  const [songCount, setSongCount] = useState(0);
  const [importDir, setImportDir] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  useEffect(() => {
    playlistApi.listSongs().then((songs) => setSongCount(songs.length)).catch(() => {});
    // Load current AI config
    aiApi.getHost().then((data) => {
      if (data?.llm?.mode) setAiMode(data.llm.mode);
      if (data?.host?.style) setHostStyle(data.host.style);
    }).catch(() => {});
    // Load config for other settings
    configApi.getAll().then((data) => {
      if (data?.configs?.tts_speed) setTtsSpeed(parseFloat(data.configs.tts_speed));
      if (data?.configs?.jamendo_client_id) setJamendoClientId(data.configs.jamendo_client_id);
    }).catch(() => {});
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

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) return;
    setSaving(true);
    setApiKeySaved(false);
    try {
      await aiApi.updateConfig({ cloud_api_key: apiKey.trim() });
      setApiKeySaved(true);
      setTimeout(() => setApiKeySaved(false), 2000);
    } catch (e) {
      console.error("保存 API Key 失败:", e);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveJamendo = async () => {
    setSaving(true);
    setJamendoSaved(false);
    try {
      await configApi.update("jamendo_client_id", jamendoClientId.trim());
      setJamendoSaved(true);
      setTimeout(() => setJamendoSaved(false), 2000);
    } catch (e) {
      console.error("保存 Jamendo 配置失败:", e);
    } finally {
      setSaving(false);
    }
  };

  // Directory browser state
  const [browsePath, setBrowsePath] = useState("");
  const [browseParent, setBrowseParent] = useState<string | null>(null);
  const [browseItems, setBrowseItems] = useState<{ name: string; path: string }[]>([]);
  const [browsing, setBrowsing] = useState(false);

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

  const loadBrowse = async (path: string) => {
    setBrowsing(true);
    try {
      const data = await playlistApi.browse(path);
      setBrowsePath(data.current);
      setBrowseParent(data.parent);
      setBrowseItems(data.items);
    } catch {
      setBrowseItems([]);
    } finally {
      setBrowsing(false);
    }
  };

  const handleBrowseSelect = (dirPath: string) => {
    setImportDir(dirPath);
    loadBrowse(dirPath);
  };

  const handleBrowseUp = () => {
    if (browseParent !== null) {
      loadBrowse(browseParent);
    }
  };

  const handleBrowseOpen = () => {
    loadBrowse("");
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
                const disabled = (mode as any).disabled;
                return (
                  <button
                    key={mode.key}
                    onClick={() => !disabled && handleAiModeChange(mode.key)}
                    disabled={disabled}
                    className={cn(
                      "w-full flex items-center gap-4 p-4 rounded-card border transition-all duration-200 text-left",
                      disabled
                        ? "opacity-40 cursor-not-allowed border-white/[0.04] bg-bg-card"
                        : selected
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
                  <label className="text-sm text-text-secondary block mb-2">DeepSeek API Key</label>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="输入 DeepSeek API Key"
                      className="flex-1 h-9 px-4 rounded-input bg-bg-secondary text-sm text-text-primary placeholder:text-text-disabled border border-transparent focus:border-neon-cyan outline-none transition-all"
                    />
                    <button
                      onClick={handleSaveApiKey}
                      disabled={!apiKey.trim() || saving}
                      className="px-4 h-9 rounded-input bg-neon-cyan text-bg-primary text-sm font-medium disabled:opacity-40 hover:shadow-neon-glow transition-all"
                    >
                      {saving ? "保存中..." : "保存"}
                    </button>
                  </div>
                  {apiKeySaved && (
                    <p className="text-xs text-neon-cyan mt-2">API Key 已保存</p>
                  )}
                  <p className="text-[10px] text-text-disabled mt-2">支持 DeepSeek、OpenAI 等兼容接口</p>
                </div>
              )}

              {/* Jamendo config */}
              <div className="mt-4 p-4 rounded-card bg-bg-card border border-white/[0.06]">
                <label className="text-sm text-text-secondary block mb-2">Jamendo Client ID</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={jamendoClientId}
                    onChange={(e) => setJamendoClientId(e.target.value)}
                    placeholder="输入 Jamendo Client ID（用于在线搜索免费音乐）"
                    className="flex-1 h-9 px-4 rounded-input bg-bg-secondary text-sm text-text-primary placeholder:text-text-disabled border border-transparent focus:border-neon-cyan outline-none transition-all"
                  />
                  <button
                    onClick={handleSaveJamendo}
                    disabled={saving}
                    className="px-4 h-9 rounded-input bg-neon-purple text-white text-sm font-medium disabled:opacity-40 hover:shadow-[0_0_12px_rgba(123,97,255,0.3)] transition-all"
                  >
                    {saving ? "保存中..." : "保存"}
                  </button>
                </div>
                {jamendoSaved && (
                  <p className="text-xs text-neon-purple mt-2">Jamendo 配置已保存</p>
                )}
                <p className="text-[10px] text-text-disabled mt-2">
                  点歌未找到时自动搜索 Jamendo 免费音乐。
                  <a href="https://developer.jamendo.com/" target="_blank" rel="noopener" className="text-neon-purple/70 hover:text-neon-purple ml-1">注册获取</a>
                </p>
              </div>
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
                    className="px-4 h-9 rounded-input bg-neon-cyan text-bg-primary text-sm font-medium disabled:opacity-40 hover:shadow-neon-glow transition-all"
                  >
                    {importing ? "导入中..." : "导入"}
                  </button>
                </div>

                {/* Directory browser */}
                <div className="mt-2">
                  {browseItems.length === 0 && !browsing ? (
                    <button
                      onClick={handleBrowseOpen}
                      className="w-full h-9 rounded-input border border-dashed border-white/[0.12] bg-bg-card text-sm text-text-secondary hover:text-neon-cyan hover:border-neon-cyan/30 transition-all flex items-center justify-center gap-1.5"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      浏览文件夹
                    </button>
                  ) : (
                    <div className="rounded-card border border-white/[0.06] bg-bg-card overflow-hidden">
                      {/* Browser header */}
                      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.06] bg-bg-secondary/50">
                        <button
                          onClick={handleBrowseUp}
                          disabled={browseParent === null}
                          className="p-1 text-text-secondary hover:text-neon-cyan disabled:opacity-30 transition-colors"
                          title="上级目录"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                        </button>
                        <span className="flex-1 text-xs text-text-secondary truncate font-mono">
                          {browsePath || "此电脑"}
                        </span>
                        {browsePath && (
                          <button
                            onClick={() => { setImportDir(browsePath); }}
                            className="px-2 py-0.5 text-[10px] rounded bg-neon-purple/20 text-neon-purple hover:bg-neon-purple/30 transition-colors"
                          >
                            选此目录
                          </button>
                        )}
                      </div>
                      {/* Browser list */}
                      <div className="max-h-40 overflow-y-auto">
                        {browsing ? (
                          <p className="px-3 py-3 text-xs text-text-disabled text-center">加载中...</p>
                        ) : browseItems.length === 0 ? (
                          <p className="px-3 py-3 text-xs text-text-disabled text-center">无子文件夹</p>
                        ) : (
                          browseItems.map((item) => (
                            <button
                              key={item.path}
                              onClick={() => handleBrowseSelect(item.path)}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:bg-neon-cyan/[0.05] transition-colors text-left"
                            >
                              <FolderOpen className="w-3.5 h-3.5 text-neon-purple shrink-0" />
                              <span className="truncate">{item.name}</span>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
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
