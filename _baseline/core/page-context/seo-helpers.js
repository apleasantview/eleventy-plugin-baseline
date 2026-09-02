/**
 * Page context — SEO helpers
 *
 * Pure URL/content normalisation used when building the `meta` slice of
 * the page context. No Eleventy, no registry.
 *
 * Architecture layer:
 *   runtime substrate (page-context internal)
 */

/**
 * Strip common tracking query params and the URL fragment.
 *
 * @param {URL} urlObj
 * @returns {URL}
 */
export function stripTrackingParams(urlObj) {
	['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid'].forEach((p) =>
		urlObj.searchParams.delete(p)
	);

	urlObj.hash = '';
	return urlObj;
}

/**
 * Resolve a path against the site URL, strip the fragment, and remove
 * tracking params. Returns undefined when inputs are missing or invalid.
 *
 * @param {string | undefined} path
 * @param {string | undefined} siteUrl
 * @returns {string | undefined}
 */
export function normalizeCanonical(path, siteUrl) {
	if (!path || !siteUrl) return;

	const url = new URL(path, siteUrl);

	url.hash = '';

	return stripTrackingParams(url).href;
}
