import { en, type Texts } from './en';
import { ru } from './ru';

export type { Texts } from './en';

export type Locale = 'ru' | 'en';

export const textsByLocale: Record<Locale, Texts> = { en, ru };

/** The browser UI language (the DevTools one inside the extension), English unless it is Russian. */
export function detectLocale(): Locale {
  try {
    const language =
      (typeof chrome !== 'undefined' && chrome.i18n?.getUILanguage?.()) ||
      navigator.language ||
      'en';
    return language.toLowerCase().startsWith('ru') ? 'ru' : 'en';
  } catch {
    return 'en';
  }
}
