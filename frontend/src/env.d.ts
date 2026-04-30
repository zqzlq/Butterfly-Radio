/// <reference types="vite/client" />

interface ElectronAPI {
  minimize: () => Promise<void>;
  maximize: () => Promise<void>;
  close: () => Promise<void>;
  quit: () => Promise<void>;
  getBackendPort: () => Promise<number>;
  restartBackend: () => Promise<boolean>;
  getAppVersion: () => Promise<string>;
  getPlatform: () => Promise<string>;
  onBackendReady: (callback: (data: { port: number }) => void) => () => void;
}

interface Window {
  electronAPI?: ElectronAPI;
}
