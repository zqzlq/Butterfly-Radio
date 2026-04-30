/**
 * Detect if running inside Electron and provide safe access to electronAPI.
 */

export function isElectron(): boolean {
  return typeof window !== "undefined" && typeof window.electronAPI !== "undefined";
}

export function getElectronAPI() {
  if (isElectron()) {
    return window.electronAPI;
  }
  return null;
}

/**
 * Window control helpers — work in both Electron and browser.
 */
export async function minimizeWindow() {
  const api = getElectronAPI();
  if (api) return api.minimize();
}

export async function maximizeWindow() {
  const api = getElectronAPI();
  if (api) return api.maximize();
}

export async function closeWindow() {
  const api = getElectronAPI();
  if (api) return api.close();
}

export async function quitApp() {
  const api = getElectronAPI();
  if (api) return api.quit();
}

export async function restartBackend() {
  const api = getElectronAPI();
  if (api) return api.restartBackend();
  return false;
}

export async function getAppVersion(): Promise<string> {
  const api = getElectronAPI();
  if (api) return api.getAppVersion();
  return "0.1.0-dev";
}
