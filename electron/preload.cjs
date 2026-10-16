'use strict';
const { contextBridge, ipcRenderer, webUtils } = require('electron');

// Ключ доступа живёт в главном процессе: в веб-слой он не попадает.
contextBridge.exposeInMainWorld('sv', {
  api: (req) => ipcRenderer.invoke('api:request', req),
  upload: (req) => ipcRenderer.invoke('api:upload', req),
  uploadText: (req) => ipcRenderer.invoke('api:uploadText', req),

  keyGet: () => ipcRenderer.invoke('key:get'),
  keySet: (k) => ipcRenderer.invoke('key:set', k),
  keyClear: () => ipcRenderer.invoke('key:clear'),

  cfgGet: () => ipcRenderer.invoke('cfg:get'),
  cfgSet: (o) => ipcRenderer.invoke('cfg:set', o),

  saveUrl: (o) => ipcRenderer.invoke('file:save', o),
  saveZip: (o) => ipcRenderer.invoke('file:saveZip', o),

  updateDownload: (o) => ipcRenderer.invoke('update:download', o),
  updateInstall: () => ipcRenderer.invoke('update:install'),
  onUpdateProgress: (cb) => {
    const h = (_e, d) => cb(d);
    ipcRenderer.on('update:progress', h);
    return () => ipcRenderer.removeListener('update:progress', h);
  },

  appInfo: () => ipcRenderer.invoke('app:info'),
  openExternal: (url) => ipcRenderer.invoke('shell:open', url),
  clipboardRead: () => ipcRenderer.invoke('clipboard:read'),
  clipboardWrite: (t) => ipcRenderer.invoke('clipboard:write', t),

  winMin: () => ipcRenderer.invoke('win:min'),
  winMax: () => ipcRenderer.invoke('win:max'),
  winClose: () => ipcRenderer.invoke('win:close'),
  onWindowState: (cb) => {
    const h = (_e, d) => cb(d);
    ipcRenderer.on('window:state', h);
    return () => ipcRenderer.removeListener('window:state', h);
  },

  // Путь файла из <input type="file"> или drag & drop.
  pathFor: (file) => {
    try { return webUtils.getPathForFile(file); } catch { return null; }
  }
});
