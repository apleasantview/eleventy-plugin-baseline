/**
 * Normalize a BCP 47 locale tag to conventional casing using `Intl.Locale`.
 *
 * `Intl.Locale` handles language-script-region casing (lang lowercase,
 * script title-case, region uppercase) plus variant and extension subtag
 * rules without reimplementing the spec. Returns null for empty/whitespace
 * input or tags `Intl.Locale` rejects.
 *
 * @param {unknown} raw
 * @returns {string | null}
 */
export function normalizeLocale(raw) {
	if (raw == null) return null;
	const str = String(raw).trim();
	if (str === '') return null;
	try {
		return new Intl.Locale(str).toString();
	} catch {
		return null;
	}
}
