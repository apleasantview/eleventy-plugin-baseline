/**
 * Get the default-language variant for the current page.
 * @param {object} page
 * @param {Array<object>} collection
 * @returns {object|null}
 */
export default function i18nDefaultTranslation(page, collection) {
	if (!page?.translationKey) return null;
	return (
		collection.find((p) => p.translationKey === page.translationKey && p.isDefaultLang) || null
	);
}
