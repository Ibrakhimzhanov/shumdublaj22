import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useApp } from '../App.jsx';
import { api } from '../lib/api.js';
import * as sound from '../lib/audio.js';
import { makeT } from '../lib/i18n.js';
import STR from './Describe.i18n.js';
import { Icon, PlayIcon, Spinner } from '../ui.jsx';

/* Голос по описанию: словами описываем характер, сервис возвращает три
   варианта, человек слушает и сохраняет один.

   Варианты привязаны к тому описанию, по которому созданы: правка названия
   или описания их сбрасывает. Примеры тянем по требованию, по одному, и
   держим в кэше, чтобы не просить сервис дважды. */

const POLL_MS = 2000;
const MAX_POLL_FAILS = 5;

const DONE = ['done', 'completed', 'succeeded'];
const FAILED = ['failed', 'error'];

const NAME_MIN = 3;
const NAME_MAX = 40;
const TEXT_MIN = 20;
const TEXT_MAX = 500;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function jobOf(res) {
  if (!res || typeof res !== 'object') return null;
  if (res.job && typeof res.job === 'object') return res.job;
  return res;
}

function jobIdOf(res) {
  const j = jobOf(res);
  if (!j) return null;
  const id = j.id || j.job_id || j.task_id;
  return id ? String(id) : null;
}

function jobNote(j, t) {
  if (!j) return '';
  const q = Number(j.queue_position || 0);
  if (q > 0) return t('queuePos', { n: q });
  return String(j.message || j.stage || '');
}

function isLimit(text, status) {
  if (status === 409) return true;
  return /лимит/i.test(String(text || ''));
}

async function waitJob(id, alive, onNote, t) {
  let fails = 0;
  for (;;) {
    await sleep(POLL_MS);
    if (!alive()) return { ok: false, aborted: true };

    let res;
    try {
      res = await api.voiceJob(id);
    } catch (e) {
      fails += 1;
      if (fails >= MAX_POLL_FAILS) return { ok: false, error: e.message, status: e.status };
      continue;
    }
    if (!alive()) return { ok: false, aborted: true };
    fails = 0;

    const j = jobOf(res);
    const st = String((j && j.status) || '').toLowerCase();

    if (DONE.indexOf(st) >= 0) return { ok: true, job: j };
    if (FAILED.indexOf(st) >= 0) {
      return { ok: false, job: j, error: j.error || j.message || t('failGeneric') };
    }
    if (st === 'cancelled' || st === 'canceled') {
      return { ok: false, cancelled: true, job: j, error: j.error || j.message || t('cancelledGeneric') };
    }
    if (onNote) onNote(jobNote(j, t));
  }
}

/* ------------------------------------------------- разбор ответа сервиса */

/* Точная форма ответа пока не зафиксирована: ищем список вариантов там,
   где он может лежать. Сырой результат всегда пишем в консоль. */
const LIST_KEYS = ['options', 'variants', 'previews', 'voices', 'items', 'results', 'samples'];

function pickList(node, depth) {
  if (!node || depth > 3) return null;
  if (Array.isArray(node)) return node.length ? node : null;
  if (typeof node !== 'object') return null;
  for (const k of LIST_KEYS) {
    if (Array.isArray(node[k]) && node[k].length) return node[k];
  }
  for (const k of ['result', 'data', 'payload', 'response']) {
    const inner = pickList(node[k], depth + 1);
    if (inner) return inner;
  }
  return null;
}

function firstText(obj, keys) {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string' && v) return v;
    if (typeof v === 'number') return String(v);
  }
  return '';
}

function directUrl(item) {
  const u = firstText(item, ['preview_url', 'previewUrl', 'audio_url', 'audioUrl', 'url', 'sample_url']);
  if (u) return u;
  const a = item.audio;
  if (typeof a === 'string' && /^(https?:|data:|blob:)/i.test(a)) return a;
  return '';
}

function commonRequestId(result) {
  if (!result || typeof result !== 'object' || Array.isArray(result)) return null;
  const v = firstText(result, ['request_id', 'requestId', 'generation_request_id']);
  if (v) return v;
  for (const k of ['result', 'data', 'payload']) {
    const inner = commonRequestId(result[k]);
    if (inner) return inner;
  }
  return null;
}

function normalize(result) {
  const list = pickList(result, 0);
  if (!list) return null;
  const shared = commonRequestId(result);

  const out = [];
  for (let i = 0; i < list.length; i++) {
    const raw = list[i];
    const item = (raw && typeof raw === 'object') ? raw : {};
    const id = firstText(item, ['option_id', 'optionId', 'id', 'generated_voice_id', 'generatedVoiceId', 'voice_id']);
    out.push({
      id: id || ('option-' + (i + 1)),
      num: i + 1,
      requestId: firstText(item, ['request_id', 'requestId']) || shared || null,
      text: firstText(item, ['text', 'description', 'summary', 'label']),
      previewUrl: directUrl(item),
      duration: Number(item.duration || item.duration_secs || item.duration_seconds || 0) || 0
    });
  }
  return out.length ? out : null;
}

function blobUrlFrom(b64, mime) {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return URL.createObjectURL(new Blob([arr], { type: mime || 'audio/mpeg' }));
}

function durLabel(sec, t) {
  const s = Math.round(Number(sec) || 0);
  if (!s) return '';
  return t('sec', { n: s });
}

/* ------------------------------------------------------------- экран */

export default function Describe() {
  const { subscribed, goto, setLib, toast, openBot, lang } = useApp();
  const t = useMemo(() => makeT(STR, lang), [lang]);

  const [name, setName] = useState('');
  const [text, setText] = useState('');

  const [busy, setBusy] = useState(false);        // идёт создание вариантов
  const [saving, setSaving] = useState(false);    // идёт сохранение выбранного
  const [note, setNote] = useState('');

  const [variants, setVariants] = useState(null);
  const [sel, setSel] = useState(null);
  const [jobId, setJobId] = useState(null);
  const [reqId, setReqId] = useState(null);

  const [previews, setPreviews] = useState({});   // option_id -> url примера
  const [loadingId, setLoadingId] = useState(null);

  const [err, setErr] = useState(null);
  const [limit, setLimit] = useState(null);       // строка сервиса либо '' для своего текста

  /* Кнопки прослушивания перерисовываем по состоянию общего плеера. */
  const [, bump] = useReducer((x) => x + 1, 0);
  useEffect(() => sound.subscribe(bump), []);

  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => { aliveRef.current = false; };
  }, []);
  const alive = useCallback(() => aliveRef.current, []);

  /* Сделанные нами blob-ссылки освобождаем сами. */
  const madeRef = useRef([]);
  useEffect(() => () => {
    for (const u of madeRef.current) URL.revokeObjectURL(u);
    madeRef.current = [];
  }, []);

  const dropPreviews = useCallback(() => {
    const st = sound.state();
    if (st.key && String(st.key).indexOf('dvar:') === 0) sound.stop();
    for (const u of madeRef.current) URL.revokeObjectURL(u);
    madeRef.current = [];
    setPreviews({});
    setLoadingId(null);
  }, []);

  const dropVariants = useCallback(() => {
    setVariants(null);
    setSel(null);
    setReqId(null);
    dropPreviews();
  }, [dropPreviews]);

  /* Правка описания обесценивает уже полученные варианты. */
  const editName = useCallback((v) => {
    setName(v.slice(0, NAME_MAX));
    if (variants) dropVariants();
  }, [variants, dropVariants]);

  const editText = useCallback((v) => {
    setText(v.slice(0, TEXT_MAX));
    if (variants) dropVariants();
  }, [variants, dropVariants]);

  /* -------------------------------------------------------- ошибки */

  const showFail = useCallback((raw, status, toastMsg) => {
    const msg = String(raw || t('errServiceGeneric'));
    if (isLimit(msg, status)) {
      setErr(null);
      setLimit(msg);
      toast('warn', t('toastLimit'));
    } else {
      setLimit(null);
      setErr(msg);
      toast('err', toastMsg);
    }
  }, [toast, t]);

  /* --------------------------------------------------- создание вариантов */

  const valid = name.trim().length >= NAME_MIN && text.trim().length >= TEXT_MIN;

  const generate = useCallback(async () => {
    if (!valid || busy || saving) return;
    const vName = name.trim();
    const vText = text.trim();

    dropVariants();
    setBusy(true);
    setErr(null);
    setLimit(null);
    setNote('');

    let id = null;
    try {
      const r = await api.promptOptions(vName, vText);
      id = jobIdOf(r);
    } catch (e) {
      if (!alive()) return;
      setBusy(false);
      showFail(e.message, e.status, t('toastVariantsFail'));
      return;
    }
    if (!alive()) return;

    if (!id) {
      setBusy(false);
      setErr(t('errNoJobOptions'));
      toast('err', t('toastVariantsFail'));
      return;
    }
    setJobId(id);

    const out = await waitJob(id, alive, setNote, t);
    if (!alive() || out.aborted) return;

    setBusy(false);
    setNote('');

    if (!out.ok) {
      if (out.cancelled) {
        setLimit(null);
        setErr(String(out.error));
        toast('warn', t('toastVariantsCancelled'));
      } else {
        showFail(out.error, out.status, t('toastVariantsFail'));
      }
      return;
    }

    const result = out.job && out.job.result;
    console.log('[prompt-options] job.result', result);

    const list = normalize(result);
    if (!list) {
      setErr(t('errBadFormat'));
      toast('err', t('toastVariantsFail'));
      return;
    }

    setReqId(commonRequestId(result));
    setVariants(list);
  }, [valid, busy, saving, name, text, dropVariants, alive, showFail, toast, t]);

  /* ------------------------------------------------------- прослушивание */

  const play = useCallback(async (v) => {
    const key = 'dvar:' + v.id;

    const cached = previews[v.id] || v.previewUrl;
    if (cached) { sound.toggle(key, [{ url: cached }]); return; }
    if (loadingId) return;

    setLoadingId(v.id);
    const r = await api.promptPreview({
      options_job_id: jobId,
      request_id: v.requestId || reqId,
      option_id: v.id
    });
    if (!alive()) return;
    setLoadingId(null);

    if (!r || !r.ok || !r.bytes) {
      setErr(String((r && r.error) || t('errNoPreview')));
      toast('err', t('toastPreviewFail'));
      return;
    }

    let url;
    try {
      url = blobUrlFrom(r.bytes, r.mime);
    } catch {
      setErr(t('errPreviewRead'));
      toast('err', t('toastPreviewFail'));
      return;
    }
    madeRef.current.push(url);
    setPreviews((p) => ({ ...p, [v.id]: url }));
    sound.toggle(key, [{ url }]);
  }, [previews, loadingId, jobId, reqId, alive, toast, t]);

  /* ---------------------------------------------------------- сохранение */

  const save = useCallback(async () => {
    if (!variants || !sel || saving) return;
    const v = variants.find((x) => x.id === sel);
    if (!v) return;

    const vName = name.trim();
    const vText = text.trim();

    setSaving(true);
    setErr(null);
    setLimit(null);
    setNote('');

    let id = null;
    try {
      const r = await api.promptSave({
        options_job_id: jobId,
        request_id: v.requestId || reqId,
        option_id: v.id,
        name: vName,
        prompt: vText
      });
      id = jobIdOf(r);
    } catch (e) {
      if (!alive()) return;
      setSaving(false);
      showFail(e.message, e.status, t('toastSaveFail'));
      return;
    }
    if (!alive()) return;

    if (!id) {
      setSaving(false);
      setErr(t('errNoJobSave'));
      toast('err', t('toastSaveFail'));
      return;
    }

    const out = await waitJob(id, alive, setNote, t);
    if (!alive() || out.aborted) return;

    setSaving(false);
    setNote('');

    if (!out.ok) {
      if (out.cancelled) {
        setLimit(null);
        setErr(String(out.error));
        toast('warn', t('toastSaveCancelled'));
      } else {
        showFail(out.error, out.status, t('toastSaveFail'));
      }
      return;
    }

    dropVariants();
    setJobId(null);
    setName('');
    setText('');
    setErr(null);
    setLimit(null);
    toast('ok', t('toastSaved', { name: vName }));
    setLib({ tab: 'described', page: 1, q: '' });
    goto('library');
  }, [variants, sel, saving, name, text, jobId, reqId, alive, showFail, toast, dropVariants, setLib, goto, t]);

  /* ---------------------------------------------------------------- вид */

  if (!subscribed) {
    return (
      <div className="pane-scroll">
        <div className="locked-pane">
          <div className="lock-ico"><Icon name="lock" size={26} sw={2} /></div>
          <div style={{ fontFamily: "'Unbounded', system-ui, sans-serif", fontSize: 19, fontWeight: 700 }}>
            {t('lockedTitle')}
          </div>
          <div style={{ fontSize: 14, color: 'var(--ink2)', maxWidth: 420, lineHeight: 1.6 }}>
            {t('lockedText')}
          </div>
          <button
            className="btn-primary"
            style={{ borderRadius: 13, padding: '13px 26px', marginTop: 6 }}
            onClick={openBot}>
            {t('lockedBtn')}
          </button>
        </div>
      </div>
    );
  }

  const hasVars = !!variants && !busy;
  const idle = !variants && !busy && limit === null && !err;
  const saveOff = !sel && !saving;

  return (
    <div className="pane-scroll">
      <div className="two-col">

        <div style={{ minWidth: 0 }}>
          <div className="h-form">{t('title')}</div>
          <div className="h-sub">{t('subtitle')}</div>

          <label style={{ display: 'block', marginTop: 22 }}>
            <span className="field-label">
              {t('nameLabel')}
              <span className="plain">{t('countMin', { n: name.length, max: NAME_MAX, min: NAME_MIN })}</span>
            </span>
            <input
              className="input"
              value={name}
              maxLength={NAME_MAX}
              disabled={busy || saving}
              placeholder={t('namePlaceholder')}
              onChange={(e) => editName(e.target.value)}
            />
          </label>

          <label style={{ display: 'block', marginTop: 14 }}>
            <span className="field-label">
              {t('textLabel')}
              <span className="plain">{t('countMin', { n: text.length, max: TEXT_MAX, min: TEXT_MIN })}</span>
            </span>
            <textarea
              className="textarea"
              style={{ minHeight: 130, resize: 'none', lineHeight: 1.6 }}
              value={text}
              maxLength={TEXT_MAX}
              disabled={busy || saving}
              placeholder={t('textPlaceholder')}
              onChange={(e) => editText(e.target.value)}
            />
          </label>

          {hasVars && (
            <div style={{ fontSize: 12, color: 'var(--warn)', marginTop: 8, lineHeight: 1.5 }}>
              {t('resetWarn')}
            </div>
          )}

          {!variants && !busy && (
            <button
              className={'big-cta' + (valid ? '' : ' off')}
              style={{ width: 'auto', padding: '13px 26px', borderRadius: 13 }}
              disabled={!valid}
              onClick={generate}>
              {t('btnGenerate')}
            </button>
          )}
        </div>

        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>

          {limit !== null && (
            <div className="limit-box">
              <b>{limit || t('limitFallback')}</b>
              <br />
              {t('limitHint')}
            </div>
          )}

          {err && (
            <div className="err-box">
              <Icon name="alert" size={15} sw={2} style={{ marginTop: 1 }} />
              <span>{err}</span>
            </div>
          )}

          {busy && (
            <div className="busy-box">
              <Spinner size="md" />
              <div style={{ fontSize: 13.5, color: 'var(--ink2)', lineHeight: 1.55 }}>
                {t('busyLine1')}<br />{t('busyLine2')}
              </div>
              {note ? (
                <div style={{ fontSize: 12.5, color: 'var(--goldsoft)' }}>{note}</div>
              ) : null}
            </div>
          )}

          {hasVars && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {variants.map((v) => {
                  const key = 'dvar:' + v.id;
                  const on = sel === v.id;
                  const playing = sound.isPlaying(key);
                  const loading = loadingId === v.id;
                  const sub = v.text
                    || (v.duration
                      ? t('variantSubDur', { n: v.num, d: durLabel(v.duration, t) })
                      : t('variantSub', { n: v.num }));
                  return (
                    <button
                      key={v.id}
                      className={'var-row' + (on ? ' on' : '')}
                      disabled={saving}
                      onClick={() => setSel(v.id)}>
                      <span className={'radio' + (on ? ' on' : '')} />
                      <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                        <span style={{ display: 'block', fontSize: 14, fontWeight: 800 }}>
                          {t('variantTitle', { n: v.num })}
                        </span>
                        <span style={{ display: 'block', fontSize: 12, color: 'var(--ink3)', marginTop: 2, lineHeight: 1.45 }}>
                          {sub}
                        </span>
                      </span>
                      <span
                        className={'var-play' + (playing ? ' on' : '')}
                        onClick={(e) => { e.stopPropagation(); if (!saving) play(v); }}>
                        {loading
                          ? <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} />
                          : <PlayIcon playing={playing} size={11} />}
                        {loading ? t('previewLoading') : (playing ? t('previewPause') : t('previewPlay'))}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 4 }}>
                <button
                  className="btn-outline"
                  style={{ color: 'var(--gold)', padding: '11px 17px', fontSize: 13 }}
                  disabled={saving}
                  onClick={generate}>
                  {t('btnRegen')}
                </button>
                <button
                  className="btn-primary"
                  style={{
                    marginLeft: 'auto', borderRadius: 11, padding: '11px 20px', fontSize: 13,
                    background: saveOff ? 'var(--bg4)' : 'var(--grad)',
                    color: saveOff ? 'var(--ink3)' : '#1a1206'
                  }}
                  disabled={!sel || saving}
                  onClick={save}>
                  {saving && <Spinner size="sm" gold />}
                  {saving ? t('btnSaving') : t('btnSave')}
                </button>
              </div>

              {saving && note ? (
                <div style={{ fontSize: 12.5, color: 'var(--ink2)', lineHeight: 1.55 }}>
                  {note}
                </div>
              ) : null}
            </>
          )}

          {idle && (
            <div className="idle-box">
              <Icon name="sparkle" size={34} sw={1.5} style={{ color: 'var(--line2)' }} />
              <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                {t('idleLine1')}<br />{t('idleLine2')}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
