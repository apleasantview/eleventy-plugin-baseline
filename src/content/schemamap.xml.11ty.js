// Catalogues the per-type schema endpoints. Paired with /schema/*.json
// (the corpus documents) and the Schemamap: directive in robots.txt.
// Each entry's lastmod is the most recent git commit across the source
// files that feed that type's endpoint, so it cannot drift from the JSON-LD.

import { maxGitModified } from '../../utils/git-date.js';

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

	const inputPathByUrl = {};
	for (const item of collections?.all || []) {
		if (item?.url && item?.inputPath) inputPathByUrl[item.url] = item.inputPath;
	}

	const entries = TYPES.map((type) => {
		const paths = navigatorNodes.filter((n) => n?.type === type).map((n) => inputPathByUrl[n.url]);
		return { type, lastmod: maxGitModified(paths) };
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
