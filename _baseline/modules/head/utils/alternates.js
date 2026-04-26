export function buildAlternates(translationKey, translationsMap, siteUrl) {
	if (!translationKey || !translationsMap) return [];
	const variants = translationsMap[translationKey];
	if (!variants) return [];
	return Object.values(variants).flatMap((entry) => {
		if (!entry?.url) return [];
		const href = siteUrl ? new URL(entry.url, siteUrl).href : entry.url;
		const link = { rel: 'alternate', hreflang: entry.lang, href };
		return entry.isDefaultLang ? [link, { ...link, hreflang: 'x-default' }] : [link];
	});
}
