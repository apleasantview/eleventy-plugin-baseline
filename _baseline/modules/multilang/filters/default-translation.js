/**
 * The default-language variant of a page, or null when none exists.
 * Handy for canonical resolution and fallbacks.
 *
 * @param {{translationKey?: string}} page
 * @param {Record<string, Record<string, object>>|null} map
 * @returns {object|null}
 */
export default function defaultTranslation(page, map) {
	const variants = page?.translationKey ? map?.[page.translationKey] : null;
	if (!variants) return null;

	return Object.values(variants).find((entry) => entry.isDefaultLang) ?? null;
}
