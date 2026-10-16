/* Клиент VoiceGen. Все запросы идут через главный процесс: ключ доступа
   в веб-слой не попадает, а CORS нас не касается. */

// Мостик берём в момент вызова: модуль может загрузиться раньше, чем он появится.
const sv = () => window.sv;

async function req(method, path, opts = {}) {
  const r = await sv().api({ method, path, ...opts });
  if (!r.ok) {
    const e = new Error(r.error || 'Сервис ответил ошибкой');
    e.status = r.status;
    e.network = !!r.network;
    throw e;
  }
  return r.data;
}

export const api = {
  /* ------------------------------------------------------------- профиль */

  me: () => req('GET', '/api/v1/client/me', { timeout: 25000 }),
  bootstrap: () => req('GET', '/api/v1/client/bootstrap', { timeout: 90000 }),
  runtime: () => req('GET', '/api/v1/client/runtime', { timeout: 25000 }),

  /* -------------------------------------------------------------- голоса */

  // Публичный каталог: постранично, с поиском, фильтрами и сортировкой.
  publicVoices: (q) => req('GET', '/api/v1/client/elevenlabs/voices', { query: q, timeout: 40000 }),
  favoriteVoices: (q) => req('GET', '/api/v1/client/favorite-voices', { query: q, timeout: 40000 }),
  customVoices: (q) => req('GET', '/api/v1/client/custom-voices', { query: q, timeout: 40000 }),
  voiceCatalog: () => req('GET', '/api/v1/client/voice-catalog', { timeout: 90000 }),
  voice: (id) => req('GET', '/api/v1/client/elevenlabs/voices/' + encodeURIComponent(id), { timeout: 25000 }),

  setFavorite: (id, isFavorite) =>
    req('PUT', '/api/v1/client/voices/' + encodeURIComponent(id) + '/favorite', {
      body: { is_favorite: !!isFavorite }, timeout: 25000
    }),
  renameVoice: (id, name) =>
    req('PATCH', '/api/v1/client/custom-voices/' + encodeURIComponent(id), { body: { name }, timeout: 25000 }),
  deleteVoice: (id) =>
    req('DELETE', '/api/v1/client/custom-voices/' + encodeURIComponent(id), { timeout: 25000 }),

  /* -------------------------------------------------------------- задачи */

  queue: () => req('GET', '/api/v1/client/queue', { timeout: 60000 }),
  taskStates: () => req('GET', '/api/v1/client/tasks/states', { timeout: 30000 }),
  task: (id) => req('GET', '/api/v1/client/tasks/' + id, { timeout: 30000 }),
  createTask: (body) => req('POST', '/api/v1/client/tasks', { body, timeout: 90000 }),
  cancelTask: (id) => req('POST', '/api/v1/client/tasks/' + id + '/cancel', { timeout: 30000 }),
  deleteTask: (id) => req('DELETE', '/api/v1/client/tasks/' + id, { timeout: 30000 }),
  startQueue: () => req('POST', '/api/v1/client/queue/start', { timeout: 30000 }),
  stopQueue: () => req('POST', '/api/v1/client/queue/stop', { timeout: 30000 }),

  chunks: (id) => req('GET', '/api/v1/client/tasks/' + id + '/chunks', { timeout: 40000 }),
  chunkStatuses: (id) => req('GET', '/api/v1/client/tasks/' + id + '/chunks/statuses', { timeout: 30000 }),
  regenerateChunk: (id, index) =>
    req('POST', '/api/v1/client/tasks/' + id + '/chunks/' + index + '/regenerate', { timeout: 40000 }),

  // Текстовый файл или ZIP -> одна или несколько задач.
  uploadText: (o) => sv().uploadText(o),

  /* -------------------------------------------------- клоны и голос по описанию */

  cloneVoiceJob: (filePath, fileName, voiceName) =>
    sv().upload({ path: '/api/v1/client/voice-jobs/clone', filePath, fileName, fields: { voice_name: voiceName } }),

  voiceJob: (id) => req('GET', '/api/v1/client/voice-jobs/' + encodeURIComponent(id), { timeout: 30000 }),
  cancelVoiceJob: (id) => req('DELETE', '/api/v1/client/voice-jobs/' + encodeURIComponent(id), { timeout: 30000 }),

  promptOptions: (name, prompt) =>
    req('POST', '/api/v1/client/voice-jobs/prompt-options', { body: { name, prompt }, timeout: 60000 }),
  promptPreview: (body) =>
    sv().api({ method: 'POST', path: '/api/v1/client/voice-jobs/prompt-preview', body, timeout: 180000, raw: true }),
  promptSave: (body) =>
    req('POST', '/api/v1/client/voice-jobs/prompt-save', { body, timeout: 60000 }),

  /* ---------------------------------------------------------- обновление */

  release: () => req('GET', '/api/v1/client/releases/current', { timeout: 25000 })
};

export const RELEASE_DOWNLOAD_URL = 'https://qw1voicegencore.pro/api/v1/client/releases/current/download';
