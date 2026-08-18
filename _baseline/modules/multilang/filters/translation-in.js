/**
 * One named language variant of a page, or null when it does not exist.
 *
 * @param {{translationKey?: string}} page
 * @param {Record<string, Record<string, object>>|null} map
 * @param {string} lang
 * @returns {object|null}
 */
export default function translationIn(page, map, lang) {
	const variants = page?.translationKey ? map?.[page.translationKey] : null;
	return variants?.[lang] ?? null;
}
