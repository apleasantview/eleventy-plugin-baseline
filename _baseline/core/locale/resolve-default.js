import { normalizeLang } from './normalize-lang.js';
import { normalizeLocale } from './normalize-locale.js';
import { deriveLang } from './derive-lang.js';

/**
 * Resolve the effective `{ lang, locale }` default from settings.
 *
 * defaultLocale is preferred; defaultLanguage is a writer-side alias.
 * When both are set, defaultLocale wins silently. When only
 * defaultLanguage is given, locale is derived via `Intl.Locale` (which
 * returns the bare language subtag as a valid BCP 47 tag).
 *
 * @param {{ defaultLanguage?: string, defaultLocale?: string }} settings
 * @returns {{ lang: string, locale: string | null }}
 */
export function resolveDefault(settings) {
	const explicitLang = normalizeLang(settings?.defaultLanguage);
	const explicitLocale = normalizeLocale(settings?.defaultLocale);

	if (explicitLocale) {
		return { lang: deriveLang(explicitLocale) ?? explicitLang, locale: explicitLocale };
	}

	if (explicitLang) {
		return { lang: explicitLang, locale: normalizeLocale(explicitLang) ?? explicitLang };
	}

	return { lang: '', locale: null };
}
