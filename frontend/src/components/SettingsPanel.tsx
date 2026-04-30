import { useState } from "react";
import { X, Cpu, Monitor, Cloud } from "lucide-react";
import { usePlayerStore } from "@/store";
import { cn } from "@/lib/cn";

const TABS = [
  { key: "ai", label: "AI 模式" },
  { key: "host", label: "主播设置" },
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
  const [activeTab, setActiveTab] = useState<TabKey>("ai");
  const [aiMode, setAiMode] = useState("local_lightweight");
  const [hostStyle, setHostStyle] = useState("warm");

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
            <button onClick={toggleSettings} className="p-1.5 text-text-secondary hover:text-text-primary transition-colors">
              <X className="w-5 h-5" />
            </button>
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
                    onClick={() => setAiMode(mode.key)}
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
                    onClick={() => setHostStyle(style.key)}
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
                  defaultValue="1"
                  className="w-full accent-neon-cyan"
                />
                <div className="flex justify-between text-[10px] text-text-disabled mt-1">
                  <span>0.5x</span>
                  <span>1.0x</span>
                  <span>2.0x</span>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Playback */}
          {activeTab === "playback" && (
            <div className="space-y-5">
              <ToggleRow label="自动播放" desc="启动时自动开始电台直播" defaultChecked />
              <ToggleRow label="无缝播放" desc="歌曲之间自动交叉淡入淡出" defaultChecked />
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

function ToggleRow({ label, desc, defaultChecked = false }: { label: string; desc: string; defaultChecked?: boolean }) {
  const [checked, setChecked] = useState(defaultChecked);
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-text-primary">{label}</p>
        <p className="text-xs text-text-secondary">{desc}</p>
      </div>
      <button
        onClick={() => setChecked(!checked)}
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
