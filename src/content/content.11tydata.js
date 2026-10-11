import { resolveDates, gitSources } from '../../_baseline/core/dates/index.js';

const dateContext = { git: gitSources };

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
			// The plugin's resolved dates, as the strings they are: a calendar date
			// is a day and an instant is a timestamp. Same source the JSON-LD graph
			// and the sitemap read, so nothing can drift. The sitemap used to be fed
			// from here too; the module resolves it itself now, and a computed write
			// to the author's `sitemap` key would replace it rather than fill it.
			datePublished: (data) => resolveDates(data, dateContext).datePublished?.value,
			dateModified: (data) => resolveDates(data, dateContext).dateModified?.value
		},
		head: {
			// JSON-LD, OG, and Twitter now emit straight from the seo handle in the
			// head driver (bar 4); the docs site no longer bridges them through
			// eleventyComputed. Only markdown alternates remain a docs-site concern.
			link: (data) => mdAlternates(data)
		}
	}
};
