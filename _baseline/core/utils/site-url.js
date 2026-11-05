/**
 * Resolve a site URL, keeping only an absolute http(s) one.
 *
 * Anything else resolves to `undefined`, which is what every downstream
 * consumer treats as "no origin": canonical, Open Graph and JSON-LD are left
 * out rather than built against a base that cannot resolve.
 *
 * @param {unknown} url
 * @returns {string | undefined}
 */
export function resolveSiteUrl(url) {
	if (typeof url !== 'string') return undefined;

	try {
		const { protocol } = new URL(url);
		// Returned as authored, not as `parsed.href`: the docs ask for an origin
		// with no trailing slash, and normalising would quietly overrule that.
		return protocol === 'http:' || protocol === 'https:' ? url : undefined;
	} catch {
		return undefined;
	}
}
