import { contextBridge, ipcRenderer } from "electron";

const electronAPI = {
  // Database operations
  database: {
    execute: (sql: string, params: unknown[] = []) =>
      ipcRenderer.invoke("db:execute", sql, params),
    run: (sql: string, params: unknown[] = []) =>
      ipcRenderer.invoke("db:run", sql, params),
    backup: (backupPath: string) => ipcRenderer.invoke("db:backup", backupPath),
    checkIntegrity: () => ipcRenderer.invoke("db:integrity-check"),
  },

  // App information
  app: {
    getVersion: () => ipcRenderer.invoke("app:get-version"),
    getPath: (name: string) => ipcRenderer.invoke("app:get-path", name),
  },
};

contextBridge.exposeInMainWorld("electronAPI", electronAPI);

export type ElectronAPI = typeof electronAPI;
