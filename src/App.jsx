import React, { createContext, useContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from './lib/api.js';
import { defaultAllParams } from './lib/models.js';
import { num, setLocale } from './lib/format.js';
import { makeT, DEFAULT_LANG } from './lib/i18n.js';
import STR from './App.i18n.js';
import { Icon, Toasts, Confirm } from './ui.jsx';
import * as sound from './lib/audio.js';

import Login from './screens/Login.jsx';
import Home from './screens/Home.jsx';
import TaskPanel from './screens/TaskPanel.jsx';
import Library from './screens/Library.jsx';
import Clone from './screens/Clone.jsx';
import Describe from './screens/Describe.jsx';
import Settings from './screens/Settings.jsx';
import Profile from './screens/Profile.jsx';
import UpdateModal from './screens/UpdateModal.jsx';

export const BOT_URL = 'https://t.me/asrorai';

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

const DEFAULT_SETTINGS = {
  split: 'size',
  partSize: 1200,
  pause: 0.4,
  threads: 2,
  model: 'shum',
  params: defaultAllParams()
};

const DEFAULT_LIB = {
  tab: 'public', q: '', gender: null, age: null, language: null, sort: 'popular', page: 1
};

let toastSeq = 0;

export default function App() {
  const [ready, setReady] = useState(false);
  const [auth, setAuth] = useState('checking');       // checking | out | in
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileErr, setProfileErr] = useState(null);

  const [theme, setTheme] = useState('dark');
  const [lang, setLangState] = useState(DEFAULT_LANG);
  setLocale(lang);
  const [screen, setScreen] = useState('home');
  const [rightTab, setRightTab] = useState('result');
  const [sideW, setSideW] = useState(490);
  const [dragging, setDragging] = useState(false);

  const [voice, setVoiceState] = useState(null);
  const [settings, setSettingsState] = useState(DEFAULT_SETTINGS);
  const [lib, setLibState] = useState(DEFAULT_LIB);

  const [tasks, setTasks] = useState([]);
  const [curTask, setCurTask] = useState(null);
  const [connLost, setConnLost] = useState(false);

  const [toasts, setToasts] = useState([]);
  const [confirmData, setConfirmData] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const [appInfo, setAppInfo] = useState({ version: '', platform: '' });
  const [release, setRelease] = useState(null);
  const [dismissedVersion, setDismissedVersion] = useState(null);

  const cfgRef = useRef({});
  const timersRef = useRef({});

  /* ------------------------------------------------------------ хранение */

  const persist = useCallback((patch) => {
    cfgRef.current = { ...cfgRef.current, ...patch };
    window.sv.cfgSet(cfgRef.current);
  }, []);

  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  useEffect(() => { document.documentElement.lang = lang; setLocale(lang); }, [lang]);

  const t = useMemo(() => makeT(STR, lang), [lang]);

  /* ------------------------------------------------------- уведомления */

  const dropToast = useCallback((id) => {
    clearTimeout(timersRef.current[id]);
    setToasts(list => list.filter(t => t.id !== id));
  }, []);

  const armToast = useCallback((id, ms) => {
    clearTimeout(timersRef.current[id]);
    timersRef.current[id] = setTimeout(() => dropToast(id), ms);
  }, [dropToast]);

  const toast = useCallback((type, msg) => {
    const id = 'n' + (++toastSeq);
    setToasts(list => [...list, { id, type, msg: String(msg) }]);
    armToast(id, 5200);
    return id;
  }, [armToast]);

  const confirm = useCallback((data) => setConfirmData(data), []);
  const closeConfirm = useCallback(() => setConfirmData(null), []);

  /* --------------------------------------------------------- запуск */

  const loadProfile = useCallback(async (silent) => {
    if (!silent) { setProfileLoading(true); setProfileErr(null); }
    try {
      const p = await api.me();
      setProfile(p);
      setProfileErr(null);
      return p;
    } catch (e) {
      if (!silent) setProfileErr(e.message);
      throw e;
    } finally {
      if (!silent) setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const [cfg, info] = await Promise.all([window.sv.cfgGet(), window.sv.appInfo()]);
      cfgRef.current = cfg || {};
      setAppInfo(info);
      if (cfg.theme) setTheme(cfg.theme);
      if (cfg.lang) setLangState(cfg.lang);
      if (cfg.sideW) setSideW(cfg.sideW);
      if (cfg.voice) setVoiceState(cfg.voice);
      if (cfg.settings) {
        setSettingsState({
          ...DEFAULT_SETTINGS, ...cfg.settings,
          params: { ...defaultAllParams(), ...(cfg.settings.params || {}) }
        });
      }
      if (cfg.lib) setLibState({ ...DEFAULT_LIB, ...cfg.lib, q: '' });
      if (cfg.dismissedVersion) setDismissedVersion(cfg.dismissedVersion);

      const key = await window.sv.keyGet();
      if (!key) { setAuth('out'); setReady(true); return; }
      try {
        const p = await api.me();
        setProfile(p);
        setAuth('in');
      } catch (e) {
        if (e.status === 401) { await window.sv.keyClear(); setAuth('out'); }
        else { setProfile(null); setAuth('in'); setProfileErr(e.message); }
      }
      setReady(true);
    })();
  }, []);

  /* ------------------------------------------------------- подписка */

  const subscribed = !!(profile && profile.has_active_subscription);
  const freeChars = profile ? Number(profile.free_generation_remaining_chars || 0) : 0;
  const subState = subscribed ? 'active' : (freeChars > 0 ? 'demo' : 'demo0');
  const maxThreads = Math.max(1, Number((profile && profile.max_threads) || 2));

  /* ---------------------------------------------------------- задачи */

  const refreshTasks = useCallback(async (opts = {}) => {
    try {
      const q = await api.queue();
      const list = (q && q.tasks) || [];
      setTasks(list);
      setConnLost(false);
      if (opts.selectFirst && list.length) setCurTask(c => c || list[0].task_id);
      return list;
    } catch (e) {
      if (e.network || e.status === 0) setConnLost(true);
      return null;
    }
  }, []);

  useEffect(() => {
    if (auth !== 'in') return;
    refreshTasks({ selectFirst: false });
    let stop = false;
    const loop = async () => {
      while (!stop) {
        const busy = tasksBusyRef.current;
        await new Promise(r => setTimeout(r, busy ? 2500 : 12000));
        if (stop) return;
        await refreshTasks();
      }
    };
    loop();
    return () => { stop = true; };
  }, [auth, refreshTasks]);

  const tasksBusyRef = useRef(false);
  useEffect(() => {
    tasksBusyRef.current = tasks.some(t => t.status === 'running' || t.status === 'queued');
  }, [tasks]);

  /* ---------------------------------------------------- обновление */

  useEffect(() => {
    if (auth !== 'in' || !appInfo.version) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await api.release();
        if (!cancelled) setRelease(r);
      } catch { /* обновление не критично: молча пропускаем */ }
    })();
    return () => { cancelled = true; };
  }, [auth, appInfo.version]);

  /* ------------------------------------------------------- действия */

  const setVoice = useCallback((v) => {
    setVoiceState(v);
    persist({ voice: v });
  }, [persist]);

  const setSettings = useCallback((patch) => {
    setSettingsState(prev => {
      const next = typeof patch === 'function' ? patch(prev) : { ...prev, ...patch };
      persist({ settings: next });
      return next;
    });
  }, [persist]);

  const setLib = useCallback((patch) => {
    setLibState(prev => {
      const next = typeof patch === 'function' ? patch(prev) : { ...prev, ...patch };
      persist({ lib: next });
      return next;
    });
  }, [persist]);

  const goto = useCallback((s) => setScreen(s), []);

  const openExternal = useCallback((url) => window.sv.openExternal(url), []);
  const openBot = useCallback(() => window.sv.openExternal(BOT_URL), []);

  const copy = useCallback(async (text, msg) => {
    await window.sv.clipboardWrite(text);
    toast('ok', msg || 'Скопировано');
  }, [toast]);

  const logout = useCallback(async () => {
    await window.sv.keyClear();
    sound.stop();
    setAuth('out');
    setProfile(null);
    setTasks([]);
    setCurTask(null);
    setProfileOpen(false);
    setScreen('home');
  }, []);

  const onLoggedIn = useCallback(async (p) => {
    setProfile(p);
    setAuth('in');
    setScreen('home');
    toast('ok', t('welcomeBack', { name: p.first_name || p.telegram_username || t('friend') }));
  }, [toast, t]);

  /* --------------------------------------------------- ширина панели */

  useEffect(() => {
    if (!dragging) return;
    const move = (e) => {
      const w = Math.max(360, Math.min(760, dragRef.current.w + e.clientX - dragRef.current.x));
      setSideW(w);
    };
    const up = () => { setDragging(false); document.body.style.userSelect = ''; persist({ sideW: dragRef.current.last }); };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
  }, [dragging, persist]);

  const dragRef = useRef({ x: 0, w: 490, last: 490 });
  useEffect(() => { dragRef.current.last = sideW; }, [sideW]);

  const startDrag = useCallback((e) => {
    e.preventDefault();
    dragRef.current = { x: e.clientX, w: sideW, last: sideW };
    document.body.style.userSelect = 'none';
    setDragging(true);
  }, [sideW]);

  /* ----------------------------------------------------------- ctx */

  const ctx = useMemo(() => ({
    ready, auth, profile, profileLoading, profileErr, loadProfile,
    subscribed, subState, freeChars, maxThreads,
    theme, setTheme: (v) => { setTheme(v); persist({ theme: v }); },
    lang, setLang: (v) => { setLangState(v); persist({ lang: v }); },
    t,
    screen, goto, rightTab, setRightTab,
    voice, setVoice,
    settings, setSettings,
    lib, setLib,
    tasks, curTask, setCurTask, refreshTasks, connLost, setConnLost,
    toast, confirm, closeConfirm,
    settingsOpen, setSettingsOpen,
    profileOpen, setProfileOpen,
    openExternal, openBot, copy, logout, onLoggedIn,
    appInfo, release, dismissedVersion,
    dismissVersion: (v) => { setDismissedVersion(v); persist({ dismissedVersion: v }); }
  }), [
    ready, auth, profile, profileLoading, profileErr, loadProfile, subscribed, subState, freeChars, maxThreads,
    theme, lang, t, screen, goto, rightTab, voice, setVoice, settings, setSettings, lib, setLib,
    tasks, curTask, refreshTasks, connLost, toast, confirm, closeConfirm, settingsOpen, profileOpen,
    openExternal, openBot, copy, logout, onLoggedIn, appInfo, release, dismissedVersion, persist
  ]);

  /* --------------------------------------------------------- разметка */

  const NAV = [
    { id: 'home', label: t('navHome') },
    { id: 'library', label: t('navLibrary') },
    { id: 'clone', label: t('navClone'), paid: true },
    { id: 'describe', label: t('navDescribe'), paid: true }
  ];

  const subBadge = subState === 'active'
    ? t('badgePro')
    : (subState === 'demo0' ? t('badgeEmpty') : t('badgeDemo', { n: num(freeChars) }));

  const initial = ((profile && (profile.first_name || profile.telegram_username)) || '?').trim().charAt(0).toUpperCase();

  return (
    <Ctx.Provider value={ctx}>
      <div className="app-root">
        <div className="app-frame">

          <div className="titlebar">
            <div className="tb-brand">
              <img src="./mascot.png" alt="" />
              <span>Shum <b className="gold-text">Voice</b></span>
            </div>

            {auth === 'in' && (
              <>
                <div className="tb-nav">
                  <div className="row">
                    {NAV.map(n => {
                      const locked = !!n.paid && !subscribed;
                      return (
                        <button key={n.id}
                          className={'nav-btn' + (screen === n.id ? ' active' : '') + (locked ? ' locked' : '')}
                          title={locked ? t('lockedHint') : ''}
                          onClick={() => goto(n.id)}>
                          {n.label}
                          {locked && <Icon name="lock" size={11} sw={2.2} style={{ opacity: .7 }} />}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="tb-right">
                  <button className="icon-btn" title={t('support')} onClick={openBot}>
                    <Icon name="help" size={14} sw={1.8} />
                  </button>
                  <button
                    className={'sub-badge' + (subState === 'active' ? ' active' : '') + (subState === 'demo0' ? ' empty' : '')}
                    onClick={() => setProfileOpen(true)}>
                    {subBadge}
                  </button>
                  <button className="avatar" onClick={() => setProfileOpen(true)}>{initial}</button>
                </div>
              </>
            )}

            {/* Кнопки окна справа: так привычнее на Windows, закрытие крайнее. */}
            <div className="tb-dots">
              <button className="d-yellow" title={t('winMin')} onClick={() => window.sv.winMin()} />
              <button className="d-green" title={t('winMax')} onClick={() => window.sv.winMax()} />
              <button className="d-red" title={t('winClose')} onClick={() => window.sv.winClose()} />
            </div>
          </div>

          {!ready && (
            <div className="login-wrap">
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, color: 'var(--ink3)', fontSize: 13.5 }}>
                <span className="spinner lg" />
                {t('checkingLogin')}
              </div>
            </div>
          )}

          {ready && auth !== 'in' && <Login />}

          {ready && auth === 'in' && (
            <div className="work">
              {screen === 'home' && (
                <div className="home">
                  <div className="home-left" style={{ width: sideW }}>
                    <Home />
                  </div>
                  <div className={'resizer' + (dragging ? ' on' : '')} onMouseDown={startDrag} />
                  <TaskPanel />
                </div>
              )}
              {screen === 'library' && <Library />}
              {screen === 'clone' && <Clone />}
              {screen === 'describe' && <Describe />}
            </div>
          )}

          {settingsOpen && <Settings />}
          {profileOpen && <Profile />}
          <Confirm data={confirmData} onNo={closeConfirm} cancelLabel={t('cancel')} />
          <UpdateModal />

          <Toasts
            items={toasts}
            onHold={(id) => clearTimeout(timersRef.current[id])}
            onRelease={(id) => armToast(id, 2400)}
            onClose={dropToast}
          />
        </div>
      </div>
    </Ctx.Provider>
  );
}
