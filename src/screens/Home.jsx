import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useApp } from '../App.jsx';
import { api } from '../lib/api.js';
import { buildTaskPayload, generationFields } from '../lib/task.js';
import { num } from '../lib/format.js';
import { makeT } from '../lib/i18n.js';
import STR from './Home.i18n.js';
import { Icon, Spinner } from '../ui.jsx';

const ACCEPT = '.txt,.md,.srt,.docx,.zip';
const MAX_FILE = 40 * 1024 * 1024;

export default function Home() {
  const {
    profile, subState, freeChars, voice, settings, goto, lang,
    setSettingsOpen, toast, refreshTasks, setCurTask, setRightTab, loadProfile, openBot
  } = useApp();

  const t = useMemo(() => makeT(STR, lang), [lang]);

  const [text, setText] = useState('');
  const [file, setFile] = useState(null);       // { name, path, size }
  const [running, setRunning] = useState(false);
  const fileRef = useRef(null);

  const name = (profile && (profile.first_name || profile.telegram_username)) || t('friend');
  const cost = file ? null : text.length;

  const greetSub = subState === 'active'
    ? t('subActive')
    : (subState === 'demo0'
      ? t('subDemoEmpty')
      : t('subDemo', { left: num(freeChars) }));

  /* Что мешает запуску. Это должно быть видно ДО нажатия. */
  const block = useMemo(() => {
    if (!voice) {
      return {
        t: t('blockNoVoiceTitle'),
        s: t('blockNoVoiceSub'),
        act: t('blockNoVoiceAct'),
        on: () => goto('library')
      };
    }
    if (subState === 'demo0') {
      return {
        t: t('blockNoCharsTitle'),
        s: t('blockNoCharsSub'),
        act: t('blockBuyAct'),
        on: openBot
      };
    }
    if (subState === 'demo' && cost !== null && cost > freeChars) {
      return {
        t: t('blockShortTitle'),
        s: t('blockShortSub', { cost: num(cost), left: num(freeChars) }),
        act: t('blockBuyAct'),
        on: openBot
      };
    }
    return null;
  }, [voice, subState, cost, freeChars, goto, openBot, t]);

  const showBlock = !!block && (text.length > 0 || !!file || !voice);
  const showFilePick = !text && !file;
  const disabled = !!block || running;

  const pickFile = useCallback((e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    if (f.size > MAX_FILE) { toast('err', t('errFileTooBig')); return; }
    const path = window.sv.pathFor(f);
    if (!path) { toast('err', t('errFilePath')); return; }
    setFile({ name: f.name, path, size: f.size });
  }, [toast, t]);

  const run = useCallback(async () => {
    if (disabled || !voice) return;
    setRunning(true);
    try {
      if (file) {
        const r = await window.sv.uploadText({
          filePath: file.path,
          fileName: file.name,
          voiceId: voice.id || voice.voice_id,
          preferences: generationFields(settings)
        });
        if (!r.ok) { toast('err', r.error); return; }
        const many = (r.data && r.data.tasks) || null;
        const one = (r.data && r.data.task) || null;
        if (many && many.length > 1) {
          toast('info', t('okArchive', { n: many.length }));
        } else {
          toast('ok', t('okStarted'));
        }
        const first = (many && many[0]) || one;
        if (first) { setCurTask(first.task_id || first.id); setRightTab('result'); }
      } else {
        const r = await api.createTask(buildTaskPayload({ text, voice, settings }));
        const task = (r && r.task) || null;
        toast('ok', t('okStarted'));
        if (task) { setCurTask(task.task_id || task.id); setRightTab('result'); }
      }
      // Серверная очередь может стоять: будим её, иначе задача так и висит в ожидании.
      api.startQueue().catch(() => {});
      setText('');
      setFile(null);
      await refreshTasks();
      loadProfile(true).catch(() => {});
    } catch (e) {
      toast('err', e.message);
    } finally {
      setRunning(false);
    }
  }, [disabled, voice, file, text, settings, toast, setCurTask, setRightTab, refreshTasks, loadProfile, t]);

  const costLine = (!text && !file)
    ? ''
    : (subState === 'active'
      ? t('costUnlimited')
      : (file
        ? t('costFile', { left: num(freeChars) })
        : t('costText', { cost: num(cost), left: num(freeChars) })));

  return (
    <div className="home-pane">
      <div className="greet">{t('greet', { name })}</div>
      <div className="greet-sub">{greetSub}</div>

      <div className="home-chips">
        <button className={'chip voice' + (voice ? '' : ' none')} onClick={() => goto('library')}>
          <Icon name="mic" size={13} sw={2} />
          {voice ? t('chipVoice', { name: voice.name }) : t('chipNoVoice')}
        </button>
        <button className="chip" onClick={() => setSettingsOpen(true)}>
          <Icon name="gear" size={13} sw={1.8} />
          {t('chipSettings')}
        </button>
      </div>

      {file ? (
        <div className="file-card">
          <div className="file-ico"><Icon name="file" size={19} sw={1.8} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="one-line" style={{ fontSize: 14, fontWeight: 700 }}>{file.name}</div>
            <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 2 }}>
              {t('fileNote')}
            </div>
          </div>
          <button className="icon-btn danger" title={t('fileRemove')} onClick={() => setFile(null)}>
            <Icon name="close" size={12} sw={2.2} />
          </button>
        </div>
      ) : (
        <textarea
          className="text-area"
          value={text}
          placeholder={t('textPlaceholder')}
          onChange={(e) => setText(e.target.value)}
        />
      )}

      {showBlock && (
        <div className="block-note">
          <Icon name="alert" size={16} sw={2} style={{ color: 'var(--warn)', marginTop: 1 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="t">{block.t}</div>
            <div className="s">{block.s}</div>
          </div>
          {block.act && <button onClick={block.on}>{block.act}</button>}
        </div>
      )}

      <div className="run-row">
        <span className="cost-line">{costLine}</span>

        {showFilePick ? (
          <label className="btn-file">
            <Icon name="upload" size={15} sw={2.2} />
            {t('filePick')}
            <input ref={fileRef} type="file" accept={ACCEPT} onChange={pickFile} style={{ display: 'none' }} />
          </label>
        ) : (
          <button className={'btn-run' + (disabled ? ' off' : '')} disabled={disabled} onClick={run}>
            {running
              ? <Spinner size="sm" gold />
              : <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>}
            {running ? t('running') : t('run')}
          </button>
        )}
      </div>

      <div className="formats-note">
        {t('formats')}
      </div>
    </div>
  );
}
