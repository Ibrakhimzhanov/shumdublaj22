/* Модели синтеза. У каждой свой набор параметров: настройки озвучки
   обязаны это выдерживать, вплоть до модели, у которой параметров нет вовсе.

   В API единая шкала: speed = 100 означает 1.0x, остальное 0..100.
   В интерфейсе скорость показываем множителем, поэтому у параметра есть ui-шкала. */

export const MODELS = [
  {
    id: 'shum',
    engine: 'elevenLabsV3',
    name: 'Shum V3',
    desc: 'Флагман: живые интонации',
    params: [
      { key: 'speed', kind: 'range', label: 'Скорость', min: 70, max: 120, step: 1, def: 100, ui: 'x' }
    ],
    // Стабильность у V3 имеет ровно три рабочих положения - показываем их словами.
    named: {
      key: 'stability',
      label: 'Характер речи',
      def: 50,
      options: [
        { value: 100, label: 'Спокойный' },
        { value: 50, label: 'Нейтральный' },
        { value: 0, label: 'Выразительный' }
      ]
    }
  },
  {
    id: 'aria',
    engine: 'elevenLabs',
    name: 'Aria Pro',
    desc: 'Тонкая настройка тембра',
    params: [
      { key: 'speed', kind: 'range', label: 'Скорость', min: 70, max: 120, step: 1, def: 100, ui: 'x' },
      { key: 'stability', kind: 'range', label: 'Стабильность', min: 0, max: 100, step: 1, def: 50 },
      { key: 'similarity', kind: 'range', label: 'Похожесть', min: 0, max: 100, step: 1, def: 75 },
      { key: 'style', kind: 'range', label: 'Выразительность', min: 0, max: 100, step: 1, def: 30 }
    ],
    toggle: { key: 'use_speaker_boost', label: 'Усилитель чёткости', def: false }
  },
  {
    id: 'turbo',
    engine: 'fish',
    name: 'Turbo',
    desc: 'Быстро и экономно',
    params: [
      { key: 'speed', kind: 'range', label: 'Скорость', min: 50, max: 150, step: 5, def: 100, ui: 'x' },
      { key: 'stability', kind: 'range', label: 'Стабильность', min: 0, max: 100, step: 10, def: 0 }
    ]
  },
  {
    id: 'lite',
    engine: 'panda',
    name: 'Lite',
    desc: 'Черновая озвучка, без настроек',
    params: [],
    noParamsNote: 'У модели Lite нет настраиваемых параметров - она всегда работает с базовыми настройками. Выберите другую модель, если нужна тонкая настройка.'
  }
];

export const modelById = (id) => MODELS.find(m => m.id === id) || MODELS[0];

export function defaultParams(id) {
  const m = modelById(id);
  const out = {};
  for (const p of m.params) out[p.key] = p.def;
  if (m.named) out[m.named.key] = m.named.def;
  if (m.toggle) out[m.toggle.key] = m.toggle.def;
  return out;
}

export function defaultAllParams() {
  const out = {};
  for (const m of MODELS) out[m.id] = defaultParams(m.id);
  return out;
}

// Голос поддерживает не все движки. Сравниваем без учёта регистра:
// в каталоге встречается и elevenLabsV3, и elevenlabsV3.
export function voiceSupports(voice, engine) {
  if (!voice) return true;
  const list = voice.voice_engines || [];
  if (!list.length) return true;
  const want = String(engine).toLowerCase();
  return list.some(e => String(e).toLowerCase() === want);
}

export function engineSettings(modelId, params) {
  const m = modelById(modelId);
  const src = params || {};
  const out = {};
  for (const p of m.params) {
    const v = Number(src[p.key]);
    out[p.key] = Number.isFinite(v) ? v : p.def;
  }
  if (m.named) {
    const v = Number(src[m.named.key]);
    out[m.named.key] = Number.isFinite(v) ? v : m.named.def;
  }
  if (m.toggle) out[m.toggle.key] = !!src[m.toggle.key];
  return out;
}

export const uiValue = (p, v) => (p.ui === 'x' ? Number((v / 100).toFixed(2)) : v);
export const apiValue = (p, v) => (p.ui === 'x' ? Math.round(v * 100) : Math.round(v));
export const uiStep = (p) => (p.ui === 'x' ? p.step / 100 : p.step);
export const uiMin = (p) => (p.ui === 'x' ? p.min / 100 : p.min);
export const uiMax = (p) => (p.ui === 'x' ? p.max / 100 : p.max);
