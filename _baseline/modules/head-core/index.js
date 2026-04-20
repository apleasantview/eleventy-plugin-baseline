import headElements from './drivers/posthtml-head-elements.js';
import { createLogger } from '../../core/logging.js';
import { buildHead } from './utils/head-utils.js';

/**
 * eleventy-plugin-head-core
 *
 * Manages the <head> for every page. Merges site-level defaults, page-level
 * overrides, and computed values (canonical URL, open graph, structured data)
 * into a single head spec, then injects the result into HTML via a PostHTML
 * transform. Pages control their head through a `head` data key.
 *
 * Depends on: core/logging, head-core/utils/head-utils, head-core/drivers/posthtml-head-elements.
 * No cross-module dependencies.
 */
/** @param {import("@11ty/eleventy").UserConfig} eleventyConfig */
export default function headCore(eleventyConfig, options = {}) {
	const log = createLogger('head-core', { verbose: options.verbose });

	// Internal options — not part of the public API.
	const userKey = options.dirKey || 'head';
	const headElementsTag = options.headElementsTag || 'baseline-head';
	const eol = options.EOL || '\n';
	const pathPrefix = options.pathPrefix ?? eleventyConfig?.pathPrefix ?? '';
	const siteUrl = options.siteUrl;

	// Cache the content map so canonical URLs can resolve inputPath → URL.
	// Updated each build when Eleventy emits the contentMap event.
	let cachedContentMap = {};
	eleventyConfig.on('eleventy.contentMap', ({ inputPathToUrl, urlToInputPath }) => {
		cachedContentMap = { inputPathToUrl, urlToInputPath };
	});

	// Computed global data: build the head spec for every page through the
	// data cascade. Templates access the result via `page.head`.
	eleventyConfig.addGlobalData('eleventyComputed.page.head', () => {
		return (data) =>
			buildHead(data, {
				userKey,
				siteUrl,
				pathPrefix,
				contentMap: cachedContentMap,
				pageUrlOverride: data?.page?.url
			});
	});

	// HTML transform: inject the head spec into the document <head> using
	// PostHTML. Replaces the <baseline-head> placeholder tag with real elements.
	// Falls back to building the spec from context if page.head isn't available.
	eleventyConfig.htmlTransformer.addPosthtmlPlugin('html', function (context) {
		log.info('injecting head elements for', context?.page?.inputPath || context?.outputPath);

		const headElementsSpec =
			context?.page?.head ||
			buildHead(context, {
				userKey,
				siteUrl,
				pathPrefix,
				contentMap: cachedContentMap,
				pageUrlOverride: context?.page?.url
			});

		const plugin = headElements({
			headElements: headElementsSpec,
			headElementsTag,
			EOL: eol,
			logger: log
		});

		return async function asyncHead(tree) {
			return plugin(tree);
		};
	});
}
