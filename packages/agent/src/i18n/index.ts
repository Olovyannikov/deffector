import { en, type Texts } from './en';
import { ru } from './ru';

export type Locale = 'ru' | 'en';

/** Texts the agent produces (diagnostics, notes, compatibility rows). Panel UI texts live in the panel. */
export const texts: Record<Locale, Texts> = { en, ru };

export type { Texts };

export function isLocale(value: unknown): value is Locale {
  return value === 'ru' || value === 'en';
}
