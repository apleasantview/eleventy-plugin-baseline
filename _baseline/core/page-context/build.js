import { setEntry } from '../registry.js';
import { slugify } from '../utils/slugify.js';
import { uniqueBy } from '../utils/unique-by.js';
import { resolveField } from '../utils/resolve-field.js';
import { extractFirstParagraph, normalizeCanonical } from './seo-helpers.js';

/**
 * Page context — builder factory
 *
 * Returns a `buildPageContext` function bound to the runtime dependencies
 * it needs (scope, slug index, resolved settings, runtime substrate handles,
 * options). Each top-level key in the page context (`site`, `page`, `entry`,
 * `query`, `meta`, `render`, `head`) has its own builder inside the closure.
 *
 * Architecture layer:
 *   runtime substrate (page-context internal)
 *
 * System role:
 *   Pure transformation of Eleventy data → normalised page context. The
 *   factory keeps cross-builder dependencies (separator, site.url, contentMap)
 *   in one place without threading them through every builder signature.
 *
 * @param {{
 *   scope: { values: Map },
 *   slugIndex: { set: (slug: string, url: string, inputPath: string) => void } | null,
 *   settings: import('../types.js').BaselineSettings,
 *   runtime: { contentMap: any },
 *   options: import('../types.js').BaselineOptions,
 *   log?: { warn: (...args: unknown[]) => void }
 * }} deps
 * @returns {(data: any) => object}
 */
export function createPageContext({ scope, slugIndex, settings, runtime, options, log }) {
	const separator = options.head?.titleSeparator ?? ' – ';

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

	/**
	 * Build the `entry` branch — the author's view of the page.
	 *
	 * Holds the content's self-description (title, description, excerpt), its
	 * identity (slug), structural classification (section as a hierarchical
	 * path array, type as a free-form classifier), and per-page head extras.
	 * Values pass through raw; consumers normalise.
	 */
	function buildEntry(data) {
		const rawSlug = data?.slug ?? data?.page?.fileSlug;

		// Coerce a string section to a single-element array, with a dev warning.
		// Strict contract is "section is always an array"; runtime stays forgiving.
		let section = data?.section;
		if (typeof section === 'string') {
			if (process.env.NODE_ENV !== 'production') {
				log?.warn(
					`entry.section should be an array, got string "${section}" at ${data?.page?.url ?? data?.page?.inputPath}. Use ['${section}'] instead.`
				);
			}
			section = [section];
		}

		return {
			title: data?.seo?.title ?? data?.title,
			description: data?.seo?.description ?? data?.description,
			excerpt: data?.excerpt,
			slug: slugify(rawSlug),
			section,
			type: data?.type,
			head: data?.head
		};
	}

	function buildQuery({ page }) {
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

	// --- HEAD (global + page-level merge + dedupe) ---
	function buildHead({ userSettings, data, siteUrl }) {
		const userHead = userSettings.head ?? {};
		const pageHead = data?.head ?? {};

		const link = uniqueBy([...(userHead.link ?? []), ...(pageHead.link ?? [])], (item) => {
			if (item?.rel === 'canonical') {
				try {
					return normalizeCanonical(item.href, siteUrl);
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
	return function buildPageContext(data) {
		const pageInput = data.page ?? {};
		const userSettings = data.settings ?? settings;

		const page = buildPage(pageInput);
		const site = buildSite(page.lang, userSettings);
		const entry = buildEntry(data);
		const query = buildQuery({ entry, page });
		const meta = buildMeta({ data, site, page, query });
		const render = buildRender(data);
		const head = buildHead({ userSettings, data, siteUrl: site.url });

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
	};
}
