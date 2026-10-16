import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../App.jsx';
import { api } from '../lib/api.js';
import * as fmt from '../lib/format.js';
import * as sound from '../lib/audio.js';
import { makeT } from '../lib/i18n.js';
import STR from './TaskPanel.i18n.js';
import { Icon, PlayIcon, Spinner } from '../ui.jsx';

/* Правая колонка: вкладка «Результат» с экраном одной задачи и вкладка «История».
   Здесь человек проводит минуты ожидания, поэтому экран честный: показываем
   реальные проценты, реальные причины ошибок от сервиса и даём слушать готовые
   части, не дожидаясь остальных.

   Имя `t` занято переводчиком, поэтому задача в аргументах называется `item`. */

const BASE = 'https://qw1voicegencore.pro';

const ACTIVE = ['running', 'queued'];
const isActiveStatus = (s) => ACTIVE.indexOf(s) >= 0;

const ST_KEY = {
  running: 'stRunning',
  queued: 'stQueued',
  done: 'stDone',
  error: 'stError',
  cancelled: 'stCancelled'
};
const ST_COLOR = {
  running: 'var(--gold)',
  queued: 'var(--ink3)',
  done: 'var(--ok)',
  error: 'var(--err)',
  cancelled: 'var(--warn)'
};

/* Сервис может прислать статус, которого мы не знаем: считаем такой «в очереди»,
   чтобы экран не ломался на новых значениях. */
function normStatus(raw) {
  const v = String(raw || '').toLowerCase().trim();
  if (v === 'done' || v === 'completed' || v === 'complete' || v === 'success' || v === 'finished') return 'done';
  if (v === 'error' || v === 'failed' || v === 'failure') return 'error';
  if (v === 'cancelled' || v === 'canceled' || v === 'stopped' || v === 'aborted') return 'cancelled';
  if (v === 'running' || v === 'processing' || v === 'in_progress' || v === 'in-progress' || v === 'started') return 'running';
  return 'queued';
}

function plural(n, one, few, many) {
  const a = Math.abs(Number(n) || 0) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b > 1 && b < 5) return few;
  if (b === 1) return one;
  return many;
}

const absUrl = (u) => (!u ? null : (/^https?:/i.test(u) ? u : BASE + u));

function safeFileName(s) {
  const clean = String(s || '').replace(/[\\/:*?"<>|\r\n\t]+/g, '-').trim().slice(0, 80).trim();
  return clean || 'result';
}

/* Имя задачи: своё название, кусочек текста или запасная подпись на языке экрана. */
function taskName(item, t) {
  if (!item) return '';
  const named = String(item.text_source_name || item.filename || '').trim();
  if (named) return named;
  const preview = String(item.text_preview || item.text || '').trim().replace(/\s+/g, ' ');
  if (preview) return preview.length > 34 ? preview.slice(0, 34) + '…' : preview;
  return item.display_number ? t('taskNo', { n: item.display_number }) : t('taskFallback');
}

/* Готовые части в виде записей для архива: имя файла + подписанная ссылка. */
function readyEntries(statuses) {
  const out = [];
  (statuses || []).forEach((s, i) => {
    if (normStatus(s.status) !== 'done' || !s.download_src) return;
    const tail = String(s.id || '').split(':').pop();
    const n = parseInt(tail, 10);
    const part = Number.isFinite(n) && n > 0 ? n : i + 1;
    out.push({ part, name: s.filename || ('part-' + part + '.mp3'), url: s.download_src });
  });
  out.sort((a, b) => a.part - b.part);
  return out;
}

export default function TaskPanel() {
  const {
    tasks, curTask, setCurTask, refreshTasks, connLost,
    rightTab, setRightTab, voice, toast, confirm, closeConfirm, lang
  } = useApp();

  const t = useMemo(() => makeT(STR, lang), [lang]);
  const nameOf = useCallback((item) => taskName(item, t), [t]);

  // Русскому нужен падеж после числа, узбекскому нет: слово берём из словаря.
  const wordGen = useCallback(
    (n) => plural(n, t('partsGenOne'), t('partsGenMany'), t('partsGenMany')),
    [t]
  );
  const wordNom = useCallback(
    (n) => plural(n, t('partsNomOne'), t('partsNomFew'), t('partsNomMany')),
    [t]
  );

  const [chunksMap, setChunksMap] = useState({});   // id -> { text, chunks }
  const [stat, setStat] = useState({ id: null, list: [] });
  const [srcOpen, setSrcOpen] = useState(false);
  const [snd, setSnd] = useState(() => sound.state());
  const [busy, setBusy] = useState('');             // ключ действия, которое сейчас выполняется

  const chunksRef = useRef(chunksMap);
  useEffect(() => { chunksRef.current = chunksMap; }, [chunksMap]);

  const task = useMemo(
    () => (curTask ? (tasks || []).find(x => x.task_id === curTask) || null : null),
    [tasks, curTask]
  );
  const taskStatus = task ? normStatus(task.status) : null;
  const taskLive = !!task && isActiveStatus(taskStatus);

  /* ------------------------------------------------------------ плеер */

  useEffect(() => sound.subscribe(() => setSnd(sound.state())), []);

  /* --------------------------------------------------- данные задачи */

  useEffect(() => { setSrcOpen(false); }, [curTask]);

  // Полный текст и текст частей запрашиваем один раз на задачу: запрос тяжёлый.
  useEffect(() => {
    if (!curTask || chunksRef.current[curTask]) return;
    let stop = false;
    let timer = null;
    const load = async () => {
      try {
        const r = await api.chunks(curTask);
        if (stop) return;
        setChunksMap(m => ({ ...m, [curTask]: { text: (r && r.text) || '', chunks: (r && r.chunks) || [] } }));
      } catch {
        // Сеть могла отвалиться: повторим, за индикатор связи отвечает App.
        if (!stop) timer = setTimeout(load, 4000);
      }
    };
    load();
    return () => { stop = true; clearTimeout(timer); };
  }, [curTask]);

  // Статусы частей: пока задача в работе - каждые 2.5 с, иначе один раз.
  useEffect(() => {
    if (!curTask) { setStat({ id: null, list: [] }); return; }
    let stop = false;
    let timer = null;
    const keepGoing = taskLive;
    const tick = async () => {
      try {
        const r = await api.chunkStatuses(curTask);
        if (!stop) setStat({ id: curTask, list: (r && r.statuses) || [] });
      } catch {
        // Молча повторяем: экран ошибки здесь не нужен.
      }
      // Завершённую задачу опрашиваем один раз: дальше статусы не меняются.
      if (!stop && keepGoing) timer = setTimeout(tick, 2500);
    };
    tick();
    return () => { stop = true; clearTimeout(timer); };
  }, [curTask, taskLive]);

  const refreshStatuses = useCallback(async (id) => {
    try {
      const r = await api.chunkStatuses(id);
      setStat({ id, list: (r && r.statuses) || [] });
    } catch {
      // не критично: следующий опрос подхватит
    }
  }, []);

  /* ------------------------------------------------------------ части */

  const parts = useMemo(() => {
    if (!task) return [];
    const meta = chunksMap[task.task_id];
    const texts = (meta && meta.chunks) || [];
    const raw = stat.id === task.task_id ? stat.list : [];

    const byIdx = new Map();
    raw.forEach((s, i) => {
      const tail = String(s.id || '').split(':').pop();
      const n = parseInt(tail, 10);
      byIdx.set(Number.isFinite(n) && n > 0 ? n : i + 1, s);
    });

    let count = Math.max(texts.length, byIdx.size, Number(task.result_chunks_count) || 0);
    byIdx.forEach((_v, k) => { if (k > count) count = k; });
    if (!count) return [];

    const live = isActiveStatus(normStatus(task.status));
    const out = [];
    for (let i = 1; i <= count; i++) {
      const c = texts[i - 1];
      const s = byIdx.get(i);
      // Части без своего статуса: у активной задачи это очередь, у завершённой
      // берём исход самой задачи, чтобы не врать про «в очереди» навсегда.
      const st = s ? normStatus(s.status) : (live ? 'queued' : normStatus(task.status));
      const pctRaw = Math.round(Number((s && s.percentage_complete) || 0));
      out.push({
        index: i,
        text: (c && c.text) || '',
        filename: (s && s.filename) || (c && c.filename) || ('part-' + i + '.mp3'),
        status: st,
        pct: st === 'done' ? 100 : Math.max(0, Math.min(100, pctRaw)),
        audio: (s && s.audio_src) || null,
        dl: (s && s.download_src) || null,
        message: (s && s.message) || ''
      });
    }
    return out;
  }, [task, chunksMap, stat]);

  const total = parts.length;
  const doneCount = parts.reduce((a, p) => a + (p.status === 'done' ? 1 : 0), 0);
  const anyErr = parts.some(p => p.status === 'error');

  const readySegs = useMemo(
    () => parts.filter(p => p.status === 'done' && p.audio).map(p => ({ url: p.audio, name: p.filename })),
    [parts]
  );
  const readyCount = readySegs.length;

  const taskKey = curTask ? 'task:' + curTask : '';
  const segsRef = useRef(readySegs);
  useEffect(() => { segsRef.current = readySegs; }, [readySegs]);

  // Новые готовые части дописываем в плейлист: воспроизведение не прервётся.
  useEffect(() => {
    if (!taskKey || !sound.isActive(taskKey)) return;
    sound.extend(taskKey, segsRef.current);
    sound.setLive(taskKey, taskLive);
  }, [taskKey, readyCount, taskLive]);

  // Длительности готовых частей узнаём сразу, чтобы время было видно
  // до первого нажатия на плеер.
  useEffect(() => { sound.preload(readySegs.map(s => s.url)); }, [readySegs]);

  /* --------------------------------------------------------- скачивание */

  const reportSave = useCallback((r, numByName) => {
    if (!r || r.canceled) return;
    // r.error приходит от системы сохранения: показываем как есть.
    if (!r.ok) { toast('err', r.error || t('saveNoReason')); return; }
    if (r.partial) {
      toast('warn', t('savePartial', { got: fmt.num(r.size), exp: fmt.num(r.expected) }));
      return;
    }
    if (r.failed && r.failed.length) {
      const list = r.failed.map(n => (numByName && numByName[n]) || n).join(', ');
      toast('warn', t('zipPartial', { list }));
      return;
    }
    toast('ok', t('saveOk', { path: r.path }));
  }, [toast, t]);

  const saveSingle = useCallback(async (item) => {
    const url = item.public_download_url || absUrl(item.download_url);
    if (!url) { toast('err', t('noFileLink')); return; }
    const key = 'one:' + item.task_id;
    setBusy(key);
    try {
      const r = await window.sv.saveUrl({
        url,
        withAuth: !item.public_download_url,
        suggestName: item.result_download_name || (safeFileName(nameOf(item)) + '.mp3')
      });
      reportSave(r);
    } finally { setBusy(b => (b === key ? '' : b)); }
  }, [reportSave, toast, t, nameOf]);

  const saveArchive = useCallback(async (item, known) => {
    const key = 'zip:' + item.task_id;
    setBusy(key);
    try {
      let entries = known || null;
      if (!item.public_archive_url && !entries) {
        try {
          const r = await api.chunkStatuses(item.task_id);
          entries = readyEntries((r && r.statuses) || []);
        } catch (e) { toast('err', e.message); return; }
      }
      entries = entries || [];
      if (!item.public_archive_url && !entries.length) {
        toast('err', t('noReadyParts'));
        return;
      }
      const numByName = {};
      entries.forEach(e => { numByName[e.name] = e.part; });
      const r = await window.sv.saveZip({
        archiveUrl: item.public_archive_url || null,
        entries: entries.map(e => ({ name: e.name, url: e.url })),
        suggestName: safeFileName(nameOf(item)) + '.zip'
      });
      reportSave(r, numByName);
    } finally { setBusy(b => (b === key ? '' : b)); }
  }, [reportSave, toast, t, nameOf]);

  const curEntries = useMemo(
    () => parts.filter(p => p.status === 'done' && p.dl).map(p => ({ part: p.index, name: p.filename, url: p.dl })),
    [parts]
  );

  /* ---------------------------------------------------------- действия */

  const dropSound = useCallback((id) => {
    const k = sound.state().key;
    if (k && String(k).indexOf(id) >= 0) sound.stop();
  }, []);

  const askStop = useCallback((item) => {
    confirm({
      title: t('stopTitle'),
      sub: t('stopSub'),
      act: t('stopBtn'),
      onYes: async () => {
        closeConfirm();
        try {
          await api.cancelTask(item.task_id);
          await refreshTasks();
          refreshStatuses(item.task_id);
          toast('info', t('stoppedToast'));
        } catch (e) { toast('err', e.message); }
      }
    });
  }, [confirm, closeConfirm, refreshTasks, refreshStatuses, toast, t]);

  const askDelete = useCallback((item) => {
    confirm({
      title: t('delTitle'),
      sub: t('delSub', { name: nameOf(item) }),
      act: t('deleteBtn'),
      onYes: async () => {
        closeConfirm();
        try {
          await api.deleteTask(item.task_id);
          dropSound(item.task_id);
          if (curTask === item.task_id) setCurTask(null);
          await refreshTasks();
          toast('info', t('deletedToast'));
        } catch (e) { toast('err', e.message); }
      }
    });
  }, [confirm, closeConfirm, refreshTasks, toast, t, nameOf, curTask, setCurTask, dropSound]);

  const finished = (tasks || []).filter(x => !isActiveStatus(normStatus(x.status)) && x.can_delete !== false);

  const askClear = useCallback(() => {
    confirm({
      title: t('clearTitle'),
      sub: t('clearSub'),
      act: t('clearAct'),
      onYes: async () => {
        closeConfirm();
        let firstErr = null;
        for (const item of finished) {
          try {
            await api.deleteTask(item.task_id);
            dropSound(item.task_id);
            if (curTask === item.task_id) setCurTask(null);
          } catch (e) { if (!firstErr) firstErr = e.message; }
        }
        await refreshTasks();
        if (firstErr) toast('err', firstErr);
        else toast('info', t('clearedToast'));
      }
    });
  }, [confirm, closeConfirm, finished, refreshTasks, toast, t, curTask, setCurTask, dropSound]);

  const retryPart = useCallback(async (index) => {
    if (!curTask) return;
    const key = 'retry:' + index;
    setBusy(key);
    try {
      await api.regenerateChunk(curTask, index);
      toast('info', t('partRestarted', { n: index }));
      await refreshStatuses(curTask);
      refreshTasks();
    } catch (e) {
      toast('err', e.message);
    } finally { setBusy(b => (b === key ? '' : b)); }
  }, [curTask, toast, t, refreshStatuses, refreshTasks]);

  const openTask = useCallback((id) => {
    setCurTask(id);
    setRightTab('result');
  }, [setCurTask, setRightTab]);

  /* -------------------------------------------------------- показатели */

  const pct = useMemo(() => {
    if (total) {
      const sum = parts.reduce((a, p) => a + (p.status === 'done' ? 100 : (p.status === 'running' ? p.pct : 0)), 0);
      return Math.max(0, Math.min(100, Math.round(sum / total)));
    }
    return Math.max(0, Math.min(100, Math.round(Number((task && task.progress) || 0))));
  }, [parts, total, task]);

  const eta = useMemo(() => {
    if (!task) return '';
    if (!doneCount) return t('etaWait');
    const left = Math.max(0, total - doneCount);
    if (!left) return fmt.fmtEta(0);
    const startedMs = Date.parse(task.started_at || task.created_at || '');
    if (!Number.isFinite(startedMs)) return t('etaWait');
    const spent = Math.max(0, (Date.now() - startedMs) / 1000);
    return fmt.fmtEta(spent / doneCount * left);
  }, [task, doneCount, total, t]);

  const voiceName = useMemo(() => {
    if (!voice || !task) return '';
    const vid = String(voice.voice_id || voice.id || '');
    if (!vid || !task.voice_id || vid !== String(task.voice_id)) return '';
    return voice.name || '';
  }, [voice, task]);

  const stepText = useMemo(() => {
    if (!task) return '';
    const cur = parts.find(p => p.status === 'running');
    if (cur) {
      return voiceName
        ? t('stepPartVoice', { n: cur.index, total, voice: voiceName })
        : t('stepPart', { n: cur.index, total });
    }
    // status_message приходит от сервиса: показываем как есть.
    return task.status_message || t('queueing');
  }, [task, parts, total, voiceName, t]);

  /* --------------------------------------------------- общий проигрыватель */

  const taskActive = !!taskKey && snd.key === taskKey;
  const knownDur = useMemo(
    () => readySegs.reduce((a, s) => a + sound.durationOf(s.url), 0),
    [readySegs, snd]
  );
  const availSec = taskActive ? snd.total : knownDur;
  // Пока задача идёт, полная длительность неизвестна: оцениваем по готовым частям.
  const scaleSec = (taskLive && availSec && readyCount && total)
    ? availSec * total / readyCount
    : availSec;
  const posSec = taskActive ? snd.position : 0;

  const seekTask = useCallback((e) => {
    if (!taskActive || !availSec) return;
    const r = e.currentTarget.getBoundingClientRect();
    if (!r.width) return;
    const x = (e.clientX - r.left) / r.width;
    const scale = availSec ? (scaleSec / availSec) : 1;
    sound.seekFraction(Math.max(0, Math.min(1, x * scale)));
  }, [taskActive, availSec, scaleSec]);

  const toggleTask = useCallback(() => {
    if (!taskKey || !readySegs.length) return;
    sound.toggle(taskKey, readySegs, { live: taskLive });
  }, [taskKey, readySegs, taskLive]);

  /* ------------------------------------------------------------ разметка */

  const hasSingle = !!(task && (task.public_download_url || task.download_url));
  const hasZip = !!(task && (task.public_archive_url || curEntries.length));
  const showDl = !!task && !taskLive && (hasSingle || hasZip);

  const canClear = finished.length > 0;
  const list = tasks || [];

  return (
    <div className="right" style={{ position: 'relative' }}>

      <div className="rp-tabs">
        <button className={'tab-btn' + (rightTab === 'result' ? ' active' : '')}
          onClick={() => setRightTab('result')}>{t('tabResult')}</button>
        <button className={'tab-btn' + (rightTab === 'history' ? ' active' : '')}
          onClick={() => setRightTab('history')}>{t('tabHistory', { n: list.length })}</button>
        {rightTab === 'result' && taskLive && (
          <button className="btn-stop" onClick={() => askStop(task)}>{t('stopBtn')}</button>
        )}
      </div>
      <div className="rp-sep" />

      {rightTab === 'history' && (
        <div className="rp-body">
          {canClear && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
              <button className="hist-clear" onClick={askClear}>{t('clearFinished')}</button>
            </div>
          )}

          {!list.length && (
            <div className="empty-note">
              {t('histEmpty1')}<br />{t('histEmpty2')}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {list.map(item => {
              const st = normStatus(item.status);
              const live = isActiveStatus(st);
              const single = !!(item.public_download_url || item.download_url);
              const zip = single || !!item.public_archive_url;
              return (
                <div key={item.task_id} className={'hist-row' + (item.task_id === curTask ? ' active' : '')}>
                  <button className="open" onClick={() => openTask(item.task_id)}>
                    <span className="title">{nameOf(item)}</span>
                    <span className="meta">
                      <span className="st-dot" style={{
                        background: ST_COLOR[st],
                        animation: st === 'running' ? 'pulse 1.2s infinite' : 'none'
                      }} />
                      {t(ST_KEY[st])} · {fmt.fmtDateShort(item.created_at)}
                    </span>
                  </button>
                  <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                    {single && (
                      <button className="row-btn" title={t('dlOneTitle')}
                        disabled={busy === ('one:' + item.task_id)}
                        onClick={() => saveSingle(item)}>
                        <Icon name="download" size={13} />
                      </button>
                    )}
                    {zip && (
                      <button className="row-btn" title={t('dlZip')}
                        disabled={busy === ('zip:' + item.task_id)}
                        onClick={() => saveArchive(item, (item.task_id === curTask && curEntries.length) ? curEntries : null)}>
                        <Icon name="archive" size={13} />
                      </button>
                    )}
                    {live && (
                      <button className="row-btn danger" title={t('stopBtn')} onClick={() => askStop(item)}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                          <rect x="6" y="6" width="12" height="12" rx="2" />
                        </svg>
                      </button>
                    )}
                    {item.can_delete !== false && (
                      <button className="row-btn danger" title={t('deleteBtn')} onClick={() => askDelete(item)}>
                        <Icon name="trash" size={13} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {rightTab === 'result' && (
        <div className="rp-body">
          {!task && (
            <div style={{
              height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 12, textAlign: 'center', color: 'var(--ink3)', padding: 30
            }}>
              <Icon name="wave" size={42} sw={1.4} style={{ color: 'var(--line2)' }} />
              <div style={{ fontSize: 13.5, lineHeight: 1.6 }}>
                {t('resEmpty1')}<br />{t('resEmpty2')}
              </div>
            </div>
          )}

          {task && (
            <>
              <div className="task-title">{nameOf(task)}</div>
              <div className="task-date">{t('created', { date: fmt.fmtDate(task.created_at) })}</div>

              <div className="src-box">
                <button onClick={() => setSrcOpen(v => !v)}>
                  <Icon name="chevron" size={12} sw={2.2}
                    style={{ transform: srcOpen ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }} />
                  {t('sourceText')}
                </button>
                {srcOpen && (
                  <div className="src-text">
                    {(chunksMap[task.task_id] && chunksMap[task.task_id].text) || task.text || task.text_preview || ''}
                  </div>
                )}
              </div>

              <div className="ov-card">
                <div className="section-cap" style={{ marginBottom: 13 }}>{t('overall')}</div>

                {taskLive && (
                  <>
                    <div className="ov-head">
                      <span className="ov-pct">{pct}%</span>
                      <span style={{ fontSize: 12.5, color: 'var(--ink2)' }}>
                        {t('doneOf', { done: doneCount, total: total || '?' })}
                      </span>
                      <span style={{ fontSize: 12.5, color: 'var(--ink3)', marginLeft: 'auto' }}>{eta}</span>
                    </div>
                    <div className="bar" style={{ marginTop: 11 }}><i style={{ width: pct + '%' }} /></div>
                    <div className="ov-step"><span className="live-dot" />{stepText}</div>
                    {anyErr && (
                      <div style={{ fontSize: 12, color: 'var(--err)', marginTop: 9, lineHeight: 1.5 }}>
                        {t('partErrHint')}
                      </div>
                    )}
                  </>
                )}

                {taskStatus === 'cancelled' && (
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--warn)' }}>
                    {t('cancelledDone', { done: doneCount, total: total || '?', w: wordGen(total || 0) })}
                  </div>
                )}

                {taskStatus === 'error' && (
                  <div style={{ display: 'flex', gap: 10, fontSize: 13, color: 'var(--err)', lineHeight: 1.55 }}>
                    <Icon name="info" size={15} style={{ marginTop: 2 }} />
                    <span>{task.error_message || t('noErrReason')}</span>
                  </div>
                )}

                {taskStatus === 'done' && !readyCount && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, fontWeight: 700, color: 'var(--ok)' }}>
                    <Icon name="check" size={16} sw={2.2} />
                    {t('readyDownload')}
                  </div>
                )}

                {readyCount > 0 && (
                  <>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 11,
                      marginTop: (taskLive || taskStatus === 'cancelled' || taskStatus === 'error') ? 14 : 0
                    }}>
                      <button className="play-btn" onClick={toggleTask}>
                        <PlayIcon playing={taskActive && snd.playing} size={17} />
                      </button>
                      <div className="track" style={{ height: 8, borderRadius: 6 }} onClick={seekTask}>
                        {taskLive && (
                          <span className="avail" style={{ width: (scaleSec ? (availSec / scaleSec * 100) : 0) + '%' }} />
                        )}
                        <span className="played" style={{ width: (scaleSec ? (posSec / scaleSec * 100) : 0) + '%' }} />
                      </div>
                      <span className="time" style={{ fontSize: 12 }}>
                        {fmt.fmtTime(posSec)} / {fmt.fmtTime(scaleSec)}
                      </span>
                    </div>

                    {taskLive && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 6, fontSize: 11.5, color: 'var(--warn)' }}>
                        <span className="live-dot" style={{ background: 'var(--warn)', width: 6, height: 6 }} />
                        {t('liveNote', { n: readyCount, w: wordNom(readyCount), total: total || '?' })}
                      </div>
                    )}
                  </>
                )}

                {showDl && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                    {hasSingle && (
                      <button className="dl-btn" disabled={busy === ('one:' + task.task_id)}
                        onClick={() => saveSingle(task)}>
                        <Icon name="download" size={13} />
                        {t('dlOne')}
                      </button>
                    )}
                    {hasZip && (
                      <button className="dl-btn ghost" disabled={busy === ('zip:' + task.task_id)}
                        onClick={() => saveArchive(task, curEntries)}>
                        {t('dlZip')}
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="section-cap" style={{ margin: '18px 0 10px' }}>{t('partsCap', { n: total })}</div>

              {!total && (
                <div className="ov-step" style={{ marginTop: 0 }}>
                  <Spinner size="sm" />
                  {t('loadingParts')}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {parts.map(p => {
                  const pKey = 'part:' + task.task_id + ':' + p.index;
                  const pActive = snd.key === pKey;
                  const pDur = pActive ? snd.total : (p.audio ? sound.durationOf(p.audio) : 0);
                  const pPos = pActive ? snd.position : 0;
                  const stColor = ST_COLOR[p.status];
                  let stText = t('stQueued');
                  if (p.status === 'running') stText = p.pct + '%';
                  else if (p.status === 'done') stText = pDur ? fmt.fmtTime(pDur) : t('stDone');
                  else if (p.status === 'error') stText = t('stError');
                  else if (p.status === 'cancelled') stText = t('partCancelled');
                  const canRetry = p.status === 'error' || p.status === 'cancelled';

                  return (
                    <div key={p.index} className={'part-row' + (p.status === 'error' ? ' err' : '')}>
                      <div className={'part-num' + (p.status === 'done' ? ' done' : '')}>{p.index}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                          <span style={{ fontSize: 13, fontWeight: 700 }}>{t('partN', { n: p.index })}</span>
                          <span className="part-st" style={{ color: stColor }}>{stText}</span>
                        </div>

                        {p.text && (
                          <div className="one-line" style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 4 }}>
                            {p.text}
                          </div>
                        )}

                        {p.status === 'running' && (
                          <div className="bar" style={{ height: 6, borderRadius: 4, marginTop: 8 }}>
                            <i style={{ width: p.pct + '%' }} />
                          </div>
                        )}

                        {p.status === 'done' && p.audio && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 9 }}>
                            <button className="play-btn sm"
                              onClick={() => sound.toggle(pKey, [{ url: p.audio, name: p.filename }])}>
                              <PlayIcon playing={pActive && snd.playing} size={12} />
                            </button>
                            <div className="track" onClick={(e) => {
                              if (!pActive || !pDur) return;
                              const r = e.currentTarget.getBoundingClientRect();
                              if (!r.width) return;
                              sound.seekFraction(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)));
                            }}>
                              <span className="played" style={{ width: (pDur ? (pPos / pDur * 100) : 0) + '%' }} />
                            </div>
                            <span className="time">{fmt.fmtTime(pPos)} / {fmt.fmtTime(pDur)}</span>
                          </div>
                        )}

                        {/* Текст ошибки от сервиса: показываем без перевода. */}
                        {p.status === 'error' && p.message && (
                          <div style={{ fontSize: 12, color: 'var(--err)', lineHeight: 1.5, marginTop: 6 }}>
                            {p.message}
                          </div>
                        )}
                      </div>

                      {canRetry && (
                        <button className="btn-retry" disabled={busy === ('retry:' + p.index)}
                          onClick={() => retryPart(p.index)}>
                          {busy === ('retry:' + p.index) ? t('retrying') : t('retry')}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {connLost && rightTab === 'result' && task && (
        <div className="conn-lost">
          <span className="sp" />
          {t('connLostNote')}
        </div>
      )}
    </div>
  );
}
