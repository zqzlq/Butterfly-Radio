import { contextBridge, ipcRenderer } from "electron";

export interface ElectronAPI {
  // Window controls
  minimize: () => Promise<void>;
  maximize: () => Promise<void>;
  close: () => Promise<void>;
  quit: () => Promise<void>;

  // Backend
  getBackendPort: () => Promise<number>;
  restartBackend: () => Promise<boolean>;

  // App info
  getAppVersion: () => Promise<string>;
  getPlatform: () => Promise<string>;

  // Events
  onBackendReady: (callback: (data: { port: number }) => void) => () => void;
}

const electronAPI: ElectronAPI = {
  // Window controls
  minimize: () => ipcRenderer.invoke("minimize-window"),
  maximize: () => ipcRenderer.invoke("maximize-window"),
  close: () => ipcRenderer.invoke("close-window"),
  quit: () => ipcRenderer.invoke("quit-app"),

  // Backend
  getBackendPort: () => ipcRenderer.invoke("get-backend-port"),
  restartBackend: () => ipcRenderer.invoke("restart-backend"),

  // App info
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),
  getPlatform: () => ipcRenderer.invoke("get-platform"),

  // Events
  onBackendReady: (callback) => {
    const handler = (_event: any, data: { port: number }) => callback(data);
    ipcRenderer.on("backend-ready", handler);
    return () => ipcRenderer.removeListener("backend-ready", handler);
  },
};

contextBridge.exposeInMainWorld("electronAPI", electronAPI);
