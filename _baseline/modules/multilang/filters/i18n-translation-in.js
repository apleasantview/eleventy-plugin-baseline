/**
 * Get a specific language variant for the current page.
 * @param {object} page
 * @param {Array<object>} collection
 * @param {string} lang
 * @returns {object|null}
 */
export default function i18nTranslationIn(page, collection, lang) {
	if (!page?.locale?.translationKey) return null;

	return (
		collection.find(
			(p) => p.locale && p.locale.translationKey === page.locale.translationKey && p.locale.lang === lang
		) || null
	);
}
