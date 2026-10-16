/* Заглушка мостика Electron для проверки интерфейса в обычном браузере.
   Подключается только в режиме разработки и только если настоящего `window.sv`
   нет. В собранное приложение не попадает. */

const TEXT = 'Ассалому алайкум! Меня зовут Шум Бола, и это первый урок нашего курса. Сегодня мы разберём, как устроен канал, из чего складывается сценарий и почему первые десять секунд решают всё. Устраивайтесь поудобнее, начинаем.';

const now = Date.now();
const iso = (minAgo) => new Date(now - minAgo * 60000).toISOString();

const ME = {
  user_id: 'u1', telegram_username: 'shumbola', first_name: 'Ислам',
  has_active_subscription: true, current_plan: 'monthly_2000',
  subscription_expires_at: '2026-09-19T11:20:49Z',
  api_key_label: 'Ключ №2', api_worker_index: 2, is_worker_key: true,
  free_generation_remaining_chars: 4210, free_generation_used_chars: 5790, free_generation_limit: 10000,
  generated_chars_last_30_days: 146300, referrals_total: 3, paid_referrals_total: 1,
  bonus_balance: 0, max_threads: 5
};

const mkTask = (id, name, status, chunks, extra = {}) => ({
  task_id: id, display_number: 1, text: null, text_preview: TEXT.slice(0, 200),
  text_source_name: name, voice_id: 'v1', voice_engine: 'elevenLabsV3',
  voice_engine_settings: { speed: 100, stability: 0.5 }, accent: 'auto',
  chunk_size: 1200, delay_between_chunks: 0.4, filename: name + '.mp3',
  split_into_chunk_files: false, split_into_paragraph_files: false, result_format: 'single',
  thread_count: 2, status, progress: status === 'done' ? 100 : (status === 'running' ? 46 : 0),
  created_at: extra.created_at || iso(90), started_at: iso(88), finished_at: status === 'done' ? iso(80) : null,
  error_message: extra.error_message || null, status_message: extra.status_message || null,
  download_url: '/api/v1/client/tasks/' + id + '/download',
  public_download_url: status === 'done' ? 'https://example.invalid/' + id + '.mp3' : null,
  public_preview_url: status === 'done' ? 'https://example.invalid/' + id + '.mp3' : null,
  public_archive_url: null,
  result_download_name: name + '.mp3', result_size_bytes: 1177809,
  result_expires_at: iso(-4320), result_chars_count: 609, result_chunks_count: chunks,
  can_delete: true, _chunks: chunks
});

const TASKS = [
  mkTask('t1', 'Реклама курса, интро', 'running', 4, { status_message: 'Генерация' }),
  mkTask('t2', 'Глава 1. Первая запись', 'done', 3, { created_at: iso(1500) }),
  mkTask('t3', 'Приветствие для бота', 'error', 2, { created_at: iso(4000), error_message: 'Сервис синтеза вернул ошибку: узел перегружен (код 529).' }),
  mkTask('t4', 'Черновик рассылки', 'queued', 5, { created_at: iso(10) })
];

const CHUNK_STATE = {
  t1: [
    { status: 'done', pct: 100 },
    { status: 'done', pct: 100 },
    { status: 'running', pct: 62 },
    { status: 'queued', pct: 0 }
  ],
  t2: [{ status: 'done', pct: 100 }, { status: 'done', pct: 100 }, { status: 'done', pct: 100 }],
  t3: [{ status: 'done', pct: 100 }, { status: 'error', pct: 0, message: 'Сервис синтеза: фрагмент содержит недопустимые символы разметки (строка 41).' }],
  t4: [{ status: 'queued', pct: 0 }, { status: 'queued', pct: 0 }, { status: 'queued', pct: 0 }, { status: 'queued', pct: 0 }, { status: 'queued', pct: 0 }]
};

const SAMPLE = 'https://storage.googleapis.com/eleven-public-prod/database/workspace/f94e260200764678babc807b935bfb0b/voices/UgBBYS2sOqTuMpoF3BR0/0Oc7jiXwWN9kRTXfQsmw.mp3';

const NAMES = ['Nikolay - Confident', 'Мария, тёплый голос', 'Timur - Narrator', 'Зарина, реклама', 'Bogdan Deep', 'Лола, сказки',
  'Sergey Pro', 'Дилноза, новости', 'Artem Voice', 'Гузаль, аудиокниги', 'Maxim Studio', 'Севара, подкаст'];

const MANY = Array.from({ length: 96 }, (_, k) => NAMES[k % NAMES.length] + ' ' + (k + 1));
const VOICES = MANY.map((n, i) => ({
  id: 'v' + i, voice_id: 'v' + i, elevenlabs_voice_id: 'EL' + i,
  name: n, display: n, language: i % 3 ? 'ru-RU' : 'en-US',
  supported_languages: i % 4 === 0 ? ['ru-RU', 'en-US', 'uz'] : (i % 3 ? ['ru-RU'] : ['en-US']),
  gender: i % 2 ? 'female' : 'male',
  age: ['young', 'middle_aged', 'old'][i % 3],
  preview_url: i % 5 === 3 ? null : SAMPLE,
  cloned_by_count: 1000 * (12 - i), usage_character_count_1y: 100000 * (12 - i),
  created_at: iso(1000 * i), is_favorite: i === 1 || i === 4,
  source_type: 'public', voice_engines: i % 6 === 5 ? ['fish', 'panda'] : ['elevenLabsV3', 'elevenLabs', 'fish', 'panda'],
  default_voice_engine: 'elevenLabsV3'
}));

const MINE = [{
  ...VOICES[0], id: 'c1', voice_id: 'c1', name: 'Мой голос, студийный',
  source_type: 'cloned', is_favorite: false, preview_url: SAMPLE
}];

const RELEASE = {
  id: 'r1', version: '3.1.0', build_number: 310,
  changelog: '- Новая модель синтеза\n- Ускоренная загрузка библиотеки\n- Исправлен баг с зависанием очереди',
  file_url: 'https://example.invalid/setup.exe', channel: 'stable',
  target_platform: 'win32', target_arch: 'x64', artifact_status: 'ready',
  setup_filename: 'ShumVoice-3.1.0-Setup.exe', setup_size_bytes: 88080384,
  is_current: true, published_at: iso(4000), created_at: iso(4000), updated_at: iso(4000)
};

const page = (list, q) => {
  const size = Number(q.page_size || 12);
  const p = Number(q.page || 1);
  let l = list.slice();
  if (q.query) l = l.filter(v => v.name.toLowerCase().includes(String(q.query).toLowerCase()));
  if (q.gender) l = l.filter(v => v.gender === q.gender);
  if (q.age) l = l.filter(v => v.age === q.age);
  if (q.language) l = l.filter(v => (v.supported_languages || []).some(x => x.toLowerCase().startsWith(String(q.language).toLowerCase())));
  return {
    page: p, page_size: size, total_count: l.length,
    total_pages: Math.max(1, Math.ceil(l.length / size)),
    voices: l.slice((p - 1) * size, p * size)
  };
};

const wait = (ms) => new Promise(r => setTimeout(r, ms));

async function route({ method, path, query, body }) {
  await wait(240);
  const q = query || {};
  if (path === '/api/v1/client/me') return { ok: true, status: 200, data: ME };
  if (path === '/api/v1/client/releases/current') return { ok: true, status: 200, data: RELEASE };
  if (path === '/api/v1/client/queue') return { ok: true, status: 200, data: { ok: true, queue: {}, tasks: TASKS } };
  if (path === '/api/v1/client/elevenlabs/voices') return { ok: true, status: 200, data: page(VOICES, q) };
  if (path === '/api/v1/client/favorite-voices') return { ok: true, status: 200, data: page(VOICES.filter(v => v.is_favorite), q) };
  if (path === '/api/v1/client/custom-voices') {
    return { ok: true, status: 200, data: page(q.source_type === 'prompt' ? [] : MINE, q) };
  }
  if (path.startsWith('/api/v1/client/voices/') && path.endsWith('/favorite')) {
    const id = path.split('/')[5];
    const v = VOICES.find(x => x.id === id);
    if (v) v.is_favorite = !!(body && body.is_favorite);
    return { ok: true, status: 200, data: { ok: true } };
  }
  const mChunks = /^\/api\/v1\/client\/tasks\/([^/]+)\/chunks$/.exec(path);
  if (mChunks) {
    const id = mChunks[1];
    const n = (TASKS.find(t => t.task_id === id) || {})._chunks || 1;
    return {
      ok: true, status: 200,
      data: {
        ok: true, task_id: id, text: TEXT,
        chunks: Array.from({ length: n }, (_, i) => ({ index: i + 1, id: id + ':' + (i + 1), filename: (i + 1) + '.mp3', text: TEXT.slice(0, 120) }))
      }
    };
  }
  const mSt = /^\/api\/v1\/client\/tasks\/([^/]+)\/chunks\/statuses$/.exec(path);
  if (mSt) {
    const id = mSt[1];
    const arr = CHUNK_STATE[id] || [{ status: 'done', pct: 100 }];
    return {
      ok: true, status: 200,
      data: {
        statuses: arr.map((c, i) => ({
          id: id + ':' + (i + 1), status: c.status, percentage_complete: c.pct,
          audio_src: c.status === 'done' ? SAMPLE : null,
          download_src: c.status === 'done' ? SAMPLE : null,
          filename: (i + 1) + '.mp3',
          message: c.message || (c.status === 'done' ? 'Готово' : 'Ждёт обработки...')
        }))
      }
    };
  }
  if (/\/cancel$/.test(path) || /\/regenerate$/.test(path)) return { ok: true, status: 200, data: { ok: true } };
  if (method === 'DELETE') return { ok: true, status: 200, data: { ok: true } };
  if (path === '/api/v1/client/queue/start') return { ok: true, status: 200, data: { ok: true } };
  if (path === '/api/v1/client/tasks') {
    return { ok: true, status: 200, data: { ok: true, task: TASKS[0] } };
  }
  if (path === '/api/v1/client/voice-jobs/prompt-options') {
    return { ok: true, status: 202, data: { ok: true, job: { id: 'job1', status: 'queued', progress: 0, stage: 'queued', message: 'Ждёт запуска' } } };
  }
  if (path.startsWith('/api/v1/client/voice-jobs/')) {
    return {
      ok: true, status: 200,
      data: {
        id: 'job1', operation: 'prompt_options', status: 'done', progress: 100, stage: 'done',
        message: 'Готово', queue_position: null,
        result: {
          request_id: 'req1',
          options: [
            { option_id: 'o1', text: 'Вариант первый', preview_url: SAMPLE },
            { option_id: 'o2', text: 'Вариант второй', preview_url: SAMPLE },
            { option_id: 'o3', text: 'Вариант третий', preview_url: SAMPLE }
          ]
        },
        error: null, created_at: iso(2), started_at: iso(2), finished_at: iso(1)
      }
    };
  }
  return { ok: false, status: 404, error: 'Заглушка не знает путь ' + path };
}

/* Настройки заглушки держим в localStorage: иначе после перезагрузки
   страницы забывается и выбранная тема, и отложенное обновление. */
const CFG_KEY = 'shum-voice-mock-cfg';
let cfg = {};
try { cfg = JSON.parse(localStorage.getItem(CFG_KEY) || '{}'); } catch { cfg = {}; }

window.sv = {
  api: (req) => route(req),
  upload: async () => ({ ok: true, status: 202, data: { job: { id: 'job1' } } }),
  uploadText: async () => ({ ok: true, status: 200, data: { ok: true, tasks: [TASKS[0], TASKS[1], TASKS[2]] } }),
  keyGet: async () => (new URLSearchParams(location.search).get('login') ? null : 'vg_live_mock'),
  keySet: async () => true,
  keyClear: async () => true,
  cfgGet: async () => cfg,
  cfgSet: async (o) => {
    cfg = o;
    try { localStorage.setItem(CFG_KEY, JSON.stringify(o)); } catch {}
    return true;
  },
  saveUrl: async () => ({ ok: true, path: 'C:/Downloads/result.mp3', size: 1177809 }),
  saveZip: async () => ({ ok: true, path: 'C:/Downloads/result.zip', size: 3177809, failed: [] }),
  updateDownload: async () => ({ ok: true, path: 'C:/Temp/setup.exe', size: 88080384 }),
  updateInstall: async () => ({ ok: true }),
  onUpdateProgress: () => () => {},
  appInfo: async () => ({ version: '2.0.0', platform: 'win32', arch: 'x64' }),
  openExternal: async (u) => { console.log('[mock] openExternal', u); return true; },
  clipboardRead: async () => '',
  clipboardWrite: async () => true,
  winMin: async () => {}, winMax: async () => {}, winClose: async () => {},
  onWindowState: () => () => {},
  pathFor: (f) => 'C:/mock/' + (f && f.name ? f.name : 'file')
};

console.log('[mock] мостик Electron заменён заглушкой для проверки в браузере');
