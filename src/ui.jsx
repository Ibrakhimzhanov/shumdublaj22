import React from 'react';

/* Иконки макета: тонкая линия, stroke-width 1.8-2.2, currentColor. */

const P = {
  mic: <><path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3zM19 11a7 7 0 0 1-14 0" /></>,
  gear: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.09a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.09a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1z" /></>,
  file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></>,
  close: <><path d="M6 6l12 12M18 6L6 18" /></>,
  upload: <><path d="M12 15V3m0 0L7 8m5-5l5 5M4 21h16" /></>,
  uploadBox: <><path d="M12 16V4m0 0L7 9m5-5l5 5" /><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" /></>,
  download: <><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 19h16" /></>,
  archive: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></>,
  trash: <><path d="M4 7h16M9 7V5h6v2m-8 0l1 13h8l1-13" /></>,
  chevron: <><path d="M9 6l6 6-6 6" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></>,
  filters: <><path d="M4 6h16M7 12h10M10 18h4" /></>,
  copy: <><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></>,
  pencil: <><path d="M17 3l4 4L8 20H4v-4z" /></>,
  lock: <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  check: <><path d="M20 6L9 17l-5-5" /></>,
  alert: <><path d="M12 9v4m0 4h.01M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 8v4m0 4h.01" /></>,
  help: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 0 1 5 .3c0 1.7-2.5 2.2-2.5 3.7M12 17h.01" /></>,
  send: <><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" /></>,
  logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></>,
  wave: <><path d="M3 12h2M7 8v8M11 5v14M15 8v8M19 10v4" /></>,
  sparkle: <><path d="M12 3l1.8 4.7 4.7 1.8-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3z" /></>,
  music: <><path d="M9 18V6l12-2v12" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></>,
  update: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></>,
  refresh: <><path d="M21 12a9 9 0 1 1-3-6.7M21 3v6h-6" /></>
};

export function Icon({ name, size = 14, sw = 2, style, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0, ...style }} className={className}>
      {P[name] || null}
    </svg>
  );
}

export const PLAY_PATH = 'M8 5v14l11-7z';
export const PAUSE_PATH = 'M6 5h4v14H6zM14 5h4v14h-4z';

export function PlayIcon({ playing, size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
      <path d={playing ? PAUSE_PATH : PLAY_PATH} />
    </svg>
  );
}

export function Star({ on, size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={on ? 'var(--gold)' : 'none'}
      stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M12 2.6l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.5l-5.9 3.1 1.2-6.5L2.5 9.5l6.6-.9z" />
    </svg>
  );
}

export const Spinner = ({ size = 'md', gold }) => (
  <span className={'spinner ' + size + (gold ? ' on-gold' : '')} />
);

/* Числовой параметр: и ползунок, и поле ввода - люди задают конкретные числа. */
export function SliderRow({ label, value, min, max, step, onChange, hint, disabled }) {
  const clamp = (v) => Math.max(min, Math.min(max, v));
  const round = (v) => {
    const stepped = Math.round((v - min) / step) * step + min;
    return Number(stepped.toFixed(4));
  };
  const commit = (raw) => {
    const v = parseFloat(raw);
    if (!Number.isFinite(v)) return;
    onChange(clamp(round(v)));
  };
  return (
    <div style={{ marginTop: 12 }}>
      <div className="set-label">{label}</div>
      <div className="slider-row">
        <input type="range" min={min} max={max} step={step} value={value} disabled={disabled}
          onChange={(e) => commit(e.target.value)} />
        <input type="number" className="num-input" min={min} max={max} step={step} value={value} disabled={disabled}
          onChange={(e) => commit(e.target.value)} />
      </div>
      {hint ? <div style={{ fontSize: 11.5, color: 'var(--ink3)', marginTop: 5 }}>{hint}</div> : null}
    </div>
  );
}

export function Segmented({ options, value, onChange }) {
  return (
    <div className="seg">
      {options.map(o => (
        <button key={String(o.value)} className={o.value === value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

const TOAST_COLOR = { ok: 'var(--ok)', info: 'var(--gold)', warn: 'var(--warn)', err: 'var(--err)' };

export function Toasts({ items, onHold, onRelease, onClose }) {
  return (
    <div className="toasts">
      {items.map(t => (
        <div key={t.id} className="toast" onMouseEnter={() => onHold(t.id)} onMouseLeave={() => onRelease(t.id)}>
          <span className="dot" style={{ background: TOAST_COLOR[t.type] || 'var(--gold)' }} />
          <span className="msg">{t.msg}</span>
          <button className="x" onClick={() => onClose(t.id)}><Icon name="close" size={10} sw={2.4} /></button>
        </div>
      ))}
    </div>
  );
}

export function Confirm({ data, onNo, cancelLabel }) {
  if (!data) return null;
  return (
    <div className="modal-scrim" style={{ zIndex: 85 }}>
      <div className="modal narrow">
        <div className="modal-title">{data.title}</div>
        <div className="modal-sub">{data.sub}</div>
        <div className="modal-row">
          <button className="btn-outline" style={{ color: 'var(--ink)' }} onClick={onNo}>{cancelLabel || 'Отмена'}</button>
          <button className="btn-danger" onClick={data.onYes}>{data.act}</button>
        </div>
      </div>
    </div>
  );
}
