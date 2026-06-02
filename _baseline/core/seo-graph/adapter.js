// Adapter to @jdevalk/seo-graph-core.
//
// Translates Baseline's cascade (settings, schema identity, navigator nodes,
// dates) into seo-graph-core's piece builders, assembles the JSON-LD @graph,
// and returns it for storage under data.seo.graph. Auto-builds a generic spine
// (WebSite, Organization/Person, WebPage, Article, BreadcrumbList, image and
// translation refs); domain shapes ride in untouched via the schema.pieces seam.

import {
	makeIds,
	assembleGraph,
	buildPiece,
	buildWebSite,
	buildWebPage,
	buildArticle,
	buildBreadcrumbList,
	buildImageObject
} from '@jdevalk/seo-graph-core';
import { resolveDates } from '../dates/index.js';
import { resolveLocale } from '../locale/index.js';
import { slugify } from '../utils/slugify.js';

/** Recursively strip null/undefined; `_data/schema.js` uses null as "not set". */
function dropNulls(value) {
	if (Array.isArray(value)) {
		const cleaned = value.map(dropNulls).filter((v) => v !== null && v !== undefined);
		return cleaned.length ? cleaned : null;
	}
	if (value && typeof value === 'object') {
		const out = {};
		for (const [k, v] of Object.entries(value)) {
			const cleaned = dropNulls(v);
			if (cleaned !== null && cleaned !== undefined) out[k] = cleaned;
		}
		return Object.keys(out).length ? out : null;
	}
	return value;
}

/** Stable within-site slug for an Organization @id. */
function orgSlug(name) {
	return slugify(name) || 'organization';
}

/**
 * Build an ImageObject node, or null when pixel dimensions are unknown. The
 * two-tier degrade: no node without width+height (the builder throws), and the
 * OG projection still emits a url-only og:image in that case.
 *
 * @param {{ url?: string, width?: number, height?: number, alt?: string } | undefined} image
 * @param {{ id: string } | { pageUrl: string }} target  Site-wide id (logo) or page primary image.
 * @param {import('@jdevalk/seo-graph-core').IdFactory} ids
 * @returns {object | null}
 */
function buildImage(image, target, ids) {
	if (!image?.url || !image.width || !image.height) return null;
	return buildImageObject(
		{ ...target, url: image.url, width: image.width, height: image.height, caption: image.alt },
		ids
	);
}

/**
 * Inline WebPage refs for sibling translations, keyed off a shared
 * translationKey on the navigator nodes. Emitted as nested entities (carrying
 * @type) rather than bare @id refs, so they resolve within this page's graph.
 *
 * @returns {Array<object>}
 */
function buildWorkTranslations(nodes, translationKey, currentUrl, siteRoot, ids) {
	if (!nodes || !translationKey) return [];
	const refs = [];
	for (const n of Object.values(nodes)) {
		if (n.translationKey !== translationKey || n.url === currentUrl) continue;
		const absUrl = `${siteRoot}${n.url}`;
		refs.push({ '@type': 'WebPage', '@id': ids.webPage(absUrl), url: absUrl, inLanguage: n.locale || n.lang });
	}
	return refs;
}

/**
 * Assemble the resolved JSON-LD @graph for a single page from the cascade.
 *
 * Pure function over the full Eleventy `data` bag: reads `data.schema`
 * (identity + pieces), `data.settings`, `data.page`, and the navigator nodes.
 * Identity is tidied (drop-null) and stamped; everything in `schema.pieces`
 * passes through `buildPiece` untouched. Returns the bare `@graph` array.
 *
 * @param {Record<string, any>} data  The Eleventy cascade data bag.
 * @returns {Array<unknown>}
 */
export function assembleSchemaGraph(data) {
	const settings = data.settings;
	const schema = data.schema;
	const pageUrl = data.page?.url;

	// Eleventy's dependency-discovery proxy can call this with siblings undefined.
	if (!settings?.url || !pageUrl) return [];

	const siteUrl = settings.url;
	const siteRoot = siteUrl.replace(/\/+$/, '');
	const canonical = `${siteRoot}${pageUrl}`;

	const navigatorNodes = data._navigator?.nodes;
	const node = navigatorNodes?.[pageUrl];

	const lang = node?.lang || data.page?.lang || data.lang || settings.defaultLanguage;
	const locale = resolveLocale(node, data, settings, lang);
	const siteName = settings.languages?.[lang]?.title || settings.title;
	const multilang = data._baseline?.features?.multilang;

	const personUrl = schema?.person?.url || siteUrl;
	const ids = makeIds({ siteUrl, personUrl });

	// --- Identity: build only what's configured; tidy null sentinels. ---
	const orgConfig = schema?.organization ? dropNulls(schema.organization) : null;
	const personConfig = schema?.person ? dropNulls(schema.person) : null;

	let orgNode = null;
	let logoNode = null;
	if (orgConfig) {
		const { logo, ...rest } = orgConfig;
		logoNode = buildImage(logo, { id: `${siteRoot}/#logo` }, ids);
		orgNode = buildPiece({
			'@type': 'Organization',
			...rest,
			'@id': ids.organization(orgSlug(orgConfig.name)),
			...(logoNode ? { logo: { '@id': logoNode['@id'] }, image: { '@id': logoNode['@id'] } } : {})
		});
	}

	let personNode = null;
	if (personConfig) {
		personNode = buildPiece({ '@type': 'Person', ...personConfig, '@id': ids.person });
	}

	// Primary entity: Organization, else Person, else a synthesised floor org so
	// a zero-config site still emits a valid publisher.
	let primaryRef;
	if (orgNode) {
		primaryRef = { '@id': orgNode['@id'] };
	} else if (personNode) {
		primaryRef = { '@id': personNode['@id'] };
	} else {
		orgNode = buildPiece(
			dropNulls({
				'@type': 'Organization',
				'@id': ids.organization(orgSlug(settings.title)),
				name: settings.title,
				url: siteUrl
			})
		);
		primaryRef = { '@id': orgNode['@id'] };
	}

	const website = buildWebSite(
		{
			url: siteUrl,
			name: siteName,
			publisher: primaryRef,
			inLanguage: multilang && settings.languages ? Object.keys(settings.languages) : undefined
		},
		ids
	);

	const ogImageRaw = data.ogImage ?? data.seo?.ogImage ?? settings.seo?.ogImage;
	const ogImage = typeof ogImageRaw === 'string' ? { url: ogImageRaw } : ogImageRaw;
	const primaryImageNode = buildImage(ogImage, { pageUrl: canonical }, ids);

	const segments = node?.section || data.section || [];
	const breadcrumbNode = segments.length
		? buildBreadcrumbList(
				{
					url: canonical,
					items: [
						{ name: 'Home', url: `${siteRoot}/` },
						...segments.map((seg, i) => ({
							name: seg,
							// Last crumb resolves to this page's WebPage @id; earlier ones link the section path.
							url: i === segments.length - 1 ? canonical : `${siteRoot}/${segments.slice(0, i + 1).join('/')}/`
						}))
					]
				},
				ids
			)
		: null;

	const translationKey = node?.translationKey || data.page?.translationKey || data.translationKey;
	const workTranslation = buildWorkTranslations(navigatorNodes, translationKey, pageUrl, siteRoot, ids);

	const dates = resolveDates(data);

	// schema.org keywords from the `topics` front-matter convention; native `tags` untouched.
	const keywords = data.topics?.length ? data.topics : undefined;

	const webPage = buildWebPage(
		{
			url: canonical,
			name: node?.title || data.title,
			isPartOf: { '@id': ids.website },
			description: node?.description || data.description || node?.excerpt,
			inLanguage: locale,
			datePublished: dates.datePublished,
			dateModified: dates.dateModified,
			breadcrumb: breadcrumbNode ? { '@id': breadcrumbNode['@id'] } : undefined,
			primaryImage: primaryImageNode ? { '@id': primaryImageNode['@id'] } : undefined,
			workTranslation: workTranslation.length ? workTranslation : undefined,
			keywords
		},
		ids,
		data.pageType || 'WebPage'
	);

	const entryType = data.type || node?.type;
	const articleNode =
		entryType === 'article'
			? buildArticle(
					{
						url: canonical,
						isPartOf: { '@id': ids.webPage(canonical) },
						author: personNode ? { '@id': personNode['@id'] } : primaryRef,
						publisher: primaryRef,
						headline: node?.title || data.title,
						description: node?.description || data.description || node?.excerpt,
						inLanguage: locale,
						datePublished: dates.datePublished,
						dateModified: dates.dateModified,
						articleSection: data.sectionLabel,
						keywords
					},
					ids,
					data.articleType || 'Article'
				)
			: null;

	const spine = [website, orgNode, personNode, logoNode, primaryImageNode, webPage, articleNode, breadcrumbNode].filter(
		Boolean
	);

	// The extension seam: author-supplied nodes, concat-merged across the cascade,
	// passed through untouched.
	const authored = Array.isArray(schema?.pieces) ? schema.pieces.map((p) => buildPiece(p)) : [];

	return assembleGraph([...spine, ...authored])['@graph'];
}
