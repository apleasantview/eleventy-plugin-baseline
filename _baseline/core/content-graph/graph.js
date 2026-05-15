import { parseHTML } from 'linkedom';

import { extractGraph } from './extractors.js';
import { buildBacklinkIndex } from './backlinks.js';

/**
 * Content graph (runtime substrate)
 *
 * Turns rendered HTML into the `{ nodes, edges, backlinks }` graph that
 * templates query through the cascade. Node shape carries identity
 * (from page-context) merged with extracted fields (excerpt, headings,
 * images). Edges are flat anchor records. Backlinks is the target-keyed
 * inverse index, pre-enriched with the source page's title and excerpt.
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
 * @returns {{ nodes: Record<string, object>, edges: Array<{ internal: boolean, from: string, to: string, type: string, text: string }>, backlinks: Record<string, Array<{ url: string, title?: string, excerpt?: string }>> }}
 */
export function buildGraph(pages, options = {}) {
	const nodes = {};
	const edges = [];
	const sourceMeta = {};

	for (const page of pages) {
		if (!page?.url || typeof page.content !== 'string') continue;
		if (!page.outputPath?.endsWith('.html')) continue;
		// Honour the same opt-out 404s, drafts and internal templates already use.
		if (page.data?.eleventyExcludeFromCollections === true) continue;
		if (page.data?.baselineExcludeFromGraph === true) continue;

		try {
			const { document } = parseHTML(page.content);
			const ctx = page.data?._pageContext ?? {};
			const url = ctx.page?.url ?? page.url;

			const graph = extractGraph(document, { ...options, url });

			const nodeIdentity = {
				title: ctx.entry?.title,
				slug: ctx.entry?.slug,
				description: ctx.entry?.description,
				section: ctx.entry?.section,
				type: ctx.entry?.type,
				lang: ctx.page?.lang,
				locale: ctx.page?.locale,
				date: ctx.page?.date,
				url
			};

			nodes[url] = {
				...nodeIdentity,
				...graph.node
			};

			edges.push(...graph.edges);

			sourceMeta[url] = { title: nodeIdentity.title };
		} catch (err) {
			if (process.env.NODE_ENV !== 'production') {
				console.warn(`Graph extraction failed for ${page.url}`, err);
			}
			continue;
		}
	}

	const backlinks = buildBacklinkIndex(edges, nodes, sourceMeta);

	return { nodes: nodes, edges: edges, backlinks };
}

/**
 * Build the accessor surface templates see through the cascade. Closes
 * over a getter so the underlying graph reference can be swapped (e.g.
 * on serve-mode rebuilds) without re-registering global data.
 *
 * @param {() => ({ nodes: Record<string, object>, edges: Array<object>, backlinks: Record<string, Array<{ url: string, title?: string, excerpt?: string }>> } | null)} getGraph
 */
export function createAccessors(getGraph) {
	return {
		isReady: () => getGraph() !== null,
		getPage: (url) => getGraph()?.nodes[url],
		getHeadings: (url) => getGraph()?.nodes[url]?.headings ?? [],
		getOutgoingLinks: (url) => getGraph()?.nodes[url]?.links ?? [],
		getImages: (url) => getGraph()?.nodes[url]?.images ?? [],
		getText: (url) => getGraph()?.nodes[url]?.text,
		getExcerpt: (url) => getGraph()?.nodes[url]?.excerpt,
		getBacklinks: (url) => getGraph()?.backlinks[url] ?? [],
		all: () => getGraph()?.nodes ?? {}
	};
}
