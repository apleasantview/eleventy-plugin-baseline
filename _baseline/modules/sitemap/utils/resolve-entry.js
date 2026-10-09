/**
 * Resolve one page's sitemap entry from the cascade.
 *
 * `sitemap` is the author's key and is read here, never written: a computed
 * write to it replaces the object rather than filling its gaps, which would
 * discard whatever front matter declared.
 *
 * @param {Object} data - The full cascade data bag.
 * @returns {{ ignore: boolean, changefreq: string|undefined, priority: number|undefined, lastmod: unknown }}
 */
export function resolveSitemapEntry(data) {
	const authored = data?.sitemap ?? {};

	// `seo.noindex` wins over bare `noindex`, including when it overrides it to
	// false, so a page can opt back into a sitemap its directory excluded.
	const noindex = data?.seo?.noindex ?? data?.noindex;

	return {
		ignore: authored.ignore === true || noindex === true,
		changefreq: authored.changefreq || undefined,
		priority: authored.priority ?? undefined,
		lastmod: authored.lastmod ?? data?.page?.date
	};
}
