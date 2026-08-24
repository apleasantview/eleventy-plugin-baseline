import { resolveDates } from '../../_baseline/core/dates/index.js';

const mdAlternates = (data) => {
	if (data.baselineExcludeFromGraph) return [];

	// Only page zero joins collections.all, so page-markdown.11ty.js writes one
	// sibling per document, at the first URL. It is built from rawInput, so that
	// file is the whole document however many parts the page renders as.
	const base = data.pagination?.href?.first ?? data.page.url;

	return [
		{
			rel: 'alternate',
			type: 'text/markdown',
			href: `${base}index.md`
		}
	];
};

export default {
	type: 'page',
	permalink: function (data) {
		if (data.page.inputPath.includes('11tydata.js')) return false;
		const path = data.section[0] === 'root' ? data.section.slice(1) : data.section;
		const slug = data.slug ? this.slugify(data.slug) : data.page.fileSlug;
		const isDefaultLang = !data.lang || data.lang === data.settings?.defaultLanguage;
		const prefix = isDefaultLang ? '' : `/${data.lang}`;
		const sections = (path ?? []).map((s) => this.slugify(s));
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
			// JSON-LD, OG, and Twitter now emit straight from the seo handle in the
			// head driver (bar 4); the docs site no longer bridges them through
			// eleventyComputed. Only markdown alternates remain a docs-site concern.
			link: (data) => mdAlternates(data)
		}
	}
};
