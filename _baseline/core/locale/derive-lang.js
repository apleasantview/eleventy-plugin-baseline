/**
 * Extract the short language subtag from a BCP 47 tag.
 *
 * `'en-US'` → `'en'`, `'zh-Hant-HK'` → `'zh'`. Normalises internally via
 * `Intl.Locale`; caller passes raw input. Returns null for empty input
 * or tags `Intl.Locale` rejects.
 *
 * @param {unknown} locale
 * @returns {string | null}
 */
export function deriveLang(locale) {
	if (locale == null) return null;
	const str = String(locale).trim();
	if (str === '') return null;
	try {
		return new Intl.Locale(str).language;
	} catch {
		return null;
	}
}
