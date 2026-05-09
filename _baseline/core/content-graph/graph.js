import { parseHTML } from 'linkedom';

import { extractGraph } from './extractors.js';
import { buildBacklinkIndex } from './backlinks.js';

/**
 * Content graph (runtime substrate)
 *
 * Turns rendered HTML into the per-page record map and inverse-link
 * index that templates query through the cascade. Shape is fixed at v1:
 * text, excerpt, headings, links, images, plus a backlink lookup.
 *
 * Architecture layer:
 *   runtime substrate
 *
 * System role:
 *   The transformation between rendered output and the queryable
 *   per-page records the cascade exposes. Backlink index is built here
 *   so accessor reads stay O(1).
 *
 * Lifecycle:
 *   build-time → buildGraph runs once over the pre-pass output
 *   transform-time → createAccessors hands the cascade a live read surface
 *
 * Why this exists:
 *   Eleventy's cascade can't see across pages or into rendered bodies.
 *   This is the layer that lets it.
 *
 * Scope:
 *   Owns the per-page record shape, the backlink index, and the
 *   getter-backed accessor surface.
 *   Does not own the synthetic Eleventy run (prepass.js) or the
 *   per-page extraction logic (extractors.js).
 *
 * Data flow:
 *   pre-pass pages → linkedom parse → extractors → records + backlinks
 */

/**
 * @param {Array<{ url: string, content?: string, data?: object }>} pages
 * @param {{ knownOrigins?: Set<string> }} [options] - Origins to strip from internal hrefs (HtmlBasePlugin rewrites them at render time).
 * @returns {{ pages: Record<string, object>, backlinks: Record<string, Array<{ url: string, title?: string, excerpt?: string }>> }}
 */
export function buildGraph(pages, options = {}) {
	const records = {};
	const sourceMeta = {};

	for (const page of pages) {
		if (!page?.url || typeof page.content !== 'string') continue;
		if (!page.outputPath?.endsWith('.html')) continue;
		// Honour the same opt-out 404s, drafts and internal templates already use.
		if (page.data?.eleventyExcludeFromCollections === true) continue;

		try {
			const { document } = parseHTML(page.content);
			records[page.url] = extractGraph(document, options);
			sourceMeta[page.url] = { title: page.data?.title };
		} catch {
			// Fail silently — a parse failure on one page should not nuke the graph.
			continue;
		}
	}

	const backlinks = buildBacklinkIndex(records, sourceMeta);

	return { pages: records, backlinks };
}

/**
 * Build the accessor surface templates see through the cascade. Closes
 * over a getter so the underlying graph reference can be swapped (e.g.
 * on serve-mode rebuilds) without re-registering global data.
 *
 * @param {() => ({ pages: Record<string, object>, backlinks: Record<string, Array<{ url: string, title?: string, excerpt?: string }>> } | null)} getGraph
 */
export function createAccessors(getGraph) {
	return {
		isReady: () => getGraph() !== null,
		getPage: (url) => getGraph()?.pages[url],
		getHeadings: (url) => getGraph()?.pages[url]?.headings ?? [],
		getOutgoingLinks: (url) => getGraph()?.pages[url]?.links ?? [],
		getImages: (url) => getGraph()?.pages[url]?.images ?? [],
		getText: (url) => getGraph()?.pages[url]?.text,
		getExcerpt: (url) => getGraph()?.pages[url]?.excerpt,
		getBacklinks: (url) => getGraph()?.backlinks[url] ?? [],
		all: () => getGraph()?.pages ?? {}
	};
}
