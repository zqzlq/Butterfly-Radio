import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  // Window controls
  minimize: () => ipcRenderer.invoke("minimize-window"),
  maximize: () => ipcRenderer.invoke("maximize-window"),
  close: () => ipcRenderer.invoke("close-window"),

  // Backend info
  getBackendPort: () => ipcRenderer.invoke("get-backend-port"),

  // Platform info
  platform: process.platform,
});
