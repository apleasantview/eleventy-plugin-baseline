/**
 * Backlink index (runtime substrate)
 *
 * Inverts the per-page outbound links into a target-keyed lookup. Built
 * once at graph time so accessor reads are a hash lookup, not a scan
 * over every page.
 *
 * Architecture layer:
 *   runtime substrate
 *
 * System role:
 *   Cross-page index built alongside the per-page records. Lives outside
 *   the per-page extractors because A's backlinks can only be known
 *   after walking B, C, D's outgoing links.
 *
 * Lifecycle:
 *   build-time → buildGraph calls this once over the records map
 *
 * Why this exists:
 *   Eleventy has no notion of inverse references. Templates that want
 *   to render "what links here" need this index built up front.
 *
 * Scope:
 *   Owns the inversion logic and fragment-stripping rule (so /foo/#x
 *   folds into /foo/).
 *   Does not own outbound link extraction (extractors.js) or how the
 *   index is exposed to templates (graph.js / index.js).
 *
 * Data flow:
 *   per-page records → inverted lookup keyed by target url
 */

/**
 * @param {Record<string, { links: Array<{ href: string, internal: boolean }>, excerpt?: string }>} records
 * @param {Record<string, { title?: string }>} [sourceMeta] - Per-source metadata to enrich entries with.
 * @returns {Record<string, Array<{ url: string, title?: string, excerpt?: string }>>}
 */
export function buildBacklinkIndex(records, sourceMeta = {}) {
	const index = {};
	const seen = {};

	for (const [sourceUrl, page] of Object.entries(records)) {
		for (const link of page.links) {
			if (!link.internal || !link.href) continue;

			// Strip fragments so /foo/#section folds into /foo/.
			const target = link.href.split('#')[0] || link.href;

			if (!index[target]) {
				index[target] = [];
				seen[target] = new Set();
			}
			if (seen[target].has(sourceUrl)) continue;
			seen[target].add(sourceUrl);

			index[target].push({
				url: sourceUrl,
				title: sourceMeta[sourceUrl]?.title,
				excerpt: page.excerpt
			});
		}
	}

	return index;
}
