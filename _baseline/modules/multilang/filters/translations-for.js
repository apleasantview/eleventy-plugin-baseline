/**
 * Every language variant of a page, the page itself included.
 *
 * Reads the translation map rather than taking a collection, so it works for
 * any page rather than only the one being rendered. `page.translations` is the
 * shorter route when you want the current page's siblings.
 *
 * @param {{translationKey?: string}} page
 * @param {Record<string, Record<string, object>>|null} map
 * @returns {Array<object>}
 */
export default function translationsFor(page, map) {
	const variants = page?.translationKey ? map?.[page.translationKey] : null;
	if (!variants) return [];

	return Object.values(variants).sort((a, b) => a.lang.localeCompare(b.lang));
}
