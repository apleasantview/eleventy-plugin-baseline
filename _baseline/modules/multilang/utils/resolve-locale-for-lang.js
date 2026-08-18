import { normalizeLocale } from '../../../core/locale/index.js';

/**
 * Resolve a language's locale: configured entry first, then the bare language
 * tag, then the site default.
 *
 * The middle rung is the load-bearing one. Array-form config
 * (`languages: ['en', 'nl']`) normalises to entries with no `locale`, so
 * without it an nl page inherits the default language's locale.
 *
 * @param {string} lang - Normalised language subtag.
 * @param {Record<string, { locale?: string }>} [languages] - Normalised language map.
 * @param {string} [defaultLocale] - Site default, the last resort.
 * @returns {string|null}
 */
export function resolveLocaleForLang(lang, languages, defaultLocale) {
	return normalizeLocale(languages?.[lang]?.locale) ?? normalizeLocale(lang) ?? defaultLocale;
}
