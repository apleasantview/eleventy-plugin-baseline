import { createLogger } from '../logging/index.js';
import { getScope, memoize } from '../registry.js';
import { createPageContext } from './build.js';

const SCOPE_NAME = 'core:page-context';
const LOG_NAME = 'page-context';
const COMPUTED_KEY = 'eleventyComputed._pageContext';

/**
 * Page context (runtime substrate)
 *
 * A normalised per-page object built once at cascade-time and cached for
 * transform-time consumers. The shape downstream modules read instead of
 * re-deriving from raw cascade data.
 *
 * Architecture layer:
 *   runtime substrate
 *
 * System role:
 *   Lifecycle bridge between Eleventy's data cascade and the htmlTransformer.
 *   Head reads it via `getByKey`; navigator snapshots it for inspection.
 *
 * Lifecycle:
 *   cascade-time   → eleventyComputed._pageContext builds and caches the context
 *   transform-time → consumers retrieve the cached context by page.url
 *
 * Why this exists:
 *   Eleventy's htmlTransformer context exposes only page metadata, not the
 *   data cascade. The cache lets transform-time consumers read the same
 *   normalised view that cascade-time produced.
 *
 * Scope:
 *   Owns the page-context shape, memoisation, key-based lookup, and snapshot.
 *   Does not own the meaning of any field; modules consume them as they see fit.
 *   Templates with `_internal: true` are skipped (synthetic sitemap pages, etc.).
 *
 * Data flow:
 *   data cascade → buildPageContext → registry scope → head, navigator
 *
 * @param {import("@11ty/eleventy").UserConfig} eleventyConfig
 * @param {Object} coreContext - Resolved baseline core context (state, runtime, helpers).
 */
export function registerPageContext(eleventyConfig, coreContext) {
	const { state, runtime } = coreContext;
	const { slugIndex } = runtime;
	const { settings, options } = state;

	const log = createLogger(LOG_NAME, { verbose: options.verbose });
	const scope = getScope(eleventyConfig, SCOPE_NAME);

	const buildPageContext = createPageContext({ scope, slugIndex, settings, runtime, options, log });

	function shouldSkip(data) {
		if (data._internal) return true;
		if (data.page?.outputFileExtension !== 'html') return true;
		return false;
	}

	eleventyConfig.addGlobalData(COMPUTED_KEY, () => {
		return (data) => {
			if (shouldSkip(data)) return null;
			return memoize(scope, data, buildPageContext);
		};
	});

	log.info('Page context registered');

	return {
		get: (data) => scope.cache.get(data),
		getByKey: (key) => scope.values.get(key),
		snapshot: () => Object.fromEntries(scope.values)
	};
}
