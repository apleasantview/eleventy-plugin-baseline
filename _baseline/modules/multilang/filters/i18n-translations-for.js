/**
 * Get all translations for the current page.
 * @param {object} page
 * @param {Array<object>} collection
 * @returns {Array<object>}
 */
export default function i18nTranslationsFor(page, collection) {
	if (!page?.translationKey) return [];
	return collection.filter((p) => p.translationKey === page.translationKey);
}
