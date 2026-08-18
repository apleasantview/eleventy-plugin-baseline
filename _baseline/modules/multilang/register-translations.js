import { buildTranslationIndex } from './utils/build-translation-index.js';

const COMPUTED_KEY = 'eleventyComputed.page.translations';

/**
 * Translation index (multilang)
 *
 * Registers `page.translations`, the list of a page's siblings in other
 * languages, read off the content graph rather than a collection.
 *
 * Architecture layer:
 *   module
 *
 * Lifecycle:
 *   cascade-time → the computed field groups the graph on first read and
 *                  serves every later page from the memo
 *
 * Why this exists:
 *   Enumerating a page's siblings needs the full page set, which the cascade
 *   can't offer: a page can't see its translations while they're still being
 *   born. The pre-pass already stands on the other side of that wall.
 *
 * Scope:
 *   Owns the computed field and the memo. Does not own the grouping itself
 *   (utils/build-translation-index.js) or the collections that predate it.
 *
 * @param {import("@11ty/eleventy/src/UserConfig.js").default} eleventyConfig
 * @param {Object} context
 * @param {Object} context.runtime - Baseline runtime; `contentGraph` is read lazily.
 * @param {Record<string, Object>} context.languages - Normalised language map.
 * @param {string} context.defaultLanguage
 */
export function registerTranslations(eleventyConfig, context) {
	const { runtime, languages, defaultLanguage } = context;

	// Memoised on the graph object itself. Serve-mode rebuilds reassign it, so
	// identity change is the invalidation signal, and the grouping runs once per
	// build rather than once per page.
	let indexedGraph = null;
	let translationIndex = {};

	function getTranslationIndex() {
		const graph = runtime.contentGraph;
		if (!graph) return null;

		if (graph !== indexedGraph) {
			indexedGraph = graph;
			translationIndex = buildTranslationIndex(graph.nodes, { languages, defaultLanguage });
		}

		return translationIndex;
	}

	// Current page excluded: a page is not its own translation. Empty during the
	// pre-pass (no graph yet), same as `_node`.
	eleventyConfig.addGlobalData(COMPUTED_KEY, () => (data) => {
		const index = getTranslationIndex();
		if (!index) return [];

		const variants = index[data.translationKey];
		if (!variants) return [];

		const self = data.page?.url;
		return Object.values(variants)
			.filter((entry) => entry.url !== self)
			.sort((a, b) => a.lang.localeCompare(b.lang));
	});
}
