/**
 * Deduplicate meta tags. Last-wins by key (charset, name, property, http-equiv).
 * Preserves insertion order after dedup.
 * @param {Array<Object>} [arr=[]] - Array of meta tag objects.
 * @returns {Array<Object>}
 */
function metaKey(meta) {
	// `media` is part of the identity, not decoration: two `theme-color` tags
	// that differ only by media query are answers to two different questions,
	// and keying on the name alone silently kept one. Media-scoped theme-color
	// is the canonical use of the attribute, so any site with a dark mode hit
	// this. Tags carrying no `media` key exactly as they always did.
	const scope = meta.media ? `|media:${meta.media}` : '';

	if (meta.charset) return 'charset';
	if (meta.name) return `name:${meta.name}${scope}`;
	if (meta.property) return `prop:${meta.property}${scope}`;
	if (meta['http-equiv']) return `http:${meta['http-equiv']}${scope}`;
	return null;
}

export const dedupeMeta = (arr = []) => {
	const seen = new Set();
	const out = [];

	for (let i = arr.length - 1; i >= 0; i--) {
		const key = metaKey(arr[i]);
		if (!key || seen.has(key)) continue;
		seen.add(key);
		out.push(arr[i]);
	}

	return out.reverse();
};

/**
 * Deduplicate link tags by rel+hreflang+href. Last-wins, preserves insertion order.
 * @param {Array<Object>} [links=[]] - Array of link tag objects.
 * @returns {Array<Object>}
 */
export const dedupeLink = (links = []) => {
	const seen = new Set();
	const out = [];

	for (let i = links.length - 1; i >= 0; i--) {
		const link = links[i];
		const key = link.rel && link.href ? `rel:${link.rel}|hreflang:${link.hreflang ?? ''}|${link.href}` : null;
		if (!key || seen.has(key)) continue;
		seen.add(key);
		out.push(link);
	}

	return out.reverse();
};
