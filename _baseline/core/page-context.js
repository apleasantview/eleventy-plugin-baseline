import pick from './utils/pick.js';
import { slugify } from './utils/slugify.js';
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
	const uniqueBy = (arr, keyFn) =>
		Object.values(
			(arr ?? []).reduce((acc, item) => {
				if (!item) return acc;

				const id = typeof keyFn === 'function' ? keyFn(item) : item?.[keyFn];

				if (!id) {
					acc[JSON.stringify(item)] = item;
					return acc;
				}

				acc[id] = item;
				return acc;
			}, {})
		);

	// --- SEO helpers ---
	function stripTrackingParams(urlObj) {
		['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid'].forEach((p) =>
			urlObj.searchParams.delete(p)
		);

		urlObj.hash = '';
		return urlObj;
	}

	function extractFirstParagraph(data) {
		const html = data?.content;
		if (!html) return;
		const match = html.match(/<p>(.*?)<\/p>/i);
		return match?.[1];
	}

	function normalizeCanonical(path, siteUrl) {
		if (!path || !siteUrl) return;

		const url = new URL(path, siteUrl);

		url.hash = '';

		return stripTrackingParams(url).href;
	}

	// --- Field resolver ---
	function resolveField({ pageValue, siteValue, fallbackValue, isHome }) {
		let value = pageValue ?? siteValue ?? fallbackValue;

		return value;
	}

	// --- Builders ---
	function buildSite(lang, userSettings) {
		const langEntry = lang ? userSettings.languages?.[lang] : undefined;
		return {
			title: langEntry?.title ?? userSettings.title ?? '',
			tagline: langEntry?.tagline ?? userSettings.tagline ?? '',
			description: langEntry?.description ?? userSettings.description ?? '',
			url: userSettings.url ?? '',
			noindex: userSettings.noindex === true
		};
	}

	function buildPage(pageInput) {
		return {
			inputPath: pageInput?.inputPath,
			fileSlug: pageInput?.fileSlug,
			filePathStem: pageInput?.filePathStem,
			outputFileExtension: pageInput?.outputFileExtension,
			templateSyntax: pageInput?.templateSyntax,
			date: pageInput?.date,
			url: pageInput?.url,
			outputPath: pageInput?.outputPath,
			lang: pageInput?.lang,
			locale: pageInput?.locale,
			sitemap: pageInput?.sitemap
		};
	}

	function buildEntry(data) {
		const rawSlug = data?.slug ?? data?.page?.fileSlug;

		return {
			title: data?.seo?.title ?? data?.title,
			description: data?.seo?.description ?? data?.description,
			excerpt: data?.excerpt,
			slug: slugify(rawSlug),
			head: data?.head
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

		const contentMap = runtime.contentMap;

		const siteTitle = site.title;
		const siteDescription = site.description;
		const tagline = site.tagline;

		const pageTitle = data?.seo?.title ?? data?.title ?? siteTitle;
		const pageDescription = data?.seo?.description ?? data?.description ?? data?.excerpt ?? extractFirstParagraph(data);

		function enhance(value) {
			if (query.isHome && !data?.seo?.title && tagline) {
				return `${siteTitle}${separator}${tagline}`;
			}

			if (!query.isHome && pageTitle && siteTitle && pageTitle !== siteTitle) {
				return `${pageTitle}${separator}${siteTitle}`;
			}

			return value;
		}

		// ---- DESCRIPTION ----
		const description = resolveField({
			pageValue: pageDescription,
			siteValue: siteDescription,
			isHome: query.isHome
		});

		// ---- TITLE ----
		const base = resolveField({
			pageValue: pageTitle,
			siteValue: siteTitle
		});

		const title = enhance(base);

		// ---- CANONICAL ----
		let canonical;

		if (!noindex) {
			const rawCanonical =
				data?.canonical ?? page.url ?? (page.inputPath && contentMap?.inputPathToUrl?.[page.inputPath]?.[0]);

			canonical = normalizeCanonical(rawCanonical, site.url);
		}

		return {
			title,
			description,
			canonical,
			robots,
			noindex
		};
	}

	function buildRender(data) {
		return {
			generator: data?.eleventy?.generator
		};
	}

	// HEAD (global + page-level merge + dedupe)
	function buildHead({ userSettings, data }) {
		const userHead = userSettings.head ?? {};
		const pageHead = data?.head ?? {};

		const link = uniqueBy([...(userHead.link ?? []), ...(pageHead.link ?? [])], (item) => {
			if (item?.rel === 'canonical') {
				try {
					return normalizeCanonical(item.href, site.url);
				} catch {
					return item?.href;
				}
			}
			return item?.href;
		});

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
		};

		const inspectionKey = context.page.url ?? context.page.inputPath;
		if (inspectionKey) setEntry(scope, inspectionKey, context);

		if (slugIndex && entry.slug && page.url) {
			const eligible = page.locale?.isDefaultLang === true;
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
