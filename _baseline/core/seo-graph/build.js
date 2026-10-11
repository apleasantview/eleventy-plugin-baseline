import { setEntry } from '../registry.js';
import { assembleSchemaGraph } from './adapter.js';
import { resolveDates, gitSources } from '../dates/index.js';
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
	if (settings.noindex === true) return undefined;
	if ((seo?.noindex ?? data?.noindex) === true) return undefined;

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
 *   options: import('../types.js').BaselineOptions,
 *   log?: { warn: (...args: unknown[]) => void }
 * }} deps
 */
export function createSeoNamespace({ scope, settings, options, log }) {
	// One line per distinct URL, not per page that carries it.
	const warnedImages = new Set();

	const dateContext = {
		timeZone: settings.timeZone,
		sources: options.dates,
		git: gitSources,
		log
	};

	return function buildSeoNamespace(data) {
		const seoIn = data.seo ?? {};
		const userSettings = data.settings ?? settings;
		const dates = resolveDates(data, dateContext);

		const seoOut = { ...seoIn };

		const url = resolveCanonicalUrl({
			seo: seoIn,
			data,
			settings: userSettings,
			page: data.page
		});
		if (url) seoOut.url = url;

		seoOut.schema = assembleSchemaGraph(data, dates);

		const social = buildSocialProjections(data, url, dates);
		seoOut.openGraph = social.openGraph;
		seoOut.twitter = social.twitter;

		// The graph is emitted inside a <script>, which HtmlBasePlugin never walks,
		// so a relative image URL ships exactly as authored while the @id beside it
		// is absolute. Baseline does not rewrite it (image URLs are authored
		// absolute, by decision) but it should not stay quiet about it either.
		//
		// Every authored image URL, not just og:image.
		for (const [field, candidate] of [
			['og:image', social.openGraph?.image],
			['twitter:image', social.twitter?.image],
			['schema logo', data.schema?.organization?.logo?.url]
		]) {
			if (typeof candidate !== 'string' || isAbsoluteImageUrl(candidate)) continue;
			const seenKey = `${field}|${candidate}`;
			if (warnedImages.has(seenKey)) continue;
			warnedImages.add(seenKey);
			log?.warn?.(`${field} "${candidate}" is relative and will ship as authored; share images need an absolute URL`);
		}

		const inspectionKey = data.page?.url ?? data.page?.inputPath;
		if (inspectionKey) setEntry(scope, inspectionKey, seoOut);

		return seoOut;
	};
}
