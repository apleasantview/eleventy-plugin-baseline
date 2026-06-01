// Schema endpoints: one per entry.type. Each emits a JSON-LD corpus document
// listing every page of that type as a WebPage entry, with the WebSite node
// included at the top for @id resolution.
//
// Paired with /schemamap.xml (which catalogues these endpoints) and the
// Schemamap: directive in robots.txt. Discovery surface for AI agents that
// consume structured data corpus-wide (NLWeb pattern).

import { makeIds } from '@jdevalk/seo-graph-core';
import { gitModified } from '../../utils/git-date.js';

export const data = {
	// Paginate over `collections.all`, then transform to the distinct set of
	// `type` values via `before`. Each yields a /schema/<type>.json corpus.
	pagination: {
		data: 'collections.all',
		size: 1,
		alias: 'schemaType',
		before: (paginationData) => {
			const types = new Set();
			for (const item of paginationData) {
				const t = item?.data?.type;
				if (t) types.add(t);
			}
			return [...types];
		}
	},
	permalink: ({ schemaType }) => `/schema/${schemaType}.json`,
	baselineExcludeFromGraph: true,
	eleventyExcludeFromCollections: true,
	_internal: true
};

export default function (data) {
	const { settings, _navigator, schemaType, collections } = data;
	const navigatorNodes = _navigator?.nodes || {};
	const siteUrl = (settings?.url || '').replace(/\/+$/, '');
	const isArticle = schemaType === 'article';

	// Mint @ids through the same factory the per-page graph uses, so the corpus
	// and per-page documents share identity (canonical = siteUrl + node.url,
	// which is exactly what the adapter feeds buildWebPage/buildArticle).
	const ids = makeIds({ siteUrl: settings?.url || '' });

	// Navigator nodes do not carry inputPath or front-matter overrides; join via
	// collections.all by url so we can resolve the source file (for git-backed
	// dateModified) and read pageType/articleType from item.data.
	const itemByUrl = {};
	for (const item of collections?.all || []) {
		if (item?.url) itemByUrl[item.url] = item;
	}

	// Lift the resolved identity nodes (WebSite + the entity it publishes through)
	// from any page's graph, so the corpus shares the per-page identity verbatim
	// and resolves its own publisher ref rather than re-deriving the org slug.
	// Falls back to a minimal WebSite if no resolved graph is found.
	let identityNodes = null;
	for (const item of collections?.all || []) {
		const graph = item?.data?.seo?.graph;
		if (!Array.isArray(graph)) continue;
		const website = graph.find((n) => n['@type'] === 'WebSite');
		if (!website) continue;
		const publisherId = website.publisher?.['@id'];
		const publisher = publisherId && graph.find((n) => n['@id'] === publisherId);
		identityNodes = publisher ? [website, publisher] : [website];
		break;
	}

	const entries = Object.values(navigatorNodes)
		.filter((node) => node?.type === schemaType)
		.map((node) => {
			const item = itemByUrl[node.url];
			const canonical = `${siteUrl}${node.url}`;
			// @type from the page's own opt-in front matter; no editorial-to-schema
			// bridge (matches the adapter dropping WEBPAGE_TYPE_DEFAULTS).
			const type = isArticle ? item?.data?.articleType || 'Article' : item?.data?.pageType || 'WebPage';

			return {
				'@type': type,
				'@id': isArticle ? ids.article(canonical) : ids.webPage(canonical),
				url: item?.data?.seo?.url,
				name: node.title,
				...(isArticle ? { headline: node.title } : {}),
				description: node.description,
				inLanguage: node.locale || node.lang,
				...(item?.inputPath ? { dateModified: gitModified(item.inputPath) } : {}),
				isPartOf: { '@id': ids.website }
			};
		});

	const graph = {
		'@context': 'https://schema.org',
		'@graph': [
			...(identityNodes || [{ '@type': 'WebSite', '@id': ids.website, url: `${siteUrl}/`, name: settings?.title }]),
			...entries
		]
	};

	return JSON.stringify(graph, null, 2);
}
