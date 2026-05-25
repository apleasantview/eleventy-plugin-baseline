import { normalizeLang } from './normalize-lang.js';
import { normalizeLocale } from './normalize-locale.js';
import { deriveLang } from './derive-lang.js';

/**
 * Resolve the effective `{ lang, locale }` default from settings.
 *
 * Accepts `settings.defaultLocale` (BCP 47) and/or `settings.defaultLanguage`
 * (short code). When both are present, `defaultLocale` wins and a mismatch
 * between the two is warned via the provided logger but does not throw.
 *
 * When only one is given, the missing half is derived: a `defaultLanguage`
 * looks up `settings.languages[lang].locale` for its expansion; a
 * `defaultLocale` extracts the short subtag via `Intl.Locale`.
 *
 * @param {{
 *   defaultLanguage?: string,
 *   defaultLocale?: string,
 *   languages?: Record<string, { locale?: string }>
 * }} settings
 * @param {{ warn?: (msg: string) => void }} [log]
 * @returns {{ lang: string, locale: string | null }}
 */
export function resolveDefault(settings, log) {
	const explicitLang = normalizeLang(settings?.defaultLanguage);
	const explicitLocale = normalizeLocale(settings?.defaultLocale);

	if (explicitLocale && explicitLang) {
		const derivedLang = deriveLang(explicitLocale);
		if (derivedLang && derivedLang !== explicitLang) {
			log?.warn?.(
				`defaultLocale "${explicitLocale}" and defaultLanguage "${explicitLang}" disagree; defaultLocale wins`
			);
		}
		return { lang: derivedLang ?? explicitLang, locale: explicitLocale };
	}

	if (explicitLocale) {
		return { lang: deriveLang(explicitLocale) ?? '', locale: explicitLocale };
	}

	if (explicitLang) {
		const fromLanguages = normalizeLocale(settings?.languages?.[explicitLang]?.locale);
		return { lang: explicitLang, locale: fromLanguages ?? null };
	}

	return { lang: '', locale: null };
}
