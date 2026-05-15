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
 * Pull the first paragraph's inner HTML out of a rendered page's content.
 * Used as the last-resort source for meta descriptions.
 *
 * @param {{ content?: string }} data
 * @returns {string | undefined}
 */
export function extractFirstParagraph(data) {
	const html = data?.content;
	if (!html) return;
	const match = html.match(/<p>(.*?)<\/p>/i);
	return match?.[1];
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
