import { renderHead } from './drivers/posthtml-head-elements.js';
import { buildAlternates } from './utils/alternates.js';

// Internal constants — not user-facing.
const PLACEHOLDER_TAG = 'baseline-head';
const EOL = '\n';

/**
 * Head Core (Eleventy Module)
 *
 * Render-time module that turns normalised per-page data into <head>
 * output. Two-stage pipeline:
 *
 *   cascade-time   → collector populates page._head seed bag
 *   transform-time → composer reads the bag, emits nodes,
 *                    capo-sorts, replaces <baseline-head>
 *
 * The cascade step exists because Eleventy's htmlTransformer context
 * exposes page metadata only, not the full data cascade. Seeds carry
 * every field the composer needs from the cascade into the transform.
 *
 * Pass 1 scope: bucket 1 (standard head tags) only — charset, viewport,
 * title, description, robots, canonical, optional generator, plus user
 * extras from settings.head. SEO and JSON-LD buckets are follow-up passes.
 *
 * @param {import("@11ty/eleventy").UserConfig} eleventyConfig
 * @param {Object} moduleContext - Baseline module context.
 */
export default function headCore(eleventyConfig, moduleContext) {
	const { state, runtime, log } = moduleContext;
	const { options } = state;

	const pageContextRegistry = moduleContext.resolvePageContext;

	// Resolved plugin options with defaults.
	const headOptions = {
		titleSeparator: options.head?.titleSeparator ?? ' – ',
		showGenerator: options.head?.showGenerator ?? false
	};

	// Per-build stats (cleared on eleventy.after for watch-mode reruns).
	const headStats = { pages: new Set() };

	eleventyConfig.on('eleventy.after', () => {
		log.info({
			message: 'Head injection summary',
			totalPages: headStats.pages.size,
			sample: Array.from(headStats.pages).slice(0, 10)
		});
		headStats.pages.clear();
	});

	// --- Transform-time: compose and inject. ---
	log.info('Injecting heads to pages');
	eleventyConfig.htmlTransformer.addPosthtmlPlugin('html', function (context) {
		headStats.pages.add(context?.page?.inputPath || context?.outputPath);

		const key = context?.page?.url ?? context?.page?.inputPath;
		const seeds = pageContextRegistry?.getByKey(key);
		if (!seeds) {
			log.warn('no head seeds for', context?.page?.inputPath || context?.outputPath);
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
			eol: EOL,
			log
		});
	});
}
