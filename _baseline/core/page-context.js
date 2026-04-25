import pick from './utils/pick.js';
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

	// Head options.
	const separator = options.head?.titleSeparator ?? ' – ';
	const generator = options.head?.showGenerator ?? false;

	function shouldSkip(data) {
		if (data._internal) return true;
		if (data.page?.outputFileExtension !== 'html') return true;
		return false;
	}

	// --- Helpers ---
	const uniqueBy = (arr, key) =>
		Object.values(
			(arr ?? []).reduce((acc, item) => {
				if (!item) return acc;
				const id = item?.[key];
				if (!id) {
					// fallback only when no key exists
					acc[JSON.stringify(item)] = item;
					return acc;
				}
				acc[id] = item;
				return acc;
			}, {})
		);

	// --- Builders ---
	function buildSite(lang) {
		const langEntry = lang ? settings.languages?.[lang] : undefined;
		return {
			title: langEntry?.title ?? settings.title ?? '',
			tagline: langEntry?.tagline ?? settings.tagline ?? '',
			url: settings.url ?? '',
			noindex: settings.noindex === true
		};
	}

	function buildPage(pageInput) {
		return {
			url: pageInput?.url ?? null,
			inputPath: pageInput?.inputPath ?? null,
			fileSlug: pageInput?.fileSlug ?? null,
			date: pageInput?.date ?? null,
			outputFileExtension: pageInput?.outputFileExtension ?? null,
			lang: pageInput?.lang ?? null
		};
	}

	function buildEntry(data) {
		return {
			title: data?.title ?? null,
			description: data?.description ?? null,
			head: data?.head ?? null
		};
	}

	function buildQuery({ entry, page }) {
		return {
			isHome: page.url === '/'
		};
	}

	function buildMeta({ data, site, page, query }) {
		const noindex = site.noindex || data?.noindex === true;
		const robots = noindex
			? 'noindex, nofollow'
			: 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1';

		let title;
		if (query.isHome) {
			title = site.tagline ? `${site.title}${separator}${site.tagline}` : site.title;
		} else if (!data?.title) {
			title = site.title;
		} else if (!site.title || data.title === site.title) {
			title = data.title;
		} else {
			title = `${data.title}${separator}${site.title}`;
		}

		let canonical;
		if (!noindex) {
			const contentMap = runtime.contentMap;
			const path = pick(data?.canonical, page.url, page.inputPath && contentMap?.inputPathToUrl?.[page.inputPath]?.[0]);
			canonical = path && site.url ? new URL(path, site.url).href : (path ?? null);
		}

		return {
			title,
			description: pick(data?.description, site.tagline, ''),
			canonical: canonical ?? null,
			robots,
			noindex
		};
	}

	function buildRender(data) {
		return {
			generator: data?.eleventy?.generator ?? null
		};
	}

	// HEAD (global + page-level merge + dedupe)
	function buildHead({ settings, data }) {
		const globalHead = settings.head ?? {};
		const pageHead = data?.head ?? {};

		const link = uniqueBy([...(globalHead.link ?? []), ...(pageHead.link ?? [])], 'href');

		const script = uniqueBy([...(globalHead.script ?? []), ...(pageHead.script ?? [])], 'src');

		const style = uniqueBy([...(globalHead.style ?? []), ...(pageHead.style ?? [])], 'href');

		const meta = uniqueBy([...(globalHead.meta ?? []), ...(pageHead.meta ?? [])], 'name');

		return {
			link,
			script,
			style,
			meta
		};
	}

	/**
	 * Main context builder.
	 * Pure transformation: Eleventy data → normalised page context.
	 */
	function buildPageContext(data) {
		const pageInput = data.page ?? {};

		const page = buildPage(pageInput);
		const site = buildSite(page.lang);
		const entry = buildEntry(data);
		const query = buildQuery({ entry, page });
		const meta = buildMeta({ data, site, page, query });
		const render = buildRender(data);
		const head = buildHead({ settings, data });

		const context = {
			site,
			page,
			entry,
			query,
			meta,
			render,
			head
			// settings
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
