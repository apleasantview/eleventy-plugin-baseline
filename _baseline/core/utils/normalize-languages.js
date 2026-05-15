/**
 * Normalize language input to an object map.
 * Accepts an array of language codes or an object keyed by language code.
 * Returns undefined if input is invalid or empty.
 *
 * @param {Object} settings - Options object containing languages.
 * @param {import('../logging.js').BaselineLogger} [logger] - Logger for dropped-entry notice.
 * @returns {Record<string, Object>|undefined} Normalized language map, or undefined.
 */
export function normalizeLanguages(settings, logger) {
	const normalizedLanguages = Array.isArray(settings.languages)
		? Object.fromEntries(
				settings.languages
					.filter((lang) => typeof lang === 'string' && lang.trim())
					.map((lang) => [lang.toLowerCase().trim(), {}])
			)
		: settings.languages && typeof settings.languages === 'object'
			? settings.languages
			: undefined;

	if (logger && Array.isArray(settings.languages)) {
		const normalizedCount = normalizedLanguages ? Object.keys(normalizedLanguages).length : 0;
		if (normalizedCount !== settings.languages.length) {
			logger.info('Some languages entries were invalid and were dropped.');
		}
	}
	return normalizedLanguages;
}
