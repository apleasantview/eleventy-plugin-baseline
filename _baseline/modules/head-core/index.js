import headElements from './drivers/posthtml-head-elements.js';
import { buildHead } from './utils/head-utils.js';

/**
 * Head Core (Eleventy Module)
 *
 * This module manages document <head> generation for all pages.
 *
 * It composes a normalized head specification from site-level defaults,
 * page-level overrides, and runtime-derived values, then injects the
 * resulting elements into HTML output via a PostHTML transform.
 *
 * ------------------------------------------------------------
 *
 * Responsibilities
 * ------------------------------------------------------------
 * 1. Build a unified head specification per page
 * 2. Merge site defaults with page-level head configuration
 * 3. Resolve runtime-derived values (canonical URL, metadata)
 * 4. Expose computed head data to the template layer
 * 5. Inject head elements into final HTML output
 *
 * ------------------------------------------------------------
 *
 * Head Model
 * ------------------------------------------------------------
 *
 * The module operates on a normalized "head spec" object.
 *
 * Inputs:
 * - site configuration (state.settings)
 * - page data (data cascade)
 * - runtime context (contentMap, URLs)
 *
 * Output:
 * - page.head → structured representation of all head elements
 *
 * This spec is later transformed into actual HTML elements.
 *
 * ------------------------------------------------------------
 *
 * Injection Model
 * ------------------------------------------------------------
 *
 * Head elements are injected via a PostHTML transform.
 *
 * Templates define a placeholder tag:
 *   <baseline-head></baseline-head>
 *
 * This module replaces that tag with generated head elements.
 *
 * If page.head is not precomputed, it is derived at transform time.
 *
 * ------------------------------------------------------------
 *
 * Activation Rules
 * ------------------------------------------------------------
 *
 * The module is always active.
 *
 * It does not depend on feature flags and runs for all HTML output.
 *
 * ------------------------------------------------------------
 *
 * Outputs
 * ------------------------------------------------------------
 *
 * Global computed data:
 * - page.head
 *   → normalized head specification
 *
 * HTML transform:
 * - Replaces <baseline-head> with rendered head elements
 *
 * ------------------------------------------------------------
 *
 * Options (Internal)
 * ------------------------------------------------------------
 *
 * These options are not part of the public API and are subject to change.
 *
 * @property {string} [dirKey="head"]
 * Data key used for user-provided head configuration.
 *
 * @property {string} [headElementsTag="baseline-head"]
 * Placeholder tag used in templates for injection.
 *
 * @property {string} [EOL="\n"]
 * Line separator used when rendering head output.
 *
 * ------------------------------------------------------------
 *
 * Module Context
 * ------------------------------------------------------------
 *
 * @typedef {Object} moduleContext
 *
 * Shared module boundary contract.
 *
 * @property {Object} state
 * Resolved baseline state (settings + options).
 *
 * @property {Object} runtime
 * Provides access to runtime bindings (contentMap).
 *
 * @property {Object} site
 * Derived site helpers (canonicalUrl, pathPrefix).
 *
 * @property {Object} log
 * Scoped logger instance for module diagnostics.
 */
/** @param {import("@11ty/eleventy").UserConfig} eleventyConfig */
export default function headCore(eleventyConfig, moduleContext) {
	const { state, site, runtime, log } = moduleContext;
	const { options } = state;
	const { canonicalUrl, pathPrefix } = site;

	const pageContext = moduleContext.resolvePageContext;

	const moduleOptions = {
		driver: options.head.driver,
		canonicalUrl,
		pathPrefix,
		userKey: 'head',
		eol: '\n'
	};

	// Some stats.
	const headStats = {
		pages: new Set()
	};

	eleventyConfig.on('eleventy.after', () => {
		log.info({
			message: 'Head injection summary',
			totalPages: headStats.pages.size,
			sample: Array.from(headStats.pages).slice(0, 10)
		});

		// Reset for next build (important in watch mode).
		headStats.pages.clear();
	});

	// contentMap is read through the getter on every call so it reflects
	// state after `eleventy.contentMap` fires. Capturing it at module-init
	// time would freeze it at null.
	const builder = (data) =>
		buildHead(data, {
			userKey: moduleOptions.userKey,
			canonicalUrl: moduleOptions.canonicalUrl,
			pathPrefix: moduleOptions.pathPrefix,
			pageUrlOverride: data?.page?.url,
			contentMap: runtime.contentMap
		});

	// Computed global data: build the head spec for every page through the
	// data cascade. Templates access the result via `page.head`.
	eleventyConfig.addGlobalData('eleventyComputed.page.head', () => {
		return (data) => builder(data);
	});

	// HTML transform: inject the head spec into the document <head> using
	// PostHTML. Replaces the <baseline-head> placeholder tag with real elements.
	// Falls back to building the spec from the posthtml page data if
	// page.head isn't precomputed.
	eleventyConfig.htmlTransformer.addPosthtmlPlugin('html', function (context) {
		headStats.pages.add(context?.page?.inputPath || context?.outputPath);

		const headElementsSpec = context?.page?.head || builder(ctx);

		const plugin = headElements({
			headElements: headElementsSpec,
			headElementsTag: 'baseline-head',
			EOL: moduleOptions.eol,
			logger: log
		});

		return async function asyncHead(tree) {
			return plugin(tree);
		};
	});
}
