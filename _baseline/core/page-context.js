import { createLogger } from './logging.js';
import { getScope, memoize, setEntry } from './registry.js';

/**
 * Page Context Registry
 *
 * Builds and caches a normalized per-page context during Eleventy render.
 * Acts as a lifecycle bridge between Eleventy data and internal modules.
 */
export function registerPageContext(eleventyConfig, coreContext) {
	const { state, runtime, site } = coreContext;
	const { settings, options } = state;
	const name = 'core/page-context';
	const log = createLogger(name, { verbose: options.verbose });

	const scope = getScope(eleventyConfig, name);

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
				outputFileExtension: data.page.outputFileExtension ?? null
			},
			content: {
				title: data.title ?? null,
				description: data.description ?? null
			},
			site,
			state: {
				settings,
				options
			},
			runtime: { contentMap: runtime.contentMap }
		};

		const inspectionKey = context.page.url ?? context.page.inputPath;
		if (inspectionKey) setEntry(scope, inspectionKey, context);

		return context;
	}

	eleventyConfig.addGlobalData('eleventyComputed._pageContext', () => {
		return (data) => {
			if (shouldSkip(data)) return null;
			memoize(scope, data, buildPageContext);
		};
	});

	log.info('page-context registered');

	return {
		get: (data) => scope.cache.get(data),
		snapshot: () => Object.fromEntries(scope.values)
	};
}
