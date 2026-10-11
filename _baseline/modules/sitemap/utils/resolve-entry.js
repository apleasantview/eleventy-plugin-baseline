import { classify, resolveDates } from '../../../core/dates/index.js';

/**
 * Resolve one page's sitemap entry from the cascade. `sitemap` is the author's
 * key, read here and never written. `lastmod` leaves as a string, so the
 * template formats nothing.
 *
 * @param {Object} data - The full cascade data bag.
 * @param {Object} [dateContext] - Passed to `resolveDates`.
 * @returns {{ ignore: boolean, changefreq: string|undefined, priority: number|undefined, lastmod: string|undefined }}
 */
export function resolveSitemapEntry(data, dateContext) {
	const authored = data?.sitemap ?? {};

	// `seo.noindex` wins over bare `noindex`, including when it overrides it to
	// false, so a page can opt back into a sitemap its directory excluded.
	const noindex = data?.seo?.noindex ?? data?.noindex;

	const resolved = resolveDates(data, dateContext).dateModified;
	const authoredLastmod = classify(authored.lastmod, dateContext?.timeZone);

	return {
		ignore: authored.ignore === true || noindex === true,
		changefreq: authored.changefreq || undefined,
		priority: authored.priority ?? undefined,
		lastmod: (authoredLastmod ?? resolved)?.value
	};
}
