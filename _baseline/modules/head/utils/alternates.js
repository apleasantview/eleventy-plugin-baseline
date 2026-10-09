export function buildAlternates(translationKey, translationsMap, siteUrl) {
	if (!translationKey || !translationsMap) return [];
	const variants = translationsMap[translationKey];
	if (!variants) return [];
	// hreflang is an unordered set, so this is for stable output rather than
	// meaning. Built from the graph, which reshuffles without it.
	const sorted = Object.values(variants).sort((a, b) => String(a?.lang ?? '').localeCompare(String(b?.lang ?? '')));
	return sorted.flatMap((entry) => {
		if (!entry?.url) return [];
		const href = siteUrl ? new URL(entry.url, siteUrl).href : entry.url;
		const link = { rel: 'alternate', hreflang: entry.lang, href };
		return entry.isDefaultLang ? [link, { ...link, hreflang: 'x-default' }] : [link];
	});
}
