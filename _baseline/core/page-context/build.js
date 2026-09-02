import { setEntry } from '../registry.js';
import { slugify } from '../utils/slugify.js';
import { sentenceCaseSlug } from '../utils/sentence-case-slug.js';
import { uniqueBy } from '../utils/unique-by.js';
import { resolveField } from '../utils/resolve-field.js';
import { normalizeCanonical } from './seo-helpers.js';
import { buildSectionLabelIndex } from '../content-graph/section-labels.js';
import { SEGMENT_DATA_KEY, SEGMENT_ALIAS } from '../segmentation/constants.js';

/**
 * Apply a title template, replacing tokens with resolved values. Tokens:
 * `%s` (page title), `%siteTitle%`, `%tagline%`. One regex with the longer
 * tokens first so `%s` does not eat the `%s` inside `%siteTitle%`.
 * Replacement is literal: an empty value leaves the surrounding template
 * text as the author wrote it.
 *
 * @param {string} template
 * @param {{ title?: string, siteTitle?: string, tagline?: string }} tokens
 * @returns {string}
 */
export function applyTitleTemplate(template, { title, siteTitle, tagline }) {
	const values = { '%s': title, '%siteTitle%': siteTitle, '%tagline%': tagline };
	return template.replace(/%siteTitle%|%tagline%|%s/g, (token) => values[token] ?? '');
}

/**
 * Resolve the final `<title>` text.
 *
 * Precedence: per-page bare opt-out (`titleTemplate: null`) → per-page
 * template → titleless home (baked-in `siteTitle` + `tagline`) → global
 * template → default (`page – site`, guarded so a page named like the site
 * stays bare). With no template set anywhere this reproduces the legacy
 * separator composition exactly.
 *
 * @returns {string}
 */
export function resolveTitle({ data, isHome, pageTitle, siteTitle, tagline, separator, globalTemplate }) {
	const pageTemplate = data?.titleTemplate;
	const base = pageTitle ?? siteTitle;
	const tokens = { title: pageTitle, siteTitle, tagline };

	if (pageTemplate === null) return base;
	if (typeof pageTemplate === 'string') return applyTitleTemplate(pageTemplate, tokens);
	if (isHome && !data?.seo?.title) return tagline ? `${siteTitle}${separator}${tagline}` : base;
	if (typeof globalTemplate === 'string') return applyTitleTemplate(globalTemplate, tokens);
	if (!isHome && pageTitle && siteTitle && pageTitle !== siteTitle) return `${pageTitle}${separator}${siteTitle}`;
	return base;
}

/**
 * The URL prefix a language's pages sit behind, empty for the site root.
 *
 * Only a deliberately non-default language prefixes the path. Absence of
 * `isDefaultLang` means no multilang at all, so the root stays the root and
 * never acquires a spurious `/{lang}`.
 *
 * Shared so the breadcrumb trail and the `isHome` test answer the question
 * the same way. They did not: `isHome` compared against a literal `/`, so on
 * a multilingual site exactly one page was ever home, and every other
 * language's front page was composed as an interior page.
 *
 * @param {{ lang?: string, isDefaultLang?: boolean }} input
 * @returns {string} `/{lang}` or an empty string.
 */
export function languageBase({ lang, isDefaultLang } = {}) {
	return isDefaultLang === false && lang ? `/${lang}` : '';
}

/**
 * Resolve a breadcrumb trail from the page's ancestor section path.
 *
 * `section` is the containing-directory chain, not a path that ends at the
 * page: a leaf (/docs/module/head/) and its section index (/docs/module/)
 * share the same section. The tell is the URL. When the page IS its section
 * index, the last segment names it (relabelled with the page title); otherwise
 * the page is a leaf and gets appended as its own crumb. The final crumb keeps
 * its URL so the schema renderer can wire its @id, and is flagged `current` so
 * the visible renderer knows not to link it. In multilang, a deliberately
 * non-default language prefixes every URL with `/{lang}`.
 *
 * `root` is a reserved segment: it marks a page as sitting directly at the site
 * root, names no directory of its own, and so contributes no crumb.
 *
 * `homeLabel` translates the first crumb, and comes from the page's language
 * entry in `settings.languages`. Falls back to `Home`.
 *
 * `sectionLabels` maps a crumb URL to the title its section index page gives
 * itself, so `/docs/` reads as its page does rather than as its folder does.
 * Absent during the pre-pass, where no graph exists yet; the pre-pass corrects
 * its own output once the node set is complete (see `section-labels.js`).
 *
 * @param {{ section?: string[], url?: string, title?: string, lang?: string, isDefaultLang?: boolean, homeLabel?: string, sectionLabels?: Record<string, string> }} input
 * @returns {Array<{ label: string, url: string, current?: boolean }>}
 */
export function buildBreadcrumbs({ section = [], url, title, lang, isDefaultLang, homeLabel, sectionLabels } = {}) {
	if (!section?.length || !url) return [];

	const base = languageBase({ lang, isDefaultLang });

	// The site root is its own Home crumb, so it has no trail to show.
	if (url === `${base}/`) return [];

	// `root` names no directory, so it contributes neither a crumb nor a path
	// segment. Dropping it once here keeps the crumb URLs and the section URL
	// below reading from the same list.
	const segments = section.filter((seg) => seg !== 'root');

	const crumbs = [{ label: homeLabel ?? 'Home', url: `${base}/` }];
	let acc = base;
	for (const seg of segments) {
		acc += `/${seg}`;
		const crumbUrl = `${acc}/`;
		crumbs.push({ label: sectionLabels?.[crumbUrl] ?? sentenceCaseSlug(seg), url: crumbUrl });
	}

	const sectionUrl = `${base}/${segments.join('/')}/`;
	if (segments.length && url === sectionUrl) {
		crumbs[crumbs.length - 1].label = title ?? crumbs[crumbs.length - 1].label;
	} else {
		crumbs.push({ label: title ?? sentenceCaseSlug(segments[segments.length - 1] ?? ''), url });
	}

	crumbs[crumbs.length - 1].current = true;
	return crumbs;
}

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

	// Memoised on graph identity: a serve-mode rebuild swaps the graph object,
	// which is the signal to rebuild the index. Empty during the pre-pass, where
	// no graph exists and the labels are corrected afterwards instead.
	let labelledGraph = null;
	let sectionLabels = {};

	function getSectionLabels() {
		const graph = runtime.contentGraph;
		if (!graph) return undefined;
		if (graph !== labelledGraph) {
			labelledGraph = graph;
			sectionLabels = buildSectionLabelIndex(graph.nodes);
		}
		return sectionLabels;
	}

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

	function buildPage(pageInput, data) {
		return {
			part: partIndex(data),
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
			translationKey: pageInput?.translationKey,
			isDefaultLang: pageInput?.isDefaultLang,
			sitemap: pageInput?.sitemap
		};
	}

	/**
	 * Is this page one part of a source file split by a content marker?
	 *
	 * Every part inherits the same front matter, so every part claims the same
	 * slug. The slug index needs to know the difference between that and two
	 * separate pages colliding. The signal is the pagination key Baseline's own
	 * segmentation writes: a template paginating a collection names its own data
	 * key and never matches.
	 *
	 * @param {any} data
	 * @returns {boolean}
	 */
	function isSegmented(data) {
		const key = data?.pagination?.data;
		return typeof key === 'string' && key.startsWith(SEGMENT_DATA_KEY);
	}

	/**
	 * Which part of a split source file is this? Undefined for an ordinary page.
	 *
	 * Read off the pagination alias, not `pagination.pageNumber`, which still
	 * reads 0 for every chunk at this point.
	 *
	 * @param {any} data
	 * @returns {number | undefined}
	 */
	function partIndex(data) {
		if (!isSegmented(data)) return undefined;
		return data?.[SEGMENT_ALIAS]?.index;
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
			head: data?.head,
			breadcrumbs: buildBreadcrumbs({
				section,
				url: data?.page?.url,
				title: data?.seo?.title ?? data?.title,
				lang: data?.page?.lang,
				isDefaultLang: data?.page?.isDefaultLang,
				homeLabel: settings.languages?.[data?.page?.lang]?.homeLabel,
				sectionLabels: getSectionLabels()
			})
		};
	}

	function buildQuery({ page }) {
		return {
			isHome: page?.url === `${languageBase(page)}/`
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
		const pageDescription = data?.seo?.description ?? data?.description ?? data?.excerpt;

		// ---- DESCRIPTION ----
		const description = resolveField({
			pageValue: pageDescription,
			siteValue: siteDescription,
			isHome: query.isHome
		});

		// ---- TITLE ----
		const title = resolveTitle({
			data,
			isHome: query.isHome,
			pageTitle,
			siteTitle,
			tagline,
			separator,
			globalTemplate: options.head?.titleTemplate
		});

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

		// Keys must distinguish tags that legitimately differ: links by rel + href
		// (so preconnect and dns-prefetch to one host both survive), metas by their
		// identifying attribute (name / property / charset / http-equiv) so og:*
		// property tags are not collapsed. The head driver runs the authoritative
		// final pass; this just merges settings + front-matter without losing tags.
		// Links key on rel + href so tags that share a host but differ in rel
		// (preconnect vs dns-prefetch) are not collapsed. Metas key on their
		// identifying attribute so two tags with the same key (e.g. a repeated
		// og:title) collapse to the last, matching the driver's authoritative
		// pass instead of leaning on uniqueBy's by-shape fallback.
		const link = uniqueBy([...(userHead.link ?? []), ...(pageHead.link ?? [])], (item) => {
			if (item?.rel === 'canonical') {
				try {
					return `canonical|${normalizeCanonical(item.href, siteUrl)}`;
				} catch {
					return `canonical|${item?.href}`;
				}
			}
			return item?.href ? `${item.rel ?? ''}|${item.href}` : undefined;
		});

		const script = uniqueBy([...(userHead.script ?? []), ...(pageHead.script ?? [])], 'src');

		const style = uniqueBy([...(userHead.style ?? []), ...(pageHead.style ?? [])], 'href');

		const meta = uniqueBy([...(userHead.meta ?? []), ...(pageHead.meta ?? [])], (item) => {
			if (item?.charset) return 'charset';
			if (item?.name) return `name:${item.name}`;
			if (item?.property) return `prop:${item.property}`;
			if (item?.['http-equiv']) return `http:${item['http-equiv']}`;
			return undefined;
		});

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

		const page = buildPage(pageInput, data);
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
			// Register the default-language slug, and any slug on a monolingual
			// site (where isDefaultLang is undefined). Only a genuine non-default
			// translation (isDefaultLang === false) is skipped — the multilang
			// plugin hops to those via the translation map.
			const eligible = page.isDefaultLang !== false;
			if (eligible) {
				slugIndex.set(entry.slug, page.url, page.inputPath, { segmented: isSegmented(data) });
			}
		}

		return context;
	};
}
