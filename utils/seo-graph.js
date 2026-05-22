// Builds the JSON-LD @graph and OG/Twitter meta for a single page.
// Pure functions: take the Eleventy cascade `data`, return data structures.
// Consumers feed buildSeoGraph result to head.script[{ type, content }]
// and buildSeoMeta result to head.meta[].

import slugify from 'slugify';

export const LOCALE_REGION = {
	en: 'en-US',
	nl: 'nl-NL',
	fr: 'fr-FR'
};

// OG wants the underscored BCP-47 form, distinct from the hyphenated schema.org form.
const LOCALE_OG = {
	en: 'en_US',
	nl: 'nl_NL',
	fr: 'fr_FR'
};

// Default schema.org WebPage subtype for known editorial `type` values.
// Front-matter `pageType` overrides this. Unknown values fall back to plain WebPage.
export const WEBPAGE_TYPE_DEFAULTS = {
	about: 'AboutPage',
	contact: 'ContactPage',
	faq: 'FAQPage'
};

// Strip markdown formatting for plain-text contexts (schema Answer.text, etc).
function stripMarkdown(text) {
	return String(text)
		.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
		.replace(/\*\*([^*]+)\*\*/g, '$1')
		.replace(/\*([^*]+)\*/g, '$1')
		.replace(/`([^`]+)`/g, '$1')
		.replace(/\s+/g, ' ')
		.trim();
}

// Stable slug for Place @id refs. Matches the slugs used in neighborhood page URLs.
function slugifyName(s) {
	return slugify(String(s), { lower: true, strict: true });
}

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

function toISO(ms) {
	if (ms === null || ms === undefined) return null;
	const d = new Date(ms);
	return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function idFor(url, fragment) {
	return `${url.replace(/\/+$/, '/')}${fragment ? `#${fragment}` : ''}`;
}

function buildOrganizationNode(seo, siteUrl) {
	const o = seo.organization;
	const node = dropNulls({
		'@type': o['@type'],
		'@id': idFor(siteUrl, 'organization'),
		name: o.name,
		legalName: o.legalName,
		url: o.url,
		email: o.email,
		telephone: o.telephone,
		address: o.address ? { '@type': 'PostalAddress', ...o.address } : null,
		geo: o.geo ? { '@type': 'GeoCoordinates', ...o.geo } : null,
		areaServed: o.areaServed?.length
			? o.areaServed.map((a) => ({
					'@id': idFor(siteUrl, `place-${slugifyName(a)}`)
				}))
			: null,
		taxID: o.taxID,
		vatID: o.vatID,
		foundingDate: o.foundingDate,
		logo: o.logo ? { '@id': idFor(siteUrl, 'logo') } : null,
		image: o.logo ? { '@id': idFor(siteUrl, 'logo') } : null,
		sameAs: o.sameAs,
		knowsAbout: o.knowsAbout,
		slogan: o.slogan,
		founder: { '@id': idFor(siteUrl, 'cristovao') }
	});
	return node;
}

function buildPersonNode(seo, siteUrl) {
	const p = seo.person;
	return dropNulls({
		'@type': p['@type'],
		'@id': idFor(siteUrl, 'cristovao'),
		name: p.name,
		givenName: p.givenName,
		familyName: p.familyName,
		url: p.url,
		email: p.email,
		image: p.image,
		jobTitle: p.jobTitle,
		sameAs: p.sameAs,
		worksFor: { '@id': idFor(siteUrl, 'organization') }
	});
}

function buildLogoNode(seo, siteUrl) {
	if (!seo.organization.logo) return null;
	const l = seo.organization.logo;
	return dropNulls({
		'@type': 'ImageObject',
		'@id': idFor(siteUrl, 'logo'),
		url: l.url,
		width: l.width,
		height: l.height,
		caption: seo.organization.name
	});
}

function buildShareImageNode(seo, siteUrl) {
	if (!seo.shareImage) return null;
	const s = seo.shareImage;
	return dropNulls({
		'@type': 'ImageObject',
		'@id': idFor(siteUrl, 'shareimage'),
		url: s.url,
		width: s.width,
		height: s.height,
		caption: s.alt
	});
}

function buildPlaceNode(name, siteUrl) {
	return {
		'@type': 'Place',
		'@id': idFor(siteUrl, `place-${slugifyName(name)}`),
		name
	};
}

function buildServiceNode({ canonical, name, description, lang, siteUrl, areaServed }) {
	const placeRefs = areaServed?.length
		? areaServed.map((a) => ({
				'@id': idFor(siteUrl, `place-${slugifyName(a)}`)
			}))
		: null;
	return dropNulls({
		'@type': 'Service',
		'@id': idFor(canonical, 'service'),
		name,
		description,
		provider: { '@id': idFor(siteUrl, 'organization') },
		serviceType: name,
		areaServed: placeRefs,
		url: canonical,
		inLanguage: LOCALE_REGION[lang] || lang
	});
}

function buildWebSiteNode(siteUrl, siteName, languages, multilang) {
	const inLanguage = multilang && languages ? Object.keys(languages) : undefined;
	return dropNulls({
		'@type': 'WebSite',
		'@id': idFor(siteUrl, 'website'),
		url: siteUrl,
		name: siteName,
		inLanguage,
		publisher: { '@id': idFor(siteUrl, 'organization') }
	});
}

function buildBreadcrumbNode(pageUrl, segments, homeUrl) {
	if (!segments || segments.length < 1) return null;
	const items = [
		{
			'@type': 'ListItem',
			position: 1,
			name: 'Home',
			item: homeUrl
		},
		...segments.map((seg, i) => ({
			'@type': 'ListItem',
			position: i + 2,
			name: seg,
			...(i === segments.length - 1 ? {} : { item: `${homeUrl}${segments.slice(0, i + 1).join('/')}/` })
		}))
	];
	return {
		'@type': 'BreadcrumbList',
		'@id': idFor(pageUrl, 'breadcrumb'),
		itemListElement: items
	};
}

function buildWorkTranslationRefs(navigatorNodes, translationKey, currentUrl, siteUrl) {
	if (!navigatorNodes || !translationKey) return null;
	const refs = [];
	for (const node of Object.values(navigatorNodes)) {
		if (node.locale?.translationKey !== translationKey) continue;
		if (node.url === currentUrl) continue;
		const absoluteUrl = `${siteUrl.replace(/\/+$/, '')}${node.url}`;
		refs.push({
			'@type': 'WebPage',
			'@id': idFor(absoluteUrl, 'webpage'),
			url: absoluteUrl,
			inLanguage: LOCALE_REGION[node.locale.lang] || node.locale.lang
		});
	}
	return refs.length ? refs : null;
}

function buildArticleNode({
	canonical,
	title,
	description,
	excerpt,
	lang,
	datePublished,
	dateModified,
	siteUrl,
	articleSection,
	articleType
}) {
	return dropNulls({
		'@type': articleType || 'Article',
		'@id': idFor(canonical, 'article'),
		headline: title,
		description: description || excerpt,
		inLanguage: LOCALE_REGION[lang] || lang,
		datePublished: toISO(datePublished),
		dateModified: toISO(dateModified),
		author: { '@id': idFor(siteUrl, 'cristovao') },
		publisher: { '@id': idFor(siteUrl, 'organization') },
		isPartOf: { '@id': idFor(canonical, 'webpage') },
		articleSection
	});
}

function buildWebPageNode(ctx) {
	const {
		canonical,
		title,
		description,
		excerpt,
		lang,
		datePublished,
		dateModified,
		siteUrl,
		isOrgPage,
		neighborhoodSlug,
		workTranslation,
		hasShareImage,
		webPageType
	} = ctx;

	let about = null;
	if (neighborhoodSlug) {
		about = { '@id': idFor(siteUrl, `place-${neighborhoodSlug}`) };
	} else if (isOrgPage) {
		about = { '@id': idFor(siteUrl, 'organization') };
	}

	return dropNulls({
		'@type': webPageType,
		'@id': idFor(canonical, 'webpage'),
		url: canonical,
		name: title,
		description: description || excerpt || null,
		inLanguage: LOCALE_REGION[lang] || lang,
		isPartOf: { '@id': idFor(siteUrl, 'website') },
		about,
		mainEntity: ctx.mainEntity || null,
		primaryImageOfPage: hasShareImage ? { '@id': idFor(siteUrl, 'shareimage') } : null,
		datePublished: toISO(datePublished),
		dateModified: toISO(dateModified),
		workTranslation
	});
}

export function buildSeoGraph(data) {
	// Reading _pageContext creates a cycle (Baseline's page-context builder reads data.head).
	// _navigator is addGlobalData (not Nunjucks-only) and carries the per-page identity
	// merged with extracted DOM data, so it covers what _pageContext would have given us.
	const seo = data.seo;
	const settings = data.settings;
	const pageUrl = data.page?.url;
	const datePublished = data.page?.datePublished;
	const dateModified = data.page?.dateModified;
	const multilang = data._baseline?.features?.multilang;
	const navigatorNodes = data._navigator?.nodes;
	const node = navigatorNodes?.[pageUrl];

	// Eleventy runs this with a dep-discovery proxy where siblings may be undefined.
	if (!seo || !settings || !settings.url || !pageUrl) {
		return { '@context': 'https://schema.org', '@graph': [] };
	}

	const lang = node?.locale?.lang || data.page?.locale?.lang || data.lang || settings.defaultLanguage;
	const translationKey = node?.locale?.translationKey || data.page?.locale?.translationKey || data.translationKey;

	const siteUrl = settings.url;
	const siteName = settings.languages?.[lang]?.title || settings.title;
	const canonical = `${siteUrl.replace(/\/+$/, '')}${pageUrl}`;
	const title = node?.title || data.title;
	const description = node?.description || data.description;
	const excerpt = node?.excerpt;

	const isHome = pageUrl === '/' || /^\/[a-z]{2}\/$/.test(pageUrl);
	const entryType = data.type || node?.type;
	const isOrgPage = isHome || ['about', 'contact'].includes(entryType);
	const isService = entryType === 'service';
	const isArticle = entryType === 'article';
	const neighborhoodSlug = entryType === 'neighborhood' ? data.slug : null;

	// Page-level schema @type: front-matter override → defaults map → plain WebPage.
	const webPageType = data.pageType || WEBPAGE_TYPE_DEFAULTS[entryType] || 'WebPage';

	const workTranslation = buildWorkTranslationRefs(navigatorNodes, translationKey, pageUrl, siteUrl);

	const segments = node?.section || data.section || [];
	const breadcrumb = buildBreadcrumbNode(canonical, segments, siteUrl);

	// Place nodes for every areaServed entry, referenced by @id from Organization,
	// Service nodes, and neighborhood WebPage.about.
	const placeNodes = (seo.organization?.areaServed || []).map((a) => buildPlaceNode(a, siteUrl));

	// Service node only on service pages. Name comes from the page H1 (canonical short form)
	// with fallback to the page title.
	const serviceNode = isService
		? buildServiceNode({
				canonical,
				name: node?.headings?.[0]?.text || title,
				description: description || excerpt,
				lang,
				siteUrl,
				areaServed: seo.organization?.areaServed
			})
		: null;

	// Article node when entryType is 'article'. articleType refines the schema subtype
	// (TechArticle, BlogPosting, etc.); articleSection comes from the cascade's sectionLabel.
	const articleNode = isArticle
		? buildArticleNode({
				canonical,
				title,
				description,
				excerpt,
				lang,
				datePublished,
				dateModified,
				siteUrl,
				articleSection: data.sectionLabel,
				articleType: data.articleType
			})
		: null;

	// WebPage.mainEntity: a ref to the Service node on service pages, or an array of
	// Question entities on FAQ pages.
	let mainEntity = null;
	if (isService) {
		mainEntity = { '@id': idFor(canonical, 'service') };
	} else if (isArticle) {
		mainEntity = { '@id': idFor(canonical, 'article') };
	} else if (entryType === 'faq' && Array.isArray(data.faqs) && data.faqs.length) {
		mainEntity = data.faqs.map((f) => ({
			'@type': 'Question',
			name: stripMarkdown(f.question),
			acceptedAnswer: {
				'@type': 'Answer',
				text: stripMarkdown(f.answer)
			}
		}));
	}

	const graph = [
		buildWebSiteNode(siteUrl, siteName, settings.languages, multilang),
		buildOrganizationNode(seo, siteUrl),
		buildPersonNode(seo, siteUrl),
		buildLogoNode(seo, siteUrl),
		buildShareImageNode(seo, siteUrl),
		...placeNodes,
		buildWebPageNode({
			canonical,
			title,
			description,
			excerpt,
			lang,
			datePublished,
			dateModified,
			siteUrl,
			isOrgPage,
			neighborhoodSlug,
			mainEntity,
			workTranslation,
			hasShareImage: !!seo.shareImage,
			webPageType
		}),
		serviceNode,
		articleNode,
		breadcrumb
	].filter(Boolean);

	// Attach the breadcrumb ref to the WebPage if present.
	if (breadcrumb) {
		const webPage = graph.find((n) => n['@type'] && String(n['@type']).endsWith('Page'));
		if (webPage) webPage.breadcrumb = { '@id': breadcrumb['@id'] };
	}

	return {
		'@context': 'https://schema.org',
		'@graph': graph
	};
}

// Builds the OG + Twitter meta entries for a single page.
// Returns an array shaped for Baseline's head.meta merge: { property | name, content }.
// Same data sources as buildSeoGraph so the two never drift.
export function buildSeoMeta(data) {
	const seo = data.seo;
	const settings = data.settings;
	const pageUrl = data.page?.url;
	const navigatorNodes = data._navigator?.nodes;
	const node = navigatorNodes?.[pageUrl];

	if (!seo || !settings || !settings.url || !pageUrl) return [];

	const lang = node?.locale?.lang || data.page?.locale?.lang || data.lang || settings.defaultLanguage;
	const siteUrl = settings.url;
	const siteName = settings.languages?.[lang]?.title || settings.title;
	const canonical = `${siteUrl.replace(/\/+$/, '')}${pageUrl}`;
	const title = node?.title || data.title;
	const description = node?.description || data.description || node?.excerpt;
	const shareImage = seo.shareImage;

	const entries = [
		{ property: 'og:site_name', content: siteName },
		{ property: 'og:type', content: 'website' },
		{ property: 'og:title', content: title },
		{ property: 'og:description', content: description },
		{ property: 'og:url', content: canonical },
		{ property: 'og:locale', content: LOCALE_OG[lang] || lang }
	];

	if (shareImage) {
		entries.push(
			{ property: 'og:image', content: shareImage.url },
			{ property: 'og:image:width', content: String(shareImage.width) },
			{ property: 'og:image:height', content: String(shareImage.height) },
			{ property: 'og:image:alt', content: shareImage.alt }
		);
	}

	entries.push({ name: 'twitter:card', content: 'summary_large_image' });

	return entries.filter((e) => e.content !== null && e.content !== undefined);
}
