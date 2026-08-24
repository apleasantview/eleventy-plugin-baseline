/**
 * Name and entry point for each part, in order.
 *
 * A part is named by the marker that introduced it, and numbered when that
 * marker gave no label. Numbers are the floor because they need no copy and no
 * translation, which is how WordPress's `wp_link_pages` has always done it;
 * labels are the author raising it, as Joomla's page break allows.
 *
 * @param {Array<{next?: {anchor?: string, label?: string}}>} parts
 * @returns {Array<{label: string, anchor: string | undefined}>}
 */
export function partEntries(parts) {
	return parts.map((_part, index) => {
		const marker = parts[index - 1]?.next;
		return {
			label: marker?.label ?? String(index + 1),
			anchor: marker?.anchor
		};
	});
}

/**
 * Assemble what a template needs to render its own part navigation.
 *
 * Baseline emits no markup for this. A part navigation belongs to the layout
 * rather than the middle of the content, and the site owns its own elements,
 * classes and copy, exactly as it does for `page.translations`.
 *
 * @param {Array<{label: string, anchor?: string}>} entries - One per part, from `partEntries`.
 * @param {string[]} [hrefs] - Part URLs, in order, from `pagination.hrefs`.
 * @param {number} index - Zero-based index of the current part.
 * @returns {Object} The `_pagebreak` shape.
 */
export function buildPagebreak(entries, hrefs = [], index) {
	const parts = entries.map((entry, i) => ({
		number: i + 1,
		label: entry.label,
		anchor: entry.anchor,
		url: hrefs[i],
		current: i === index
	}));

	return {
		number: index + 1,
		total: parts.length,
		parts,
		previous: parts[index - 1],
		next: parts[index + 1]
	};
}
