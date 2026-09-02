/**
 * Pick the first usable share image out of a fallback chain.
 *
 * `??` was the wrong operator for this. It falls through on null and undefined
 * only, so any other unusable value won the chain and then failed the `.url`
 * test downstream, leaving the page with **no** image rather than the next
 * candidate. An unresolved `eleventyComputed` key is the case that bit: it
 * arrives as a function, which is not nullish.
 *
 * `false` is the explicit opt-out. It stops the chain and emits nothing, so a
 * page can decline a share card outright. Before this, the only way to do that
 * was `ogImage: ''`, which worked by accident rather than by design.
 *
 * Nullish and empty values mean absent, not "deliberately none", so they skip
 * to the next candidate.
 *
 * @param {...unknown} candidates  Most specific first.
 * @returns {{ url: string, alt?: string, width?: number, height?: number } | undefined}
 */
export function pickImage(...candidates) {
	for (const candidate of candidates) {
		if (candidate === false) return undefined;

		if (typeof candidate === 'string') {
			if (candidate.trim()) return { url: candidate };
			continue;
		}

		if (candidate && typeof candidate === 'object') {
			const url = /** @type {{ url?: unknown }} */ (candidate).url;
			if (typeof url === 'string' && url.trim()) {
				return /** @type {{ url: string }} */ (candidate);
			}
		}
	}

	return undefined;
}

/**
 * Is this a URL the JSON-LD graph can carry as-is?
 *
 * The graph is emitted inside a `<script>`, which `HtmlBasePlugin` never walks,
 * so a relative URL ships exactly as authored. Baseline does not rewrite it —
 * absolute image URLs are the data layer's job — but it can say so out loud.
 *
 * @param {string | undefined} url
 * @returns {boolean}
 */
export function isAbsoluteImageUrl(url) {
	return typeof url === 'string' && /^https?:\/\//i.test(url);
}
