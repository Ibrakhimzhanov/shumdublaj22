'use strict';
const { app, BrowserWindow, ipcMain, dialog, shell, safeStorage, clipboard } = require('electron');
const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');
const os = require('os');
const { Readable } = require('stream');
const { pipeline } = require('stream/promises');
const { makeZip } = require('./zip.cjs');

const BASE_URL = 'https://qw1voicegencore.pro';
const isDev = !!process.env.SV_DEV;

let win = null;

/* --------------------------------------------------------------- хранилище */

const userDir = () => app.getPath('userData');
const cfgPath = () => path.join(userDir(), 'config.json');
const keyPath = () => path.join(userDir(), 'apikey.bin');

function readCfg() {
  try { return JSON.parse(fs.readFileSync(cfgPath(), 'utf8')); } catch { return {}; }
}
function writeCfg(obj) {
  try {
    fs.mkdirSync(userDir(), { recursive: true });
    fs.writeFileSync(cfgPath(), JSON.stringify(obj, null, 2));
  } catch {}
}

function saveKey(key) {
  fs.mkdirSync(userDir(), { recursive: true });
  if (safeStorage.isEncryptionAvailable()) {
    fs.writeFileSync(keyPath(), safeStorage.encryptString(key));
  } else {
    fs.writeFileSync(keyPath(), Buffer.from('plain:' + key, 'utf8'));
  }
}
function loadKey() {
  try {
    const buf = fs.readFileSync(keyPath());
    const asText = buf.toString('utf8');
    if (asText.startsWith('plain:')) return asText.slice(6);
    return safeStorage.decryptString(buf);
  } catch { return null; }
}
function clearKey() { try { fs.unlinkSync(keyPath()); } catch {} }

let apiKey = null;

/* ------------------------------------------------------------------ запросы */

function authHeaders() {
  return apiKey ? { Authorization: 'Bearer ' + apiKey } : {};
}

// Текст ошибки берём у сервиса и показываем как есть. Общих фраз вида
// «что-то пошло не так» здесь быть не должно.
function extractError(status, payload) {
  const pick = (d) => {
    if (!d) return null;
    if (typeof d === 'string') return d.slice(0, 400);
    if (typeof d.detail === 'string') return d.detail;
    if (Array.isArray(d.detail)) {
      return d.detail.map(x => (x && (x.msg || x.message)) || JSON.stringify(x)).join('; ');
    }
    if (typeof d.message === 'string') return d.message;
    if (typeof d.error === 'string') return d.error;
    if (d.detail && typeof d.detail === 'object') return pick(d.detail);
    return null;
  };
  const text = pick(payload);
  if (text) return text;
  const byCode = {
    400: 'Сервис отклонил параметры запроса (400).',
    401: 'Ключ доступа не принят (401). Скопируйте актуальный ключ в боте.',
    403: 'Для этой функции нужна активная подписка (403).',
    404: 'Объект не найден (404).',
    409: 'Достигнут лимит (409).',
    422: 'Сервис отклонил параметры запроса (422).',
    429: 'Слишком много запросов (429). Повторите чуть позже.',
    502: 'Внешний сервис временно недоступен (502).',
    503: 'Сервис временно недоступен (503).'
  };
  return byCode[status] || ('Сервис ответил ошибкой ' + status);
}

async function apiRequest(_e, req) {
  const { method = 'GET', path: p, query, body, timeout = 60000, raw = false } = req || {};
  let url = BASE_URL + p;
  if (query) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v === null || v === undefined || v === '') continue;
      if (Array.isArray(v)) v.forEach(x => qs.append(k, x)); else qs.append(k, String(v));
    }
    const s = qs.toString();
    if (s) url += '?' + s;
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const headers = Object.assign({ Accept: 'application/json' }, authHeaders());
    let payload;
    if (body !== undefined && body !== null) {
      headers['Content-Type'] = 'application/json';
      payload = JSON.stringify(body);
    }
    const res = await fetch(url, { method, headers, body: payload, signal: ctrl.signal, redirect: 'follow' });
    if (raw) {
      const buf = Buffer.from(await res.arrayBuffer());
      if (!res.ok) {
        let d = null; try { d = JSON.parse(buf.toString('utf8')); } catch {}
        return { ok: false, status: res.status, error: extractError(res.status, d) };
      }
      return { ok: true, status: res.status, bytes: buf.toString('base64'), mime: res.headers.get('content-type') || '' };
    }
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    if (!res.ok) return { ok: false, status: res.status, error: extractError(res.status, data) };
    return { ok: true, status: res.status, data };
  } catch (err) {
    const aborted = err && err.name === 'AbortError';
    return {
      ok: false,
      status: 0,
      network: true,
      error: aborted
        ? 'Сервис не ответил за отведённое время. Проверьте соединение.'
        : ('Нет связи с сервисом: ' + (err && err.message ? err.message : String(err)))
    };
  } finally { clearTimeout(timer); }
}

// Аудиофайл образца -> клонирование голоса.
async function apiUpload(_e, { path: p, filePath, fileName, fields, timeout = 900000 }) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const buf = await fsp.readFile(filePath);
    const form = new FormData();
    form.append('audio_file', new Blob([buf]), fileName || path.basename(filePath));
    for (const [k, v] of Object.entries(fields || {})) {
      if (v !== null && v !== undefined) form.append(k, String(v));
    }
    const res = await fetch(BASE_URL + p, { method: 'POST', headers: authHeaders(), body: form, signal: ctrl.signal });
    const text = await res.text();
    let data = null; try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    if (!res.ok) return { ok: false, status: res.status, error: extractError(res.status, data) };
    return { ok: true, status: res.status, data };
  } catch (err) {
    return { ok: false, status: 0, network: true, error: 'Не удалось отправить файл: ' + (err && err.message ? err.message : String(err)) };
  } finally { clearTimeout(timer); }
}

// Текстовый файл или архив -> одна или несколько задач озвучки.
async function apiUploadText(_e, { filePath, fileName, voiceId, preferences, timeout = 300000 }) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const buf = await fsp.readFile(filePath);
    const form = new FormData();
    form.append('file', new Blob([buf]), fileName || path.basename(filePath));
    form.append('voice_id', voiceId);
    form.append('preferences', JSON.stringify(preferences || {}));
    const res = await fetch(BASE_URL + '/api/v1/client/tasks/upload', {
      method: 'POST', headers: authHeaders(), body: form, signal: ctrl.signal
    });
    const text = await res.text();
    let data = null; try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    if (!res.ok) return { ok: false, status: res.status, error: extractError(res.status, data) };
    return { ok: true, status: res.status, data };
  } catch (err) {
    return { ok: false, status: 0, network: true, error: 'Не удалось отправить файл: ' + (err && err.message ? err.message : String(err)) };
  } finally { clearTimeout(timer); }
}

/* --------------------------------------------------------------- скачивание */

async function fetchBuffer(url, withAuth) {
  const res = await fetch(url, { headers: withAuth ? authHeaders() : {}, redirect: 'follow' });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    let d = null; try { d = JSON.parse(t); } catch {}
    throw new Error(extractError(res.status, d));
  }
  return Buffer.from(await res.arrayBuffer());
}

async function saveUrl(_e, { url, withAuth, suggestName }) {
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: 'Сохранить результат',
    defaultPath: path.join(app.getPath('downloads'), suggestName || 'result.mp3')
  });
  if (canceled || !filePath) return { ok: false, canceled: true };
  try {
    const res = await fetch(url, { headers: withAuth ? authHeaders() : {}, redirect: 'follow' });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      let d = null; try { d = JSON.parse(t); } catch {}
      return { ok: false, error: extractError(res.status, d) };
    }
    const expected = Number(res.headers.get('content-length') || 0);
    await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(filePath));
    const stat = await fsp.stat(filePath);
    if (expected && stat.size !== expected) {
      return { ok: true, path: filePath, size: stat.size, partial: true, expected };
    }
    return { ok: true, path: filePath, size: stat.size };
  } catch (err) {
    return { ok: false, error: 'Скачивание прервалось: ' + (err && err.message ? err.message : String(err)) };
  }
}

// Архив: берём готовый у сервиса, иначе собираем ZIP из готовых частей
// и честно возвращаем список частей, которые в него не попали.
async function saveZip(_e, { archiveUrl, entries, suggestName }) {
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: 'Сохранить архив',
    defaultPath: path.join(app.getPath('downloads'), suggestName || 'result.zip')
  });
  if (canceled || !filePath) return { ok: false, canceled: true };
  try {
    if (archiveUrl) {
      const res = await fetch(archiveUrl, { headers: authHeaders(), redirect: 'follow' });
      if (!res.ok) {
        const t = await res.text().catch(() => '');
        let d = null; try { d = JSON.parse(t); } catch {}
        return { ok: false, error: extractError(res.status, d) };
      }
      const expected = Number(res.headers.get('content-length') || 0);
      await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(filePath));
      const stat = await fsp.stat(filePath);
      if (expected && stat.size !== expected) return { ok: true, path: filePath, size: stat.size, partial: true, expected };
      return { ok: true, path: filePath, size: stat.size };
    }
    const files = [];
    const failed = [];
    for (const it of entries || []) {
      try { files.push({ name: it.name, data: await fetchBuffer(it.url, !!it.withAuth) }); }
      catch { failed.push(it.name); }
    }
    if (!files.length) return { ok: false, error: 'Скачивать нечего: ни одна часть не готова.' };
    await fsp.writeFile(filePath, makeZip(files));
    const stat = await fsp.stat(filePath);
    return { ok: true, path: filePath, size: stat.size, failed };
  } catch (err) {
    return { ok: false, error: 'Архив не собрался: ' + (err && err.message ? err.message : String(err)) };
  }
}

/* ---------------------------------------------------------------- обновление */

let updateFile = null;

async function updDownload(_e, { url, fileName, sizeBytes }) {
  try {
    const dir = path.join(os.tmpdir(), 'shum-voice-update');
    await fsp.mkdir(dir, { recursive: true });
    const dest = path.join(dir, fileName || 'setup.exe');
    const res = await fetch(url, { headers: authHeaders(), redirect: 'follow' });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      let d = null; try { d = JSON.parse(t); } catch {}
      return { ok: false, error: extractError(res.status, d) };
    }
    const total = Number(res.headers.get('content-length') || sizeBytes || 0);
    let got = 0;
    const out = fs.createWriteStream(dest);
    const reader = res.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      got += value.length;
      out.write(Buffer.from(value));
      if (win && !win.isDestroyed()) win.webContents.send('update:progress', { got, total });
    }
    await new Promise((res2, rej) => out.end(err => (err ? rej(err) : res2())));
    updateFile = dest;
    return { ok: true, path: dest, size: got };
  } catch (err) {
    return { ok: false, error: 'Не удалось скачать обновление: ' + (err && err.message ? err.message : String(err)) };
  }
}

async function updInstall() {
  if (!updateFile) return { ok: false, error: 'Файл обновления не найден.' };
  shell.openPath(updateFile);
  setTimeout(() => app.quit(), 800);
  return { ok: true };
}

/* --------------------------------------------------------------------- окно */

function createWindow() {
  win = new BrowserWindow({
    width: 1440, height: 900, minWidth: 1080, minHeight: 680,
    show: false, frame: false, backgroundColor: '#08080a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false
    }
  });
  win.once('ready-to-show', () => win.show());
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });

  if (isDev) win.loadURL(process.env.SV_DEV);
  else win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));

  const push = () => {
    if (win && !win.isDestroyed()) win.webContents.send('window:state', { maximized: win.isMaximized() });
  };
  win.on('maximize', push);
  win.on('unmaximize', push);
}

// Второй экземпляр не поднимаем: вместо нового окна поднимаем уже открытое.
if (!app.requestSingleInstanceLock()) {
  app.quit();
  return;
}
app.on('second-instance', () => {
  if (!win || win.isDestroyed()) return;
  if (win.isMinimized()) win.restore();
  win.focus();
});

app.whenReady().then(() => {
  apiKey = loadKey();

  ipcMain.handle('api:request', apiRequest);
  ipcMain.handle('api:upload', apiUpload);
  ipcMain.handle('api:uploadText', apiUploadText);

  ipcMain.handle('key:get', () => apiKey);
  ipcMain.handle('key:set', (_e, k) => { apiKey = k; saveKey(k); return true; });
  ipcMain.handle('key:clear', () => { apiKey = null; clearKey(); return true; });

  ipcMain.handle('cfg:get', () => readCfg());
  ipcMain.handle('cfg:set', (_e, obj) => { writeCfg(obj); return true; });

  ipcMain.handle('file:save', saveUrl);
  ipcMain.handle('file:saveZip', saveZip);
  ipcMain.handle('update:download', updDownload);
  ipcMain.handle('update:install', updInstall);

  ipcMain.handle('app:info', () => ({ version: app.getVersion(), platform: process.platform, arch: process.arch }));
  ipcMain.handle('shell:open', (_e, url) => { shell.openExternal(String(url || '')); return true; });
  ipcMain.handle('clipboard:read', () => clipboard.readText());
  ipcMain.handle('clipboard:write', (_e, t) => { clipboard.writeText(String(t || '')); return true; });

  ipcMain.handle('win:min', () => { if (win) win.minimize(); });
  ipcMain.handle('win:max', () => { if (win) win.isMaximized() ? win.unmaximize() : win.maximize(); });
  ipcMain.handle('win:close', () => { if (win) win.close(); });

  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
