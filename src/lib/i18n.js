/* Язык интерфейса. Строки каждого экрана лежат рядом с ним в файле
   ИмяЭкрана.i18n.js и имеют вид { ru: {...}, uz: {...} }, поэтому экраны
   не мешают друг другу и словарь не превращается в общую свалку.

   Использование в экране:
     import STR from './Library.i18n.js';
     import { makeT } from '../lib/i18n.js';
     const { lang } = useApp();
     const t = useMemo(() => makeT(STR, lang), [lang]);
     t('title')                       -> строка
     t('parts', { n: 4 })             -> подстановка {n}
*/

export const LANGS = [
  { id: 'ru', label: 'Русский' },
  { id: 'uz', label: 'O‘zbekcha' }
];

export const DEFAULT_LANG = 'ru';

export function makeT(dict, lang) {
  const table = (dict && dict[lang]) || (dict && dict[DEFAULT_LANG]) || {};
  const fallback = (dict && dict[DEFAULT_LANG]) || {};
  return function t(key, vars) {
    let s = table[key];
    if (s === undefined) s = fallback[key];
    if (s === undefined) s = key;
    if (vars) {
      for (const k of Object.keys(vars)) {
        s = String(s).split('{' + k + '}').join(String(vars[k]));
      }
    }
    return s;
  };
}
