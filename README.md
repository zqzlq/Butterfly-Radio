# Butterfly Radio 🦋

**本地私有化 AI 实时互动电台** — 全自动 7×24 小时无人值守直播，完全本地运行，零隐私泄露。

<p align="center">
  <i>Electron 桌面端 + React 前端 + Python 全栈后端</i>
</p>

---

## 项目简介

Butterfly Radio 是一款**完全本地化部署的 AI 实时互动电台桌面应用**。它能够像真人主播一样在歌曲间隙说话、回应点歌请求、与听众聊天，支持 7×24 小时无人值守运行。

- **完全本地运行**：无网络依赖，所有数据保存在本地
- **AI 主播**：LLM 自动生成口播文案 + TTS 语音合成
- **实时互动**：留言、点歌，AI 主播实时回应
- **一键启动**：普通用户双击即可使用，无需任何配置

---

## 核心功能

### AI 主播实时直播
- 全自动生成歌曲串词、互动口播
- 拟人化 TTS 语音实时播出
- 流式输出（打字机效果）实时展示口播生成过程
- 5 种主播人格预设：温暖 / 摇滚 / 文艺 / 资讯 / 治愈

### 音乐播放与电台管控
- 本地音乐导入与歌单自动编排
- 完整播放控制（暂停、切歌、音量、收藏）
- 播放进度实时同步（<100ms 延迟）

### 实时互动
- 底部输入框留言、点歌
- AI 主播实时响应并融入口播
- 互动历史回溯

### 沉浸式界面
- 暗黑赛博质感 UI
- 音频频谱可视化
- 全屏 / 迷你模式

### 本地私有化
- 三档 AI 模式适配不同配置
- 云 API 回退（极低配设备）
- 零隐私风险，数据全在本地

---

## 技术架构

```
Electron Renderer (React)  →  Socket.IO  →  Python Backend (FastAPI)
                                              ├── Business APIs
                                              ├── AI modules (LLM, TTS, 内容安全)
                                              ├── 直播调度引擎 (APScheduler)
                                              ├── 音频处理 (pydub + ffmpeg)
                                              ├── 实时通信 (python-socketio)
                                              └── SQLite (SQLAlchemy + aiosqlite)
```

### 技术栈

**前端**
| 技术 | 用途 |
|------|------|
| React 18.3 + TypeScript | UI 框架 |
| Tailwind CSS 3.4 | 样式系统 |
| Socket.IO 4.7 | 实时通信 |
| Howler.js 2.2 + Web Audio API | 音频播放 + 频谱可视化 |
| Zustand 4.5 | 状态管理 |
| Electron 30 | 桌面封装 |

**后端（Python 3.11）**
| 技术 | 用途 |
|------|------|
| FastAPI 0.115 | Web 框架 |
| python-socketio 5.11 | WebSocket 实时通信 |
| SQLAlchemy 2.0 + aiosqlite | 异步 ORM + SQLite |
| APScheduler 4.0 | 直播调度 |
| pydub + ffmpeg | 音频混音处理 |
| Pydantic 2.9 | 数据校验 |

**AI 三档配置**

| 模式 | 硬件要求 | LLM | TTS |
|------|---------|-----|-----|
| 轻量化 | 8GB RAM, CPU | Qwen3 1.7B 4bit | ChatTTS 轻量化 |
| 高质量 | 16GB RAM + 4GB VRAM | Qwen3 8B 4bit | Qwen3-TTS 1.2B |
| 云 API | 仅需网络 | DeepSeek / 豆包等 | 火山引擎 / Edge TTS |

---

## 快速开始

### 一键安装（普通用户）

从发布页下载对应系统安装包，双击安装即可使用：
- **Windows**: 下载 `.exe` 安装包，双击安装
- **macOS**: 下载 `.dmg`，拖入 Applications 文件夹

安装后自动初始化，30 秒内进入主界面。

### 开发者本地构建

#### 前置要求
- Node.js 22 LTS
- Python 3.11
- FFmpeg 7.0（系统 PATH 或 `resources/ffmpeg/` 中）

#### 前端

```bash
cd frontend
pnpm install
pnpm dev          # 开发服务器
pnpm build        # 生产构建
```

#### 后端

```bash
cd python-backend
pip install -r requirements.txt
python main.py    # 启动 FastAPI 服务（默认端口 3000）
```

#### 桌面应用

```bash
cd electron-main
npm install
npm run dev       # Electron 开发模式
npm run build     # 打包桌面应用
```

---

## 项目结构

```
butterfly-radio-local/
├── electron-main/         # Electron 主进程
├── frontend/              # React + TypeScript 前端
│   ├── components/        # UI 组件
│   ├── store/             # Zustand 状态管理
│   ├── socket/            # Socket.IO 客户端
│   └── player/            # 音频播放器 + 可视化
├── python-backend/        # Python 全栈后端
│   ├── api/               # FastAPI 路由（live, playlist, user, system）
│   ├── core/              # 核心引擎（调度、实时通信、音频）
│   ├── ai/                # AI 能力（LLM, TTS, 内容安全）
│   ├── db/                # SQLAlchemy 模型与数据访问
│   ├── service/           # 业务逻辑层
│   └── utils/             # 工具函数
├── resources/             # 静态资源
│   ├── models/            # AI 模型文件
│   ├── default-music/     # 内置音乐库
│   ├── assets/            # 图片、图标
│   └── ffmpeg/            # 内置 FFmpeg
└── build/                 # 打包配置
```

---

## AI 主播智能管线

```
用户留言/点歌
      │
      ▼
┌────────────────────────────────────────┐
│  Host Engine (主控 Agent)               │
│   ├─ 判断上下文类型                      │
│   │   (歌曲引入/点评/问候/聊天/点歌)     │
│   │                                      │
│   ▼                                      │
│  LLM Engine (文案生成 Agent)             │
│   ├─ System Prompt + 人格预设            │
│   ├─ 流式 Token 输出 (打字机效果)        │
│   └─ 三层回退: API → 本地模型 → 模板    │
│                                          │
│   ▼                                      │
│  Content Safety (安全审核 Agent)         │
│   └─ 二次过滤不当内容                     │
│                                          │
│   ▼                                      │
│  TTS Engine (语音合成 Agent)             │
│   ├─ 三引擎: 火山引擎 → Edge TTS → 静音  │
│   ├─ 音频缓存避免重复合成                │
│   └─ 速度/音色/音量可配置                │
│                                          │
│   ▼                                      │
│  Audio Mixer (混音 Agent)               │
│   └─ TTS + 歌曲交叉淡入淡出混合播出      │
└────────────────────────────────────────┘
      │
      ▼
   前端播放 (Socket.IO 实时推送)
```

---

## 配置

### AI 模式
在设置面板中切换：
- **本地轻量化**：中低配电脑，纯 CPU 运行
- **本地高质量**：高配电脑 + GPU 加速
- **云 API**：极低配电脑，需 API Key

### 主播人设
支持 5 种预设人格，可在设置中一键切换。

### 环境变量
| 变量 | 说明 |
|------|------|
| `DEEPSEEK_API_KEY` | DeepSeek API 密钥 |
| `LLM_API_KEY` | 通用 LLM API 密钥 |
| `LLM_BASE_URL` | 自定义 API 地址 |
| `LLM_MODEL` | 模型名称 |
| `VOLC_TTS_APPID` | 火山引擎 TTS AppID |
| `VOLC_TTS_TOKEN` | 火山引擎 TTS Token |
| `TTS_VOICE` | TTS 音色 |

---

## 开发进度

- [x] 前端 UI 框架与组件
- [x] 后端 FastAPI 基础架构
- [x] LLM 引擎（云端 API + 模板回退）
- [x] TTS 引擎（Edge TTS + 火山引擎）
- [x] 实时通信（Socket.IO）
- [x] 音频播放与可视化
- [x] 直播调度引擎
- [ ] 本地 AI 模型集成（llama-cpp）
- [ ] 安装包打包
- [ ] 本地 ChatTTS 集成

---

## 许可

本项目基于非商业开源协议，仅供个人学习与非商业用途使用。AI 模型遵循各自的开源协议，音乐版权由用户自行负责。
