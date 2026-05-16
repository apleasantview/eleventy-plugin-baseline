import { renderHead } from './drivers/posthtml-head-elements.js';
import { buildAlternates } from './utils/alternates.js';
import { optionsSchema } from './schema.js';

// Internal constants — not user-facing.
const PLACEHOLDER_TAG = 'baseline-head';
const EOL = '\n';

/**
 * Head (module)
 *
 * Render-time <head> composer. Turns the normalised page context into a
 * sorted, deduped element list and replaces <baseline-head> in the output.
 *
 * Architecture layer:
 *   module
 *
 * System role:
 *   Consumes the page context (built at cascade-time) and the translation
 *   map (written at cascade-time) to produce the final <head> at
 *   transform-time.
 *
 * Lifecycle:
 *   cascade-time   → upstream page-context registry builds the per-page seeds
 *   transform-time → PostHTML plugin reads seeds, emits nodes, capo-sorts,
 *                    replaces <baseline-head>
 *
 * Why this exists:
 *   Eleventy's htmlTransformer context exposes only page metadata, not the
 *   full data cascade. Pre-built seeds in the page-context registry carry
 *   every field the composer needs from cascade-time into transform-time.
 *
 * Scope:
 *   Owns transform-time composition and placeholder replacement.
 *   Pass 1 covers bucket 1 only: charset, viewport, title, description,
 *   robots, canonical, optional generator, plus user extras from
 *   settings.head and hreflang alternates. SEO and JSON-LD are later passes.
 *   Does not own seed shape (page context) or driver internals.
 *
 * Data flow:
 *   page context + translation-map store + settings.head → driver →
 *   PostHTML tree mutation (replaces <baseline-head>)
 *
 * @param {import("@11ty/eleventy").UserConfig} eleventyConfig
 * @param {Object} moduleContext
 */
export function headCore(eleventyConfig, moduleContext) {
	const { state, runtime, log } = moduleContext;
	const { settings, options } = state;

	// Structural-only options check: log on mismatch, do not throw.
	const parsed = optionsSchema.safeParse(options.head);
	if (!parsed.success) {
		for (const issue of parsed.error.issues) {
			log.info('options:', `${issue.path.join('.')}, ${issue.message}`);
		}
	}

	const pageContextRegistry = moduleContext.resolvePageContext;

	// Resolved plugin options with defaults.
	const headOptions = {
		titleSeparator: options.head?.titleSeparator ?? ' – ',
		showGenerator: options.head?.showGenerator ?? false
	};

	// Per-build stats (cleared on eleventy.after for watch-mode reruns).
	const headStats = { pages: new Set() };

	eleventyConfig.on('eleventy.after', () => {
		log.info(`Head injected into ${headStats.pages.size} pages`);
		headStats.pages.clear();
	});

	// --- Transform-time: compose and inject. ---
	log.info('Injecting heads');
	eleventyConfig.htmlTransformer.addPosthtmlPlugin('html', function (context) {
		headStats.pages.add(context?.page?.inputPath || context?.outputPath);

		const key = context?.page?.url ?? context?.page?.inputPath;
		const seeds = pageContextRegistry?.getByKey(key);
		if (!seeds) {
			log.warn('No head seeds for', context?.page?.inputPath || context?.outputPath);
			return (tree) => tree;
		}

		const translationKey = seeds.page?.locale?.translationKey;

		const alternates = translationKey
			? buildAlternates(seeds.page?.locale?.translationKey, runtime.translationMap.get(), seeds.site?.url)
			: [];

		return renderHead({
			seeds,
			alternates,
			options: headOptions,
			placeholderTag: PLACEHOLDER_TAG,
			eol: EOL
		});
	});
}
