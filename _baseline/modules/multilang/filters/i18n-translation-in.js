/**
 * Get a specific language variant for the current page.
 * @param {object} page
 * @param {Array<object>} collection
 * @param {string} lang
 * @returns {object|null}
 */
export default function i18nTranslationIn(page, collection, lang) {
	if (!page?.translationKey) return null;

	return (
		collection.find(
			(p) => p.translationKey === page.translationKey && p.lang === lang
		) || null
	);
}
