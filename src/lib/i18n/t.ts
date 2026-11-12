import en from './messages/en.json';
import hi from './messages/hi.json';
import mr from './messages/mr.json';

const catalogs = { en, hi, mr } as const;
type Lang = keyof typeof catalogs;

let currentLang: Lang = 'en';

export function setLang(lang: Lang) {
  currentLang = lang;
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lang;
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `kavach-lang=${lang}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
  }
}

export function getLang(): Lang {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('kavach-lang') as Lang | null;
    if (stored && catalogs[stored]) {
      currentLang = stored;
    }
  }
  return currentLang;
}

export function t(key: string, params?: Record<string, string | number>, language?: Lang): string {
  const lang = language || getLang();
  // Catalogs are flat with dot-notation keys
  let value: string | undefined = (catalogs[lang] as Record<string, string>)[key];
  if (value === undefined || value === '') {
    value = (catalogs.en as Record<string, string>)[key];
  }
  if (typeof value !== 'string') {
    return key;
  }
  if (params) {
    return Object.entries(params).reduce((str, [k, v]) => str.replace(`{${k}}`, String(v)), value);
  }
  return value;
}

export function useLang() {
  return { lang: getLang(), setLang, t };
}

export const SUPPORTED_LANGS = ['en', 'hi', 'mr'] as const;
export type SupportedLang = (typeof SUPPORTED_LANGS)[number];
