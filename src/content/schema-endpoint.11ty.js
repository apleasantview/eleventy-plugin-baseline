// Schema endpoints: one per entry.type. Each emits a JSON-LD corpus document
// listing every page of that type as a WebPage entry, with the WebSite node
// included at the top for @id resolution.
//
// Paired with /schemamap.xml (which catalogues these endpoints) and the
// Schemamap: directive in robots.txt. Discovery surface for AI agents that
// consume structured data corpus-wide (NLWeb pattern).

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
	const { _navigator, _snapshot, schemaType } = data;
	const navigatorNodes = _navigator?.nodes || {};
	// Every page's resolved `seo` namespace, keyed by url (the registry snapshot
	// the navigator surfaces). The corpus reads identity straight from here, so
	// it never re-mints @ids — those were minted once, by the per-page adapter.
	const seoByUrl = _snapshot?.seoGraph || {};
	const isArticle = schemaType === 'article';

	// Lift the resolved identity nodes (WebSite + the entity it publishes through)
	// from any page's resolved graph, so the corpus shares the per-page identity
	// verbatim and resolves its own publisher ref. Falls back to nothing if no
	// resolved graph exists (a corpus with no entries either way).
	let identityNodes = null;
	for (const seo of Object.values(seoByUrl)) {
		const graph = seo?.schema;
		if (!Array.isArray(graph)) continue;
		const website = graph.find((n) => n['@type'] === 'WebSite');
		if (!website) continue;
		const publisherId = website.publisher?.['@id'];
		const publisher = publisherId && graph.find((n) => n['@id'] === publisherId);
		identityNodes = publisher ? [website, publisher] : [website];
		break;
	}
	const websiteId = identityNodes?.[0]?.['@id'];

	// Find a page's primary node inside its own resolved graph, structurally:
	// the WebPage is `isPartOf` the WebSite; an Article is `isPartOf` the WebPage.
	// No @id arithmetic — the node carries the id the adapter already minted.
	function pickPrimary(graph) {
		if (!Array.isArray(graph) || !websiteId) return undefined;
		const webPage = graph.find((n) => n.isPartOf?.['@id'] === websiteId);
		if (!isArticle) return webPage;
		return graph.find((n) => n.isPartOf?.['@id'] === webPage?.['@id']);
	}

	const entries = Object.values(navigatorNodes)
		.filter((node) => node?.type === schemaType)
		.map((node) => {
			const seo = seoByUrl[node.url];
			const primary = pickPrimary(seo?.schema);
			// A navigator node with no resolved graph (or graph-less page) is not a
			// corpus entry — skip rather than emit one missing its identity.
			if (!primary) return null;

			return {
				'@type': primary['@type'],
				'@id': primary['@id'],
				url: seo.url,
				name: node.title,
				...(isArticle ? { headline: node.title } : {}),
				description: node.description,
				inLanguage: node.locale || node.lang,
				// dateModified rides on the node already (ISO string), same
				// resolveDates source the page's own JSON-LD used.
				...(primary.dateModified ? { dateModified: primary.dateModified } : {}),
				// Flat corpus: every entry is a child of the WebSite, not of its
				// per-page WebPage (which is what the node's own isPartOf points to).
				isPartOf: { '@id': websiteId }
			};
		})
		.filter(Boolean);

	const graph = {
		'@context': 'https://schema.org',
		'@graph': [...(identityNodes || []), ...entries]
	};

	return JSON.stringify(graph, null, 2);
}
