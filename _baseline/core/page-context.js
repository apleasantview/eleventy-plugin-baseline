import { createLogger } from './logging.js';
import { getScope, memoize, setEntry } from './registry.js';

const SCOPE_NAME = 'core/page-context';
const COMPUTED_KEY = 'eleventyComputed._pageContext';

/**
 * Page Context Registry
 *
 * Builds and caches a normalized per-page context during Eleventy render.
 * Acts as a lifecycle bridge between Eleventy data and internal modules.
 */
export function registerPageContext(eleventyConfig, coreContext) {
	const { state, runtime, site } = coreContext;
	const { settings, options } = state;
	const log = createLogger(SCOPE_NAME, { verbose: options.verbose });

	const scope = getScope(eleventyConfig, SCOPE_NAME);

	function shouldSkip(data) {
		if (data._internal) return true;
		if (data.page?.outputFileExtension !== 'html') return true;
		return false;
	}

	/**
	 * Pure transformation: Eleventy data → normalised page context.
	 * Always returns a context; skip decisions live in `shouldSkip`.
	 */
	function buildPageContext(data) {
		const context = {
			page: {
				url: data.page.url ?? null,
				inputPath: data.page.inputPath ?? null,
				fileSlug: data.page.fileSlug ?? null,
				date: data.page.date ?? null,
				outputFileExtension: data.page.outputFileExtension ?? null,
				lang: data.page.lang ?? null
			},
			content: {
				title: data.title ?? null,
				description: data.description ?? null,
				noindex: data.noindex
			},
			site,
			state: {
				settings,
				options
			}
		};

		const inspectionKey = context.page.url ?? context.page.inputPath;
		if (inspectionKey) setEntry(scope, inspectionKey, context);

		return context;
	}

	eleventyConfig.addGlobalData(COMPUTED_KEY, () => {
		return (data) => {
			if (shouldSkip(data)) return null;
			return memoize(scope, data, buildPageContext);
		};
	});

	log.info('page-context registered');

	return {
		get: (data) => scope.cache.get(data),
		getByKey: (key) => scope.values.get(key),
		snapshot: () => Object.fromEntries(scope.values)
	};
}
