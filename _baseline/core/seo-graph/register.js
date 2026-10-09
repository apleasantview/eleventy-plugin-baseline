import { createLogger } from '../logging/index.js';
import { getScope, memoize } from '../registry.js';
import { createSeoNamespace } from './build.js';

const SCOPE_NAME = 'core:seo-graph';
const LOG_NAME = 'seo-graph';
const COMPUTED_KEY = 'eleventyComputed._seoGraph';

/**
 * @param {import("@11ty/eleventy").UserConfig} eleventyConfig
 * @param {Object} coreContext
 */
export function registerSeoGraph(eleventyConfig, coreContext) {
	const { state, runtime } = coreContext;
	const { settings, options } = state;

	const log = coreContext.scopedLog?.(LOG_NAME) ?? createLogger(LOG_NAME, { verbose: options.verbose });
	const scope = getScope(eleventyConfig, SCOPE_NAME);

	const buildSeoNamespace = createSeoNamespace({ scope, settings, runtime, options, log });

	function shouldSkip(data) {
		if (data._internal) return true;
		if (data.page?.outputFileExtension !== 'html') return true;
		return false;
	}

	eleventyConfig.addGlobalData(COMPUTED_KEY, () => {
		return (data) => {
			// Eleventy orders computed keys by what each function reads through its
			// discovery proxy, so these reads have to happen before any early
			// return or this key is scheduled ahead of what it consumes. Leaf
			// paths only: `ComputedDataProxy.js:72` records a read only when the
			// value is neither array nor plain object, so `data.schema` alone
			// registers nothing.
			void data.schema?.pieces;
			void data.seo?.ogImage;
			void data.ogImage;

			if (shouldSkip(data)) return data._seoGraph ?? null;
			return memoize(scope, data, buildSeoNamespace);
		};
	});

	log.info('SEO graph registered');

	return {
		get: (data) => scope.cache.get(data),
		getByKey: (key) => scope.values.get(key),
		snapshot: () => Object.fromEntries(scope.values)
	};
}
