import { resolveDates } from '../../_baseline/core/dates/index.js';

// Map the resolved social projection (short structured keys from
// core/seo-graph/open-graph.js) to head.meta entries: og:* carry the `property`
// attribute, twitter:* the `name`. This is the og:/twitter: vocabulary the head
// driver will own at bar 4; until then the docs site bridges it through
// eleventyComputed.head.meta.
//
// Caveat: head.meta dedupes by property/name (last wins), so repeated-property
// tags can't round-trip. og:locale:alternate — the one multi-valued tag the
// projection emits — is therefore deferred to bar 4, where the driver reads the
// projection's arrays directly rather than through the property-keyed merge.
const socialMeta = (seo) => {
	if (!seo) return [];
	const og = seo.openGraph ?? {};
	const tw = seo.twitter ?? {};
	const out = [];
	const prop = (property, content) => {
		if (content !== undefined && content !== null && content !== '') out.push({ property, content });
	};
	const name = (key, content) => {
		if (content !== undefined && content !== null && content !== '') out.push({ name: key, content });
	};

	prop('og:title', og.title);
	prop('og:type', og.type);
	prop('og:description', og.description);
	prop('og:url', og.url);
	prop('og:site_name', og.siteName);
	prop('og:locale', og.locale);
	prop('og:image', og.image);
	prop('og:image:alt', og.imageAlt);
	if (og.imageWidth !== undefined) prop('og:image:width', String(og.imageWidth));
	if (og.imageHeight !== undefined) prop('og:image:height', String(og.imageHeight));
	if (og.article) {
		prop('article:published_time', og.article.publishedTime);
		prop('article:modified_time', og.article.modifiedTime);
		prop('article:section', og.article.section);
		prop('article:author', og.article.authors?.[0]);
	}

	name('twitter:card', tw.card);
	name('twitter:site', tw.site);
	name('twitter:creator', tw.creator);
	name('twitter:title', tw.title);
	name('twitter:description', tw.description);
	name('twitter:image', tw.image);

	return out;
};

const mdAlternates = (data) => {
	if (data.baselineExcludeFromGraph) return [];
	return [
		{
			rel: 'alternate',
			type: 'text/markdown',
			href: `${data.page.url}index.md`
		}
	];
};

export default {
	type: 'page',
	permalink: function (data) {
		if (data.page.inputPath.includes('11tydata.js')) return false;
		const slug = data.slug ? this.slugify(data.slug) : data.page.fileSlug;
		const isDefaultLang = !data.lang || data.lang === data.settings?.defaultLanguage;
		const prefix = isDefaultLang ? '' : `/${data.lang}`;
		const sections = (data.section ?? []).map((s) => this.slugify(s));
		return `${prefix}/${[...sections, slug].join('/')}/`;
	},
	eleventyComputed: {
		page: {
			// Dates via the plugin's resolveDates: front-matter override → git
			// last-commit → publish-date floor (page.date). This is the same source
			// the JSON-LD graph reads, so page, sitemap, and graph share one resolved
			// date and cannot drift. gitModified caches its log walk, so the repeated
			// calls are map lookups, not subprocesses.
			datePublished: (data) => resolveDates(data).datePublished,
			dateModified: (data) => resolveDates(data).dateModified
		},
		sitemap: {
			lastmod: (data) => resolveDates(data).dateModified
		},
		head: {
			// JSON-LD graph emitted into <head> via Baseline's head.script merge.
			// Reads the plugin-resolved graph (data.seo.graph, assembled by the
			// seo-graph substrate); the adapter returns the bare @graph array, so we
			// wrap it in the @context envelope here. Guarded: skipped pages (_internal
			// / non-html) resolve data.seo to null, so emit nothing when there's no
			// graph rather than throwing. Bridge until the head module reads the seo
			// handle directly (bar 4).
			script: (data) => {
				const graph = data.seo?.graph;
				if (!graph?.length) return [];
				return [{ type: 'application/ld+json', content: JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }) }];
			},
			// OG + Twitter meta from the resolved projection (data.seo.openGraph /
			// .twitter); see socialMeta for the property-keyed merge caveat.
			meta: (data) => socialMeta(data.seo),
			// Add markdown alternates for site pages.
			link: (data) => mdAlternates(data)
		}
	}
};
