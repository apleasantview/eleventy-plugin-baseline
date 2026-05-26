/**
 * Normalize the `settings.languages` config into an object map with
 * lowercased, trimmed keys.
 *
 * Accepts an array of language codes or an object keyed by language code;
 * either form ends up with `[normalizedKey]: entry`. Returns undefined if
 * the input is invalid or empty.
 *
 * Lives in `core/utils/` (not `core/locale/`) because the array-vs-object
 * shape coercion is config-shape adapting, not locale handling. The
 * lowercasing of keys is the only locale-shaped part.
 *
 * @param {Object} settings - Options object containing languages.
 * @param {import('../logging/index.js').BaselineLogger} [logger] - Logger for dropped-entry notice.
 * @returns {Record<string, Object>|undefined} Normalized language map, or undefined.
 */
export function normalizeLanguageMap(settings, logger) {
	const normalizedLanguages = Array.isArray(settings.languages)
		? Object.fromEntries(
				settings.languages
					.filter((lang) => typeof lang === 'string' && lang.trim())
					.map((lang) => [lang.toLowerCase().trim(), {}])
			)
		: settings.languages && typeof settings.languages === 'object'
			? Object.fromEntries(
					Object.entries(settings.languages).map(([k, v]) => [k.toLowerCase().trim(), v])
				)
			: undefined;

	if (logger && Array.isArray(settings.languages)) {
		const normalizedCount = normalizedLanguages ? Object.keys(normalizedLanguages).length : 0;
		if (normalizedCount !== settings.languages.length) {
			logger.info('Some languages entries were invalid and were dropped.');
		}
	}
	return normalizedLanguages;
}
