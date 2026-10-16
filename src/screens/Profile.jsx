import React, { useCallback, useEffect, useMemo } from 'react';
import { useApp } from '../App.jsx';
import { Icon, Spinner } from '../ui.jsx';
import { num, fmtDateLong } from '../lib/format.js';
import { makeT, LANGS } from '../lib/i18n.js';
import STR from './Profile.i18n.js';

/* Панель профиля. Данные всегда берём с сервиса: при открытии панели
   перезапрашиваем профиль, чтобы человек видел свежий остаток символов. */

/* Тарифы приходят техническими кодами. Известные показываем на языке
   интерфейса, незнакомый код выводим как есть: врать про чужой тариф хуже,
   чем показать код. */
const PLAN_KEYS = {
  api: 'planApi',
  free: 'planFree',
  demo: 'planDemo',
  trial: 'planTrial',
  start: 'planStart',
  pro: 'planPro',
  business: 'planBusiness',
  unlimited: 'planUnlimited',
  lifetime: 'planLifetime',
  monthly: 'planMonthly',
  monthly_500: 'planMonthly500',
  monthly_1000: 'planMonthly1000',
  monthly_2000: 'planMonthly2000',
  monthly_3000: 'planMonthly3000',
  monthly_5000: 'planMonthly5000',
  monthly_10000: 'planMonthly10000',
  quarterly: 'planQuarterly',
  yearly: 'planYearly',
  annual: 'planYearly'
};

function planTitle(t, raw) {
  const code = String(raw || '').trim();
  if (!code) return t('planFallback');
  const key = PLAN_KEYS[code.toLowerCase()];
  return t('planTitle', { name: key ? t(key) : code });
}

export default function Profile() {
  const {
    profile, profileLoading, profileErr, loadProfile,
    subscribed, theme, setTheme, lang, setLang, setProfileOpen,
    openBot, logout, confirm, closeConfirm, toast, appInfo
  } = useApp();

  const t = useMemo(() => makeT(STR, lang), [lang]);

  useEffect(() => {
    loadProfile().catch(() => { /* текст ошибки уже лежит в profileErr */ });
  }, [loadProfile]);

  const close = useCallback(() => setProfileOpen(false), [setProfileOpen]);

  const retry = useCallback(async () => {
    try {
      await loadProfile();
    } catch (e) {
      toast('err', (e && e.message) || t('failed'));
    }
  }, [loadProfile, toast, t]);

  const askLogout = useCallback(() => {
    confirm({
      title: t('logoutTitle'),
      sub: t('logoutSub'),
      act: t('logoutAct'),
      onYes: () => { closeConfirm(); logout(); }
    });
  }, [confirm, closeConfirm, logout, t]);

  const name = (profile && (profile.first_name
    || (profile.telegram_username ? '@' + profile.telegram_username : ''))) || t('accountFallback');
  const initial = name.replace(/^@/, '').trim().charAt(0).toUpperCase() || '?';

  const loading = profileLoading && !profile;
  const failed = !loading && !profile;

  const invited = profile ? num(profile.referrals_total) : '';
  const paidInvited = profile ? Number(profile.paid_referrals_total || 0) : 0;

  return (
    <>
      <div className="scrim" style={{ zIndex: 74 }} onClick={close} />

      <div className="drawer profile">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <div className="avatar" style={{ width: 44, height: 44, fontSize: 16 }}>{initial}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 15, fontWeight: 800,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
            }}>{name}</div>
            <div style={{ fontSize: 12, color: 'var(--ink3)' }}>{t('profile')}</div>
          </div>
          <button className="x-btn" title={t('close')} onClick={close}>
            <Icon name="close" size={13} sw={2.2} />
          </button>
        </div>

        {loading && (
          <div className="center-state" style={{ padding: '50px 0', gap: 13, color: 'var(--ink3)', fontSize: 13 }}>
            <Spinner />
            {t('loading')}
          </div>
        )}

        {failed && (
          <div className="center-state" style={{ padding: '40px 6px', gap: 11 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--err)' }}>{t('failed')}</div>
            {profileErr ? (
              <div style={{ fontSize: 12.5, color: 'var(--ink2)', lineHeight: 1.55, wordBreak: 'break-word' }}>
                {profileErr}
              </div>
            ) : null}
            <button
              className="btn-outline"
              style={{ color: 'var(--gold)', padding: '9px 16px', fontSize: 12.5, marginTop: 4 }}
              disabled={profileLoading}
              onClick={retry}>
              {t('retry')}
            </button>
          </div>
        )}

        {profile && !loading && (
          <>
            {profileErr ? (
              <div style={{
                fontSize: 12, color: 'var(--warn)', lineHeight: 1.5,
                marginBottom: 10, wordBreak: 'break-word'
              }}>
                {t('stale', { err: profileErr })}
              </div>
            ) : null}

            <div className="profile-card">
              <span className={'profile-badge' + (subscribed ? ' on' : '')}>
                {subscribed ? t('badgeOn') : t('badgeOff')}
              </span>

              <div style={{ fontSize: 14, fontWeight: 800, marginTop: 10 }}>
                {subscribed ? planTitle(t, profile.current_plan) : t('demoAccess')}
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--ink3)', marginTop: 3 }}>
                {subscribed
                  ? (profile.subscription_expires_at
                    ? t('validUntil', { date: fmtDateLong(profile.subscription_expires_at) })
                    : t('noExpiry'))
                  : t('noSub')}
              </div>

              <div className="hr" style={{ margin: '13px 0' }} />

              <div className="kv">
                <span>{t('chars')}</span>
                <b>{subscribed
                  ? t('unlimited')
                  : t('charsOf', {
                    left: num(profile.free_generation_remaining_chars),
                    limit: num(profile.free_generation_limit)
                  })}</b>
              </div>
              <div className="kv">
                <span>{t('spent30')}</span>
                <b>{t('charsUnit', { n: num(profile.generated_chars_last_30_days) })}</b>
              </div>
              <div className="kv">
                <span>{t('invited')}</span>
                <b>{paidInvited > 0
                  ? t('invitedWithPaid', { total: invited, paid: num(paidInvited) })
                  : invited}</b>
              </div>
            </div>

            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: 10, padding: '16px 4px 6px'
            }}>
              <span style={{ fontSize: 13.5, fontWeight: 700 }}>{t('theme')}</span>
              <div className="seg" style={{ flexShrink: 0 }}>
                <button className={theme === 'dark' ? 'on' : ''} onClick={() => setTheme('dark')}>{t('themeDark')}</button>
                <button className={theme === 'light' ? 'on' : ''} onClick={() => setTheme('light')}>{t('themeLight')}</button>
              </div>
            </div>

            {/* Языки подписаны каждый на себе: человек должен найти свой,
                не понимая текущего языка интерфейса. */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: 10, padding: '6px 4px 6px'
            }}>
              <span style={{ fontSize: 13.5, fontWeight: 700 }}>{t('language')}</span>
              <div className="seg" style={{ flexShrink: 0 }}>
                {LANGS.map(l => (
                  <button
                    key={l.id}
                    className={lang === l.id ? 'on' : ''}
                    onClick={() => setLang(l.id)}>
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="hr" style={{ margin: '12px 0' }} />

            <button className="menu-btn" onClick={openBot}>
              <Icon name="send" size={15} sw={2} />
              {t('openBot')}
            </button>
            <button className="menu-btn danger" onClick={askLogout}>
              <Icon name="logout" size={15} sw={2} />
              {t('logoutMenu')}
            </button>
          </>
        )}

        <div style={{ fontSize: 11.5, color: 'var(--ink3)', lineHeight: 1.7, marginTop: 18, wordBreak: 'break-word' }}>
          <div>{t('version', { v: appInfo && appInfo.version ? appInfo.version : t('versionUnknown') })}</div>
          {profile && profile.api_key_label ? <div>{t('keyLine', { label: profile.api_key_label })}</div> : null}
        </div>
      </div>
    </>
  );
}
