import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import { spawn, ChildProcess } from "child_process";

let mainWindow: BrowserWindow | null = null;
let pythonProcess: ChildProcess | null = null;

const PYTHON_PORT = 3000;
const isDev = !app.isPackaged;

function startPythonBackend() {
  const pythonExecutable = isDev
    ? "python"
    : path.join(process.resourcesPath, "python-backend", "butterfly-radio-backend.exe");

  const args = isDev ? [path.join(__dirname, "../../python-backend/main.py")] : [];

  pythonProcess = spawn(pythonExecutable, args, {
    stdio: ["pipe", "pipe", "pipe"],
    env: { ...process.env, PYTHON_PORT: String(PYTHON_PORT) },
  });

  pythonProcess.stdout?.on("data", (data) => {
    console.log(`[Python] ${data.toString().trim()}`);
  });

  pythonProcess.stderr?.on("data", (data) => {
    console.error(`[Python] ${data.toString().trim()}`);
  });

  pythonProcess.on("close", (code) => {
    console.log(`[Python] Process exited with code ${code}`);
    pythonProcess = null;
  });
}

function stopPythonBackend() {
  if (pythonProcess) {
    pythonProcess.kill("SIGTERM");
    pythonProcess = null;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    frame: false,
    backgroundColor: "#0A0A0F",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
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

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(() => {
  startPythonBackend();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  stopPythonBackend();
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  stopPythonBackend();
});

// IPC handlers
ipcMain.handle("get-backend-port", () => PYTHON_PORT);

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
  mainWindow?.close();
});
