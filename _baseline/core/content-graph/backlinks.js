/**
 * Pre-compute a reverse index: target url -> list of source urls.
 *
 * Built once at graph time so getBacklinks() is a hash lookup, not a
 * scan over every page on every call.
 *
 * Cross-page by nature — A's backlinks can only be known after walking
 * B, C, D's outgoing links — so this lives outside the per-page extractors.
 *
 * @param {Record<string, { links: Array<{ href: string, internal: boolean }> }>} records
 * @returns {Record<string, string[]>}
 */
export function buildBacklinkIndex(records) {
	const index = {};

	for (const [sourceUrl, page] of Object.entries(records)) {
		for (const link of page.links) {
			if (!link.internal || !link.href) continue;

			// Strip fragments so /foo/#section folds into /foo/.
			const target = link.href.split('#')[0] || link.href;

			if (!index[target]) index[target] = [];
			if (!index[target].includes(sourceUrl)) index[target].push(sourceUrl);
		}
	}

	return index;
}
