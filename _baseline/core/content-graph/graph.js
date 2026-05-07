import { parseHTML } from 'linkedom';

import { extractGraph } from './extractors.js';

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
 * @param {Array<{ url: string, inputPath?: string, outputPath?: string, rawInput?: string, content?: string }>} pages
 * @returns {{ pages: Record<string, object>, backlinks: Record<string, string[]> }}
 */
export function buildGraph(pages) {
	const records = {};

	for (const page of pages) {
		if (!page?.url || typeof page.content !== 'string') continue;

		let extracted;
		try {
			const { document } = parseHTML(page.content);
			extracted = extractGraph(document);
		} catch {
			// Fail silently — a parse failure on one page should not nuke the graph.
			continue;
		}

		records[page.url] = {
			url: page.url,
			inputPath: page.inputPath ?? null,
			outputPath: page.outputPath ?? null,
			rawInput: page.rawInput ?? null,
			content: page.content,
			extracted
		};
	}

	const backlinks = buildBacklinkIndex(records);

	return { pages: records, backlinks };
}

/**
 * Pre-compute a reverse index: target url -> list of source urls.
 *
 * Built once at graph time so getBacklinks() is a hash lookup, not a
 * scan over every page on every call.
 */
function buildBacklinkIndex(records) {
	const index = {};

	for (const page of Object.values(records)) {
		for (const link of page.extracted.links) {
			if (!link.internal || !link.href) continue;

			// Strip fragments so /foo/#section folds into /foo/.
			const target = link.href.split('#')[0] || link.href;

			if (!index[target]) index[target] = [];
			if (!index[target].includes(page.url)) index[target].push(page.url);
		}
	}

	return index;
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
		getPage: (url) => getGraph()?.pages[url] ?? null,
		getHeadings: (url) => getGraph()?.pages[url]?.extracted.headings ?? [],
		getOutgoingLinks: (url) => getGraph()?.pages[url]?.extracted.links ?? [],
		getImages: (url) => getGraph()?.pages[url]?.extracted.images ?? [],
		getText: (url) => getGraph()?.pages[url]?.extracted.text ?? null,
		getBacklinks: (url) => {
			const graph = getGraph();
			if (!graph) return [];
			return (graph.backlinks[url] ?? []).map((sourceUrl) => ({ url: sourceUrl }));
		},
		all: () => getGraph()?.pages ?? {}
	};
}
