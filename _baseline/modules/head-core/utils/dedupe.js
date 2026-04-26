/**
 * Deduplicate meta tags. Last-wins by key (charset, name, property, http-equiv).
 * Preserves insertion order after dedup.
 * @param {Array<Object>} [arr=[]] - Array of meta tag objects.
 * @returns {Array<Object>}
 */
function metaKey(meta) {
	if (meta.charset) return 'charset';
	if (meta.name) return `name:${meta.name}`;
	if (meta.property) return `prop:${meta.property}`;
	if (meta['http-equiv']) return `http:${meta['http-equiv']}`;
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
