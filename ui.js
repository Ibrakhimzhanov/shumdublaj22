// Панель ShumDublaj поверх плеера: пилюля с логотипом и настройки.
// Живёт в Shadow DOM, поэтому стили YouTube и других расширений её не задевают.

window.ShumDublajUI = (function () {
  'use strict';

  const GOLD = '#F2C14E';

  const CSS = `
:host { all: initial; }
* { box-sizing: border-box; font-family: Roboto, Arial, sans-serif; }

.wrap { position: relative; display: inline-flex; flex-direction: column; align-items: flex-start; gap: 8px; }

.pill {
  display: inline-flex; align-items: center; gap: 8px;
  height: 36px; padding: 0 6px 0 8px;
  border: 1px solid rgba(255,255,255,0.16); border-radius: 18px;
  background: rgba(14,14,17,0.78); backdrop-filter: blur(10px);
  color: #fff; cursor: pointer; user-select: none;
  transition: background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
}
.pill:hover { background: rgba(26,26,32,0.92); border-color: rgba(255,255,255,0.28); }
.pill.on { border-color: ${GOLD}; box-shadow: 0 0 0 1px rgba(242,193,78,0.3), 0 4px 18px rgba(0,0,0,0.4); }
.pill.busy { border-color: #7aa7ff; }

.logo { width: 20px; height: 20px; flex: none; display: block; }
.pill.busy .logo { animation: beat 1s ease-in-out infinite; }
@keyframes beat { 0%,100% { opacity: 0.45; transform: scale(0.94); } 50% { opacity: 1; transform: scale(1.06); } }

.label { font-size: 13px; font-weight: 600; letter-spacing: 0.2px; white-space: nowrap; }
.pill.on .label { color: ${GOLD}; }
.pill.busy .label { color: #9ecbff; font-variant-numeric: tabular-nums; }

.chev {
  width: 24px; height: 24px; border-radius: 12px; border: 0; padding: 0;
  display: grid; place-items: center; background: transparent; cursor: pointer;
}
.chev:hover { background: rgba(255,255,255,0.12); }
.chev svg { width: 14px; height: 14px; fill: none; stroke: #fff; stroke-width: 2; stroke-linecap: round; }
.chev.open svg { transform: rotate(180deg); }

.panel {
  width: 292px; padding: 14px;
  border: 1px solid rgba(255,255,255,0.14); border-radius: 16px;
  background: rgba(14,14,17,0.94); backdrop-filter: blur(16px);
  box-shadow: 0 18px 44px rgba(0,0,0,0.55);
  color: #fff; display: none;
}
.panel.open { display: block; }

.head { display: flex; align-items: center; gap: 9px; margin-bottom: 12px; }
.head .logo { width: 24px; height: 24px; }
.head b { font-size: 14px; font-weight: 700; letter-spacing: 0.2px; }
.head .credits { margin-left: auto; font-size: 11px; font-weight: 700; color: ${GOLD}; }
.head .credits[hidden] { display: none; }
.head .ver { margin-left: auto; font-size: 11px; color: rgba(255,255,255,0.4); }
.head .credits:not([hidden]) + .ver { margin-left: 0; }


.row { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 9px 0; }
.row + .row { border-top: 1px solid rgba(255,255,255,0.07); }
.row .name { font-size: 13px; color: rgba(255,255,255,0.9); }
.row .name small { display: block; font-size: 11px; color: rgba(255,255,255,0.42); margin-top: 2px; }

.sw { width: 40px; height: 22px; border-radius: 11px; border: 0; padding: 0; flex: none; cursor: pointer;
      background: rgba(255,255,255,0.2); position: relative; transition: background 0.18s ease; }
.sw::after { content: ''; position: absolute; top: 3px; left: 3px; width: 16px; height: 16px; border-radius: 50%;
             background: #fff; transition: transform 0.18s ease; }
.sw.on { background: ${GOLD}; }
.sw.on::after { transform: translateX(18px); }
.sw:disabled { opacity: 0.35; cursor: not-allowed; }

.langs { display: flex; align-items: center; gap: 8px; }
.langs select, .chip {
  height: 30px; padding: 0 10px; border-radius: 9px; font-size: 12px; font-weight: 600;
  background: rgba(255,255,255,0.09); color: #fff; border: 1px solid rgba(255,255,255,0.14);
}
.langs select { cursor: pointer; }
.langs select option { background: #17171c; color: #fff; }
.langs .arrow { color: rgba(255,255,255,0.45); font-size: 13px; }
.chip { display: grid; place-items: center; color: ${GOLD}; border-color: rgba(242,193,78,0.45); }

.slider { display: block; padding: 9px 0; }
.slider + .slider { border-top: 1px solid rgba(255,255,255,0.07); }
.slider .top { display: flex; justify-content: space-between; align-items: flex-start; font-size: 13px; margin-bottom: 8px; gap: 10px; }
.slider small { display: block; font-size: 11px; color: rgba(255,255,255,0.42); margin-top: 2px; }
.slider .val { color: ${GOLD}; font-weight: 600; font-variant-numeric: tabular-nums; flex: none; }
input[type=range] { -webkit-appearance: none; width: 100%; height: 4px; border-radius: 2px; background: rgba(255,255,255,0.2); }
input[type=range]::-webkit-slider-thumb {
  -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%;
  background: ${GOLD}; cursor: pointer; box-shadow: 0 1px 4px rgba(0,0,0,0.5);
}

.actions { display: flex; gap: 8px; margin-top: 12px; }
.btn {
  flex: 1; height: 34px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.16);
  background: rgba(255,255,255,0.08); color: #fff; font-size: 12px; font-weight: 600; cursor: pointer;
}
.btn:hover { background: rgba(255,255,255,0.15); }
.btn.gold { background: ${GOLD}; border-color: ${GOLD}; color: #17130a; }
.btn.gold:hover { filter: brightness(1.08); }
.btn:disabled { opacity: 0.45; cursor: not-allowed; }

.status { margin-top: 10px; font-size: 11px; line-height: 1.4; color: rgba(255,255,255,0.55); min-height: 15px; }
.status.err { color: #ff9a9a; }
.status.ok { color: #9ae6a0; }
`;

  const CHEV = '<svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>';

  function create(opts) {
    const host = document.createElement('div');
    host.style.cssText = 'position:absolute;top:14px;left:14px;z-index:61;';
    const root = host.attachShadow({ mode: 'open' });

    const logoUrl = opts.logoUrl;
    root.innerHTML = `
<style>${CSS}</style>
<div class="wrap">
  <div class="pill" part="pill">
    <img class="logo" src="${logoUrl}" alt="">
    <span class="label">UZ</span>
    <button class="chev" title="Sozlamalar">${CHEV}</button>
  </div>

  <div class="panel">
    <div class="head">
      <img class="logo" src="${logoUrl}" alt="">
      <b>ShumDublaj</b>
      <span class="credits" hidden></span>
      <span class="ver">${opts.version}</span>
    </div>


    <div class="row">
      <div class="name">Video dublyaji<small>O'zbekcha ovoz</small></div>
      <button class="sw" data-sw="enabled"></button>
    </div>

    <div class="row">
      <div class="name">Til</div>
      <div class="langs">
        <select data-sel="source">
          <option value="auto">Avtomatik</option>
          <option value="en">Ingliz</option>
          <option value="ru">Rus</option>
        </select>
        <span class="arrow">&rsaquo;</span>
        <span class="chip">O'zbek</span>
      </div>
    </div>

    <label class="slider">
      <div class="top">
        <span>Asl ovoz<small>tarjima jim turganda: musiqa va tovushlar</small></span>
        <span class="val" data-val="idle"></span>
      </div>
      <input type="range" min="0" max="100" step="1" data-range="idle">
    </label>

    <label class="slider">
      <div class="top">
        <span>Gapirganda asl ovoz<small>o'zbekcha ovoz gapirayotganda</small></span>
        <span class="val" data-val="duck"></span>
      </div>
      <input type="range" min="0" max="100" step="1" data-range="duck">
    </label>

    <label class="slider">
      <div class="top">
        <span>Dublyaj ovozi<small>o'zbekcha ovoz balandligi</small></span>
        <span class="val" data-val="dub"></span>
      </div>
      <input type="range" min="10" max="100" step="1" data-range="dub">
    </label>

    <div class="row">
      <div class="name">O'zbekcha subtitrlar<small>tez orada</small></div>
      <button class="sw" data-sw="subs" disabled></button>
    </div>

    <div class="actions">
      <button class="btn" data-act="regen">Qayta ovozlash</button>
      <button class="btn gold" data-act="toggle">Yoqish</button>
    </div>

    <div class="status"></div>
  </div>
</div>`;

    const el = {
      host,
      root,
      pill: root.querySelector('.pill'),
      label: root.querySelector('.pill .label'),
      chev: root.querySelector('.chev'),
      panel: root.querySelector('.panel'),
      credits: root.querySelector('.credits'),
      status: root.querySelector('.status'),
      toggleBtn: root.querySelector('[data-act="toggle"]'),
      regenBtn: root.querySelector('[data-act="regen"]'),
      swEnabled: root.querySelector('[data-sw="enabled"]'),
      source: root.querySelector('[data-sel="source"]'),
      ranges: {
        idle: root.querySelector('[data-range="idle"]'),
        duck: root.querySelector('[data-range="duck"]'),
        dub: root.querySelector('[data-range="dub"]'),
      },
      vals: {
        idle: root.querySelector('[data-val="idle"]'),
        duck: root.querySelector('[data-val="duck"]'),
        dub: root.querySelector('[data-val="dub"]'),
      },
    };

    // Клики внутри панели не должны доходить до плеера: иначе YouTube ставит паузу
    for (const ev of ['click', 'dblclick', 'mousedown', 'pointerdown', 'keydown', 'wheel']) {
      el.host.addEventListener(ev, (e) => e.stopPropagation());
    }

    el.pill.addEventListener('click', (e) => {
      if (e.target.closest('.chev')) return;
      opts.onToggle();
    });
    el.chev.addEventListener('click', () => {
      const open = el.panel.classList.toggle('open');
      el.chev.classList.toggle('open', open);
    });
    el.swEnabled.addEventListener('click', opts.onToggle);
    el.toggleBtn.addEventListener('click', opts.onToggle);
    el.regenBtn.addEventListener('click', opts.onRegen);
    el.source.addEventListener('change', () => opts.onSource(el.source.value));

    for (const key of ['idle', 'duck', 'dub']) {
      el.ranges[key].addEventListener('input', () => {
        const v = Number(el.ranges[key].value);
        el.vals[key].textContent = `${v}%`;
        opts.onVolume(key, v / 100);
      });
    }

    return el;
  }

  function setState(el, s) {
    el.pill.classList.toggle('on', s.on && !s.busy);
    el.pill.classList.toggle('busy', Boolean(s.busy));
    el.label.textContent = s.busy && s.percent != null ? `${s.percent}%` : 'UZ';
    el.pill.title = s.on ? "O'zbekcha ovoz yoniq" : "O'zbekcha ovozni yoqish";
    el.swEnabled.classList.toggle('on', s.on);
    el.toggleBtn.textContent = s.on ? "O'chirish" : 'Yoqish';
    el.toggleBtn.disabled = Boolean(s.busy);
    el.regenBtn.disabled = Boolean(s.busy);
  }

  function setStatus(el, text, kind) {
    el.status.textContent = text || '';
    el.status.className = 'status' + (kind ? ' ' + kind : '');
  }

  // Остаток кредитов приходит от сервера вместе с заданием. Пока клиент
  // не вошёл или ещё ничего не запускал, показывать нечего.
  function setCredits(el, value) {
    if (value === null || value === undefined) {
      el.credits.hidden = true;
      el.credits.textContent = '';
      return;
    }
    el.credits.hidden = false;
    el.credits.textContent = `${value} kredit`;
  }

  function setVolumes(el, v) {
    for (const key of ['idle', 'duck', 'dub']) {
      const pct = Math.round(v[key] * 100);
      el.ranges[key].value = String(pct);
      el.vals[key].textContent = `${pct}%`;
    }
  }

  return { create, setState, setStatus, setCredits, setVolumes };
})();
