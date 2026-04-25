/**
 * Deduplicate meta tags. Last-wins by key (charset, name, property, http-equiv).
 * Preserves insertion order after dedup.
 * @param {Array<Object>} [arr=[]] - Array of meta tag objects.
 * @returns {Array<Object>}
 */
export const dedupeMeta = (arr = []) => {
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
export const dedupeLink = (links = []) => {
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
