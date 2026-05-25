/**
 * Normalize a short language code: lowercase and trim.
 *
 * The substrate's lightest helper. Replaces the inline `normalizeLanguageCode`
 * one-liner currently duplicated in multilang and sitemap. Returns an empty
 * string for null/undefined input; coerces non-string input via `String()`.
 *
 * @param {unknown} raw
 * @returns {string}
 */
export function normalizeLang(raw) {
	if (raw == null) return '';
	return String(raw).toLowerCase().trim();
}
