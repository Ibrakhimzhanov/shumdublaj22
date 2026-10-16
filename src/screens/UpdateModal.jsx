import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../App.jsx';
import { Icon } from '../ui.jsx';
import { fmtMb } from '../lib/format.js';
import { makeT } from '../lib/i18n.js';
import STR from './UpdateModal.i18n.js';

/* Окно обновления приложения. Показываем только когда релиз собран,
   подходит этой платформе и действительно новее установленной версии. */

const DOWNLOAD_URL = 'https://qw1voicegencore.pro/api/v1/client/releases/current/download';
const CHANGELOG_MAX = 400;

/* Версии сравниваем по числам компонентов: строкой '3.10.0' меньше '3.9.0'. */
const parts = (v) => String(v || '').trim().split('.').map(x => parseInt(x, 10) || 0);

function isNewer(a, b) {
  const A = parts(a);
  const B = parts(b);
  const n = Math.max(A.length, B.length);
  for (let i = 0; i < n; i++) {
    const x = A[i] || 0;
    const y = B[i] || 0;
    if (x !== y) return x > y;
  }
  return false;
}

/* Лента релизов на сервере общая для всех клиентов, и там лежит установщик
   другого приложения. Ставить его вместо себя нельзя, поэтому берём только
   те сборки, чьё имя файла принадлежит этому приложению. */
const PRODUCT_KEYS = ['shum voice', 'shumvoice', 'shum-voice'];

function isOwnRelease(r) {
  const name = String(r.setup_filename || r.package_filename || '').toLowerCase();
  if (!name) return false;
  return PRODUCT_KEYS.some(k => name.includes(k));
}

/* Сервер может назвать платформу по-разному: win32, win, windows. */
const PLATFORM = {
  win32: 'win32', win: 'win32', win64: 'win32', windows: 'win32',
  darwin: 'darwin', mac: 'darwin', macos: 'darwin', osx: 'darwin',
  linux: 'linux'
};
const plat = (p) => {
  const low = String(p || '').trim().toLowerCase();
  return PLATFORM[low] || low;
};

export default function UpdateModal() {
  const { release, appInfo, dismissedVersion, dismissVersion, toast, auth, lang } = useApp();

  /* Хук обязан стоять до ранних return, иначе порядок хуков поедет. */
  const t = useMemo(() => makeT(STR, lang), [lang]);

  const [view, setView] = useState('avail');          // avail | dl | ready | err
  const [progress, setProgress] = useState({ got: 0, total: 0 });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [hidden, setHidden] = useState(false);        // «Продолжить работу» после ошибки

  const version = release ? release.version : null;

  useEffect(() => {
    if (!window.sv || !window.sv.onUpdateProgress) return undefined;
    const unsub = window.sv.onUpdateProgress((d) => {
      setProgress({ got: Number((d && d.got) || 0), total: Number((d && d.total) || 0) });
    });
    return () => { if (typeof unsub === 'function') unsub(); };
  }, []);

  /* Пришёл другой релиз: начинаем всё заново. */
  useEffect(() => {
    setView('avail');
    setProgress({ got: 0, total: 0 });
    setError('');
    setBusy(false);
    setHidden(false);
  }, [version]);

  if (hidden) return null;
  if (auth !== 'in' || !release) return null;
  if (release.artifact_status !== 'ready') return null;
  if (!appInfo || !appInfo.version) return null;
  if (!isOwnRelease(release)) return null;
  if (!isNewer(release.version, appInfo.version)) return null;
  if (release.target_platform && plat(release.target_platform) !== plat(appInfo.platform)) return null;
  if (dismissedVersion && release.version === dismissedVersion) return null;

  const later = () => {
    dismissVersion(release.version);
    toast('info', t('laterToast', { v: release.version }));
  };

  const download = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    setProgress({ got: 0, total: Number(release.setup_size_bytes || 0) });
    setView('dl');
    try {
      const r = await window.sv.updateDownload({
        url: DOWNLOAD_URL,
        fileName: release.setup_filename || 'ShumVoice-Setup.exe',
        sizeBytes: release.setup_size_bytes
      });
      if (r && r.ok) {
        setView('ready');
      } else {
        setError((r && r.error) || t('noFile'));
        setView('err');
      }
    } catch (e) {
      setError((e && e.message) || String(e));
      setView('err');
    } finally {
      setBusy(false);
    }
  };

  const install = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await window.sv.updateInstall();
      if (r && r.ok === false) {
        toast('err', r.error || t('installFailed'));
        setBusy(false);
      }
      /* при успехе приложение закрывается само, состояние трогать незачем */
    } catch (e) {
      toast('err', (e && e.message) || String(e));
      setBusy(false);
    }
  };

  const changelog = String(release.changelog || '').trim();
  const shortLog = changelog.length > CHANGELOG_MAX
    ? changelog.slice(0, CHANGELOG_MAX).trimEnd() + '…'
    : changelog;

  const total = Number(progress.total || release.setup_size_bytes || 0);
  const got = Math.min(Number(progress.got || 0), total || Number(progress.got || 0));
  const pct = total > 0 ? Math.max(0, Math.min(100, (got / total) * 100)) : 0;

  return (
    <div className="modal-scrim" style={{ zIndex: 90, background: 'rgba(4, 4, 6, .72)' }}>
      <div className="modal upd">
        <div className="upd-ico"><Icon name="update" size={24} sw={2} /></div>

        {view === 'avail' && (
          <>
            <div className="modal-title" style={{ fontSize: 17 }}>
              {t('availTitle', { v: release.version })}
            </div>
            {shortLog ? (
              <div className="modal-sub" style={{ whiteSpace: 'pre-line', wordBreak: 'break-word' }}>{shortLog}</div>
            ) : null}
            {release.setup_size_bytes ? (
              <div style={{ fontSize: 12.5, color: 'var(--ink3)', marginTop: 9 }}>
                {t('size', { size: fmtMb(release.setup_size_bytes) })}
              </div>
            ) : null}
            <div className="modal-row">
              <button className="btn-outline" onClick={later}>{t('later')}</button>
              <button className="btn-primary" onClick={download}>{t('update')}</button>
            </div>
          </>
        )}

        {view === 'dl' && (
          <>
            <div className="modal-title" style={{ fontSize: 17 }}>{t('dlTitle')}</div>
            <div className="bar" style={{ height: 9, marginTop: 16 }}>
              <i style={{ width: pct + '%' }} />
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink2)', marginTop: 10 }}>
              {total > 0 ? t('dlProgress', { got: fmtMb(got), total: fmtMb(total) }) : fmtMb(got)}
            </div>
          </>
        )}

        {view === 'ready' && (
          <>
            <div className="modal-title" style={{ fontSize: 17 }}>{t('readyTitle')}</div>
            <div className="modal-sub">
              {t('readySub', { v: release.version })}
            </div>
            <div className="modal-row">
              <button className="btn-outline" disabled={busy} onClick={later}>{t('later')}</button>
              <button className="btn-primary" disabled={busy} onClick={install}>{t('restart')}</button>
            </div>
          </>
        )}

        {view === 'err' && (
          <>
            <div className="modal-title" style={{ fontSize: 17, color: 'var(--err)' }}>
              {t('errTitle')}
            </div>
            <div className="modal-sub" style={{ wordBreak: 'break-word' }}>{error}</div>
            <button
              className="btn-soft"
              style={{ width: '100%', marginTop: 20 }}
              onClick={() => setHidden(true)}>
              {t('continueWork')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
