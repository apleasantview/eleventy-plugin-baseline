// A base that cannot resolve degrades to the path, which is still a usable
// hreflang, rather than throwing mid-render.
function absolutize(path, siteUrl) {
	if (!siteUrl) return path;

	try {
		return new URL(path, siteUrl).href;
	} catch {
		return path;
	}
}

export function buildAlternates(translationKey, translationsMap, siteUrl) {
	if (!translationKey || !translationsMap) return [];
	const variants = translationsMap[translationKey];
	if (!variants) return [];
	// hreflang is an unordered set, so this is for stable output rather than
	// meaning. Built from the graph, which reshuffles without it.
	const sorted = Object.values(variants).sort((a, b) => String(a?.lang ?? '').localeCompare(String(b?.lang ?? '')));
	return sorted.flatMap((entry) => {
		if (!entry?.url) return [];
		const href = absolutize(entry.url, siteUrl);
		const link = { rel: 'alternate', hreflang: entry.lang, href };
		return entry.isDefaultLang ? [link, { ...link, hreflang: 'x-default' }] : [link];
	});
}
