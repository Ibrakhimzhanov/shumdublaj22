import React, { useCallback, useMemo, useState } from 'react';
import { useApp, BOT_URL } from '../App.jsx';
import { api } from '../lib/api.js';
import { makeT } from '../lib/i18n.js';
import STR from './Login.i18n.js';
import { Spinner } from '../ui.jsx';

/* Вход по API-ключу. Ключ выпускается на стороне сервиса, приложение его
   принимает и проверяет запросом профиля. */

export default function Login() {
  const { onLoggedIn, lang } = useApp();
  const t = useMemo(() => makeT(STR, lang), [lang]);

  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const signIn = useCallback(async () => {
    const k = key.trim();
    if (!k) { setErr(t('errEmptyKey')); return; }
    setBusy(true);
    setErr(null);
    await window.sv.keySet(k);
    try {
      const p = await api.me();
      await onLoggedIn(p);
    } catch (e) {
      await window.sv.keyClear();
      setBusy(false);
      setErr(e.message);
    }
  }, [key, onLoggedIn, t]);

  return (
    <div className="login-wrap">
      <div className="login-inner">
        <div className="login-head">
          <div className="login-logo"><img src="./mascot.png" alt="" /></div>
          <div className="login-title">Shum <b className="gold-text">Voice</b></div>
          <div className="login-sub">{t('tagline')}</div>
        </div>

        <div className="login-card">
          <label style={{ display: 'block', marginBottom: 14 }}>
            <span style={{
              display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink3)',
              textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 7
            }}>
              {t('keyLabel')}
            </span>
            <input
              className="input"
              value={key}
              disabled={busy}
              autoFocus
              spellCheck={false}
              placeholder="vg_live_…"
              onChange={(e) => { setKey(e.target.value); setErr(null); }}
              onKeyDown={(e) => { if (e.key === 'Enter' && !busy) signIn(); }}
              style={{ background: 'var(--bg)' }}
            />
          </label>

          {err && <div className="err-box" style={{ marginBottom: 14 }}>{err}</div>}

          <button className="btn-primary" style={{ width: '100%' }} disabled={busy} onClick={signIn}>
            {busy && <Spinner size="sm" gold />}
            {busy ? t('checking') : t('submit')}
          </button>

          <div style={{ fontSize: 12.5, color: 'var(--ink3)', lineHeight: 1.6, marginTop: 16 }}>
            {t('keyHint')}{' '}
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); window.sv.openExternal(BOT_URL); }}>
              {t('openBot')}
            </a>
          </div>
        </div>

        <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--ink3)', marginTop: 16, lineHeight: 1.6 }}>
          {t('privacyNote')}
        </div>
      </div>
    </div>
  );
}
