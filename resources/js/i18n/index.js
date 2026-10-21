import ar from './ar.json';
import bn from './bn.json';

// English text is the key (gettext style). A missing translation falls back to the English text, so nothing ever renders blank.
export const LANGS = [
    { code: 'en', name: 'English', short: 'EN', dir: 'ltr', locale: 'en-GB' },
    { code: 'bn', name: 'বাংলা', short: 'BN', dir: 'ltr', locale: 'bn-BD' },
    { code: 'ar', name: 'العربية', short: 'AR', dir: 'rtl', locale: 'ar' },
];
export const isLang = (c) => LANGS.some((l) => l.code === c);
const DICT = { bn, ar };

let current = 'en';
export const setCurrentLang = (code) => { if (isLang(code)) current = code; };
export const currentLang = () => LANGS.find((l) => l.code === current) ?? LANGS[0];

/** t('Add New') -> "নতুন যোগ করুন" / "إضافة جديد". Placeholders: t('Showing {n} of {total}', { n, total }). */
export function t(text, vars) {
    let out = current === 'en' ? text : (DICT[current]?.[text] ?? text);
    if (vars) out = out.replace(/\{(\w+)\}/g, (m, k) => (vars[k] ?? m));
    return out;
}
export const dir = () => currentLang().dir;
export const locale = () => currentLang().locale;
export const dictionaries = DICT;
