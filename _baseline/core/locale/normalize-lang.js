/**
 * Normalize a short language code: lowercase and trim.
 *
 * The substrate's lightest helper. Empty string for null/undefined; coerces
 * non-string input via `String()`.
 *
 * @param {unknown} raw
 * @returns {string}
 */
export function normalizeLang(raw) {
	if (raw == null) return '';
	return String(raw).toLowerCase().trim();
}
