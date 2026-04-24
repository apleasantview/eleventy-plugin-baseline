import { createLogger } from './logging.js';

const cache = new WeakMap();
const inspectionMap = new Map();

/**
 * Page Context Registry
 *
 * Builds and caches a normalized per-page context during Eleventy render.
 * Acts as a lifecycle bridge between Eleventy data and internal modules.
 */
export function registerPageContext(eleventyConfig, coreContext) {
	const { state, runtime, site } = coreContext;
	const { settings, options } = state;
	const log = createLogger('core/page-context', { verbose: options.verbose });

	function isHtmlOutput(entry) {
		return entry?.page?.outputFileExtension === 'html';
	}

	/**
	 * Pure transformation: Eleventy data → normalized page context
	 */
	function createPageContext(data) {
		if (data._internal) return;

		const context = {
			page: {
				url: data.page?.url ?? null,
				inputPath: data.page?.inputPath ?? null,
				fileSlug: data.page?.fileSlug ?? null,
				date: data.page?.date ?? null,
				outputFileExtension: data.page.outputFileExtension ?? null
			},
			content: {
				title: data.title ?? null,
				description: data.description ?? null
			},
			site: site,
			state: {
				settings: state.settings,
				options: state.options
			}
		};

		const key = context.page.url ?? context.page.inputPath;
		if (key) inspectionMap.set(key, context);

		return context;
	}

	/**
	 * Memoized lookup per Eleventy page object
	 */
	function getPageContext(data) {
		if (cache.has(data)) {
			return cache.get(data);
		}

		const context = createPageContext(data);
		cache.set(data, context);

		return context;
	}

	/**
	 * Eleventy hook: only place where raw page data exists
	 */
	eleventyConfig.addGlobalData('eleventyComputed._pageContext', () => {
		return (data) => getPageContext(data);
	});

	log.info('page-context registered');

	/**
	 * Optional module API (if anything wants direct access)
	 */
	return {
		get: (data) => cache.get(data),
		snapshot: () => Object.fromEntries(inspectionMap)
	};
}
