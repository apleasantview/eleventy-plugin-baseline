// OG and Twitter projections.
//
// Render-ready normalisation of the social tags: short structured keys, every
// value resolved against defaults and coerced (locale to OG underscore form,
// dates to ISO). This module owns the decisions; the head driver owns the
// og:/twitter: vocabulary and the per-tag emit. Shape and split follow the
// prior art that productises this — Yoast's presentation-object + per-tag
// presenters, mirrored by Joost's buildSeoContext (seo-context.ts) + Seo.astro
// — written fresh against Baseline's namespace.

import { resolveDates } from '../dates/index.js';
import { toOpenGraphLocale } from '../locale/index.js';

/** BCP-47 locale for the page; trusts multilang's normalised page.locale first. */
function resolveLocale(node, data, settings, lang) {
	return node?.locale || data?.page?.locale || data?.locale || settings?.languages?.[lang]?.locale || lang;
}

/**
 * Sibling-locale alternates in OG underscore form, excluding the page's own
 * locale and de-duped. Derived from navigator nodes sharing the translationKey
 * (the same set the graph adapter's workTranslation refs draw from).
 *
 * @returns {string[]}
 */
function localeAlternates(nodes, translationKey, currentUrl, primaryLocale) {
	if (!nodes || !translationKey) return [];
	const seen = new Set([primaryLocale]);
	const out = [];
	for (const n of Object.values(nodes)) {
		if (n.translationKey !== translationKey || n.url === currentUrl) continue;
		const loc = toOpenGraphLocale(n.locale || n.lang);
		if (!loc || seen.has(loc)) continue;
		seen.add(loc);
		out.push(loc);
	}
	return out;
}

/**
 * Build the OG and Twitter projections for a single page.
 *
 * Pure over the cascade `data` bag plus the resolved canonical URL (computed
 * upstream in `build.js`; `undefined` on noindex). Returns render-ready
 * projections with short keys — the head driver maps them to `<meta property>`
 * / `<meta name>` tags. Empty projections when `settings.url` or `page.url` is
 * absent (the dependency-discovery proxy pass).
 *
 * Rules beyond the old `buildSeoMeta`'s six fields: og:url falls back to the
 * page URL on noindex; og:type follows an editorial `article`; image dimensions
 * and alt gate on being known; article:* gate on the article type; locale
 * alternates derive from sibling translations; Twitter carries only the
 * overrides that differ from their OG counterpart (it inherits the rest).
 *
 * @param {Record<string, any>} data  The Eleventy cascade data bag.
 * @param {string | undefined} canonicalUrl  The resolved canonical (`seo.url`).
 * @returns {{ openGraph: Record<string, unknown>, twitter: Record<string, unknown> }}
 */
export function buildSocialProjections(data, canonicalUrl) {
	const settings = data.settings;
	const pageUrl = data.page?.url;
	if (!settings?.url || !pageUrl) return { openGraph: {}, twitter: {} };

	const seo = data.seo ?? {};
	const schema = data.schema ?? {};
	const nodes = data._navigator?.nodes;
	const node = nodes?.[pageUrl];

	const lang = node?.lang || data.page?.lang || data.lang || settings.defaultLanguage;
	const locale = toOpenGraphLocale(resolveLocale(node, data, settings, lang)) ?? '';
	const siteRoot = settings.url.replace(/\/+$/, '');

	const title = seo.ogTitle ?? node?.title ?? data.title;
	const description = seo.ogDescription ?? node?.description ?? data.description ?? node?.excerpt;

	// Editorial `article` projects og:type article (and unlocks article:*);
	// an explicit seo.ogType wins, then the site default, then 'website'.
	const entryType = data.type || node?.type;
	const type = seo.ogType ?? (entryType === 'article' ? 'article' : settings.seo?.openGraph?.type ?? 'website');

	// og:url falls back to the absolute page URL when canonical is omitted
	// (noindex), so share previews stay stable.
	const url = canonicalUrl ?? `${siteRoot}${pageUrl}`;

	const og = { title, type, url };
	if (locale) og.locale = locale;
	if (description) og.description = description;
	const siteName = settings.languages?.[lang]?.title || settings.title;
	if (siteName) og.siteName = siteName;

	const translationKey = node?.translationKey || data.page?.translationKey || data.translationKey;
	const localeAlt = localeAlternates(nodes, translationKey, pageUrl, locale);
	if (localeAlt.length) og.localeAlternate = localeAlt;

	// Image gating: a URL emits og:image; dimensions and alt ride only when
	// known — the two-tier degrade the graph adapter follows for the ImageObject.
	const ogImageRaw = data.ogImage ?? seo.ogImage ?? settings.seo?.ogImage;
	const ogImage = typeof ogImageRaw === 'string' ? { url: ogImageRaw } : ogImageRaw;
	if (ogImage?.url) {
		og.image = ogImage.url;
		if (ogImage.alt) og.imageAlt = ogImage.alt;
		if (ogImage.width) og.imageWidth = ogImage.width;
		if (ogImage.height) og.imageHeight = ogImage.height;
	}

	// article:* only when the page projects as an article. Author chain mirrors
	// the graph adapter's: the Person, else the primary entity (Organization).
	if (type === 'article') {
		const dates = resolveDates(data);
		const article = {};
		if (dates.datePublished) article.publishedTime = dates.datePublished.toISOString();
		if (dates.dateModified) article.modifiedTime = dates.dateModified.toISOString();
		if (data.sectionLabel) article.section = data.sectionLabel;
		const author = schema.person?.name ?? schema.organization?.name;
		if (author) article.authors = [author];
		og.article = article;
	}

	// Twitter inherits from OG automatically, so default the card and carry only
	// the overrides that differ from their OG counterpart (emitting a duplicate
	// is noise).
	const twitter = { card: seo.twitterCard ?? settings.seo?.twitter?.card ?? 'summary_large_image' };
	const twitterSite = seo.twitterSite ?? settings.seo?.twitter?.site;
	if (twitterSite) twitter.site = twitterSite;
	const twitterCreator = settings.seo?.twitter?.creator;
	if (twitterCreator) twitter.creator = twitterCreator;
	if (seo.twitterTitle && seo.twitterTitle !== title) twitter.title = seo.twitterTitle;
	if (seo.twitterDescription && seo.twitterDescription !== description) twitter.description = seo.twitterDescription;
	if (seo.twitterImage && seo.twitterImage !== og.image) twitter.image = seo.twitterImage;

	return { openGraph: og, twitter };
}
