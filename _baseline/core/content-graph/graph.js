import { parseHTML } from 'linkedom';

import { extractGraph } from './extractors.js';
import { buildBacklinkIndex } from './backlinks.js';

/**
 * Build the content graph from `eleventy.toJSON()` output.
 *
 * Walks rendered pages once, parses each HTML body via linkedom, runs the
 * fixed v1 extractor set, and pre-builds a backlink index so accessors
 * stay O(1).
 *
 * Architecture layer:
 *   pre-pass
 *
 * System role:
 *   The single pass that turns rendered HTML into the queryable per-page
 *   record map the cascade exposes through accessors.
 *
 * Why this exists:
 *   Eleventy's cascade is blind to rendered output. This builds the
 *   structured view of every page's rendered body so templates can read
 *   across pages without re-rendering.
 *
 * @param {Array<{ url: string, content?: string }>} pages
 * @returns {{ pages: Record<string, { text: string, excerpt: string, headings: object[], links: object[], images: object[] }>, backlinks: Record<string, string[]> }}
 */
export function buildGraph(pages) {
	const records = {};

	for (const page of pages) {
		if (!page?.url || typeof page.content !== 'string') continue;
		if (!page.outputPath?.endsWith('.html')) continue;

		try {
			const { document } = parseHTML(page.content);
			records[page.url] = extractGraph(document);
		} catch {
			// Fail silently — a parse failure on one page should not nuke the graph.
			continue;
		}
	}

	const backlinks = buildBacklinkIndex(records);

	return { pages: records, backlinks };
}

/**
 * Build the accessor surface that templates see through the cascade.
 *
 * Closes over a getter so the underlying graph reference can be swapped
 * (e.g. on serve-mode rebuilds) without re-registering global data.
 *
 * @param {() => ({ pages: Record<string, object>, backlinks: Record<string, string[]> } | null)} getGraph
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
		getBacklinks: (url) => {
			const graph = getGraph();
			if (!graph) return [];
			return (graph.backlinks[url] ?? []).map((sourceUrl) => ({ url: sourceUrl }));
		},
		all: () => getGraph()?.pages ?? {}
	};
}
