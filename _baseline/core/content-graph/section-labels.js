/**
 * Build a URL-keyed index of section labels: the title each section index
 * page gives itself. A node is its own section's index page when its URL is
 * the URL its section path builds to, so `/docs/` with `section: ['docs']`
 * qualifies and `/docs/module/head/` does not.
 *
 * Keyed by URL rather than section path so a translated section (`/nl/docs/`)
 * is its own entry, with no language argument needed here.
 *
 * @param {Record<string, {url?: string, section?: string[], title?: string}>} nodes
 * @returns {Record<string, string>} crumb URL to label
 */
export function buildSectionLabelIndex(nodes) {
	const index = {};

	for (const node of Object.values(nodes ?? {})) {
		const { url, section, title } = node ?? {};
		if (!url || !title || !section?.length) continue;

		// `root` names no directory, and is skipped when the trail is built too.
		const segments = section.filter((seg) => seg !== 'root');
		if (!segments.length) continue;

		// What is left in front of the section path must be nothing (default
		// language) or one segment (`/nl`). Anything longer means the page sits
		// below its section rather than being its index.
		const path = `/${segments.join('/')}/`;
		if (!url.endsWith(path)) continue;
		const prefix = url.slice(0, -path.length);
		if (prefix === '' || /^\/[^/]+$/.test(prefix)) index[url] = title;
	}

	return index;
}

/**
 * Replace ancestor crumb labels with the label their section index page
 * carries. Mutates in place: the caller owns the node set and this runs once
 * at the end of the pre-pass, before anything reads it.
 *
 * The current crumb is left alone. It already carries the page's own title,
 * and for a section index page that is the same string this index holds.
 *
 * @param {Record<string, {breadcrumbs?: Array<{url?: string, label?: string, current?: boolean}>}>} nodes
 * @param {Record<string, string>} index
 * @returns {void}
 */
export function relabelBreadcrumbs(nodes, index) {
	for (const node of Object.values(nodes ?? {})) {
		for (const crumb of node?.breadcrumbs ?? []) {
			if (crumb.current) continue;
			const label = index[crumb.url];
			if (label) crumb.label = label;
		}
	}
}
