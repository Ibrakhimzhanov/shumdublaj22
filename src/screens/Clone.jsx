import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../App.jsx';
import { api } from '../lib/api.js';
import { makeT } from '../lib/i18n.js';
import STR from './Clone.i18n.js';
import { Icon, Spinner } from '../ui.jsx';

/* Клонирование голоса по образцу записи.

   Работа идёт задачей: сначала отправляем файл, потом ждём, пока сервис
   разберётся с образцом. Опрос раз в две секунды, форму на это время
   блокируем, а всё, что сказал сервис, показываем человеку как есть. */

const MAX_BYTES = 10 * 1024 * 1024;
const POLL_MS = 2000;
const MAX_POLL_FAILS = 5;

const DONE = ['done', 'completed', 'succeeded'];
const FAILED = ['failed', 'error'];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* Ответ приходит то самой задачей, то обёрткой { job: {...} }. */
function jobOf(res) {
  if (!res || typeof res !== 'object') return null;
  if (res.job && typeof res.job === 'object') return res.job;
  return res;
}

function jobId(res) {
  const j = jobOf(res);
  if (!j) return null;
  const id = j.id || j.job_id || j.task_id;
  return id ? String(id) : null;
}

/* Что показать под кнопкой, пока задача в работе. */
function jobNote(j, t) {
  if (!j) return '';
  const q = Number(j.queue_position || 0);
  if (q > 0) return t('queuePos', { n: q });
  return String(j.message || j.stage || '');
}

/* Предел тарифа выглядит как ошибка, но ею не является. */
function isLimit(text, status) {
  if (status === 409) return true;
  return /лимит/i.test(String(text || ''));
}

function sizeLabel(bytes, t) {
  const mb = Number(bytes || 0) / 1048576;
  if (!mb) return '';
  return mb.toFixed(1).replace('.', ',') + ' ' + t('mb');
}

/* Ждём задачу до конца. alive() позволяет бросить опрос при уходе с экрана. */
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

export default function Clone() {
  const { subscribed, goto, setLib, toast, openBot, lang } = useApp();
  const t = useMemo(() => makeT(STR, lang), [lang]);

  const [name, setName] = useState('');
  const [file, setFile] = useState(null);      // { name, path, size }
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [err, setErr] = useState(null);
  const [limit, setLimit] = useState(null);

  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => { aliveRef.current = false; };
  }, []);
  const alive = useCallback(() => aliveRef.current, []);

  /* ----------------------------------------------------------- файл */

  const takeFile = useCallback((f) => {
    if (!f) return;
    const p = (window.sv && window.sv.pathFor) ? window.sv.pathFor(f) : null;
    if (!p) {
      setLimit(null);
      setErr(t('errNoPath'));
      return;
    }
    if (Number(f.size || 0) > MAX_BYTES) {
      setLimit(null);
      setErr(t('errTooBig'));
      return;
    }
    setErr(null);
    setLimit(null);
    setFile({ name: f.name, path: p, size: Number(f.size || 0) });
  }, [t]);

  const onPick = useCallback((e) => {
    const f = e.target.files && e.target.files[0];
    takeFile(f);
    e.target.value = '';
  }, [takeFile]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setOver(false);
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    takeFile(f);
  }, [takeFile]);

  /* -------------------------------------------------------- создание */

  const disabled = busy || !name.trim() || !file;

  const showFail = useCallback((text, status) => {
    const msg = String(text || t('errServiceGeneric'));
    if (isLimit(msg, status)) {
      setErr(null);
      setLimit(msg);
      toast('warn', t('toastLimit'));
    } else {
      setLimit(null);
      setErr(msg);
      toast('err', t('toastFail'));
    }
  }, [toast, t]);

  const start = useCallback(async () => {
    if (disabled) return;
    const voiceName = name.trim();

    setBusy(true);
    setErr(null);
    setLimit(null);
    setNote('');

    const r = await api.cloneVoiceJob(file.path, file.name, voiceName);
    if (!alive()) return;

    if (!r || !r.ok) {
      setBusy(false);
      showFail(r && r.error, r && r.status);
      return;
    }

    const id = jobId(r.data);
    if (!id) {
      setBusy(false);
      setErr(t('errNoJob'));
      toast('err', t('toastFail'));
      return;
    }

    const out = await waitJob(id, alive, setNote, t);
    if (!alive() || out.aborted) return;

    setBusy(false);
    setNote('');

    if (!out.ok) {
      if (out.cancelled) {
        setLimit(null);
        setErr(String(out.error));
        toast('warn', t('toastCancelled'));
      } else {
        showFail(out.error, out.status);
      }
      return;
    }

    setName('');
    setFile(null);
    setErr(null);
    setLimit(null);
    toast('ok', t('toastCreated', { name: voiceName }));
    setLib({ tab: 'clones', page: 1, q: '' });
    goto('library');
  }, [disabled, name, file, alive, showFail, toast, setLib, goto, t]);

  /* ---------------------------------------------------------- вид */

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

  const paneStyle = { opacity: busy ? .6 : 1, pointerEvents: busy ? 'none' : 'auto', minWidth: 0 };

  return (
    <div className="pane-scroll">
      <div className="two-col">

        <div style={paneStyle}>
          <div className="h-form">{t('title')}</div>
          <div className="h-sub">
            {t('subtitle')}
          </div>

          <label style={{ display: 'block', marginTop: 22 }}>
            <span className="field-label">
              {t('nameLabel')}
              <span className="plain">{t('nameCount', { n: name.length })}</span>
            </span>
            <input
              className="input"
              value={name}
              maxLength={40}
              disabled={busy}
              placeholder={t('namePlaceholder')}
              onChange={(e) => setName(e.target.value.slice(0, 40))}
            />
          </label>

          {limit && (
            <div className="limit-box" style={{ marginTop: 14 }}>
              <b>{limit}</b>
              <br />
              {t('limitHint')}
            </div>
          )}

          {err && (
            <div className="err-box" style={{ marginTop: 14 }}>
              <Icon name="alert" size={15} sw={2} style={{ marginTop: 1 }} />
              <span>{err}</span>
            </div>
          )}

          <button
            className={'big-cta' + (disabled && !busy ? ' off' : '')}
            disabled={disabled}
            onClick={start}>
            {busy && <Spinner size="sm" gold />}
            {busy ? t('btnBusy') : t('btnStart')}
          </button>

          {busy && (
            <div style={{ fontSize: 12.5, color: 'var(--ink2)', marginTop: 11, lineHeight: 1.55 }}>
              {note ? <div style={{ color: 'var(--goldsoft)', marginBottom: 4 }}>{note}</div> : null}
              {t('busyHint')}
            </div>
          )}
        </div>

        <div style={paneStyle}>
          {!file ? (
            <label
              className={'drop-zone' + (over ? ' over' : '')}
              onDragEnter={(e) => { e.preventDefault(); setOver(true); }}
              onDragOver={(e) => { e.preventDefault(); if (!over) setOver(true); }}
              onDragLeave={() => setOver(false)}
              onDrop={onDrop}>
              <Icon name="uploadBox" size={30} sw={1.6} style={{ color: 'var(--gold)' }} />
              <div style={{ fontSize: 14.5, fontWeight: 700, marginTop: 12 }}>
                {over ? t('dropRelease') : t('dropHere')}
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--ink3)', marginTop: 6 }}>
                {t('dropFormats')}
              </div>
              <span className="drop-pick">{t('dropPick')}</span>
              <input
                type="file"
                accept=".mp3,.wav,.m4a,.ogg,.webm"
                style={{ display: 'none' }}
                onChange={onPick}
              />
            </label>
          ) : (
            <div className="file-card" style={{ borderRadius: 14, padding: '15px 17px' }}>
              <div className="audio-ico"><Icon name="music" size={17} sw={1.8} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="one-line" style={{ fontSize: 13.5, fontWeight: 700 }} title={file.name}>
                  {file.name}
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 2 }}>
                  {t('fileSample') + (file.size ? ' · ' + sizeLabel(file.size, t) : '')}
                </div>
              </div>
              <label
                style={{
                  flexShrink: 0, border: '1px solid var(--line)', borderRadius: 9, padding: '7px 12px',
                  fontSize: 12, fontWeight: 700, color: 'var(--ink2)', cursor: 'pointer', whiteSpace: 'nowrap'
                }}>
                {t('fileReplace')}
                <input
                  type="file"
                  accept=".mp3,.wav,.m4a,.ogg,.webm"
                  style={{ display: 'none' }}
                  onChange={onPick}
                />
              </label>
              <button
                className="icon-btn danger"
                title={t('fileRemove')}
                onClick={() => { setFile(null); setErr(null); }}>
                <Icon name="close" size={12} sw={2.2} />
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
