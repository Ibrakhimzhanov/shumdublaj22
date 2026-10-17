// Работает в MAIN world, то есть видит внутренние объекты YouTube.
// Задача одна: достать субтитры видео и отдать их в app.js.
//
// Важно, почему именно так. Прямой запрос к timedtext по baseUrl из
// playerResponse YouTube с 2025 года отдаёт пустое тело: нужен PO-token.
// Сервер тоже не спасает, с IP датацентра прилетает бот-чек. Зато сам плеер
// субтитры грузит прекрасно, со всеми подписями. Поэтому мы перехватываем его
// собственные запросы, а прямой путь оставлен запасным.

(function () {
  'use strict';

  const captured = new Map(); // ключ: videoId, значение: json3
  let lastTimedtextUrl = '';

  function looksLikeTimedtext(url) {
    return typeof url === 'string' && url.includes('/api/timedtext');
  }

  function player() {
    return document.querySelector('#movie_player');
  }

  function videoId() {
    try {
      const p = player();
      if (p && typeof p.getVideoData === 'function') {
        const id = p.getVideoData().video_id;
        if (id) return id;
      }
    } catch (e) {}
    return new URLSearchParams(location.search).get('v') || '';
  }

  function remember(url, text) {
    if (!text) return;
    let json3 = null;
    try {
      const parsed = JSON.parse(text);
      if (parsed && parsed.events && parsed.events.length) json3 = parsed;
    } catch (e) {
      return;
    }
    if (!json3) return;
    lastTimedtextUrl = url;
    const id = new URLSearchParams(url.split('?')[1] || '').get('v') || videoId();
    captured.set(id, json3);
    console.log(`[ShumDublaj] перехвачены субтитры плеера: ${json3.events.length} событий`);
  }

  // Перехват fetch
  const nativeFetch = window.fetch;
  window.fetch = function (input, init) {
    const url = typeof input === 'string' ? input : input && input.url;
    const promise = nativeFetch.apply(this, arguments);
    if (looksLikeTimedtext(url)) {
      promise
        .then((r) => r.clone().text())
        .then((text) => remember(url, text))
        .catch(() => {});
    }
    return promise;
  };

  // Перехват XMLHttpRequest: плеер пользуется и им тоже
  const nativeOpen = XMLHttpRequest.prototype.open;
  const nativeSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url) {
    this.__shumdublajUrl = url;
    return nativeOpen.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function () {
    if (looksLikeTimedtext(this.__shumdublajUrl)) {
      this.addEventListener('load', () => {
        try {
          remember(this.__shumdublajUrl, this.responseText);
        } catch (e) {}
      });
    }
    return nativeSend.apply(this, arguments);
  };

  function playerResponse() {
    try {
      const p = player();
      if (p && typeof p.getPlayerResponse === 'function') {
        const r = p.getPlayerResponse();
        if (r && r.captions) return r;
      }
    } catch (e) {}
    return window.ytInitialPlayerResponse || null;
  }

  // Авто-субтитры (asr) для дубляжа лучше ручных: у них тайминги по каждому
  // слову, поэтому фразы режутся точно. Ручные идут крупными блоками по 10-18
  // секунд и содержат мусор вроде имён переводчиков и ремарок.
  function pickTrack(tracks) {
    if (!tracks || !tracks.length) return null;
    const notUz = tracks.filter((t) => !String(t.languageCode || '').startsWith('uz'));
    const pool = notUz.length ? notUz : tracks;
    const isEn = (t) => String(t.languageCode || '').startsWith('en');
    return (
      pool.find((t) => isEn(t) && t.kind === 'asr') ||
      pool.find((t) => t.kind === 'asr') ||
      pool.find((t) => t.languageCode === 'en') ||
      pool.find(isEn) ||
      pool[0]
    );
  }

  function tracksOf(pr) {
    return pr && pr.captions && pr.captions.playerCaptionsTracklistRenderer
      ? pr.captions.playerCaptionsTracklistRenderer.captionTracks
      : null;
  }

  // Просим плеер включить субтитры: тогда он сам сходит за ними, а мы поймаем
  // ответ перехватчиком. Прежнее состояние возвращаем, чтобы не мешать зрителю.
  async function askPlayerToLoadSubs(track) {
    const p = player();
    if (!p || typeof p.setOption !== 'function') return false;

    let previous = null;
    try {
      previous = p.getOption('captions', 'track');
    } catch (e) {}

    try {
      p.loadModule('captions');
    } catch (e) {}
    try {
      p.setOption('captions', 'track', { languageCode: track.languageCode, kind: track.kind || '' });
    } catch (e) {
      return false;
    }

    const id = videoId();
    for (let i = 0; i < 24; i++) {
      await new Promise((s) => setTimeout(s, 250));
      if (captured.has(id) || captured.size) break;
    }

    try {
      if (previous && previous.languageCode) p.setOption('captions', 'track', previous);
      else p.setOption('captions', 'track', {});
    } catch (e) {}
    return captured.size > 0;
  }

  function withFmt(baseUrl, fmt) {
    const u = baseUrl.replace(/([?&])fmt=[^&]*/g, '$1').replace(/&&+/g, '&').replace(/[?&]$/, '');
    return u + (u.includes('?') ? '&' : '?') + 'fmt=' + fmt;
  }

  // srv3 и srv1 это XML-форматы субтитров. Приводим их к структуре json3,
  // чтобы серверу было всё равно, откуда пришли тайминги.
  function xmlToJson3(text) {
    const doc = new DOMParser().parseFromString(text, 'text/xml');
    if (doc.querySelector('parsererror')) return null;

    const events = [];
    for (const p of doc.querySelectorAll('body > p')) {
      const tStartMs = Number(p.getAttribute('t') || 0);
      const dDurationMs = Number(p.getAttribute('d') || 0);
      const spans = p.querySelectorAll('s');
      const segs = spans.length
        ? Array.from(spans).map((s) => ({ utf8: s.textContent, tOffsetMs: Number(s.getAttribute('t') || 0) }))
        : [{ utf8: p.textContent, tOffsetMs: 0 }];
      events.push({ tStartMs, dDurationMs, segs });
    }
    if (events.length) return { events };

    for (const el of doc.querySelectorAll('transcript > text')) {
      const start = parseFloat(el.getAttribute('start') || '0');
      const dur = parseFloat(el.getAttribute('dur') || '0');
      events.push({
        tStartMs: Math.round(start * 1000),
        dDurationMs: Math.round(dur * 1000),
        segs: [{ utf8: el.textContent, tOffsetMs: 0 }],
      });
    }
    return events.length ? { events } : null;
  }

  // Запасной путь: пробуем скачать субтитры сами. Если у перехваченного запроса
  // был PO-token, переносим его параметры, иначе YouTube отдаст пустое тело.
  async function fetchTrack(baseUrl) {
    let base = baseUrl;
    if (lastTimedtextUrl) {
      try {
        const from = new URLSearchParams(lastTimedtextUrl.split('?')[1] || '');
        const to = new URL(base, location.origin);
        for (const key of ['pot', 'potc', 'c', 'cver', 'xoaf', 'xorp', 'xosf']) {
          const value = from.get(key);
          if (value && !to.searchParams.get(key)) to.searchParams.set(key, value);
        }
        base = to.toString();
      } catch (e) {}
    }

    const attempts = [withFmt(base, 'json3'), base, withFmt(base, 'srv3'), withFmt(base, 'srv1')];
    let note = 'SUBS_EMPTY';
    for (const url of attempts) {
      let text;
      try {
        const r = await fetch(url, { credentials: 'include' });
        if (!r.ok) { note = 'SUBS_FETCH_' + r.status; continue; }
        text = (await r.text()).trim();
      } catch (e) {
        note = 'SUBS_NETWORK';
        continue;
      }
      if (!text) { note = 'SUBS_EMPTY_BODY'; continue; }
      if (text.startsWith('{')) {
        try {
          const j = JSON.parse(text);
          if (j && j.events && j.events.length) return j;
        } catch (e) { note = 'SUBS_BAD_JSON'; }
        continue;
      }
      const converted = xmlToJson3(text);
      if (converted) return converted;
      note = 'SUBS_UNKNOWN_FORMAT';
    }
    throw new Error(note);
  }

  async function collect() {
    const pr = playerResponse();
    const tracks = tracksOf(pr);
    if (!tracks || !tracks.length) throw new Error('NO_SUBTITLES');
    const track = pickTrack(tracks);
    if (!track) throw new Error('NO_SUBTITLES');

    const id = videoId();
    const base = {
      videoId: id,
      sourceLang: (track.languageCode || 'en').split('-')[0],
      isAuto: track.kind === 'asr',
      available: tracks.map((t) => ({ lang: t.languageCode, asr: t.kind === 'asr' })),
    };

    // 1. Плеер мог уже сходить за субтитрами сам
    if (captured.has(id)) return { ...base, json3: captured.get(id), via: 'intercept' };

    // 2. Просим плеер включить субтитры и ловим его запрос
    await askPlayerToLoadSubs(track);
    if (captured.has(id)) return { ...base, json3: captured.get(id), via: 'player' };
    if (captured.size) return { ...base, json3: captured.values().next().value, via: 'player' };

    // 3. Запасной путь: качаем сами
    if (!track.baseUrl) throw new Error('NO_SUBTITLES');
    const json3 = await fetchTrack(track.baseUrl);
    return { ...base, json3, via: 'direct' };
  }

  window.addEventListener('message', async (ev) => {
    if (ev.source !== window || !ev.data || ev.data.type !== 'SHUMDUBLAJ_REQ_SUBS') return;
    const id = ev.data.id;
    try {
      const payload = await collect();
      console.log(`[ShumDublaj] субтитры получены (${payload.via}): ${payload.json3.events.length} событий`);
      window.postMessage({ type: 'SHUMDUBLAJ_SUBS', id, ok: true, payload }, '*');
    } catch (e) {
      window.postMessage({ type: 'SHUMDUBLAJ_SUBS', id, ok: false, error: String(e.message || e) }, '*');
    }
  });
})();
