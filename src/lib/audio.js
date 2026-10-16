/* Один звук в приложении: в любой момент играет ровно один источник.
   Старт любого плеера останавливает все остальные - это касается и образцов
   голосов, и частей задачи, и общего результата.

   Общий результат - это плейлист из готовых частей. По мере готовности новых
   частей список дописывается, а воспроизведение не сбрасывается в начало. */

const el = new Audio();
el.preload = 'auto';

const durCache = new Map();
const listeners = new Set();

let key = null;        // идентификатор источника, который сейчас занят плеером
let segs = [];         // [{ url, name }]
let idx = 0;
let playing = false;
let live = false;      // список ещё может пополниться (часть задачи в работе)

function emit() { for (const fn of listeners) fn(); }

export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }

el.addEventListener('timeupdate', emit);
el.addEventListener('durationchange', () => {
  const u = segs[idx] && segs[idx].url;
  if (u && Number.isFinite(el.duration) && el.duration > 0) durCache.set(u, el.duration);
  emit();
});
el.addEventListener('play', () => { playing = true; emit(); });
el.addEventListener('pause', () => { playing = false; emit(); });
el.addEventListener('error', () => { playing = false; emit(); });
el.addEventListener('ended', () => {
  if (idx < segs.length - 1) { idx += 1; load(true); }
  else { playing = false; emit(); }
});

function load(autoplay) {
  const s = segs[idx];
  if (!s) return;
  el.src = s.url;
  if (autoplay) el.play().catch(() => { playing = false; emit(); });
  emit();
}

/** Продолжительность известных частей, сек. */
function knownTotal() {
  let t = 0;
  for (const s of segs) t += durCache.get(s.url) || 0;
  return t;
}

function elapsed() {
  let t = 0;
  for (let i = 0; i < idx; i++) t += durCache.get(segs[i].url) || 0;
  return t + (Number.isFinite(el.currentTime) ? el.currentTime : 0);
}

export function state() {
  return {
    key,
    playing,
    index: idx,
    count: segs.length,
    live,
    position: key ? elapsed() : 0,
    total: key ? knownTotal() : 0,
    complete: segs.every(s => durCache.has(s.url))
  };
}

export const isActive = (k) => key === k;
export const isPlaying = (k) => key === k && playing;

/** Запускает источник; повторный вызов с тем же ключом ставит на паузу и снимает с неё. */
export function toggle(k, segments, opts = {}) {
  if (key === k) {
    if (playing) el.pause();
    else el.play().catch(() => {});
    emit();
    return;
  }
  start(k, segments, opts);
}

export function start(k, segments, opts = {}) {
  el.pause();
  key = k;
  segs = (segments || []).filter(Boolean);
  live = !!opts.live;
  idx = 0;
  playing = false;
  if (!segs.length) { key = null; emit(); return; }
  load(true);
  probe();
}

/** Дописывает список, не прерывая воспроизведение. */
export function extend(k, segments) {
  if (key !== k) return;
  const next = (segments || []).filter(Boolean);
  if (next.length <= segs.length) return;
  segs = next;
  emit();
  probe();
}

export function setLive(k, v) {
  if (key !== k) return;
  if (live !== v) { live = v; emit(); }
}

export function stop() {
  el.pause();
  el.removeAttribute('src');
  key = null; segs = []; idx = 0; playing = false; live = false;
  emit();
}

/** Перемотка по общей шкале, доля 0..1. */
export function seekFraction(f) {
  const total = knownTotal();
  if (!total) return;
  let want = Math.max(0, Math.min(1, f)) * total;
  for (let i = 0; i < segs.length; i++) {
    const d = durCache.get(segs[i].url) || 0;
    if (want <= d || i === segs.length - 1) {
      if (i !== idx) { idx = i; load(playing); }
      el.currentTime = Math.max(0, Math.min(d ? d - 0.05 : want, want));
      emit();
      return;
    }
    want -= d;
  }
}

/* Длительности частей узнаём заранее и по одной, чтобы шкала показывала
   честное «сделано из всего», а не росла на глазах во время прослушивания.
   Опрашиваем по очереди, не мешая тому, что играет сейчас. */
const probeQueue = [];
let probing = false;

function probeOne(url) {
  return new Promise((res) => {
    const a = new Audio();
    a.preload = 'metadata';
    const done = () => { a.removeAttribute('src'); res(); };
    a.addEventListener('loadedmetadata', () => {
      if (Number.isFinite(a.duration) && a.duration > 0) durCache.set(url, a.duration);
      done();
    }, { once: true });
    a.addEventListener('error', done, { once: true });
    setTimeout(done, 12000);
    a.src = url;
  });
}

async function drain() {
  if (probing) return;
  probing = true;
  try {
    while (probeQueue.length) {
      const url = probeQueue.shift();
      if (durCache.has(url)) continue;
      await probeOne(url);
      emit();
    }
  } finally { probing = false; }
}

/** Узнать длительности, ничего не проигрывая: время видно до нажатия на плеер. */
export function preload(urls) {
  let added = false;
  for (const u of urls || []) {
    if (!u || durCache.has(u) || probeQueue.includes(u)) continue;
    probeQueue.push(u);
    added = true;
  }
  if (added) drain();
}

function probe() { preload(segs.map(s => s.url)); }

export function durationOf(url) { return durCache.get(url) || 0; }
