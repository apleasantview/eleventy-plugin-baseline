import Merge from '@11ty/eleventy-utils/src/Merge.js';
import { TemplatePath } from '@11ty/eleventy-utils';

/**
 * Return the first value that is neither undefined nor null.
 * @param {...*} values
 * @returns {*}
 */
const pick = (...values) => values.find((v) => v !== undefined && v !== null);

/**
 * Normalize a path prefix to match Eleventy's URL behavior.
 * Returns empty string for root ('/'), otherwise the normalized prefix.
 * @param {string} [pathPrefix='']
 * @returns {string}
 */
const normalizePathPrefix = (pathPrefix = '') => {
	const normalized = TemplatePath.normalizeUrlPath('/', pathPrefix);
	return normalized === '/' ? '' : normalized;
};

/**
 * Test whether a URL is absolute (has a scheme or is protocol-relative).
 * @param {string} [url='']
 * @returns {boolean}
 */
const isAbsoluteUrl = (url = '') => /^[a-z][a-z\d+\-.]*:\/\//i.test(url) || url.startsWith('//');

/**
 * Build an absolute URL from siteUrl + pathPrefix + relative URL.
 * Returns the input unchanged if already absolute or empty.
 * @param {string} siteUrl - Site root (e.g. 'https://example.com').
 * @param {string} pathPrefix - Eleventy path prefix.
 * @param {string} url - The URL to resolve.
 * @returns {string}
 */
const absoluteUrl = (siteUrl, pathPrefix, url) => {
	if (!url) return url;
	if (isAbsoluteUrl(url)) return url;
	const prefix = normalizePathPrefix(pathPrefix);
	const joined = TemplatePath.normalizeUrlPath(prefix || '/', url);
	return siteUrl ? `${siteUrl.replace(/\/+$/, '')}${joined}` : joined;
};

/**
 * Merge site defaults, user overrides, and computed values into a raw head object.
 * The result contains all head sections (meta, link, OG, twitter, etc.) before
 * deduplication and flattening.
 * @param {Object} site - Site-level data (site.yaml / site.json).
 * @param {Object} user - Page-level head overrides (the `head` data key).
 * @param {Object} page - Eleventy page object.
 * @param {string} title - Resolved page title.
 * @param {string} description - Resolved description.
 * @param {boolean} noindex - Whether to set noindex/nofollow.
 * @param {string} url - Canonical URL.
 * @returns {Object} Merged head object.
 */
const mergeBaseHead = (site, user, page, title, description, noindex, url) => {
	return Merge(
		{},
		{
			title,
			meta: [
				{ charset: 'UTF-8' },
				{ name: 'viewport', content: 'width=device-width, initial-scale=1.0' },
				{ name: 'description', content: description },
				{ name: 'robots', content: noindex ? 'noindex, nofollow' : 'index, follow' }
			],
			link: [],
			script: [],
			style: [],
			hreflang: [],
			openGraph: {
				'og:title': title,
				'og:description': description,
				'og:type': 'website',
				'og:url': url || '',
				'og:image': ''
			},
			twitter: {
				'twitter:card': 'summary_large_image',
				'twitter:title': title,
				'twitter:description': description,
				'twitter:image': ''
			},
			miscMeta: [],
			structuredData: null
		},
		user
	);
};

/**
 * Resolve the canonical URL for a page. Uses an explicit canonical from head
 * data if present, otherwise derives it from the page URL or content map.
 * @param {Object} head - Head data (may contain a canonical property).
 * @param {Object} page - Eleventy page object.
 * @param {Object} contentMap - Cached inputPathToUrl / urlToInputPath maps.
 * @param {Object} [env] - Environment options (siteUrl, pathPrefix, verbose).
 * @returns {string|undefined} Absolute canonical URL, or undefined if unresolvable.
 */
const resolveCanonical = (head, page, contentMap, env = {}) => {
	const { siteUrl, pathPrefix = '', pageUrlOverride, verbose } = env;
	const explicit = pick(head.canonical);
	if (explicit) {
		if (!siteUrl && verbose) {
			console.warn('[baseline] site.url is missing; canonical will be relative.');
		}
		return absoluteUrl(siteUrl, pathPrefix, explicit);
	}

	const url = pick(pageUrlOverride, page?.url, page?.inputPath && contentMap?.inputPathToUrl?.[page.inputPath]?.[0]);
	if (!url) return undefined;

	if (!siteUrl && verbose) {
		console.warn('[baseline] site.url is missing; canonical will be relative.');
	}

	return absoluteUrl(siteUrl, pathPrefix, url);
};

/**
 * Deduplicate meta tags. Last-wins by key (charset, name, property, http-equiv).
 * Preserves insertion order after dedup.
 * @param {Array<Object>} [arr=[]] - Array of meta tag objects.
 * @returns {Array<Object>}
 */
const dedupeMeta = (arr = []) => {
	const seen = new Set();
	const out = [];
	for (let i = arr.length - 1; i >= 0; i--) {
		const m = arr[i];
		const key = m.charset
			? 'charset'
			: m.name
				? `name:${m.name}`
				: m.property
					? `prop:${m.property}`
					: m['http-equiv']
						? `http:${m['http-equiv']}`
						: null;
		if (!key || seen.has(key)) continue;
		seen.add(key);
		out.push(m);
	}
	return out.reverse();
};

/**
 * Deduplicate link tags by rel+href. Last-wins, preserves insertion order.
 * @param {Array<Object>} [links=[]] - Array of link tag objects.
 * @returns {Array<Object>}
 */
const dedupeLink = (links = []) => {
	const seen = new Set();
	const out = [];
	for (let i = links.length - 1; i >= 0; i--) {
		const l = links[i];
		const key = l.rel && l.href ? `rel:${l.rel}|${l.href}` : null;
		if (!key || seen.has(key)) continue;
		seen.add(key);
		out.push(l);
	}
	return out.reverse();
};

/**
 * Flatten a merged head object into the shape posthtml-head-elements expects.
 * Deduplicates meta and link tags, separates social meta, and prepends
 * structured data as a JSON-LD script.
 * @param {Object} [head={}] - Merged head object from mergeBaseHead.
 * @param {string} canonical - Resolved canonical URL.
 * @returns {Object} Flat head spec keyed by element type (meta, title, link, script, etc.).
 */
const flattenHead = (head = {}, canonical) => {
	const baseMeta = dedupeMeta([...(head.meta || []), ...(head.miscMeta || [])]);

	const socialMeta = dedupeMeta([
		...(head.openGraph
			? Object.entries(head.openGraph)
					.filter(([, v]) => v)
					.map(([k, v]) => ({ property: k, content: v }))
			: []),
		...(head.twitter
			? Object.entries(head.twitter)
					.filter(([, v]) => v)
					.map(([k, v]) => ({ name: k, content: v }))
			: [])
	]);

	const style = [...(head.style || [])];

	const linkCanonical = canonical ? [{ rel: 'canonical', href: canonical }] : [];
	const link = dedupeLink([...(head.link || []), ...(head.hreflang || [])].filter(Boolean));

	const script = [...(head.script || [])];
	if (head.structuredData) {
		script.unshift({
			type: 'application/ld+json',
			content: JSON.stringify(head.structuredData)
		});
	}

	// Key order matters for posthtml-head-elements.
	return {
		meta: baseMeta,
		title: head.title || '',
		linkCanonical,
		style,
		link,
		script,
		meta_social: socialMeta
	};
};

/**
 * Build the complete head spec for a page. This is the main entry point —
 * resolves title, description, canonical, merges everything, and flattens.
 * Called from both the computed global data and the PostHTML transform fallback.
 * @param {Object} [data={}] - Full Eleventy data cascade for the page.
 * @param {Object} [env={}] - Environment options (userKey, contentMap, siteUrl, pathPrefix, verbose).
 * @returns {Object} Flat head spec ready for posthtml-head-elements.
 */
const buildHead = (data = {}, env = {}) => {
	const { userKey = 'head', contentMap = {}, siteUrl, pathPrefix } = env;
	const site = data.site || {};
	const user = userKey ? data[userKey] || {} : {};
	const page = data.page || {};
	const resolvedSiteUrl =
		siteUrl || site.url || process.env.URL || process.env.DEPLOY_URL || process.env.DEPLOY_PRIME_URL;

	const siteTitle = site.title || '';
	const pageTitle = pick(data.title, user.title, site.title, '');
	const title =
		siteTitle && pageTitle && siteTitle !== pageTitle ? `${pageTitle} | ${siteTitle}` : pageTitle || siteTitle || '';

	const description = pick(data.description, user.description, site.tagline, '');
	const noindex = pick(data.noindex, page.noindex, user.noindex, site.noindex, false);

	const canonical = resolveCanonical(
		{ canonical: absoluteUrl(resolvedSiteUrl, pathPrefix, user.canonical) },
		page,
		contentMap,
		{ ...env, siteUrl: resolvedSiteUrl, verbose: env.verbose }
	);
	const merged = mergeBaseHead(site, user, page, title, description, noindex, canonical);
	return flattenHead(merged, canonical);
};

/**
 * Convenience wrapper: build a head spec from a PostHTML context.
 * @param {Object} context - PostHTML render context.
 * @param {Object} contentMap - Cached content map.
 * @param {Object} [env={}] - Additional environment options.
 * @returns {Object} Flat head spec.
 */
const buildHeadSpec = (context, contentMap, env = {}) => {
	return buildHead(context, { ...env, contentMap });
};

export { pick, resolveCanonical, flattenHead, buildHead, buildHeadSpec, absoluteUrl };
