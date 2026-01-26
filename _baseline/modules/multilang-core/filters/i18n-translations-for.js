/**
 * Get all translations for the current page.
 * @param {object} page
 * @param {Array<object>} collection
 * @returns {Array<object>}
 */
export default function i18nTranslationsFor(page, collection) {
	if (!page?.locale?.translationKey) return [];
	return collection.filter((p) => p.locale && p.locale.translationKey === page.locale.translationKey);
}
