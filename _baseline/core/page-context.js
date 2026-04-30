import pick from './utils/pick.js';
import { slugify } from './utils/helpers.js';
import { createLogger } from './logging.js';
import { getScope, memoize, setEntry } from './registry.js';

const SCOPE_NAME = 'core:page-context';
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
	const { state, runtime, site } = coreContext;
	const { slugIndex } = runtime;
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
	function buildSite(lang, userSettings) {
		const langEntry = lang ? userSettings.languages?.[lang] : undefined;
		return {
			title: langEntry?.title ?? userSettings.title ?? '',
			tagline: langEntry?.tagline ?? userSettings.tagline ?? '',
			url: userSettings.url ?? '',
			noindex: userSettings.noindex === true
		};
	}

	function buildPage(pageInput) {
		return {
			inputPath: pageInput?.inputPath ?? null,
			fileSlug: pageInput?.fileSlug ?? null,
			filePathStem: pageInput?.filePathStem ?? null,
			outputFileExtension: pageInput?.outputFileExtension ?? null,
			templateSyntax: pageInput?.templateSyntax ?? null,
			date: pageInput?.date ?? null,
			url: pageInput?.url ?? null,
			outputPath: pageInput?.outputPath ?? null,
			lang: pageInput?.lang ?? null,
			locale: pageInput?.locale ?? null,
			sitemap: pageInput?.sitemap ?? null
		};
	}

	function buildEntry(data) {
		const rawSlug = data?.slug ?? data?.page?.fileSlug;
		return {
			title: data?.title ?? null,
			description: data?.description ?? null,
			slug: slugify(rawSlug),
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
	function buildHead({ userSettings, data }) {
		const userHead = userSettings.head ?? {};
		const pageHead = data?.head ?? {};

		const link = uniqueBy([...(userHead.link ?? []), ...(pageHead.link ?? [])], 'href');

		const script = uniqueBy([...(userHead.script ?? []), ...(pageHead.script ?? [])], 'src');

		const style = uniqueBy([...(userHead.style ?? []), ...(pageHead.style ?? [])], 'href');

		const meta = uniqueBy([...(userHead.meta ?? []), ...(pageHead.meta ?? [])], 'name');

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
		const userSettings = data.settings ?? settings;

		const page = buildPage(pageInput);
		const site = buildSite(page.lang, userSettings);
		const entry = buildEntry(data);
		const query = buildQuery({ entry, page });
		const meta = buildMeta({ data, site, page, query });
		const render = buildRender(data);
		const head = buildHead({ userSettings, data });

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

		// Register slug for wikilink resolution. In multilingual sites only the
		// defaultLanguage page registers; the wikilinks plugin uses the
		// translation map to hop to other languages.
		if (slugIndex && entry.slug && page.url) {
			const eligible = page.locale ? page.locale.isDefaultLang === true : true;
			if (eligible) {
				slugIndex.set(entry.slug, page.url, page.inputPath);
			}
		}

		return context;
	}

	eleventyConfig.addGlobalData(COMPUTED_KEY, () => {
		return (data) => {
			if (shouldSkip(data)) return null;
			return memoize(scope, data, buildPageContext);
		};
	});

	log.info('Page context added to the data cascade and registry exposed');

	return {
		get: (data) => scope.cache.get(data),
		getByKey: (key) => scope.values.get(key),
		snapshot: () => Object.fromEntries(scope.values)
	};
}
