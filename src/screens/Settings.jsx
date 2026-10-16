import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../App.jsx';
import {
  MODELS, modelById, defaultAllParams, voiceSupports,
  uiValue, apiValue, uiMin, uiMax, uiStep
} from '../lib/models.js';
import { Icon, SliderRow, Segmented, Spinner } from '../ui.jsx';
import { makeT } from '../lib/i18n.js';
import STR from './Settings.i18n.js';

/* Шторка настроек озвучки. Работает с черновиком: пока не нажата
   кнопка «Сохранить», настройки приложения не трогаем.
   Параметры модели рендерим по описанию из lib/models.js, а не хардкодом. */

function makeDraft(settings) {
  const base = defaultAllParams();
  const src = (settings && settings.params) || {};
  const params = {};
  for (const m of MODELS) params[m.id] = { ...base[m.id], ...(src[m.id] || {}) };
  return {
    split: settings.split,
    partSize: settings.partSize,
    pause: settings.pause,
    threads: settings.threads,
    model: settings.model,
    params
  };
}

export default function Settings() {
  const { settings, setSettings, setSettingsOpen, voice, goto, maxThreads, toast, lang } = useApp();

  const t = useMemo(() => makeT(STR, lang), [lang]);

  const [draft, setDraft] = useState(() => makeDraft(settings));
  const [saving, setSaving] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const patch = useCallback((p) => setDraft(d => ({ ...d, ...p })), []);

  const setParam = useCallback((modelId, key, value) => {
    setDraft(d => ({
      ...d,
      params: { ...d.params, [modelId]: { ...(d.params[modelId] || {}), [key]: value } }
    }));
  }, []);

  const close = useCallback(() => { if (!saving) setSettingsOpen(false); }, [saving, setSettingsOpen]);

  const threadsMax = Math.max(1, Number(maxThreads) || 1);
  const threads = Math.max(1, Math.min(threadsMax, Number(draft.threads) || 1));

  const model = modelById(draft.model);
  const mp = draft.params[model.id] || {};
  const voiceOk = voiceSupports(voice, model.engine);

  const voiceName = voice && voice.name ? voice.name : t('voiceNotSelected');
  const voiceLetter = voice && voice.name ? voice.name.trim().charAt(0).toUpperCase() : '?';

  /* Подписи положений именованного параметра тоже переводим: в каталоге
     моделей лежат только значения, язык подставляем здесь. */
  const namedOptions = useMemo(() => (
    model.named
      ? model.named.options.map(o => ({ value: o.value, label: t('named_' + model.named.key + '_' + o.value) }))
      : []
  ), [model, t]);

  const changeVoice = useCallback(() => {
    setSettingsOpen(false);
    goto('library');
  }, [setSettingsOpen, goto]);

  const save = useCallback(() => {
    if (saving) return;
    setSaving(true);
    timerRef.current = setTimeout(() => {
      setSettings(prev => ({ ...prev, ...draft, threads }));
      setSaving(false);
      setSettingsOpen(false);
      toast('ok', t('savedToast'));
    }, 500);
  }, [saving, draft, threads, setSettings, setSettingsOpen, toast, t]);

  const bodyStyle = useMemo(() => ({
    padding: '0 22px',
    opacity: saving ? .55 : 1,
    pointerEvents: saving ? 'none' : 'auto'
  }), [saving]);

  const numOf = (key, def) => {
    const v = Number(mp[key]);
    return Number.isFinite(v) ? v : def;
  };

  return (
    <>
      <div className="scrim blur" style={{ zIndex: 70 }} onClick={close} />

      <div className="drawer settings">
        <div className="drawer-head">
          <span className="t">{t('title')}</span>
          <button className="x-btn" onClick={close} title={t('close')}>
            <Icon name="close" size={13} sw={2.2} />
          </button>
        </div>

        <div style={{ flex: 1, overflow: 'auto' }}>
          <div style={bodyStyle}>

            {/* ------------------------------------------ обработка текста */}

            <div className="section-cap" style={{ margin: '18px 0 12px' }}>{t('sectionText')}</div>

            <div style={{
              display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg)',
              border: '1px solid var(--line)', borderRadius: 13, padding: '12px 14px'
            }}>
              <div style={{
                width: 34, height: 34, borderRadius: '50%', background: 'var(--grad)', color: '#1a1206',
                fontFamily: "'Unbounded', system-ui, sans-serif", fontWeight: 800, fontSize: 13,
                display: 'grid', placeItems: 'center', flexShrink: 0
              }}>{voiceLetter}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="one-line" style={{ fontSize: 13.5, fontWeight: 700 }}>{voiceName}</div>
                <div style={{ fontSize: 11.5, color: 'var(--ink3)' }}>{t('voiceCaption')}</div>
              </div>
              <button onClick={changeVoice} style={{
                border: '1px solid var(--line2)', background: 'none', borderRadius: 10,
                padding: '8px 14px', color: 'var(--gold)', fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap'
              }}>{t('changeVoice')}</button>
            </div>

            <div style={{ marginTop: 15 }}>
              <div className="set-label">{t('splitLabel')}</div>
              <Segmented
                value={draft.split}
                onChange={(v) => patch({ split: v })}
                options={[
                  { value: 'size', label: t('splitBySize') },
                  { value: 'para', label: t('splitByPara') }
                ]}
              />
            </div>

            {draft.split === 'size' && (
              <SliderRow
                label={t('partSize')}
                value={draft.partSize}
                min={300} max={4000} step={100}
                onChange={(v) => patch({ partSize: v })}
              />
            )}

            <SliderRow
              label={t('pause')}
              value={draft.pause}
              min={0} max={2} step={0.1}
              onChange={(v) => patch({ pause: v })}
            />

            <SliderRow
              label={t('threads')}
              value={threads}
              min={1} max={threadsMax} step={1}
              onChange={(v) => patch({ threads: v })}
              hint={t('threadsHint', { n: threadsMax })}
            />

            <div className="model-grid">
              {MODELS.map(m => {
                const ok = voiceSupports(voice, m.engine);
                return (
                  <button key={m.id}
                    className={'model-btn' + (m.id === draft.model ? ' on' : '')}
                    disabled={!ok}
                    title={ok ? '' : t('modelUnsupported')}
                    onClick={() => patch({ model: m.id })}>
                    <span className="n">{t('model_' + m.id + '_name')}</span>
                    <span className="d">{t('model_' + m.id + '_desc')}</span>
                  </button>
                );
              })}
            </div>

            {!voiceOk && (
              <div style={{ marginTop: 10, fontSize: 12, lineHeight: 1.5, color: 'var(--warn)' }}>
                {t('voiceModelWarn', { voice: voiceName, model: t('model_' + model.id + '_name') })}
              </div>
            )}

            {/* ------------------------------------------ параметры модели */}

            <div className="section-cap" style={{ margin: '20px 0 4px' }}>
              {t('modelParams', { model: t('model_' + model.id + '_name') })}
            </div>

            {model.params.map(p => (
              <SliderRow
                key={p.key}
                label={t('param_' + p.key)}
                value={uiValue(p, numOf(p.key, p.def))}
                min={uiMin(p)} max={uiMax(p)} step={uiStep(p)}
                onChange={(v) => setParam(model.id, p.key, apiValue(p, v))}
              />
            ))}

            {model.named && (
              <div style={{ marginTop: 12 }}>
                <div className="set-label">{t('named_' + model.named.key)}</div>
                <Segmented
                  value={numOf(model.named.key, model.named.def)}
                  onChange={(v) => setParam(model.id, model.named.key, v)}
                  options={namedOptions}
                />
              </div>
            )}

            {model.toggle && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 15 }}>
                <span style={{ flex: 1, fontSize: 12.5, color: 'var(--ink2)' }}>{t('toggle_' + model.toggle.key)}</span>
                <button
                  className={'switch' + (mp[model.toggle.key] ? ' on' : '')}
                  onClick={() => setParam(model.id, model.toggle.key, !mp[model.toggle.key])}>
                  <i />
                </button>
                <span style={{ fontSize: 12.5, color: 'var(--ink3)' }}>
                  {mp[model.toggle.key] ? t('toggleOn') : t('toggleOff')}
                </span>
              </div>
            )}

            {!model.params.length && !model.named && !model.toggle && (
              <div className="no-params">{t('model_' + model.id + '_noParams')}</div>
            )}

            <div style={{ height: 16 }} />
          </div>
        </div>

        <div className="drawer-foot">
          <button className="btn-outline" onClick={close} disabled={saving}>{t('cancel')}</button>
          <button className="btn-primary"
            style={{ borderRadius: 11, padding: '11px 22px', fontSize: 13.5 }}
            onClick={save} disabled={saving}>
            {saving && <Spinner size="sm" gold />}
            {saving ? t('saving') : t('save')}
          </button>
        </div>
      </div>
    </>
  );
}
