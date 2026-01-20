import en from './locales/en.json';
import es from './locales/es.json';

export type LocaleCode = 'en' | 'es';

export type TranslationKey = keyof typeof en;

const locales: Record<LocaleCode, Record<string, string>> = {
  en,
  es
};

export const SUPPORTED_LOCALES: LocaleCode[] = ['en', 'es'];
export const DEFAULT_LOCALE: LocaleCode = 'en';

/**
 * Normalize a locale string (e.g. "es-MX" -> "es", "en-US" -> "en").
 * Falls back to default if not supported.
 */
export function normalizeLocale(locale: string | undefined | null): LocaleCode {
  if (!locale) return DEFAULT_LOCALE;

  // Try exact match first
  if (SUPPORTED_LOCALES.includes(locale as LocaleCode)) {
    return locale as LocaleCode;
  }

  // Try language part (e.g. "es-MX" -> "es")
  const lang = locale.split('-')[0]?.toLowerCase();
  if (lang && SUPPORTED_LOCALES.includes(lang as LocaleCode)) {
    return lang as LocaleCode;
  }

  return DEFAULT_LOCALE;
}

/**
 * Get a translation for a key, with optional interpolation.
 * Example: t('notification.done.body', 'es', { filename: 'song.m4a' })
 */
export function t(
  key: TranslationKey | string,
  locale: LocaleCode,
  params?: Record<string, string>
): string {
  const dict = locales[locale] || locales[DEFAULT_LOCALE];
  let text = dict[key] ?? locales[DEFAULT_LOCALE][key] ?? key;

  // Simple interpolation: replace {key} with params[key]
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
    }
  }

  return text;
}

/**
 * Create a bound translate function for a specific locale.
 */
export function createTranslator(
  locale: LocaleCode
): (key: TranslationKey | string, params?: Record<string, string>) => string {
  return (key, params) => t(key, locale, params);
}
