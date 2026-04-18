import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export interface Language {
  code: string;
  name: string;
  nativeName: string;
  script: string;
}

export const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', script: 'Latn' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', script: 'Deva' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', script: 'Beng' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', script: 'Telu' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', script: 'Deva' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', script: 'Taml' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', script: 'Gujr' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', script: 'Knda' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', script: 'Mlym' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', script: 'Guru' },
];

type Translations = Record<string, string>;
type AllTranslations = Record<string, Translations>;

interface I18nCtx {
  lang: string;
  setLang: (code: string) => void;
  t: (key: string, replacements?: Record<string, string | number>) => string;
  currentLanguage: Language;
}

const I18nContext = createContext<I18nCtx>({} as I18nCtx);

const translationModules: AllTranslations = {};

export function registerTranslations(code: string, translations: Translations) {
  translationModules[code] = { ...(translationModules[code] || {}), ...translations };
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState(() => localStorage.getItem('lang') || 'en');

  const setLang = useCallback((code: string) => {
    setLangState(code);
    localStorage.setItem('lang', code);
  }, []);

  const t = useCallback(
    (key: string, replacements?: Record<string, string | number>): string => {
      const dict = translationModules[lang] || translationModules['en'] || {};
      let val = dict[key] || translationModules['en']?.[key] || key;
      if (replacements) {
        Object.entries(replacements).forEach(([k, v]) => {
          val = val.replace(`{${k}}`, String(v));
        });
      }
      return val;
    },
    [lang],
  );

  const currentLanguage = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];

  return (
    <I18nContext.Provider value={{ lang, setLang, t, currentLanguage }}>
      {children}
    </I18nContext.Provider>
  );
}

export const useT = () => useContext(I18nContext);
