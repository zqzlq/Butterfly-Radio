import { app, BrowserWindow, ipcMain, dialog, shell } from "electron";
import path from "path";
import { spawn, ChildProcess } from "child_process";
import http from "http";
import net from "net";

let mainWindow: BrowserWindow | null = null;
let pythonProcess: ChildProcess | null = null;
let isQuitting = false;

const PYTHON_PORT = 3000;
const isDev = !app.isPackaged;

// ─── Port utilities ───

function checkPort(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close();
      resolve(true);
    });
    server.listen(port, "127.0.0.1");
  });
}

async function waitForPort(port: number, timeoutMs = 30000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const ok = await new Promise<boolean>((resolve) => {
        http
          .get(`http://127.0.0.1:${port}/health`, (res) => {
            resolve(res.statusCode === 200);
          })
          .on("error", () => resolve(false));
      });
      if (ok) return true;
    } catch {
      // ignore
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

// ─── Python backend lifecycle ───

function getPythonExecutable(): string {
  if (isDev) {
    // In dev mode, use system Python
    return "python";
  }
  // In production, use bundled executable
  const platform = process.platform;
  const ext = platform === "win32" ? ".exe" : "";
  return path.join(process.resourcesPath, "python-backend", `butterfly-radio-backend${ext}`);
}

function getPythonArgs(): string[] {
  if (isDev) {
    return [path.join(__dirname, "../../python-backend/main.py")];
  }
  return [];
}

async function startPythonBackend(): Promise<boolean> {
  // Check if port is already available (backend already running)
  const portFree = await checkPort(PYTHON_PORT);
  if (!portFree) {
    console.log(`[Electron] 端口 ${PYTHON_PORT} 已被占用，后端可能已在运行`);
    return true;
  }

  const executable = getPythonExecutable();
  const args = getPythonArgs();

  console.log(`[Electron] 启动 Python 后端: ${executable} ${args.join(" ")}`);

  pythonProcess = spawn(executable, args, {
    stdio: ["pipe", "pipe", "pipe"],
    env: {
      ...process.env,
      PYTHON_PORT: String(PYTHON_PORT),
      PYTHONUNBUFFERED: "1",
    },
    windowsHide: true,
  });

  pythonProcess.stdout?.on("data", (data) => {
    const msg = data.toString().trim();
    if (msg) console.log(`[Python] ${msg}`);
  });

  pythonProcess.stderr?.on("data", (data) => {
    const msg = data.toString().trim();
    if (msg) console.log(`[Python] ${msg}`);
  });

  pythonProcess.on("error", (err) => {
    console.error(`[Electron] Python 进程启动失败:`, err);
    pythonProcess = null;
  });

  pythonProcess.on("close", (code) => {
    console.log(`[Electron] Python 进程退出，代码: ${code}`);
    pythonProcess = null;

    // Auto-restart on unexpected exit (not during quit)
    if (!isQuitting && code !== 0) {
      console.log("[Electron] Python 异常退出，3 秒后重启...");
      setTimeout(() => startPythonBackend(), 3000);
    }
  });

  // Wait for backend to be ready
  console.log(`[Electron] 等待后端启动 (端口 ${PYTHON_PORT})...`);
  const ready = await waitForPort(PYTHON_PORT, 30000);
  if (ready) {
    console.log("[Electron] 后端已就绪");
    return true;
  } else {
    console.error("[Electron] 后端启动超时");
    return false;
  }
}

function stopPythonBackend() {
  if (pythonProcess) {
    console.log("[Electron] 停止 Python 后端...");
    pythonProcess.kill("SIGTERM");

    // Force kill after 5 seconds if still alive
    setTimeout(() => {
      if (pythonProcess) {
        console.log("[Electron] 强制终止 Python 进程");
        pythonProcess.kill("SIGKILL");
        pythonProcess = null;
      }
    }, 5000);
  }
}

// ─── Window management ───

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    frame: false,
    backgroundColor: "#0A0A0F",
    titleBarStyle: "hidden",
    trafficLightPosition: { x: 12, y: 12 },
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    show: false,
    icon: path.join(__dirname, "../../resources/assets/icon.png"),
  });

  // Load frontend
  if (isDev) {
    mainWindow.loadURL("http://127.0.0.1:5173");
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(path.join(__dirname, "../../frontend/dist/index.html"));
  }

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  mainWindow.on("close", (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
}

// ─── App lifecycle ───

app.whenReady().then(async () => {
  createWindow();

  const backendReady = await startPythonBackend();
  if (!backendReady) {
    const result = await dialog.showMessageBox({
      type: "warning",
      title: "Butterfly Radio",
      message: "后端服务启动失败",
      detail: "Python 后端服务未能在规定时间内启动，部分功能可能不可用。\n请检查是否有其他程序占用了端口 3000。",
      buttons: ["重试", "继续"],
    });
    if (result.response === 0) {
      await startPythonBackend();
    }
  }

  // Notify renderer that backend is ready
  mainWindow?.webContents.send("backend-ready", { port: PYTHON_PORT });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      mainWindow?.show();
    }
  });
});

app.on("before-quit", () => {
  isQuitting = true;
  stopPythonBackend();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// ─── IPC handlers ───

ipcMain.handle("get-backend-port", () => PYTHON_PORT);

ipcMain.handle("get-app-version", () => app.getVersion());

ipcMain.handle("get-platform", () => process.platform);

ipcMain.handle("minimize-window", () => {
  mainWindow?.minimize();
});

ipcMain.handle("maximize-window", () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.handle("close-window", () => {
  mainWindow?.hide();
});

ipcMain.handle("quit-app", () => {
  app.quit();
});

ipcMain.handle("restart-backend", async () => {
  stopPythonBackend();
  await new Promise((r) => setTimeout(r, 1000));
  return startPythonBackend();
});
