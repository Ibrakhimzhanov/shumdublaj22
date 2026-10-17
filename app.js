// ShumDublaj: узбекская озвучка поверх видео YouTube.
// Панель рисует ui.js, субтитры добывает reader.js, тяжёлую работу делает
// локальный сервер. Здесь склейка: состояние, запросы, синхронизация звука.

(function () {
  'use strict';

  const VERSION = '0.9.3';
  const API = 'https://app.shumtuber.uz/dublaj';
  const TOKEN_KEY = 'shumdublajAuthToken';
  const DRIFT = 0.35; // допустимое расхождение дорожки с видео, секунды
  const LEAD = 0.12; // за сколько до фразы приглушать оригинал
  const TICK = 100; // шаг сглаживания громкости, мс

  const DEFAULTS = {
    source: 'auto',
    idle: 0.45, // громкость оригинала, когда озвучка молчит
    duck: 0.08, // громкость оригинала во время фразы
    dub: 1.0, // громкость озвучки
  };

  const S = { ...DEFAULTS };

  const state = {
    runId: 0, // растёт при каждом запуске и при смене видео: старые циклы гасятся
    ui: null,
    audio: null,
    on: false,
    busy: false,
    videoId: null,
    credits: null, // остаток кредитов, сервер присылает его вместе с заданием
    speech: [], // [{s, e}] интервалы речи для приглушения
    timer: null,
    savedVolume: null,
    listeners: [],
  };

  const t = {
    noSubs: 'Bu videoda subtitr yo‘q',
    subsFail: 'Subtitrlarni olib bo‘lmadi',
    serverSubs: 'Subtitrlar server orqali olinmoqda...',
    noServer: 'Serverga ulanib bo‘lmadi. Internetni tekshiring',
    authRequired: 'Kirish kerak. Brauzer panelidagi ShumDublaj belgisini bosing',
    noCredits: 'Kreditlar tugadi. Sotuvchiga murojaat qiling',
    busy: 'Server band. Birozdan keyin urinib ko‘ring',
    // Пользователь ждёт минуту и больше, поэтому фазы говорят человеческим
    // языком, что именно сейчас происходит, а не служебными словами
    phases: {
      queued: 'navbatda turibman',
      segments: 'jumlalarni to‘g‘rilayapman',
      translate: 'o‘zbekchaga tarjima qilyapman',
      tts: 'ovoz yozyapman',
      mix: 'ovozni videoga moslayapman',
    },
  };

  const player = () => document.querySelector('#movie_player') || document.querySelector('.html5-video-player');
  const video = () => document.querySelector('#movie_player video') || document.querySelector('video');
  const urlVideoId = () => new URLSearchParams(location.search).get('v');

  // --- профиль ---
  // Токен кладёт попап после входа. Держим копию в памяти, чтобы не лезть
  // в storage на каждый запрос, и слушаем изменения: вход и выход из попапа
  // должны подхватываться открытой вкладкой сразу.
  let authToken = '';

  function authHeaders(extra = {}) {
    return authToken ? { ...extra, Authorization: `Bearer ${authToken}` } : { ...extra };
  }

  function dropToken() {
    authToken = '';
    try { chrome.storage.local.remove(TOKEN_KEY); } catch (e) {}
  }

  function watchToken() {
    try {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local' || !changes[TOKEN_KEY]) return;
        authToken = changes[TOKEN_KEY].newValue || '';
        if (state.ui) ShumDublajUI.setCredits(state.ui, authToken ? state.credits : null);
      });
    } catch (e) {}
  }

  function openAccount() {
    try { chrome.runtime.sendMessage({ type: 'SHUMDUBLAJ_OPEN_ACCOUNT' }); } catch (e) {}
  }

  // --- настройки ---
  function loadSettings() {
    return new Promise((resolve) => {
      try {
        // Старый ключ читаем тоже: иначе выставленные громкости потеряются
        chrome.storage.local.get(['shumdublaj', 'shumdub', TOKEN_KEY], (res) => {
          const saved = (res && (res.shumdublaj || res.shumdub)) || {};
          Object.assign(S, DEFAULTS, saved);
          authToken = (res && res[TOKEN_KEY]) || '';
          resolve();
        });
      } catch (e) {
        resolve();
      }
    });
  }

  // Chrome тормозит таймеры в неактивной вкладке, а иногда выгружает её целиком.
  // Работа при этом продолжается на сервере, поэтому запоминаем ключ задания и
  // после возвращения подхватываем его обратно вместо показа нуля.
  function rememberJob(videoId, key) {
    try { chrome.storage.local.set({ shumdublajJob: { videoId, key, at: Date.now() } }); } catch (e) {}
  }

  function forgetJob() {
    try { chrome.storage.local.remove('shumdublajJob'); } catch (e) {}
  }

  function recallJob() {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.get(['shumdublajJob'], (res) => resolve((res && res.shumdublajJob) || null));
      } catch (e) {
        resolve(null);
      }
    });
  }

  let saveTimer = null;
  function saveSettings() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { chrome.storage.local.set({ shumdublaj: { ...S } }); } catch (e) {}
    }, 300);
  }

  // --- субтитры из reader.js (MAIN world) ---
  let reqId = 0;
  function requestSubs(timeout = 15000) {
    return new Promise((resolve, reject) => {
      const id = ++reqId;
      const onMsg = (ev) => {
        if (ev.source !== window || !ev.data || ev.data.type !== 'SHUMDUBLAJ_SUBS' || ev.data.id !== id) return;
        window.removeEventListener('message', onMsg);
        clearTimeout(timer);
        ev.data.ok ? resolve(ev.data.payload) : reject(new Error(ev.data.error));
      };
      const timer = setTimeout(() => {
        window.removeEventListener('message', onMsg);
        reject(new Error('SUBS_TIMEOUT'));
      }, timeout);
      window.addEventListener('message', onMsg);
      window.postMessage({ type: 'SHUMDUBLAJ_REQ_SUBS', id }, '*');
    });
  }

  // --- сервер ---
  // Отдельные коды нужны, чтобы показать клиенту понятную причину, а не
  // «server 402»: кончились кредиты, слетел вход или сервер занят.
  function throwByStatus(status, message) {
    if (status === 401 || status === 403) {
      dropToken();
      throw new Error('AUTH_REQUIRED');
    }
    if (status === 402) throw new Error('NO_CREDITS');
    if (status === 429) throw new Error('SERVER_BUSY');
    throw new Error(message || `server ${status}`);
  }

  function rememberCredits(value) {
    if (value === undefined || value === null) return;
    state.credits = value;
    if (state.ui) ShumDublajUI.setCredits(state.ui, value);
  }

  async function startJob(payload, force) {
    if (!authToken) throw new Error('AUTH_REQUIRED');
    const r = await fetch(`${API}/api/dub`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        videoId: payload.videoId,
        sourceLang: S.source === 'auto' ? payload.sourceLang || null : S.source,
        json3: payload.json3 || null,
        force: Boolean(force),
      }),
    });
    const text = await r.text();
    let j;
    try {
      j = JSON.parse(text);
    } catch (e) {
      if (!r.ok) throwByStatus(r.status, `server ${r.status}`);
      throw new Error(`server ${r.status}: ${text.slice(0, 120) || 'пустой ответ'}`);
    }
    if (!r.ok) throwByStatus(r.status, j.error || `server ${r.status}`);
    rememberCredits(j.credits);
    return j;
  }

  async function waitJob(key, onTick, runId) {
    let misses = 0;
    for (;;) {
      await new Promise((s) => setTimeout(s, 1500));
      if (runId != null && runId !== state.runId) throw new Error('STALE');
      let j;
      try {
        const r = await fetch(`${API}/api/dub/${key}`, { headers: authHeaders() });
        // Слетевший вход повторами не лечится: выходим сразу
        if (r.status === 401 || r.status === 403) throwByStatus(r.status);
        if (!r.ok) throw new Error(`status ${r.status}`);
        j = await r.json();
      } catch (e) {
        if (String(e.message || e) === 'AUTH_REQUIRED') throw e;
        // Сеть могла моргнуть или вкладка уснуть: не бросаем задание сразу
        if (++misses > 20) throw e;
        continue;
      }
      misses = 0;
      if (j.phase === 'done') return j;
      if (j.phase === 'error') throw new Error(j.error || 'server error');
      onTick && onTick(j);
    }
  }

  async function fetchAudioBlobUrl(key) {
    // Через blob, потому что CSP YouTube не пустит media с localhost напрямую
    const r = await fetch(`${API}/api/dub/${key}/audio`, { headers: authHeaders() });
    if (!r.ok) throwByStatus(r.status, `audio ${r.status}`);
    return URL.createObjectURL(await r.blob());
  }

  // --- интервалы речи для адаптивной громкости ---
  function buildSpeech(segments) {
    return (segments || [])
      .filter((s) => s.voiced && s.placedAt != null && s.placedEnd != null)
      .map((s) => ({ s: s.placedAt - LEAD, e: s.placedEnd + 0.05 }))
      .sort((a, b) => a.s - b.s);
  }

  function isSpeaking(time) {
    const arr = state.speech;
    let lo = 0;
    let hi = arr.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (time < arr[mid].s) hi = mid - 1;
      else if (time > arr[mid].e) lo = mid + 1;
      else return true;
    }
    return false;
  }

  // --- проигрывание и синхронизация ---
  function on(el, ev, fn) {
    el.addEventListener(ev, fn);
    state.listeners.push([el, ev, fn]);
  }

  function attach(blobUrl, segments) {
    const v = video();
    if (!v) throw new Error('плеер не найден');

    state.speech = buildSpeech(segments);

    const audio = new Audio(blobUrl);
    audio.preload = 'auto';
    audio.volume = S.dub;
    state.audio = audio;

    state.savedVolume = v.volume;

    const sync = (force) => {
      if (force || Math.abs(v.currentTime - audio.currentTime) > DRIFT) audio.currentTime = v.currentTime;
    };

    on(v, 'play', () => { sync(true); audio.play().catch(() => {}); });
    on(v, 'pause', () => audio.pause());
    on(v, 'seeked', () => sync(true));
    on(v, 'ratechange', () => { audio.playbackRate = v.playbackRate; });

    audio.playbackRate = v.playbackRate;
    sync(true);
    if (!v.paused) audio.play().catch(() => {});

    state.timer = setInterval(() => {
      if (!state.on || !state.audio) return;
      const vid = video();
      if (!vid) return;

      if (vid.paused) {
        if (!audio.paused) audio.pause();
      } else {
        if (audio.paused) audio.play().catch(() => {});
        sync(false);
      }

      // Оригинал приглушается только пока звучит наша фраза, в паузах слышен.
      // Если интервалов нет (дорожка из старого кэша), держим оригинал тихим всегда.
      const target = !state.speech.length || isSpeaking(vid.currentTime) ? S.duck : S.idle;
      const next = vid.volume + (target - vid.volume) * 0.3;
      vid.volume = Math.abs(next - target) < 0.01 ? target : Math.max(0, Math.min(1, next));
      if (Math.abs(audio.volume - S.dub) > 0.01) audio.volume = S.dub;
    }, TICK);
  }

  function detach() {
    clearInterval(state.timer);
    state.timer = null;
    for (const [el, ev, fn] of state.listeners) el.removeEventListener(ev, fn);
    state.listeners = [];
    if (state.audio) {
      state.audio.pause();
      URL.revokeObjectURL(state.audio.src);
      state.audio = null;
    }
    const v = video();
    if (v && state.savedVolume != null) v.volume = state.savedVolume;
    state.savedVolume = null;
    state.speech = [];
    state.on = false;
  }

  // --- главное действие ---
  function render(percent) {
    ShumDublajUI.setState(state.ui, { on: state.on, busy: state.busy, percent });
  }

  async function run(force) {
    if (state.busy) return;
    if (state.on && !force) {
      detach();
      render();
      ShumDublajUI.setStatus(state.ui, '');
      return;
    }
    if (force) detach();

    // Без входа даже субтитры читать незачем: сервер всё равно откажет
    if (!authToken) {
      ShumDublajUI.setStatus(state.ui, t.authRequired, 'err');
      openAccount();
      return;
    }

    const runId = ++state.runId;
    const stale = () => runId !== state.runId;

    state.busy = true;
    render(0);
    ShumDublajUI.setStatus(state.ui, 'Subtitrlar o‘qilmoqda...');

    try {
      let subs = null;
      try {
        subs = await requestSubs();
      } catch (e) {
        console.log('[ShumDublaj] со страницы субтитры не вышли, передаю на сервер:', e.message);
        ShumDublajUI.setStatus(state.ui, t.serverSubs);
      }
      if (stale()) throw new Error('STALE');
      state.videoId = (subs && subs.videoId) || urlVideoId();
      if (!state.videoId) throw new Error('видео не определилось');

      const started = await startJob(subs || { videoId: state.videoId }, force);
      if (stale()) throw new Error('STALE');
      rememberJob(state.videoId, started.key);
      let final = started;
      if (started.phase !== 'done') {
        final = await waitJob(started.key, (j) => {
          const pct = j.total ? Math.round((j.done / j.total) * 100) : 0;
          render(pct);
          ShumDublajUI.setStatus(state.ui, `${t.phases[j.phase] || j.phase}: ${j.done}/${j.total}`);
        }, runId);
      }

      if (stale()) throw new Error('STALE');
      ShumDublajUI.setStatus(state.ui, 'Ovoz yuklanmoqda...');
      forgetJob();
      const blobUrl = await fetchAudioBlobUrl(final.key);
      if (stale()) { URL.revokeObjectURL(blobUrl); throw new Error('STALE'); }
      attach(blobUrl, final.segments);
      state.on = true;
      state.busy = false;
      render();

      // Имя переводчика в панели не показываем: это отладка, она есть в логах сервера
      const m = final.meta || {};
      const missed = (m.segmentCount || 0) - (m.voicedCount || 0);
      ShumDublajUI.setStatus(
        state.ui,
        `${m.voicedCount || 0} jumla ovozlandi` +
          (missed > 0 ? `, ${missed} tasi o'tkazib yuborildi` : '') +
          (m.maxDrift ? `, kechikish ${m.maxDrift}s` : ''),
        'ok'
      );
    } catch (e) {
      const msg = String(e.message || e);
      if (msg.includes('STALE')) {
        console.log('[ShumDublaj] запуск отменён: видео сменилось');
        return;
      }
      console.log('[ShumDublaj] ошибка:', msg);
      let human = 'Xato: ' + msg;
      if (msg === 'AUTH_REQUIRED') {
        human = t.authRequired;
        openAccount();
      } else if (msg === 'NO_CREDITS') human = t.noCredits;
      else if (msg === 'SERVER_BUSY') human = t.busy;
      else if (msg.includes('NO_SUBTITLES')) human = t.noSubs;
      else if (msg.startsWith('SUBS_')) human = `${t.subsFail} (${msg})`;
      else if (msg.includes('Failed to fetch')) human = t.noServer;
      detach();
      forgetJob();
      state.busy = false;
      render();
      ShumDublajUI.setStatus(state.ui, human, 'err');
    }
  }

  // Возвращаемся к заданию, начатому до того, как вкладку усыпили или выгрузили.
  // Само задание всё это время считалось на сервере.
  async function resumeJob() {
    if (state.busy || state.on || !authToken) return;
    const saved = await recallJob();
    if (!saved || !saved.key) return;
    const id = urlVideoId();
    if (!id || saved.videoId !== id) return;
    if (Date.now() - (saved.at || 0) > 2 * 60 * 60 * 1000) { forgetJob(); return; }

    const runId = ++state.runId;
    const stale = () => runId !== state.runId;

    state.busy = true;
    state.videoId = id;
    render(0);
    ShumDublajUI.setStatus(state.ui, 'Boshlangan tarjima davom etmoqda...');
    try {
      const first = await fetch(`${API}/api/dub/${saved.key}`, { headers: authHeaders() });
      if (first.status === 401 || first.status === 403) throwByStatus(first.status);
      let j = await first.json();
      if (stale()) return;
      if (j.phase !== 'done') {
        j = await waitJob(saved.key, (tick) => {
          const pct = tick.total ? Math.round((tick.done / tick.total) * 100) : 0;
          render(pct);
          ShumDublajUI.setStatus(state.ui, `${t.phases[tick.phase] || tick.phase}: ${tick.done}/${tick.total}`);
        }, runId);
      }
      if (stale()) return;
      forgetJob();
      const blobUrl = await fetchAudioBlobUrl(saved.key);
      if (stale()) { URL.revokeObjectURL(blobUrl); return; }
      attach(blobUrl, j.segments);
      state.on = true;
      state.busy = false;
      render();
      const m = j.meta || {};
      ShumDublajUI.setStatus(state.ui, `${m.voicedCount || 0} jumla ovozlandi`, 'ok');
    } catch (e) {
      if (String(e.message || e).includes('STALE')) return;
      console.log('[ShumDublaj] задание не восстановилось:', e.message);
      forgetJob();
      state.busy = false;
      render();
      ShumDublajUI.setStatus(state.ui, '');
    }
  }

  // --- монтирование ---
  function mount() {
    const p = player();
    if (!p) return false;
    if (state.ui && state.ui.host.isConnected && p.contains(state.ui.host)) return true;

    state.ui = ShumDublajUI.create({
      version: VERSION,
      logoUrl: chrome.runtime.getURL('brand/eagle-gold.svg'),
      onToggle: () => run(false),
      onRegen: () => run(true),
      onSource: (v) => { S.source = v; saveSettings(); },
      onVolume: (key, val) => {
        S[key] = val;
        saveSettings();
        const v = video();
        if (state.on && v && key === 'dub' && state.audio) state.audio.volume = val;
      },
    });

    p.appendChild(state.ui.host);
    state.ui.source.value = S.source;
    ShumDublajUI.setVolumes(state.ui, S);
    ShumDublajUI.setCredits(state.ui, authToken ? state.credits : null);
    render();
    resumeJob();
    console.log(`[ShumDublaj] v${VERSION} панель готова`);
    return true;
  }

  function onNavigate() {
    const id = urlVideoId();
    if (id && state.videoId && id !== state.videoId) {
      // Переключились на другое видео: гасим и звук, и незаконченную генерацию,
      // иначе панель продолжит показывать прогресс от прежнего ролика
      state.runId++;
      detach();
      state.busy = false;
      state.videoId = id;
      if (state.ui) {
        render();
        ShumDublajUI.setStatus(state.ui, '');
      }
      console.log('[ShumDublaj] видео сменилось, состояние сброшено');
    }
    mount();
    resumeJob();
  }

  // Прячем панель вместе с контролами YouTube, но не когда открыты настройки
  function autoHide() {
    const p = player();
    if (!p || !state.ui) return;
    const hidden = p.classList.contains('ytp-autohide') && !state.ui.panel.classList.contains('open');
    state.ui.host.style.transition = 'opacity 0.2s ease';
    state.ui.host.style.opacity = hidden ? '0' : '1';
    state.ui.host.style.pointerEvents = hidden ? 'none' : 'auto';
  }

  loadSettings().then(() => {
    console.log(`[ShumDublaj] v${VERSION} загрузилось`);
    watchToken();
    state.videoId = urlVideoId();
    mount();
    new MutationObserver(() => mount()).observe(document.documentElement, { childList: true, subtree: true });
    window.addEventListener('yt-navigate-finish', onNavigate);
    document.addEventListener('yt-navigate-finish', onNavigate);
    // На событие yt-navigate-finish полагаться нельзя, оно приходит не всегда,
    // поэтому сами следим за адресом видео
    let lastSeenId = urlVideoId();
    setInterval(() => {
      const id = urlVideoId();
      if (id !== lastSeenId) {
        lastSeenId = id;
        onNavigate();
      }
      mount();
      autoHide();
    }, 700);

    // Вернулись на вкладку: сразу проверяем, не доделалось ли задание
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) resumeJob();
    });

    // Ctrl+Shift+U включает и выключает озвучку
    window.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'U' || e.key === 'u')) {
        e.preventDefault();
        run(false);
      }
    });
  });
})();
