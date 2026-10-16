/* Форматирование дат, чисел и справочных значений каталога.
   Язык переключается один раз из App через setLocale, поэтому вызывающим
   экранам ничего передавать не нужно. */

let LOCALE = 'ru';
export function setLocale(l) { LOCALE = (l === 'uz') ? 'uz' : 'ru'; }
export const locale = () => LOCALE;

const pick = (ru, uz) => (LOCALE === 'uz' ? uz : ru);

const MONTHS = {
  ru: ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'],
  uz: ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avg', 'sen', 'okt', 'noy', 'dek']
};

const MONTHS_FULL = {
  ru: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'],
  uz: ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr']
};

export const num = (n) => Number(n || 0).toLocaleString(pick('ru-RU', 'uz-UZ'));

export function fmtTime(sec) {
  const x = Math.max(0, Math.floor(Number(sec) || 0));
  return Math.floor(x / 60) + ':' + ('0' + (x % 60)).slice(-2);
}

const two = (n) => ('0' + n).slice(-2);

const sameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

function parse(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d) ? null : d;
}

export function fmtDate(iso) {
  const d = parse(iso);
  if (!d) return iso ? String(iso) : '';
  const now = new Date();
  const yest = new Date(now.getTime() - 86400000);
  const hm = two(d.getHours()) + ':' + two(d.getMinutes());
  if (sameDay(d, now)) return pick('Сегодня, ', 'Bugun, ') + hm;
  if (sameDay(d, yest)) return pick('Вчера, ', 'Kecha, ') + hm;
  return pick(
    d.getDate() + ' ' + MONTHS.ru[d.getMonth()] + ', ' + hm,
    d.getDate() + '-' + MONTHS.uz[d.getMonth()] + ', ' + hm
  );
}

export function fmtDateShort(iso) {
  const d = parse(iso);
  if (!d) return iso ? String(iso) : '';
  const now = new Date();
  const yest = new Date(now.getTime() - 86400000);
  const hm = two(d.getHours()) + ':' + two(d.getMinutes());
  if (sameDay(d, now)) return hm;
  if (sameDay(d, yest)) return pick('вчера ', 'kecha ') + hm;
  return pick(
    d.getDate() + ' ' + MONTHS.ru[d.getMonth()] + ' ' + hm,
    d.getDate() + '-' + MONTHS.uz[d.getMonth()] + ' ' + hm
  );
}

export function fmtDateLong(iso) {
  const d = parse(iso);
  if (!d) return iso ? String(iso) : '';
  return pick(
    d.getDate() + ' ' + MONTHS_FULL.ru[d.getMonth()] + ' ' + d.getFullYear(),
    d.getDate() + '-' + MONTHS_FULL.uz[d.getMonth()] + ' ' + d.getFullYear()
  );
}

export function fmtMb(bytes) {
  const mb = (Number(bytes) || 0) / (1024 * 1024);
  const v = mb >= 10 ? Math.round(mb) : mb.toFixed(1);
  return v + pick(' МБ', ' MB');
}

export function fmtEta(sec) {
  const s = Math.max(0, Math.round(Number(sec) || 0));
  if (s <= 2) return pick('почти готово', 'deyarli tayyor');
  if (s >= 60) {
    const m = Math.round(s / 60);
    return pick('осталось ≈ ' + m + ' мин', 'taxminan ' + m + ' daqiqa qoldi');
  }
  return pick('осталось ≈ ' + s + ' сек', 'taxminan ' + s + ' soniya qoldi');
}

/* Значения каталога приходят на английском, показываем на языке интерфейса. */

const GENDER = {
  male: ['Мужской', 'Erkak'],
  female: ['Женский', 'Ayol'],
  unknown: ['Не указан', 'Ko‘rsatilmagan'],
  '': ['Не указан', 'Ko‘rsatilmagan']
};

const AGE = {
  young: ['Молодой', 'Yosh'],
  middle_aged: ['Средний возраст', 'O‘rta yosh'],
  'middle-aged': ['Средний возраст', 'O‘rta yosh'],
  adult: ['Средний возраст', 'O‘rta yosh'],
  old: ['Пожилой', 'Keksa'],
  senior: ['Пожилой', 'Keksa'],
  unknown: ['Возраст не указан', 'Yosh ko‘rsatilmagan'],
  '': ['Возраст не указан', 'Yosh ko‘rsatilmagan']
};

const LANG = {
  ru: ['Русский', 'Rus'], russian: ['Русский', 'Rus'],
  en: ['Английский', 'Ingliz'], english: ['Английский', 'Ingliz'],
  uz: ['Узбекский', 'O‘zbek'], uzbek: ['Узбекский', 'O‘zbek'],
  kk: ['Казахский', 'Qozoq'], kazakh: ['Казахский', 'Qozoq'],
  tr: ['Турецкий', 'Turk'], turkish: ['Турецкий', 'Turk'],
  de: ['Немецкий', 'Nemis'], german: ['Немецкий', 'Nemis'],
  es: ['Испанский', 'Ispan'], spanish: ['Испанский', 'Ispan'],
  fr: ['Французский', 'Fransuz'], french: ['Французский', 'Fransuz'],
  it: ['Итальянский', 'Italyan'], italian: ['Итальянский', 'Italyan'],
  pt: ['Португальский', 'Portugal'], portuguese: ['Португальский', 'Portugal'],
  pl: ['Польский', 'Polyak'], polish: ['Польский', 'Polyak'],
  uk: ['Украинский', 'Ukrain'], ukrainian: ['Украинский', 'Ukrain'],
  ar: ['Арабский', 'Arab'], arabic: ['Арабский', 'Arab'],
  zh: ['Китайский', 'Xitoy'], chinese: ['Китайский', 'Xitoy'],
  ja: ['Японский', 'Yapon'], japanese: ['Японский', 'Yapon'],
  ko: ['Корейский', 'Koreys'], korean: ['Корейский', 'Koreys'],
  hi: ['Хинди', 'Hind'],
  multi: ['Мультиязычный', 'Ko‘p tilli'],
  unknown: ['Язык не указан', 'Til ko‘rsatilmagan']
};

const take = (pair) => (pair ? pick(pair[0], pair[1]) : null);

export const gender = (g) => take(GENDER[String(g || '').toLowerCase()]) || String(g || '');
export const age = (a) => take(AGE[String(a || '').toLowerCase()]) || String(a || '');

export function lang(l) {
  const raw = String(l || '').trim();
  if (!raw) return '';
  const low = raw.toLowerCase();
  const direct = take(LANG[low]);
  if (direct) return direct;
  const base = low.split('-')[0];
  return take(LANG[base]) || raw;
}

export function voiceLangs(v) {
  const list = (v && v.supported_languages && v.supported_languages.length)
    ? v.supported_languages
    : [v && v.language].filter(Boolean);
  const out = [];
  for (const l of list) {
    const t = lang(l);
    if (t && !out.includes(t)) out.push(t);
  }
  return out;
}
