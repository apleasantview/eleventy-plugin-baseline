// Catalogues the per-type schema endpoints. Paired with /schema/*.json
// (the corpus documents) and the Schemamap: directive in robots.txt.
// Each entry's lastmod is the most recent resolved dateModified across the
// pages that feed that type's endpoint, read from the same resolveDates source
// the per-page and corpus JSON-LD use, so it cannot drift from them.

import { resolveDates } from '../../_baseline/core/dates/index.js';

const TYPES = ['article', 'page', 'about'];

export const data = {
	permalink: '/schemamap.xml',
	baselineExcludeFromGraph: true,
	eleventyExcludeFromCollections: true
};

export default function (data) {
	const { settings, _navigator, collections } = data;
	const siteUrl = (settings?.url || '').replace(/\/+$/, '');
	const navigatorNodes = Object.values(_navigator?.nodes || {});

	const itemByUrl = {};
	for (const item of collections?.all || []) {
		if (item?.url) itemByUrl[item.url] = item;
	}

	const entries = TYPES.map((type) => {
		let lastmod = null;
		for (const node of navigatorNodes) {
			if (node?.type !== type) continue;
			const item = itemByUrl[node.url];
			const resolved = item ? resolveDates(item.data).dateModified : undefined;
			const iso = resolved ? resolved.toISOString() : null;
			if (iso && (!lastmod || iso > lastmod)) lastmod = iso;
		}
		return { type, lastmod };
	});

	const lines = [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<schemamap xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
	];
	for (const { type, lastmod } of entries) {
		lines.push('\t<schema>');
		lines.push(`\t\t<loc>${siteUrl}/schema/${type}.json</loc>`);
		if (lastmod) lines.push(`\t\t<lastmod>${lastmod}</lastmod>`);
		lines.push('\t</schema>');
	}
	lines.push('</schemamap>');
	return lines.join('\n');
}
