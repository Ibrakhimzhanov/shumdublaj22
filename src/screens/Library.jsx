import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useApp } from '../App.jsx';
import { api } from '../lib/api.js';
import * as fmt from '../lib/format.js';
import * as sound from '../lib/audio.js';
import { Icon, PlayIcon, Star } from '../ui.jsx';
import { makeT } from '../lib/i18n.js';
import STR from './Library.i18n.js';

/* Библиотека голосов: каталог, избранное и свои голоса.
   Отбор (вкладка, поиск, фильтры, сортировка, страница) живёт в общем
   состоянии приложения и сохраняется на диск: повторять его руками не нужно. */

const PAGE_SIZE = 24;
const SEARCH_DELAY = 400;

/* В константах только значения и ключи словаря: подписи собираются
   внутри компонента, чтобы переключение языка их обновляло. */

const TABS = [
  { id: 'public', key: 'tabPublic' },
  { id: 'fav', key: 'tabFav' },
  { id: 'clones', key: 'tabClones' },
  { id: 'described', key: 'tabDescribed' }
];

const SORTS = [
  { value: 'popular', key: 'sortPopular' },
  { value: 'most_used', key: 'sortMostUsed' },
  { value: 'trending', key: 'sortTrending' },
  { value: 'new', key: 'sortNew' }
];

/* Пол, возраст и языки подписывает format.js: он уже знает текущий язык. */
const GENDER_VALUES = ['male', 'female'];
const AGE_VALUES = ['young', 'middle_aged', 'old'];
const LANG_VALUES = ['ru', 'en', 'uz', 'de', 'es', 'fr'];

/* Идентификатор записи: по нему ходим в API избранного, переименования и удаления. */
function vid(v) {
  if (!v) return '';
  const raw = v.id != null ? v.id : (v.voice_id != null ? v.voice_id : v.elevenlabs_voice_id);
  return raw == null ? '' : String(raw);
}

/* Идентификатор, который человек копирует и куда-то вставляет: это тот же
   voice_id, который уходит в задачу озвучки, а не внешний ключ провайдера. */
function publicId(v) {
  if (!v) return '';
  return String(v.voice_id || v.id || v.elevenlabs_voice_id || '');
}

function vname(v, t) {
  const n = (v && (v.name || v.display) || '').trim();
  return n || t('noName');
}

function isMine(v, tab) {
  if (!v) return false;
  if (v.source_type === 'cloned' || v.source_type === 'prompt') return true;
  return tab === 'clones' || tab === 'described';
}

function metaLine(v, mine, t) {
  const parts = [];
  const g = String(v.gender || '').toLowerCase();
  const a = String(v.age || '').toLowerCase();
  if (g && g !== 'unknown') parts.push(fmt.gender(v.gender));
  if (a && a !== 'unknown') parts.push(fmt.age(v.age));
  if (parts.length) return parts.join(' · ');
  return mine ? t('ownVoice') : t('noTraits');
}

const CAP = {
  fontSize: 12, fontWeight: 700, color: 'var(--ink3)',
  textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 8
};

export default function Library() {
  const { voice, setVoice, lib, setLib, toast, confirm, closeConfirm, goto, copy, lang } = useApp();
  const t = useMemo(() => makeT(STR, lang), [lang]);

  const tabs = useMemo(() => TABS.map((x) => ({ id: x.id, label: t(x.key) })), [t]);
  const sorts = useMemo(() => SORTS.map((x) => ({ value: x.value, label: t(x.key) })), [t]);

  /* Подписи фильтров берём у format.js: он подстраивается под язык сам. */
  const filterOpts = useMemo(() => ({
    gender: GENDER_VALUES.map((value) => ({ value, label: fmt.gender(value) })),
    age: AGE_VALUES.map((value) => ({ value, label: fmt.age(value) })),
    language: LANG_VALUES.map((value) => ({ value, label: fmt.lang(value) }))
  }), [lang]);

  const tab = lib.tab || 'public';
  const sort = lib.sort || 'popular';

  const [voices, setVoices] = useState([]);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loaded, setLoaded] = useState(0);        // сколько страниц уже в списке
  const [err, setErr] = useState(null);
  const [nonce, setNonce] = useState(0);
  const [busyId, setBusyId] = useState(null);
  const bodyRef = useRef(null);

  const [qText, setQText] = useState(lib.q || '');
  const [fOpen, setFOpen] = useState(false);
  const [draft, setDraft] = useState({ gender: null, age: null, language: null });

  const reqRef = useRef(0);

  /* Кнопки прослушивания перерисовываем по состоянию общего плеера. */
  const [, bump] = useReducer((x) => x + 1, 0);
  useEffect(() => sound.subscribe(bump), []);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  /* ---------------------------------------------------------- поиск */

  /* Ждём 400 мс тишины: каждая буква не должна дёргать сервис. */
  useEffect(() => {
    if (qText === (lib.q || '')) return undefined;
    const timer = setTimeout(() => setLib({ q: qText, page: 1 }), SEARCH_DELAY);
    return () => clearTimeout(timer);
  }, [qText, lib.q, setLib]);

  /* ------------------------------------------------------- загрузка */

  const fetchPage = useCallback(async (want) => {
    const query = { page: want, page_size: PAGE_SIZE, sort };
    const text = String(lib.q || '').trim();
    if (text) query.query = text;
    if (lib.gender) query.gender = lib.gender;
    if (lib.age) query.age = lib.age;
    if (lib.language) query.language = lib.language;

    if (tab === 'fav') return api.favoriteVoices(query);
    if (tab === 'clones') return api.customVoices({ ...query, source_type: 'cloned' });
    if (tab === 'described') return api.customVoices({ ...query, source_type: 'prompt' });
    return api.publicVoices(query);
  }, [tab, lib.q, lib.gender, lib.age, lib.language, sort]);

  /* Первая страница: список начинается заново. */
  const loadFirst = useCallback(async () => {
    const my = ++reqRef.current;
    setLoading(true);
    setErr(null);
    try {
      const r = await fetchPage(1);
      if (reqRef.current !== my) return;
      setVoices((r && r.voices) || []);
      setPages(Math.max(1, Number(r && r.total_pages) || 1));
      setLoaded(1);
      setLoading(false);
    } catch (e) {
      if (reqRef.current !== my) return;
      setVoices([]);
      setLoaded(0);
      setErr(e && e.message ? e.message : String(e));
      setLoading(false);
    }
  }, [fetchPage]);

  useEffect(() => { loadFirst(); }, [loadFirst, nonce]);

  /* Следующие страницы дописываются к списку по мере прокрутки. */
  const loadMore = useCallback(async () => {
    if (loading || loadingMore || err) return;
    if (loaded === 0 || loaded >= pages) return;
    const my = reqRef.current;
    setLoadingMore(true);
    try {
      const r = await fetchPage(loaded + 1);
      if (reqRef.current !== my) return;
      const list = (r && r.voices) || [];
      setVoices((prev) => {
        const seen = new Set(prev.map((x) => vid(x)));
        return prev.concat(list.filter((x) => !seen.has(vid(x))));
      });
      setPages(Math.max(1, Number(r && r.total_pages) || 1));
      setLoaded((n) => n + 1);
    } catch (e) {
      /* Догрузка не должна ломать уже показанный список: сообщаем и останавливаемся. */
      if (reqRef.current === my) toast('err', e && e.message ? e.message : String(e));
    } finally {
      setLoadingMore(false);
    }
  }, [loading, loadingMore, err, loaded, pages, fetchPage, toast]);

  /* Докрутили почти до низа - грузим следующую страницу. Считаем по самой
     области прокрутки, а не наблюдателем пересечений: так работает и когда
     окно свёрнуто или перерисовка приостановлена. */
  const nearBottom = useCallback(() => {
    const el = bodyRef.current;
    if (!el) return false;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 700;
  }, []);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return undefined;
    let timer = 0;
    const onScroll = () => {
      if (timer) return;
      timer = setTimeout(() => { timer = 0; if (nearBottom()) loadMore(); }, 120);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    /* Страница могла не заполнить экран целиком: проверяем сразу. */
    if (nearBottom()) loadMore();
    return () => {
      el.removeEventListener('scroll', onScroll);
      if (timer) clearTimeout(timer);
    };
  }, [loadMore, nearBottom]);

  /* --------------------------------------------------------- отбор */

  const fCount = (lib.gender ? 1 : 0) + (lib.age ? 1 : 0) + (lib.language ? 1 : 0);
  const filtered = !!String(lib.q || '').trim() || fCount > 0;

  const resetAll = useCallback(() => {
    setQText('');
    setLib({ q: '', gender: null, age: null, language: null, page: 1 });
  }, [setLib]);

  const openFilters = useCallback(() => {
    setDraft({ gender: lib.gender || null, age: lib.age || null, language: lib.language || null });
    setFOpen(true);
  }, [lib.gender, lib.age, lib.language]);

  const applyFilters = useCallback(() => {
    setLib({ gender: draft.gender, age: draft.age, language: draft.language, page: 1 });
    setFOpen(false);
  }, [draft, setLib]);

  useEffect(() => {
    if (!fOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setFOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fOpen]);

  /* ------------------------------------------------------ действия */

  const selectedId = useMemo(() => vid(voice), [voice]);

  const onSelect = useCallback((v) => {
    if (vid(v) === selectedId) return;
    setVoice(v);
    toast('ok', t('selected', { name: vname(v, t) }));
  }, [selectedId, setVoice, toast, t]);

  const onFav = useCallback(async (v) => {
    const id = vid(v);
    if (!id || busyId === id) return;
    const next = !v.is_favorite;
    setBusyId(id);
    setVoices((list) => list.map((x) => (vid(x) === id ? { ...x, is_favorite: next } : x)));
    try {
      await api.setFavorite(id, next);
      /* Со вкладки избранного снятая звёздочка убирает карточку: список перезапрашиваем. */
      if (tab === 'fav' && !next) reload();
    } catch (e) {
      setVoices((list) => list.map((x) => (vid(x) === id ? { ...x, is_favorite: !next } : x)));
      toast('err', e && e.message ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  }, [busyId, tab, reload, toast]);

  const onRename = useCallback(async (v) => {
    const id = vid(v);
    if (!id || busyId === id) return;
    const raw = window.prompt(t('renamePrompt'), vname(v, t));
    if (raw == null) return;
    const name = raw.trim();
    if (!name || name === vname(v, t)) return;
    setBusyId(id);
    try {
      await api.renameVoice(id, name);
      toast('ok', t('renamed'));
      if (selectedId === id) setVoice({ ...v, name });
      reload();
    } catch (e) {
      toast('err', e && e.message ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  }, [busyId, selectedId, setVoice, reload, toast, t]);

  const onDelete = useCallback((v) => {
    const id = vid(v);
    if (!id || busyId === id) return;
    confirm({
      title: t('deleteTitle'),
      sub: t('deleteSub', { name: vname(v, t) }),
      act: t('deleteBtn'),
      onYes: async () => {
        closeConfirm();
        setBusyId(id);
        try {
          await api.deleteVoice(id);
          if (selectedId === id) setVoice(null);
          toast('ok', t('deleted'));
          reload();
        } catch (e) {
          toast('err', e && e.message ? e.message : String(e));
        } finally {
          setBusyId(null);
        }
      }
    });
  }, [busyId, confirm, closeConfirm, selectedId, setVoice, reload, toast, t]);

  const onCopyId = useCallback((v) => {
    const id = publicId(v);
    if (!id) { toast('warn', t('noId')); return; }
    copy(id, t('idCopied'));
  }, [copy, toast, t]);

  /* -------------------------------------------------- пустые экраны */

  let empty = null;
  if (!loading && !err && voices.length === 0) {
    if (filtered) {
      empty = {
        title: t('emptyFoundTitle'),
        sub: t('emptyFoundSub'),
        act: t('emptyFoundAct'),
        on: resetAll
      };
    } else if (tab === 'fav') {
      empty = {
        title: t('emptyFavTitle'),
        sub: t('emptyFavSub')
      };
    } else if (tab === 'clones') {
      empty = {
        title: t('emptyClonesTitle'),
        sub: t('emptyClonesSub'),
        act: t('emptyClonesAct'),
        on: () => goto('clone')
      };
    } else if (tab === 'described') {
      empty = {
        title: t('emptyDescribedTitle'),
        sub: t('emptyDescribedSub'),
        act: t('emptyDescribedAct'),
        on: () => goto('describe')
      };
    } else {
      empty = {
        title: t('emptyAllTitle'),
        sub: t('emptyAllSub'),
        act: t('emptyAllAct'),
        on: reload
      };
    }
  }

  const showCards = !loading && !err && voices.length > 0;

  /* -------------------------------------------------------- разметка */

  return (
    <div className="lib">

      <div className="lib-side">
        <div className="lib-cap">{t('sideTitle')}</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {tabs.map((x) => (
            <button key={x.id}
              className={'lib-tab' + (tab === x.id ? ' on' : '')}
              onClick={() => { if (tab !== x.id) setLib({ tab: x.id, page: 1 }); }}>
              {x.label}
            </button>
          ))}
        </div>

        <div className="hr" style={{ margin: '14px 0' }} />

        <div className="search">
          <Icon name="search" size={14} sw={2} style={{ color: 'var(--ink3)' }} />
          <input
            value={qText}
            onChange={(e) => setQText(e.target.value)}
            placeholder={t('searchPh')}
            spellCheck={false} />
        </div>

        <button className="filters-btn" onClick={openFilters}>
          <Icon name="filters" size={13} sw={2} />
          {t('filters')}
          {fCount > 0 && <span className="fcount">{fCount}</span>}
        </button>

        <div className="side-cap">{t('sortCap')}</div>
        <select className="sort-select" value={sort}
          onChange={(e) => setLib({ sort: e.target.value, page: 1 })}>
          {sorts.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      <div className="lib-body" ref={bodyRef}>

        {loading && (
          <div className="center-state" style={{ gap: 14, padding: '80px 0', color: 'var(--ink3)', fontSize: 13.5 }}>
            <span className="spinner md" />
            {t('loading')}
          </div>
        )}

        {!loading && err && (
          <div className="center-state">
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--err)' }}>{t('loadErr')}</div>
            <div style={{ fontSize: 13, color: 'var(--ink2)', maxWidth: 360, lineHeight: 1.55 }}>{err}</div>
            <button className="btn-primary" style={{ padding: '10px 20px', fontSize: 13, marginTop: 4 }}
              onClick={reload}>
              {t('retry')}
            </button>
          </div>
        )}

        {empty && (
          <div className="center-state" style={{ gap: 11 }}>
            <div style={{ fontSize: 15, fontWeight: 800 }}>{empty.title}</div>
            <div style={{ fontSize: 13, color: 'var(--ink2)', maxWidth: 380, lineHeight: 1.55 }}>{empty.sub}</div>
            {empty.act && (
              <button className="btn-outline"
                style={{ color: 'var(--gold)', padding: '9px 17px', fontSize: 13, marginTop: 4 }}
                onClick={empty.on}>
                {empty.act}
              </button>
            )}
          </div>
        )}

        {showCards && (
          <>
            <div className="lib-hint">{t('cardHint')}</div>
            <div className="cards">
              {voices.map((v) => (
                <VoiceCard key={vid(v) || vname(v, t)}
                  v={v}
                  t={t}
                  tab={tab}
                  selected={vid(v) === selectedId && !!selectedId}
                  busy={busyId === vid(v)}
                  onSelect={onSelect}
                  onOpen={(x) => { onSelect(x); goto('home'); }}
                  onFav={onFav}
                  onRename={onRename}
                  onDelete={onDelete}
                  onCopyId={onCopyId} />
              ))}
            </div>

            <div className="lib-more">
              {loadingMore && (
                <>
                  <span className="spinner sm" />
                  {t('moreLoading')}
                </>
              )}
              {!loadingMore && loaded >= pages && voices.length > PAGE_SIZE && t('listEnd')}
            </div>
          </>
        )}
      </div>

      {fOpen && (
        <FiltersModal
          t={t}
          opts={filterOpts}
          draft={draft}
          setDraft={setDraft}
          onClose={() => setFOpen(false)}
          onApply={applyFilters} />
      )}
    </div>
  );
}

/* ---------------------------------------------------------- карточка */

function VoiceCard({ v, t, tab, selected, busy, onSelect, onOpen, onFav, onRename, onDelete, onCopyId }) {
  const id = vid(v);
  const name = vname(v, t);
  const mine = isMine(v, tab);

  const langs = fmt.voiceLangs(v);
  const shown = langs.slice(0, 2);
  const extra = langs.length - shown.length;

  const key = 'voice:' + id;
  const hasSample = !!v.preview_url;
  const playing = sound.isPlaying(key);

  /* Клик по карточке выбирает голос, двойной возвращает к озвучке.
     Кнопки внутри карточки гасят всплытие, чтобы не выбирать заодно. */
  const stop = (fn) => (e) => { e.stopPropagation(); fn(); };

  return (
    <div
      className={'vcard' + (selected ? ' sel' : '')}
      role="button"
      tabIndex={0}
      title={t('cardTitle')}
      onClick={() => onSelect(v)}
      onDoubleClick={() => onOpen(v)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') { e.preventDefault(); onOpen(v); }
        else if (e.key === ' ') { e.preventDefault(); onSelect(v); }
      }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
        <button
          className={'v-av' + (mine ? ' mine' : '') + (playing ? ' playing' : '')}
          disabled={!hasSample}
          title={hasSample ? (playing ? t('pause') : t('playSample')) : t('noSampleTitle')}
          onClick={stop(() => { if (hasSample) sound.toggle(key, [{ url: v.preview_url }]); })}>
          <PlayIcon playing={playing} size={15} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="v-name" title={name}>
            <span className="one-line">{name}</span>
            {selected && <span className="v-badge">{t('badgeSelected')}</span>}
          </div>
          <div className="v-meta">{metaLine(v, mine, t)}</div>
        </div>
        <button
          className="mini-btn"
          style={{ width: 30, height: 30, color: v.is_favorite ? 'var(--gold)' : 'var(--ink3)' }}
          title={v.is_favorite ? t('favOff') : t('favOn')}
          disabled={busy}
          onClick={stop(() => onFav(v))}>
          <Star on={!!v.is_favorite} size={16} />
        </button>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 11 }}>
        {shown.map((l) => <span key={l} className="lang-tag">{l}</span>)}
        {extra > 0 && (
          <span className="lang-tag plain" title={langs.join(', ')}>{'+' + extra}</span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 13 }}>
        <button className={'v-sel' + (selected ? ' on' : '')} onClick={stop(() => onSelect(v))}>
          {selected ? t('badgeSelected') : t('select')}
        </button>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 3 }}>
          <button className="mini-btn" title={t('copyId')} onClick={stop(() => onCopyId(v))}>
            <Icon name="copy" size={13} sw={2} />
          </button>
          {mine && (
            <button className="mini-btn" title={t('rename')} disabled={busy} onClick={stop(() => onRename(v))}>
              <Icon name="pencil" size={13} sw={2} />
            </button>
          )}
          {mine && (
            <button className="mini-btn danger" title={t('deleteBtn')} disabled={busy} onClick={stop(() => onDelete(v))}>
              <Icon name="trash" size={13} sw={2} />
            </button>
          )}
        </div>
      </div>

      {!hasSample && (
        <div style={{ fontSize: 11.5, color: 'var(--ink3)', marginTop: 8 }}>
          {t('noSampleHint')}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------ фильтры */

function FiltersModal({ t, opts, draft, setDraft, onClose, onApply }) {
  const group = (field, options) => (
    <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: field === 'language' ? 22 : 16 }}>
      <button className={'chip-btn' + (draft[field] ? '' : ' on')}
        onClick={() => setDraft((d) => ({ ...d, [field]: null }))}>
        {t('anyOpt')}
      </button>
      {options.map((o) => (
        <button key={o.value}
          className={'chip-btn' + (draft[field] === o.value ? ' on' : '')}
          onClick={() => setDraft((d) => ({ ...d, [field]: o.value }))}>
          {o.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="modal-scrim" style={{ zIndex: 72 }} onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>

        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 18 }}>
          <span className="modal-title" style={{ flex: 1 }}>{t('filters')}</span>
          <button className="x-btn" title={t('close')} onClick={onClose}>
            <Icon name="close" size={13} sw={2.2} />
          </button>
        </div>

        <div style={CAP}>{t('capGender')}</div>
        {group('gender', opts.gender)}

        <div style={CAP}>{t('capAge')}</div>
        {group('age', opts.age)}

        <div style={CAP}>{t('capLang')}</div>
        {group('language', opts.language)}

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-outline" style={{ flex: 1, padding: 12, fontSize: 13.5 }}
            onClick={() => setDraft({ gender: null, age: null, language: null })}>
            {t('reset')}
          </button>
          <button className="btn-primary" style={{ flex: 1, padding: 12, fontSize: 13.5 }}
            onClick={onApply}>
            {t('apply')}
          </button>
        </div>
      </div>
    </div>
  );
}
