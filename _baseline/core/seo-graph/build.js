import { setEntry } from '../registry.js';
import { assembleSchemaGraph } from './adapter.js';
import { buildSocialProjections } from './open-graph.js';
import { isAbsoluteImageUrl } from './pick-image.js';

/**
 * Resolve the canonical URL for the `seo` namespace.
 *
 * Strip-all by default: the entire query string and fragment are removed.
 * Opt-out is a boolean carried at page level (`preserveQueryParams` in
 * front matter) or site level (`settings.seo.preserveQueryParams`); page-level wins.
 * The fragment is always stripped regardless.
 *
 * Returns `undefined` when the page or site is noindex, when `settings.url`
 * is missing, or when no resolvable canonical input exists.
 *
 * @param {{ seo?: any, data?: any, settings?: any, page?: any }} input
 * @returns {string | undefined}
 */
export function resolveCanonicalUrl({ seo, data, settings, page }) {
	if (!settings?.url) return undefined;
	if (settings.noindex === true || data?.noindex === true) return undefined;

	const raw = seo?.canonical ?? data?.canonical ?? page?.url;
	if (!raw) return undefined;

	let url;
	try {
		url = new URL(raw, settings.url);
	} catch {
		return undefined;
	}

	url.hash = '';

	const pagePref = data?.preserveQueryParams;
	const sitePref = settings.seo?.preserveQueryParams;
	const preserveQueryParams = pagePref ?? sitePref ?? false;

	if (!preserveQueryParams) {
		url.search = '';
	}

	return url.href;
}

/**
 * SEO namespace builder factory.
 *
 * Returns `buildSeoNamespace(data)` which normalises the cascade into a
 * resolved `_seoGraph` object: canonical fields, OG/Twitter projections, and the
 * assembled JSON-LD graph at `_seoGraph.schema`.
 *
 * @param {{
 *   scope: { values: Map },
 *   settings: import('../types.js').BaselineSettings,
 *   runtime: any,
 *   options: import('../types.js').BaselineOptions,
 *   log?: { warn: (...args: unknown[]) => void }
 * }} deps
 */
export function createSeoNamespace({ scope, settings, runtime, options, log }) {
	// One line per distinct URL, not per page that carries it.
	const warnedImages = new Set();

	return function buildSeoNamespace(data) {
		const seoIn = data.seo ?? {};
		const userSettings = data.settings ?? settings;

		const seoOut = { ...seoIn };

		const url = resolveCanonicalUrl({
			seo: seoIn,
			data,
			settings: userSettings,
			page: data.page
		});
		if (url) seoOut.url = url;

		seoOut.schema = assembleSchemaGraph(data);

		const social = buildSocialProjections(data, url);
		seoOut.openGraph = social.openGraph;
		seoOut.twitter = social.twitter;

		// The graph is emitted inside a <script>, which HtmlBasePlugin never walks,
		// so a relative image URL ships exactly as authored while the @id beside it
		// is absolute. Baseline does not rewrite it (image URLs are authored
		// absolute, by decision) but it should not stay quiet about it either.
		const image = social.openGraph?.image;
		if (typeof image === 'string' && !isAbsoluteImageUrl(image) && !warnedImages.has(image)) {
			warnedImages.add(image);
			log?.warn?.(`og:image "${image}" is relative and will ship as authored; share images need an absolute URL`);
		}

		const inspectionKey = data.page?.url ?? data.page?.inputPath;
		if (inspectionKey) setEntry(scope, inspectionKey, seoOut);

		return seoOut;
	};
}
